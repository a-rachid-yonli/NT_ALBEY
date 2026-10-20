// context/TransactionContext.js
// Version wallet RÉEL + guard anti-rafale
// ✅ Support de /transactions/entries/me (format EntryOut) EN PRIORITÉ
// ✅ Fallback sur /transactions (format TransactionBaseResponse) si besoin
// ✅ Détection des transferts entrants → notification
// ✅ Enrichissement des entries avec trans_type parent (cascade)
// ✅ Typo backend 'comte_compte' (avec T) + système par IDs
// ✅ Flag first-run PER-USER (évite la boucle infinie de notifs et l'héritage entre comptes)
// ✅ CORRECTIF MAJEUR : notifie TOUS les crédits récents (< 24h) uniquement
// ✅ v4 : FUSION avec les achats Boutique stockés localement
// ✅ v5 : FIX transfert guichet vs compte à compte
//         → 'transfer' / 'transfert' (backend) = TRANSFERT GUICHET → 'transferAgency'
//         → 'comte_compte' / 'compte_compte' = COMPTE À COMPTE → 'transfer'
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../services/api';
import { useAuth } from './AuthContext';
import { getShopTxs } from '../utils/shopTxStore';

const SET_LOADING = 'SET_LOADING';
const SET_WALLET = 'SET_WALLET';
const SET_TRANSACTIONS = 'SET_TRANSACTIONS';
const SET_ERROR = 'SET_ERROR';
const CLEAR = 'CLEAR';

const initialState = {
  balance: 0,
  wallet: null,
  transactions: [],
  totalTransactions: 0,
  transactionsForbidden: false,
  isLoading: true,
  error: null,
  lastUpdatedAt: null,
};

function reducer(state, action) {
  switch (action.type) {
    case SET_LOADING:
      return { ...state, isLoading: action.payload };

    case SET_WALLET:
      return {
        ...state,
        wallet: action.payload,
        balance: parseFloat(action.payload?.balance || '0') || 0,
        isLoading: false,
        error: null,
        lastUpdatedAt: Date.now(),
      };

    case SET_TRANSACTIONS:
      return {
        ...state,
        transactions: action.payload.items,
        totalTransactions: action.payload.total,
        transactionsForbidden: !!action.payload._forbidden,
      };

    case SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };

    case CLEAR:
      return { ...initialState, isLoading: false };

    default:
      return state;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   ✅ v5 : MAPPING EntryOut → format interne
   ═══════════════════════════════════════════════════════════════════════ */

function mapEntryTypeToFront(entryType) {
  if (!entryType) return 'transfer';
  const t = String(entryType).toLowerCase();

  const map = {
    // ─── TRANSFERT GUICHET (transfert au guichet) ───────────
    // ✅ Le backend utilise `transfer` pour le guichet (endpoint /transactions/transfert)
    'transfer':             'transferAgency',   // ✅ FIX : guichet
    'transfert':            'transferAgency',   // ✅ FIX : alias utilisé par l'app

    // ─── TRANSFERT COMPTE À COMPTE ──────────────────────────
    'comte_compte':         'transfer',         // ✅ typo backend
    'compte_compte':        'transfer',

    // ─── Ajustement (interne NT) ────────────────────────────
    'ajustement':           'transfer',

    // ─── Dépôts / Retraits ──────────────────────────────────
    'cashin':               'cashin',
    'depot':                'cashin',
    'bank_to_wallet':       'cashin',
    'cashout':              'withdraw',
    'retrait':              'withdraw',
    'wallet_to_bank':       'withdraw',
    'withdraw':             'withdraw',

    // ─── Factures ───────────────────────────────────────────
    'facture_payment':      'bill',
    'bill_payment':         'bill',
    'bill':                 'bill',
    'nigelec':              'bill',
    'sne':                  'bill',

    // ─── Gouv-Pay ───────────────────────────────────────────
    'gouvpay':              'gouvpay',
    'gov_payment':          'gouvpay',
    'tax_payment':          'gouvpay',

    // ─── Boutique : marchand générique ──────────────────────
    'merchant_payment':     'shop',
    'shop_purchase':        'shop',

    // ─── Boutique : CRÉDIT ──────────────────────────────────
    'airtime':              'shop',
    'airtime_self':         'shop',
    'airtime_to_me':        'shop',
    'airtime_to_phone':     'shop',
    'airtime_purchase':     'shop',
    'credit_purchase':      'shop',
    'recharge_credit':      'shop',

    // ─── Boutique : STOCK ───────────────────────────────────
    'stock':                'shop',
    'stock_recharge':       'shop',
    'stock_to_me':          'shop',
    'stock_purchase':       'shop',
    'recharge_stock':       'shop',

    // ─── Boutique : SOFTPHONE ───────────────────────────────
    'softphone':            'shop',
    'softphone_recharge':   'shop',
    'softphone_to_phone':   'shop',
    'softphone_purchase':   'shop',
    'recharge_softphone':   'shop',

    // ─── Boutique : BLR ─────────────────────────────────────
    'blr':                  'shop',
    'blr_recharge':         'shop',
    'blr_resubscribe':      'shop',
    'blr_payment':          'shop',
    'blr_subscription':     'shop',
    'resubscribe_blr':      'shop',

    // ─── Boutique : AUTRES ──────────────────────────────────
    'ntrecharge':           'shop',
    'nt_recharge':          'shop',
    'bundle_purchase':      'shop',
    'bundle':               'shop',
    'plan_purchase':        'shop',
    'forfait':              'shop',
  };

  return map[t] || 'transfer';
}

function getEntryDescription(entryType, side) {
  if (!entryType) return side === 'credit' ? 'Transaction (reçu)' : 'Transaction';
  const t = String(entryType).toLowerCase();

  const map = {
    // ─── TRANSFERT GUICHET ──────────────────────────────────
    // ✅ v5 : `transfer` (backend) = transfert au guichet
    'transfer':             'Transfert au guichet',
    'transfert':            'Transfert au guichet',

    // ─── TRANSFERT COMPTE À COMPTE ──────────────────────────
    'comte_compte':         'Transfert compte à compte',
    'compte_compte':        'Transfert compte à compte',

    // ─── Ajustement ─────────────────────────────────────────
    'ajustement':           'Ajustement',

    // ─── Dépôts / Retraits ──────────────────────────────────
    'cashin':               'Dépôt',
    'depot':                'Dépôt',
    'bank_to_wallet':       'Dépôt bancaire',
    'cashout':              'Retrait',
    'retrait':              'Retrait',
    'wallet_to_bank':       'Retrait vers banque',
    'withdraw':             'Retrait',

    // ─── Factures ───────────────────────────────────────────
    'facture_payment':      'Paiement facture',
    'bill_payment':         'Paiement facture',
    'bill':                 'Paiement facture',
    'nigelec':              'Facture NIGELEC',
    'sne':                  'Facture SNE',

    // ─── Gouv-Pay ───────────────────────────────────────────
    'gouvpay':              'Paiement Gouv-Pay',
    'gov_payment':          'Paiement Gouv-Pay',
    'tax_payment':          'Paiement taxe',

    // ─── Boutique : marchand générique ──────────────────────
    'merchant_payment':     'Achat marchand',
    'shop_purchase':        'Achat Boutique NT',

    // ─── Boutique : CRÉDIT ──────────────────────────────────
    'airtime':              'Achat crédit téléphonique',
    'airtime_self':         'Recharge crédit (pour moi)',
    'airtime_to_me':        'Recharge crédit (pour moi)',
    'airtime_to_phone':     'Envoi crédit téléphonique',
    'airtime_purchase':     'Achat crédit téléphonique',
    'credit_purchase':      'Achat crédit téléphonique',
    'recharge_credit':      'Recharge crédit',

    // ─── Boutique : STOCK ───────────────────────────────────
    'stock':                'Recharge stock NT Albey',
    'stock_recharge':       'Recharge stock NT Albey',
    'stock_to_me':          'Recharge stock NT Albey',
    'stock_purchase':       'Recharge stock NT Albey',
    'recharge_stock':       'Recharge stock NT Albey',

    // ─── Boutique : SOFTPHONE ───────────────────────────────
    'softphone':            'Recharge Softphone',
    'softphone_recharge':   'Recharge Softphone',
    'softphone_to_phone':   'Envoi crédit Softphone',
    'softphone_purchase':   'Recharge Softphone',
    'recharge_softphone':   'Recharge Softphone',

    // ─── Boutique : BLR ─────────────────────────────────────
    'blr':                  'Paiement BLR',
    'blr_recharge':         'Recharge BLR',
    'blr_resubscribe':      'Réabonnement BLR',
    'blr_payment':          'Paiement BLR',
    'blr_subscription':     'Abonnement BLR',
    'resubscribe_blr':      'Réabonnement BLR',

    // ─── Boutique : AUTRES ──────────────────────────────────
    'ntrecharge':           'Recharge NT',
    'nt_recharge':          'Recharge NT',
    'bundle_purchase':      'Achat forfait',
    'bundle':               'Achat forfait',
    'plan_purchase':        'Achat forfait',
    'forfait':              'Achat forfait',
  };

  const label = map[t] || 'Transaction';
  return side === 'credit' ? `${label} (reçu)` : label;
}

function mapEntryFromBackend(entry, transTypeById = {}) {
  if (!entry) return null;

  const amount = parseFloat(entry.amount || '0') || 0;
  const isCredit = entry.side === 'credit';

  const parentTransType = transTypeById[entry.transaction_id] || null;
  const effectiveType = parentTransType || entry.entry_type;

  return {
    id: entry.id,
    type: mapEntryTypeToFront(effectiveType),
    amount: isCredit ? Math.abs(amount) : -Math.abs(amount),
    date: entry.created_at,
    description: getEntryDescription(effectiveType, entry.side),
    reference: entry.transaction_id,
    status: 'success',
    details: {
      entry_type: entry.entry_type,
      trans_type: parentTransType,
      side: entry.side,
      balance_before: entry.balance_before,
      balance_after: entry.balance_after,
      transaction_id: entry.transaction_id,
      currency: entry.currency,
      entry_order: entry.entry_order,
    },
    deletable: false,
  };
}

const TransactionContext = createContext();

const MIN_REFRESH_INTERVAL_MS = 3000;

const NOTIFIED_TX_IDS_KEY = '@ntalbey_notified_tx_ids';
const FIRST_RUN_DONE_KEY = '@ntalbey_notif_first_run_done';
const NOTIF_META_KEY = '@ntalbey_notif_meta';

/* ═══════════════════════════════════════════════════════════════════════
   ✅ DÉTECTION DES ARGENT REÇU → NOTIFICATION (PER-USER)
   ═══════════════════════════════════════════════════════════════════════ */
async function processIncomingTransfers(mapped, userId) {
  if (!userId) return;

  try {
    const notifiedKey = `${NOTIFIED_TX_IDS_KEY}_${userId}`;
    const firstRunKey = `${FIRST_RUN_DONE_KEY}_${userId}`;

    const idsRaw = await AsyncStorage.getItem(notifiedKey);
    let notifiedIds = [];
    try {
      notifiedIds = idsRaw ? JSON.parse(idsRaw) : [];
      if (!Array.isArray(notifiedIds)) notifiedIds = [];
    } catch {
      notifiedIds = [];
    }
    const notifiedSet = new Set(notifiedIds.map(String));

    const firstRunFlag = await AsyncStorage.getItem(firstRunKey);
    const isFirstRun = firstRunFlag === null;

    const normalizeSide = (value) => {
      if (value === true)  return 'credit';
      if (value === false) return 'debit';
      if (!value) return null;
      const v = String(value).toLowerCase().trim();
      if (v === 'credit' || v === 'c' || v === 'cr' || v === 'in' || v === 'received') return 'credit';
      if (v === 'debit'  || v === 'd' || v === 'dr' || v === 'out' || v === 'sent')     return 'debit';
      return null;
    };

    const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();

    const credits = mapped.filter((t) => {
      const sideNorm = normalizeSide(t.details?.side);
      if (sideNorm !== 'credit' || t.amount <= 0) return false;
      // ✅ v4 : ignore les achats boutique (source locale)
      if (t.details?.source === 'local_shop') return false;
      const txDate = t.date ? new Date(t.date).getTime() : 0;
      if (!txDate || (now - txDate) > RECENT_WINDOW_MS) return false;
      return true;
    });

    if (isFirstRun) {
      let notifiedCount = 0;
      for (const tx of credits) {
        const txId = String(tx.details?.transaction_id || tx.id);
        const amountStr = Math.abs(tx.amount).toLocaleString('fr-FR');
        try {
          await API.addNotification({
            title: '💸 Argent reçu',
            message: `Vous avez reçu ${amountStr} FCFA.`,
            type: 'success',
            transactionId: txId,
            reference: tx.reference,
          });
          notifiedCount++;
        } catch (e) {}

        notifiedSet.add(txId);
      }
      for (const tx of mapped) {
        const txId = String(tx.details?.transaction_id || tx.id);
        notifiedSet.add(txId);
      }
      const finalIds = Array.from(notifiedSet).slice(-200);
      await AsyncStorage.setItem(notifiedKey, JSON.stringify(finalIds));
      await AsyncStorage.setItem(firstRunKey, 'true');
      if (__DEV__) console.log(`🔔 [Notif] first-run ${userId}: ${notifiedCount} notifiées`);
      return;
    }

    const newlyNotified = [];
    for (const tx of credits) {
      const txId = String(tx.details?.transaction_id || tx.id);
      if (notifiedSet.has(txId)) continue;
      const amountStr = Math.abs(tx.amount).toLocaleString('fr-FR');
      try {
        await API.addNotification({
          title: '💸 Argent reçu',
          message: `Vous avez reçu ${amountStr} FCFA.`,
          type: 'success',
          transactionId: txId,
          reference: tx.reference,
        });
        notifiedSet.add(txId);
        newlyNotified.push(txId);
      } catch (e) {}
    }

    const finalIds = Array.from(notifiedSet).slice(-200);
    await AsyncStorage.setItem(notifiedKey, JSON.stringify(finalIds));
    if (__DEV__ && newlyNotified.length > 0) {
      console.log(`🔔 [Notif] ${newlyNotified.length} nouvelle(s) notification(s)`);
    }
  } catch (e) {
    if (__DEV__) console.warn('⚠️ [Notif] Erreur processIncomingTransfers');
  }
}

export function TransactionProvider({ children }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);

  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);
  const lastLoadAtRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const userId = user?.id || null;

  const loadAll = useCallback(async ({ silent = false, force = false } = {}) => {
    if (!userId) {
      dispatch({ type: CLEAR });
      return;
    }

    if (isLoadingRef.current) {
      if (__DEV__) console.log('⏭️ loadAll : déjà en cours, skip');
      return;
    }

    const now = Date.now();
    if (!force && now - lastLoadAtRef.current < MIN_REFRESH_INTERVAL_MS) {
      if (__DEV__) console.log('⏭️ loadAll : trop récent, skip');
      return;
    }

    isLoadingRef.current = true;
    lastLoadAtRef.current = now;

    if (!silent) dispatch({ type: SET_LOADING, payload: true });

    try {
      const currentUser = await API.getCurrentUser();
      const phone = currentUser?.phone || currentUser?.phone_number;
      if (!phone) throw new Error('Numéro de téléphone manquant');

      if (__DEV__) console.log('📡 Chargement wallet pour', phone);

      // 1️⃣ Wallet
      const wallet = await API.getWallet(phone);
      if (!isMountedRef.current) return;
      dispatch({ type: SET_WALLET, payload: wallet });

      // 2️⃣ Transactions backend
      const walletId = wallet?.id || null;
      const result = await API.getTransactions({ page: 1, page_size: 50 });

      if (!isMountedRef.current) return;

      let mappedBackend;

      if (result._viaEntries) {
        const transTypeById = {};

        try {
          const rawTx = await API.getTransactionsRaw({ page: 1, page_size: 100 });
          if (rawTx?.items?.length > 0) {
            for (const tx of rawTx.items) {
              transTypeById[tx.id] = tx.trans_type;
            }
            if (__DEV__) {
              console.log(
                `📋 [TransactionContext] ${Object.keys(transTypeById).length} trans_type (via liste)`
              );
            }
          }
        } catch (e) {
          if (__DEV__) console.log('⚠️ getTransactionsRaw a échoué');
        }

        if (
          Object.keys(transTypeById).length === 0 &&
          Array.isArray(result.items) &&
          result.items.length > 0
        ) {
          if (__DEV__) {
            console.log('ℹ️ [TransactionContext] Fallback : fetch individuel des tx parents');
          }

          if (!global.__ntalbeyTransTypeCache) {
            global.__ntalbeyTransTypeCache = {};
          }
          const cache = global.__ntalbeyTransTypeCache;

          const uniqueTxIds = [
            ...new Set(result.items.map((e) => e.transaction_id).filter(Boolean)),
          ];

          const toFetch = uniqueTxIds.filter((id) => cache[id] === undefined);

          for (const txId of toFetch) {
            const tx = await API.getTransactionRawById(txId);
            cache[txId] = tx?.trans_type || null;
          }

          for (const txId of uniqueTxIds) {
            if (cache[txId]) transTypeById[txId] = cache[txId];
          }
        }

        mappedBackend = (result.items || [])
          .map((entry) => mapEntryFromBackend(entry, transTypeById))
          .filter(Boolean);
      } else {
        mappedBackend = (result.items || [])
          .map((tx) => API._mapTransactionFromBackend(tx, walletId))
          .filter(Boolean);
      }

      // ✅ v4 : FUSION avec les achats Boutique stockés localement
      let localShopTxs = [];
      try {
        localShopTxs = await getShopTxs(userId);
        if (__DEV__ && localShopTxs.length > 0) {
          console.log(`🛍️ [TransactionContext] ${localShopTxs.length} achat(s) boutique local(aux)`);
        }
      } catch (e) {
        if (__DEV__) console.warn('⚠️ [TransactionContext] Erreur getShopTxs');
      }

      const combined = [...localShopTxs, ...mappedBackend].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      if (__DEV__) {
        console.log(
          `📊 [TransactionContext] ${combined.length} transactions totales` +
          ` (${mappedBackend.length} backend + ${localShopTxs.length} boutique locale)` +
          ` — source: ${result._viaEntries ? 'entries/me' : 'transactions'}`
        );

        const last5 = combined.slice(0, 5).map((t) => ({
          desc: t.description,
          type: t.type,
          amount: t.amount,
          entry_type: t.details?.entry_type,
          trans_type: t.details?.trans_type,
          side: t.details?.side,
          source: t.details?.source || 'backend',
        }));
        console.log('🔍 [TransactionContext] 5 dernières tx :', last5);

        const rawTypes = [
          ...new Set(
            combined.map(
              (t) =>
                `${t.details?.entry_type || '?'} | ${t.details?.trans_type || '?'}` +
                (t.details?.source === 'local_shop' ? ' [LOCAL]' : '')
            )
          ),
        ];
        console.log('🔍 [TransactionContext] Tous les types bruts :', rawTypes);
      }

      dispatch({
        type: SET_TRANSACTIONS,
        payload: {
          items: combined,
          total: combined.length,
          _forbidden: result._forbidden,
        },
      });

      // ✅ 3️⃣ Détection des crédits entrants (backend uniquement)
      await processIncomingTransfers(mappedBackend, userId);

      if (__DEV__ && result._forbidden) {
        console.log('ℹ️ Historique indisponible : permissions backend manquantes');
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      if (__DEV__) console.warn('⚠️ Erreur chargement :', error?.message);
      dispatch({ type: SET_ERROR, payload: error.message });
    } finally {
      isLoadingRef.current = false;
    }
  }, [userId]);

  useEffect(() => {
    if (userId) loadAll({ silent: false });
    else dispatch({ type: CLEAR });
  }, [userId, loadAll]);

  const refreshWallet = useCallback(async () => {
    if (!userId) return;
    await loadAll({ silent: true });
  }, [userId, loadAll]);

  const refreshData = useCallback(async () => {
    await loadAll({ silent: false, force: true });
  }, [loadAll]);

  const addTransaction = useCallback(async (transaction) => {
    if (__DEV__) console.log('ℹ️ addTransaction ignorée : les transactions viennent du backend');
    refreshWallet();
    return transaction;
  }, [refreshWallet]);

  const deleteTransaction = useCallback(async () => {
    if (__DEV__) console.log('ℹ️ deleteTransaction désactivée (backend only)');
    return false;
  }, []);

  return (
    <TransactionContext.Provider value={{
      balance: state.balance,
      wallet: state.wallet,
      transactions: state.transactions,
      totalTransactions: state.totalTransactions,
      transactionsForbidden: state.transactionsForbidden,
      isLoading: state.isLoading,
      error: state.error,
      lastUpdatedAt: state.lastUpdatedAt,

      refreshWallet,
      refreshData,
      addTransaction,
      deleteTransaction,

      entries: state.transactions,
      refreshBalance: refreshWallet,
    }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
}