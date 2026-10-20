// screens/TransferToAgencyScreen.js - Transfert guichet RÉEL via backend
// ✅ v9 : hero + carte solde + box "Comment ça fonctionne" retirés (écran épuré)
// ✅ v9 : styles + icône IconEye + state balanceVisible + addTransaction inutilisés supprimés
// ✅ v8 : Validation détaillée du numéro (messages clairs et progressifs)
// ✅ v7 : Modal "Transfert confirmé" harmonisé avec SendMoneyScreen & WithdrawScreen
// ✅ v6 : FIX bouton "Confirmer" sans texte (flex bug en column)
// ✅ v5 : VRAI mot de passe (8-20) + œil toggle + récap dans le modal
// ✅ v4 : FIX "✓ Terminé" standalone + design harmonisé
// ✅ v3 : NOTIFICATION automatique + cache métadonnées + sender name auto
// ✅ v2 : intégration API /api/v1/departement + /api/v1/transactions/transfert
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  useWindowDimensions,
  Switch,
  Share,
  Image,
  ActivityIndicator,
  Platform,
  FlatList,
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
import { verifyTransactionAuth, AUTH_METHOD, AUTH_CANCELLED } from '../utils/transactionAuth';
import { isValidPin } from '../utils/validators';

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

const IconTransferAgencyBig = () => (
  <Svg width="64" height="64" viewBox="0 0 100 100" fill="none">
    <Circle cx="50" cy="50" r="45" fill={COLORS.primarySoft} />
    <Circle cx="50" cy="50" r="45" stroke={COLORS.primary} strokeWidth="1.5" strokeDasharray="4 4" />
    <Rect x="30" y="38" width="40" height="28" rx="4" fill={COLORS.primary} />
    <Path d="M30 48 L70 48" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <Path d="M42 58 L58 58" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <Path d="M35 38 L50 28 L65 38" stroke={COLORS.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="50" cy="66" r="7" fill="#FFD700" />
    <Path d="M47 66 L49.5 68.5 L53.5 64" stroke={COLORS.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconChevronDown = ({ color = COLORS.textMuted }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconSearch = ({ color = COLORS.textMuted }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
    <Path d="M20 20l-3.5-3.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
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

const IconArrowRight = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M5 12h14M12 5l7 7-7 7" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconLocation = ({ color = COLORS.primary }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-7.5 8-13a8 8 0 10-16 0c0 5.5 8 13 8 13z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="9" r="3" stroke={color} strokeWidth="2" />
  </Svg>
);

const IconPhoneSmall = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.574 2.81.7A2 2 0 0122 16.92z" stroke={COLORS.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconUserSmall = ({ color = COLORS.primary }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" />
    <Path d="M5 20v-2a7 7 0 0114 0v2" stroke={color} strokeWidth="2" strokeLinecap="round" />
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

// ═══════════════════════════════════════════════════════════════
// 🏦 ÉCRAN TRANSFERT AU GUICHET
// ═══════════════════════════════════════════════════════════════
export default function TransferToAgencyScreen({ navigation }) {
  const { width = 400, height = 800 } = useWindowDimensions();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [selectedDepartement, setSelectedDepartement] = useState(null);
  const [amount, setAmount] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [regionModalVisible, setRegionModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [feesIncluded, setFeesIncluded] = useState(true);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState(null);

  const [isSending, setIsSending] = useState(false);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(false);

  const [departements, setDepartements] = useState([]);
  const [isLoadingDepartements, setIsLoadingDepartements] = useState(true);

  const { balance, refreshWallet } = useTransactions();

  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [useBiometric, setUseBiometric] = useState(false);

  const [currentUserPhone, setCurrentUserPhone] = useState(null);
  const [senderFirstName, setSenderFirstName]   = useState('');
  const [senderLastName, setSenderLastName]     = useState('');

  // Chargement du user connecté (prénom + nom)
  useEffect(() => {
    (async () => {
      try {
        const u = await API.getCurrentUser();
        if (u?.phone) {
          setCurrentUserPhone(
            String(u.phone).replace(/\s/g, '').replace(/^\+?227/, '')
          );
        }
        const fullName = String(u?.name || u?.full_name || '').trim();
        if (fullName) {
          const parts = fullName.split(/\s+/).filter(Boolean);
          const first = parts[0] || '';
          const last  = parts.slice(1).join(' ') || first;
          setSenderFirstName(first);
          setSenderLastName(last);
        }
      } catch (_) {}
    })();
  }, []);

  // Chargement des départements
  useEffect(() => {
    const loadDepartements = async () => {
      try {
        if (__DEV__) console.log('📡 [TransferAgency] Chargement départements...');
        const data = await API.getDepartements();
        setDepartements(Array.isArray(data) ? data : []);
        if (__DEV__) console.log(`✅ [TransferAgency] ${data?.length || 0} départements chargés`);
      } catch (error) {
        if (__DEV__) console.error('❌ [TransferAgency] Erreur chargement départements :', error);
        Alert.alert('Erreur', 'Impossible de charger la liste des régions. Vérifiez votre connexion.');
      } finally {
        setIsLoadingDepartements(false);
      }
    };
    loadDepartements();
  }, []);

  // Biométrie
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
        if (__DEV__) console.log('🔐 [TransferAgency] Biométrie disponible :', available);
      } catch (error) {
        if (__DEV__) console.log('Erreur biométrie:', error);
        setIsBiometricAvailable(false);
        setUseBiometric(false);
      }
    };
    checkBiometrics();
  }, []);

  // AUTHENTIFICATION BIOMÉTRIQUE (vraie, via backend)
  const authenticateWithBiometrics = async () => {
    if (isSending || isVerifyingAuth) return;
    setIsVerifyingAuth(true);
    try {
      await verifyTransactionAuth(AUTH_METHOD.BIOMETRIC);
      await executeTransfer();
    } catch (error) {
      if (error?.message === AUTH_CANCELLED) return;
      const msg = String(error?.message || '');
      if (msg.includes('Session biométrique expirée') || msg.includes('Aucune empreinte')) {
        setUseBiometric(false);
      }
      Alert.alert('Authentification refusée', msg || 'Veuillez réessayer.');
    } finally {
      setIsVerifyingAuth(false);
    }
  };

  // CONFIRMATION PAR VRAI MOT DE PASSE (8-20)
  const confirmWithPin = async () => {
    if (isSending || isVerifyingAuth) return;

    if (!isValidPin(pin)) {
      Alert.alert(
        'Mot de passe invalide',
        'Le mot de passe doit contenir entre 8 et 20 caractères.'
      );
      return;
    }

    setIsVerifyingAuth(true);
    try {
      await verifyTransactionAuth(AUTH_METHOD.PIN, pin);
      setPin('');
      await executeTransfer();
    } catch (error) {
      Alert.alert(
        'Mot de passe incorrect',
        error?.message || 'Le mot de passe saisi est incorrect.'
      );
      setPin('');
    } finally {
      setIsVerifyingAuth(false);
    }
  };

  // Exécution du transfert guichet
  const executeTransfer = async () => {
    if (!transactionDetails) {
      if (__DEV__) console.warn('⚠️ [TransferAgency] executeTransfer sans transactionDetails');
      return;
    }

    const departementId = transactionDetails.departementId;
    const receiverPhone = String(transactionDetails.phoneNumber || '')
      .replace(/\s/g, '').replace(/^\+?227/, '');

    if (!departementId) {
      Alert.alert('Erreur', 'Veuillez sélectionner une région de retrait.');
      return;
    }
    if (!receiverPhone) {
      Alert.alert('Erreur', 'Numéro du bénéficiaire manquant.');
      return;
    }
    if (!senderFirstName.trim() || !senderLastName.trim()) {
      Alert.alert(
        'Erreur',
        'Vos informations (nom et prénom) sont incomplètes. Complétez votre profil avant de continuer.'
      );
      return;
    }

    if (__DEV__) {
      console.log('');
      console.log('═══════════════════════════════════════════════');
      console.log('🏦 [TransferAgency] executeTransfer → APPEL BACKEND');
      console.log('   Département ID :', departementId);
      console.log('   Département    :', transactionDetails.region);
      console.log('   Bénéficiaire   :', transactionDetails.beneficiaryName);
      console.log('   N° bénéf.      :', receiverPhone);
      console.log('   Montant        :', transactionDetails.amount, 'FCFA');
      console.log('   Frais inclus   :', feesIncluded);
      console.log('   Sender first   :', senderFirstName);
      console.log('   Sender last    :', senderLastName);
      console.log('═══════════════════════════════════════════════');
    }

    setModalVisible(false);
    setIsSending(true);

    try {
      const result = await API.transferToAgency({
        departement_id:    departementId,
        amount:            Number(transactionDetails.amount),
        frais_inclus:      Boolean(feesIncluded),
        receiver_phone:    receiverPhone,
        sender_first_name: senderFirstName.trim(),
        sender_last_name:  senderLastName.trim(),
      });

      if (__DEV__) console.log('✅ [TransferAgency] Réponse backend :', JSON.stringify(result, null, 2));

      const grossAmount = parseFloat(result.gross_amount) || Number(transactionDetails.amount);
      const feeAmount   = parseFloat(result.fee_amount)   || transactionDetails.fees || 0;
      const netAmount   = parseFloat(result.net_amount)   || transactionDetails.receivedAmount || grossAmount;

      setTransactionDetails((prev) => ({
        ...prev,
        reference:      result.reference || prev.reference,
        backendId:      result.id,
        backendStatus:  result.status,
        grossAmount:    grossAmount,
        feeAmount:      feeAmount,
        netAmount:      netAmount,
        debitedAmount:  parseFloat(result.gross_amount) + parseFloat(result.fee_amount) || prev.debitedAmount,
      }));

      // CACHE DES MÉTADONNÉES
      if (result.id) {
        try {
          await saveTxMetadata(result.id, {
            reference:      result.reference,
            sender_phone:   currentUserPhone,
            sender_name:    `${senderFirstName} ${senderLastName}`.trim(),
            receiver_phone: receiverPhone,
            receiver_name:  transactionDetails.beneficiaryName || `+227 ${receiverPhone}`,
          });
          if (__DEV__) console.log('💾 [TransferAgency] Metadata cachée pour tx', result.id);
        } catch (cacheErr) {
          if (__DEV__) console.warn('⚠️ [TransferAgency] Erreur cache metadata :', cacheErr?.message);
        }
      }

      // NOTIFICATION UTILISATEUR
      try {
        const amountStr = Number(transactionDetails.amount).toLocaleString('fr-FR');
        const receiverLabel = transactionDetails.beneficiaryName || `+227 ${receiverPhone}`;
        const regionStr = transactionDetails.region || 'Agence NT Albey';

        await API.addNotification({
          title: '🏦 Transfert guichet envoyé',
          message: `Vous avez envoyé ${amountStr} FCFA à ${receiverLabel}. Il pourra retirer à ${regionStr} avec le code ${result.reference || ''}.`,
          type: 'success',
          transactionId: result.id,
          reference: result.reference,
        });
        if (__DEV__) console.log('🔔 [TransferAgency] Notification créée');

        const raw = await AsyncStorage.getItem(NOTIFIED_TX_IDS_KEY);
        let ids = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(ids)) ids = [];
        const txId = String(result.id);
        if (!ids.map(String).includes(txId)) {
          ids.push(txId);
          ids = ids.slice(-100);
          await AsyncStorage.setItem(NOTIFIED_TX_IDS_KEY, JSON.stringify(ids));
        }
      } catch (notifErr) {
        if (__DEV__) console.warn('⚠️ [TransferAgency] Erreur création notification :', notifErr?.message);
      }

      setPin('');
      setReceiptModalVisible(true);

      if (typeof refreshWallet === 'function') {
        if (__DEV__) console.log('🔄 [TransferAgency] Refresh wallet...');
        await refreshWallet();
      }
    } catch (error) {
      if (__DEV__) console.error('❌ [TransferAgency] Échec du transfert :', error.message);
      Alert.alert(
        'Échec du transfert',
        error.message || 'Impossible d\'effectuer le transfert. Vérifiez votre connexion.'
      );
    } finally {
      setIsSending(false);
      if (__DEV__) console.log('🏁 [TransferAgency] executeTransfer terminé');
    }
  };

  const calculateFees = (amountValue) => {
    if (!amountValue || amountValue <= 0) return 0;
    if (amountValue <= 15000) return 100;
    return Math.ceil(amountValue * 0.015);
  };

  const calculateTransactionDetails = (amountValue, feesIncludedOption) => {
    if (!amountValue || amountValue <= 0) {
      return { fees: 0, debitedAmount: 0, receivedAmount: 0 };
    }
    const fees = calculateFees(amountValue);
    let debitedAmount, receivedAmount;
    if (feesIncludedOption) {
      debitedAmount = amountValue;
      receivedAmount = amountValue - fees;
    } else {
      debitedAmount = amountValue + fees;
      receivedAmount = amountValue;
    }
    return { fees, debitedAmount, receivedAmount };
  };

  const generateWithdrawCode = () => {
    const prefix = 'NT';
    const random = String(Math.floor(100000 + Math.random() * 900000));
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${prefix}${random}${day}${month}${year}`;
  };

  const safeFormatCurrency = (num) => {
    if (num === undefined || num === null || isNaN(num)) return '0 FCFA';
    return num.toLocaleString() + ' FCFA';
  };

  // ═══════════════════════════════════════════════════════════
  // ✅ handleSend avec validation détaillée du numéro
  // ═══════════════════════════════════════════════════════════
  const handleSend = () => {
    if (__DEV__) {
      console.log('');
      console.log('📤 [TransferAgency] handleSend → début');
      console.log('   Bénéficiaire :', beneficiaryName);
      console.log('   Téléphone    :', phoneNumber);
      console.log('   Département  :', selectedDepartement?.designation);
      console.log('   Montant      :', amount);
    }

    // 1️⃣ VALIDATION DU NUMÉRO
    const cleanPhone = String(phoneNumber || '')
      .replace(/[\s\-()\.]/g, '')
      .replace(/^\+?227/, '');

    if (!cleanPhone) {
      Alert.alert(
        'Numéro manquant',
        'Veuillez saisir le numéro de téléphone du bénéficiaire.'
      );
      return;
    }

    if (!/^\d+$/.test(cleanPhone)) {
      Alert.alert(
        'Numéro invalide',
        'Le numéro ne doit contenir que des chiffres.'
      );
      return;
    }

    if (cleanPhone.length !== 8) {
      Alert.alert(
        'Numéro invalide',
        'Le numéro doit contenir exactement 8 chiffres.\n\nExemple : 93 45 22 71'
      );
      return;
    }

    if (!/^(83|93)\d{6}$/.test(cleanPhone)) {
      Alert.alert(
        'Numéro invalide',
        'Le numéro doit commencer par 83 ou 93.\n\nExemples valides :\n• 83 35 62 00\n• 93 45 22 71'
      );
      return;
    }

    // 2️⃣ VALIDATION DU NOM BÉNÉFICIAIRE
    if (!beneficiaryName.trim()) {
      Alert.alert(
        'Nom manquant',
        'Veuillez saisir le nom complet du bénéficiaire.'
      );
      return;
    }

    // 3️⃣ VALIDATION DE LA RÉGION
    if (!selectedDepartement) {
      Alert.alert(
        'Région manquante',
        'Veuillez sélectionner une région de retrait.'
      );
      return;
    }

    // 4️⃣ VALIDATION DU MONTANT
    if (!amount || parseInt(amount) <= 0) {
      Alert.alert(
        'Montant manquant',
        'Veuillez saisir un montant valide.'
      );
      return;
    }

    // 5️⃣ VALIDATION DU PROFIL EXPÉDITEUR
    if (!senderFirstName.trim() || !senderLastName.trim()) {
      Alert.alert(
        'Profil incomplet',
        'Votre nom et prénom sont requis pour ce transfert. Complétez votre profil puis réessayez.'
      );
      return;
    }

    // 6️⃣ VALIDATION DU SOLDE
    const amountValue = parseInt(amount);
    const details = calculateTransactionDetails(amountValue, feesIncluded);

    if (details.debitedAmount > balance) {
      Alert.alert(
        'Solde insuffisant',
        `Le total à débiter est de ${safeFormatCurrency(details.debitedAmount)}, ce qui dépasse votre solde de ${safeFormatCurrency(balance)}.`
      );
      return;
    }

    // ✅ TOUT EST BON → préparation du modal de confirmation
    const code = generateWithdrawCode();
    setGeneratedCode(code);
    setTransactionDetails({
      beneficiaryName,
      phoneNumber:    cleanPhone,
      region:         selectedDepartement.designation,
      departementId:  selectedDepartement.id,
      amount:         amountValue,
      fees:           details.fees,
      debitedAmount:  details.debitedAmount,
      receivedAmount: details.receivedAmount,
      feesIncluded,
      reference:      code,
      date:           new Date().toLocaleString('fr-FR'),
    });

    if (__DEV__) console.log('✅ [TransferAgency] Ouverture du modal de confirmation');
    setModalVisible(true);
    setUseBiometric(isBiometricAvailable);
    setPin('');
  };

  const finishTransfer = () => {
    if (__DEV__) console.log('🏁 [TransferAgency] finishTransfer → fermeture');
    Alert.alert('C\'est fait !', 'Votre transfert au guichet a été effectué avec succès.');
    setReceiptModalVisible(false);
    setPhoneNumber('');
    setBeneficiaryName('');
    setSelectedDepartement(null);
    setAmount('');
    setGeneratedCode('');
    setTransactionDetails(null);
    navigation.goBack();
  };

  const filteredDepartements = departements.filter((d) =>
    String(d.designation || '')
      .toLowerCase()
      .includes(searchQuery.toLowerCase().trim())
  );

  const getFeesDisplay = () => {
    if (!amount || parseInt(amount) <= 0) return { fees: 0, debited: 0, received: 0 };
    const result = calculateTransactionDetails(parseInt(amount), feesIncluded);
    return {
      fees: result.fees || 0,
      debited: result.debitedAmount || 0,
      received: result.receivedAmount || 0,
    };
  };
  const feesDisplay = getFeesDisplay();

  // ─── HTML du PDF ────────────────────────────────────────────────
  const generatePDFHTML = (details, logoBase64) => {
    const logoHtml = logoBase64
      ? `<img src="${logoBase64}" alt="NT Albey Logo" class="logo" />`
      : `<div style="background:linear-gradient(135deg,#008933,#00A34D);color:white;padding:10px 30px;border-radius:10px;display:inline-block;font-weight:700;font-size:22px;letter-spacing:4px;box-shadow:0 4px 15px rgba(0,137,51,0.3);margin-bottom:6px;">NT ALBEY</div>`;
    const date = details.date || new Date().toLocaleString('fr-FR');
    const feesLabel = details.amount <= 15000 ? '100 FCFA (fixe)' : '1.5% du montant';
    return `<!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8"><style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Helvetica Neue',Arial,sans-serif; padding:40px 30px; max-width:700px; margin:0 auto; color:#1A1A1A; background:#fff; }
          .header { text-align:center; border-bottom:3px solid #008933; padding-bottom:20px; margin-bottom:25px; }
          .logo-container { display:flex; flex-direction:column; align-items:center; justify-content:center; margin-bottom:6px; }
          .logo { max-width:100px; height:auto; margin-bottom:6px; }
          .header h1 { color:#008933; font-size:22px; margin:0; letter-spacing:3px; font-weight:800; }
          .header .subtitle { color:#666; font-size:13px; margin-top:4px; letter-spacing:1px; }
          .transaction-id { text-align:center; color:#888; font-size:11px; margin-bottom:20px; font-family:monospace; letter-spacing:1px; }
          .success-badge { text-align:center; margin-bottom:20px; }
          .success-badge span { background-color:#10B981; color:white; padding:6px 24px; border-radius:30px; font-size:14px; font-weight:700; letter-spacing:1px; }
          .highlight-box { background-color:#F0FFF4; border-radius:12px; padding:18px; margin:16px 0; border-left:5px solid #008933; }
          .highlight-box .info-row { border-bottom:1px solid #D0E8D0; padding:8px 0; }
          .highlight-box .info-row:last-child { border-bottom:none; }
          .info-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #F0F0F0; }
          .info-row:last-child { border-bottom:none; }
          .info-label { color:#666; font-size:13px; font-weight:500; }
          .info-value { color:#1A1A1A; font-size:13px; font-weight:600; text-align:right; max-width:60%; word-break:break-word; }
          .info-value.amount-sent { color:#FF6600; font-size:16px; font-weight:800; }
          .info-value.fees-value { color:#FF4444; font-weight:700; }
          .info-value.amount-highlight { color:#008933; font-size:16px; font-weight:800; }
          .info-value.amount-received { color:#008933; font-size:16px; font-weight:800; }
          .footer { text-align:center; margin-top:30px; padding-top:20px; border-top:2px solid #F0F0F0; color:#999; font-size:11px; }
          .footer .brand { color:#008933; font-weight:700; font-size:14px; letter-spacing:2px; }
          .footer .slogan { color:#666; font-size:11px; margin-top:4px; }
          .footer .date { font-size:9px; color:#BBB; margin-top:6px; }
          .footer .support { margin-top:8px; font-size:10px; color:#888; }
        </style></head>
        <body>
          <div class="header"><div class="logo-container">${logoHtml}<h1>NT ALBEY</h1></div><div class="subtitle">Votre argent, partout, tout le temps</div></div>
          <div class="transaction-id">TRANSACTION N° ${details.reference || 'N/A'}</div>
          <div class="success-badge"><span>✅ TRANSFERT AU GUICHET CONFIRMÉ</span></div>
          <div class="highlight-box">
            <div class="info-row"><span class="info-label">👤 Bénéficiaire</span><span class="info-value">${details.beneficiaryName || 'N/A'}</span></div>
            <div class="info-row"><span class="info-label">📞 Téléphone</span><span class="info-value">${details.phoneNumber || 'N/A'}</span></div>
            <div class="info-row"><span class="info-label">📍 Région</span><span class="info-value">${details.region || 'N/A'}</span></div>
            <div class="info-row"><span class="info-label">💰 Montant envoyé</span><span class="info-value amount-sent">${safeFormatCurrency(details.amount)}</span></div>
          </div>
          <div class="info-row"><span class="info-label">📋 Frais de transfert</span><span class="info-value fees-value">${safeFormatCurrency(details.fees)}</span></div>
          <div class="info-row"><span class="info-label">📊 Barème</span><span class="info-value">${feesLabel}</span></div>
          <div class="info-row"><span class="info-label">${details.feesIncluded ? '✅ Frais inclus' : '❌ Hors frais'}</span><span class="info-value">${details.feesIncluded ? 'Inclus dans le montant' : 'Ajoutés au montant'}</span></div>
          <div class="info-row"><span class="info-label">💳 Total débité</span><span class="info-value amount-highlight">${safeFormatCurrency(details.debitedAmount)}</span></div>
          <div class="info-row"><span class="info-label">📥 Reçu par le bénéficiaire</span><span class="info-value amount-received">${safeFormatCurrency(details.receivedAmount)}</span></div>
          <div class="info-row"><span class="info-label">🔑 Code de retrait</span><span class="info-value" style="font-family:monospace;font-weight:800;color:#FF6600;">${details.reference || 'N/A'}</span></div>
          <div class="info-row"><span class="info-label">📅 Date</span><span class="info-value">${date}</span></div>
          <div class="footer"><div class="brand">NT ALBEY</div><div class="slogan">Votre argent, partout, tout le temps</div><div class="date">Document généré le ${new Date().toLocaleString('fr-FR')}</div><div class="support">📞 Support : 555 | 📧 support@ntalbey.ne</div></div>
        </body>
      </html>`;
  };

  const handleExportPDF = async (details) => {
    if (!details) return Alert.alert('Erreur', 'Aucune donnée à exporter.');
    try {
      setIsExporting(true);
      if (__DEV__) console.log('📄 [TransferAgency] Export PDF...');
      const logoBase64 = await getLogoBase64();
      const html = generatePDFHTML(details, logoBase64);

      const { base64 } = await Print.printToFileAsync({ html, base64: true });
      if (!base64) throw new Error('PDF vide');

      const filename = `recu_transfert_guichet_${Date.now()}.pdf`;
      const destUri = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(destUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(destUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Reçu de transfert - ${details.reference || 'NT Albey'}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Reçu généré', 'Votre reçu est prêt.');
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur export PDF:', error);
      Alert.alert('Erreur', 'Impossible de générer le PDF.\n' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareText = (details) => {
    if (!details) return Alert.alert('Erreur', 'Aucune donnée à partager.');
    const message = `NT ALBEY - REÇU DE TRANSFERT AU GUICHET
━━━━━━━━━━━━━━━━━━━━━
✅ TRANSFERT CONFIRMÉ
━━━━━━━━━━━━━━━━━━━━━
👤 Bénéficiaire : ${details.beneficiaryName || 'N/A'}
📞 Téléphone : ${details.phoneNumber || 'N/A'}
📍 Région : ${details.region || 'N/A'}
💰 Montant envoyé : ${safeFormatCurrency(details.amount)}
📋 Frais : ${safeFormatCurrency(details.fees)}
${details.feesIncluded ? '✅ Frais inclus' : '❌ Hors frais'}
💳 Total débité : ${safeFormatCurrency(details.debitedAmount)}
📥 Reçu par le bénéficiaire : ${safeFormatCurrency(details.receivedAmount)}
🔑 Code de retrait : ${details.reference || 'N/A'}
📅 Date : ${details.date || new Date().toLocaleString('fr-FR')}
━━━━━━━━━━━━━━━━━━━━━
🏦 Retrait dans toutes les agences NT Albey
📞 Support : 555 | 📧 support@ntalbey.ne`;
    Share.share({ message, title: `Reçu de transfert - ${details.reference || 'NT Albey'}` });
  };

  const modalWidth = width ? width - 40 : 320;
  const receiptModalWidth = width ? width - 24 : 340;
  const receiptMaxHeight = height ? Math.min(height * 0.94, height - 40) : 700;

  const hasPhone = !!(phoneNumber && phoneNumber.length >= 8);
  const hasName = !!beneficiaryName.trim();
  const hasRegion = !!selectedDepartement;
  const hasAmount = !!(amount && parseInt(amount) > 0);
  const canSend = hasPhone && hasName && hasRegion && hasAmount && !isSending;

  return (
    <View style={styles.container}>
      {/* ═══════════ HEADER ═══════════ */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <IconBack />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Transfert guichet</Text>
          <Text style={styles.headerSubtitle}>Retrait en agence NT Albey</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ═══════════ ÉTAPE 1 : BÉNÉFICIAIRE ═══════════ */}
        <View style={styles.stepHeaderFirst}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>1</Text>
          </View>
          <Text style={styles.stepTitle}>Informations bénéficiaire</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.inputLabel}>Numéro de téléphone</Text>
          <View style={styles.inputWrapper}>
            <View style={styles.inputIconLeft}>
              <IconPhoneSmall />
            </View>
            <TextInput
              style={styles.inputField}
              placeholder="Ex : 93 45 22 71"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              editable={!isSending}
              maxLength={15}
            />
          </View>

          <Text style={styles.inputLabel}>Nom complet du bénéficiaire</Text>
          <View style={styles.inputWrapper}>
            <View style={styles.inputIconLeft}>
              <IconUserSmall />
            </View>
            <TextInput
              style={styles.inputField}
              placeholder="Ex : Amadou Ibrahim"
              placeholderTextColor={COLORS.textMuted}
              value={beneficiaryName}
              onChangeText={setBeneficiaryName}
              editable={!isSending}
            />
          </View>

          <Text style={styles.inputLabel}>Région de retrait</Text>
          <TouchableOpacity
            style={[styles.regionPicker, hasRegion && styles.regionPickerFilled]}
            onPress={() => { setSearchQuery(''); setRegionModalVisible(true); }}
            disabled={isLoadingDepartements || isSending}
            activeOpacity={0.75}
          >
            <View style={styles.regionPickerIconWrap}>
              <IconLocation color={hasRegion ? '#FFFFFF' : COLORS.primary} />
            </View>
            <View style={styles.regionPickerContent}>
              <Text style={[styles.regionPickerText, hasRegion && styles.regionPickerTextFilled]}>
                {isLoadingDepartements
                  ? 'Chargement des régions…'
                  : (hasRegion ? selectedDepartement?.designation : 'Sélectionnez une localité')}
              </Text>
              {!hasRegion && !isLoadingDepartements && (
                <Text style={styles.regionPickerHint}>Appuyez pour choisir</Text>
              )}
            </View>
            {isLoadingDepartements ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <IconChevronDown color={hasRegion ? COLORS.primary : COLORS.textMuted} />
            )}
          </TouchableOpacity>
        </View>

        {/* ═══════════ ÉTAPE 2 : MONTANT ═══════════ */}
        <View style={styles.stepHeader}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>2</Text>
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
              editable={!isSending}
            />
            <Text style={styles.currencySymbol}>FCFA</Text>
          </View>

          <View style={styles.suggestionsRow}>
            {['5000', '10000', '25000', '50000'].map((sug, index) => (
              <TouchableOpacity
                key={`sug-${sug}-${index}`}
                style={[styles.suggestionChip, amount === sug && styles.suggestionChipActive]}
                onPress={() => setAmount(sug)}
                disabled={isSending}
                activeOpacity={0.75}
              >
                <Text style={[styles.suggestionText, amount === sug && styles.suggestionTextActive]}>
                  {parseInt(sug).toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ─── FRAIS TOGGLE ─── */}
          <View style={styles.feesSection}>
            <View style={styles.feesToggleContainer}>
              <View style={styles.feesToggleLeft}>
                <View style={[styles.feesToggleIcon, feesIncluded && styles.feesToggleIconActive]}>
                  <Text style={{ fontSize: 14 }}>{feesIncluded ? '✅' : '❌'}</Text>
                </View>
                <View>
                  <Text style={styles.feesToggleTitle}>
                    {feesIncluded ? 'Frais inclus' : 'Hors frais'}
                  </Text>
                  <Text style={styles.feesToggleSubtitle}>
                    {feesIncluded
                      ? 'Les frais sont déduits du montant reçu'
                      : 'Les frais sont ajoutés au total débité'}
                  </Text>
                </View>
              </View>
              <Switch
                value={feesIncluded}
                onValueChange={setFeesIncluded}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor="#FFFFFF"
                disabled={isSending}
              />
            </View>

            <View style={styles.feesDetails}>
              <View style={styles.feesDetailRow}>
                <Text style={styles.feesDetailLabel}>Montant</Text>
                <Text style={styles.feesDetailValue}>{safeFormatCurrency(parseInt(amount) || 0)}</Text>
              </View>
              <View style={styles.feesDetailRow}>
                <Text style={styles.feesDetailLabel}>
                  Frais {amount && parseInt(amount) > 15000 ? '(1,5%)' : '(100 F fixe)'}
                </Text>
                <Text style={styles.feesDetailFees}>{safeFormatCurrency(feesDisplay.fees)}</Text>
              </View>
              <View style={styles.feesDetailDivider} />
              <View style={styles.feesDetailRow}>
                <Text style={styles.feesDetailLabelTotal}>💳 Total débité</Text>
                <Text style={styles.feesDetailValueTotal}>{safeFormatCurrency(feesDisplay.debited)}</Text>
              </View>
              <View style={styles.feesDetailRow}>
                <Text style={styles.feesDetailLabelReceived}>📥 Bénéficiaire reçoit</Text>
                <Text style={styles.feesDetailValueReceived}>{safeFormatCurrency(feesDisplay.received)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ═══════════ BOUTON ENVOYER ═══════════ */}
        <TouchableOpacity
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.85}
        >
          {isSending ? (
            <View style={styles.sendButtonContent}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.sendButtonText}>Transfert en cours…</Text>
            </View>
          ) : (
            <View style={styles.sendButtonContent}>
              <Text style={[styles.sendButtonText, !canSend && styles.sendButtonTextDisabled]}>
                {amount && parseInt(amount) > 0
                  ? `Envoyer ${parseInt(amount).toLocaleString()} FCFA`
                  : 'Envoyer'}
              </Text>
              {canSend && (
                <View style={styles.sendIconCircle}>
                  <IconArrowRight />
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* ═══════════════ MODAL SÉLECTION DÉPARTEMENT ═══════════════ */}
      <Modal visible={regionModalVisible} transparent onRequestClose={() => setRegionModalVisible(false)}>
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
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                  <Text style={styles.clearSearchText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {isLoadingDepartements ? (
              <View style={styles.regionLoading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.regionLoadingText}>Chargement des régions…</Text>
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
                        setSearchQuery('');
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.regionItemIcon, isSelected && styles.regionItemIconSelected]}>
                        <IconLocation color={isSelected ? '#FFFFFF' : COLORS.primary} />
                      </View>
                      <Text style={[styles.regionItemText, isSelected && styles.regionItemTextSelected]}>
                        {item.designation}
                      </Text>
                      {isSelected && (
                        <View style={styles.regionItemCheck}>
                          <IconCheckSmall />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            <TouchableOpacity
              style={styles.regionCloseButton}
              onPress={() => { setRegionModalVisible(false); setSearchQuery(''); }}
              activeOpacity={0.75}
            >
              <Text style={styles.regionCloseButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ═══════════════ MODAL CONFIRMATION ═══════════════ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          if (isSending || isVerifyingAuth) return;
          setModalVisible(false);
          setPin('');
          setUseBiometric(isBiometricAvailable);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModalContent, { width: modalWidth }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.confirmIconWrapper}>
                <IconTransferAgencyBig />
              </View>

              <Text style={styles.confirmTitle}>Confirmer le transfert</Text>
              <Text style={styles.confirmAmount}>
                {safeFormatCurrency(parseInt(amount) || 0)}
              </Text>
              <Text style={styles.confirmRecipient}>
                à {beneficiaryName}
              </Text>

              {/* ═══════════ RÉCAP HARMONISÉ ═══════════ */}
              <View style={styles.confirmInfoBox}>
                <View style={styles.confirmInfoRow}>
                  <Text style={styles.confirmInfoLabel}>📍 Région</Text>
                  <Text style={styles.confirmInfoValue} numberOfLines={1}>
                    {selectedDepartement?.designation || '—'}
                  </Text>
                </View>
                <View style={styles.confirmInfoRow}>
                  <Text style={styles.confirmInfoLabel}>💰 Montant</Text>
                  <Text style={styles.confirmInfoValue}>
                    {safeFormatCurrency(parseInt(amount) || 0)}
                  </Text>
                </View>
                <View style={styles.confirmInfoRow}>
                  <Text style={styles.confirmInfoLabel}>📋 Frais</Text>
                  <Text style={styles.confirmInfoValue}>
                    {safeFormatCurrency(feesDisplay.fees)}
                  </Text>
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
                  <Text style={styles.confirmInfoValueTotal}>
                    {safeFormatCurrency(feesDisplay.debited)}
                  </Text>
                </View>
                <View style={styles.confirmInfoRow}>
                  <Text style={styles.confirmInfoLabelReceived}>📥 Bénéficiaire reçoit</Text>
                  <Text style={styles.confirmInfoValueReceived}>
                    {safeFormatCurrency(feesDisplay.received)}
                  </Text>
                </View>
              </View>

              {/* Code de retrait */}
              <View style={styles.confirmCodeBox}>
                <Text style={styles.confirmCodeLabel}>🔑 CODE DE RETRAIT</Text>
                <Text style={styles.confirmCode}>{generatedCode}</Text>
              </View>

              {isBiometricAvailable && useBiometric ? (
                <>
                  <Text style={styles.confirmHintText}>Confirmez avec votre empreinte</Text>
                  <TouchableOpacity
                    style={styles.biometricButton}
                    onPress={authenticateWithBiometrics}
                    activeOpacity={0.75}
                    disabled={isSending || isVerifyingAuth}
                  >
                    {isSending || isVerifyingAuth ? (
                      <ActivityIndicator color={COLORS.primary} size="small" />
                    ) : (
                      <Image source={require('../assets/images/print.png')} style={styles.biometricIcon} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.switchMethodButton}
                    onPress={() => setUseBiometric(false)}
                    disabled={isSending || isVerifyingAuth}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.switchMethodText}>🔑 Utiliser mon mot de passe</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.confirmHintText}>
                    Entrez votre mot de passe (8 à 20 caractères)
                  </Text>

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
                      editable={!isSending && !isVerifyingAuth}
                    />
                    <TouchableOpacity
                      style={styles.pinEyeButton}
                      onPress={() => setPinVisible(v => !v)}
                      disabled={isSending || isVerifyingAuth}
                      activeOpacity={0.7}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      {pinVisible ? <IconEyeOpen /> : <IconEyeClosed />}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.pinToggleLabelWrapper}
                    onPress={() => setPinVisible(v => !v)}
                    disabled={isSending || isVerifyingAuth}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pinToggleLabelText}>
                      {pinVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    </Text>
                  </TouchableOpacity>

                  {isBiometricAvailable && (
                    <TouchableOpacity
                      style={styles.switchMethodButton}
                      onPress={() => setUseBiometric(true)}
                      disabled={isSending || isVerifyingAuth}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.switchMethodText}>👆 Utiliser mon empreinte</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.confirmButtonStandalone}
                    onPress={confirmWithPin}
                    disabled={isSending || isVerifyingAuth}
                    activeOpacity={0.85}
                  >
                    {isSending || isVerifyingAuth ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.confirmButtonTextStandalone}>Confirmer</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={styles.cancelButtonStandalone}
                onPress={() => {
                  setModalVisible(false);
                  setPin('');
                  setUseBiometric(isBiometricAvailable);
                }}
                disabled={isSending || isVerifyingAuth}
                activeOpacity={0.75}
              >
                <Text style={styles.cancelButtonTextStandalone}>
                  {isSending || isVerifyingAuth ? 'Traitement en cours…' : 'Annuler'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ═══════════════ MODAL REÇU (harmonisé) ═══════════════ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={receiptModalVisible}
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <View style={styles.receiptOverlay}>
          <View
            style={[
              styles.receiptModalContent,
              { width: receiptModalWidth, maxHeight: receiptMaxHeight },
            ]}
          >
            {/* HEADER COMPACT */}
            <View style={styles.receiptHeader}>
              <View style={styles.receiptIcon}>
                <Text style={styles.receiptIconText}>✅</Text>
              </View>
              <Text style={styles.receiptTitle}>Transfert confirmé</Text>
              <Text style={styles.receiptSubtitle}>Transaction effectuée avec succès</Text>
            </View>

            {/* CONTENU SCROLLABLE */}
            <ScrollView
              style={styles.receiptScroll}
              contentContainerStyle={styles.receiptScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {transactionDetails ? (
                <>
                  {/* BÉNÉFICIAIRE */}
                  <View style={styles.receiptCard}>
                    <Text style={styles.receiptSectionLabel}>BÉNÉFICIAIRE</Text>

                    <View style={styles.receiptParticipantCard}>
                      <View style={styles.receiptParticipantBadgeTo}>
                        <Text style={styles.receiptParticipantBadgeText}>À</Text>
                      </View>
                      <View style={styles.receiptParticipantInfo}>
                        <Text style={styles.receiptParticipantName} numberOfLines={1}>
                          {transactionDetails.beneficiaryName || 'Bénéficiaire'}
                        </Text>
                        <Text style={styles.receiptParticipantPhone}>
                          {transactionDetails.phoneNumber
                            ? `+227 ${transactionDetails.phoneNumber}`
                            : 'N/A'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>📍 Région</Text>
                      <Text style={styles.receiptValue}>
                        {transactionDetails.region || 'N/A'}
                      </Text>
                    </View>
                  </View>

                  {/* MONTANTS */}
                  <View style={styles.receiptCard}>
                    <Text style={styles.receiptSectionLabel}>MONTANTS</Text>

                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>💰 Montant envoyé</Text>
                      <Text style={[styles.receiptValue, styles.receiptValueSent]}>
                        {safeFormatCurrency(transactionDetails.amount)}
                      </Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>📋 Frais</Text>
                      <Text style={[styles.receiptValue, styles.receiptValueFees]}>
                        {safeFormatCurrency(transactionDetails.fees)}
                      </Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>
                        {transactionDetails.feesIncluded ? '✅ Frais inclus' : '❌ Hors frais'}
                      </Text>
                      <Text style={styles.receiptValue}>
                        {transactionDetails.feesIncluded ? 'Inclus' : 'Ajoutés'}
                      </Text>
                    </View>
                    <View style={[styles.receiptRow, styles.receiptRowTotal]}>
                      <Text style={styles.receiptLabelTotal}>💳 Total débité</Text>
                      <Text style={styles.receiptValueTotal}>
                        {safeFormatCurrency(transactionDetails.debitedAmount)}
                      </Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabelReceived}>📥 Reçu par le bénéficiaire</Text>
                      <Text style={styles.receiptValueReceived}>
                        {safeFormatCurrency(transactionDetails.receivedAmount)}
                      </Text>
                    </View>
                  </View>

                  {/* CODE DE RETRAIT */}
                  <View style={styles.receiptCodeCard}>
                    <View style={styles.receiptCodeHeader}>
                      <IconSparkle />
                      <Text style={styles.receiptCodeLabel}>CODE DE RETRAIT</Text>
                    </View>
                    <Text style={styles.receiptCode}>
                      {transactionDetails.reference || 'N/A'}
                    </Text>
                    <Text style={styles.receiptCodeInfo}>
                      Le bénéficiaire peut retirer dans n'importe quelle agence NT Albey avec ce code.
                    </Text>
                  </View>

                  <Text style={styles.receiptDate}>
                    📅 {transactionDetails.date || new Date().toLocaleString('fr-FR')}
                  </Text>
                </>
              ) : (
                <View style={styles.receiptCard}>
                  <Text style={[styles.receiptValue, { textAlign: 'center' }]}>Chargement…</Text>
                </View>
              )}
            </ScrollView>

            {/* ACTIONS FIXES EN BAS */}
            <View style={styles.receiptActionsContainer}>
              <View style={styles.receiptButtons}>
                <TouchableOpacity
                  style={[styles.receiptButton, styles.receiptCopyButton]}
                  onPress={() => handleShareText(transactionDetails)}
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

              <TouchableOpacity
                style={styles.receiptDoneButton}
                onPress={finishTransfer}
                activeOpacity={0.85}
              >
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
// 🎨 STYLES PREMIUM
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 40, paddingTop: 16 },

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

  // ═══════════════ STEP HEADERS ═══════════════
  // Étape 1 : premier bloc collé au header
  stepHeaderFirst: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 10,
    gap: 10,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 10,
    gap: 10,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  stepTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.2 },

  // ═══════════════ CARD ═══════════════
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 18,
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

  // ═══════════════ INPUTS ═══════════════
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  inputIconLeft: {
    paddingLeft: 12,
    paddingRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputField: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 4,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  // ═══════════════ RÉGION PICKER ═══════════════
  regionPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 12,
  },
  regionPickerFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  regionPickerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regionPickerContent: { flex: 1 },
  regionPickerText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  regionPickerTextFilled: { color: COLORS.textPrimary, fontWeight: '800' },
  regionPickerHint: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },

  // ═══════════════ MONTANT ═══════════════
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 10,
    marginBottom: 20,
  },
  amountInput: {
    flex: 1,
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.textPrimary,
    padding: 0,
    letterSpacing: -1.5,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 6,
    marginLeft: 8,
    letterSpacing: 0.5,
  },

  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: {
    flexGrow: 1,
    minWidth: 76,
    backgroundColor: COLORS.surfaceAlt,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  suggestionChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  suggestionText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', letterSpacing: -0.1 },
  suggestionTextActive: { color: '#FFFFFF' },

  // ═══════════════ FRAIS ═══════════════
  feesSection: { marginTop: 20, paddingTop: 18, borderTopWidth: 1, borderTopColor: COLORS.borderSoft },
  feesToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  feesToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  feesToggleIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: COLORS.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feesToggleIconActive: { backgroundColor: COLORS.successSoft },
  feesToggleTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.1 },
  feesToggleSubtitle: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },

  feesDetails: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  feesDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  feesDetailLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  feesDetailValue: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  feesDetailFees: { fontSize: 13, fontWeight: '800', color: COLORS.danger },
  feesDetailDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  feesDetailLabelTotal: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  feesDetailValueTotal: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  feesDetailLabelReceived: { fontSize: 13, fontWeight: '800', color: COLORS.accent },
  feesDetailValueReceived: { fontSize: 15, fontWeight: '800', color: COLORS.accent },

  // ═══════════════ BOUTON ENVOYER ═══════════════
  sendButton: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    paddingHorizontal: 22,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.border,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  sendButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sendButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    flex: 1,
  },
  sendButtonTextDisabled: { color: COLORS.textMuted },
  sendIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ═══════════════ MODAL OVERLAY ═══════════════
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },

  // ═══════════════ MODAL RÉGION ═══════════════
  regionModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    marginVertical: 40,
  },
  regionModalHeader: { marginBottom: 16 },
  regionModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  regionModalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, fontWeight: '500', paddingVertical: 0 },
  clearSearchText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '700',
    paddingHorizontal: 4,
  },

  regionLoading: { alignItems: 'center', paddingVertical: 40 },
  regionLoadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  regionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 4,
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  regionItemSelected: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary + '40',
  },
  regionItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regionItemIconSelected: { backgroundColor: COLORS.primary },
  regionItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.1,
  },
  regionItemTextSelected: { color: COLORS.primary, fontWeight: '800' },
  regionItemCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  regionEmpty: { alignItems: 'center', paddingVertical: 40 },
  regionEmptyEmoji: { fontSize: 48, marginBottom: 8 },
  regionEmptyText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },

  regionCloseButton: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  regionCloseButtonText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '700' },

  // ═══════════════ MODAL CONFIRMATION ═══════════════
  confirmModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    maxHeight: '92%',
  },
  confirmIconWrapper: { alignItems: 'center', marginBottom: 16 },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 6,
    textAlign: 'center',
  },
  confirmAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  confirmRecipient: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },

  confirmInfoBox: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    padding: 14,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  confirmInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  confirmInfoLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  confirmInfoValue: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  confirmInfoDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  confirmInfoLabelTotal: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  confirmInfoValueTotal: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  confirmInfoLabelReceived: { fontSize: 13, fontWeight: '800', color: COLORS.accent },
  confirmInfoValueReceived: { fontSize: 14, fontWeight: '800', color: COLORS.accent },

  confirmCodeBox: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 14,
    padding: 14,
    width: '100%',
    marginBottom: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
  },
  confirmCodeLabel: {
    fontSize: 10,
    color: '#7A4A1A',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '800',
    marginBottom: 6,
  },
  confirmCode: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  confirmHintText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
    width: '100%',
  },

  pinInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primary + '40',
    paddingHorizontal: 12,
    marginBottom: 6,
    width: '100%',
  },
  pinInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 4,
    color: COLORS.textPrimary,
    textAlign: 'center',
    paddingVertical: 14,
  },
  pinEyeButton: {
    padding: 8,
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinToggleLabelWrapper: {
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  pinToggleLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },

  biometricButton: {
    backgroundColor: COLORS.primarySoft,
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 8,
    borderWidth: 2,
    borderColor: COLORS.primary + '25',
  },
  biometricIcon: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
    tintColor: COLORS.primary,
  },
  switchMethodButton: { marginVertical: 10, paddingVertical: 6, alignItems: 'center' },
  switchMethodText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  confirmButtonStandalone: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 52,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  confirmButtonTextStandalone: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  cancelButtonStandalone: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    width: '100%',
  },
  cancelButtonTextStandalone: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },

  // ═══════════════ REÇU (harmonisé) ═══════════════
  receiptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 40,
    paddingBottom: 30,
  },

  receiptModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 0,
    overflow: 'hidden',
    flexDirection: 'column',
  },

  receiptHeader: {
    alignItems: 'center',
    marginBottom: 10,
    flexShrink: 0,
  },
  receiptIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  receiptIconText: { fontSize: 24 },
  receiptTitle: { fontSize: 17, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.3 },
  receiptSubtitle: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },

  receiptScroll: {
    flexShrink: 1,
    marginTop: 2,
  },
  receiptScrollContent: {
    paddingBottom: 8,
  },

  receiptActionsContainer: {
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSoft,
    flexShrink: 0,
  },

  receiptCard: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  receiptSectionLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  receiptRowTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 4,
    paddingTop: 8,
  },
  receiptLabel: { fontSize: 12, color: COLORS.textSecondary, flexShrink: 0, fontWeight: '500' },
  receiptLabelTotal: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  receiptLabelReceived: { fontSize: 12, fontWeight: '800', color: COLORS.accent },
  receiptValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },
  receiptValueSent: { color: COLORS.accent, fontWeight: '800' },
  receiptValueFees: { color: COLORS.danger, fontWeight: '700' },
  receiptValueTotal: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  receiptValueReceived: { fontSize: 13, fontWeight: '800', color: COLORS.accent },

  receiptParticipantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    marginBottom: 4,
  },
  receiptParticipantBadgeTo: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  receiptParticipantBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  receiptParticipantInfo: { flex: 1 },
  receiptParticipantName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.1,
    marginBottom: 1,
  },
  receiptParticipantPhone: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.2,
  },

  receiptCodeCard: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent + '25',
  },
  receiptCodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  receiptCodeLabel: {
    fontSize: 9,
    color: '#7A4A1A',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontWeight: '800',
  },
  receiptCode: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 1.8,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    textAlign: 'center',
  },
  receiptCodeInfo: {
    fontSize: 10.5,
    color: '#7A4A1A',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
    lineHeight: 15,
    opacity: 0.85,
  },

  receiptDate: {
    textAlign: 'center',
    fontSize: 10.5,
    color: COLORS.textMuted,
    marginBottom: 2,
    fontWeight: '600',
  },

  receiptButtons: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  receiptButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  receiptCopyButton: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1.5,
    borderColor: COLORS.primary + '30',
  },
  receiptCopyButtonText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  receiptShareButton: {
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1.5,
    borderColor: COLORS.accent + '30',
  },
  receiptShareButtonText: { fontSize: 13, fontWeight: '800', color: COLORS.accent },

  receiptDoneButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  receiptDoneButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});