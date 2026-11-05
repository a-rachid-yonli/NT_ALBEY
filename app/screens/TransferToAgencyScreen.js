// screens/TransferToAgencyScreen.js - v14 : PREMIUM UI HARMONISÉE
// ✨ v14 :
//    ├── ✅ LEVÉE DE LA RESTRICTION 83/93 SUR LE NUMÉRO BÉNÉFICIAIRE
//    │      → Accepte désormais TOUT numéro à 8 chiffres
//    │      (les recharges NT restent protégées côté api.js)
//    ├── Zone montant cliquable (focus vert, caret animé, placeholder "Combien ?")
//    ├── CTA fixe avec texte d'aide quand désactivé
//    ├── Harmonisation des inputs bénéficiaire/région
//    └── Toasts premium (déjà présent)
// ⚠️ LOGIQUE MÉTIER INCHANGÉE (API, frais, notifications, PDF)
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Modal,
  useWindowDimensions,
  Switch,
  Share,
  Image,
  ActivityIndicator,
  Platform,
  FlatList,
  Animated,
  Easing,
  Keyboard,
  PanResponder,
  Vibration,
} from 'react-native';
import { TranslatedText as Text, TranslatedTextInput as TextInput, TranslatedAlert as Alert, ThemedView as View, ThemedTouchableOpacity as TouchableOpacity, ThemedScrollView as ScrollView, ThemedKeyboardAvoidingView as KeyboardAvoidingView } from '../context/LanguageContext';
import { humanizeError } from '../utils/errorHandler';
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
import { pickPhoneContact } from '../utils/contactPicker';
import RecentNumbersBar, { saveRecentNumber } from '../components/RecentNumbersBar';
import VoiceAssistantButton from '../components/VoiceAssistantButton';
import { verifyTransactionAuth, AUTH_METHOD, AUTH_CANCELLED } from '../utils/transactionAuth';
import { isValidPin } from '../utils/validators';

const NOTIFIED_TX_IDS_KEY = '@ntalbey_notified_tx_ids';

// ═══════════════════════════════════════════════════════════════
// 🎨 PALETTE PREMIUM — HARMONISÉE
// ═══════════════════════════════════════════════════════════════
const COLORS = {
  primary:      '#008933',
  primarySoft:  '#E8F5E9',
  primaryDark:  '#006B28',
  accent:       '#FF6600',
  accentSoft:   '#FFF3E0',
  textPrimary:  '#0B1220',
  textSecondary:'#5A6474',
  textMuted:    '#A0A8B4',
  border:       '#E7EAF0',
  borderSoft:   '#F3F5F9',
  surface:      '#FFFFFF',
  surfaceAlt:   '#FAFBFD',
  background:   '#FFFFFF',
  danger:       '#EF4444',
  dangerSoft:   '#FEE2E2',
  success:      '#10B981',
  successSoft:  '#D1FAE5',
  warning:      '#F59E0B',
  warningSoft:  '#FEF3C7',
  shadow:       '#0B1220',
  gold:         '#F59E0B',
};

// ═══════════════════════════════════════════════════════════════
// 🎯 ICÔNES SVG
// ═══════════════════════════════════════════════════════════════
const IconBack = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={COLORS.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

const IconSearch = ({ color = COLORS.textMuted }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
    <Path d="M20 20l-3.5-3.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconCopy = ({ color = COLORS.primary }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <Rect x="9" y="9" width="13" height="13" rx="2" stroke={color} strokeWidth="1.6" />
    <Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </Svg>
);

const IconPDF = () => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={COLORS.danger} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2v6h6" stroke={COLORS.danger} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8 14h8M8 18h6" stroke={COLORS.danger} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconArrowRight = ({ color = COLORS.primary, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12h14M12 5l7 7-7 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconLocation = ({ color = COLORS.primary }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-7.5 8-13a8 8 0 10-16 0c0 5.5 8 13 8 13z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="9" r="3" stroke={color} strokeWidth="2" />
  </Svg>
);

const IconPhoneSmall = ({ color = COLORS.primary }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.574 2.81.7A2 2 0 0122 16.92z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconUserSmall = ({ color = COLORS.primary }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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
  <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <Path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2z" fill="#FFD700" />
  </Svg>
);

const IconEyeOpen = ({ color = COLORS.primary }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth="1.9" />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.9" />
  </Svg>
);

const IconEyeClosed = ({ color = COLORS.textMuted }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth="1.9" />
    <Path d="M3 3l18 18" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.9" />
  </Svg>
);

const IconFingerprint = ({ color = '#FFFFFF', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 11v3a4 4 0 01-4 4M12 8a4 4 0 014 4v3a6 6 0 01-1 3.3M8 12a4 4 0 014-4 4 4 0 014 4v2M6.5 15.5A6 6 0 0112 6a6 6 0 015.5 3.5M4 13a8 8 0 0116 0v3"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const IconWarning = ({ color = '#FFFFFF', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconClose = ({ color = COLORS.textSecondary, size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconRefresh = ({ color = COLORS.primary }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M21 12a9 9 0 11-3-6.7M21 3v6h-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const hapticTap = (intensity = 'light') => {
  if (Platform.OS === 'web') return;
  try {
    if (intensity === 'heavy') Vibration.vibrate(20);
    else if (intensity === 'medium') Vibration.vibrate(12);
    else Vibration.vibrate(6);
  } catch (_) {}
};

// ═══════════════════════════════════════════════════════════════
// 🏦 ÉCRAN TRANSFERT AU GUICHET
// ═══════════════════════════════════════════════════════════════
export default function TransferToAgencyScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width = 400, height = 800 } = useWindowDimensions();

  // ─── Montant ───────────────────────────────────────────
  const [amount, setAmount] = useState('');
  const [amountFocused, setAmountFocused] = useState(false);
  const amountInputRef = useRef(null);

  // ─── Bénéficiaire ──────────────────────────────────────
  const [phoneNumber, setPhoneNumber] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');

  // ─── Région ────────────────────────────────────────────
  const [selectedDepartement, setSelectedDepartement] = useState(null);
  const [departements, setDepartements] = useState([]);
  const [isLoadingDepartements, setIsLoadingDepartements] = useState(true);
  const [departementsError, setDepartementsError] = useState(null);
  const [regionModalVisible, setRegionModalVisible] = useState(false);
  const [regionSearch, setRegionSearch] = useState('');

  // ─── Frais ─────────────────────────────────────────────
  const [feesIncluded, setFeesIncluded] = useState(true);

  // ─── Modal de confirmation ─────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [pinRequired, setPinRequired] = useState(false);
  const pinInputRef = useRef(null);

  // ─── Auth / Envoi ──────────────────────────────────────
  const [isSending, setIsSending] = useState(false);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [useBiometric, setUseBiometric] = useState(false);

  // ─── Reçu ──────────────────────────────────────────────
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // ─── User ──────────────────────────────────────────────
  const [currentUserPhone, setCurrentUserPhone] = useState(null);
  const [senderFirstName, setSenderFirstName]   = useState('');
  const [senderLastName, setSenderLastName]     = useState('');

  // ─── Toast ─────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const toastAnim = useRef(new Animated.Value(-150)).current;

  // ─── PanResponder sheet confirmation ───────────────────
  const sheetTranslateY = useRef(new Animated.Value(0)).current;

  // ─── Animations montant ────────────────────────────────
  const amountOpacity = useRef(new Animated.Value(1)).current;
  const caretOpacity = useRef(new Animated.Value(1)).current;

  const { balance, refreshWallet } = useTransactions();

  // ═════════════════════════════════════════════════════════
  // 🎯 TOAST PREMIUM
  // ═════════════════════════════════════════════════════════
  const showToast = (type, title, message) => {
    setToast({ type, title, message: type === 'error' ? humanizeError(message) : message });
    Animated.spring(toastAnim, {
      toValue: 1,
      tension: 65,
      friction: 9,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: -150,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setToast(null));
    }, 4000);
  };

  // ─── Montant numérique ─────────────────────────────────
  const numericAmount = useMemo(() => {
    const n = parseInt(String(amount || '0').replace(/\D/g, ''), 10);
    return isNaN(n) ? 0 : n;
  }, [amount]);

  const displayAmount = useMemo(() => {
    return numericAmount > 0 ? numericAmount.toLocaleString('fr-FR') : '0';
  }, [numericAmount]);

  const amountError = useMemo(() => {
    if (numericAmount === 0) return null;
    if (numericAmount < 100) return 'Minimum 100 FCFA';
    if (numericAmount > balance) return 'Solde insuffisant';
    return null;
  }, [numericAmount, balance]);

  // ─── Nettoyage téléphone ───────────────────────────────
  const cleanPhone = useMemo(() => {
    return String(phoneNumber || '').replace(/[\s\-()\.]/g, '').replace(/^\+?227/, '');
  }, [phoneNumber]);

  // ✅ v14 : LEVÉE DE LA RESTRICTION 83/93
  // Accepte désormais TOUT numéro à 8 chiffres (le backend valide le reste)
  const isPhoneValid = useMemo(() => {
    return /^\d{8}$/.test(cleanPhone);
  }, [cleanPhone]);

  // Animations
  useEffect(() => {
    Animated.sequence([
      Animated.timing(amountOpacity, { toValue: 0.6, duration: 90, useNativeDriver: true }),
      Animated.timing(amountOpacity, { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start();
  }, [numericAmount]);

  useEffect(() => {
    if (!amountFocused || numericAmount !== 0) {
      caretOpacity.setValue(1);
      return;
    }
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(caretOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(caretOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, [amountFocused, numericAmount]);

  // ═════════════════════════════════════════════════════════
  // Effets
  // ═════════════════════════════════════════════════════════
  useEffect(() => {
    (async () => {
      try {
        const u = await API.getCurrentUser();
        if (u?.phone) {
          setCurrentUserPhone(String(u.phone).replace(/\s/g, '').replace(/^\+?227/, ''));
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

  const loadDepartements = useCallback(async () => {
    setIsLoadingDepartements(true);
    setDepartementsError(null);
    try {
      const data = await API.getDepartements();
      const list = Array.isArray(data) ? data : [];
      if (list.length === 0) {
        setDepartements([]);
        setDepartementsError('Aucune région disponible pour le moment.');
      } else {
        setDepartements(list);
      }
    } catch (error) {
      setDepartements([]);
      setDepartementsError(
        error?.message || 'Impossible de charger les régions. Vérifiez votre connexion.'
      );
    } finally {
      setIsLoadingDepartements(false);
    }
  }, []);

  useEffect(() => { loadDepartements(); }, [loadDepartements]);

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

  // Auto-focus montant
  const autoFocusDone = useRef(false);
  useEffect(() => {
    if (autoFocusDone.current) return;
    if (isLoadingDepartements) return;
    if (amount) { autoFocusDone.current = true; return; }
    const t = setTimeout(() => {
      amountInputRef.current?.focus();
      autoFocusDone.current = true;
    }, 500);
    return () => clearTimeout(t);
  }, [isLoadingDepartements, amount]);

  // ═════════════════════════════════════════════════════════
  // PanResponder
  // ═════════════════════════════════════════════════════════
  const closeConfirmModal = useCallback(() => {
    setModalVisible(false);
    setPin('');
    setPinRequired(false);
    setUseBiometric(isBiometricAvailable);
    sheetTranslateY.setValue(0);
  }, [isBiometricAvailable]);

  const sheetPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) sheetTranslateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 || g.vy > 0.8) {
          Animated.timing(sheetTranslateY, {
            toValue: 800,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            closeConfirmModal();
          });
        } else {
          Animated.spring(sheetTranslateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  // ═════════════════════════════════════════════════════════
  // Auth
  // ═════════════════════════════════════════════════════════
  const authenticateWithBiometrics = async () => {
    if (isSending || isVerifyingAuth) return;
    setIsVerifyingAuth(true);
    try {
      await verifyTransactionAuth(AUTH_METHOD.BIOMETRIC);
      await executeTransfer();
    } catch (error) {
      if (error?.message === AUTH_CANCELLED) return;
      const msg = String(error?.message || '');
      if (
        msg.includes('Session biométrique expirée') ||
        msg.includes('Aucune empreinte') ||
        msg.includes('non enregistrée')
      ) {
        setUseBiometric(false);
        setPinRequired(true);
        setTimeout(() => pinInputRef.current?.focus(), 150);
        return;
      }
      showToast('error', 'Authentification refusée', msg || 'Veuillez réessayer.');
    } finally {
      setIsVerifyingAuth(false);
    }
  };

  const confirmWithPin = async () => {
    if (isSending || isVerifyingAuth) return;
    if (!isValidPin(pin)) {
      showToast('error', 'Mot de passe invalide', 'Le mot de passe doit contenir entre 8 et 20 caractères.');
      return;
    }
    hapticTap('medium');
    setIsVerifyingAuth(true);
    try {
      await verifyTransactionAuth(AUTH_METHOD.PIN, pin);
      setPin('');
      setPinRequired(false);
      await executeTransfer();
    } catch (error) {
      showToast('error', 'Mot de passe incorrect', error?.message || 'Le mot de passe saisi est incorrect.');
      setPin('');
    } finally {
      setIsVerifyingAuth(false);
    }
  };

  // ═════════════════════════════════════════════════════════
  // Exécution du transfert
  // ═════════════════════════════════════════════════════════
  const executeTransfer = async () => {
    if (!transactionDetails) return;

    const departementId = transactionDetails.departementId;
    const receiverPhone = String(transactionDetails.phoneNumber || '')
      .replace(/\s/g, '').replace(/^\+?227/, '');

    if (!departementId) {
      showToast('error', 'Erreur', 'Veuillez sélectionner une région de retrait.');
      return;
    }
    if (!receiverPhone) {
      showToast('error', 'Erreur', 'Numéro du bénéficiaire manquant.');
      return;
    }
    const sFirst = senderFirstName.trim() || 'Client';
    const sLast  = senderLastName.trim() || 'NT Albey';

    closeConfirmModal();
    setIsSending(true);

    try {
      const result = await API.transferToAgency({
        departement_id:    departementId,
        amount:            Number(transactionDetails.amount),
        frais_inclus:      Boolean(feesIncluded),
        receiver_phone:    receiverPhone,
        sender_first_name: sFirst,
        sender_last_name:  sLast,
      });

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

      if (result.id) {
        try {
          await saveTxMetadata(result.id, {
            reference:      result.reference,
            sender_phone:   currentUserPhone,
            sender_name:    `${senderFirstName} ${senderLastName}`.trim(),
            receiver_phone: receiverPhone,
            receiver_name:  transactionDetails.beneficiaryName || `+227 ${receiverPhone}`,
          });
        } catch (_) {}
      }

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
      showToast('error', 'Échec du transfert', error.message || 'Impossible d\'effectuer le transfert.');
    } finally {
      setIsSending(false);
    }
  };

  // ─── Frais ─────────────────────────────────────────────
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

  const feesDisplay = useMemo(() => {
    return calculateTransactionDetails(numericAmount, feesIncluded);
  }, [numericAmount, feesIncluded]);

  const getFeesLabel = () => {
    const v = numericAmount;
    return v <= 15000 ? 'Frais (fixe 100 F)' : 'Frais (1,5%)';
  };

  const safeFormatCurrency = (num) => {
    if (num === undefined || num === null || isNaN(num)) return '0 FCFA';
    return num.toLocaleString() + ' FCFA';
  };

  const getConfirmationTotal = () => safeFormatCurrency(feesDisplay.debitedAmount);
  const getConfirmationReceived = () => safeFormatCurrency(feesDisplay.receivedAmount);

  const generateWithdrawCode = () => {
    const prefix = 'NT';
    const random = String(Math.floor(100000 + Math.random() * 900000));
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${prefix}${random}${day}${month}${year}`;
  };

  // ═══════════════════════════════════════════════════════════
  // handleSend
  // ═══════════════════════════════════════════════════════════
  const handleSend = () => {
    if (!cleanPhone) {
      showToast('error', 'Numéro manquant', 'Veuillez saisir le numéro du bénéficiaire.');
      return;
    }
    if (!/^\d+$/.test(cleanPhone)) {
      showToast('error', 'Numéro invalide', 'Le numéro ne doit contenir que des chiffres.');
      return;
    }
    if (cleanPhone.length !== 8) {
      showToast('error', 'Numéro invalide', 'Le numéro doit contenir exactement 8 chiffres.');
      return;
    }
    // ✅ v14 : Le bloc "if (!isPhoneValid)" a été SUPPRIMÉ
    // (la validation 83/93 n'existe plus — isPhoneValid accepte tout numéro à 8 chiffres)
    if (!beneficiaryName.trim()) {
      showToast('error', 'Nom manquant', 'Veuillez saisir le nom complet du bénéficiaire.');
      return;
    }
    if (!selectedDepartement) {
      showToast('error', 'Région manquante', 'Veuillez sélectionner une région de retrait.');
      return;
    }
    if (numericAmount < 100) {
      showToast('error', 'Montant insuffisant', 'Le montant minimum est de 100 FCFA.');
      return;
    }

    const details = calculateTransactionDetails(numericAmount, feesIncluded);
    if (details.debitedAmount > balance) {
      showToast(
        'error',
        'Solde insuffisant',
        `Total à débiter : ${safeFormatCurrency(details.debitedAmount)} • Solde : ${safeFormatCurrency(balance)}.`
      );
      return;
    }

    hapticTap('medium');
    Keyboard.dismiss();

    const code = generateWithdrawCode();
    setGeneratedCode(code);
    saveRecentNumber(cleanPhone, beneficiaryName);
    setTransactionDetails({
      beneficiaryName,
      phoneNumber:    cleanPhone,
      region:         selectedDepartement.designation,
      departementId:  selectedDepartement.id,
      amount:         numericAmount,
      fees:           details.fees,
      debitedAmount:  details.debitedAmount,
      receivedAmount: details.receivedAmount,
      feesIncluded,
      reference:      code,
      date:           new Date().toLocaleString('fr-FR'),
    });

    setUseBiometric(isBiometricAvailable);
    setPin('');
    setPinRequired(!isBiometricAvailable);

    setModalVisible(true);
  };

  const handleModalConfirm = async () => {
    hapticTap('medium');
    Keyboard.dismiss();

    if (isBiometricAvailable && useBiometric && !pinRequired) {
      setIsVerifyingAuth(true);
      try {
        await verifyTransactionAuth(AUTH_METHOD.BIOMETRIC);
        await executeTransfer();
      } catch (error) {
        if (error?.message === AUTH_CANCELLED) return;
        const msg = String(error?.message || '');
        if (msg.includes('Session biométrique expirée') || msg.includes('Aucune empreinte') || msg.includes('non enregistrée')) {
          setUseBiometric(false);
          setPinRequired(true);
          setTimeout(() => pinInputRef.current?.focus(), 150);
        } else {
          showToast('error', 'Authentification refusée', msg || 'Veuillez réessayer.');
        }
      } finally {
        setIsVerifyingAuth(false);
      }
      return;
    }

    setPinRequired(true);
    setTimeout(() => pinInputRef.current?.focus(), 150);
  };

  // PDF / Share (logique inchangée)
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
    if (!details) { showToast('error', 'Erreur', 'Aucune donnée à exporter.'); return; }
    try {
      setIsExporting(true);
      const logoBase64 = await getLogoBase64();
      const html = generatePDFHTML(details, logoBase64);
      const { base64 } = await Print.printToFileAsync({ html, base64: true });
      if (!base64) throw new Error('PDF vide');

      const filename = `recu_transfert_guichet_${Date.now()}.pdf`;
      const destUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(destUri, base64, { encoding: FileSystem.EncodingType.Base64 });

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(destUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Reçu de transfert - ${details.reference || 'NT Albey'}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        showToast('success', 'Reçu généré', 'Votre reçu est prêt.');
      }
    } catch (error) {
      showToast('error', 'Erreur', 'Impossible de générer le PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareText = (details) => {
    if (!details) { showToast('error', 'Erreur', 'Aucune donnée à partager.'); return; }
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

  const finishTransfer = () => {
    hapticTap('medium');
    Alert.alert('C\'est fait !', 'Votre transfert au guichet a été effectué avec succès.');
    setReceiptModalVisible(false);
    setPhoneNumber('');
    setBeneficiaryName('');
    setSelectedDepartement(null);
    setAmount('');
    setGeneratedCode('');
    setTransactionDetails(null);
    setPinRequired(false);
    navigation.goBack();
  };

  const filteredDepartements = departements.filter((d) =>
    String(d.designation || '').toLowerCase().includes(regionSearch.toLowerCase().trim())
  );

  const receiptModalWidth = width ? width - 24 : 340;
  const receiptMaxHeight = height ? Math.min(height * 0.94, height - 40) : 700;

  const canSend =
    !!selectedDepartement &&
    !!beneficiaryName.trim() &&
    isPhoneValid &&
    numericAmount >= 100 &&
    numericAmount <= balance &&
    !isSending &&
    !isVerifyingAuth;

  const ctaLabel = (() => {
    if (!selectedDepartement) return 'Choisir une région';
    if (!beneficiaryName.trim() || !isPhoneValid) return 'Saisir le bénéficiaire';
    if (numericAmount < 100) return 'Saisir un montant (min. 100 FCFA)';
    if (numericAmount > balance) return 'Solde insuffisant';
    return `Envoyer ${numericAmount.toLocaleString('fr-FR')} FCFA`;
  })();

  const ctaHint = (() => {
    if (canSend) return '';
    if (!selectedDepartement) return 'Sélectionnez une région de retrait';
    if (!isPhoneValid) return 'Numéro du bénéficiaire invalide (8 chiffres)';
    if (!beneficiaryName.trim()) return 'Nom du bénéficiaire requis';
    if (numericAmount === 0) return 'Saisissez un montant pour continuer';
    if (numericAmount < 100) return 'Le montant minimum est de 100 FCFA';
    if (numericAmount > balance) return 'Solde insuffisant pour ce montant';
    return '';
  })();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* TOAST */}
      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              backgroundColor: toast.type === 'error' ? COLORS.danger : COLORS.primary,
              transform: [{
                translateY: toastAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-150, 0],
                })
              }],
              opacity: toastAnim,
            }
          ]}
        >
          <View style={styles.toastIconWrap}>
            <IconWarning color="#FFFFFF" size={20} />
          </View>
          <View style={styles.toastContent}>
            <Text style={styles.toastTitle}>{toast.title}</Text>
            <Text style={styles.toastMessage}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <IconBack />
        </TouchableOpacity>
      </View>

      {/* CONTENU */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Montant</Text>

        {/* ZONE MONTANT PREMIUM */}
        <TouchableOpacity
          style={[
            styles.amountWrapper,
            amountFocused && styles.amountWrapperFocused,
            amountError && styles.amountWrapperError,
          ]}
          activeOpacity={0.9}
          onPress={() => amountInputRef.current?.focus()}
        >
          {numericAmount === 0 && !amountFocused && (
            <View style={styles.keyboardHintRow}>
              <Text style={styles.keyboardHintIcon}>⌨️</Text>
              <Text style={styles.keyboardHintLabel}>Touchez pour saisir</Text>
            </View>
          )}

          {numericAmount === 0 ? (
            <Text style={styles.amountEmptyState}>Combien ?</Text>
          ) : (
            <Animated.Text
              style={[
                styles.amountText,
                amountError && styles.amountTextError,
                { opacity: amountOpacity },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {displayAmount}
            </Animated.Text>
          )}

          <Text style={styles.amountCurrency}>FCFA</Text>

          {amountFocused && numericAmount === 0 && (
            <Animated.View style={[styles.customCaret, { opacity: caretOpacity }]} />
          )}

          <TextInput
            ref={amountInputRef}
            style={styles.amountHiddenInput}
            value={amount}
            onChangeText={(v) => {
              const digits = v.replace(/[^\d]/g, '');
              setAmount(digits);
            }}
            onFocus={() => setAmountFocused(true)}
            onBlur={() => setAmountFocused(false)}
            keyboardType="numeric"
            maxLength={9}
            caretHidden={true}
            editable={!isSending}
            showSoftInputOnFocus={true}
            selectionColor={COLORS.primary}
          />
        </TouchableOpacity>

        {amountError && (
          <View style={styles.amountErrorRow}>
            <Text style={styles.amountErrorText}>⚠️ {amountError}</Text>
          </View>
        )}

        {!amountError && (
          <Text style={styles.balanceHint}>
            Solde disponible · {balance.toLocaleString('fr-FR')} FCFA
          </Text>
        )}

        <View style={styles.suggestionsRow}>
          {['5000', '10000', '25000', '50000'].map((sug, index) => (
            <TouchableOpacity
              key={`sug-${sug}-${index}`}
              style={[styles.suggestionChip, amount === sug && styles.suggestionChipActive]}
              onPress={() => {
                hapticTap('light');
                setAmount(sug);
              }}
              disabled={isSending}
              activeOpacity={0.75}
            >
              <Text style={[styles.suggestionText, amount === sug && styles.suggestionTextActive]}>
                {parseInt(sug).toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* BÉNÉFICIAIRE */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 36, marginBottom: 8 }}>
          <Text style={[styles.label, { marginBottom: 0 }]}>Bénéficiaire</Text>
          <TouchableOpacity
            onPress={async () => {
              const picked = await pickPhoneContact({ showToast });
              if (picked?.phone) setPhoneNumber(picked.phone);
              if (picked?.name) setBeneficiaryName(picked.name);
            }}
            style={{ backgroundColor: COLORS.primarySoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}
            activeOpacity={0.75}
          >
            <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>📒 Répertoire</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputWrapper}>
          <View style={styles.inputIconLeft}>
            <IconPhoneSmall />
          </View>
          <TextInput
            style={styles.inputField}
            placeholder="Ex : 90 12 34 56"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            editable={!isSending}
            maxLength={15}
          />
        </View>
        <RecentNumbersBar
          onSelectNumber={(num, name) => {
            setPhoneNumber(num);
            if (name && !beneficiaryName) setBeneficiaryName(name);
          }}
          currentValue={phoneNumber}
        />

        <View style={styles.inputWrapper}>
          <View style={styles.inputIconLeft}>
            <IconUserSmall />
          </View>
          <TextInput
            style={styles.inputField}
            placeholder="Nom complet du bénéficiaire"
            placeholderTextColor={COLORS.textMuted}
            value={beneficiaryName}
            onChangeText={setBeneficiaryName}
            editable={!isSending}
          />
        </View>

        {/* RÉGION */}
        <Text style={[styles.label, { marginTop: 20 }]}>Région de retrait</Text>

        <TouchableOpacity
          style={[
            styles.beneficiaryButton,
            selectedDepartement && styles.beneficiaryButtonFilled,
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
          activeOpacity={0.7}
          disabled={isSending}
        >
          {selectedDepartement ? (
            <>
              <View style={[styles.beneficiaryAvatar, { backgroundColor: COLORS.primary }]}>
                <IconLocation color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.beneficiaryName} numberOfLines={1}>
                  {selectedDepartement.designation}
                </Text>
                <Text style={styles.beneficiaryPhone}>
                  Guichet NT Albey
                </Text>
              </View>
              <IconArrowRight color={COLORS.primary} size={16} />
            </>
          ) : (
            <>
              <View style={styles.beneficiaryEmptyIcon}>
                <IconLocation color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.beneficiaryEmptyText}>
                  {isLoadingDepartements
                    ? 'Chargement des régions…'
                    : departementsError
                      ? 'Régions indisponibles'
                      : 'Choisir une région'}
                </Text>
                {departementsError && !isLoadingDepartements && (
                  <Text style={{ fontSize: 11, color: COLORS.danger, marginTop: 2, fontWeight: '500' }}>
                    Tapez pour réessayer
                  </Text>
                )}
              </View>
              {isLoadingDepartements ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : departementsError ? (
                <IconRefresh color={COLORS.primary} />
              ) : (
                <IconArrowRight color={COLORS.primary} size={16} />
              )}
            </>
          )}
        </TouchableOpacity>

        {(numericAmount >= 100 || canSend) && (
          <VoiceAssistantButton
            type="transfer_agency"
            amount={numericAmount}
            recipientName={beneficiaryName || ''}
            recipientPhone={phoneNumber || ''}
            containerStyle={{ marginTop: 18, marginBottom: 12 }}
          />
        )}
      </ScrollView>

      {/* CTA FIXE */}
      {!pinRequired && (
        <View style={[styles.ctaContainer, { paddingBottom: Math.max(insets.bottom, 14) + 12 }]}>
          <TouchableOpacity
            style={[styles.cta, !canSend && styles.ctaDisabled]}
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.85}
          >
            {isSending || isVerifyingAuth ? (
              <View style={styles.ctaContent}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.ctaText}>
                  {isSending ? 'Transfert en cours…' : 'Vérification…'}
                </Text>
              </View>
            ) : (
              <View style={styles.ctaContent}>
                {isBiometricAvailable && useBiometric && canSend && (
                  <IconFingerprint color="#FFFFFF" size={20} />
                )}
                <Text style={[styles.ctaText, !canSend && styles.ctaTextDisabled]}>
                  {ctaLabel}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {ctaHint ? (
            <Text style={styles.ctaHintText}>{ctaHint}</Text>
          ) : null}
        </View>
      )}

      {/* MODAL RÉGION */}
      <Modal
        visible={regionModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => { setRegionModalVisible(false); setRegionSearch(''); }}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            onPress={() => { setRegionModalVisible(false); setRegionSearch(''); }}
            activeOpacity={1}
          />
          <View style={[styles.sheetContent, { maxHeight: height * 0.85 }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Choisir une région</Text>
                <Text style={styles.sheetSubtitle}>
                  {filteredDepartements.length} région{filteredDepartements.length > 1 ? 's' : ''} disponible{filteredDepartements.length > 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => { setRegionModalVisible(false); setRegionSearch(''); }}
                style={styles.sheetCloseBtn}
                activeOpacity={0.7}
              >
                <IconClose />
              </TouchableOpacity>
            </View>

            <View style={styles.searchInputRow}>
              <View style={styles.searchIconWrap}>
                <IconSearch />
              </View>
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
              <View style={styles.sheetLoading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ marginTop: 12, color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' }}>
                  Chargement des régions…
                </Text>
              </View>
            ) : departementsError ? (
              <View style={styles.sheetEmpty}>
                <Text style={styles.sheetEmptyEmoji}>⚠️</Text>
                <Text style={styles.sheetEmptyTitle}>{departementsError}</Text>
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
              <View style={styles.sheetEmpty}>
                <Text style={styles.sheetEmptyEmoji}>📍</Text>
                <Text style={styles.sheetEmptyTitle}>Aucune région trouvée</Text>
              </View>
            ) : (
              <FlatList
                data={filteredDepartements}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const isSelected = selectedDepartement?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={styles.contactRow}
                      onPress={() => {
                        hapticTap('light');
                        setSelectedDepartement(item);
                        setRegionModalVisible(false);
                        setRegionSearch('');
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.contactRowAvatar,
                        { backgroundColor: isSelected ? COLORS.primary : COLORS.primarySoft },
                      ]}>
                        <IconLocation color={isSelected ? '#FFFFFF' : COLORS.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[
                          styles.contactRowName,
                          isSelected && { color: COLORS.primary, fontWeight: '800' },
                        ]} numberOfLines={1}>
                          {item.designation}
                        </Text>
                        <Text style={styles.contactRowPhone}>
                          Guichet NT Albey
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={styles.contactRowCheck}>
                          <IconCheckSmall />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL CONFIRMATION */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (isSending || isVerifyingAuth) return;
          closeConfirmModal();
        }}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            onPress={() => {
              if (isSending || isVerifyingAuth) return;
              closeConfirmModal();
            }}
            activeOpacity={1}
          />
          <Animated.View
            style={[
              styles.confirmSheetContent,
              { maxHeight: height * 0.92, transform: [{ translateY: sheetTranslateY }] },
            ]}
            {...sheetPanResponder.panHandlers}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.confirmHeader}>
              <Text style={styles.confirmTitle}>Confirmer le transfert</Text>
              <TouchableOpacity
                onPress={() => {
                  if (isSending || isVerifyingAuth) return;
                  closeConfirmModal();
                }}
                style={styles.sheetCloseBtn}
                activeOpacity={0.7}
              >
                <IconClose />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <View style={styles.confirmIconWrapper}>
                <IconTransferAgencyBig />
              </View>

              <Text style={styles.confirmAmount}>{numericAmount.toLocaleString('fr-FR')} FCFA</Text>
              <Text style={styles.confirmRecipient}>
                à {beneficiaryName}
              </Text>

              <VoiceAssistantButton
                type="transfer_agency"
                amount={numericAmount}
                recipientName={beneficiaryName || ''}
                recipientPhone={phoneNumber || ''}
              />

              {/* FRAIS */}
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
                    disabled={isSending || isVerifyingAuth}
                  />
                </View>

                <View style={styles.feesDetails}>
                  <View style={styles.feesDetailRow}>
                    <Text style={styles.feesDetailLabel}>Montant</Text>
                    <Text style={styles.feesDetailValue}>{safeFormatCurrency(numericAmount)}</Text>
                  </View>
                  <View style={styles.feesDetailRow}>
                    <Text style={styles.feesDetailLabel}>{getFeesLabel()}</Text>
                    <Text style={styles.feesDetailFees}>{safeFormatCurrency(feesDisplay.fees)}</Text>
                  </View>
                  <View style={styles.feesDetailDivider} />
                  <View style={styles.feesDetailRow}>
                    <Text style={styles.feesDetailLabelTotal}>💳 Total débité</Text>
                    <Text style={styles.feesDetailValueTotal}>{getConfirmationTotal()}</Text>
                  </View>
                  <View style={styles.feesDetailRow}>
                    <Text style={styles.feesDetailLabelReceived}>📥 Bénéficiaire reçoit</Text>
                    <Text style={styles.feesDetailValueReceived}>{getConfirmationReceived()}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.confirmInfoBox}>
                <View style={styles.confirmInfoRow}>
                  <Text style={styles.confirmInfoLabel}>📍 Région</Text>
                  <Text style={styles.confirmInfoValue} numberOfLines={1}>
                    {selectedDepartement?.designation || '—'}
                  </Text>
                </View>
                <View style={styles.confirmInfoRow}>
                  <Text style={styles.confirmInfoLabel}>📞 Bénéficiaire</Text>
                  <Text style={styles.confirmInfoValue}>
                    +227 {cleanPhone}
                  </Text>
                </View>
                <View style={styles.confirmInfoRow}>
                  <Text style={styles.confirmInfoLabel}>Option</Text>
                  <Text style={styles.confirmInfoValue}>
                    {feesIncluded ? 'Frais inclus' : 'Hors frais'}
                  </Text>
                </View>
              </View>

              <View style={styles.confirmCodeBox}>
                <Text style={styles.confirmCodeLabel}>🔑 CODE DE RETRAIT</Text>
                <Text style={styles.confirmCode}>{generatedCode}</Text>
              </View>

              {pinRequired && (
                <View style={styles.pinInline}>
                  <VoiceAssistantButton
                    type="transfer_agency"
                    amount={numericAmount}
                    recipientName={beneficiaryName || ''}
                    recipientPhone={phoneNumber || ''}
                    containerStyle={{ marginBottom: 14, marginTop: 0 }}
                  />
                  <View style={styles.pinInlineHeader}>
                    <Text style={styles.pinInlineLabel}>
                      {isBiometricAvailable && pinRequired
                        ? 'Empreinte indisponible — entrez votre mot de passe'
                        : 'Confirmez avec votre mot de passe'}
                    </Text>
                    <Text style={styles.pinInlineCounter}>{pin.length}/20</Text>
                  </View>
                  <View style={styles.pinInlineRow}>
                    <TextInput
                      ref={pinInputRef}
                      style={styles.pinInlineInput}
                      placeholder="••••••••"
                      placeholderTextColor={COLORS.textMuted}
                      secureTextEntry={!pinVisible}
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={20}
                      value={pin}
                      onChangeText={setPin}
                      editable={!isSending && !isVerifyingAuth}
                      textAlign="center"
                    />
                    <TouchableOpacity
                      style={styles.pinInlineEye}
                      onPress={() => setPinVisible(v => !v)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      {pinVisible ? <IconEyeOpen /> : <IconEyeClosed />}
                    </TouchableOpacity>
                  </View>
                  <View style={styles.pinInlineActions}>
                    <TouchableOpacity
                      style={styles.pinInlineCancel}
                      onPress={() => {
                        setPinRequired(false);
                        setPin('');
                        Keyboard.dismiss();
                      }}
                      disabled={isSending || isVerifyingAuth}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.pinInlineCancelText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.pinInlineConfirm,
                        (!pin || pin.length < 8 || isSending || isVerifyingAuth) && styles.pinInlineConfirmDisabled,
                      ]}
                      onPress={confirmWithPin}
                      disabled={!pin || pin.length < 8 || isSending || isVerifyingAuth}
                      activeOpacity={0.85}
                    >
                      {isSending || isVerifyingAuth ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.pinInlineConfirmText}>Confirmer</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {!pinRequired && (
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    (isSending || isVerifyingAuth) && styles.confirmButtonDisabled,
                  ]}
                  onPress={handleModalConfirm}
                  disabled={isSending || isVerifyingAuth}
                  activeOpacity={0.85}
                >
                  {isSending || isVerifyingAuth ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <View style={styles.confirmButtonContent}>
                      {isBiometricAvailable && useBiometric && (
                        <IconFingerprint color="#FFFFFF" size={20} />
                      )}
                      <Text style={styles.confirmButtonText}>Confirmer</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* MODAL REÇU */}
      <Modal
        animationType="slide"
        transparent
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
            <View style={styles.receiptHeader}>
              <View style={styles.receiptIcon}>
                <Text style={styles.receiptIconText}>✅</Text>
              </View>
              <Text style={styles.receiptTitle}>Transfert confirmé</Text>
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
    </KeyboardAvoidingView>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🎨 STYLES
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // TOAST
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  toastIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toastContent: { flex: 1 },
  toastTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  toastMessage: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },

  // Contenu
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 120,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // MONTANT
  amountWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginTop: 4,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    backgroundColor: COLORS.surfaceAlt,
    position: 'relative',
    minHeight: 140,
  },
  amountWrapperFocused: {
    borderColor: COLORS.primary,
    borderStyle: 'solid',
    backgroundColor: COLORS.primarySoft,
  },
  amountWrapperError: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerSoft,
  },
  amountText: {
    fontSize: 68,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -3,
    lineHeight: 76,
    textAlign: 'center',
    includeFontPadding: false,
  },
  amountTextError: { color: COLORS.danger },
  amountEmptyState: {
    fontSize: 34,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: -0.5,
    lineHeight: 44,
    textAlign: 'center',
  },
  amountCurrency: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 4,
  },
  amountHiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  amountErrorRow: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  amountErrorText: {
    fontSize: 12.5,
    color: COLORS.danger,
    fontWeight: '700',
  },
  balanceHint: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 14,
  },
  keyboardHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  keyboardHintIcon: { fontSize: 14 },
  keyboardHintLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  customCaret: {
    position: 'absolute',
    width: 3,
    height: 56,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    top: '50%',
    marginTop: -28,
  },

  // Suggestions
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
  },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  suggestionChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  suggestionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  suggestionTextActive: { color: '#FFFFFF' },

  // Inputs
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 12,
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

  // Bénéficiaire / Région
  beneficiaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  beneficiaryButtonFilled: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary + '30',
    borderStyle: 'solid',
  },
  beneficiaryAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  beneficiaryName: {
    fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.2,
  },
  beneficiaryPhone: {
    fontSize: 12, color: COLORS.textSecondary, marginTop: 2, fontWeight: '500',
  },
  beneficiaryEmptyIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  beneficiaryEmptyText: {
    fontSize: 15, fontWeight: '600', color: COLORS.textSecondary,
  },

  // PIN inline
  pinInline: {
    marginTop: 16,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  pinInlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pinInlineLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.2,
    flex: 1,
  },
  pinInlineCounter: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  pinInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary + '40',
    paddingHorizontal: 12,
  },
  pinInlineInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 4,
    color: COLORS.textPrimary,
    textAlign: 'center',
    paddingVertical: 14,
  },
  pinInlineEye: { padding: 6, marginLeft: 4 },
  pinInlineActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  pinInlineCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinInlineCancelText: {
    color: COLORS.textSecondary, fontSize: 14, fontWeight: '700',
  },
  pinInlineConfirm: {
    flex: 1.4,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  pinInlineConfirmDisabled: {
    backgroundColor: COLORS.border,
    ...Platform.select({ ios: { shadowOpacity: 0 }, android: { elevation: 0 } }),
  },
  pinInlineConfirmText: {
    color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.2,
  },

  // CTA
  ctaContainer: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
    backgroundColor: COLORS.background,
  },
  cta: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
      android: { elevation: 6 },
    }),
  },
  ctaDisabled: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...Platform.select({ ios: { shadowOpacity: 0 }, android: { elevation: 0 } }),
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  ctaTextDisabled: { color: COLORS.textMuted },
  ctaHintText: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
    paddingHorizontal: 8,
  },

  // Bottom sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11,18,32,0.5)',
    justifyContent: 'flex-end',
  },
  sheetBackdrop: { flex: 1 },
  sheetContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  sheetTitle: {
    fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.5,
  },
  sheetSubtitle: {
    fontSize: 12, color: COLORS.textSecondary, marginTop: 2, fontWeight: '500',
  },
  sheetCloseBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  sheetLoading: { alignItems: 'center', paddingVertical: 40 },
  sheetEmpty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  sheetEmptyEmoji: { fontSize: 40, marginBottom: 10 },
  sheetEmptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center' },

  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 12,
    overflow: 'hidden',
    height: 48,
  },
  searchIconWrap: {
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 4,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  clearSearchText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '700',
    paddingHorizontal: 12,
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  contactRowAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  contactRowName: {
    fontSize: 14.5, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.1,
    marginBottom: 2,
  },
  contactRowPhone: {
    fontSize: 11.5, color: COLORS.textMuted, fontWeight: '500',
  },
  contactRowCheck: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 16,
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  retryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  // Confirm sheet
  confirmSheetContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.3,
  },
  confirmIconWrapper: { alignItems: 'center', marginBottom: 12 },
  confirmAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -1,
    marginBottom: 6,
    textAlign: 'center',
  },
  confirmRecipient: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 18,
    textAlign: 'center',
  },

  feesSection: { marginBottom: 16 },
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
    width: 34, height: 34, borderRadius: 12,
    backgroundColor: COLORS.dangerSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  feesToggleIconActive: { backgroundColor: COLORS.successSoft },
  feesToggleTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.1 },
  feesToggleSubtitle: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },
  feesDetails: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.primary + '25',
  },
  feesDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  feesDetailLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  feesDetailValue: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  feesDetailFees: { fontSize: 13, fontWeight: '800', color: COLORS.danger },
  feesDetailDivider: { height: 1, backgroundColor: COLORS.primary + '20', marginVertical: 6 },
  feesDetailLabelTotal: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  feesDetailValueTotal: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  feesDetailLabelReceived: { fontSize: 13, fontWeight: '800', color: COLORS.accent },
  feesDetailValueReceived: { fontSize: 15, fontWeight: '800', color: COLORS.accent },

  confirmInfoBox: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    padding: 14,
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

  confirmCodeBox: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
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

  confirmButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginTop: 8,
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
      android: { elevation: 6 },
    }),
  },
  confirmButtonDisabled: {
    backgroundColor: COLORS.border,
    ...Platform.select({ ios: { shadowOpacity: 0 }, android: { elevation: 0 } }),
  },
  confirmButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Reçu
  receiptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11,18,32,0.6)',
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
  receiptHeader: { alignItems: 'center', marginBottom: 10, flexShrink: 0 },
  receiptIcon: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: COLORS.successSoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  receiptIconText: { fontSize: 24 },
  receiptTitle: { fontSize: 17, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.3 },
  receiptSubtitle: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },
  receiptScroll: { flexShrink: 1, marginTop: 2 },
  receiptScrollContent: { paddingBottom: 8 },
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
    fontSize: 10, color: COLORS.textMuted, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8,
  },
  receiptRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5,
  },
  receiptRowTotal: {
    borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 4, paddingTop: 8,
  },
  receiptLabel: { fontSize: 12, color: COLORS.textSecondary, flexShrink: 0, fontWeight: '500' },
  receiptLabelTotal: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  receiptLabelReceived: { fontSize: 12, fontWeight: '800', color: COLORS.accent },
  receiptValue: {
    fontSize: 12, fontWeight: '700', color: COLORS.textPrimary,
    textAlign: 'right', flex: 1, marginLeft: 8,
  },
  receiptValueSent: { color: COLORS.accent, fontWeight: '800' },
  receiptValueFees: { color: COLORS.danger, fontWeight: '700' },
  receiptValueTotal: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  receiptValueReceived: { fontSize: 13, fontWeight: '800', color: COLORS.accent },
  receiptParticipantCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 10,
    borderWidth: 1, borderColor: COLORS.borderSoft,
    marginBottom: 4,
  },
  receiptParticipantBadgeTo: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  receiptParticipantBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: 0.5 },
  receiptParticipantInfo: { flex: 1 },
  receiptParticipantName: {
    fontSize: 12.5, fontWeight: '800', color: COLORS.textPrimary,
    letterSpacing: -0.1, marginBottom: 1,
  },
  receiptParticipantPhone: {
    fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: 0.2,
  },
  receiptCodeCard: {
    backgroundColor: COLORS.accentSoft, borderRadius: 14,
    padding: 12, marginBottom: 8, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.accent + '25',
  },
  receiptCodeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  receiptCodeLabel: {
    fontSize: 9, color: '#7A4A1A', textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: '800',
  },
  receiptCode: {
    fontSize: 15, fontWeight: '800', color: COLORS.accent, letterSpacing: 1.8,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    textAlign: 'center',
  },
  receiptCodeInfo: {
    fontSize: 10.5, color: '#7A4A1A', textAlign: 'center',
    marginTop: 8, fontWeight: '500', lineHeight: 15, opacity: 0.85,
  },
  receiptDate: { textAlign: 'center', fontSize: 10.5, color: COLORS.textMuted, marginBottom: 2, fontWeight: '600' },
  receiptButtons: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  receiptButton: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  receiptCopyButton: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1.5, borderColor: COLORS.primary + '30',
  },
  receiptCopyButtonText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  receiptShareButton: {
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1.5, borderColor: COLORS.accent + '30',
  },
  receiptShareButtonText: { fontSize: 13, fontWeight: '800', color: COLORS.accent },
  receiptDoneButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  receiptDoneButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.3, textAlign: 'center' },
});