// screens/SendMoneyScreen.js — v20 : FIX PERMISSION CONTACTS
// ✨ v20 :
//    ├── Correction ouverture du répertoire (gestion canAskAgain)
//    ├── Redirection vers les réglages si permission bloquée
//    └── UX montant premium conservée
// ─────────────────────────────────────────────────────────────
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Image,
  Modal,
  Platform,
  Share,
  Linking,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  Vibration,
  PanResponder,
  BackHandler,
} from 'react-native';
import { TranslatedText as Text, TranslatedTextInput as TextInput, TranslatedAlert as Alert, ThemedView as View, ThemedTouchableOpacity as TouchableOpacity, ThemedScrollView as ScrollView, ThemedKeyboardAvoidingView as KeyboardAvoidingView } from '../context/LanguageContext';
import { humanizeError } from '../utils/errorHandler';
import RecentNumbersBar, { saveRecentNumber } from '../components/RecentNumbersBar';
import VoiceAssistantButton from '../components/VoiceAssistantButton';
import SuccessCheckmarkOverlay from '../components/SuccessCheckmarkOverlay';
import { useRoute } from '@react-navigation/native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Contacts from 'expo-contacts/legacy';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API } from '../services/api';
import { getLogoBase64, escapeHtml } from '../utils/pdfUtils';
import { useTransactions } from '../context/TransactionContext';
import { saveTxMetadata } from '../utils/txRefCache';
import { verifyTransactionAuth, AUTH_METHOD, AUTH_CANCELLED } from '../utils/transactionAuth';
import { detectNigerOperator } from '../utils/operatorDetector';
import { checkPersistentPinLock, formatRemainingCountdown } from '../utils/rateLimiter';
import { parseAmount, isValidQRPayload } from '../utils/validators';
import { isDeviceCompromised, guardSensitiveOperation } from '../utils/security';
import { triggerAmountShake, triggerAmountPop, getAmountErrorMessage } from '../utils/amountEffects';
import { triggerSelectionHaptic } from '../utils/haptics';
import { copySecurely } from '../utils/secureClipboard';
import { generateSecureToken } from '../utils/cryptoRandom';

const NOTIFIED_TX_IDS_KEY = '@ntalbey_notified_tx_ids';
const RECENT_AMOUNTS_KEY = '@ntalbey_recent_amounts_by_phone';
const SAVED_BENEFICIARIES_KEY = '@ntalbey_saved_beneficiaries_v1';

// ═══════════════════════════════════════════════════════════════
// 🎨 PALETTE
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

// ============================================================
// 🔐 DÉCHIFFREMENT QR
// ============================================================
const SECRET_KEY = 'NT@lb3y$2026#S3cur3!K3y&Ni9erT3l3c0ms';
const QR_PREFIX = 'NTALBEY::';

const xorCipher = (text, key) => {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
};

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

const b64Decode = (str) => {
  let output = '';
  let i = 0;
  str = str.replace(/[^A-Za-z0-9+/=]/g, '');
  while (i < str.length) {
    const e1 = B64_CHARS.indexOf(str.charAt(i++));
    const e2 = B64_CHARS.indexOf(str.charAt(i++));
    const e3 = B64_CHARS.indexOf(str.charAt(i++));
    const e4 = B64_CHARS.indexOf(str.charAt(i++));
    const c1 = (e1 << 2) | (e2 >> 4);
    const c2 = ((e2 & 15) << 4) | (e3 >> 2);
    const c3 = ((e3 & 3) << 6) | e4;
    output += String.fromCharCode(c1);
    if (e3 !== 64) output += String.fromCharCode(c2);
    if (e4 !== 64) output += String.fromCharCode(c3);
  }
  return output;
};

const decodeQRData = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  if (!raw.startsWith(QR_PREFIX)) return null;
  try {
    const b64 = raw.substring(QR_PREFIX.length);
    const xored = b64Decode(b64);
    const decoded = xorCipher(xored, SECRET_KEY);
    const parsed = JSON.parse(decodeURIComponent(decoded));
    if (typeof parsed.exp !== 'number') return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch (e) {
    return null;
  }
};

// ============================================================
// 🎨 HELPERS
// ============================================================
const formatStatus = (status) => {
  const map = {
    pending: '⏳ En attente',
    processing: '🔄 En cours',
    success: '✅ Succès',
    failed: '❌ Échoué',
    expired: '⏰ Expiré',
    cancelled: '🚫 Annulé',
  };
  return map[status] || (status ? String(status) : 'N/A');
};

const extractRealName = (source) => {
  if (!source) return null;
  return (
    source.full_name ||
    source.name ||
    source.display_name ||
    source.profile?.full_name ||
    source.profile?.name ||
    source.profile?.display_name ||
    null
  );
};

const CONTACT_COLORS = ['#FF6600', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#F59E0B'];
const pickRandomContactColor = () =>
  CONTACT_COLORS[Math.floor(Math.random() * CONTACT_COLORS.length)];

const buildInitials = (label) =>
  (label || 'NT')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'NT';

const hapticTap = (intensity = 'light') => {
  if (Platform.OS === 'web') return;
  try {
    if (intensity === 'heavy') Vibration.vibrate(20);
    else if (intensity === 'medium') Vibration.vibrate(12);
    else Vibration.vibrate(6);
  } catch (_) {}
};

// ===== ICÔNES SVG =====
const IconBack = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={COLORS.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconBackWhite = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconQR = ({ color = COLORS.primary, size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="2" />
    <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="2" />
    <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth="2" />
    <Path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2h-2zM18 16h-2v2" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </Svg>
);

const IconFlashOn = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M13 2L4.09 12.97A1 1 0 005 14.5h5.5l-1 7.5L19 11.03A1 1 0 0018 9.5h-5.5l.5-7.5z" fill="#FFD700" stroke="#FFD700" strokeWidth="1.5" strokeLinejoin="round" />
  </Svg>
);

const IconFlashOff = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M13 2L4.09 12.97A1 1 0 005 14.5h5.5l-1 7.5L19 11.03A1 1 0 0018 9.5h-5.5l.5-7.5z" stroke="#FFFFFF" strokeWidth="1.5" strokeLinejoin="round" />
  </Svg>
);

const IconContact = ({ color = COLORS.primary, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.8" />
    <Path d="M5 20v-2a7 7 0 0114 0v2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconStar = ({ filled, color = '#FFD700', size = 14 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="2">
    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </Svg>
);

const IconPDF = () => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={COLORS.danger} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2v6h6" stroke={COLORS.danger} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8 14h8M8 18h6" stroke={COLORS.danger} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconCopy = ({ color = COLORS.primary }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <Rect x="9" y="9" width="13" height="13" rx="2" stroke={color} strokeWidth="1.6" />
    <Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </Svg>
);

const IconArrowRight = ({ color = '#FFFFFF', size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12h14M12 5l7 7-7 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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

const IconFingerprint = ({ color = '#FFFFFF', size = 22 }) => (
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

const IconClose = ({ color = COLORS.textSecondary, size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconWarning = ({ color = '#FFFFFF', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const analyzeQRData = (raw) => {
  const decrypted = decodeQRData(raw);
  if (decrypted && decrypted.type === 'ntalbey') {
    return {
      kind: 'ntalbey',
      phone: decrypted.phone,
      name: decrypted.name,
      subtype: decrypted.subtype,
      amount: decrypted.amount,
      note: decrypted.note,
      exp: decrypted.exp,
    };
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.type === 'ntalbey' || parsed.type === 'phone' || parsed.phone)) {
      return { kind: 'ntalbey', ...parsed };
    }
    return { kind: 'json', raw, parsed };
  } catch (_) {}
  const cleaned = String(raw).replace(/[\s\-()]/g, '');
  if (/^\+?\d{8,15}$/.test(cleaned)) return { kind: 'phone', phone: cleaned };
  if (/^https?:\/\//i.test(raw)) return { kind: 'url', url: raw };
  return { kind: 'text', raw };
};

// ═══════════════════════════════════════════════════════════════
// 🎯 COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function SendMoneyScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { width = 400, height = 800 } = useWindowDimensions();

  // ─── Bénéficiaire ──────────────────────────────────────
  const [selectedContact, setSelectedContact] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);

  // ─── Bottom sheet picker ───────────────────────────────
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [beneficiaryCheck, setBeneficiaryCheck] = useState(null);
  const [isVerifyingContact, setIsVerifyingContact] = useState(false);
  const sheetTranslateY = useRef(new Animated.Value(0)).current;

  // ─── Notification flottante (au lieu d'Alert) ──────────
  const [toast, setToast] = useState(null); // { type: 'error' | 'success', title, message }
  const toastAnim = useRef(new Animated.Value(-150)).current;

  // ─── Scanner QR ────────────────────────────────────────
  const [qrScannerVisible, setQrScannerVisible] = useState(false);
  const [qrTorchOn, setQrTorchOn] = useState(false);
  const [qrScanned, setQrScanned] = useState(false);
  const [qrContainerSize, setQrContainerSize] = useState({ width: 0, height: 0 });
  const [qrPermission, requestQrPermission] = useCameraPermissions();
  const [isVerifyingQR, setIsVerifyingQR] = useState(false);
  const qrScanAnim = useRef(new Animated.Value(0)).current;

  // ─── Montant ───────────────────────────────────────────
  const [amount, setAmount] = useState('');
  const [amountFocused, setAmountFocused] = useState(false);
  const amountInputRef = useRef(null);

  // ─── Auth / Envoi ──────────────────────────────────────
  const [isSending, setIsSending] = useState(false);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [useBiometric, setUseBiometric] = useState(false);

  // ─── PIN inline (fallback) ─────────────────────────────
  const [pinRequired, setPinRequired] = useState(false);
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [pinLockout, setPinLockout] = useState({ isLocked: false, remainingMs: 0 });
  const pinInputRef = useRef(null);

  // ─── Reçu ──────────────────────────────────────────────
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [successOverlayVisible, setSuccessOverlayVisible] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // ─── User ──────────────────────────────────────────────
  const [currentUserPhone, setCurrentUserPhone] = useState(null);
  const [currentUserName, setCurrentUserName] = useState(null);

  // ─── Montants récents par bénéficiaire ─────────────────
  const [recentAmounts, setRecentAmounts] = useState({});

  // ─── Pulse sur bénéficiaire vide ───────────────────────
  const beneficiaryPulse = useRef(new Animated.Value(1)).current;
  const beneficiaryPulseLoop = useRef(null);

  const { balance, refreshWallet, transactions = [] } = useTransactions();

  const effectiveW = qrContainerSize.width > 0 ? qrContainerSize.width : width;
  const effectiveH = qrContainerSize.height > 0 ? qrContainerSize.height : height;
  const QR_FRAME_SIZE = Math.min(effectiveW - 80, 260);
  const qrFrameTop = (effectiveH - QR_FRAME_SIZE) / 2;
  const qrFrameLeft = (effectiveW - QR_FRAME_SIZE) / 2;

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

    // Auto-dismiss après 4s
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

  // ─── Validation montant inline ─────────────────────────
  const amountError = useMemo(() => {
    return getAmountErrorMessage(numericAmount, balance, 100);
  }, [numericAmount, balance]);

  // ─── Animations montant (Shake & Scale Pop) ─────────────
  const amountOpacity = useRef(new Animated.Value(1)).current;
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

  // ─── Caret clignotant pour le montant vide ─────────────
  const caretOpacity = useRef(new Animated.Value(1)).current;
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

  // ─── Pulse bénéficiaire vide ───────────────────────────
  useEffect(() => {
    if (!selectedContact) {
      beneficiaryPulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(beneficiaryPulse, { toValue: 1.02, duration: 900, useNativeDriver: true }),
          Animated.timing(beneficiaryPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      beneficiaryPulseLoop.current.start();
    } else {
      if (beneficiaryPulseLoop.current) beneficiaryPulseLoop.current.stop();
      beneficiaryPulse.setValue(1);
    }
    return () => {
      if (beneficiaryPulseLoop.current) beneficiaryPulseLoop.current.stop();
    };
  }, [selectedContact]);

  // ─── Animation scan ────────────────────────────────────
  useEffect(() => {
    if (!qrScannerVisible || !qrPermission?.granted || qrScanned || isVerifyingQR) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(qrScanAnim, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(qrScanAnim, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [qrScannerVisible, qrPermission?.granted, qrScanned, isVerifyingQR]);

  const qrScanLineTranslateY = qrScanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [6, QR_FRAME_SIZE - 9],
  });

  // ═════════════════════════════════════════════════════════
  // EFFETS
  // ═════════════════════════════════════════════════════════
  useEffect(() => {
    (async () => {
      try {
        const user = await API.getCurrentUser();
        const clean = user?.phone ? String(user.phone).replace(/\s/g, '').replace(/^\+?227/, '') : null;
        const name = user?.name || user?.full_name || null;
        setCurrentUserPhone(clean);
        setCurrentUserName(name);
      } catch (e) {}
    })();
  }, []);

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

  // ─── Chargement fusionné des contacts, favoris et transactions ───
  const loadAllContactsAndBeneficiaries = useCallback(async () => {
    setIsLoadingContacts(true);
    try {
      const map = new Map();

      // 1. Favoris et bénéficiaires enregistrés localement
      try {
        const raw = await AsyncStorage.getItem(SAVED_BENEFICIARIES_KEY);
        const savedList = raw ? JSON.parse(raw) : [];
        if (Array.isArray(savedList)) {
          for (const item of savedList) {
            const clean = String(item.phone || '').replace(/\D/g, '').replace(/^227/, '');
            if (clean.length === 8) {
              map.set(clean, {
                id: item.id || `fav-${clean}`,
                name: item.name || `+227 ${clean}`,
                phone: clean,
                avatar: item.avatar || buildInitials(item.name || clean),
                color: item.color || pickRandomContactColor(),
                isFavorite: item.isFavorite !== undefined ? item.isFavorite : true,
                lastSentAt: item.lastSentAt || 0,
                isFromQR: false,
              });
            }
          }
        }
      } catch (_) {}

      // 2. Historique des transactions pour remplir automatiquement les bénéficiaires
      if (Array.isArray(transactions) && transactions.length > 0) {
        for (const tx of transactions) {
          const candPhone = tx?.recipient_phone || tx?.beneficiary_phone || tx?.to_phone || tx?.phone || '';
          const clean = String(candPhone).replace(/\D/g, '').replace(/^227/, '');
          if (clean.length === 8) {
            const candName = tx?.recipient_name || tx?.beneficiary_name || tx?.to_name || '';
            const txTime = tx?.timestamp || tx?.created_at ? new Date(tx.timestamp || tx.created_at).getTime() : 0;
            if (!map.has(clean)) {
              map.set(clean, {
                id: `tx-${clean}`,
                name: candName || `+227 ${clean}`,
                phone: clean,
                avatar: buildInitials(candName || clean),
                color: pickRandomContactColor(),
                isFavorite: true,
                lastSentAt: txTime,
                isFromQR: false,
              });
            } else {
              const existing = map.get(clean);
              if (candName && (!existing.name || existing.name.startsWith('+227'))) {
                existing.name = candName;
                existing.avatar = buildInitials(candName);
              }
              if (txTime > (existing.lastSentAt || 0)) {
                existing.lastSentAt = txTime;
              }
            }
          }
        }
      }

      // 3. Contacts API si disponibles
      try {
        const apiData = await API.getContacts();
        if (Array.isArray(apiData)) {
          for (const c of apiData) {
            const clean = String(c.phone || '').replace(/\D/g, '').replace(/^227/, '');
            if (clean.length === 8 && !map.has(clean)) {
              map.set(clean, {
                id: c.id || `api-${clean}`,
                name: c.name || `+227 ${clean}`,
                phone: clean,
                avatar: c.avatar || buildInitials(c.name || clean),
                color: c.color || pickRandomContactColor(),
                isFavorite: !!c.isFavorite,
                lastSentAt: 0,
                isFromQR: false,
              });
            }
          }
        }
      } catch (_) {}

      const merged = Array.from(map.values());
      setContacts(merged);
      await AsyncStorage.setItem(SAVED_BENEFICIARIES_KEY, JSON.stringify(merged));
    } catch (error) {
      if (__DEV__) console.log('Erreur chargement contacts', error);
    } finally {
      setIsLoadingContacts(false);
    }
  }, [transactions]);

  useEffect(() => {
    loadAllContactsAndBeneficiaries();
  }, [loadAllContactsAndBeneficiaries]);

  // ⭐ Enregistrement automatique d'un bénéficiaire comme favori dès qu'un envoi est fait
  const saveBeneficiaryOnSend = useCallback(async (phone, name) => {
    try {
      const clean = String(phone || '').replace(/\D/g, '').replace(/^227/, '');
      if (clean.length !== 8) return;
      const raw = await AsyncStorage.getItem(SAVED_BENEFICIARIES_KEY);
      let list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];

      const existingIndex = list.findIndex((c) => String(c.phone).replace(/\D/g, '').endsWith(clean));
      const displayName = name && !name.startsWith('+227')
        ? name
        : (existingIndex >= 0 && list[existingIndex].name ? list[existingIndex].name : `+227 ${clean}`);

      const updatedContact = {
        id: existingIndex >= 0 ? list[existingIndex].id : `fav-${clean}`,
        name: displayName,
        phone: clean,
        avatar: buildInitials(displayName),
        color: existingIndex >= 0 && list[existingIndex].color ? list[existingIndex].color : pickRandomContactColor(),
        isFavorite: true, // ⭐ Enregistré en favori automatiquement
        lastSentAt: Date.now(),
        isFromQR: false,
      };

      if (existingIndex >= 0) {
        list[existingIndex] = { ...list[existingIndex], ...updatedContact };
      } else {
        list.unshift(updatedContact);
      }

      await AsyncStorage.setItem(SAVED_BENEFICIARIES_KEY, JSON.stringify(list));
      setContacts((prev) => {
        const filtered = prev.filter((c) => String(c.phone).replace(/\D/g, '').slice(-8) !== clean);
        return [updatedContact, ...filtered];
      });
      await saveRecentNumber(clean, displayName);
    } catch (_) {}
  }, []);

  // ⭐ Bascule favori (marquer/démarquer) en 1 tap
  const toggleFavorite = useCallback(async (contactPhone) => {
    try {
      const clean = String(contactPhone).replace(/\D/g, '').replace(/^227/, '');
      hapticTap('light');
      setContacts((prev) => {
        const next = prev.map((c) => {
          if (String(c.phone).replace(/\D/g, '').endsWith(clean)) {
            return { ...c, isFavorite: !c.isFavorite };
          }
          return c;
        });
        AsyncStorage.setItem(SAVED_BENEFICIARIES_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    } catch (_) {}
  }, []);

  // Charge les montants récents
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENT_AMOUNTS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') setRecentAmounts(parsed);
        }
      } catch (_) {}
    })();
  }, []);

  // Sauvegarde un montant récent pour un bénéficiaire
  const saveRecentAmount = useCallback(async (phone, amountValue) => {
    if (!phone || !amountValue) return;
    try {
      const clean = String(phone).replace(/\s/g, '').replace(/^\+?227/, '');
      const next = { ...recentAmounts };
      const list = Array.isArray(next[clean]) ? next[clean] : [];
      const filtered = [amountValue, ...list.filter(v => v !== amountValue)].slice(0, 3);
      next[clean] = filtered;
      setRecentAmounts(next);
      await AsyncStorage.setItem(RECENT_AMOUNTS_KEY, JSON.stringify(next));
    } catch (_) {}
  }, [recentAmounts]);

  // Recherche bénéficiaire
  useEffect(() => {
    if (!manualPhone || manualPhone.length < 8) {
      setBeneficiaryCheck(null);
      return;
    }
    const cleanPhone = String(manualPhone).replace(/\s/g, '').replace(/^\+?227/, '');
    if (contacts.some((c) => c.phone === cleanPhone)) {
      setBeneficiaryCheck(null);
      return;
    }
    setBeneficiaryCheck('loading');

    const timer = setTimeout(async () => {
      try {
        const result = await API.searchCustomerByPhone(cleanPhone);
        if (String(manualPhone).replace(/\s/g, '').replace(/^\+?227/, '') !== cleanPhone) return;
        if (result) {
          let realName = extractRealName(result);
          if (!realName && result.qr_name) realName = result.qr_name;
          setBeneficiaryCheck({
            found: true,
            name: realName,
            displayName: realName || `+227 ${cleanPhone}`,
            kyc: result.kyc_level || null,
            isSelf: !!result.isSelf,
          });
        } else {
          setBeneficiaryCheck({ found: false });
        }
      } catch (e) {
        setBeneficiaryCheck(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [manualPhone, contacts]);

  // Prefilled
  const prefilledApplied = useRef(false);
  useEffect(() => {
    if (prefilledApplied.current) return;
    if (isLoadingContacts) return;
    const params = route.params;
    if (!params) {
      prefilledApplied.current = true;
      return;
    }
    if (params.prefilledAmount || params.initialAmount) {
      setAmount(String(params.prefilledAmount || params.initialAmount));
    }
    if (!params.prefilledPhone) {
      prefilledApplied.current = true;
      return;
    }
    const cleanPhone = String(params.prefilledPhone).replace(/[\s\-]/g, '').replace(/^\+?227/, '');
    const existingContact = contacts.find(c => c.phone === cleanPhone);
    if (existingContact) {
      setSelectedContact(existingContact);
    } else {
      setManualPhone(cleanPhone);
      setPickerVisible(true);
    }
    if (params.prefilledAmount || params.initialAmount) {
      setAmount(String(params.prefilledAmount || params.initialAmount));
    }
    prefilledApplied.current = true;
    navigation.setParams({
      prefilledPhone: undefined,
      prefilledName: undefined,
      prefilledAmount: undefined,
    });
  }, [isLoadingContacts, route.params, contacts, navigation]);

  // ─── Auto-focus du montant à l'arrivée ─────────────────
  const autoFocusDone = useRef(false);
  useEffect(() => {
    if (autoFocusDone.current) return;
    if (isLoadingContacts) return;
    if (selectedContact) { autoFocusDone.current = true; return; }
    const t = setTimeout(() => {
      amountInputRef.current?.focus();
      autoFocusDone.current = true;
    }, 500);
    return () => clearTimeout(t);
  }, [isLoadingContacts, selectedContact]);

  // ═════════════════════════════════════════════════════════
  // PICKER + SWIPE-TO-DISMISS
  // ═════════════════════════════════════════════════════════
  const openPicker = () => {
    hapticTap('light');
    setPickerSearch('');
    setManualPhone('');
    setBeneficiaryCheck(null);
    setPickerVisible(true);
    sheetTranslateY.setValue(0);
  };

  const closePicker = () => {
    setPickerVisible(false);
    setPickerSearch('');
    setManualPhone('');
    setBeneficiaryCheck(null);
  };

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
            closePicker();
            sheetTranslateY.setValue(0);
          });
        } else {
          Animated.spring(sheetTranslateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const handleSelectContact = (contact) => {
    hapticTap('light');
    setSelectedContact(contact);
    closePicker();
  };

  const addContactSafely = (newContact) => {
    setContacts(prev => {
      if (prev.some(c => c.id === newContact.id)) return prev;
      if (newContact.phone && prev.some(c => c.phone === newContact.phone)) return prev;
      return [...prev, newContact];
    });
  };

  // ═════════════════════════════════════════════════════════
  // 🔒 SAISIE MANUELLE — vérification AVANT sélection
  // ═════════════════════════════════════════════════════════
  const handleUseManualPhone = async () => {
    const cleanPhone = String(manualPhone).replace(/\s/g, '').replace(/^\+?227/, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      showToast('error', 'Numéro invalide', 'Veuillez saisir un numéro valide.');
      return;
    }

    // 1. Déjà dans nos contacts NT Albey → OK
    const existing = contacts.find(c => c.phone === cleanPhone);
    if (existing) {
      handleSelectContact(existing);
      return;
    }

    // 2. Vérif async déjà finie → on décide
    if (beneficiaryCheck?.found === false) {
      showToast(
        'error',
        'Numéro introuvable',
        `Le numéro +227 ${cleanPhone} n'est pas enregistré sur NT Albey.`
      );
      return;
    }

    if (beneficiaryCheck?.found === true) {
      const name = beneficiaryCheck.name?.trim() || `+227 ${cleanPhone}`;
      setSelectedContact({
        id: `manual-${cleanPhone}`,
        name,
        phone: cleanPhone,
        avatar: buildInitials(name),
        color: COLORS.primary,
        isFavorite: false,
        isFromQR: false,
      });
      closePicker();
      return;
    }

    // 3. Cas rare : l'utilisateur a cliqué OK avant la fin de la vérif (500ms)
    setIsVerifyingContact(true);
    let apiResult = null;
    try {
      apiResult = await API.searchCustomerByPhone(cleanPhone);
    } catch (_) {
      apiResult = null;
    } finally {
      setIsVerifyingContact(false);
    }

    if (!apiResult) {
      showToast(
        'error',
        'Numéro introuvable',
        `Le numéro +227 ${cleanPhone} n'est pas enregistré sur NT Albey.`
      );
      return;
    }

    const realName = extractRealName(apiResult) || `+227 ${cleanPhone}`;
    setSelectedContact({
      id: `manual-${cleanPhone}`,
      name: realName,
      phone: cleanPhone,
      avatar: buildInitials(realName),
      color: COLORS.primary,
      isFavorite: false,
      isFromQR: false,
    });
    closePicker();
  };

  // ═════════════════════════════════════════════════════════
  // 🔒 RÉPERTOIRE — CORRIGÉ v20 (Gestion des permissions)
  // ═════════════════════════════════════════════════════════
  const openPhoneContacts = async () => {
    if (isVerifyingContact) return;

    try {
      const { status, canAskAgain } = await Contacts.requestPermissionsAsync();

      if (status !== 'granted') {
        if (!canAskAgain) {
          showToast(
            'error',
            'Autorisation requise',
            'Activez l\'accès aux contacts dans les réglages de votre téléphone.'
          );
          setTimeout(() => {
            Linking.openSettings();
          }, 800);
          return;
        }
        showToast('error', 'Autorisation refusée', 'Accès au répertoire requis.');
        return;
      }

      const contact = await Contacts.presentContactPickerAsync();
      if (!contact) return;

      const phoneNumber = contact.phoneNumbers && contact.phoneNumbers.length > 0
        ? contact.phoneNumbers[0].number.replace(/\s/g, '').replace(/[^0-9]/g, '').replace(/^\+?227/, '')
        : '';
      const contactName = contact.name || 'Contact inconnu';

      if (!phoneNumber || phoneNumber.length < 8) {
        showToast('error', 'Numéro invalide', 'Ce contact ne possède pas de numéro valide.');
        return;
      }

      // 1. Déjà dans nos contacts NT Albey → sélection directe
      const existing = contacts.find(c => c.phone === phoneNumber);
      if (existing) {
        handleSelectContact(existing);
        return;
      }

      // 2. Vérifier côté backend AVANT toute sélection
      setIsVerifyingContact(true);
      let apiResult = null;
      try {
        apiResult = await API.searchCustomerByPhone(phoneNumber);
      } catch (_) {
        apiResult = null;
      } finally {
        setIsVerifyingContact(false);
      }

      if (!apiResult) {
        showToast(
          'error',
          'Numéro introuvable',
          `Le numéro +227 ${phoneNumber} n'est pas enregistré sur NT Albey. Il ne peut pas recevoir de transfert.`
        );
        return;
      }

      // 3. Le numéro est bien sur NT Albey → on l'ajoute et on le sélectionne
      const realName =
        extractRealName(apiResult) ||
        contactName ||
        `+227 ${phoneNumber}`;

      try {
        const newContact = await API.addContact({
          name: realName,
          phone: phoneNumber,
          avatar: buildInitials(realName),
          color: pickRandomContactColor(),
          isFavorite: false,
        });
        addContactSafely(newContact);
        handleSelectContact(newContact);
      } catch (e) {
        // Fallback : sélection éphémère (le backend a confirmé qu'il existe)
        handleSelectContact({
          id: `phone-${phoneNumber}`,
          name: realName,
          phone: phoneNumber,
          avatar: buildInitials(realName),
          color: pickRandomContactColor(),
          isFavorite: false,
          isFromQR: false,
        });
      }
    } catch (error) {
      showToast('error', 'Erreur', 'Impossible d\'accéder aux contacts.');
    }
  };

  // ═════════════════════════════════════════════════════════
  // QR SCANNER
  // ═════════════════════════════════════════════════════════
  const openQRScanner = async () => {
    if (!guardSensitiveOperation('le scan de QR code')) return;
    setQrScanned(false);
    setQrTorchOn(false);
    setIsVerifyingQR(false);
    setQrScannerVisible(true);
    if (!qrPermission?.granted) {
      try { await requestQrPermission(); } catch (e) {}
    }
  };

  const closeQRScanner = () => {
    setQrScannerVisible(false);
    setQrScanned(false);
    setQrTorchOn(false);
    setIsVerifyingQR(false);
  };

  const applyQRDataToForm = async (data) => {
    let phone = null, qrAmount = null, qrName = null;
    if (data.kind === 'ntalbey') {
      if (!isValidQRPayload(data)) {
        closeQRScanner();
        showToast('error', 'QR invalide', 'QR Code invalide ou expiré.');
        return;
      }
      phone = String(data.phone).replace(/[\s\-]/g, '');
      qrAmount = data.amount;
      qrName = data.name || null;
    } else if (data.kind === 'phone') {
      phone = String(data.phone).replace(/[\s\-]/g, '');
    } else if (data.kind === 'json' && data.parsed?.phone) {
      phone = String(data.parsed.phone).replace(/[\s\-]/g, '');
      qrAmount = data.parsed.amount;
      qrName = data.parsed.name || null;
    }
    if (!phone) {
      closeQRScanner();
      showToast('error', 'QR non reconnu', 'Utilisez l\'onglet « Mon QR » de NT Albey.');
      return;
    }
    const cleanedPhone = phone.replace(/^\+?227/, '');
    const existing = contacts.find(c => c.phone === cleanedPhone);
    if (existing) {
      setSelectedContact(existing);
      if (qrAmount) setAmount(String(qrAmount));
      setTimeout(() => { closeQRScanner(); closePicker(); }, 200);
      return;
    }
    setIsVerifyingQR(true);
    try {
      const result = await API.searchCustomerByPhone(cleanedPhone);
      if (!result && !qrName) {
        setIsVerifyingQR(false);
        closeQRScanner();
        showToast('error', 'Compte introuvable', `Le numéro ${cleanedPhone} n'est pas enregistré.`);
        return;
      }
      let realName = qrName || extractRealName(result) || null;
      const finalDisplayName = realName || `+227 ${cleanedPhone}`;
      setSelectedContact({
        id: `qr-${cleanedPhone}`,
        name: finalDisplayName,
        phone: cleanedPhone,
        avatar: buildInitials(realName || cleanedPhone),
        color: COLORS.primary,
        isFavorite: false,
        isFromQR: true,
      });
      if (qrAmount) setAmount(String(qrAmount));
      setIsVerifyingQR(false);
      setTimeout(() => { closeQRScanner(); closePicker(); }, 200);
    } catch (e) {
      setIsVerifyingQR(false);
      closeQRScanner();
      showToast('error', 'Erreur réseau', 'Le serveur NT Albey est injoignable.');
    }
  };

  const handleQRBarcodeScanned = ({ data }) => {
    if (qrScanned) return;
    setQrScanned(true);
    applyQRDataToForm(analyzeQRData(data));
  };

  // ═════════════════════════════════════════════════════════
  // ENVOI
  // ═════════════════════════════════════════════════════════
  const executeTransfer = async () => {
    if (isSending) return; // 🔒 Guard anti-double clic / anti-rebond immédiat
    if (!selectedContact) return;
    if (isDeviceCompromised()) {
      Alert.alert('🔒 Opération bloquée', 'Les transactions sont désactivées sur un appareil rooté.');
      return;
    }
    const parsed = parseAmount(String(numericAmount), { min: 100, max: 2_000_000 });
    if (!parsed.ok) {
      showToast('error', 'Montant invalide', parsed.reason);
      return;
    }
    if (parsed.value > balance) {
      showToast('error', 'Solde insuffisant', `Votre solde : ${balance.toLocaleString()} FCFA.`);
      return;
    }

    const receiverPhone = String(selectedContact.phone).replace(/\s/g, '').replace(/^\+?227/, '');
    const amountValue = parsed.value;

    if (currentUserPhone && receiverPhone === String(currentUserPhone).replace(/\s/g, '').replace(/^\+?227/, '')) {
      showToast('error', 'Opération impossible', 'Vous ne pouvez pas vous transférer de l\'argent à vous-même. Pour un retrait, utilisez « Envoi à moi-même ».');
      return;
    }

    setIsSending(true);

    try {
      const idempotencyKey = `p2p_${Date.now()}_${generateSecureToken(16)}`;
      const result = await API.accountToAccount({
        receiver_phone: receiverPhone,
        amount: amountValue,
        idempotency_key: idempotencyKey,
      });

      const grossAmount = Number(result.gross_amount) || amountValue;
      const feeAmount   = Number(result.fee_amount)   || 0;
      const netAmount   = Number(result.net_amount)   || grossAmount;
      const totalDebited = grossAmount + (Number(result.total_debit) || 0);
      const currency = result.currency_code || 'XOF';
      const initiatedDate = result.initiated_at
        ? new Date(result.initiated_at).toLocaleString('fr-FR')
        : new Date().toLocaleString('fr-FR');

      setTransactionDetails({
        beneficiary: selectedContact.name,
        phone: receiverPhone,
        senderPhone: currentUserPhone || '',
        senderName: currentUserName || 'Moi',
        reference: result.reference,
        transactionId: result.id,
        status: result.status,
        transType: result.trans_type,
        currency,
        grossAmount,
        feeAmount,
        netAmount,
        totalDebited,
        amount: grossAmount.toLocaleString() + ' ' + currency,
        fees: feeAmount.toLocaleString() + ' ' + currency,
        total: totalDebited.toLocaleString() + ' ' + currency,
        date: initiatedDate,
      });

      await saveRecentAmount(receiverPhone, amountValue);
      await saveBeneficiaryOnSend(receiverPhone, selectedContact.name);

      if (result.id) {
        try {
          await saveTxMetadata(result.id, {
            reference: result.reference,
            sender_phone: currentUserPhone,
            sender_name: currentUserName,
            receiver_phone: receiverPhone,
            receiver_name: selectedContact.name,
          });
        } catch (_) {}
      }

      try {
        await API.addNotification({
          title: '📤 Transfert envoyé',
          message: `Vous avez envoyé ${grossAmount.toLocaleString('fr-FR')} ${currency} à ${selectedContact.name}.`,
          type: 'info',
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

      setSuccessOverlayVisible(true);
      if (typeof refreshWallet === 'function') await refreshWallet();
    } catch (error) {
      showToast('error', 'Échec du transfert', error.message || 'Impossible d\'effectuer le transfert.');
    } finally {
      setIsSending(false);
    }
  };

  // ═════════════════════════════════════════════════════════
  // CONFIRMATION
  // ═════════════════════════════════════════════════════════
  const canSend =
    !!selectedContact &&
    numericAmount >= 100 &&
    numericAmount <= balance &&
    !isSending &&
    !isVerifyingAuth;

  const handleConfirm = async () => {
    if (!canSend) {
      if (numericAmount === 0 || amountError) {
        triggerAmountShake(amountShakeAnim);
        amountInputRef.current?.focus();
      }
      return;
    }
    hapticTap('medium');
    Keyboard.dismiss();

    if (isBiometricAvailable && useBiometric) {
      setIsVerifyingAuth(true);
      try {
        await verifyTransactionAuth(AUTH_METHOD.BIOMETRIC);
        await executeTransfer();
      } catch (error) {
        if (error.message === AUTH_CANCELLED) return;
        const msg = String(error.message || '');
        if (msg.includes('Session biométrique expirée') || msg.includes('Aucune empreinte')) {
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
    if (currentUserPhone) {
      checkPersistentPinLock(currentUserPhone).then(status => {
        setPinLockout(status);
        if (!status.isLocked) {
          setTimeout(() => pinInputRef.current?.focus(), 150);
        }
      });
    } else {
      setTimeout(() => pinInputRef.current?.focus(), 150);
    }
  };

  // ⏱️ Décompte dynamique quand le PIN est bloqué
  useEffect(() => {
    if (!pinLockout.isLocked || !currentUserPhone) return;
    const timer = setInterval(async () => {
      const status = await checkPersistentPinLock(currentUserPhone);
      if (!status.isLocked) {
        setPinLockout({ isLocked: false, remainingMs: 0 });
      } else {
        setPinLockout(status);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [pinLockout.isLocked, currentUserPhone]);

  const confirmWithPin = async () => {
    if (isSending || isVerifyingAuth) return;
    if (currentUserPhone) {
      const lockStatus = await checkPersistentPinLock(currentUserPhone);
      if (lockStatus.isLocked) {
        setPinLockout(lockStatus);
        showToast(
          'error',
          'Compte bloqué (5 min)',
          `Trop de tentatives incorrectes. Réessayez dans ${formatRemainingCountdown(lockStatus.remainingMs)}.`
        );
        return;
      }
    }
    if (!pin || pin.length < 8 || pin.length > 20) {
      showToast('error', 'Code incorrect', 'Le mot de passe doit contenir entre 8 et 20 caractères.');
      return;
    }
    hapticTap('medium');
    setIsVerifyingAuth(true);
    try {
      await verifyTransactionAuth(AUTH_METHOD.PIN, pin);
      setPin('');
      setPinRequired(false);
      setPinLockout({ isLocked: false, remainingMs: 0 });
      await executeTransfer();
    } catch (error) {
      if (currentUserPhone) {
        const lockStatus = await checkPersistentPinLock(currentUserPhone);
        setPinLockout(lockStatus);
      }
      showToast('error', 'Authentification échouée', error.message || 'Le mot de passe saisi est incorrect.');
      setPin('');
    } finally {
      setIsVerifyingAuth(false);
    }
  };

  // ═════════════════════════════════════════════════════════
  // REÇU
  // ═════════════════════════════════════════════════════════
  const handleCopyReceipt = async (details) => {
    if (!details) return;
    const message = `NT ALBEY - REÇU DE TRANSFERT
━━━━━━━━━━━━━━━━━━━━━
✅ TRANSFERT EFFECTUÉ
━━━━━━━━━━━━━━━━━━━━━
👤 Bénéficiaire : ${details.beneficiary || 'N/A'}
📱 Numéro : +227 ${details.phone || 'N/A'}
💰 Montant envoyé : ${details.amount || 'N/A'}
📋 Frais : ${details.fees || 'N/A'}
🎁 Net reçu : ${details.netAmount != null ? details.netAmount.toLocaleString() + ' ' + (details.currency || 'XOF') : 'N/A'}
💳 Total débité : ${details.total || 'N/A'}
📅 Date : ${details.date || new Date().toLocaleString('fr-FR')}
🔑 Référence : ${details.reference || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━`;
    await copySecurely(message, { ttlSeconds: 60 });
    showToast('success', 'Reçu copié', 'Le reçu a été copié. Il s\'effacera dans 60s pour votre sécurité.');
  };

  const handleExportPDF = async (details) => {
    if (!details) {
      showToast('error', 'Erreur', 'Aucune donnée à exporter.');
      return;
    }
    try {
      setIsExporting(true);
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>body{font-family:sans-serif;padding:24px;color:#0F172A}.header{text-align:center;border-bottom:2px solid #008933;padding-bottom:12px;margin-bottom:20px}.title{color:#008933;font-size:20px;font-weight:bold}.card{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin-bottom:16px}.row{display:flex;justify-content:space-between;margin-bottom:8px}.label{color:#64748B;font-size:13px}.val{font-weight:bold;font-size:14px}.total{color:#008933;font-size:16px}.footer{text-align:center;font-size:11px;color:#94A3B8;margin-top:24px}</style></head><body><div class="header"><div class="title">NT ALBEY - REÇU DE TRANSFERT</div><div style="font-size:12px;color:#64748B;margin-top:4px">Transfert d'argent confirmé</div></div><div class="card"><div class="row"><span class="label">Bénéficiaire :</span><span class="val">${escapeHtml(details.beneficiary || 'N/A')}</span></div><div class="row"><span class="label">Numéro :</span><span class="val">+227 ${escapeHtml(details.phone || 'N/A')}</span></div><div class="row"><span class="label">Montant :</span><span class="val">${escapeHtml(details.amount || 'N/A')}</span></div><div class="row"><span class="label">Frais :</span><span class="val">${escapeHtml(details.fees || 'N/A')}</span></div><div class="row"><span class="label">Total débité :</span><span class="val total">${escapeHtml(details.total || 'N/A')}</span></div><div class="row"><span class="label">Référence :</span><span class="val">${escapeHtml(details.reference || 'N/A')}</span></div><div class="row"><span class="label">Date :</span><span class="val">${escapeHtml(details.date || new Date().toLocaleString('fr-FR'))}</span></div></div><div class="footer">Niger Telecoms - Albey Mobile Money. Merci pour votre confiance.</div></body></html>`;
      await Print.printAsync({ html });
    } catch (err) {
      const message = `NT ALBEY - Reçu de transfert : ${details.amount || ''} vers +227 ${details.phone || ''}. Réf: ${details.reference || ''}`;
      Share.share({ message, title: `Reçu - ${details.reference || 'NT Albey'}` });
    } finally {
      setIsExporting(false);
    }
  };

  const finishSend = () => {
    hapticTap('medium');
    Alert.alert('C\'est fait !', 'Votre transfert a été effectué avec succès.');
    setReceiptModalVisible(false);
    setAmount('');
    setSelectedContact(null);
    setTransactionDetails(null);
    setPinRequired(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  // 🔒 Protection anti-double débit : Bloque le bouton retour physique Android pendant l'émission
  useEffect(() => {
    const onBackPress = () => {
      if (isSending) return true;
      if (receiptModalVisible) {
        finishSend();
        return true;
      }
      return false;
    };
    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, [isSending, receiptModalVisible]);

  const startNewTransfer = () => {
    hapticTap('light');
    setReceiptModalVisible(false);
    setAmount('');
    setSelectedContact(null);
    setTransactionDetails(null);
    setPinRequired(false);
  };

  // ═════════════════════════════════════════════════════════
  // FILTRAGE
  // ═════════════════════════════════════════════════════════
  const filteredContacts = useMemo(() => {
    const sorted = [...contacts].sort((a, b) => {
      if (b.isFavorite !== a.isFavorite) {
        return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
      }
      return (b.lastSentAt || 0) - (a.lastSentAt || 0);
    });
    if (!pickerSearch.trim()) return sorted;
    const q = pickerSearch.toLowerCase().trim();
    const cleanQ = q.replace(/\D/g, '');
    return sorted.filter(c => {
      const matchName = String(c.name || '').toLowerCase().includes(q);
      const matchPhone = String(c.phone || '').includes(q) || (cleanQ.length >= 2 && String(c.phone || '').replace(/\D/g, '').includes(cleanQ));
      return matchName || matchPhone;
    });
  }, [contacts, pickerSearch]);

  const recentSuggestions = useMemo(() => {
    if (!selectedContact) return [];
    const clean = String(selectedContact.phone).replace(/\s/g, '').replace(/^\+?227/, '');
    return Array.isArray(recentAmounts[clean]) ? recentAmounts[clean] : [];
  }, [selectedContact, recentAmounts]);

  const ctaLabel = (() => {
    if (!selectedContact) return 'Choisir un destinataire';
    if (numericAmount < 100) return 'Saisir un montant';
    if (numericAmount > balance) return 'Solde insuffisant';
    return `Envoyer ${numericAmount.toLocaleString('fr-FR')} FCFA`;
  })();

  const ctaDisabled = !canSend;

  const ctaHint = (() => {
    if (!ctaDisabled) return '';
    if (!selectedContact) return 'Sélectionnez d\'abord un destinataire';
    if (numericAmount === 0) return 'Saisissez un montant pour continuer';
    if (numericAmount < 100) return 'Le montant minimum est de 100 FCFA';
    if (numericAmount > balance) return 'Solde insuffisant pour ce montant';
    return '';
  })();

  const receiptModalWidth = width ? width - 24 : 340;
  const receiptMaxHeight = height ? Math.min(height * 0.94, height - 40) : 700;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* ═══════════ BANNIÈRE FLOTTANTE PREMIUM ═══════════ */}
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

      {/* ═══════════ HEADER ═══════════ */}
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
        <Text style={styles.label}>Envoyer à</Text>

        <Animated.View style={{ transform: [{ scale: beneficiaryPulse }] }}>
          <TouchableOpacity
            style={[
              styles.beneficiaryButton,
              selectedContact && styles.beneficiaryButtonFilled,
            ]}
            onPress={openPicker}
            activeOpacity={0.7}
          >
            {selectedContact ? (
              <>
                <View style={[styles.beneficiaryAvatar, { backgroundColor: selectedContact.color || COLORS.primary }]}>
                  <Text style={styles.beneficiaryAvatarText}>
                    {selectedContact.avatar || buildInitials(selectedContact.name)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.beneficiaryName} numberOfLines={1}>
                    {selectedContact.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text style={styles.beneficiaryPhone}>
                      +227 {selectedContact.phone}
                    </Text>
                    {(() => {
                      const op = detectNigerOperator(selectedContact.phone);
                      if (!op) return null;
                      return (
                        <View style={[styles.contactOperatorBadge, { backgroundColor: op.bgColor, borderColor: op.borderColor }]}>
                          <View style={[styles.contactOperatorDot, { backgroundColor: op.color }]} />
                          <Text style={[styles.contactOperatorText, { color: op.textColor }]}>{op.shortName}</Text>
                        </View>
                      );
                    })()}
                  </View>
                </View>
                {selectedContact.isFavorite && (
                  <View style={styles.favoriteBadge}>
                    <IconStar filled={true} />
                  </View>
                )}
                <IconArrowRight color={COLORS.primary} size={16} />
              </>
            ) : (
              <>
                <View style={styles.beneficiaryEmptyIcon}>
                  <IconContact color={COLORS.primary} size={22} />
                </View>
                <Text style={styles.beneficiaryEmptyText}>Choisir un destinataire</Text>
                <IconArrowRight color={COLORS.primary} size={16} />
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        <RecentNumbersBar
          onSelectNumber={(num, label) => {
            const existing = contacts.find((c) => String(c.phone).replace(/\D/g, '').endsWith(num));
            if (existing) {
              setSelectedContact(existing);
            } else {
              const display = label || ('+227 ' + num);
              setSelectedContact({
                id: 'recent-' + num,
                name: display,
                phone: num,
                avatar: buildInitials(display),
                color: COLORS.primary,
                isFavorite: false,
                isFromQR: false,
              });
            }
          }}
          currentValue={selectedContact?.phone || ''}
          transactions={transactions}
        />

        <Text style={[styles.label, { marginTop: 28 }]}>Montant</Text>

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

        {selectedContact && recentSuggestions.length > 0 && !amountError ? (
          <View style={styles.recentAmountsRow}>
            <Text style={styles.recentAmountsLabel}>Déjà envoyé</Text>
            <View style={styles.recentAmountsChips}>
              {recentSuggestions.map((v, idx) => (
                <TouchableOpacity
                  key={`recent-${idx}-${v}`}
                  style={[
                    styles.recentAmountChip,
                    numericAmount === v && styles.recentAmountChipActive,
                  ]}
                  onPress={() => {
                    triggerSelectionHaptic();
                    triggerAmountPop(amountScale);
                    setAmount(String(v));
                  }}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.recentAmountChipText,
                      numericAmount === v && styles.recentAmountChipTextActive,
                    ]}
                  >
                    {v.toLocaleString('fr-FR')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          !amountError && balance > 0 && (
            <View style={styles.recentAmountsRow}>
              <Text style={styles.recentAmountsLabel}>Montants rapides</Text>
              <View style={styles.recentAmountsChips}>
                {[1000, 2000, 5000, 10000].map((v) => (
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
          )
        )}

        {!amountError && (
          <Text style={styles.balanceHint}>
            Solde disponible · {balance.toLocaleString('fr-FR')} FCFA
          </Text>
        )}

        {canSend && !pinRequired && (
          <VoiceAssistantButton
            type="transfer_p2p"
            amount={numericAmount}
            recipientName={selectedContact?.name || ''}
            recipientPhone={selectedContact?.phone || ''}
            containerStyle={{ marginTop: 18 }}
          />
        )}

        {pinRequired && (
          <View style={styles.pinInline}>
            {pinLockout.isLocked ? (
              <View style={styles.pinLockoutContainer}>
                <Text style={styles.pinLockoutTitle}>⏳ Compte temporairement bloqué</Text>
                <Text style={styles.pinLockoutTimer}>
                  {formatRemainingCountdown(pinLockout.remainingMs)}
                </Text>
                <Text style={styles.pinLockoutSub}>
                  3 tentatives incorrectes consécutives ont été détectées.
                </Text>
                <TouchableOpacity
                  style={styles.pinLockoutCancelBtn}
                  onPress={() => {
                    setPinRequired(false);
                    setPin('');
                    Keyboard.dismiss();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.pinLockoutCancelText}>Fermer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <VoiceAssistantButton
                  type="transfer_p2p"
                  amount={numericAmount}
                  recipientName={selectedContact?.name || ''}
                  recipientPhone={selectedContact?.phone || ''}
                  containerStyle={{ marginBottom: 12, marginTop: 0 }}
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
                    editable={!isVerifyingAuth && !isSending}
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
                    disabled={isVerifyingAuth || isSending}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.pinInlineCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.pinInlineConfirm,
                      (!pin || pin.length < 8 || isVerifyingAuth || isSending) && styles.pinInlineConfirmDisabled,
                    ]}
                    onPress={confirmWithPin}
                    disabled={!pin || pin.length < 8 || isVerifyingAuth || isSending}
                    activeOpacity={0.85}
                  >
                    {isVerifyingAuth || isSending ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.pinInlineConfirmText}>Confirmer</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {!pinRequired && (
        <View style={[styles.ctaContainer, { paddingBottom: Math.max(insets.bottom, 14) + 12 }]}>
          <TouchableOpacity
            style={[styles.cta, ctaDisabled && styles.ctaDisabled]}
            onPress={handleConfirm}
            disabled={ctaDisabled}
            activeOpacity={0.85}
          >
            {isSending || isVerifyingAuth ? (
              <View style={styles.ctaContent}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.ctaText}>
                  {isSending ? 'Envoi en cours…' : 'Vérification…'}
                </Text>
              </View>
            ) : (
              <View style={styles.ctaContent}>
                {isBiometricAvailable && useBiometric && canSend && (
                  <IconFingerprint color="#FFFFFF" size={20} />
                )}
                <Text style={[styles.ctaText, ctaDisabled && styles.ctaTextDisabled]}>
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

      {/* ═══════════ BOTTOM SHEET PICKER ═══════════ */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        transparent
        onRequestClose={closePicker}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} onPress={closePicker} activeOpacity={1} />
          <Animated.View
            style={[
              styles.sheetContent,
              { maxHeight: height * 0.85, transform: [{ translateY: sheetTranslateY }] },
            ]}
            {...sheetPanResponder.panHandlers}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>À qui envoyer ?</Text>
              <TouchableOpacity onPress={closePicker} style={styles.sheetCloseBtn} activeOpacity={0.7}>
                <IconClose />
              </TouchableOpacity>
            </View>

            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => { closePicker(); openQRScanner(); }}
                disabled={isVerifyingContact}
                activeOpacity={0.75}
              >
                <IconQR color={COLORS.primary} size={20} />
                <Text style={styles.quickActionLabel}>Scanner</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={openPhoneContacts}
                disabled={isVerifyingContact}
                activeOpacity={0.75}
              >
                {isVerifyingContact ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <IconContact color={COLORS.primary} size={20} />
                )}
                <Text style={styles.quickActionLabel}>
                  {isVerifyingContact ? 'Vérification…' : 'Répertoire'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchInputRow}>
              <Text style={styles.phonePrefixSmall}>+227</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Saisir un numéro"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                value={manualPhone}
                onChangeText={setManualPhone}
                maxLength={15}
              />
              {(() => {
                const op = detectNigerOperator(manualPhone);
                if (!op) return null;
                return (
                  <View style={[styles.inlineOperatorPill, { backgroundColor: op.bgColor, borderColor: op.borderColor }]}>
                    <View style={[styles.contactOperatorDot, { backgroundColor: op.color }]} />
                    <Text style={[styles.inlineOperatorText, { color: op.textColor }]}>{op.shortName}</Text>
                  </View>
                );
              })()}
              {manualPhone.length >= 8 && (
                <TouchableOpacity
                  style={styles.searchUseBtn}
                  onPress={handleUseManualPhone}
                  disabled={isVerifyingContact}
                  activeOpacity={0.85}
                >
                  {isVerifyingContact ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.searchUseBtnText}>OK</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {beneficiaryCheck === 'loading' && (
              <View style={styles.verifRow}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.verifText}>Vérification…</Text>
              </View>
            )}
            {beneficiaryCheck?.found === true && (
              <View style={styles.foundBanner}>
                <Text style={styles.foundBannerText}>
                  ✓ {beneficiaryCheck.name || beneficiaryCheck.displayName}
                </Text>
              </View>
            )}
            {beneficiaryCheck?.found === false && (
              <View style={styles.notFoundBanner}>
                <Text style={styles.notFoundBannerText}>⚠️ Numéro non enregistré sur NT Albey</Text>
              </View>
            )}

            <TextInput
              style={styles.contactSearchInput}
              placeholder="Rechercher dans mes contacts ou favoris…"
              placeholderTextColor={COLORS.textMuted}
              value={pickerSearch}
              onChangeText={setPickerSearch}
              autoCorrect={false}
            />

            <View style={styles.sheetSectionHeader}>
              <Text style={styles.sheetSectionTitle}>
                {pickerSearch
                  ? `Résultats de recherche (${filteredContacts.length})`
                  : `⭐ Bénéficiaires favoris (${filteredContacts.length})`}
              </Text>
              {!pickerSearch && filteredContacts.length > 0 && (
                <Text style={styles.sheetSectionSubtitle}>Envoi rapide en 1-clic</Text>
              )}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {isLoadingContacts ? (
                <View style={styles.sheetLoading}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.sheetLoadingText}>Chargement de vos bénéficiaires…</Text>
                </View>
              ) : filteredContacts.length === 0 ? (
                <View style={styles.sheetEmpty}>
                  <Text style={styles.sheetEmptyEmoji}>⭐</Text>
                  <Text style={styles.sheetEmptyTitle}>
                    {pickerSearch ? 'Aucun contact correspondant' : 'Aucun bénéficiaire enregistré'}
                  </Text>
                  <Text style={styles.sheetEmptySubtitle}>
                    {pickerSearch
                      ? `Aucun contact ne correspond à « ${pickerSearch} ». Vous pouvez saisir le numéro ci-dessus.`
                      : 'Dès que vous envoyez de l\'argent à un destinataire, il est automatiquement enregistré ici comme favori.'}
                  </Text>
                </View>
              ) : (
                filteredContacts.map((contact, idx) => (
                  <TouchableOpacity
                    key={`contact-${contact.id}-${idx}`}
                    style={styles.contactRow}
                    onPress={() => handleSelectContact(contact)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.contactRowAvatar, { backgroundColor: contact.color || COLORS.primary }]}>
                      <Text style={styles.contactRowAvatarText}>
                        {contact.avatar || buildInitials(contact.name)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.contactRowNameWrap}>
                        <Text style={styles.contactRowName} numberOfLines={1}>
                          {contact.name}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Text style={styles.contactRowPhone}>+227 {contact.phone}</Text>
                        {(() => {
                          const op = detectNigerOperator(contact.phone);
                          if (!op) return null;
                          return (
                            <View style={[styles.contactOperatorBadge, { backgroundColor: op.bgColor, borderColor: op.borderColor }]}>
                              <View style={[styles.contactOperatorDot, { backgroundColor: op.color }]} />
                              <Text style={[styles.contactOperatorText, { color: op.textColor }]}>{op.shortName}</Text>
                            </View>
                          );
                        })()}
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.contactRowStarBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        toggleFavorite(contact.phone);
                      }}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      activeOpacity={0.7}
                    >
                      <IconStar filled={!!contact.isFavorite} color={contact.isFavorite ? '#F59E0B' : '#CBD5E1'} size={18} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* ═══════════ SCANNER QR ═══════════ */}
      <Modal
        visible={qrScannerVisible}
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => { if (!isVerifyingQR) closeQRScanner(); }}
      >
        <View style={styles.qrScannerContainer} onLayout={(e) => setQrContainerSize(e.nativeEvent.layout)}>
          {!qrPermission ? (
            <View style={styles.qrCenterContainer}>
              <ActivityIndicator size="large" color="#00E676" />
              <Text style={styles.qrLoadingText}>Initialisation caméra…</Text>
            </View>
          ) : !qrPermission.granted ? (
            <View style={styles.qrCenterContainer}>
              <View style={styles.qrPermissionIcon}><Text style={{ fontSize: 48 }}>📷</Text></View>
              <Text style={styles.qrPermissionTitle}>Accès caméra requis</Text>
              <Text style={styles.qrPermissionText}>
                Pour scanner un QR Code, NT Albey a besoin d'accéder à votre caméra.
              </Text>
              <TouchableOpacity style={styles.qrPermissionButton} onPress={requestQrPermission} activeOpacity={0.85}>
                <Text style={styles.qrPermissionButtonText}>Autoriser la caméra</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.qrCancelLink} onPress={closeQRScanner}>
                <Text style={styles.qrCancelLinkText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                enableTorch={qrTorchOn}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={qrScanned ? undefined : handleQRBarcodeScanned}
              />
              <View style={[styles.qrDark, { top: 0, left: 0, right: 0, height: qrFrameTop }]} pointerEvents="none" />
              <View style={[styles.qrDark, { top: qrFrameTop + QR_FRAME_SIZE, left: 0, right: 0, bottom: 0 }]} pointerEvents="none" />
              <View style={[styles.qrDark, { top: qrFrameTop, left: 0, width: qrFrameLeft, height: QR_FRAME_SIZE }]} pointerEvents="none" />
              <View style={[styles.qrDark, { top: qrFrameTop, left: qrFrameLeft + QR_FRAME_SIZE, right: 0, height: QR_FRAME_SIZE }]} pointerEvents="none" />
              <View style={[styles.qrFrame, { top: qrFrameTop, left: qrFrameLeft, width: QR_FRAME_SIZE, height: QR_FRAME_SIZE }]} pointerEvents="none">
                <View style={[styles.qrCorner, styles.qrCornerTL]} />
                <View style={[styles.qrCorner, styles.qrCornerTR]} />
                <View style={[styles.qrCorner, styles.qrCornerBL]} />
                <View style={[styles.qrCorner, styles.qrCornerBR]} />
                {!qrScanned && !isVerifyingQR && (
                  <Animated.View style={[styles.qrScanLine, { transform: [{ translateY: qrScanLineTranslateY }] }]} />
                )}
              </View>
              {!isVerifyingQR && (
                <View style={[styles.qrInstructionWrapper, { top: qrFrameTop + QR_FRAME_SIZE + 26 }]} pointerEvents="none">
                  <Text style={styles.qrInstructionTitle}>Alignez le QR Code</Text>
                </View>
              )}
              {isVerifyingQR && (
                <View style={styles.qrVerifyingOverlay}>
                  <View style={styles.qrVerifyingBox}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.qrVerifyingText}>Vérification…</Text>
                  </View>
                </View>
              )}
              {!isVerifyingQR && (
                <TouchableOpacity style={styles.qrCloseButton} onPress={closeQRScanner} activeOpacity={0.85}>
                  <IconBackWhite />
                </TouchableOpacity>
              )}
              {!isVerifyingQR && (
                <TouchableOpacity style={styles.qrTorchButton} onPress={() => setQrTorchOn(v => !v)} activeOpacity={0.85}>
                  {qrTorchOn ? <IconFlashOn /> : <IconFlashOff />}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </Modal>

      {/* ═══════════ OVERLAY VALIDATION ANIMÉE & CHIME ═══════════ */}
      <SuccessCheckmarkOverlay
        visible={successOverlayVisible}
        title="Transfert réussi !"
        amount={transactionDetails?.amount || numericAmount}
        subtitle={
          selectedContact?.name
            ? `Envoyé à ${selectedContact.name}`
            : selectedContact?.phone
            ? `Envoyé au ${selectedContact.phone}`
            : 'Transfert de compte à compte'
        }
        onDismiss={() => {
          setSuccessOverlayVisible(false);
          setReceiptModalVisible(true);
        }}
      />

      {/* ═══════════ MODAL REÇU ═══════════ */}
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
                    <Text style={styles.receiptSectionLabel}>PARTICIPANTS</Text>
                    <View style={styles.receiptParticipantCard}>
                      <View style={styles.receiptParticipantBadgeFrom}>
                        <Text style={styles.receiptParticipantBadgeText}>DE</Text>
                      </View>
                      <View style={styles.receiptParticipantInfo}>
                        <Text style={styles.receiptParticipantName} numberOfLines={1}>
                          {transactionDetails.senderName || 'Moi'}
                        </Text>
                        <Text style={styles.receiptParticipantPhone}>
                          {transactionDetails.senderPhone ? `+227 ${transactionDetails.senderPhone}` : 'Mon compte'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.receiptParticipantArrowWrap}>
                      <Text style={styles.receiptParticipantArrow}>↓</Text>
                    </View>
                    <View style={[styles.receiptParticipantCard, { marginBottom: 0 }]}>
                      <View style={styles.receiptParticipantBadgeTo}>
                        <Text style={styles.receiptParticipantBadgeText}>À</Text>
                      </View>
                      <View style={styles.receiptParticipantInfo}>
                        <Text style={styles.receiptParticipantName} numberOfLines={1}>
                          {transactionDetails.beneficiary || 'Bénéficiaire'}
                        </Text>
                        <Text style={styles.receiptParticipantPhone}>
                          +227 {transactionDetails.phone || 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.receiptCard}>
                    <Text style={styles.receiptSectionLabel}>MONTANTS</Text>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>💰 Montant envoyé</Text>
                      <Text style={[styles.receiptValue, styles.receiptValueSent]}>
                        {transactionDetails.amount || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>📋 Frais</Text>
                      <Text style={[styles.receiptValue, styles.receiptValueFees]}>
                        {transactionDetails.fees || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>🎁 Net reçu</Text>
                      <Text style={[styles.receiptValue, styles.receiptValueNet]}>
                        {transactionDetails.netAmount != null
                          ? transactionDetails.netAmount.toLocaleString() + ' ' + (transactionDetails.currency || 'XOF')
                          : 'N/A'}
                      </Text>
                    </View>
                    <View style={[styles.receiptRow, styles.receiptRowTotal]}>
                      <Text style={styles.receiptLabelTotal}>💳 Total débité</Text>
                      <Text style={styles.receiptValueTotal}>{transactionDetails.total || 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={styles.receiptCodeCard}>
                    <View style={styles.receiptCodeHeader}>
                      <IconSparkle />
                      <Text style={styles.receiptCodeLabel}>RÉFÉRENCE</Text>
                    </View>
                    <Text style={styles.receiptCode}>
                      {transactionDetails.reference || 'En attente…'}
                    </Text>
                    {transactionDetails.transactionId && (
                      <>
                        <View style={styles.receiptUuidSeparator} />
                        <Text style={styles.receiptUuidLabel}>🆔 ID TECHNIQUE</Text>
                        <Text style={styles.receiptUuidValue} numberOfLines={2} ellipsizeMode="middle">
                          {transactionDetails.transactionId}
                        </Text>
                      </>
                    )}
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
                style={styles.receiptNewTransferButton}
                onPress={startNewTransfer}
                activeOpacity={0.85}
              >
                <Text style={styles.receiptNewTransferText}>↻ Nouveau transfert</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.receiptDoneButton}
                onPress={finishSend}
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

  // Bénéficiaire
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
  beneficiaryAvatarText: {
    color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5,
  },
  beneficiaryName: {
    fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.2,
  },
  beneficiaryPhone: {
    fontSize: 12, color: COLORS.textSecondary, marginTop: 2, fontWeight: '500',
  },
  favoriteBadge: {
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  beneficiaryEmptyIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  beneficiaryEmptyText: {
    flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.textSecondary,
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
  balanceHint: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 14,
  },

  // Hint clavier
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

  // Caret custom
  customCaret: {
    position: 'absolute',
    width: 3,
    height: 56,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    top: '50%',
    marginTop: -28,
  },

  // Montants récents
  recentAmountsRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  recentAmountsLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  recentAmountsChips: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  recentAmountChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  recentAmountChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  recentAmountChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  recentAmountChipTextActive: {
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

  // Bottom sheet picker
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
  },
  sheetTitle: {
    fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.5,
  },
  sheetCloseBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },

  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceAlt,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  quickActionLabel: {
    fontSize: 13, fontWeight: '700', color: COLORS.textPrimary,
  },

  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  phonePrefixSmall: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: COLORS.primarySoft,
    borderRightWidth: 1,
    borderRightColor: COLORS.primary + '20',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  searchUseBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    marginRight: 6,
    borderRadius: 10,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchUseBtnText: {
    color: '#FFFFFF', fontSize: 13, fontWeight: '800',
  },

  verifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  verifText: {
    fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', fontWeight: '500',
  },
  foundBanner: {
    backgroundColor: COLORS.successSoft,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  foundBannerText: {
    fontSize: 12.5, fontWeight: '700', color: COLORS.primary,
  },
  notFoundBanner: {
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  notFoundBannerText: {
    fontSize: 12.5, fontWeight: '700', color: COLORS.danger,
  },

  contactSearchInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    marginBottom: 10,
  },

  sheetSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
    marginTop: 2,
  },
  sheetSectionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.1,
  },
  sheetSectionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },

  sheetLoading: { alignItems: 'center', paddingVertical: 40 },
  sheetLoadingText: {
    fontSize: 12.5,
    color: COLORS.textMuted,
    marginTop: 10,
    fontWeight: '500',
  },
  sheetEmpty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  sheetEmptyEmoji: { fontSize: 36, marginBottom: 8 },
  sheetEmptyTitle: { fontSize: 14.5, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  sheetEmptySubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
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
  contactRowAvatarText: {
    color: '#FFFFFF', fontSize: 15, fontWeight: '800',
  },
  contactRowNameWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2,
  },
  contactRowName: {
    fontSize: 14.5, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.1,
  },
  contactRowStar: { width: 12, height: 12 },
  contactRowStarBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactRowPhone: {
    fontSize: 11.5, color: COLORS.textMuted, fontWeight: '500',
  },

  // 🏷️ Badges opérateurs & lockout
  contactOperatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    gap: 4,
  },
  contactOperatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  contactOperatorText: {
    fontSize: 10,
    fontWeight: '800',
  },
  inlineOperatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
    gap: 5,
  },
  inlineOperatorText: {
    fontSize: 11,
    fontWeight: '800',
  },
  pinLockoutContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  pinLockoutTitle: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  pinLockoutTimer: {
    color: '#DC2626',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  pinLockoutSub: {
    color: '#7F1D1D',
    fontSize: 11.5,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
  },
  pinLockoutCancelBtn: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  pinLockoutCancelText: {
    color: '#991B1B',
    fontSize: 12.5,
    fontWeight: '700',
  },

  // QR Scanner
  qrScannerContainer: { flex: 1, backgroundColor: '#000', position: 'relative', overflow: 'hidden' },
  qrCenterContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, backgroundColor: '#000' },
  qrLoadingText: { marginTop: 14, color: '#94A3B8', fontSize: 14 },
  qrPermissionIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(0,230,118,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  qrPermissionTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  qrPermissionText: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 24, lineHeight: 21 },
  qrPermissionButton: { backgroundColor: COLORS.primary, paddingVertical: 15, paddingHorizontal: 32, borderRadius: 14, alignItems: 'center', marginBottom: 14 },
  qrPermissionButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  qrCancelLink: { marginTop: 10, padding: 8 },
  qrCancelLinkText: { color: '#94A3B8', fontSize: 13 },
  qrDark: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.72)' },
  qrFrame: { position: 'absolute' },
  qrCorner: { position: 'absolute', width: 40, height: 40, borderColor: '#00E676' },
  qrCornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 20 },
  qrCornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 20 },
  qrCornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 20 },
  qrCornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 20 },
  qrScanLine: { position: 'absolute', left: 10, right: 10, top: 0, height: 3, borderRadius: 2, backgroundColor: '#00E676', shadowColor: '#00E676', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 10, elevation: 8 },
  qrInstructionWrapper: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  qrInstructionTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  qrVerifyingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  qrVerifyingBox: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, alignItems: 'center', minWidth: 200 },
  qrVerifyingText: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginTop: 16, textAlign: 'center' },
  qrCloseButton: { position: 'absolute', top: 52, left: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', zIndex: 20 },
  qrTorchButton: { position: 'absolute', bottom: 60, width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignSelf: 'center', left: '50%', marginLeft: -28 },

  // Reçu
  receiptOverlay: { flex: 1, backgroundColor: 'rgba(11,18,32,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, paddingTop: 40, paddingBottom: 30 },
  receiptModalContent: { backgroundColor: COLORS.surface, borderRadius: 24, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 0, overflow: 'hidden', flexDirection: 'column' },
  receiptHeader: { alignItems: 'center', marginBottom: 10, flexShrink: 0 },
  receiptIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.successSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  receiptIconText: { fontSize: 24 },
  receiptTitle: { fontSize: 17, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.3 },
  receiptSubtitle: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },
  receiptScroll: { flexShrink: 1, marginTop: 2 },
  receiptScrollContent: { paddingBottom: 8 },
  receiptActionsContainer: { paddingTop: 10, paddingBottom: 16, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.borderSoft, flexShrink: 0 },
  receiptCard: { backgroundColor: COLORS.surfaceAlt, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.borderSoft },
  receiptSectionLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  receiptRowTotal: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 4, paddingTop: 8 },
  receiptLabel: { fontSize: 12, color: COLORS.textSecondary, flexShrink: 0, fontWeight: '500' },
  receiptLabelTotal: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  receiptValue: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right', flex: 1, marginLeft: 8 },
  receiptValueSent: { color: COLORS.accent, fontWeight: '800' },
  receiptValueFees: { color: COLORS.danger, fontWeight: '700' },
  receiptValueNet: { color: COLORS.success, fontWeight: '700' },
  receiptValueTotal: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  receiptParticipantCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: COLORS.borderSoft, marginBottom: 4 },
  receiptParticipantBadgeFrom: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  receiptParticipantBadgeTo: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  receiptParticipantBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: 0.5 },
  receiptParticipantInfo: { flex: 1 },
  receiptParticipantName: { fontSize: 12.5, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.1, marginBottom: 1 },
  receiptParticipantPhone: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: 0.2 },
  receiptParticipantArrowWrap: { alignItems: 'center', marginVertical: 1, marginBottom: 4 },
  receiptParticipantArrow: { fontSize: 12, color: COLORS.textMuted, fontWeight: '800' },
  receiptCodeCard: { backgroundColor: COLORS.accentSoft, borderRadius: 14, padding: 12, marginBottom: 8, alignItems: 'center', borderWidth: 1, borderColor: COLORS.accent + '25' },
  receiptCodeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  receiptCodeLabel: { fontSize: 9, color: '#7A4A1A', textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: '800' },
  receiptCode: { fontSize: 15, fontWeight: '800', color: COLORS.accent, letterSpacing: 1.8, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', textAlign: 'center' },
  receiptUuidSeparator: { height: 1, backgroundColor: COLORS.accent + '30', marginVertical: 8, width: '80%' },
  receiptUuidLabel: { fontSize: 8.5, color: '#7A4A1A', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: '700', opacity: 0.7 },
  receiptUuidValue: { fontSize: 9.5, color: '#7A4A1A', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', textAlign: 'center', paddingHorizontal: 6, opacity: 0.85 },
  receiptDate: { textAlign: 'center', fontSize: 10.5, color: COLORS.textMuted, marginBottom: 2, fontWeight: '600' },
  receiptButtons: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  receiptButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  receiptCopyButton: { backgroundColor: COLORS.primarySoft, borderWidth: 1.5, borderColor: COLORS.primary + '30' },
  receiptCopyButtonText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  receiptShareButton: { backgroundColor: COLORS.accentSoft, borderWidth: 1.5, borderColor: COLORS.accent + '30' },
  receiptShareButtonText: { fontSize: 13, fontWeight: '800', color: COLORS.accent },
  receiptNewTransferButton: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  receiptNewTransferText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  receiptDoneButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  receiptDoneButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.3, textAlign: 'center' },
});