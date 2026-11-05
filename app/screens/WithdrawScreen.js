// screens/WithdrawScreen.js — v12 : PREMIUM UI HARMONISÉE (SendMoneyScreen)
// ✨ v12 :
//    ├── Zone montant cliquable (bordure pointillée, focus vert, caret animé)
//    ├── Placeholder "Combien ?" + hint clavier "Touchez pour saisir"
//    ├── CTA fixe avec texte d'aide quand désactivé
//    ├── Toasts premium (plus d'Alert)
//    ├── PIN inline avec bouton œil
//    └── Reçu (PDF, partage, copie) inchangé
// ⚠️ LOGIQUE MÉTIER INCHANGÉE (API, calculs de frais, notifications, PDF)
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Image,
  Modal,
  Share,
  Switch,
  useWindowDimensions,
  FlatList,
  ActivityIndicator,
  Platform,
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
import { getLogoBase64, escapeHtml } from '../utils/pdfUtils';
import { useTransactions } from '../context/TransactionContext';
import { saveTxMetadata } from '../utils/txRefCache';
import VoiceAssistantButton from '../components/VoiceAssistantButton';
import SuccessCheckmarkOverlay from '../components/SuccessCheckmarkOverlay';
import { triggerAmountShake, triggerAmountPop, getAmountErrorMessage } from '../utils/amountEffects';
import { triggerSelectionHaptic } from '../utils/haptics';
import { copySecurely } from '../utils/secureClipboard';
import {
  verifyTransactionAuth,
  AUTH_METHOD,
  AUTH_CANCELLED,
} from '../utils/transactionAuth';
import { isValidPin } from '../utils/validators';

const NOTIFIED_TX_IDS_KEY = '@ntalbey_notified_tx_ids';

// ═══════════════════════════════════════════════════════════════
// 🎨 PALETTE PREMIUM — HARMONISÉE avec SendMoneyScreen
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

const IconLocation = ({ color = COLORS.accent }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-7.5 8-13a8 8 0 10-16 0c0 5.5 8 13 8 13z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="9" r="3" stroke={color} strokeWidth="2" />
  </Svg>
);

const IconArrowRight = ({ color = COLORS.primary, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12h14M12 5l7 7-7 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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

const IconSearch = ({ color = COLORS.textMuted }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
    <Path d="M20 20l-3.5-3.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
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

const IconRefresh = ({ color = COLORS.primary }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M21 12a9 9 0 11-3-6.7M21 3v6h-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconClose = ({ color = COLORS.textSecondary, size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

const hapticTap = (intensity = 'light') => {
  if (Platform.OS === 'web') return;
  try {
    if (intensity === 'heavy') Vibration.vibrate(20);
    else if (intensity === 'medium') Vibration.vibrate(12);
    else Vibration.vibrate(6);
  } catch (_) {}
};

// ═══════════════════════════════════════════════════════════════
// 🏦 ÉCRAN DE RETRAIT
// ═══════════════════════════════════════════════════════════════
export default function WithdrawScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width = 400, height = 800 } = useWindowDimensions();

  // ─── Montant ───────────────────────────────────────────
  const [amount, setAmount] = useState('');
  const [amountFocused, setAmountFocused] = useState(false);
  const amountInputRef = useRef(null);

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
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [pinRequired, setPinRequired] = useState(false);
  const pinInputRef = useRef(null);

  // ─── Auth / Envoi ──────────────────────────────────────
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [useBiometric, setUseBiometric] = useState(false);

  // ─── Reçu ──────────────────────────────────────────────
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [successOverlayVisible, setSuccessOverlayVisible] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // ─── User ──────────────────────────────────────────────
  const [currentUserPhone, setCurrentUserPhone] = useState(null);
  const [currentUserName,  setCurrentUserName]  = useState(null);

  // ─── Toast premium ─────────────────────────────────────
  const [toast, setToast] = useState(null);
  const toastAnim = useRef(new Animated.Value(-150)).current;

  // ─── PanResponder pour le sheet de confirmation ────────
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
    return getAmountErrorMessage(numericAmount, balance, 100);
  }, [numericAmount, balance]);

  // Animation du montant (Shake & Scale Pop)
  const amountScale = useRef(new Animated.Value(1)).current;
  const amountShakeAnim = useRef(new Animated.Value(0)).current;

  // Détection du dépassement de solde pour déclencher le shake
  const prevExceeded = useRef(false);
  useEffect(() => {
    const isExceeded = numericAmount > balance;
    if (isExceeded && !prevExceeded.current) {
      triggerAmountShake(amountShakeAnim);
    }
    prevExceeded.current = isExceeded;
  }, [numericAmount, balance]);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(amountOpacity, { toValue: 0.6, duration: 90, useNativeDriver: true }),
      Animated.timing(amountOpacity, { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start();
  }, [numericAmount]);

  // Caret clignotant
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
  // ✅ Chargement RÉEL des départements
  // ═════════════════════════════════════════════════════════
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

  // Utilisateur connecté
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
      } catch (error) {
        setIsBiometricAvailable(false);
        setUseBiometric(false);
      }
    };
    checkBiometrics();
  }, []);

  // Auto-focus du montant (si pas de région sélectionnée)
  const autoFocusDone = useRef(false);
  useEffect(() => {
    if (autoFocusDone.current) return;
    if (isLoadingDepartements) return;
    if (selectedDepartement) { autoFocusDone.current = true; return; }
    const t = setTimeout(() => {
      amountInputRef.current?.focus();
      autoFocusDone.current = true;
    }, 500);
    return () => clearTimeout(t);
  }, [isLoadingDepartements, selectedDepartement]);

  // ═════════════════════════════════════════════════════
  // 🎯 PanResponder pour fermer le sheet (swipe down)
  // ═════════════════════════════════════════════════════
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
            sheetTranslateY.setValue(0);
          });
        } else {
          Animated.spring(sheetTranslateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  // ═════════════════════════════════════════════════════
  // 🔐 AUTH BIOMÉTRIQUE — fallback auto vers PIN
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

  // ═════════════════════════════════════════════════════
  // 🔐 CONFIRMATION PAR MOT DE PASSE
  // ═════════════════════════════════════════════════════
  const confirmWithPin = async () => {
    if (isWithdrawing || isVerifyingAuth) return;
    if (!isValidPin(pin)) {
      showToast('error', 'Code incorrect', 'Le mot de passe doit contenir entre 8 et 20 caractères avec au moins une lettre et un chiffre.');
      return;
    }
    hapticTap('medium');
    setIsVerifyingAuth(true);
    try {
      await verifyTransactionAuth(AUTH_METHOD.PIN, pin);
      setPin('');
      setPinRequired(false);
      await executeWithdraw();
    } catch (error) {
      showToast('error', 'Code incorrect', error.message || 'Le mot de passe saisi est incorrect.');
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
      showToast('error', 'Erreur', 'Veuillez sélectionner une région de retrait.');
      return;
    }

    const amountValue = Number(amount);
    closeConfirmModal();
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
      setSuccessOverlayVisible(true);

      if (typeof refreshWallet === 'function') {
        await refreshWallet();
      }
    } catch (error) {
      showToast('error', 'Échec du retrait', error.message || "Impossible d'effectuer le retrait.");
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
  // PDF / Share (logique métier inchangée)
  // ═════════════════════════════════════════════════════════
  const generatePDFHTML = (details, logoBase64) => {
    const logoHtml = logoBase64
      ? `<img src="${logoBase64}" alt="NT Albey Logo" class="logo" />`
      : `<div style="background:linear-gradient(135deg,#FF6600,#FF8833);color:white;padding:10px 30px;border-radius:10px;display:inline-block;font-weight:700;font-size:22px;letter-spacing:4px;margin-bottom:6px;">NT ALBEY</div>`;
    const date = escapeHtml(details.date || new Date().toLocaleString('fr-FR'));
    const feesLabel = escapeHtml(details.amount <= 15000 ? '50 FCFA (fixe)' : '0.75% du montant');
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
          <div class="info-row"><span class="info-label">📍 Région de retrait</span><span class="info-value">${escapeHtml(details.region || 'N/A')}</span></div>
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
    if (!details) { showToast('error', 'Erreur', 'Aucune donnée à exporter.'); return; }
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
        showToast('success', 'Reçu généré', 'Votre reçu est prêt.');
      }
    } catch (error) {
      showToast('error', 'Erreur', 'Impossible de générer le PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyReceipt = async (details) => {
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
    await copySecurely(message, { ttlSeconds: 60 });
    showToast('success', 'Reçu copié', 'Le reçu a été copié. Il s\'effacera dans 60s pour votre sécurité.');
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

  // ═════════════════════════════════════════════════════════
  // CONFIRMATION & OUVERTURE DU MODAL
  // ═════════════════════════════════════════════════════════
  const closeConfirmModal = () => {
    setModalVisible(false);
    setPin('');
    setPinRequired(false);
    setUseBiometric(isBiometricAvailable);
    sheetTranslateY.setValue(0);
  };

  const canWithdraw =
    numericAmount >= 100 &&
    numericAmount <= balance &&
    !!selectedDepartement &&
    !isWithdrawing &&
    !isVerifyingAuth;

  const ctaLabel = (() => {
    if (!selectedDepartement) return 'Choisir une région';
    if (numericAmount < 100) return 'Saisir un montant (min. 100 FCFA)';
    if (numericAmount > balance) return 'Solde insuffisant';
    return `Retirer ${numericAmount.toLocaleString('fr-FR')} FCFA`;
  })();

  const ctaHint = (() => {
    if (canWithdraw) return '';
    if (!selectedDepartement) return 'Sélectionnez d\'abord une région de retrait';
    if (numericAmount === 0) return 'Saisissez un montant pour continuer';
    if (numericAmount < 100) return 'Le montant minimum est de 100 FCFA';
    if (numericAmount > balance) return 'Solde insuffisant pour ce montant';
    return '';
  })();

  const handleConfirm = () => {
    if (!canWithdraw) {
      if (numericAmount === 0 || amountError) {
        triggerAmountShake(amountShakeAnim);
        amountInputRef.current?.focus();
      }
      return;
    }
    hapticTap('medium');
    Keyboard.dismiss();

    // Préparer les détails de la transaction
    const details = calculateTransactionDetails(numericAmount, feesIncluded);
    const reference = generateReference();

    setTransactionDetails({
      region: selectedDepartement.designation,
      departementId: selectedDepartement.id,
      amount: numericAmount,
      fees: details.fees,
      debitedAmount: details.debitedAmount,
      receivedAmount: details.receivedAmount,
      feesIncluded,
      reference,
      date: new Date().toLocaleString('fr-FR'),
    });

    // Biométrie prioritaire si activée
    setUseBiometric(isBiometricAvailable);
    setPin('');
    setPinRequired(!isBiometricAvailable);

    setModalVisible(true);
  };

  // ═════════════════════════════════════════════════════════
  // 🔐 AUTH CONFIRM (depuis le modal)
  // ═════════════════════════════════════════════════════════
  const handleModalConfirm = async () => {
    if (!canWithdraw) return;
    hapticTap('medium');
    Keyboard.dismiss();

    if (isBiometricAvailable && useBiometric && !pinRequired) {
      setIsVerifyingAuth(true);
      try {
        await verifyTransactionAuth(AUTH_METHOD.BIOMETRIC);
        await executeWithdraw();
      } catch (error) {
        if (error.message === AUTH_CANCELLED) return;
        const msg = String(error.message || '');
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

  // ══════════════════════════════════════════════════════════════
  // "✓ Terminé"
  // ══════════════════════════════════════════════════════════════
  const finishWithdraw = () => {
    hapticTap('medium');
    Alert.alert('C\'est fait !', `Votre retrait de ${amount} FCFA a été effectué avec succès.`);
    setReceiptModalVisible(false);
    setAmount('');
    setSelectedDepartement(null);
    setTransactionDetails(null);
    setPinRequired(false);

    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  const getConfirmationTotal = () => {
    if (!amount || parseInt(amount) <= 0) return '0 FCFA';
    return safeFormatCurrency(calculateTransactionDetails(parseInt(amount), feesIncluded).debitedAmount);
  };

  const getConfirmationReceived = () => {
    if (!amount || parseInt(amount) <= 0) return '0 FCFA';
    return safeFormatCurrency(calculateTransactionDetails(parseInt(amount), feesIncluded).receivedAmount);
  };

  const receiptModalWidth = width ? width - 24 : 340;
  const receiptMaxHeight = height ? Math.min(height * 0.94, height - 40) : 700;

  const filteredDepartements = departements.filter((d) =>
    String(d.designation || '').toLowerCase().includes(regionSearch.toLowerCase().trim())
  );

  // ═════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* ═══════════ TOAST PREMIUM ═══════════ */}
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

      {/* ═══════════ HEADER (bouton retour) ═══════════ */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <IconBack />
        </TouchableOpacity>
      </View>

      {/* ═══════════ CONTENU ═══════════ */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Région de retrait</Text>

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
          disabled={isWithdrawing}
        >
          {selectedDepartement ? (
            <>
              <View style={[styles.beneficiaryAvatar, { backgroundColor: COLORS.accent }]}>
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
              <IconArrowRight color={COLORS.accent} size={16} />
            </>
          ) : (
            <>
              <View style={styles.beneficiaryEmptyIcon}>
                <IconLocation color={COLORS.accent} />
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
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : departementsError ? (
                <IconRefresh color={COLORS.accent} />
              ) : (
                <IconArrowRight color={COLORS.accent} size={16} />
              )}
            </>
          )}
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 40 }]}>Montant</Text>

        <Animated.View style={{ transform: [{ translateX: amountShakeAnim }] }}>
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
                  {
                    opacity: amountOpacity,
                    transform: [{ scale: amountScale }],
                  },
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
                triggerAmountPop(amountScale);
              }}
              onFocus={() => setAmountFocused(true)}
              onBlur={() => setAmountFocused(false)}
              keyboardType="numeric"
              maxLength={9}
              caretHidden={true}
              editable={!isWithdrawing}
              showSoftInputOnFocus={true}
              selectionColor={COLORS.primary}
            />
          </TouchableOpacity>
        </Animated.View>

        {amountError && (
          <View style={styles.amountErrorRow}>
            <View style={styles.amountErrorBadge}>
              <Text style={styles.amountErrorText}>⚠️ {amountError}</Text>
            </View>
          </View>
        )}

        {!amountError && balance > 0 && (
          <View style={styles.recentAmountsRow}>
            <Text style={styles.recentAmountsLabel}>Montants rapides</Text>
            <View style={styles.recentAmountsChips}>
              {[2000, 5000, 10000, 25000].map((v) => (
                <TouchableOpacity
                  key={`quick-${v}`}
                  style={[
                    styles.recentAmountChip,
                    numericAmount === v && styles.recentAmountChipActive,
                  ]}
                  onPress={() => {
                    triggerSelectionHaptic();
                    triggerAmountPop(amountScale);
                    setAmount(String(v));
                    if (v > balance) {
                      triggerAmountShake(amountShakeAnim);
                    }
                  }}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.recentAmountChipText,
                      numericAmount === v && styles.recentAmountChipTextActive,
                    ]}
                  >
                    +{v.toLocaleString('fr-FR')}
                  </Text>
                </TouchableOpacity>
              ))}
              {balance >= 100 && (
                <TouchableOpacity
                  style={[
                    styles.recentAmountChip,
                    numericAmount === balance && styles.recentAmountChipActive,
                  ]}
                  onPress={() => {
                    triggerSelectionHaptic();
                    triggerAmountPop(amountScale);
                    setAmount(String(balance));
                  }}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.recentAmountChipText,
                      numericAmount === balance && styles.recentAmountChipTextActive,
                    ]}
                  >
                    Max
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {!amountError && (
          <Text style={styles.balanceHint}>
            Solde disponible · {balance.toLocaleString('fr-FR')} FCFA
          </Text>
        )}

        {/* Suggestions rapides */}
        <View style={styles.suggestionsRow}>
          {['5000', '10000', '15000', '25000', '50000', '100000'].map((sug) => (
            <TouchableOpacity
              key={sug}
              style={[styles.suggestionChip, amount === sug && styles.suggestionChipActive]}
              onPress={() => {
                hapticTap('light');
                setAmount(sug);
              }}
              disabled={isWithdrawing}
              activeOpacity={0.75}
            >
              <Text style={[styles.suggestionText, amount === sug && styles.suggestionTextActive]}>
                {parseInt(sug).toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {canWithdraw && !pinRequired && (
          <VoiceAssistantButton
            type="withdraw"
            amount={numericAmount}
            location={selectedDepartement?.designation || ''}
            containerStyle={{ marginTop: 18 }}
          />
        )}

        {/* PIN inline (fallback biométrie) */}
        {pinRequired && (
          <View style={styles.pinInline}>
            <VoiceAssistantButton
              type="withdraw"
              amount={numericAmount}
              location={selectedDepartement?.designation || ''}
              containerStyle={{ marginBottom: 14, marginTop: 0 }}
            />
            <View style={styles.pinInlineHeader}>
              <Text style={styles.pinInlineLabel}>Confirmez avec votre mot de passe</Text>
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
                editable={!isVerifyingAuth && !isWithdrawing}
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
                disabled={isVerifyingAuth || isWithdrawing}
                activeOpacity={0.75}
              >
                <Text style={styles.pinInlineCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pinInlineConfirm,
                  (!pin || pin.length < 8 || isVerifyingAuth || isWithdrawing) && styles.pinInlineConfirmDisabled,
                ]}
                onPress={confirmWithPin}
                disabled={!pin || pin.length < 8 || isVerifyingAuth || isWithdrawing}
                activeOpacity={0.85}
              >
                {isVerifyingAuth || isWithdrawing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.pinInlineConfirmText}>Confirmer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ═══════════ CTA FIXE EN BAS ═══════════ */}
      {!pinRequired && (
        <View style={[styles.ctaContainer, { paddingBottom: Math.max(insets.bottom, 14) + 12 }]}>
          <TouchableOpacity
            style={[styles.cta, !canWithdraw && styles.ctaDisabled]}
            onPress={handleConfirm}
            disabled={!canWithdraw}
            activeOpacity={0.85}
          >
            {isWithdrawing || isVerifyingAuth ? (
              <View style={styles.ctaContent}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.ctaText}>
                  {isWithdrawing ? 'Retrait en cours…' : 'Vérification…'}
                </Text>
              </View>
            ) : (
              <View style={styles.ctaContent}>
                {isBiometricAvailable && useBiometric && canWithdraw && (
                  <IconFingerprint color="#FFFFFF" size={20} />
                )}
                <Text style={[styles.ctaText, !canWithdraw && styles.ctaTextDisabled]}>
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

      {/* ═══════════════════════════════════════════════════
          MODAL SÉLECTION RÉGION (bottom sheet)
          ═══════════════════════════════════════════════════ */}
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
                <ActivityIndicator size="large" color={COLORS.accent} />
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
                        { backgroundColor: isSelected ? COLORS.accent : COLORS.accentSoft },
                      ]}>
                        <IconLocation color={isSelected ? '#FFFFFF' : COLORS.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[
                          styles.contactRowName,
                          isSelected && { color: COLORS.accent, fontWeight: '800' },
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

      {/* ═══════════════════════════════════════════════════
          MODAL CONFIRMATION (bottom sheet)
          ═══════════════════════════════════════════════════ */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (isWithdrawing || isVerifyingAuth) return;
          closeConfirmModal();
        }}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            onPress={() => {
              if (isWithdrawing || isVerifyingAuth) return;
              closeConfirmModal();
            }}
            activeOpacity={1}
          />
          <Animated.View
            style={[
              styles.confirmSheetContent,
              { maxHeight: height * 0.9, transform: [{ translateY: sheetTranslateY }] },
            ]}
            {...sheetPanResponder.panHandlers}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.confirmHeader}>
              <Text style={styles.confirmTitle}>Confirmer le retrait</Text>
              <TouchableOpacity
                onPress={() => {
                  if (isWithdrawing || isVerifyingAuth) return;
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
              <Text style={styles.confirmAmount}>{numericAmount.toLocaleString('fr-FR')} FCFA</Text>
              <Text style={styles.confirmRecipient}>
                Région : {selectedDepartement?.designation || '—'}
              </Text>

              <VoiceAssistantButton
                type="withdraw"
                amount={numericAmount}
                location={selectedDepartement?.designation || ''}
              />

              {/* Section FRAIS */}
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
                    disabled={isWithdrawing || isVerifyingAuth}
                  />
                </View>

                <View style={styles.feesDetails}>
                  <View style={styles.feesDetailRow}>
                    <Text style={styles.feesDetailLabel}>{getFeesLabel()}</Text>
                    <Text style={styles.feesDetailFees}>{getDisplayFees()}</Text>
                  </View>
                  <View style={styles.feesDetailDivider} />
                  <View style={styles.feesDetailRow}>
                    <Text style={styles.feesDetailLabelTotal}>💳 Total débité</Text>
                    <Text style={styles.feesDetailValueTotal}>{getConfirmationTotal()}</Text>
                  </View>
                  <View style={styles.feesDetailRow}>
                    <Text style={styles.feesDetailLabelReceived}>📥 Net reçu</Text>
                    <Text style={styles.feesDetailValueReceived}>{getConfirmationReceived()}</Text>
                  </View>
                </View>
              </View>

              {/* PIN inline dans le modal */}
              {pinRequired && (
                <View style={styles.pinInline}>
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
                      editable={!isVerifyingAuth && !isWithdrawing}
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
                      disabled={isVerifyingAuth || isWithdrawing}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.pinInlineCancelText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.pinInlineConfirm,
                        (!pin || pin.length < 8 || isVerifyingAuth || isWithdrawing) && styles.pinInlineConfirmDisabled,
                      ]}
                      onPress={confirmWithPin}
                      disabled={!pin || pin.length < 8 || isVerifyingAuth || isWithdrawing}
                      activeOpacity={0.85}
                    >
                      {isVerifyingAuth || isWithdrawing ? (
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
                    (isWithdrawing || isVerifyingAuth) && styles.confirmButtonDisabled,
                  ]}
                  onPress={handleModalConfirm}
                  disabled={isWithdrawing || isVerifyingAuth}
                  activeOpacity={0.85}
                >
                  {isWithdrawing || isVerifyingAuth ? (
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

      {/* ═══════════ OVERLAY VALIDATION ANIMÉE & CHIME ═══════════ */}
      <SuccessCheckmarkOverlay
        visible={successOverlayVisible}
        title="Retrait initié !"
        amount={transactionDetails?.amount || numericAmount}
        subtitle={
          selectedDepartement?.designation
            ? `Guichet de ${selectedDepartement.designation}`
            : 'Envoi à moi-même'
        }
        onDismiss={() => {
          setSuccessOverlayVisible(false);
          setReceiptModalVisible(true);
        }}
      />

      {/* ═══════════════════════════════════════════════════
          MODAL REÇU
          ═══════════════════════════════════════════════════ */}
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
                    {transactionDetails.backendId && (
                      <>
                        <View style={styles.receiptUuidSeparator} />
                        <Text style={styles.receiptUuidLabel}>🆔 ID TECHNIQUE</Text>
                        <Text style={styles.receiptUuidValue} numberOfLines={2} ellipsizeMode="middle">
                          {transactionDetails.backendId}
                        </Text>
                      </>
                    )}
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

              <TouchableOpacity
                style={styles.receiptDoneButton}
                onPress={finishWithdraw}
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

  // ═══════════ TOAST PREMIUM ═══════════
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

  // Bénéficiaire / Région (même style)
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
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent + '30',
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
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  beneficiaryEmptyText: {
    fontSize: 15, fontWeight: '600', color: COLORS.textSecondary,
  },

  // Montant
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
  amountTextError: {
    color: COLORS.danger,
  },
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
    marginTop: 10,
    marginBottom: 4,
  },
  amountErrorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  amountErrorText: {
    fontSize: 12.5,
    color: COLORS.danger,
    fontWeight: '700',
  },
  recentAmountsRow: {
    marginTop: 14,
    marginBottom: 6,
  },
  recentAmountsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  recentAmountsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentAmountChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recentAmountChipActive: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  recentAmountChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  recentAmountChipTextActive: {
    color: COLORS.primary,
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
  keyboardHintIcon: {
    fontSize: 14,
  },
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
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  suggestionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  suggestionTextActive: {
    color: '#FFFFFF',
  },

  // PIN inline
  pinInline: {
    marginTop: 32,
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
  pinInlineEye: {
    padding: 6, marginLeft: 4,
  },
  pinInlineActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
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
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    ...Platform.select({
      ios: { shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
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
  ctaTextDisabled: {
    color: COLORS.textMuted,
  },
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

  // Contact row (régions)
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
    backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
  },

  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 16,
    ...Platform.select({
      ios: { shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
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
  confirmAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.accent,
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

  // Fees section (dans le modal)
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
    backgroundColor: COLORS.accentSoft,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.accent + '25',
  },
  feesDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  feesDetailLabel: { fontSize: 12, color: '#7A4A1A', fontWeight: '600' },
  feesDetailFees: { fontSize: 15, color: COLORS.accent, fontWeight: '800' },
  feesDetailDivider: { height: 1, backgroundColor: COLORS.accent + '20', marginVertical: 6 },
  feesDetailLabelTotal: { fontSize: 13, fontWeight: '800', color: COLORS.accent },
  feesDetailValueTotal: { fontSize: 14, fontWeight: '800', color: COLORS.accent },
  feesDetailLabelReceived: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  feesDetailValueReceived: { fontSize: 14, fontWeight: '800', color: COLORS.primary },

  // Confirm button
  confirmButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginTop: 8,
    ...Platform.select({
      ios: { shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
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
  receiptTitle: { fontSize: 17, fontWeight: '800', color: COLORS.accent, letterSpacing: -0.3 },
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
  receiptLabelTotal: { fontSize: 13, fontWeight: '800', color: COLORS.accent },
  receiptValue: {
    fontSize: 12, fontWeight: '700', color: COLORS.textPrimary,
    textAlign: 'right', flex: 1, marginLeft: 8,
  },
  receiptValueFees: { color: COLORS.danger, fontWeight: '700' },
  receiptValueReceived: { color: COLORS.primary, fontWeight: '800' },
  receiptValueTotal: { fontSize: 14, fontWeight: '800', color: COLORS.accent },
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
  receiptParticipantBadgeText: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
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
  receiptUuidSeparator: { height: 1, backgroundColor: COLORS.accent + '30', marginVertical: 8, width: '80%' },
  receiptUuidLabel: {
    fontSize: 8.5, color: '#7A4A1A', marginBottom: 3,
    textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: '700', opacity: 0.7,
  },
  receiptUuidValue: {
    fontSize: 9.5, color: '#7A4A1A',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    textAlign: 'center', paddingHorizontal: 6, opacity: 0.85,
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