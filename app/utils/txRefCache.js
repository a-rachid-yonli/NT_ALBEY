// utils/txRefCache.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@ntalbey_txref_';

/**
 * Sauvegarde les métadonnées d'une transaction (référence + numéros)
 */
export async function saveTxMetadata(txId, metadata) {
  if (!txId) return;

  try {
    const clean = {};

    // Référence NT (doit commencer par NT)
    if (metadata?.reference && String(metadata.reference).startsWith('NT')) {
      clean.reference = String(metadata.reference);
    }

    // Numéros de téléphone (nettoyés)
    if (metadata?.sender_phone) {
      clean.sender_phone = String(metadata.sender_phone).replace(/\s/g, '').replace(/^\+?227/, '');
    }
    if (metadata?.receiver_phone) {
      clean.receiver_phone = String(metadata.receiver_phone).replace(/\s/g, '').replace(/^\+?227/, '');
    }

    // Nom du bénéficiaire (optionnel)
    if (metadata?.receiver_name) {
      clean.receiver_name = String(metadata.receiver_name);
    }

    if (Object.keys(clean).length === 0) return;

    await AsyncStorage.setItem(`${PREFIX}${txId}`, JSON.stringify(clean));

    if (__DEV__) {
      console.log('💾 [TxRefCache] Metadata sauvée:', txId, clean);
    }
  } catch (e) {
    if (__DEV__) console.warn('Erreur saveTxMetadata:', e?.message);
  }
}

/**
 * Compatibilité : ancienne signature (juste la référence)
 */
export async function saveTxReference(txId, reference) {
  return saveTxMetadata(txId, { reference });
}

/**
 * Récupère TOUTES les métadonnées d'une transaction
 * Gère le fallback pour l'ancien format (string brute)
 */
export async function getTxMetadata(txId) {
  if (!txId) return null;
  try {
    const raw = await AsyncStorage.getItem(`${PREFIX}${txId}`);
    if (!raw) return null;

    // Essai JSON (nouveau format)
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
      // Si c'est une string simple (ancien format)
      return { reference: String(parsed) };
    } catch {
      // Ancien format : string brute
      return { reference: raw };
    }
  } catch (e) {
    return null;
  }
}

/**
 * Récupère uniquement la référence NT
 */
export async function getTxReference(txId) {
  const meta = await getTxMetadata(txId);
  return meta?.reference || null;
}