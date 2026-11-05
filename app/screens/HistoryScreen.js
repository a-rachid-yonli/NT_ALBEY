// screens/HistoryScreen.js
// ✅ v2 : cartes participantes (DE / À) avec NOM + TÉLÉPHONE pour émetteur ET bénéficiaire
//         → même rendu que dans SendMoneyScreen
// ✅ Affiche la même chose que le reçu post-envoi (référence NT + UUID + numéros)
// ✅ Utilise le cache local pour garantir l'affichage des bons numéros
// ✅ DESIGN PREMIUM : moderne, épuré, professionnel
// ✅ PULL-TO-REFRESH : tirer vers le bas pour forcer un rechargement backend
// ✅ v3 : SUPPORT DES ACHATS BOUTIQUE (Stock, Crédit, Softphone, BLR) avec icône 🛍️
// ✅ v4 : SUPPORT TRANSFERT GUICHET (transferAgency) — filtre dédié + détection
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Image,
  Modal,
  Share,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Linking,
} from 'react-native';
import { TranslatedText as Text, TranslatedTextInput as TextInput, TranslatedAlert as Alert, ThemedView as View, ThemedTouchableOpacity as TouchableOpacity, ThemedScrollView as ScrollView } from '../context/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { getLogoBase64, escapeHtml } from '../utils/pdfUtils';
import { useTransactions } from '../context/TransactionContext';
import { API } from '../services/api';
import { getTxMetadata } from '../utils/txRefCache';
import { TransactionSkeletonList } from '../components/SkeletonLoader';

// ═══════════════════════════════════════════════════════════════
// 🎨 PALETTE PREMIUM
// ═══════════════════════════════════════════════════════════════
const COLORS = {
  primary:      '#008933',
  primarySoft:  '#E8F5E9',
  primaryDark:  '#006B28',
  accent:       '#FF6600',
  accentSoft:   '#FFF3E0',
  blue:         '#3B82F6',
  blueSoft:     '#DBEAFE',
  teal:         '#10B981',
  tealSoft:     '#D1FAE5',
  gold:         '#F59E0B',
  goldSoft:     '#FEF3C7',
  purple:       '#8B5CF6',
  purpleSoft:   '#EDE9FE',
  pink:         '#EC4899',
  pinkSoft:     '#FCE7F3',
  textPrimary:  '#0F172A',
  textSecondary:'#64748B',
  textMuted:    '#94A3B8',
  border:       '#E2E8F0',
  borderSoft:   '#F1F5F9',
  surface:      '#FFFFFF',
  surfaceAlt:   '#F8FAFC',
  background:   '#F1F5F9',
  danger:       '#EF4444',
  dangerSoft:   '#FEE2E2',
  shadow:       '#0F172A',
};

// ═══════════════════════════════════════════════════════════════
// 🎨 HELPERS
// ═══════════════════════════════════════════════════════════════
const formatStatus = (status) => {
  const map = {
    pending:    '⏳ En attente',
    processing: '🔄 En cours',
    success:    '✅ Succès',
    failed:     '❌ Échoué',
    expired:    '⏰ Expiré',
    cancelled:  '🚫 Annulé',
  };
  return map[status] || (status ? String(status) : 'N/A');
};

const getStatusColor = (status) => {
  const map = {
    pending:    COLORS.gold,
    processing: COLORS.blue,
    success:    COLORS.teal,
    failed:     COLORS.danger,
    expired:    '#888888',
    cancelled:  COLORS.danger,
  };
  return map[status] || COLORS.teal;
};

const isUUID = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

const isValidNTRef = (ref) => {
  if (!ref || typeof ref !== 'string') return false;
  if (!ref.startsWith('NT')) return false;
  if (isUUID(ref)) return false;
  return true;
};

const cleanPhone = (p) => {
  if (!p) return null;
  const s = String(p).replace(/\s/g, '').replace(/^\+?227/, '');
  return s || null;
};

const isPhoneNumber = (label) => {
  if (!label) return false;
  return /^\d{8}$/.test(String(label));
};

const formatPartyLabel = (label) => {
  if (!label) return '';
  return isPhoneNumber(label) ? `+227 ${label}` : String(label);
};

// ═══════════════════════════════════════════════════════════════
// 🎯 ICÔNES SVG
// ═══════════════════════════════════════════════════════════════
const IconBack = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={COLORS.textPrimary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconFilter = ({ color = COLORS.textPrimary }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M4 6h16M6 12h12M9 18h6" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconSearch = ({ color = COLORS.textMuted }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
    <Path d="M20 20l-3.5-3.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconShare = ({ color = COLORS.primary }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconPDF = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={COLORS.danger} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2v6h6" stroke={COLORS.danger} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8 14h8M8 18h6" stroke={COLORS.danger} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconWhatsApp = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="#25D366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconEmpty = () => (
  <Svg width="48" height="48" viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="4" width="18" height="16" rx="2" stroke={COLORS.primary} strokeWidth="1.8" />
    <Path d="M3 10h18M9 4v16" stroke={COLORS.primary} strokeWidth="1.8" strokeLinecap="round" />
    <Circle cx="15" cy="15" r="2" stroke={COLORS.primary} strokeWidth="1.8" />
  </Svg>
);

const IconSparkle = () => (
  <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <Path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2z" fill="#FFD700" />
  </Svg>
);

// ═══════════════════════════════════════════════════════════════
// 📜 ÉCRAN HISTORIQUE
// ═══════════════════════════════════════════════════════════════
export default function HistoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width = 400, height = 800 } = useWindowDimensions();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [dateRange, setDateRange] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [flowFilter, setFlowFilter] = useState('all');
  const [exporting, setExporting] = useState(false);

  // ✅ Enrichissement depuis l'API + cache local
  const [enrichedTx, setEnrichedTx] = useState(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [cachedMeta, setCachedMeta] = useState(null);

  // ✅ Numéro et nom de l'utilisateur connecté
  const [currentUserPhone, setCurrentUserPhone] = useState(null);
  const [currentUserName, setCurrentUserName] = useState(null);

  // ✅ PULL-TO-REFRESH
  const [refreshing, setRefreshing] = useState(false);

  const { transactions, deleteTransaction, isLoading, refreshData, isOfflineCache } = useTransactions();

  useEffect(() => {
    (async () => {
      try {
        const u = await API.getCurrentUser();
        setCurrentUserPhone(cleanPhone(u?.phone));
        const name = u?.name || u?.full_name || u?.fullName || 'Titulaire du compte';
        setCurrentUserName(name);
      } catch (e) {
        if (__DEV__) console.warn('Impossible de charger l\'utilisateur:', e?.message);
      }
    })();
  }, []);

  // ═════════════════════════════════════════════════════════════
  // ✅ PULL-TO-REFRESH : force le rechargement backend
  // ═════════════════════════════════════════════════════════════
  const handlePullRefresh = useCallback(async () => {
    if (refreshing) return;
    if (__DEV__) console.log('🔄 [History] Pull-to-refresh déclenché');

    setRefreshing(true);
    try {
      await refreshData();
      if (__DEV__) console.log('✅ [History] Pull-to-refresh terminé');
    } catch (e) {
      if (__DEV__) console.log('⚠️ [History] Erreur pull-to-refresh:', e?.message);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, refreshData]);

  const cleanDescription = (raw) => {
    if (!raw) return 'Transaction';
    let text = String(raw);
    text = text.replace(/transferAgency\.transferTo/gi, 'Transfert au guichet à');
    text = text.replace(/sendMoney\.transferTo/gi, 'Transfert à');
    text = text.replace(/sendMoney\.beneficiary/gi, 'Bénéficiaire');
    text = text.replace(/cashIn\.sender/gi, 'Expéditeur');
    text = text.replace(/history\.transferTo/gi, 'Transfert à');
    text = text.replace(/history\.transaction/gi, 'Transaction');
    text = text.replace(/transferAgency\./gi, '');
    text = text.replace(/sendMoney\./gi, '');
    text = text.replace(/cashIn\./gi, '');
    text = text.replace(/history\./gi, '');
    text = text.replace(/common\./gi, '');
    text = text.replace(/payment\./gi, '');
    text = text.replace(/shop\./gi, '');
    text = text.replace(/gouvPay\./gi, '');
    text = text.replace(/withdraw\./gi, '');
    text = text.replace(/savings\./gi, '');
    return text.trim();
  };

  const getFilteredTransactions = () => {
    let filtered = [...transactions];

    // 1. Filtre par type
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(t => t.type === selectedFilter);
    }

    // 2. Filtre par sens de flux (Entrées vs Sorties)
    if (flowFilter === 'in') {
      filtered = filtered.filter(t => Number(t.amount) > 0);
    } else if (flowFilter === 'out') {
      filtered = filtered.filter(t => Number(t.amount) < 0);
    }

    // 3. Filtre par statut (Succès / En cours / Échoué)
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => (t.status || 'success') === statusFilter);
    }

    // 4. Filtre par période temporelle
    if (dateRange !== 'all') {
      const now = new Date();
      filtered = filtered.filter(t => {
        if (!t.date) return false;
        const txDate = new Date(t.date);
        if (dateRange === 'today') {
          return txDate.toDateString() === now.toDateString();
        } else if (dateRange === 'week') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
          return txDate >= sevenDaysAgo;
        } else if (dateRange === 'month') {
          return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
        } else if (dateRange === 'last_month') {
          const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          return txDate.getMonth() === lastMonth && txDate.getFullYear() === year;
        }
        return true;
      });
    }

    // 5. Recherche avancée multi-critères
    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      const numQ = q.replace(/[^0-9]/g, '');
      filtered = filtered.filter(t => {
        const desc = (t.description || '').toLowerCase();
        const ben = (t.details?.beneficiary || '').toLowerCase();
        const sen = (t.details?.sender || '').toLowerCase();
        const ref = (t.reference || '').toLowerCase();
        const techId = (t.id || t.technicalId || '').toString().toLowerCase();
        const phone = (t.details?.phone || t.details?.receiver_phone || t.details?.sender_phone || '').toString();
        const amountStr = Math.abs(Number(t.amount) || 0).toString();

        return (
          desc.includes(q) ||
          ben.includes(q) ||
          sen.includes(q) ||
          ref.includes(q) ||
          techId.includes(q) ||
          (numQ && phone.includes(numQ)) ||
          (numQ && amountStr.includes(numQ))
        );
      });
    }

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    return filtered;
  };

  const filteredTransactions = getFilteredTransactions();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const h = date.getHours();
    const m = String(date.getMinutes()).padStart(2, '0');
    if (date.toDateString() === today.toDateString()) {
      return `Aujourd'hui, ${h}:${m}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Hier, ${h}:${m}`;
    } else {
      const d = String(date.getDate()).padStart(2, '0');
      const mo = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      return `${d}/${mo}/${y}`;
    }
  };

  const formatFullDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const d = String(date.getDate()).padStart(2, '0');
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${d}/${mo}/${y} à ${h}:${min}`;
  };

  const getAmountStyle = (amount) => ({
    color: amount > 0 ? COLORS.teal : COLORS.textPrimary,
    fontWeight: '800',
  });

  const getAmountPrefix = (amount) => amount > 0 ? '+ ' : '- ';

  // ═══════════════════════════════════════════════════════════════
  // ✅ ICÔNES PAR TYPE
  // ═══════════════════════════════════════════════════════════════
  const getIconForType = (type) => {
    const icons = {
      // ─── Transferts ────────────────────────────────────────────
      send: '📤',
      transfer: '📤',
      transferAgency: '🏦',

      // ─── Retraits / Dépôts ─────────────────────────────────────
      withdraw: '💰',
      cashin: '📥',

      // ─── Paiements ─────────────────────────────────────────────
      payment: '💳',
      bill: '📄',
      gouvpay: '🏛️',

      // ─── Boutique NT ✨ ────────────────────────────────────────
      shop: '🛍️',

      // ─── Autres ────────────────────────────────────────────────
      visa_recharge: '💳',
      savings: '🏦',

      default: '📋',
    };
    return icons[type] || icons.default;
  };

  // ═══════════════════════════════════════════════════════════════
  // ✅ COULEURS PAR TYPE
  // ═══════════════════════════════════════════════════════════════
  const getColorForType = (type) => {
    const colors = {
      send: COLORS.accent,
      transfer: COLORS.primary,
      transferAgency: COLORS.primary,

      withdraw: COLORS.gold,
      cashin: COLORS.teal,

      payment: COLORS.purple,
      bill: COLORS.blue,
      gouvpay: '#14B8A6',

      shop: COLORS.pink,

      visa_recharge: '#1A1F71',
      savings: COLORS.primary,
    };
    return colors[type] || COLORS.textMuted;
  };

  const getTransactionUUID = (tx) => {
    if (!tx) return null;
    if (tx.details?.transaction_id && isUUID(tx.details.transaction_id)) return tx.details.transaction_id;
    if (tx.transactionId && isUUID(tx.transactionId)) return tx.transactionId;
    if (isUUID(String(tx.id))) return String(tx.id);
    const candidates = [tx.uuid, tx.details?.uuid, tx.details?.reference, tx.reference];
    for (const c of candidates) {
      if (c && isUUID(String(c))) return String(c);
    }
    return null;
  };

  // ══════════════════════════════════════════════════════════════
  // ✅ ENRICHISSEMENT : cache local → API → fallback liste
  // ══════════════════════════════════════════════════════════════
  const handleTransactionPress = async (transaction) => {
    setSelectedTransaction(transaction);
    setEnrichedTx(null);
    setCachedMeta(null);
    setModalVisible(true);

    const uuid = getTransactionUUID(transaction);
    if (!uuid) {
      if (__DEV__) console.log('⚠️ [History] Pas d\'UUID dans l\'entry');
      return;
    }

    setIsEnriching(true);
    try {
      if (__DEV__) console.log('🔍 [History] Enrichissement tx:', uuid);

      const meta = await getTxMetadata(uuid);
      if (meta) {
        if (__DEV__) console.log('✅ [History] Metadata du cache:', meta);
        setCachedMeta(meta);
      }

      let fullTx = null;
      try {
        fullTx = await API.getTransactionRawById(uuid);
        if (fullTx && __DEV__) {
          console.log('✅ [History] Via /transactions/{uuid}');
        }
      } catch (e) {
        if (__DEV__) console.log('⚠️ [History] /transactions/{uuid} KO:', e?.message);
      }

      if (!fullTx) {
        if (__DEV__) console.log('🔁 [History] Fallback liste /transactions');
        try {
          const list = await API.getTransactionsRaw({ page: 1, page_size: 100 });
          if (list?.items?.length) {
            fullTx = list.items.find(t => t.id === uuid) || null;
          }
        } catch (e) {
          if (__DEV__) console.log('⚠️ [History] Fallback liste KO:', e?.message);
        }
      }

      let senderWallet = null;
      let receiverWallet = null;
      let senderCustomerName = null;
      let receiverCustomerName = null;

      const d = transaction?.details || {};
      const sWalletId = fullTx?.sender_wallet_id || d.sender_wallet_id;
      const rWalletId = fullTx?.receiver_wallet_id || d.receiver_wallet_id;

      if (sWalletId) {
        try { senderWallet = await API.getWalletById(sWalletId); } catch (e) {}
      }
      if (rWalletId) {
        try { receiverWallet = await API.getWalletById(rWalletId); } catch (e) {}
      }

      const effSenderPhone = cleanPhone(meta?.sender_phone) ||
        cleanPhone(fullTx?.sender_phone) ||
        cleanPhone(senderWallet?.wallet_number || senderWallet?.phone_number || senderWallet?.phone) ||
        cleanPhone(d.sender_phone || d.sender);

      const effReceiverPhone = cleanPhone(meta?.receiver_phone) ||
        cleanPhone(fullTx?.receiver_phone) ||
        cleanPhone(receiverWallet?.wallet_number || receiverWallet?.phone_number || receiverWallet?.phone) ||
        cleanPhone(d.receiver_phone || d.phone || d.beneficiary);

      if (effSenderPhone && !meta?.sender_name) {
        try {
          const cust = await API.searchCustomerByPhone(effSenderPhone);
          if (cust) {
            senderCustomerName = cust.name || cust.full_name || `${cust.first_name || ''} ${cust.last_name || ''}`.trim() || null;
          }
        } catch (e) {}
      }

      if (effReceiverPhone && !meta?.receiver_name) {
        try {
          const cust = await API.searchCustomerByPhone(effReceiverPhone);
          if (cust) {
            receiverCustomerName = cust.name || cust.full_name || `${cust.first_name || ''} ${cust.last_name || ''}`.trim() || null;
          }
        } catch (e) {}
      }

      setEnrichedTx({
        fullTx,
        senderWallet,
        receiverWallet,
        senderPhone: effSenderPhone,
        receiverPhone: effReceiverPhone,
        senderCustomerName,
        receiverCustomerName,
        uuid,
      });
      if (__DEV__) console.log('✅ [History] Enrichissement terminé');
    } catch (e) {
      if (__DEV__) console.log('❌ [History] Erreur enrichissement:', e?.message);
    } finally {
      setIsEnriching(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // ✅ DONNÉES D'AFFICHAGE — nom + téléphone pour ÉMETTEUR et BÉNÉFICIAIRE
  // ══════════════════════════════════════════════════════════════
  const getDisplayData = () => {
    if (!selectedTransaction) return null;

    const fullTx = enrichedTx?.fullTx;
    const senderWallet = enrichedTx?.senderWallet;
    const receiverWallet = enrichedTx?.receiverWallet;
    const d = selectedTransaction.details || {};

    // ─── Référence business NT ────────────────────────────────
    const businessRef =
      (cachedMeta?.reference && isValidNTRef(cachedMeta.reference) ? cachedMeta.reference : null) ||
      (fullTx?.reference && isValidNTRef(fullTx.reference) ? fullTx.reference : null) ||
      (selectedTransaction.reference && isValidNTRef(selectedTransaction.reference) ? selectedTransaction.reference : null) ||
      null;

    // ─── ID technique (UUID) ──────────────────────────────────
    const technicalId =
      (fullTx?.id && isUUID(fullTx.id)) ? fullTx.id :
      (d.transaction_id && isUUID(d.transaction_id)) ? d.transaction_id :
      (selectedTransaction.transactionId && isUUID(selectedTransaction.transactionId)) ? selectedTransaction.transactionId :
      (isUUID(String(selectedTransaction.id))) ? String(selectedTransaction.id) :
      null;

    // ─── Numéros depuis cache et wallets ──────────────────────
    const cachedSenderPhone   = cleanPhone(cachedMeta?.sender_phone);
    const cachedReceiverPhone = cleanPhone(cachedMeta?.receiver_phone);

    const walletSenderPhone   = cleanPhone(senderWallet?.wallet_number);
    const walletReceiverPhone = cleanPhone(receiverWallet?.wallet_number);

    const senderPhone   = cachedSenderPhone   || cleanPhone(enrichedTx?.senderPhone)   || walletSenderPhone   || null;
    const receiverPhone = cachedReceiverPhone || cleanPhone(enrichedTx?.receiverPhone) || walletReceiverPhone || null;

    // ─── Noms depuis le cache ou enrichissement ───────────────
    const cachedSenderName   = cachedMeta?.sender_name   || enrichedTx?.senderCustomerName   || null;
    const cachedReceiverName = cachedMeta?.receiver_name || enrichedTx?.receiverCustomerName || null;

    if (__DEV__) {
      console.log('📱 [History] Participantes:');
      console.log('   cached sender   :', cachedSenderName, senderPhone);
      console.log('   cached receiver :', cachedReceiverName, receiverPhone);
      console.log('   wallet sender   :', walletSenderPhone);
      console.log('   wallet receiver :', walletReceiverPhone);
    }

    // ═══════════════════════════════════════════════════════════
    // ✅ DÉTECTION DU TYPE RÉEL SANS CONFUSION
    // ═══════════════════════════════════════════════════════════
    const frontType      = selectedTransaction.type || null;
    const rawEntryType   = d.entry_type || null;
    const rawTransType   = d.trans_type || null;

    const allTypes = [frontType, rawEntryType, rawTransType].filter(Boolean);

    // 1. Dépôt guichet : de l'agence vers mon wallet
    const isDeposit = allTypes.some(t =>
      t === 'cashin' || t === 'depot' || t === 'bank_to_wallet'
    );

    // 2. Retrait guichet / Envoi à moi-même : de mon wallet vers l'agence
    const isWithdrawal = allTypes.some(t =>
      t === 'cashout' || t === 'withdraw' || t === 'wallet_to_bank' || t === 'self-send'
    );

    // 3. Transfert guichet pour un tiers : retrait en agence avec code
    // ⚠️ NE PAS inclure 'transfer' ici !
    const isAgencyTransfer = allTypes.some(t =>
      t === 'transferAgency' || t === 'transfert'
    );

    // 4. Transfert compte à compte (P2P wallet à wallet)
    const isP2PTransfer = (
      allTypes.some(t => t === 'compte_compte' || t === 'comte_compte' || t === 'transfer')
    ) && !isAgencyTransfer && !isDeposit && !isWithdrawal;

    const isSend = selectedTransaction.amount < 0;
    const isReceive = selectedTransaction.amount > 0;

    // ═══════════════════════════════════════════════════════════
    // ✅ RÉSOLUTION NOM + TÉLÉPHONE POUR CHAQUE PARTIE
    // ═══════════════════════════════════════════════════════════
    const fallbackHolder = currentUserName || 'Titulaire du compte';

    let senderName = null;
    let senderPhoneDisplay = null;
    let senderIsPhone = false;

    let receiverName = null;
    let receiverPhoneDisplay = null;
    let receiverIsPhone = false;

    if (isDeposit) {
      // 🏦 Dépôt guichet : DE = Guichet NT Albey, À = mon wallet
      senderName = 'Guichet NT Albey';
      senderPhoneDisplay = null;
      senderIsPhone = false;

      receiverName = currentUserName || fallbackHolder;
      receiverPhoneDisplay = currentUserPhone || null;
      receiverIsPhone = !!currentUserPhone;
    } else if (isWithdrawal) {
      // 🏦 Retrait guichet (Envoi à moi-même) : DE = mon wallet, À = Guichet NT Albey
      senderName = currentUserName || fallbackHolder;
      senderPhoneDisplay = currentUserPhone || null;
      senderIsPhone = !!currentUserPhone;

      receiverName = 'Guichet NT Albey (Retrait personnel)';
      receiverPhoneDisplay = null;
      receiverIsPhone = false;
    } else if (isAgencyTransfer) {
      // 🏦 Transfert au guichet pour un tiers
      if (isSend) {
        senderName = currentUserName || cachedSenderName || 'Moi';
        senderPhoneDisplay = currentUserPhone || cachedSenderPhone || null;
        senderIsPhone = !!senderPhoneDisplay;

        receiverName = cachedReceiverName || d.beneficiary || (receiverPhone ? `+227 ${receiverPhone}` : 'Bénéficiaire guichet');
        receiverPhoneDisplay = receiverPhone || null;
        receiverIsPhone = !!receiverPhone;
      } else {
        senderName = cachedSenderName || 'Expéditeur guichet';
        senderPhoneDisplay = senderPhone;
        senderIsPhone = !!senderPhone;

        receiverName = currentUserName || cachedReceiverName || fallbackHolder;
        receiverPhoneDisplay = currentUserPhone || cachedReceiverPhone || null;
        receiverIsPhone = !!receiverPhoneDisplay;
      }
    } else if (isP2PTransfer || frontType === 'transfer') {
      // 📤 / 📥 Transfert Compte à Compte (Wallet à Wallet) - AUCUNE mention de guichet ici !
      if (isSend) {
        // Envoi compte à compte : DE = moi, À = destinataire
        senderName = currentUserName || cachedSenderName || 'Moi';
        senderPhoneDisplay = currentUserPhone || cachedSenderPhone || null;
        senderIsPhone = !!senderPhoneDisplay;

        receiverName = cachedReceiverName || d.beneficiary || (receiverPhone ? `+227 ${receiverPhone}` : 'Bénéficiaire');
        receiverPhoneDisplay = receiverPhone || null;
        receiverIsPhone = !!receiverPhone;
      } else {
        // Réception compte à compte : DE = l'ami qui m'a envoyé, À = moi
        senderName = cachedSenderName || d.sender || (senderPhone ? `+227 ${senderPhone}` : 'Expéditeur');
        senderPhoneDisplay = senderPhone;
        senderIsPhone = !!senderPhone;

        receiverName = currentUserName || cachedReceiverName || fallbackHolder;
        receiverPhoneDisplay = currentUserPhone || cachedReceiverPhone || null;
        receiverIsPhone = !!receiverPhoneDisplay;
      }
    } else if (isSend) {
      senderName = currentUserName || cachedSenderName || 'Moi';
      senderPhoneDisplay = currentUserPhone || cachedSenderPhone || null;
      senderIsPhone = !!senderPhoneDisplay;

      receiverName = cachedReceiverName || d.beneficiary || 'Bénéficiaire';
      receiverPhoneDisplay = receiverPhone || null;
      receiverIsPhone = !!receiverPhone;
    } else if (isReceive) {
      senderName = cachedSenderName || d.sender || (senderPhone ? `+227 ${senderPhone}` : 'Expéditeur');
      senderPhoneDisplay = senderPhone;
      senderIsPhone = !!senderPhone;

      receiverName = currentUserName || cachedReceiverName || fallbackHolder;
      receiverPhoneDisplay = currentUserPhone || cachedReceiverPhone || null;
      receiverIsPhone = !!receiverPhoneDisplay;
    } else {
      senderName = cachedSenderName || currentUserName || 'Mon compte';
      senderPhoneDisplay = senderPhone || currentUserPhone || null;
      senderIsPhone = !!senderPhoneDisplay;

      receiverName = cachedReceiverName || d.beneficiary || 'Bénéficiaire';
      receiverPhoneDisplay = receiverPhone || null;
      receiverIsPhone = !!receiverPhone;
    }

    // ─── Labels formatés pour PDF / share ─────────────────────
    const buildPartyLabel = (name, phone, isPhone) => {
      if (isPhone && phone) {
        const cleanName = name && name !== 'Moi' && name !== 'Mon compte' ? name : null;
        return cleanName ? `${cleanName} • +227 ${phone}` : `+227 ${phone}`;
      }
      return name || '';
    };

    const emitterLabel     = buildPartyLabel(senderName, senderPhoneDisplay, senderIsPhone);
    const beneficiaryLabel = buildPartyLabel(receiverName, receiverPhoneDisplay, receiverIsPhone);

    // ─── Montants ─────────────────────────────────────────────
    const currency = fullTx?.currency_code || d.currency || 'XOF';
    const grossAmount = Number(fullTx?.gross_amount) || Number(d.gross_amount) || Math.abs(selectedTransaction.amount || 0);
    const feeAmount = Number(fullTx?.fee_amount) || Number(d.fee_amount) || 0;
    const netAmount = Number(fullTx?.net_amount) || Number(d.net_amount) || grossAmount;
    const isDebit = selectedTransaction.amount < 0;
    const totalDebited = isDebit ? grossAmount + feeAmount : grossAmount - feeAmount;
    const status = fullTx?.status || selectedTransaction.status || 'success';

    const date = fullTx?.initiated_at || selectedTransaction.date;

    return {
      businessRef,
      technicalId,
      currency,
      grossAmount,
      feeAmount,
      netAmount,
      totalDebited,
      isDebit,
      status,

      senderName,
      senderPhone: senderPhoneDisplay,
      senderIsPhone,
      receiverName,
      receiverPhone: receiverPhoneDisplay,
      receiverIsPhone,

      emitterLabel,
      beneficiaryLabel,

      dateFormatted: formatFullDate(date),
      description: cleanDescription(selectedTransaction.description),
      hasFeeInfo: feeAmount > 0 || (fullTx?.fee_amount != null && fullTx?.fee_amount !== '0'),
    };
  };

  const handleCancelTransaction = (transaction) => {
    Alert.alert(
      'Annuler cette transaction ?',
      `Le montant de ${Math.abs(transaction.amount).toLocaleString()} FCFA sera reversé sur votre solde.`,
      [
        { text: 'Non, garder', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: () => {
            deleteTransaction(transaction.id);
            setModalVisible(false);
            Alert.alert('C\'est fait', 'La transaction a été annulée avec succès.');
          }
        }
      ]
    );
  };

  // ══════════════════════════════════════════════════════════════
  // ✅ PDF HTML
  // ══════════════════════════════════════════════════════════════
  const generatePDFHTML = (details, logoBase64) => {
    const logoHtml = logoBase64
      ? `<img src="${logoBase64}" alt="NT Albey Logo" class="logo" />`
      : `<div style="background:linear-gradient(135deg,#008933,#00A34D);color:white;padding:10px 30px;border-radius:10px;display:inline-block;font-weight:700;font-size:22px;letter-spacing:4px;box-shadow:0 4px 15px rgba(0,137,51,0.3);margin-bottom:6px;">NT ALBEY</div>`;

    const amountStr = details.isDebit
      ? `- ${details.grossAmount.toLocaleString()} ${escapeHtml(details.currency)}`
      : `+ ${details.grossAmount.toLocaleString()} ${escapeHtml(details.currency)}`;

    const statusText = escapeHtml(formatStatus(details.status));
    const statusColor = getStatusColor(details.status);

    return `<!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8"><style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:Arial,sans-serif; padding:40px 30px; max-width:600px; margin:0 auto; color:#1A1A1A; background:white; }
          .header { text-align:center; border-bottom:3px solid #008933; padding-bottom:20px; margin-bottom:25px; }
          .logo-container { display:flex; flex-direction:column; align-items:center; justify-content:center; margin-bottom:8px; }
          .logo { max-width:120px; height:auto; margin-bottom:8px; }
          .header h1 { color:#008933; font-size:20px; margin:0; letter-spacing:2px; font-weight:700; }
          .header .subtitle { color:#666; font-size:13px; margin-top:4px; }
          .highlight-box { background-color:#F8F9FC; border-radius:8px; padding:16px; margin:16px 0; border-left:4px solid #008933; }
          .highlight-box .info-row { border-bottom:1px solid #E8E8E8; padding:10px 0; }
          .highlight-box .info-row:last-child { border-bottom:none; }
          .info-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #F0F0F0; }
          .info-row:last-child { border-bottom:none; }
          .info-label { color:#666; font-size:13px; font-weight:500; }
          .info-value { color:#1A1A1A; font-size:13px; font-weight:600; text-align:right; max-width:60%; word-break:break-word; }
          .info-value.amount-positive { color:#10B981; font-size:16px; font-weight:800; }
          .info-value.amount-negative { color:#FF6600; font-size:16px; font-weight:800; }
          .info-value.fees { color:#FF4444; font-weight:700; }
          .info-value.net { color:#10B981; font-weight:700; }
          .info-value.total { color:#008933; font-size:15px; font-weight:800; }
          .status-badge { background-color:${statusColor}; color:white; padding:3px 14px; border-radius:20px; font-size:11px; font-weight:600; display:inline-block; }
          .ref-block { background-color:#FFF3E0; border-radius:12px; padding:16px; margin:16px 0; text-align:center; }
          .ref-label { color:#666; font-size:11px; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }
          .ref-value { color:#FF6600; font-size:16px; font-weight:800; letter-spacing:2px; font-family:monospace; }
          .ref-uuid-label { color:#999; font-size:10px; text-transform:uppercase; letter-spacing:1px; margin-top:12px; margin-bottom:4px; }
          .ref-uuid { color:#666; font-size:10px; font-family:monospace; word-break:break-all; }
          .footer { text-align:center; margin-top:30px; padding-top:20px; border-top:2px solid #F0F0F0; color:#999; font-size:11px; }
          .footer .brand { color:#008933; font-weight:700; }
          .footer .date { font-size:9px; color:#BBB; margin-top:4px; }
        </style></head>
        <body>
          <div class="header">
            <div class="logo-container">${logoHtml}<h1>NT ALBEY</h1></div>
            <div class="subtitle">Reçu de transaction</div>
          </div>

          <div class="highlight-box">
            <div class="info-row"><span class="info-label">📋 Type d'opération</span><span class="info-value">${escapeHtml(details.description)}</span></div>
            <div class="info-row"><span class="info-label">💰 Montant</span><span class="info-value ${details.isDebit ? 'amount-negative' : 'amount-positive'}">${amountStr}</span></div>
          </div>

          <div class="info-row"><span class="info-label">📱 Émetteur</span><span class="info-value">${escapeHtml(details.senderName || '—')}</span></div>
          ${details.senderIsPhone && details.senderPhone ? `<div class="info-row"><span class="info-label">📞 Tél. émetteur</span><span class="info-value">+227 ${escapeHtml(details.senderPhone)}</span></div>` : ''}
          <div class="info-row"><span class="info-label">👤 Bénéficiaire</span><span class="info-value">${escapeHtml(details.receiverName || '—')}</span></div>
          ${details.receiverIsPhone && details.receiverPhone ? `<div class="info-row"><span class="info-label">📞 Tél. bénéficiaire</span><span class="info-value">+227 ${escapeHtml(details.receiverPhone)}</span></div>` : ''}

          ${details.hasFeeInfo ? `<div class="info-row"><span class="info-label">📋 Frais</span><span class="info-value fees">${details.feeAmount.toLocaleString()} ${escapeHtml(details.currency)}</span></div>` : ''}
          ${details.hasFeeInfo ? `<div class="info-row"><span class="info-label">🎁 Net</span><span class="info-value net">${details.netAmount.toLocaleString()} ${escapeHtml(details.currency)}</span></div>` : ''}
          ${details.hasFeeInfo ? `<div class="info-row"><span class="info-label">💳 Total débité</span><span class="info-value total">${details.totalDebited.toLocaleString()} ${escapeHtml(details.currency)}</span></div>` : ''}

          <div class="info-row"><span class="info-label">📅 Date</span><span class="info-value">${escapeHtml(details.dateFormatted)}</span></div>
          <div class="info-row"><span class="info-label">✅ Statut</span><span class="info-value"><span class="status-badge">${statusText}</span></span></div>

          ${(details.businessRef || details.technicalId) ? `
          <div class="ref-block">
            ${details.businessRef ? `
              <div class="ref-label">🔑 Référence transaction</div>
              <div class="ref-value">${escapeHtml(details.businessRef)}</div>
            ` : ''}
            ${details.technicalId ? `
              <div class="ref-uuid-label">🆔 ID technique (support)</div>
              <div class="ref-uuid">${escapeHtml(details.technicalId)}</div>
            ` : ''}
          </div>` : ''}

          <div class="footer"><div class="brand">NT Albey</div><div>Votre argent, partout, tout le temps</div><div class="date">Document généré le ${new Date().toLocaleString('fr-FR')}</div></div>
        </body>
      </html>`;
  };

  const handleExportPDF = async () => {
    const displayData = getDisplayData();
    if (!displayData) {
      Alert.alert('Erreur', 'Aucune donnée à exporter.');
      return;
    }
    try {
      setExporting(true);
      const logoBase64 = await getLogoBase64();
      const html = generatePDFHTML(displayData, logoBase64);
      const { base64 } = await Print.printToFileAsync({ html, base64: true });
      if (!base64) throw new Error('PDF vide');
      const filename = `recu_transaction_${Date.now()}.pdf`;
      const destUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(destUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(destUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Reçu de transaction`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        await Share.share({ message: buildShareText() });
      }
    } catch (error) {
      console.error('Erreur export PDF:', error);
      Alert.alert('Erreur', 'Impossible de générer le PDF.\n' + error.message);
    } finally {
      setExporting(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // ✅ TEXTE DE PARTAGE
  // ══════════════════════════════════════════════════════════════
  const buildShareText = () => {
    const d = getDisplayData();
    if (!d) return '';
    const amountStr = d.isDebit
      ? `- ${d.grossAmount.toLocaleString()} ${d.currency}`
      : `+ ${d.grossAmount.toLocaleString()} ${d.currency}`;

    return `NT ALBEY - REÇU DE TRANSACTION
━━━━━━━━━━━━━━━━━━━━━
${formatStatus(d.status)}
━━━━━━━━━━━━━━━━━━━━━
📋 Type d'opération : ${d.description}
💰 Montant           : ${amountStr}
📱 Émetteur          : ${d.senderName || '—'}
${d.senderIsPhone && d.senderPhone ? `📞 Tél. émetteur     : +227 ${d.senderPhone}\n` : ''}👤 Bénéficiaire      : ${d.receiverName || '—'}
${d.receiverIsPhone && d.receiverPhone ? `📞 Tél. bénéficiaire : +227 ${d.receiverPhone}\n` : ''}${d.hasFeeInfo ? `📋 Frais             : ${d.feeAmount.toLocaleString()} ${d.currency}\n` : ''}${d.hasFeeInfo ? `🎁 Net               : ${d.netAmount.toLocaleString()} ${d.currency}\n` : ''}${d.hasFeeInfo ? `💳 Total débité      : ${d.totalDebited.toLocaleString()} ${d.currency}\n` : ''}📅 Date              : ${d.dateFormatted}
🔑 Référence         : ${d.businessRef || 'Non disponible'}
${d.technicalId ? `🆔 ID technique      : ${d.technicalId}\n` : ''}━━━━━━━━━━━━━━━━━━━━━
📞 Support : 555 | 📧 support@ntalbey.ne
━━━━━━━━━━━━━━━━━━━━━
NT Albey - Votre argent, partout, tout le temps`;
  };

  const handleShare = async () => {
    if (!getDisplayData()) return;
    try {
      await Share.share({ message: buildShareText() });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de partager cette transaction.');
    }
  };

  // ══════════════════════════════════════════════════════════════
  // 📲 PARTAGE WHATSAPP RAPIDE
  // ══════════════════════════════════════════════════════════════
  const buildWhatsAppText = () => {
    const d = getDisplayData();
    if (!d) return '';
    const amountStr = d.isDebit
      ? `- ${d.grossAmount.toLocaleString()} ${d.currency}`
      : `+ ${d.grossAmount.toLocaleString()} ${d.currency}`;

    const statusBadge = d.status === 'success' ? '✅ SUCCÈS' : d.status === 'failed' ? '❌ ÉCHOUÉ' : '⏳ EN COURS';

    let text = `*🇳🇪 NIGER TELECOMS — NT ALBEY*\n`;
    text += `*REÇU DE TRANSACTION OFFICIEL*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📌 *Statut* : ${statusBadge}\n`;
    text += `📋 *Opération* : ${d.description}\n`;
    text += `💰 *Montant* : *${amountStr}*\n`;
    if (d.senderName) {
      text += `📱 *Émetteur* : ${d.senderName}\n`;
    }
    if (d.senderIsPhone && d.senderPhone) {
      text += `📞 *Tél. émetteur* : +227 ${d.senderPhone}\n`;
    }
    if (d.receiverName) {
      text += `👤 *Bénéficiaire* : ${d.receiverName}\n`;
    }
    if (d.receiverIsPhone && d.receiverPhone) {
      text += `📞 *Tél. bénéficiaire* : +227 ${d.receiverPhone}\n`;
    }
    if (d.hasFeeInfo) {
      text += `📋 *Frais* : ${d.feeAmount.toLocaleString()} ${d.currency}\n`;
      text += `🎁 *Net reçu* : ${d.netAmount.toLocaleString()} ${d.currency}\n`;
      text += `💳 *Total débité* : ${d.totalDebited.toLocaleString()} ${d.currency}\n`;
    }
    text += `📅 *Date* : ${d.dateFormatted}\n`;
    text += `🔑 *Référence* : *${d.businessRef || 'N/A'}*\n`;
    if (d.technicalId) {
      text += `🆔 *ID technique* : \`${d.technicalId}\`\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📞 Support client : 555 | support@ntalbey.ne\n`;
    text += `_NT Albey - Votre argent, partout, tout le temps._`;

    return text;
  };

  const handleShareWhatsApp = async () => {
    const text = buildWhatsAppText();
    if (!text) return;
    try {
      const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
      const canOpen = await Linking.canOpenURL(url).catch(() => false);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        const webUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        const canWeb = await Linking.canOpenURL(webUrl).catch(() => false);
        if (canWeb && Platform.OS === 'web') {
          await Linking.openURL(webUrl);
        } else {
          await Share.share({ message: text });
        }
      }
    } catch (e) {
      try {
        await Share.share({ message: text });
      } catch (_) {
        Alert.alert('Erreur', 'Impossible de partager vers WhatsApp.');
      }
    }
  };

  const totalDepense = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalReception = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const totalTransactions = transactions.length;

  // ✅ v4 : ajout du filtre "Guichet" pour le transfert en agence
  const filters = [
    { key: 'all',            label: 'Tout',            icon: '📋' },
    { key: 'send',           label: 'Envois',          icon: '📤' },
    { key: 'withdraw',       label: 'Retraits',        icon: '💰' },
    { key: 'transfer',       label: 'Compte à compte', icon: '📤' },
    { key: 'transferAgency', label: 'Guichet',         icon: '🏦' },
    { key: 'cashin',         label: 'Encaissements',   icon: '📥' },
    { key: 'payment',        label: 'Paiements',       icon: '💳' },
    { key: 'shop',           label: 'Achats',          icon: '🛍️' },
    { key: 'gouvpay',        label: 'Gouv-Pay',        icon: '🏛️' },
    { key: 'bill',           label: 'Factures',        icon: '📄' },
    { key: 'savings',        label: 'Épargne',         icon: '🏦' },
  ];

  const modalMaxHeight = height ? height * 0.9 : 750;
  const displayData = selectedTransaction ? getDisplayData() : null;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 12 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
            <IconBack />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Historique</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
          <TransactionSkeletonList count={6} />
        </View>
      </View>
    );
  }

  const hasActiveFilters = selectedFilter !== 'all' || dateRange !== 'all' || flowFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim() !== '';

  return (
    <View style={styles.container}>
      {/* ═══════════ HEADER ═══════════ */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <IconBack />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Historique</Text>
          <Text style={styles.headerSubtitle}>{totalTransactions} opération{totalTransactions > 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          activeOpacity={0.7}
        >
          <IconFilter color={hasActiveFilters ? '#FFFFFF' : COLORS.textPrimary} />
          {hasActiveFilters && <View style={styles.filterActiveDot} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
            progressBackgroundColor={COLORS.surface}
            title="Actualisation…"
            titleColor={COLORS.textSecondary}
          />
        }
      >
        {isOfflineCache && (
          <View style={{ marginHorizontal: 16, marginTop: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#92400E', textAlign: 'center' }}>
              📡 Mode hors-ligne — Dernières transactions synchronisées
            </Text>
          </View>
        )}

        {/* ═══════════ BILAN MENSUEL PREMIUM ═══════════ */}
        <View style={{ marginHorizontal: 16, marginTop: 14, marginBottom: 4, padding: 14, borderRadius: 18, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#047857', textTransform: 'uppercase', letterSpacing: 0.5 }}>Bilan du mois</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#065F46', marginTop: 2 }}>
              Solde net : {(totalReception - totalDepense >= 0 ? '+ ' : '- ') + Math.abs(totalReception - totalDepense).toLocaleString()} FCFA
            </Text>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#008933' }}>
              {totalTransactions} opération{totalTransactions > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* ═══════════ STATS ═══════════ */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Text style={styles.statIconText}>📤</Text>
            </View>
            <Text style={styles.statLabel}>Dépensé</Text>
            <Text style={styles.statValueExpense} numberOfLines={1}>
              {totalDepense.toLocaleString()}
            </Text>
            <Text style={styles.statUnit}>FCFA</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: COLORS.tealSoft }]}>
              <Text style={styles.statIconText}>📥</Text>
            </View>
            <Text style={styles.statLabel}>Reçu</Text>
            <Text style={styles.statValueIncome} numberOfLines={1}>
              {totalReception.toLocaleString()}
            </Text>
            <Text style={styles.statUnit}>FCFA</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: COLORS.blueSoft }]}>
              <Text style={styles.statIconText}>📊</Text>
            </View>
            <Text style={styles.statLabel}>Opérations</Text>
            <Text style={styles.statValueCount}>{totalTransactions}</Text>
            <Text style={styles.statUnit}>total</Text>
          </View>
        </View>

        {/* ═══════════ RECHERCHE ═══════════ */}
        <View style={styles.searchContainer}>
          <View style={styles.searchIconWrap}>
            <IconSearch />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une transaction…"
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton} activeOpacity={0.7}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ═══════════ FILTRES ═══════════ */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {filters.map((filter) => {
            const isActive = selectedFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedFilter(filter.key)}
                activeOpacity={0.75}
              >
                <Text style={styles.filterChipIcon}>{filter.icon}</Text>
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ═══════════ LISTE TRANSACTIONS ═══════════ */}
        <View style={styles.listWrapper}>
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <IconEmpty />
              </View>
              <Text style={styles.emptyTitle}>Aucune transaction</Text>
              <Text style={styles.emptyText}>Vous n'avez encore rien fait ici.</Text>
            </View>
          ) : (
            filteredTransactions.map((transaction) => {
              const icon = getIconForType(transaction.type);
              const color = getColorForType(transaction.type);
              const status = transaction.status || 'success';
              const isPositive = transaction.amount > 0;

              return (
                <TouchableOpacity
                  key={transaction.id}
                  style={styles.transactionCard}
                  onPress={() => handleTransactionPress(transaction)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.transactionIcon, { backgroundColor: `${color}18` }]}>
                    <Text style={styles.transactionIconText}>{icon}</Text>
                  </View>

                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionTitle} numberOfLines={1}>
                      {cleanDescription(transaction.description)}
                    </Text>
                    <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
                    {transaction.details?.beneficiary && (
                      <Text style={styles.transactionPhone} numberOfLines={1}>
                        👤 {transaction.details.beneficiary}
                      </Text>
                    )}
                    {transaction.details?.sender && (
                      <Text style={styles.transactionPhone} numberOfLines={1}>
                        👤 De : {transaction.details.sender}
                      </Text>
                    )}
                  </View>

                  <View style={styles.transactionRight}>
                    <Text
                      style={[
                        styles.transactionAmountValue,
                        { color: isPositive ? COLORS.teal : COLORS.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {getAmountPrefix(transaction.amount)}
                      {Math.abs(transaction.amount).toLocaleString()}
                    </Text>
                    <View style={styles.transactionStatusRow}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
                      <Text style={styles.transactionStatusText}>
                        {status === 'success' ? 'Succès' : status === 'failed' ? 'Échoué' : 'En cours'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ═══════════════ MODAL DÉTAIL TRANSACTION ═══════════════ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: modalMaxHeight, paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
            <View style={styles.modalDragHandle} />

            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn} activeOpacity={0.7}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Détail de la transaction</Text>
              <View style={{ width: 40 }} />
            </View>

            {selectedTransaction && displayData && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailIconContainer}>
                  <View style={[styles.detailIcon, { backgroundColor: `${getColorForType(selectedTransaction.type)}18` }]}>
                    <Text style={styles.detailIconText}>{getIconForType(selectedTransaction.type)}</Text>
                  </View>
                </View>

                <Text style={styles.detailTitle}>{displayData.description}</Text>
                <Text
                  style={[
                    styles.detailAmount,
                    displayData.isDebit ? styles.detailAmountNegative : styles.detailAmountPositive,
                  ]}
                >
                  {displayData.isDebit ? '-' : '+'}{displayData.grossAmount.toLocaleString()} {displayData.currency}
                </Text>

                <View style={styles.detailStatusWrap}>
                  <View style={[styles.statusPillLarge, { backgroundColor: getStatusColor(displayData.status) }]}>
                    <Text style={styles.statusPillLargeText}>{formatStatus(displayData.status)}</Text>
                  </View>
                </View>

                <View style={styles.detailCard}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionLabel}>PARTICIPANTS</Text>

                    <View style={styles.participantCard}>
                      <View style={styles.participantBadgeFrom}>
                        <Text style={styles.participantBadgeText}>DE</Text>
                      </View>
                      <View style={styles.participantInfo}>
                        <Text style={styles.participantName} numberOfLines={1}>
                          {displayData.senderName || '—'}
                        </Text>
                        <Text style={styles.participantPhone}>
                          {displayData.senderIsPhone && displayData.senderPhone
                            ? `+227 ${displayData.senderPhone}`
                            : '—'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.participantArrowWrap}>
                      <Text style={styles.participantArrow}>↓</Text>
                    </View>

                    <View style={[styles.participantCard, { marginBottom: 0 }]}>
                      <View style={styles.participantBadgeTo}>
                        <Text style={styles.participantBadgeText}>À</Text>
                      </View>
                      <View style={styles.participantInfo}>
                        <Text style={styles.participantName} numberOfLines={1}>
                          {displayData.receiverName || '—'}
                        </Text>
                        <Text style={styles.participantPhone}>
                          {displayData.receiverIsPhone && displayData.receiverPhone
                            ? `+227 ${displayData.receiverPhone}`
                            : '—'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailDivider} />

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionLabel}>MONTANTS</Text>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>💵 Montant</Text>
                      <Text style={styles.detailValue}>
                        {displayData.grossAmount.toLocaleString()} {displayData.currency}
                      </Text>
                    </View>

                    {displayData.hasFeeInfo && (
                      <>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>📋 Frais</Text>
                          <Text style={[styles.detailValue, styles.detailValueFees]}>
                            {displayData.feeAmount.toLocaleString()} {displayData.currency}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>🎁 Net reçu</Text>
                          <Text style={[styles.detailValue, styles.detailValueNet]}>
                            {displayData.netAmount.toLocaleString()} {displayData.currency}
                          </Text>
                        </View>
                        <View style={[styles.detailRow, styles.detailRowTotal]}>
                          <Text style={styles.detailLabelTotal}>💳 Total débité</Text>
                          <Text style={styles.detailValueTotal}>
                            {displayData.totalDebited.toLocaleString()} {displayData.currency}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>

                  <View style={styles.detailDivider} />

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionLabel}>INFORMATIONS</Text>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>📅 Date</Text>
                      <Text style={styles.detailValue}>{displayData.dateFormatted}</Text>
                    </View>
                  </View>

                  {isEnriching && (
                    <View style={styles.enrichingRow}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                      <Text style={styles.enrichingText}>Récupération des détails…</Text>
                    </View>
                  )}
                </View>

                <View style={styles.receiptCodeCard}>
                  <View style={styles.receiptCodeHeader}>
                    <IconSparkle />
                    <Text style={styles.receiptCodeLabel}>RÉFÉRENCE TRANSACTION</Text>
                  </View>

                  {isEnriching && !displayData.businessRef ? (
                    <ActivityIndicator size="small" color={COLORS.accent} style={{ marginVertical: 8 }} />
                  ) : displayData.businessRef ? (
                    <Text style={styles.receiptCode}>{displayData.businessRef}</Text>
                  ) : (
                    <Text style={[styles.receiptCode, { fontSize: 12, color: COLORS.textMuted }]}>
                      Non disponible
                    </Text>
                  )}

                  {displayData.technicalId && (
                    <>
                      <View style={styles.receiptUuidSeparator} />
                      <Text style={styles.receiptUuidLabel}>🆔 ID TECHNIQUE (SUPPORT)</Text>
                      <Text
                        style={styles.receiptUuidValue}
                        numberOfLines={2}
                        ellipsizeMode="middle"
                      >
                        {displayData.technicalId}
                      </Text>
                    </>
                  )}
                </View>

                <View style={styles.detailActions}>
                  <TouchableOpacity
                    style={[styles.detailButton, styles.whatsappButton]}
                    onPress={handleShareWhatsApp}
                    activeOpacity={0.75}
                  >
                    <IconWhatsApp />
                    <Text style={[styles.detailButtonText, styles.whatsappButtonText]}>WhatsApp</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.detailButton, styles.pdfButton]}
                    onPress={handleExportPDF}
                    disabled={exporting || isEnriching}
                    activeOpacity={0.75}
                  >
                    <IconPDF />
                    <Text style={[styles.detailButtonText, styles.pdfButtonText]}>
                      {exporting ? '…' : 'PDF'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.detailButton}
                    onPress={handleShare}
                    activeOpacity={0.75}
                  >
                    <IconShare />
                    <Text style={styles.detailButtonText}>Copier</Text>
                  </TouchableOpacity>

                  {selectedTransaction.deletable && (
                    <TouchableOpacity
                      style={[styles.detailButton, styles.cancelButton]}
                      onPress={() => handleCancelTransaction(selectedTransaction)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.cancelButtonText}>Annuler</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ═══════════════ MODAL FILTRES ═══════════════ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.filterModalContent, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
            <View style={styles.modalDragHandle} />

            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filtres avancés</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                {hasActiveFilters && (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedFilter('all');
                      setTypeFilter('all');
                      setDateRange('all');
                      setFlowFilter('all');
                      setStatusFilter('all');
                      setSearchQuery('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.resetFilterText}>Réinitialiser</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setFilterModalVisible(false)} activeOpacity={0.7}>
                  <Text style={styles.filterModalClose}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* 1. Sens de l'opération */}
              <Text style={styles.filterSectionTitle}>Sens de l'opération</Text>
              <View style={styles.filterOptions}>
                {[
                  { key: 'all', label: 'Toutes' },
                  { key: 'in', label: '🟢 Entrées (Crédits)' },
                  { key: 'out', label: '🔴 Sorties (Débits)' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.filterOption, flowFilter === opt.key && styles.filterOptionActive]}
                    onPress={() => setFlowFilter(opt.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.filterOptionText, flowFilter === opt.key && styles.filterOptionTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 2. Statut */}
              <Text style={styles.filterSectionTitle}>Statut de la transaction</Text>
              <View style={styles.filterOptions}>
                {[
                  { key: 'all', label: 'Tous les statuts' },
                  { key: 'success', label: '✓ Succès' },
                  { key: 'pending', label: '⏳ En cours' },
                  { key: 'failed', label: '✕ Échoué' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.filterOption, statusFilter === opt.key && styles.filterOptionActive]}
                    onPress={() => setStatusFilter(opt.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.filterOptionText, statusFilter === opt.key && styles.filterOptionTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 3. Période */}
              <Text style={styles.filterSectionTitle}>Période temporelle</Text>
              <View style={styles.filterOptions}>
                {[
                  { key: 'all', label: 'Toujours' },
                  { key: 'today', label: "Aujourd'hui" },
                  { key: 'week', label: 'Cette semaine' },
                  { key: 'month', label: 'Ce mois' },
                  { key: 'last_month', label: 'Mois dernier' },
                ].map(period => (
                  <TouchableOpacity
                    key={period.key}
                    style={[styles.filterOption, dateRange === period.key && styles.filterOptionActive]}
                    onPress={() => setDateRange(period.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.filterOptionText, dateRange === period.key && styles.filterOptionTextActive]}>
                      {period.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 4. Type d'opération */}
              <Text style={styles.filterSectionTitle}>Type d'opération</Text>
              <View style={styles.filterOptions}>
                {filters.map(filter => (
                  <TouchableOpacity
                    key={filter.key}
                    style={[styles.filterOption, typeFilter === filter.key && styles.filterOptionActive]}
                    onPress={() => setTypeFilter(filter.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.filterOptionText, typeFilter === filter.key && styles.filterOptionTextActive]}>
                      {filter.icon} {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => {
                setFilterModalVisible(false);
                setSelectedFilter(typeFilter);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.applyButtonText}>
                Afficher ({filteredTransactions.length} résultat{filteredTransactions.length > 1 ? 's' : ''})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🎨 STYLES PREMIUM
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 40 },

  // ═══════════════ HEADER ═══════════════
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },

  // ═══════════════ LOADING ═══════════════
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, color: COLORS.textSecondary, fontSize: 14, fontWeight: '500' },

  // ═══════════════ STATS ═══════════════
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statIconText: { fontSize: 16 },
  statLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValueExpense: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: -0.2,
  },
  statValueIncome: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.teal,
    letterSpacing: -0.2,
  },
  statValueCount: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.2,
  },
  statUnit: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ═══════════════ RECHERCHE ═══════════════
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    paddingHorizontal: 6,
    borderWidth: 1.5,
    borderColor: COLORS.borderSoft,
    height: 52,
  },
  searchIconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },

  // ═══════════════ FILTRES ═══════════════
  filterContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.borderSoft,
    height: 38,
    minWidth: 80,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  filterChipIcon: { fontSize: 13, lineHeight: 18 },
  filterChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '700',
    lineHeight: 18,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // ═══════════════ LISTE ═══════════════
  listWrapper: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 1 },
    }),
  },
  transactionIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  transactionIconText: { fontSize: 20 },
  transactionInfo: { flex: 1, marginRight: 8 },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 3,
    letterSpacing: -0.1,
  },
  transactionDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  transactionPhone: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 3,
    fontWeight: '500',
  },
  transactionRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  transactionAmountValue: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  transactionStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  transactionStatusText: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // ═══════════════ EMPTY ═══════════════
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    fontWeight: '500',
  },

  // ═══════════════ MODAL OVERLAY ═══════════════
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },

  // ═══════════════ MODAL DETAIL ═══════════════
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  modalCloseText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '700' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.3 },

  detailIconContainer: { alignItems: 'center', marginBottom: 16 },
  detailIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailIconText: { fontSize: 30 },
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: COLORS.textSecondary,
  },
  detailAmount: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -1,
  },
  detailAmountPositive: { color: COLORS.teal },
  detailAmountNegative: { color: COLORS.accent },

  detailStatusWrap: { alignItems: 'center', marginBottom: 20 },
  statusPillLarge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusPillLargeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

  detailCard: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  detailSection: { marginVertical: 2 },
  detailSectionLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailRowTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 6,
    paddingTop: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    flexShrink: 0,
  },
  detailLabelTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
  detailValueFees: { color: COLORS.danger, fontWeight: '800' },
  detailValueNet: { color: COLORS.teal, fontWeight: '800' },
  detailValueTotal: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  detailDivider: { height: 1, backgroundColor: COLORS.borderSoft, marginVertical: 10 },

  enrichingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 10,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSoft,
  },
  enrichingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    fontWeight: '500',
  },

  // ✅ Cartes participantes
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    marginBottom: 4,
  },
  participantBadgeFrom: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  participantBadgeTo: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  participantBadgeText: {
    fontSize: 11, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: 0.5,
  },
  participantInfo: { flex: 1 },
  participantName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  participantPhone: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.2,
  },
  participantArrowWrap: {
    alignItems: 'center',
    marginVertical: 2,
    marginBottom: 6,
  },
  participantArrow: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '800',
  },

  // ═══════════════ RÉFÉRENCES ═══════════════
  receiptCodeCard: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent + '25',
  },
  receiptCodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  receiptCodeLabel: {
    fontSize: 10,
    color: '#7A4A1A',
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  receiptCode: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    textAlign: 'center',
  },
  receiptUuidSeparator: {
    height: 1,
    backgroundColor: COLORS.accent + '30',
    marginVertical: 12,
    width: '80%',
  },
  receiptUuidLabel: {
    fontSize: 9,
    color: '#7A4A1A',
    marginBottom: 4,
    fontWeight: '700',
    letterSpacing: 1.2,
    opacity: 0.75,
  },
  receiptUuidValue: {
    fontSize: 10,
    color: '#7A4A1A',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    textAlign: 'center',
    paddingHorizontal: 8,
    opacity: 0.85,
  },

  // ═══════════════ ACTIONS ═══════════════
  detailActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  detailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primarySoft,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.primary + '25',
  },
  detailButtonText: { color: COLORS.primary, fontSize: 13, fontWeight: '800' },
  pdfButton: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent + '25',
  },
  pdfButtonText: { color: COLORS.accent },
  whatsappButton: {
    backgroundColor: '#E8F5E9',
    borderColor: '#25D366',
  },
  whatsappButtonText: { color: '#128C7E' },
  cancelButton: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.danger + '25',
  },
  cancelButtonText: { color: COLORS.danger, fontSize: 13, fontWeight: '800' },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterActiveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6600',
  },
  resetFilterText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#EF4444',
  },

  // ═══════════════ MODAL FILTRES ═══════════════
  filterModalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingTop: 8,
    paddingBottom: 30,
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  filterModalClose: {
    fontSize: 18,
    color: COLORS.textMuted,
    padding: 8,
    fontWeight: '700',
  },
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: 10,
    marginTop: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.borderSoft,
  },
  filterOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterOptionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});