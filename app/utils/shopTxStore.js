// utils/shopTxStore.js
// ✅ Store local des achats Boutique NT
// ─────────────────────────────────────────────────────────────
// POURQUOI CE FICHIER ?
// Le backend n'expose pas les recharges boutique (stock, crédit,
// softphone, BLR) dans /transactions/entries/me.
// On les stocke donc localement pour les fusionner avec les
// transactions backend dans TransactionContext.
// ─────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@ntalbey_shop_tx_';
const MAX_STORED = 100; // Limite pour éviter de saturer AsyncStorage

/**
 * Récupère la clé AsyncStorage pour un user donné
 */
const keyForUser = (userId) => `${KEY_PREFIX}${userId}`;

/**
 * Sauvegarde un achat boutique dans le store local du user.
 * 
 * @param {string|number} userId   ID de l'utilisateur
 * @param {object} tx              Transaction à sauvegarder
 * @param {string} tx.id           ID unique (obligatoire)
 * @param {string} tx.description  Libellé (ex: "Recharge stock NT Albey")
 * @param {number} tx.amount       Montant NÉGATIF (ex: -5000)
 * @param {string} tx.date         Date ISO
 * @param {string} [tx.reference]  Référence NT (optionnel)
 * @param {string} [tx.status]     Statut (défaut: 'success')
 * @param {object} [tx.details]    Métadonnées libres
 * @returns {Promise<object>}      La transaction sauvegardée
 */
export async function saveShopTx(userId, tx) {
  if (!userId || !tx?.id) {
    if (__DEV__) console.warn('⚠️ [ShopTxStore] userId ou tx.id manquant');
    return null;
  }

  try {
    const key = keyForUser(userId);
    const raw = await AsyncStorage.getItem(key);
    let list = [];
    try {
      list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];
    } catch {
      list = [];
    }

    // ✅ Anti-doublon par id
    const existingIdx = list.findIndex((t) => String(t.id) === String(tx.id));
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...tx };
    } else {
      // Ajoute en tête (plus récent en premier)
      list.unshift({
        id: String(tx.id),
        type: 'shop',                          // ⚠️ Type fixe pour l'icône 🛍️
        amount: -Math.abs(Number(tx.amount)),  // Toujours négatif (débit)
        date: tx.date || new Date().toISOString(),
        description: tx.description || 'Achat Boutique NT',
        reference: tx.reference || null,
        status: tx.status || 'success',
        details: {
          source: 'local_shop',
          entry_type: 'shop_purchase',
          side: 'debit',
          ...(tx.details || {}),
        },
        deletable: false,
      });
    }

    // ✅ Tronque à MAX_STORED
    list = list.slice(0, MAX_STORED);

    await AsyncStorage.setItem(key, JSON.stringify(list));
    if (__DEV__) {
      console.log(`💾 [ShopTxStore] Tx sauvée pour user ${userId} (total: ${list.length})`);
    }
    return tx;
  } catch (e) {
    if (__DEV__) console.warn('⚠️ [ShopTxStore] Erreur saveShopTx :', e?.message);
    return null;
  }
}

/**
 * Récupère toutes les transactions boutique d'un user.
 * @param {string|number} userId
 * @returns {Promise<Array>} Liste de transactions (format interne)
 */
export async function getShopTxs(userId) {
  if (!userId) return [];
  try {
    const key = keyForUser(userId);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    if (__DEV__) console.warn('⚠️ [ShopTxStore] Erreur getShopTxs :', e?.message);
    return [];
  }
}

/**
 * Efface toutes les transactions boutique d'un user.
 * (Utile au logout ou pour reset)
 * @param {string|number} userId
 */
export async function clearShopTxs(userId) {
  if (!userId) return;
  try {
    const key = keyForUser(userId);
    await AsyncStorage.removeItem(key);
    if (__DEV__) console.log(`🗑️ [ShopTxStore] Tx effacées pour user ${userId}`);
  } catch (e) {
    if (__DEV__) console.warn('⚠️ [ShopTxStore] Erreur clearShopTxs :', e?.message);
  }
}