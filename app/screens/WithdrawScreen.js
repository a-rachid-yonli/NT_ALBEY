// screens/WithdrawScreen.js — Retrait RÉEL avec vrai mot de passe (harmonisé SendMoneyScreen)
// ✅ v6 : hero + carte solde + infos importantes retirés (écran épuré)
// ✅ v6 : anciens styles + icônes inutilisés supprimés
// ✅ v5 : mot de passe RÉEL (8-20 chars) + biométrie via verifyTransactionAuth
// ✅ v5 : bouton "Confirmer" plein-largeur avec texte visible (plus d'héritage flex:1)
// ✅ v5 : plus de fallback statique → départements 100% API
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Modal,
  Share,
  Switch,
  useWindowDimensions,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API } from '../services/api';
import { getLogoBase64 } from '../utils/pdfUtils';
import { useTransactions } from '../context/TransactionContext';
import { saveTxMetadata } from '../utils/txRefCache';
import {
  verifyTransactionAuth,
  AUTH_METHOD,
  AUTH_CANCELLED,
} from '../utils/transactionAuth';

const NOTIFIED_TX_IDS_KEY = '@ntalbey_notified_tx_ids';

// ═══════════════════════════════════════════════════════════════
// 🎨 PALETTE PREMIUM
// ═══════════════════════════════════════════════════════════════
const COLORS = {
  primary:      '#008933',
  primarySoft:  '#E8F5E9',
  primaryDark:  '#006B28',
  accent:       '#FF6600',
  accentSoft:   '#FFF3E0',
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
  success:      '#10B981',
  successSoft:  '#D1FAE5',
  warning:      '#F59E0B',
  warningSoft:  '#FEF3C7',
  shadow:       '#0F172A',
};

// ═══════════════════════════════════════════════════════════════
// 🎯 ICÔNES SVG
// ═══════════════════════════════════════════════════════════════
const IconBack = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={COLORS.textPrimary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconLocation = ({ color = COLORS.accent }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-7.5 8-13a8 8 0 10-16 0c0 5.5 8 13 8 13z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="9" r="3" stroke={color} strokeWidth="2" />
  </Svg>
);

const IconChevronDown = ({ color = COLORS.textMuted }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconCopy = ({ color = COLORS.primary }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Rect x="9" y="9" width="13" height="13" rx="2" stroke={color} strokeWidth="1.6" />
    <Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </Svg>
);

const IconPDF = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={COLORS.danger} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2v6h6" stroke={COLORS.danger} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8 14h8M8 18h6" stroke={COLORS.danger} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconArrowDown = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M19 12l-7 7-7-7" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconCheckSmall = ({ color = '#FFFFFF' }) => (
  <Svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconSparkle = () => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <Path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2z" fill="#FFD700" />
  </Svg>
);

const IconSearch = ({ color = COLORS.textMuted }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
    <Path d="M20 20l-3.5-3.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconEyeOpen = ({ color = COLORS.primary }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth="1.9" />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.9" />
  </Svg>
);

const IconEyeClosed = ({ color = COLORS.textMuted }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth="1.9" />
    <Path d="M3 3l18 18" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.9" />
  </Svg>
);

const IconRefresh = ({ color = COLORS.primary }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M21 12a9 9 0 11-3-6.7M21 3v6h-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ═══════════════════════════════════════════════════════════════
// 🏦 ÉCRAN DE RETRAIT
// ═══════════════════════════════════════════════════════════════
export default function WithdrawScreen({ navigation }) {
  const { width = 400, height = 800 } = useWindowDimensions();
  const [amount, setAmount] = useState('');
  const [selectedDepartement, setSelectedDepartement] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [feesIncluded, setFeesIncluded] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(false);

  const [departements, setDepartements] = useState([]);
  const [isLoadingDepartements, setIsLoadingDepartements] = useState(true);
  const [departementsError, setDepartementsError] = useState(null);

  const { balance, refreshWallet } = useTransactions();

  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [useBiometric, setUseBiometric] = useState(false);

  const [regionModalVisible, setRegionModalVisible] = useState(false);
  const [regionSearch, setRegionSearch] = useState('');

  const [currentUserPhone, setCurrentUserPhone] = useState(null);
  const [currentUserName,  setCurrentUserName]  = useState(null);

  // ═════════════════════════════════════════════════════════
  // ✅ Chargement RÉEL des départements (API only)
  // ═════════════════════════════════════════════════════════
  const loadDepartements = useCallback(async () => {
    setIsLoadingDepartements(true);
    setDepartementsError(null);
    try {
      if (__DEV__) console.log('📡 [Withdraw] Chargement départements (API only)…');
      const data = await API.getDepartements();
      const list = Array.isArray(data) ? data : [];

      if (list.length === 0) {
        setDepartements([]);
        setDepartementsError('Aucune région disponible pour le moment.');
      } else {
        setDepartements(list);
        if (__DEV__) console.log(`✅ [Withdraw] ${list.length} départements chargés`);
      }
    } catch (error) {
      if (__DEV__) console.error('❌ [Withdraw] Erreur chargement :', error);
      setDepartements([]);
      setDepartementsError(
        error?.message || 'Impossible de charger les régions. Vérifiez votre connexion.'
      );
    } finally {
      setIsLoadingDepartements(false);
    }
  }, []);

  useEffect(() => { loadDepartements(); }, [loadDepartements]);

  // ═════════════════════════════════════════════════════════
  // Utilisateur connecté
  // ═════════════════════════════════════════════════════════
  useEffect(() => {
    (async () => {
      try {
        const u = await API.getCurrentUser();
        if (u?.phone) {
          setCurrentUserPhone(String(u.phone).replace(/\s/g, '').replace(/^\+?227/, ''));
        }
        setCurrentUserName(u?.name || u?.full_name || 'Moi');
      } catch (_) {}
    })();
  }, []);

  // ═════════════════════════════════════════════════════════
  // Biométrie
  // ═════════════════════════════════════════════════════════
  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const deviceEnrolled = await LocalAuthentication.isEnrolledAsync();
        let accountEnrolled = false;
        try {
          const user = await API.getCurrentUser();
          if (user?.phone) {
            accountEnrolled = await API.isPhoneEnrolledForBiometric(user.phone);
          }
        } catch (_) {}
        const available = compatible && deviceEnrolled && accountEnrolled;
        setIsBiometricAvailable(available);
        setUseBiometric(available);
      } catch (error) {
        setIsBiometricAvailable(false);
        setUseBiometric(false);
      }
    };
    checkBiometrics();
  }, []);

  // ═════════════════════════════════════════════════════
  // 🔐 AUTH BIOMÉTRIQUE
  // ═════════════════════════════════════════════════════
  const authenticateWithBiometrics = async () => {
    if (isWithdrawing || isVerifyingAuth) return;
    setIsVerifyingAuth(true);
    try {
      await verifyTransactionAuth(AUTH_METHOD.BIOMETRIC);
      await executeWithdraw();
    } catch (error) {
      if (error.message === AUTH_CANCELLED) return;
      const msg = String(error.message || '');
      if (msg.includes('Session biométrique expirée') || msg.includes('Aucune empreinte')) {
        setUseBiometric(false);
      }
      Alert.alert('Authentification refusée', msg || 'Veuillez réessayer.');
    } finally {
      setIsVerifyingAuth(false);
    }
  };

  // ═════════════════════════════════════════════════════
  // 🔐 CONFIRMATION PAR MOT DE PASSE
  // ═════════════════════════════════════════════════════
  const confirmWithPin = async () => {
    if (isWithdrawing || isVerifyingAuth) return;
    if (!pin || pin.length < 8 || pin.length > 20) {
      Alert.alert('Code incorrect', 'Le mot de passe doit contenir entre 8 et 20 caractères.');
      return;
    }
    setIsVerifyingAuth(true);
    try {
      await verifyTransactionAuth(AUTH_METHOD.PIN, pin);
      setPin('');
      await executeWithdraw();
    } catch (error) {
      Alert.alert('Code incorrect', error.message || 'Le mot de passe saisi est incorrect.');
      setPin('');
    } finally {
      setIsVerifyingAuth(false);
    }
  };

  // ═════════════════════════════════════════════════════
  // ✅ EXÉCUTION DU RETRAIT + NOTIFICATION
  // ═════════════════════════════════════════════════════
  const executeWithdraw = async () => {
    if (!transactionDetails) return;

    const departementId = transactionDetails.departementId;
    if (!departementId) {
      Alert.alert('Erreur', 'Veuillez sélectionner une région de retrait.');
      return;
    }

    const amountValue = Number(amount);
    setModalVisible(false);
    setIsWithdrawing(true);

    try {
      const result = await API.withdraw({
        departement_id: departementId,
        amount: amountValue,
        frais_inclus: feesIncluded,
      });

      const grossAmount = parseFloat(result.gross_amount) || amountValue;
      const feeAmount   = parseFloat(result.fee_amount)   || 0;
      const netAmount   = parseFloat(result.net_amount)   || grossAmount;

      setTransactionDetails((prev) => ({
        ...prev,
        reference:     result.reference || prev.reference,
        backendId:     result.id,
        backendStatus: result.status,
        grossAmount,
        feeAmount,
        netAmount,
      }));

      if (result.id) {
        try {
          await saveTxMetadata(result.id, {
            reference:      result.reference,
            sender_phone:   currentUserPhone,
            sender_name:    currentUserName,
            receiver_phone: null,
            receiver_name:  `Guichet NT Albey — ${transactionDetails.region}`,
          });
        } catch (_) {}
      }

      try {
        const amountStr = netAmount.toLocaleString('fr-FR');
        const regionStr = transactionDetails.region || 'Agence NT Albey';

        await API.addNotification({
          title: '💰 Retrait effectué',
          message: `Vous avez retiré ${amountStr} FCFA à ${regionStr}. Présentez-vous avec une pièce d'identité.`,
          type: 'success',
          transactionId: result.id,
          reference: result.reference,
        });

        const raw = await AsyncStorage.getItem(NOTIFIED_TX_IDS_KEY);
        let ids = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(ids)) ids = [];
        const txId = String(result.id);
        if (!ids.map(String).includes(txId)) {
          ids.push(txId);
          ids = ids.slice(-100);
          await AsyncStorage.setItem(NOTIFIED_TX_IDS_KEY, JSON.stringify(ids));
        }
      } catch (_) {}

      setPin('');
      setReceiptModalVisible(true);

      if (typeof refreshWallet === 'function') {
        await refreshWallet();
      }
    } catch (error) {
      Alert.alert(
        'Échec du retrait',
        error.message || "Impossible d'effectuer le retrait. Vérifiez votre connexion."
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  const safeFormatCurrency = (num) => {
    if (num === undefined || num === null || isNaN(num)) return '0 FCFA';
    return num.toLocaleString() + ' FCFA';
  };

  const calculateFees = (amountValue) => {
    if (!amountValue || amountValue <= 0) return 0;
    if (amountValue <= 15000) return 50;
    return Math.ceil(amountValue * 0.0075);
  };

  const calculateTransactionDetails = (amountValue, feesIncludedOption) => {
    if (!amountValue || amountValue <= 0) {
      return { fees: 0, debitedAmount: 0, receivedAmount: 0 };
    }
    const fees = calculateFees(amountValue);
    let debitedAmount, receivedAmount;
    if (feesIncludedOption) {
      debitedAmount = amountValue + fees;
      receivedAmount = amountValue;
    } else {
      debitedAmount = amountValue;
      receivedAmount = amountValue - fees;
    }
    return { fees, debitedAmount, receivedAmount };
  };

  const feesDisplay = useMemo(() => {
    const amountValue = parseInt(amount) || 0;
    return calculateTransactionDetails(amountValue, feesIncluded);
  }, [amount, feesIncluded]);

  const getFeesLabel = () => {
    const amountValue = parseInt(amount) || 0;
    return amountValue <= 15000 ? 'Frais (fixe 50 F)' : 'Frais (0.75%)';
  };

  const getDisplayFees = () => safeFormatCurrency(feesDisplay.fees);

  // ═════════════════════════════════════════════════════════
  // PDF
  // ═════════════════════════════════════════════════════════
  const generatePDFHTML = (details, logoBase64) => {
    const logoHtml = logoBase64
      ? `<img src="${logoBase64}" alt="NT Albey Logo" class="logo" />`
      : `<div style="background:linear-gradient(135deg,#FF6600,#FF8833);color:white;padding:10px 30px;border-radius:10px;display:inline-block;font-weight:700;font-size:22px;letter-spacing:4px;margin-bottom:6px;">NT ALBEY</div>`;
    const date = details.date || new Date().toLocaleString('fr-FR');
    const feesLabel = details.amount <= 15000 ? '50 FCFA (fixe)' : '0.75% du montant';
    return `<!DOCTYPE html>
      <html><head><meta charset="UTF-8"><style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Helvetica Neue',Arial,sans-serif; padding:40px 30px; max-width:700px; margin:0 auto; color:#1A1A1A; background:#fff; }
        .header { text-align:center; border-bottom:3px solid #FF6600; padding-bottom:20px; margin-bottom:25px; }
        .logo { max-width:100px; height:auto; margin-bottom:6px; }
        .header h1 { color:#FF6600; font-size:22px; margin:0; letter-spacing:3px; font-weight:800; }
        .success-badge { text-align:center; margin-bottom:20px; }
        .success-badge span { background-color:#10B981; color:white; padding:6px 24px; border-radius:30px; font-size:14px; font-weight:700; }
        .highlight-box { background-color:#FFF3E0; border-radius:12px; padding:18px; margin:16px 0; border-left:5px solid #FF6600; }
        .info-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #F0F0F0; }
        .info-row:last-child { border-bottom:none; }
        .info-label { color:#666; font-size:13px; }
        .info-value { color:#1A1A1A; font-size:13px; font-weight:600; text-align:right; max-width:60%; }
        .amount-received { color:#008933; font-size:16px; font-weight:800; }
        .fees-value { color:#FF4444; font-weight:700; }
        .amount-highlight { color:#FF6600; font-size:16px; font-weight:800; }
        .footer { text-align:center; margin-top:30px; padding-top:20px; border-top:2px solid #F0F0F0; color:#999; font-size:11px; }
        .footer .brand { color:#FF6600; font-weight:700; font-size:14px; }
      </style></head>
      <body>
        <div class="header">${logoHtml}<h1>NT ALBEY</h1></div>
        <div class="success-badge"><span>✅ RETRAIT CONFIRMÉ</span></div>
        <div class="highlight-box">
          <div class="info-row"><span class="info-label">📍 Région de retrait</span><span class="info-value">${details.region || 'N/A'}</span></div>
          <div class="info-row"><span class="info-label">💰 Montant retiré</span><span class="info-value amount-received">${safeFormatCurrency(details.receivedAmount)}</span></div>
        </div>
        <div class="info-row"><span class="info-label">📋 Frais de retrait</span><span class="info-value fees-value">${safeFormatCurrency(details.fees)}</span></div>
        <div class="info-row"><span class="info-label">📊 Barème</span><span class="info-value">${feesLabel}</span></div>
        <div class="info-row"><span class="info-label">${details.feesIncluded ? '✅ Frais inclus' : '❌ Hors frais'}</span><span class="info-value">${details.feesIncluded ? 'Inclus' : 'Déduits'}</span></div>
        <div class="info-row"><span class="info-label">💳 Total débité</span><span class="info-value amount-highlight">${safeFormatCurrency(details.debitedAmount)}</span></div>
        <div class="info-row"><span class="info-label">📅 Date</span><span class="info-value">${date}</span></div>
        <div class="footer"><div class="brand">NT ALBEY</div><div>📞 Support : 555</div></div>
      </body></html>`;
  };

  const handleExportPDF = async (details) => {
    if (!details) { Alert.alert('Erreur', 'Aucune donnée à exporter.'); return; }
    try {
      setIsExporting(true);
      const logoBase64 = await getLogoBase64();
      const html = generatePDFHTML(details, logoBase64);
      const { base64 } = await Print.printToFileAsync({ html, base64: true });
      if (!base64) throw new Error('PDF vide');

      const filename = `recu_retrait_${Date.now()}.pdf`;
      const destUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(destUri, base64, { encoding: FileSystem.EncodingType.Base64 });

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(destUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Reçu de retrait - ${details.reference}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Reçu généré', 'Votre reçu est prêt.');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de générer le PDF.\n' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyReceipt = (details) => {
    if (!details) return;
    const message = `NT ALBEY - REÇU DE RETRAIT
━━━━━━━━━━━━━━━━━━━━━
✅ RETRAIT CONFIRMÉ
━━━━━━━━━━━━━━━━━━━━━
📍 Région : ${details.region}
💰 Montant retiré : ${safeFormatCurrency(details.receivedAmount)}
📋 Frais : ${safeFormatCurrency(details.fees)}
📊 Barème : ${details.amount <= 15000 ? '50 FCFA (fixe)' : '0.75%'}
${details.feesIncluded ? '✅ Frais inclus' : '❌ Hors frais'}
💳 Total débité : ${safeFormatCurrency(details.debitedAmount)}
📅 Date : ${details.date}
🔑 Référence : ${details.reference}
━━━━━━━━━━━━━━━━━━━━━`;
    Alert.alert(
      'Reçu copié',
      'Le reçu a été copié.',
      [
        { text: 'OK' },
        { text: 'Partager', onPress: () => Share.share({ message, title: `Reçu - ${details.reference}` }) },
      ]
    );
  };

  const generateReference = () => {
    const prefix = 'WTD';
    const random = String(Math.floor(100000 + Math.random() * 900000));
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${prefix}${random}${day}${month}${year}`;
  };

  const handleWithdraw = () => {
    if (!amount || parseInt(amount) <= 0) {
      Alert.alert('Attention', 'Veuillez saisir un montant valide.');
      return;
    }
    const amountValue = parseInt(amount);
    const details = calculateTransactionDetails(amountValue, feesIncluded);

    if (details.debitedAmount > balance) {
      Alert.alert(
        'Solde insuffisant',
        `Total à débiter : ${safeFormatCurrency(details.debitedAmount)} • Solde : ${safeFormatCurrency(balance)}.`
      );
      return;
    }
    if (!selectedDepartement) {
      Alert.alert('Attention', 'Veuillez sélectionner une région de retrait.');
      return;
    }

    const reference = generateReference();
    setTransactionDetails({
      region: selectedDepartement.designation,
      departementId: selectedDepartement.id,
      amount: amountValue,
      fees: details.fees,
      debitedAmount: details.debitedAmount,
      receivedAmount: details.receivedAmount,
      feesIncluded,
      reference,
      date: new Date().toLocaleString('fr-FR'),
    });

    setModalVisible(true);
    setUseBiometric(isBiometricAvailable);
    setPin('');
  };

  const finishWithdraw = () => {
    Alert.alert('C\'est fait !', `Votre retrait de ${amount} FCFA a été effectué avec succès.`);
    setReceiptModalVisible(false);
    setAmount('');
    setSelectedDepartement(null);
    setTransactionDetails(null);
    navigation.goBack();
  };

  const copyReference = () => {
    if (transactionDetails?.reference) {
      Alert.alert('Copié', `Référence ${transactionDetails.reference} copiée.`);
    }
  };

  const getConfirmationTotal = () => {
    if (!amount || parseInt(amount) <= 0) return '0 FCFA';
    return safeFormatCurrency(calculateTransactionDetails(parseInt(amount), feesIncluded).debitedAmount);
  };

  const getConfirmationReceived = () => {
    if (!amount || parseInt(amount) <= 0) return '0 FCFA';
    return safeFormatCurrency(calculateTransactionDetails(parseInt(amount), feesIncluded).receivedAmount);
  };

  const modalWidth = width ? width - 40 : 320;
  const receiptModalWidth = width ? width - 24 : 340;
  const receiptMaxHeight = height ? Math.min(height * 0.94, height - 40) : 700;

  const hasAmount = !!(amount && parseInt(amount) > 0);
  const hasRegion = !!selectedDepartement;
  const canWithdraw = hasAmount && hasRegion && !isWithdrawing;

  const filteredDepartements = departements.filter((d) =>
    String(d.designation || '').toLowerCase().includes(regionSearch.toLowerCase().trim())
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <IconBack />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Retirer</Text>
          <Text style={styles.headerSubtitle}>Retrait en agence NT Albey</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ÉTAPE 1 — MONTANT */}
        <View style={styles.stepHeaderFirst}>
          <View style={[styles.stepBadge, { backgroundColor: COLORS.accent }]}>
            <Text style={styles.stepBadgeText}>1</Text>
          </View>
          <Text style={styles.stepTitle}>Quel montant ?</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.amountInputContainer}>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              editable={!isWithdrawing}
            />
            <Text style={styles.currencySymbol}>FCFA</Text>
          </View>

          <View style={styles.suggestionsRow}>
            {['5000', '10000', '15000', '25000', '50000', '100000'].map((sug) => (
              <TouchableOpacity
                key={sug}
                style={[styles.suggestionChip, amount === sug && styles.suggestionChipActive]}
                onPress={() => setAmount(sug)}
                disabled={isWithdrawing}
                activeOpacity={0.75}
              >
                <Text style={[styles.suggestionText, amount === sug && styles.suggestionTextActive]}>
                  {parseInt(sug).toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.feesSection}>
            <View style={styles.feesToggleContainer}>
              <View style={styles.feesToggleLeft}>
                <View style={[styles.feesToggleIcon, feesIncluded && styles.feesToggleIconActive]}>
                  <Text style={{ fontSize: 14 }}>{feesIncluded ? '✅' : '❌'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.feesToggleTitle}>
                    {feesIncluded ? 'Frais inclus' : 'Hors frais'}
                  </Text>
                  <Text style={styles.feesToggleSubtitle}>
                    {feesIncluded ? 'Les frais sont ajoutés au total' : 'Les frais sont déduits du montant'}
                  </Text>
                </View>
              </View>
              <Switch
                value={feesIncluded}
                onValueChange={setFeesIncluded}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor="#FFFFFF"
                disabled={isWithdrawing}
              />
            </View>

            <View style={styles.feesDetails}>
              <View style={styles.feesDetailRow}>
                <Text style={styles.feesDetailLabel}>{getFeesLabel()}</Text>
                <Text style={styles.feesDetailFees}>{getDisplayFees()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ÉTAPE 2 — RÉGION */}
        <View style={styles.stepHeader}>
          <View style={[styles.stepBadge, { backgroundColor: COLORS.accent }]}>
            <Text style={styles.stepBadgeText}>2</Text>
          </View>
          <Text style={styles.stepTitle}>Où allez-vous retirer ?</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.selectContainer,
            selectedDepartement && styles.selectContainerFilled,
            (departementsError || isLoadingDepartements) && styles.selectContainerDisabled,
          ]}
          onPress={() => {
            if (isLoadingDepartements) return;
            if (departementsError) {
              loadDepartements();
              return;
            }
            setRegionSearch('');
            setRegionModalVisible(true);
          }}
          activeOpacity={0.75}
          disabled={isWithdrawing}
        >
          <View style={styles.selectIconWrap}>
            <IconLocation color={selectedDepartement ? '#FFFFFF' : COLORS.accent} />
          </View>
          <View style={styles.selectContent}>
            <Text style={[styles.selectText, selectedDepartement && styles.selectTextSelected]}>
              {isLoadingDepartements
                ? 'Chargement des régions…'
                : departementsError
                  ? 'Régions indisponibles'
                  : (selectedDepartement?.designation || 'Sélectionnez une localité')}
            </Text>
            {!selectedDepartement && !isLoadingDepartements && !departementsError && (
              <Text style={styles.selectSubtext}>Appuyez pour choisir votre région de retrait</Text>
            )}
            {selectedDepartement && (
              <Text style={styles.selectSubtext}>
                Vous pourrez retirer dans n'importe quelle agence de cette région
              </Text>
            )}
            {departementsError && !isLoadingDepartements && (
              <Text style={[styles.selectSubtext, { color: COLORS.danger }]}>
                {departementsError} — Tapez pour réessayer
              </Text>
            )}
          </View>
          {isLoadingDepartements ? (
            <ActivityIndicator size="small" color={COLORS.accent} />
          ) : departementsError ? (
            <IconRefresh color={COLORS.accent} />
          ) : (
            <IconChevronDown color={selectedDepartement ? COLORS.accent : COLORS.textMuted} />
          )}
        </TouchableOpacity>

        {/* BOUTON RETIRER */}
        <TouchableOpacity
          style={[styles.withdrawButton, !canWithdraw && styles.withdrawButtonDisabled]}
          onPress={handleWithdraw}
          disabled={!canWithdraw}
          activeOpacity={0.85}
        >
          {isWithdrawing ? (
            <View style={styles.withdrawButtonContent}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.withdrawButtonText}>Retrait en cours…</Text>
            </View>
          ) : (
            <View style={styles.withdrawButtonContent}>
              <Text style={[styles.withdrawButtonText, !canWithdraw && styles.withdrawButtonTextDisabled]}>
                {amount ? `Retirer ${parseInt(amount).toLocaleString()} FCFA` : 'Retirer'}
              </Text>
              {canWithdraw && <View style={styles.withdrawIconCircle}><IconArrowDown /></View>}
            </View>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* MODAL SÉLECTION RÉGION */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={regionModalVisible}
        onRequestClose={() => setRegionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.regionModalContent, { width: modalWidth, maxHeight: height * 0.8 }]}>
            <View style={styles.modalDragHandle} />

            <View style={styles.regionModalHeader}>
              <Text style={styles.regionModalTitle}>Choisir une région</Text>
              <Text style={styles.regionModalSubtitle}>
                {filteredDepartements.length} région{filteredDepartements.length > 1 ? 's' : ''} disponible{filteredDepartements.length > 1 ? 's' : ''}
              </Text>
            </View>

            <View style={styles.searchWrapper}>
              <IconSearch />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher une région…"
                placeholderTextColor={COLORS.textMuted}
                value={regionSearch}
                onChangeText={setRegionSearch}
                autoCorrect={false}
              />
              {regionSearch !== '' && (
                <TouchableOpacity onPress={() => setRegionSearch('')} activeOpacity={0.7}>
                  <Text style={styles.clearSearchText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {isLoadingDepartements ? (
              <View style={styles.regionLoading}>
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text style={styles.regionLoadingText}>Chargement des régions…</Text>
              </View>
            ) : departementsError ? (
              <View style={styles.regionEmpty}>
                <Text style={styles.regionEmptyEmoji}>⚠️</Text>
                <Text style={styles.regionEmptyText}>{departementsError}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={loadDepartements}
                  activeOpacity={0.85}
                >
                  <IconRefresh color="#FFFFFF" />
                  <Text style={styles.retryButtonText}>Réessayer</Text>
                </TouchableOpacity>
              </View>
            ) : filteredDepartements.length === 0 ? (
              <View style={styles.regionEmpty}>
                <Text style={styles.regionEmptyEmoji}>📍</Text>
                <Text style={styles.regionEmptyText}>Aucune région trouvée</Text>
              </View>
            ) : (
              <FlatList
                data={filteredDepartements}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 8 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const isSelected = selectedDepartement?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.regionItem, isSelected && styles.regionItemSelected]}
                      onPress={() => {
                        setSelectedDepartement(item);
                        setRegionModalVisible(false);
                        setRegionSearch('');
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.regionItemIcon, isSelected && styles.regionItemIconSelected]}>
                        <IconLocation color={isSelected ? '#FFFFFF' : COLORS.accent} />
                      </View>
                      <Text style={[styles.regionItemText, isSelected && styles.regionItemTextSelected]}>
                        {item.designation}
                      </Text>
                      {isSelected && (
                        <View style={styles.regionItemCheck}><IconCheckSmall /></View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            <TouchableOpacity
              style={styles.regionCloseButton}
              onPress={() => { setRegionModalVisible(false); setRegionSearch(''); }}
              activeOpacity={0.75}
            >
              <Text style={styles.regionCloseButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL CONFIRMATION */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          if (isWithdrawing || isVerifyingAuth) return;
          setModalVisible(false);
          setPin('');
          setUseBiometric(isBiometricAvailable);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModalContent, { width: modalWidth }]}>
            <View style={styles.confirmIconWrapper}>
              <Svg width="60" height="60" viewBox="0 0 100 100" fill="none">
                <Circle cx="50" cy="50" r="45" fill={COLORS.accentSoft} />
                <Path d="M50 25 L50 65" stroke={COLORS.accent} strokeWidth="4.5" strokeLinecap="round" />
                <Path d="M35 50 L50 65 L65 50" stroke={COLORS.accent} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <Rect x="35" y="68" width="30" height="6" rx="2" fill={COLORS.accent} />
              </Svg>
            </View>

            <Text style={styles.confirmTitle}>Confirmer le retrait</Text>
            <Text style={styles.confirmAmount}>{amount} FCFA</Text>
            <Text style={styles.confirmRecipient}>
              Région : {selectedDepartement?.designation || '—'}
            </Text>

            <View style={styles.confirmInfoBox}>
              <View style={styles.confirmInfoRow}>
                <Text style={styles.confirmInfoLabel}>Frais</Text>
                <Text style={styles.confirmInfoValue}>{getDisplayFees()}</Text>
              </View>
              <View style={styles.confirmInfoRow}>
                <Text style={styles.confirmInfoLabel}>Barème</Text>
                <Text style={styles.confirmInfoValue}>{getFeesLabel()}</Text>
              </View>
              <View style={styles.confirmInfoRow}>
                <Text style={styles.confirmInfoLabel}>Option</Text>
                <Text style={styles.confirmInfoValue}>
                  {feesIncluded ? 'Frais inclus' : 'Hors frais'}
                </Text>
              </View>
              <View style={styles.confirmInfoDivider} />
              <View style={styles.confirmInfoRow}>
                <Text style={styles.confirmInfoLabelTotal}>💳 Total débité</Text>
                <Text style={styles.confirmInfoValueTotal}>{getConfirmationTotal()}</Text>
              </View>
              <View style={styles.confirmInfoRow}>
                <Text style={styles.confirmInfoLabelReceived}>📥 Net reçu</Text>
                <Text style={styles.confirmInfoValueReceived}>{getConfirmationReceived()}</Text>
              </View>
            </View>

            {isBiometricAvailable && useBiometric ? (
              <>
                <Text style={styles.confirmHintText}>Confirmez avec votre empreinte</Text>
                <TouchableOpacity
                  style={styles.biometricButton}
                  onPress={authenticateWithBiometrics}
                  activeOpacity={0.75}
                  disabled={isWithdrawing || isVerifyingAuth}
                >
                  {isWithdrawing || isVerifyingAuth ? (
                    <ActivityIndicator color={COLORS.accent} size="small" />
                  ) : (
                    <Image source={require('../assets/images/print.png')} style={styles.biometricIcon} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmButtonFull, (isWithdrawing || isVerifyingAuth) && styles.confirmButtonDisabled]}
                  onPress={authenticateWithBiometrics}
                  disabled={isWithdrawing || isVerifyingAuth}
                  activeOpacity={0.85}
                >
                  {isWithdrawing || isVerifyingAuth ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Confirmer</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchMethodButton}
                  onPress={() => setUseBiometric(false)}
                  disabled={isWithdrawing || isVerifyingAuth}
                  activeOpacity={0.7}
                >
                  <Text style={styles.switchMethodText}>🔑 Utiliser mon mot de passe</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.confirmHintText}>Entrez votre mot de passe (8 à 20 caractères)</Text>
                <View style={styles.pinInputWrapper}>
                  <TextInput
                    style={styles.pinInput}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="default"
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={!pinVisible}
                    maxLength={20}
                    value={pin}
                    onChangeText={setPin}
                    textAlign="center"
                    editable={!isWithdrawing && !isVerifyingAuth}
                  />
                  <TouchableOpacity
                    style={styles.pinEyeButton}
                    onPress={() => setPinVisible((v) => !v)}
                    disabled={isWithdrawing || isVerifyingAuth}
                    activeOpacity={0.7}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    {pinVisible ? <IconEyeOpen /> : <IconEyeClosed />}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.pinToggleLabelWrapper}
                  onPress={() => setPinVisible((v) => !v)}
                  disabled={isWithdrawing || isVerifyingAuth}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pinToggleLabelText}>
                    {pinVisible ? 'Masquer' : 'Afficher'} le mot de passe
                  </Text>
                </TouchableOpacity>

                {isBiometricAvailable && (
                  <TouchableOpacity
                    style={styles.switchMethodButton}
                    onPress={() => setUseBiometric(true)}
                    disabled={isWithdrawing || isVerifyingAuth}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.switchMethodText}>👆 Utiliser mon empreinte</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.confirmButtonFull, (isWithdrawing || isVerifyingAuth) && styles.confirmButtonDisabled]}
                  onPress={confirmWithPin}
                  disabled={isWithdrawing || isVerifyingAuth}
                  activeOpacity={0.85}
                >
                  {isWithdrawing || isVerifyingAuth ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Confirmer</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setPin('');
                  setUseBiometric(isBiometricAvailable);
                }}
                disabled={isWithdrawing || isVerifyingAuth}
                activeOpacity={0.75}
              >
                <Text style={styles.cancelButtonText}>
                  {isWithdrawing ? 'Retrait en cours…' : 'Annuler'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL REÇU */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={receiptModalVisible}
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <View style={styles.receiptOverlay}>
          <View style={[styles.receiptModalContent, { width: receiptModalWidth, maxHeight: receiptMaxHeight }]}>
            <View style={styles.receiptHeader}>
              <View style={styles.receiptIcon}><Text style={styles.receiptIconText}>✅</Text></View>
              <Text style={styles.receiptTitle}>Retrait confirmé</Text>
              <Text style={styles.receiptSubtitle}>Transaction effectuée avec succès</Text>
            </View>

            <ScrollView
              style={styles.receiptScroll}
              contentContainerStyle={styles.receiptScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {transactionDetails ? (
                <>
                  <View style={styles.receiptCard}>
                    <Text style={styles.receiptSectionLabel}>RÉGION DE RETRAIT</Text>
                    <View style={styles.receiptParticipantCard}>
                      <View style={styles.receiptParticipantBadgeTo}>
                        <Text style={styles.receiptParticipantBadgeText}>📍</Text>
                      </View>
                      <View style={styles.receiptParticipantInfo}>
                        <Text style={styles.receiptParticipantName} numberOfLines={1}>
                          {transactionDetails.region}
                        </Text>
                        <Text style={styles.receiptParticipantPhone}>Guichet NT Albey</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.receiptCard}>
                    <Text style={styles.receiptSectionLabel}>MONTANTS</Text>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>💰 Montant retiré</Text>
                      <Text style={[styles.receiptValue, styles.receiptValueReceived]}>
                        {safeFormatCurrency(transactionDetails.receivedAmount)}
                      </Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>📋 Frais</Text>
                      <Text style={[styles.receiptValue, styles.receiptValueFees]}>
                        {safeFormatCurrency(transactionDetails.fees)}
                      </Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>📊 Barème</Text>
                      <Text style={styles.receiptValue}>
                        {transactionDetails.amount <= 15000 ? '50 FCFA (fixe)' : '0,75%'}
                      </Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>
                        {transactionDetails.feesIncluded ? '✅ Frais inclus' : '❌ Hors frais'}
                      </Text>
                      <Text style={styles.receiptValue}>
                        {transactionDetails.feesIncluded ? 'Inclus' : 'Déduits'}
                      </Text>
                    </View>
                    <View style={[styles.receiptRow, styles.receiptRowTotal]}>
                      <Text style={styles.receiptLabelTotal}>💳 Total débité</Text>
                      <Text style={styles.receiptValueTotal}>
                        {safeFormatCurrency(transactionDetails.debitedAmount)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.receiptCodeCard}>
                    <View style={styles.receiptCodeHeader}>
                      <IconSparkle />
                      <Text style={styles.receiptCodeLabel}>RÉFÉRENCE</Text>
                    </View>
                    <Text style={styles.receiptCode}>{transactionDetails.reference}</Text>
                    <TouchableOpacity style={styles.receiptCodeCopy} onPress={copyReference} activeOpacity={0.75}>
                      <IconCopy color={COLORS.accent} />
                      <Text style={styles.receiptCodeCopyText}>Copier la référence</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.receiptDate}>📅 {transactionDetails.date}</Text>
                </>
              ) : (
                <View style={styles.receiptCard}>
                  <Text style={[styles.receiptValue, { textAlign: 'center' }]}>Chargement…</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.receiptActionsContainer}>
              <View style={styles.receiptButtons}>
                <TouchableOpacity
                  style={[styles.receiptButton, styles.receiptCopyButton]}
                  onPress={() => handleCopyReceipt(transactionDetails)}
                  disabled={isExporting}
                  activeOpacity={0.75}
                >
                  <IconCopy />
                  <Text style={styles.receiptCopyButtonText}>Copier</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.receiptButton, styles.receiptShareButton]}
                  onPress={() => handleExportPDF(transactionDetails)}
                  disabled={isExporting}
                  activeOpacity={0.75}
                >
                  <IconPDF />
                  <Text style={[styles.receiptShareButtonText, isExporting && { opacity: 0.5 }]}>
                    {isExporting ? '⏳ …' : 'Partager'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.receiptDoneButton} onPress={finishWithdraw} activeOpacity={0.85}>
                <Text style={styles.receiptDoneButtonText}>✓ Terminé</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🎨 STYLES
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 40, paddingTop: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSoft,
    ...Platform.select({
      ios: { shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  backButton: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.borderSoft,
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },

  // Étape 1 : premier bloc collé au header (paddingTop déjà sur scrollContent)
  stepHeaderFirst: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 4, marginBottom: 10, gap: 10 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 24, marginBottom: 10, gap: 10 },
  stepBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepBadgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  stepTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.2 },

  card: {
    backgroundColor: COLORS.surface, marginHorizontal: 16, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: COLORS.borderSoft,
    ...Platform.select({
      ios: { shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 2 },
    }),
  },

  amountInputContainer: {
    flexDirection: 'row', alignItems: 'flex-end',
    borderBottomWidth: 2, borderBottomColor: COLORS.accent,
    paddingBottom: 10, marginBottom: 20,
  },
  amountInput: { flex: 1, fontSize: 42, fontWeight: '800', color: COLORS.textPrimary, padding: 0, letterSpacing: -1.5 },
  currencySymbol: { fontSize: 16, fontWeight: '800', color: COLORS.accent, marginBottom: 6, marginLeft: 8, letterSpacing: 0.5 },

  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: {
    flexGrow: 1, minWidth: 76,
    backgroundColor: COLORS.surfaceAlt,
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center',
  },
  suggestionChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  suggestionText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', letterSpacing: -0.1 },
  suggestionTextActive: { color: '#FFFFFF' },

  feesSection: { marginTop: 20, paddingTop: 18, borderTopWidth: 1, borderTopColor: COLORS.borderSoft },
  feesToggleContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceAlt, borderRadius: 14, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.borderSoft,
  },
  feesToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  feesToggleIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: COLORS.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  feesToggleIconActive: { backgroundColor: COLORS.successSoft },
  feesToggleTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.1 },
  feesToggleSubtitle: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },
  feesDetails: { backgroundColor: COLORS.accentSoft, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.accent + '25' },
  feesDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feesDetailLabel: { fontSize: 12, color: '#7A4A1A', fontWeight: '600' },
  feesDetailFees: { fontSize: 15, color: COLORS.accent, fontWeight: '800', letterSpacing: -0.2 },

  selectContainer: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16,
    backgroundColor: COLORS.surface, borderRadius: 18,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingVertical: 14, paddingHorizontal: 16, gap: 12,
    ...Platform.select({
      ios: { shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 1 },
    }),
  },
  selectContainerFilled: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  selectContainerDisabled: { opacity: 0.9 },
  selectIconWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center' },
  selectContent: { flex: 1 },
  selectText: { fontSize: 15, color: COLORS.textMuted, fontWeight: '600' },
  selectTextSelected: { color: COLORS.textPrimary, fontWeight: '800' },
  selectSubtext: { fontSize: 11, color: COLORS.textSecondary, marginTop: 3, fontWeight: '500' },

  withdrawButton: {
    marginHorizontal: 16, marginTop: 24, borderRadius: 18,
    backgroundColor: COLORS.accent, paddingVertical: 18, paddingHorizontal: 22,
    ...Platform.select({
      ios: { shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.32, shadowRadius: 16 },
      android: { elevation: 6 },
    }),
  },
  withdrawButtonDisabled: {
    backgroundColor: COLORS.border,
    ...Platform.select({ ios: { shadowOpacity: 0 }, android: { elevation: 0 } }),
  },
  withdrawButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  withdrawButtonText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2, flex: 1 },
  withdrawButtonTextDisabled: { color: COLORS.textMuted },
  withdrawIconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', alignItems: 'center' },
  modalDragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },

  regionModalContent: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 20, marginVertical: 40 },
  regionModalHeader: { marginBottom: 16 },
  regionModalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', letterSpacing: -0.3 },
  regionModalSubtitle: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 4, fontWeight: '500' },

  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt, borderRadius: 12,
    paddingHorizontal: 12, height: 46, gap: 8,
    borderWidth: 1, borderColor: COLORS.borderSoft, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, fontWeight: '500', paddingVertical: 0 },
  clearSearchText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '700', paddingHorizontal: 4 },

  regionLoading: { alignItems: 'center', paddingVertical: 40 },
  regionLoadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  regionEmpty: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 12 },
  regionEmptyEmoji: { fontSize: 48, marginBottom: 10 },
  regionEmptyText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500', textAlign: 'center', marginBottom: 16, lineHeight: 19 },
  retryButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14,
    ...Platform.select({
      ios: { shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  retryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  regionItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, marginBottom: 4, gap: 12, borderWidth: 1, borderColor: 'transparent' },
  regionItemSelected: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accent + '40' },
  regionItemIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center' },
  regionItemIconSelected: { backgroundColor: COLORS.accent },
  regionItemText: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.1 },
  regionItemTextSelected: { color: COLORS.accent, fontWeight: '800' },
  regionItemCheck: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  regionCloseButton: { marginTop: 12, paddingVertical: 14, borderRadius: 14, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  regionCloseButtonText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '700' },

  confirmModalContent: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 24, alignItems: 'center' },
  confirmIconWrapper: { marginBottom: 16 },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.2, marginBottom: 6 },
  confirmAmount: { fontSize: 26, fontWeight: '800', color: COLORS.accent, letterSpacing: -0.5, marginBottom: 4 },
  confirmRecipient: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 18, textAlign: 'center' },
  confirmInfoBox: { backgroundColor: COLORS.surfaceAlt, borderRadius: 14, padding: 14, width: '100%', marginBottom: 18, borderWidth: 1, borderColor: COLORS.borderSoft },
  confirmInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  confirmInfoLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  confirmInfoValue: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '700' },
  confirmInfoDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  confirmInfoLabelTotal: { fontSize: 13, fontWeight: '800', color: COLORS.accent },
  confirmInfoValueTotal: { fontSize: 14, fontWeight: '800', color: COLORS.accent },
  confirmInfoLabelReceived: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  confirmInfoValueReceived: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  confirmHintText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 12 },

  pinInputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt, borderRadius: 14,
    borderWidth: 1.5, borderColor: COLORS.accent + '40',
    paddingHorizontal: 12, marginBottom: 6, width: '100%',
  },
  pinInput: {
    flex: 1, fontSize: 18, fontWeight: '700',
    letterSpacing: 2, color: COLORS.textPrimary,
    textAlign: 'center', paddingVertical: 14,
  },
  pinEyeButton: { padding: 8, marginLeft: 4, alignItems: 'center', justifyContent: 'center' },
  pinToggleLabelWrapper: { alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 8, marginBottom: 8 },
  pinToggleLabelText: { fontSize: 12, fontWeight: '700', color: COLORS.accent, textDecorationLine: 'underline' },

  biometricButton: {
    backgroundColor: COLORS.accentSoft, width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
    marginVertical: 4, borderWidth: 2, borderColor: COLORS.accent + '25',
  },
  biometricIcon: { width: 44, height: 44, resizeMode: 'contain', tintColor: COLORS.accent },
  switchMethodButton: { marginVertical: 10, paddingVertical: 6 },
  switchMethodText: { color: COLORS.accent, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },

  confirmButtonFull: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: COLORS.accent,
    ...Platform.select({
      ios: { shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  confirmButtonDisabled: { backgroundColor: COLORS.textMuted },
  confirmButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },

  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 12, width: '100%' },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border },
  cancelButtonText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '700' },

  receiptOverlay: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 12, paddingTop: 40, paddingBottom: 30,
  },
  receiptModalContent: {
    backgroundColor: COLORS.surface, borderRadius: 24,
    paddingTop: 18, paddingHorizontal: 18, paddingBottom: 0,
    overflow: 'hidden', flexDirection: 'column',
  },
  receiptHeader: { alignItems: 'center', marginBottom: 10, flexShrink: 0 },
  receiptIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.successSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  receiptIconText: { fontSize: 24 },
  receiptTitle: { fontSize: 17, fontWeight: '800', color: COLORS.accent, letterSpacing: -0.3 },
  receiptSubtitle: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },

  receiptScroll: { flexShrink: 1, marginTop: 2 },
  receiptScrollContent: { paddingBottom: 8 },
  receiptActionsContainer: {
    paddingTop: 10, paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.borderSoft, flexShrink: 0,
  },

  receiptCard: { backgroundColor: COLORS.surfaceAlt, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.borderSoft },
  receiptSectionLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  receiptRowTotal: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 4, paddingTop: 8 },
  receiptLabel: { fontSize: 12, color: COLORS.textSecondary, flexShrink: 0, fontWeight: '500' },
  receiptLabelTotal: { fontSize: 13, fontWeight: '800', color: COLORS.accent },
  receiptValue: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right', flex: 1, marginLeft: 8 },
  receiptValueFees: { color: COLORS.danger, fontWeight: '700' },
  receiptValueReceived: { color: COLORS.primary, fontWeight: '800' },
  receiptValueTotal: { fontSize: 14, fontWeight: '800', color: COLORS.accent },

  receiptParticipantCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 10,
    borderWidth: 1, borderColor: COLORS.borderSoft, marginBottom: 4,
  },
  receiptParticipantBadgeTo: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  receiptParticipantBadgeText: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  receiptParticipantInfo: { flex: 1 },
  receiptParticipantName: { fontSize: 12.5, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.1, marginBottom: 1 },
  receiptParticipantPhone: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: 0.2 },

  receiptCodeCard: {
    backgroundColor: COLORS.accentSoft, borderRadius: 14,
    padding: 12, marginBottom: 8, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.accent + '25',
  },
  receiptCodeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  receiptCodeLabel: { fontSize: 9, color: '#7A4A1A', textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: '800' },
  receiptCode: {
    fontSize: 15, fontWeight: '800', color: COLORS.accent, letterSpacing: 1.8,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    textAlign: 'center',
  },
  receiptCodeCopy: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: COLORS.surface, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.accent + '30',
  },
  receiptCodeCopyText: { fontSize: 11.5, color: COLORS.accent, fontWeight: '700' },

  receiptDate: { textAlign: 'center', fontSize: 10.5, color: COLORS.textMuted, marginBottom: 2, fontWeight: '600' },

  receiptButtons: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  receiptButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  receiptCopyButton: { backgroundColor: COLORS.primarySoft, borderWidth: 1.5, borderColor: COLORS.primary + '30' },
  receiptCopyButtonText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  receiptShareButton: { backgroundColor: COLORS.accentSoft, borderWidth: 1.5, borderColor: COLORS.accent + '30' },
  receiptShareButtonText: { fontSize: 13, fontWeight: '800', color: COLORS.accent },

  receiptDoneButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  receiptDoneButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.3, textAlign: 'center' },
});