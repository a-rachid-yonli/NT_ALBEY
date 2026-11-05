// ╔══════════════════════════════════════════════════════════════════════╗
// ║                    NT ALBEY — screens/ShopScreen.js                  ║
// ║                          Version 18.0.0                              ║
// ║                                                                      ║
// ║  ✨ NOUVEAUTÉS v18 :                                                 ║
// ║  ├── Zone montant premium (focus vert, bordure pointillée, caret)   ║
// ║  ├── Placeholder "Combien ?" + hint "⌨️ Touchez pour saisir"         ║
// ║  ├── CTA désactivé avec texte d'aide explicatif                     ║
// ║  └── Auto-focus du montant à l'arrivée                              ║
// ║                                                                      ║
// ║  ✅ v17.1 : grille services 2 colonnes                               ║
// ║  ✅ v17.0 : homogénéisation totale                                   ║
// ║                                                                      ║
// ║  ⚠️ LOGIQUE MÉTIER INCHANGÉE (API, validations, notifications, etc.)  ║
// ╚══════════════════════════════════════════════════════════════════════╝

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Modal,
  Image,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
  Animated,
  Easing,
  Keyboard,
  PanResponder,
  FlatList,
  Vibration,
} from 'react-native';
import { TranslatedText as Text, TranslatedTextInput as TextInput, TranslatedAlert as Alert, ThemedView as View, ThemedTouchableOpacity as TouchableOpacity, ThemedScrollView as ScrollView, ThemedKeyboardAvoidingView as KeyboardAvoidingView } from '../context/LanguageContext';
import { humanizeError } from '../utils/errorHandler';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import * as LocalAuthentication from 'expo-local-authentication';

import { useTransactions } from '../context/TransactionContext';
import { API } from '../services/api';
import { pickPhoneContact } from '../utils/contactPicker';
import RecentNumbersBar, { saveRecentNumber } from '../components/RecentNumbersBar';
import VoiceAssistantButton from '../components/VoiceAssistantButton';
import SuccessCheckmarkOverlay from '../components/SuccessCheckmarkOverlay';
import { triggerAmountShake, triggerAmountPop, getAmountErrorMessage } from '../utils/amountEffects';
import { triggerSuccessHaptic, triggerSelectionHaptic } from '../utils/haptics';
import {
  verifyTransactionAuth,
  AUTH_METHOD,
  AUTH_CANCELLED,
} from '../utils/transactionAuth';
import { isValidPin } from '../utils/validators';
import { guardSensitiveOperation } from '../utils/security';
import { saveTxMetadata } from '../utils/txRefCache';
import { saveShopTx } from '../utils/shopTxStore';

/* ═══════════════════════════════════════════════════════════════════════
   PALETTE PREMIUM — HARMONISÉE
   ═══════════════════════════════════════════════════════════════════════ */

const COLORS = {
  primary:       '#008933',
  primarySoft:   '#E8F5E9',
  primaryDark:   '#006B28',
  accent:        '#FF6600',
  accentSoft:    '#FFF3E0',
  purple:        '#8B5CF6',
  purpleSoft:    '#EDE9FE',
  teal:          '#10B981',
  tealSoft:      '#D1FAE5',
  sky:           '#0EA5E9',
  skySoft:       '#E0F2FE',
  blue:          '#3B82F6',
  blueSoft:      '#DBEAFE',
  gold:          '#F59E0B',
  goldSoft:      '#FEF3C7',
  textPrimary:   '#0B1220',
  textSecondary: '#5A6474',
  textMuted:     '#A0A8B4',
  border:        '#E7EAF0',
  borderSoft:    '#F3F5F9',
  surface:       '#FFFFFF',
  surfaceAlt:    '#FAFBFD',
  background:    '#FFFFFF',
  danger:        '#EF4444',
  dangerSoft:    '#FEE2E2',
  success:       '#10B981',
  successSoft:   '#D1FAE5',
  shadow:        '#0B1220',
};

/* ═══════════════════════════════════════════════════════════════════════
   ICÔNES SVG
   ═══════════════════════════════════════════════════════════════════════ */

const IconBack = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={COLORS.textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconShop = ({ size = 80 }) => (
  <Image
    source={require('../assets/images/boutique.png')}
    style={{ width: size, height: size, resizeMode: 'contain' }}
  />
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

/* ═══════════════════════════════════════════════════════════════════════
   ICÔNES ILLUSTRATIVES — Services de la Boutique
   ═══════════════════════════════════════════════════════════════════════ */

// 📦 STOCK — Entrepôt + flèche "charger vers le bas"
const IconStock = ({ color = COLORS.teal, size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 9 L12 3 L21 9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 9 V21 H19 V9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill={`${color}12`} />
    <Path d="M12 11.5 V17" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Path d="M9 14.5 L12 17.5 L15 14.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3 21 H21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

// 📱 CRÉDIT — Smartphone + ondes GSM
const IconCredit = ({ color = COLORS.accent, size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="7" y="3" width="10" height="18" rx="2" stroke={color} strokeWidth="1.8" fill={`${color}12`} />
    <Rect x="9" y="5.5" width="6" height="8.5" rx="0.5" stroke={color} strokeWidth="1.5" />
    <Circle cx="12" cy="18" r="1" fill={color} />
    <Path d="M5 7 A5 5 0 0 0 5 15" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M2.5 4.5 A8.5 8.5 0 0 0 2.5 17.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    <Path d="M19 7 A5 5 0 0 1 19 15" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M21.5 4.5 A8.5 8.5 0 0 1 21.5 17.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
  </Svg>
);

// 📞 SOFTPHONE — SIM card dans un cloud (eSIM)
const IconSoftphone = ({ color = COLORS.purple, size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M8 10 A3.5 3.5 0 0 1 11 7 A4 4 0 0 1 18 8 A3 3 0 0 1 18 13 H9 A3 3 0 0 1 8 10 Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" fill={`${color}15`} />
    <Path d="M8 15 L10.5 12.5 H18 V21 H8 Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" fill={`${color}10`} />
    <Rect x="11" y="16.5" width="3.5" height="3.5" rx="0.4" stroke={color} strokeWidth="1.3" />
    <Path d="M12.6 17.6 L12 18.8 H13.3 L12.7 19.9" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 📡 BLR — Antenne radio
const IconBLR = ({ color = COLORS.sky, size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 4 V21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M7 21 L12 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M17 21 L12 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M9 16 H15" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M10 10.5 H14" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Circle cx="12" cy="4" r="1.3" fill={color} />
    <Path d="M6.5 5.5 A4.5 4.5 0 0 0 6.5 11" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M17.5 5.5 A4.5 4.5 0 0 1 17.5 11" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M3.5 3 A8 8 0 0 0 3.5 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    <Path d="M20.5 3 A8 8 0 0 1 20.5 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
  </Svg>
);

const IconUser = ({ color = COLORS.primary }) => (
  <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.8" />
    <Path d="M5 20v-2a7 7 0 0114 0v2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconUsers = ({ color = COLORS.textMuted }) => (
  <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <Circle cx="9" cy="8" r="3.5" stroke={color} strokeWidth="1.8" />
    <Path d="M3 20v-2a6 6 0 0112 0v2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M16 4a4 4 0 010 8M18 20v-2a6 6 0 00-3-5.2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

/* ═══════════════════════════════════════════════════════════════════════
   HELPERS (logique métier — inchangés)
   ═══════════════════════════════════════════════════════════════════════ */

const buildFriendlyAlertMessage = (kind, rawMessage) => {
  const label =
    kind === 'airtime'   ? 'crédit téléphonique' :
    kind === 'softphone' ? 'crédit Softphone'    :
                           'stock';
  const raw = String(rawMessage || '');

  if (
    raw.includes('réessayez dans') ||
    raw.includes('Pas d\'inquiétude') ||
    raw.includes('notre support') ||
    raw.includes('désolé')
  ) {
    return raw;
  }

  return `😔 Nous n'avons pas pu recharger votre ${label}.\n\nPas d'inquiétude : aucune somme n'a été débitée de votre compte.\n\n👉 Merci de réessayer dans quelques instants. Si le problème persiste, notre support est là pour vous au 555.`;
};

const buildBlrSuccessMessage = (blrCode) => {
  return `Votre abonnement BLR a bien été renouvelé.\n\nNuméro : ${blrCode}`;
};

const buildBlrCheckErrorMessage = (rawMessage) => {
  const raw = String(rawMessage || '').toLowerCase();

  if (raw.includes('session') || raw.includes('reconnect') || raw.includes('expir')) {
    return 'Votre session a expiré. Veuillez vous reconnecter puis réessayer.';
  }
  if (raw.includes('introuvable') || raw.includes('invalide') || raw.includes('inconnu')) {
    return 'Ce numéro BLR est introuvable. Vérifiez le numéro et réessayez.';
  }
  if (raw.includes('trop de tentative') || raw.includes('429') || raw.includes('rate')) {
    return 'Trop de tentatives. Veuillez patienter quelques minutes puis réessayer.';
  }
  if (
    raw.includes('connexion') || raw.includes('réseau') || raw.includes('reseau') ||
    raw.includes('network')   || raw.includes('timeout') || raw.includes('serveur')
  ) {
    return 'Problème de connexion. Vérifiez votre réseau puis réessayez.';
  }
  if (raw.includes('indisponible') || raw.includes('momentan')) {
    return 'Le service est momentanément indisponible. Réessayez dans quelques instants.';
  }
  return 'La vérification n\'a pas pu être effectuée. Veuillez réessayer.';
};

const buildBlrRenewErrorMessage = (rawMessage) => {
  const raw = String(rawMessage || '').toLowerCase();

  if (raw.includes('session') || raw.includes('reconnect') || raw.includes('expir')) {
    return 'Votre session a expiré. Veuillez vous reconnecter puis réessayer.';
  }
  if (raw.includes('introuvable') || raw.includes('invalide') || raw.includes('inconnu')) {
    return 'Ce numéro BLR est introuvable. Vérifiez le numéro et réessayez.';
  }
  if (raw.includes('déjà') || raw.includes('deja') || raw.includes('conflict')) {
    return 'Cet abonnement BLR a déjà été renouvelé.';
  }
  if (raw.includes('trop de tentative') || raw.includes('429') || raw.includes('rate')) {
    return 'Trop de tentatives. Veuillez patienter quelques minutes puis réessayer.';
  }
  if (
    raw.includes('connexion') || raw.includes('réseau') || raw.includes('reseau') ||
    raw.includes('network')   || raw.includes('timeout') || raw.includes('serveur')
  ) {
    return 'Problème de connexion. Vérifiez votre réseau puis réessayez.';
  }
  if (raw.includes('indisponible') || raw.includes('momentan')) {
    return 'Le service est momentanément indisponible. Réessayez dans quelques instants.';
  }
  return 'Le renouvellement n\'a pas pu être effectué. Veuillez réessayer.';
};

const cleanNigerPhone = (raw) =>
  String(raw || '').replace(/[\s\-()\.]/g, '').replace(/^\+?227/, '');

const isValidNigerPhoneLocal = (raw) =>
  /^(83|93)\d{6}$/.test(cleanNigerPhone(raw));

const cleanBlrNumber = (raw) =>
  String(raw || '').trim().toUpperCase().replace(/\s/g, '');

const notifyShopPurchase = async ({
  title,
  message,
  type = 'success',
  reference = null,
  transactionId = null,
}) => {
  try {
    await API.addNotification({
      title,
      message,
      type,
      reference: reference || undefined,
      transactionId: transactionId || undefined,
    });
    if (__DEV__) console.log('✅ [Shop] Notification créée :', title);
  } catch (e) {
    if (__DEV__) console.warn('⚠️ [Shop] Impossible de créer la notification :', e?.message);
  }
};

const cacheShopTxMetadata = async (txId, meta) => {
  if (!txId) return;
  try {
    await saveTxMetadata(String(txId), meta);
    if (__DEV__) console.log('💾 [Shop] Metadata cachée pour tx', txId);
  } catch (e) {
    if (__DEV__) console.warn('⚠️ [Shop] Impossible de cacher la metadata :', e?.message);
  }
};

const hapticTap = (intensity = 'light') => {
  if (Platform.OS === 'web') return;
  try {
    if (intensity === 'heavy') Vibration.vibrate(20);
    else if (intensity === 'medium') Vibration.vibrate(12);
    else Vibration.vibrate(6);
  } catch (_) {}
};

/* ═══════════════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ═══════════════════════════════════════════════════════════════════════ */

export default function ShopScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width = 400, height = 800 } = useWindowDimensions();

  /* ─── Navigation interne ─────────────────────────────────────────── */
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct]   = useState(null);
  const [mainCategories, setMainCategories]     = useState([]);
  const [isLoading, setIsLoading]               = useState(true);

  /* ─── Modal + Auth ───────────────────────────────────────────────── */
  const [modalVisible, setModalVisible]         = useState(false);
  const [successOverlayVisible, setSuccessOverlayVisible] = useState(false);
  const [successOverlayData, setSuccessOverlayData] = useState({
    title: 'Achat réussi !',
    amount: '',
    subtitle: '',
  });

  const triggerSuccessOverlay = ({ title, amount, subtitle }) => {
    setSuccessOverlayData({
      title: title || 'Achat réussi !',
      amount: amount || '',
      subtitle: subtitle || '',
    });
    setSuccessOverlayVisible(true);
  };
  const [pin, setPin]                           = useState('');
  const [pinVisible, setPinVisible]             = useState(false);
  const [pinRequired, setPinRequired]           = useState(false);
  const pinInputRef = useRef(null);

  /* ─── Champs Stock / Crédit / Softphone ──────────────────────────── */
  const [stockAmount, setStockAmount]               = useState('');
  const [airtimeAmount, setAirtimeAmount]           = useState('');
  const [softphoneAmount, setSoftphoneAmount]       = useState('');
  const [airtimeMode, setAirtimeMode]               = useState('self');
  const [airtimeTargetPhone, setAirtimeTargetPhone] = useState('');
  const [softphoneTargetPhone, setSoftphoneTargetPhone] = useState('');

  /* ─── Focus / animations montant ────────────────────────────────── */
  const [amountFocused, setAmountFocused] = useState(false);
  const stockAmountInputRef = useRef(null);
  const airtimeAmountInputRef = useRef(null);
  const softphoneAmountInputRef = useRef(null);

  const amountOpacity = useRef(new Animated.Value(1)).current;
  const caretOpacity = useRef(new Animated.Value(1)).current;
  const amountScale = useRef(new Animated.Value(1)).current;
  const amountShakeAnim = useRef(new Animated.Value(0)).current;

  /* ─── BLR ────────────────────────────────────────────────────────── */
  const [blrNumber, setBlrNumber]   = useState('');
  const [blrLoading, setBlrLoading] = useState(false);
  const [blrResult, setBlrResult]   = useState(null);
  const [blrError, setBlrError]     = useState(null);

  /* ─── Biométrie ──────────────────────────────────────────────────── */
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [useBiometric, setUseBiometric]                 = useState(false);

  /* ─── Auth / Process ─────────────────────────────────────────────── */
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(false);
  const [isProcessing, setIsProcessing]       = useState(false);

  /* ─── User connecté ──────────────────────────────────────────────── */
  const [currentUserPhone, setCurrentUserPhone] = useState(null);
  const [currentUserName,  setCurrentUserName]  = useState(null);
  const [userId, setUserId]                     = useState(null);

  /* ─── Toast ──────────────────────────────────────────────────────── */
  const [toast, setToast] = useState(null);
  const toastAnim = useRef(new Animated.Value(-150)).current;

  /* ─── PanResponder pour le sheet ─────────────────────────────────── */
  const sheetTranslateY = useRef(new Animated.Value(0)).current;

  /* ─── Hooks context ──────────────────────────────────────────────── */
  const { balance = 0, refreshWallet, refreshData } = useTransactions();

  /* ─── Gestion propre des timers de refresh ───────────────────────── */
  const refreshTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, []);

  const refreshAfterPurchase = async (label = 'achat') => {
    try {
      if (__DEV__) console.log(`⏳ [Shop] Attente commit backend après ${label}...`);
      await new Promise((r) => setTimeout(r, 1200));
      if (typeof refreshData === 'function') {
        await refreshData();
        if (__DEV__) console.log(`✅ [Shop] Historique rafraîchi après ${label}`);
      } else if (typeof refreshWallet === 'function') {
        await refreshWallet();
        if (__DEV__) console.log(`✅ [Shop] Wallet rafraîchi (fallback) après ${label}`);
      }
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(async () => {
        try {
          if (typeof refreshData === 'function') {
            await refreshData();
            if (__DEV__) console.log(`✅ [Shop] Retry refresh après ${label}`);
          }
        } catch (_) {}
        refreshTimerRef.current = null;
      }, 2000);
    } catch (e) {
      if (__DEV__) console.warn(`⚠️ [Shop] Refresh post-${label} échoué :`, e?.message);
    }
  };

  /* ═══════════════════════════════════════════════════════════════════
     🎯 TOAST PREMIUM
     ═══════════════════════════════════════════════════════════════════ */
  const showToast = useCallback((type, title, message) => {
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
  }, [toastAnim]);

  /* ═══════════════════════════════════════════════════════════════════
     EFFETS
     ═══════════════════════════════════════════════════════════════════ */

  useEffect(() => {
    (async () => {
      try {
        const u = await API.getCurrentUser();
        if (u?.phone) {
          setCurrentUserPhone(String(u.phone).replace(/\s/g, '').replace(/^\+?227/, ''));
        }
        setCurrentUserName(u?.name || null);
        setUserId(u?.id || null);
      } catch (_) {}
    })();
  }, []);

  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const compatible     = await LocalAuthentication.hasHardwareAsync();
        const deviceEnrolled = await LocalAuthentication.isEnrolledAsync();
        let accountEnrolled = false;
        try {
          const user = await API.getCurrentUser();
          if (user?.phone) {
            accountEnrolled = await API.isPhoneEnrolledForBiometric(user.phone);
          }
        } catch (_) {
          accountEnrolled = false;
        }
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

  useEffect(() => {
    const loadMainCategories = async () => {
      try {
        const data = await API.getShopMainCategories();
        setMainCategories(data);
      } catch (error) {
        console.error('Erreur chargement catégories:', error);
        showToast('error', 'Erreur', 'Impossible de charger la boutique.');
      } finally {
        setIsLoading(false);
      }
    };
    loadMainCategories();
  }, [showToast]);

  /* ─── Animations du montant ─────────────────────────────────────── */
  useEffect(() => {
    Animated.sequence([
      Animated.timing(amountOpacity, { toValue: 0.6, duration: 90, useNativeDriver: true }),
      Animated.timing(amountOpacity, { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start();
  }, [stockAmount, airtimeAmount, softphoneAmount]);

  useEffect(() => {
    const hasValue =
      (selectedCategory === 'stock' && stockAmount) ||
      (selectedCategory === 'credit' && airtimeAmount) ||
      (selectedCategory === 'softphone' && softphoneAmount);

    if (!amountFocused || hasValue) {
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
  }, [amountFocused, stockAmount, airtimeAmount, softphoneAmount, selectedCategory]);

  /* ─── Auto-focus du montant à l'arrivée sur chaque catégorie ────── */
  useEffect(() => {
    if (!selectedCategory) return;
    if (selectedCategory === 'blr') return;
    const timer = setTimeout(() => {
      if (selectedCategory === 'stock') stockAmountInputRef.current?.focus();
      if (selectedCategory === 'credit') airtimeAmountInputRef.current?.focus();
      if (selectedCategory === 'softphone') softphoneAmountInputRef.current?.focus();
    }, 450);
    return () => clearTimeout(timer);
  }, [selectedCategory]);

  /* ═══════════════════════════════════════════════════════════════════
     AUTHENTIFICATION
     ═══════════════════════════════════════════════════════════════════ */

  const closeConfirmModal = useCallback(() => {
    if (isProcessing || isVerifyingAuth) return;
    setModalVisible(false);
    setPin('');
    setPinVisible(false);
    setPinRequired(false);
    setUseBiometric(isBiometricAvailable);
    sheetTranslateY.setValue(0);
  }, [isProcessing, isVerifyingAuth, isBiometricAvailable, sheetTranslateY]);

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

  const authenticateWithBiometrics = async () => {
    if (isProcessing || isVerifyingAuth) return;
    setIsVerifyingAuth(true);
    try {
      await verifyTransactionAuth(AUTH_METHOD.BIOMETRIC);
      await executePurchase();
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
    if (isProcessing || isVerifyingAuth) return;
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
      await executePurchase();
    } catch (error) {
      showToast('error', 'Mot de passe incorrect', error?.message || 'Le mot de passe saisi est incorrect.');
      setPin('');
    } finally {
      setIsVerifyingAuth(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════════════
     EXÉCUTION DE L'ACHAT — LOGIQUE MÉTIER INCHANGÉE
     ═══════════════════════════════════════════════════════════════════ */

  const executePurchase = async () => {
    if (!selectedProduct) return;
    if (!guardSensitiveOperation('cet achat')) {
      setModalVisible(false);
      return;
    }
    setIsProcessing(true);

    /* ─── STOCK (pour moi) ───────────────────────────────────────── */
    if (selectedProduct.isStock) {
      const amount = selectedProduct.finalAmount;
      try {
        const result = await API.sendStockToMe(amount);

        const txRef = result?.reference || result?.transaction_id || result?.id || null;
        const txId  = result?.id || result?.transaction_id || null;

        await notifyShopPurchase({
          title: '📦 Stock rechargé',
          message: `Votre stock NT Albey a été rechargé de ${amount.toLocaleString('fr-FR')} FCFA.`,
          type: 'success',
          reference: txRef,
          transactionId: txId,
        });

        await saveShopTx(userId, {
          id: txId || `shop_stock_${Date.now()}`,
          description: 'Recharge stock NT Albey',
          amount: -amount,
          date: new Date().toISOString(),
          reference: txRef,
          details: {
            trans_type: 'stock_recharge',
            entry_type: 'stock_recharge',
            currency: 'XOF',
            gross_amount: amount,
          },
        });

        if (txId) {
          await cacheShopTxMetadata(txId, {
            reference: txRef,
            sender_phone: currentUserPhone,
            sender_name: currentUserName,
            receiver_phone: currentUserPhone,
            receiver_name: currentUserName,
          });
        }

        setModalVisible(false);
        setPin('');
        setSelectedProduct(null);
        setStockAmount('');
        setUseBiometric(isBiometricAvailable);

        triggerSuccessOverlay({
          title: 'Stock rechargé !',
          amount,
          subtitle: 'Recharge stock NT Albey',
        });

        showToast(
          'success',
          '✅ Stock rechargé',
          result?.message || `Votre stock a été rechargé de ${amount.toLocaleString()} FCFA.`
        );

        await refreshAfterPurchase('stock');
      } catch (error) {
        const friendly = buildFriendlyAlertMessage('stock', error?.message);
        showToast('error', 'Recharge impossible', friendly);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    /* ─── CRÉDIT ─────────────────────────────────────────────────── */
    if (selectedProduct.isAirtime) {
      const amount = selectedProduct.finalAmount;
      const isForOther = selectedProduct.isForOther;
      const phoneNumber = selectedProduct.phoneNumber;

      try {
        let result;
        if (isForOther) {
          result = await API.sendAirtimeToPhone(phoneNumber, amount);
          saveRecentNumber(phoneNumber);
        } else {
          result = await API.sendAirtimeToMe(amount);
        }

        const txRef = result?.reference || result?.transaction_id || result?.id || null;
        const txId  = result?.id || result?.transaction_id || null;

        const amountStr = amount.toLocaleString('fr-FR');
        const title = isForOther ? '📤 Crédit envoyé' : '📱 Crédit rechargé';
        const message = isForOther
          ? `Vous avez envoyé ${amountStr} FCFA de crédit au +227 ${phoneNumber}.`
          : `Votre crédit téléphonique a été rechargé de ${amountStr} FCFA.`;

        await notifyShopPurchase({
          title,
          message,
          type: 'success',
          reference: txRef,
          transactionId: txId,
        });

        await saveShopTx(userId, {
          id: txId || `shop_airtime_${Date.now()}`,
          description: isForOther ? 'Envoi crédit téléphonique' : 'Recharge crédit (pour moi)',
          amount: -amount,
          date: new Date().toISOString(),
          reference: txRef,
          details: {
            trans_type: isForOther ? 'airtime_to_phone' : 'airtime_to_me',
            entry_type: isForOther ? 'airtime_to_phone' : 'airtime_to_me',
            currency: 'XOF',
            gross_amount: amount,
            receiver_phone: isForOther ? phoneNumber : null,
          },
        });

        if (txId) {
          await cacheShopTxMetadata(txId, {
            reference: txRef,
            sender_phone: currentUserPhone,
            sender_name: currentUserName,
            receiver_phone: isForOther ? phoneNumber : currentUserPhone,
            receiver_name: isForOther ? null : currentUserName,
          });
        }

        setModalVisible(false);
        setPin('');
        setSelectedProduct(null);
        setAirtimeAmount('');
        setAirtimeTargetPhone('');
        setAirtimeMode('self');
        setUseBiometric(isBiometricAvailable);

        triggerSuccessOverlay({
          title: isForOther ? 'Crédit envoyé !' : 'Crédit rechargé !',
          amount,
          subtitle: isForOther ? `Au +227 ${phoneNumber}` : 'Pour moi-même',
        });

        showToast(
          'success',
          isForOther ? '✅ Crédit envoyé' : '✅ Crédit rechargé',
          result?.message ||
            (isForOther
              ? `Vous avez rechargé le crédit de +227 ${phoneNumber} pour un montant de ${amount.toLocaleString()} FCFA.`
              : `Votre crédit téléphonique a été rechargé de ${amount.toLocaleString()} FCFA.`)
        );

        await refreshAfterPurchase('crédit');
      } catch (error) {
        const friendly = buildFriendlyAlertMessage('airtime', error?.message);
        showToast('error', 'Recharge impossible', friendly);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    /* ─── SOFTPHONE (toujours pour un tiers) ─────────────────────── */
    if (selectedProduct.isSoftphone) {
      const amount = selectedProduct.finalAmount;
      const phoneNumber = selectedProduct.phoneNumber;

      try {
        const result = await API.sendSoftphoneToPhone(phoneNumber, amount);

        const txRef = result?.reference || result?.transaction_id || result?.id || null;
        const txId  = result?.id || result?.transaction_id || null;

        await notifyShopPurchase({
          title: '📞 Softphone rechargé',
          message: `Vous avez envoyé ${amount.toLocaleString('fr-FR')} FCFA de crédit Softphone au +227 ${phoneNumber}.`,
          type: 'success',
          reference: txRef,
          transactionId: txId,
        });

        await saveShopTx(userId, {
          id: txId || `shop_softphone_${Date.now()}`,
          description: 'Envoi crédit Softphone',
          amount: -amount,
          date: new Date().toISOString(),
          reference: txRef,
          details: {
            trans_type: 'softphone_to_phone',
            entry_type: 'softphone_to_phone',
            currency: 'XOF',
            gross_amount: amount,
            receiver_phone: phoneNumber,
          },
        });

        if (txId) {
          await cacheShopTxMetadata(txId, {
            reference: txRef,
            sender_phone: currentUserPhone,
            sender_name: currentUserName,
            receiver_phone: phoneNumber,
            receiver_name: null,
          });
        }

        setModalVisible(false);
        setPin('');
        setSelectedProduct(null);
        setSoftphoneAmount('');
        setSoftphoneTargetPhone('');
        setUseBiometric(isBiometricAvailable);

        triggerSuccessOverlay({
          title: 'Softphone rechargé !',
          amount,
          subtitle: `Au +227 ${phoneNumber}`,
        });

        showToast(
          'success',
          '✅ Softphone envoyé',
          result?.message ||
            `Vous avez rechargé le Softphone de +227 ${phoneNumber} pour un montant de ${amount.toLocaleString()} FCFA.`
        );

        await refreshAfterPurchase('softphone');
      } catch (error) {
        const friendly = buildFriendlyAlertMessage('softphone', error?.message);
        showToast('error', 'Recharge impossible', friendly);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    /* ─── BLR : RÉABONNEMENT ────────────────────────────────────── */
    if (selectedProduct.isBLRResubscribe) {
      const blrCode = selectedProduct.blrNumber;
      const price   = selectedProduct.finalAmount;

      try {
        const result = await API.resubscribeBLR(blrCode);

        const txRef = result?.reference || result?.transaction_id || result?.id || null;
        const txId  = result?.id || result?.transaction_id || null;

        const successMessage = buildBlrSuccessMessage(blrCode);

        await notifyShopPurchase({
          title: '📡 BLR renouvelé',
          message: successMessage,
          type: 'success',
          reference: txRef,
          transactionId: txId,
        });

        await saveShopTx(userId, {
          id: txId || `shop_blr_${Date.now()}`,
          description: 'Réabonnement BLR',
          amount: -(price || 0),
          date: new Date().toISOString(),
          reference: txRef,
          details: {
            trans_type: 'blr_resubscribe',
            entry_type: 'blr_resubscribe',
            currency: 'XOF',
            gross_amount: price,
            blr_number: blrCode,
          },
        });

        if (txId) {
          await cacheShopTxMetadata(txId, {
            reference: txRef,
            sender_phone: currentUserPhone,
            sender_name: currentUserName,
            receiver_phone: null,
            receiver_name: blrCode,
          });
        }

        setModalVisible(false);
        setPin('');
        setSelectedProduct(null);
        setUseBiometric(isBiometricAvailable);

        triggerSuccessOverlay({
          title: 'Abonnement BLR renouvelé !',
          amount: price,
          subtitle: `Ligne ${blrCode}`,
        });

        try {
          const fresh = await API.checkBLR(blrCode);
          setBlrResult(fresh);
        } catch (_) {}

        showToast('success', 'Abonnement renouvelé', successMessage);

        await refreshAfterPurchase('BLR');
      } catch (error) {
        const friendlyBlrError = buildBlrRenewErrorMessage(error?.message);
        showToast('error', 'Renouvellement impossible', friendlyBlrError);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    setIsProcessing(false);
    setModalVisible(false);
  };

  /* ═══════════════════════════════════════════════════════════════════
     ACTIONS PAR CATÉGORIE
     ═══════════════════════════════════════════════════════════════════ */

  const handleBuyStock = () => {
    if (!guardSensitiveOperation('la recharge de stock')) return;

    const amt = parseInt(stockAmount, 10);
    if (!amt || amt <= 0) {
      showToast('error', 'Erreur', 'Veuillez entrer un montant valide.');
      return;
    }
    if (amt > 5_000_000) {
      showToast('error', 'Erreur', 'Le montant maximum est de 5 000 000 FCFA.');
      return;
    }

    hapticTap('medium');
    Keyboard.dismiss();

    setSelectedProduct({
      id: 'stock_self',
      name: 'Recharge Stock NT Albey',
      finalAmount: amt,
      phoneNumber: null,
      isStock: true,
    });
    setUseBiometric(isBiometricAvailable);
    setPin('');
    setPinRequired(!isBiometricAvailable);
    setModalVisible(true);
  };

  const handleBuyAirtime = () => {
    if (!guardSensitiveOperation('la recharge de crédit')) return;

    const amt = parseInt(airtimeAmount, 10);
    if (!amt || amt <= 0) {
      showToast('error', 'Erreur', 'Veuillez entrer un montant valide.');
      return;
    }
    if (amt > 5_000_000) {
      showToast('error', 'Erreur', 'Le montant maximum est de 5 000 000 FCFA.');
      return;
    }

    if (airtimeMode === 'other') {
      const clean = cleanNigerPhone(airtimeTargetPhone);
      if (!isValidNigerPhoneLocal(clean)) {
        showToast('error', 'Numéro invalide', 'Le numéro doit commencer par 83 ou 93, suivi de 6 chiffres.');
        return;
      }
      hapticTap('medium');
      Keyboard.dismiss();
      setSelectedProduct({
        id: 'airtime_other',
        name: 'Crédit pour un autre numéro',
        finalAmount: amt,
        phoneNumber: clean,
        isAirtime: true,
        isForOther: true,
      });
    } else {
      hapticTap('medium');
      Keyboard.dismiss();
      setSelectedProduct({
        id: 'airtime_self',
        name: 'Recharge Crédit téléphonique',
        finalAmount: amt,
        phoneNumber: null,
        isAirtime: true,
        isForOther: false,
      });
    }

    setUseBiometric(isBiometricAvailable);
    setPin('');
    setPinRequired(!isBiometricAvailable);
    setModalVisible(true);
  };

  const handleBuySoftphone = () => {
    if (!guardSensitiveOperation('la recharge Softphone')) return;

    const amt = parseInt(softphoneAmount, 10);
    if (!amt || amt <= 0) {
      showToast('error', 'Erreur', 'Veuillez entrer un montant valide.');
      return;
    }
    if (amt > 5_000_000) {
      showToast('error', 'Erreur', 'Le montant maximum est de 5 000 000 FCFA.');
      return;
    }

    const clean = cleanNigerPhone(softphoneTargetPhone);
    if (!isValidNigerPhoneLocal(clean)) {
      showToast('error', 'Numéro invalide', 'Le numéro doit commencer par 83 ou 93, suivi de 6 chiffres.');
      return;
    }

    hapticTap('medium');
    Keyboard.dismiss();

    setSelectedProduct({
      id: 'softphone_other',
      name: 'Recharge Softphone',
      finalAmount: amt,
      phoneNumber: clean,
      isSoftphone: true,
    });
    setUseBiometric(isBiometricAvailable);
    setPin('');
    setPinRequired(!isBiometricAvailable);
    setModalVisible(true);
  };

  /* ─── BLR : Vérification ─────────────────────────────────────────── */
  const handleCheckBLR = async () => {
    if (blrLoading) return;
    if (!guardSensitiveOperation('la vérification BLR')) return;

    const clean = cleanBlrNumber(blrNumber);
    if (!clean) {
      showToast('error', 'Erreur', 'Veuillez saisir un numéro BLR.');
      return;
    }
    if (clean.length > 20) {
      showToast('error', 'Erreur', 'Le numéro BLR est trop long (20 caractères max).');
      return;
    }

    setBlrLoading(true);
    setBlrError(null);
    setBlrResult(null);

    try {
      const data = await API.checkBLR(clean);
      setBlrResult(data);
    } catch (error) {
      setBlrError(buildBlrCheckErrorMessage(error?.message));
    } finally {
      setBlrLoading(false);
    }
  };

  /* ─── BLR : Réabonnement (ouvre le modal) ────────────────────────── */
  const handleResubscribeBLR = () => {
    if (!blrResult) return;
    if (!guardSensitiveOperation('le réabonnement BLR')) return;

    const blrCode = blrResult.numeroBlr || cleanBlrNumber(blrNumber);
    const price   = Number(blrResult.prix || 0);

    hapticTap('medium');

    setSelectedProduct({
      id: 'blr_resubscribe',
      name: 'Réabonnement BLR',
      finalAmount: price,
      blrNumber: blrCode,
      isBLRResubscribe: true,
    });
    setUseBiometric(isBiometricAvailable);
    setPin('');
    setPinRequired(!isBiometricAvailable);
    setModalVisible(true);
  };

  /* ═══════════════════════════════════════════════════════════════════
     NAVIGATION INTERNE
     ═══════════════════════════════════════════════════════════════════ */

  const goBack = () => {
    if (selectedCategory) {
      setSelectedCategory(null);
      setStockAmount('');
      setAirtimeAmount('');
      setSoftphoneAmount('');
      setAirtimeTargetPhone('');
      setSoftphoneTargetPhone('');
      setAirtimeMode('self');
      setBlrNumber('');
      setBlrResult(null);
      setBlrError(null);
      setBlrLoading(false);
      return;
    }
    navigation.goBack();
  };

  /* ═══════════════════════════════════════════════════════════════════
     HELPERS DE RENDU
     ═══════════════════════════════════════════════════════════════════ */

  const renderIcon = (iconName, size = 28) => {
    const map = {
      IconCredit:    <IconCredit size={size} />,
      IconStock:     <IconStock size={size} />,
      IconSoftphone: <IconSoftphone size={size} />,
      IconBLR:       <IconBLR size={size} />,
    };
    return map[iconName] || <IconCredit size={size} />;
  };

  const screenWidth = width || 400;
  const H_PADDING = 24;
  const GAP = 12;
  const categoryCardWidth = Math.floor((screenWidth - H_PADDING * 2 - GAP) / 2);

  /* ─── Validations dynamiques ─────────────────────────────────────── */
  const airtimeClean      = cleanNigerPhone(airtimeTargetPhone);
  const airtimeOtherValid = isValidNigerPhoneLocal(airtimeClean);
  const isAirtimeReady =
    airtimeAmount && parseInt(airtimeAmount, 10) > 0 &&
    (airtimeMode === 'self' || airtimeOtherValid);

  const softphoneClean   = cleanNigerPhone(softphoneTargetPhone);
  const softphoneValid   = isValidNigerPhoneLocal(softphoneClean);
  const isSoftphoneReady = softphoneAmount && parseInt(softphoneAmount, 10) > 0 && softphoneValid;

  const isStockReady = stockAmount && parseInt(stockAmount, 10) > 0;

  /* ─── CTA dynamiques par catégorie ───────────────────────────────── */
  const getCategoryCtaLabel = () => {
    if (selectedCategory === 'stock') {
      const amt = parseInt(stockAmount, 10) || 0;
      return amt > 0 ? `Recharger ${amt.toLocaleString('fr-FR')} FCFA` : 'Saisir un montant';
    }
    if (selectedCategory === 'credit') {
      const amt = parseInt(airtimeAmount, 10) || 0;
      if (airtimeMode === 'other' && !airtimeOtherValid) return 'Saisir un numéro valide';
      return amt > 0
        ? (airtimeMode === 'other' ? `Envoyer ${amt.toLocaleString('fr-FR')} FCFA` : `Recharger ${amt.toLocaleString('fr-FR')} FCFA`)
        : 'Saisir un montant';
    }
    if (selectedCategory === 'softphone') {
      const amt = parseInt(softphoneAmount, 10) || 0;
      if (!softphoneValid) return 'Saisir un numéro valide';
      return amt > 0 ? `Envoyer ${amt.toLocaleString('fr-FR')} FCFA` : 'Saisir un montant';
    }
    return '';
  };

  const getCategoryCtaHint = () => {
    if (selectedCategory === 'stock') {
      const amt = parseInt(stockAmount, 10) || 0;
      return amt === 0 ? 'Saisissez un montant pour continuer' : '';
    }
    if (selectedCategory === 'credit') {
      const amt = parseInt(airtimeAmount, 10) || 0;
      if (airtimeMode === 'other' && !airtimeOtherValid) return 'Numéro du bénéficiaire invalide (83/93 + 6 chiffres)';
      return amt === 0 ? 'Saisissez un montant pour continuer' : '';
    }
    if (selectedCategory === 'softphone') {
      const amt = parseInt(softphoneAmount, 10) || 0;
      if (!softphoneValid) return 'Numéro du bénéficiaire invalide (83/93 + 6 chiffres)';
      return amt === 0 ? 'Saisissez un montant pour continuer' : '';
    }
    return '';
  };

  const isCategoryCtaReady = () => {
    if (selectedCategory === 'stock') return isStockReady;
    if (selectedCategory === 'credit') return isAirtimeReady;
    if (selectedCategory === 'softphone') return isSoftphoneReady;
    return false;
  };

  const getVoiceType = () => {
    if (selectedProduct) {
      if (selectedProduct.isBLRResubscribe) return 'shop_blr';
      if (selectedProduct.isStock) return 'shop_stock';
      if (selectedProduct.isSoftphone) return 'shop_softphone';
      if (selectedProduct.isForOther) return 'shop_credit_other';
      return 'shop_credit_self';
    }
    if (selectedCategory === 'blr') return 'shop_blr';
    if (selectedCategory === 'stock') return 'shop_stock';
    if (selectedCategory === 'softphone') return 'shop_softphone';
    if (selectedCategory === 'credit') {
      return airtimeMode === 'other' ? 'shop_credit_other' : 'shop_credit_self';
    }
    return 'shop';
  };

  const getVoiceAmount = () => {
    if (selectedProduct?.finalAmount) return selectedProduct.finalAmount;
    if (selectedCategory === 'stock') return Number(stockAmount) || 0;
    if (selectedCategory === 'credit') return Number(airtimeAmount) || 0;
    if (selectedCategory === 'softphone') return Number(softphoneAmount) || 0;
    if (selectedCategory === 'blr') return Number(blrResult?.prix) || 0;
    return 0;
  };

  const getVoicePhone = () => {
    if (selectedProduct) {
      return selectedProduct.phoneNumber || selectedProduct.blrNumber || '';
    }
    if (selectedCategory === 'credit' && airtimeMode === 'other') return airtimeTargetPhone;
    if (selectedCategory === 'softphone') return softphoneTargetPhone;
    if (selectedCategory === 'blr') return blrResult?.numeroBlr || cleanBlrNumber(blrNumber) || '';
    return '';
  };

  const handleCategoryCta = () => {
    if (selectedCategory === 'stock') return handleBuyStock();
    if (selectedCategory === 'credit') return handleBuyAirtime();
    if (selectedCategory === 'softphone') return handleBuySoftphone();
  };

  /* ─── Zone montant premium (composant réutilisable) ─────────────── */
  const renderAmountZone = ({
    value,
    onChange,
    inputRef,
    placeholder = 'Combien ?',
    maxLength = 9,
    minAmount = 100,
  }) => {
    const numeric = parseInt(String(value || '0').replace(/\D/g, ''), 10) || 0;
    const display = numeric > 0 ? numeric.toLocaleString('fr-FR') : '0';
    const isFocused = amountFocused;
    const err = getAmountErrorMessage(numeric, balance, minAmount);

    return (
      <View>
        <Animated.View style={{ transform: [{ translateX: amountShakeAnim }] }}>
          <TouchableOpacity
            style={[
              styles.amountWrapper,
              isFocused && styles.amountWrapperFocused,
              err && styles.amountWrapperError,
            ]}
            activeOpacity={0.9}
            onPress={() => inputRef.current?.focus()}
          >
            {numeric === 0 && !isFocused && (
              <View style={styles.keyboardHintRow}>
                <Text style={styles.keyboardHintIcon}>⌨️</Text>
                <Text style={styles.keyboardHintLabel}>Touchez pour saisir</Text>
              </View>
            )}

            {numeric === 0 ? (
              <Text style={styles.amountEmptyState}>{placeholder}</Text>
            ) : (
              <Animated.Text
                style={[
                  styles.amountText,
                  err && styles.amountTextError,
                  {
                    opacity: amountOpacity,
                    transform: [{ scale: amountScale }],
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {display}
              </Animated.Text>
            )}

            <Text style={styles.amountCurrency}>FCFA</Text>

            {isFocused && numeric === 0 && (
              <Animated.View style={[styles.customCaret, { opacity: caretOpacity }]} />
            )}

            <TextInput
              ref={inputRef}
              style={styles.amountHiddenInput}
              value={value}
              onChangeText={(v) => {
                const digits = v.replace(/[^\d]/g, '');
                onChange(digits);
                triggerAmountPop(amountScale);
                const n = parseInt(digits, 10) || 0;
                if (n > balance) {
                  triggerAmountShake(amountShakeAnim);
                }
              }}
              onFocus={() => setAmountFocused(true)}
              onBlur={() => setAmountFocused(false)}
              keyboardType="numeric"
              maxLength={maxLength}
              caretHidden={true}
              editable={!isProcessing}
              showSoftInputOnFocus={true}
              selectionColor={COLORS.primary}
            />
          </TouchableOpacity>
        </Animated.View>

        {err && (
          <View style={styles.amountErrorRow}>
            <View style={styles.amountErrorBadge}>
              <Text style={styles.amountErrorText}>⚠️ {err}</Text>
            </View>
          </View>
        )}

        {!err && balance > 0 && (
          <Text style={styles.balanceHint}>
            Solde disponible · {balance.toLocaleString('fr-FR')} FCFA
          </Text>
        )}
      </View>
    );
  };

  /* ═══════════════════════════════════════════════════════════════════
     RENDU
     ═══════════════════════════════════════════════════════════════════ */

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton} activeOpacity={0.7}>
            <IconBack />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement…</Text>
        </View>
      </View>
    );
  }

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

      {/* ═══════════ HEADER (bouton retour seul) ═══════════ */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton} activeOpacity={0.7}>
          <IconBack />
        </TouchableOpacity>
      </View>

      {/* ═══════════ CONTENU ═══════════ */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >

        {/* ═══════════ NIVEAU 0 : CATÉGORIES ═══════════ */}
        {!selectedCategory && (
          <>
            <View style={styles.heroBanner}>
              <View style={styles.heroIconWrap}>
                <IconShop size={48} />
              </View>
              <Text style={styles.heroTitle}>Boutique NT</Text>
              <Text style={styles.heroSubtitle}>Rechargez en un clin d'œil</Text>
            </View>

            <Text style={styles.label}>Nos services</Text>

            <View style={styles.categoriesGrid}>
              {mainCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryItem, { width: categoryCardWidth, marginBottom: GAP }]}
                  onPress={() => setSelectedCategory(category.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.categoryHalo, { backgroundColor: `${category.color}10` }]}>
                    <View style={[styles.categoryHaloInner, { backgroundColor: `${category.color}18` }]}>
                      {renderIcon(category.icon, 28)}
                    </View>
                  </View>

                  <Text style={styles.categoryName} numberOfLines={1}>
                    {category.name}
                  </Text>
                  <Text style={styles.categoryDesc} numberOfLines={2}>
                    {category.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ═══════════ CATÉGORIE : STOCK ═══════════ */}
        {selectedCategory === 'stock' && (
          <>
            <Text style={styles.label}>Montant à recharger</Text>

            {renderAmountZone({
              value: stockAmount,
              onChange: setStockAmount,
              inputRef: stockAmountInputRef,
              placeholder: 'Combien ?',
            })}

            <View style={styles.suggestionsRow}>
              {['500', '1000', '2000', '5000', '10000', '20000'].map((sug) => (
                <TouchableOpacity
                  key={sug}
                  style={[styles.suggestionChip, stockAmount === sug && styles.suggestionChipActive]}
                  onPress={() => {
                    triggerSelectionHaptic();
                    triggerAmountPop(amountScale);
                    setStockAmount(sug);
                    if (parseInt(sug, 10) > balance) {
                      triggerAmountShake(amountShakeAnim);
                    }
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.suggestionText, stockAmount === sug && styles.suggestionTextActive]}>
                    {parseInt(sug, 10).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ═══════════ CATÉGORIE : CRÉDIT ═══════════ */}
        {selectedCategory === 'credit' && (
          <>
            <Text style={styles.label}>Mode</Text>

            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeBtn, airtimeMode === 'self' && styles.modeBtnActive]}
                onPress={() => setAirtimeMode('self')}
                activeOpacity={0.85}
              >
                <IconUser color={airtimeMode === 'self' ? '#FFFFFF' : COLORS.textMuted} />
                <Text style={[styles.modeText, airtimeMode === 'self' && styles.modeTextActive]}>
                  Pour moi
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeBtn, airtimeMode === 'other' && styles.modeBtnActive]}
                onPress={() => setAirtimeMode('other')}
                activeOpacity={0.85}
              >
                <IconUsers color={airtimeMode === 'other' ? '#FFFFFF' : COLORS.textMuted} />
                <Text style={[styles.modeText, airtimeMode === 'other' && styles.modeTextActive]}>
                  Pour un autre
                </Text>
              </TouchableOpacity>
            </View>

            {airtimeMode === 'other' && (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={[styles.label, { marginBottom: 0 }]}>Numéro du bénéficiaire</Text>
                  <TouchableOpacity
                    onPress={async () => {
                      const picked = await pickPhoneContact({ showToast });
                      if (picked?.phone) setAirtimeTargetPhone(picked.phone);
                    }}
                    style={{ backgroundColor: COLORS.primarySoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}
                    activeOpacity={0.75}
                  >
                    <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>📒 Répertoire</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputWrapper}>
                  <View style={styles.phonePrefix}>
                    <Text style={styles.phonePrefixText}>+227</Text>
                  </View>
                  <TextInput
                    style={styles.inputField}
                    placeholder="Numéro du bénéficiaire"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="phone-pad"
                    value={airtimeTargetPhone}
                    onChangeText={setAirtimeTargetPhone}
                    maxLength={20}
                  />
                </View>
                {airtimeTargetPhone.length > 0 && !airtimeOtherValid && (
                  <Text style={styles.fieldHint}>
                    Format attendu : 83 ou 93 + 6 chiffres.
                  </Text>
                )}
                <RecentNumbersBar
                  onSelectNumber={(num) => setAirtimeTargetPhone(num)}
                  currentValue={airtimeTargetPhone}
                  filterPrefix={['83', '93']}
                />
              </>
            )}

            <Text style={[styles.label, { marginTop: 24 }]}>Montant</Text>

            {renderAmountZone({
              value: airtimeAmount,
              onChange: setAirtimeAmount,
              inputRef: airtimeAmountInputRef,
              placeholder: 'Combien ?',
            })}

            <View style={styles.suggestionsRow}>
              {['100', '200', '500', '1000', '2000', '5000'].map((sug) => (
                <TouchableOpacity
                  key={sug}
                  style={[styles.suggestionChip, airtimeAmount === sug && styles.suggestionChipActive]}
                  onPress={() => {
                    triggerSelectionHaptic();
                    triggerAmountPop(amountScale);
                    setAirtimeAmount(sug);
                    if (parseInt(sug, 10) > balance) {
                      triggerAmountShake(amountShakeAnim);
                    }
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.suggestionText, airtimeAmount === sug && styles.suggestionTextActive]}>
                    {parseInt(sug, 10).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ═══════════ CATÉGORIE : SOFTPHONE ═══════════ */}
        {selectedCategory === 'softphone' && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={[styles.label, { marginBottom: 0 }]}>Numéro du bénéficiaire</Text>
              <TouchableOpacity
                onPress={async () => {
                  const picked = await pickPhoneContact({ showToast });
                  if (picked?.phone) setSoftphoneTargetPhone(picked.phone);
                }}
                style={{ backgroundColor: COLORS.primarySoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}
                activeOpacity={0.75}
              >
                <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>📒 Répertoire</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrapper}>
              <View style={styles.phonePrefix}>
                <Text style={styles.phonePrefixText}>+227</Text>
              </View>
              <TextInput
                style={styles.inputField}
                placeholder="Numéro du bénéficiaire"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                value={softphoneTargetPhone}
                onChangeText={setSoftphoneTargetPhone}
                maxLength={20}
              />
            </View>
            {softphoneTargetPhone.length > 0 && !softphoneValid && (
              <Text style={styles.fieldHint}>
                Format attendu : 83 ou 93 + 6 chiffres.
              </Text>
            )}
            <RecentNumbersBar
              onSelectNumber={(num) => setSoftphoneTargetPhone(num)}
              currentValue={softphoneTargetPhone}
              filterPrefix={['83', '93']}
            />

            <Text style={[styles.label, { marginTop: 24 }]}>Montant</Text>

            {renderAmountZone({
              value: softphoneAmount,
              onChange: setSoftphoneAmount,
              inputRef: softphoneAmountInputRef,
              placeholder: 'Combien ?',
            })}

            <View style={styles.suggestionsRow}>
              {['500', '1000', '2000', '5000', '10000', '20000'].map((sug) => (
                <TouchableOpacity
                  key={sug}
                  style={[styles.suggestionChip, softphoneAmount === sug && styles.suggestionChipActive]}
                  onPress={() => {
                    triggerSelectionHaptic();
                    triggerAmountPop(amountScale);
                    setSoftphoneAmount(sug);
                    if (parseInt(sug, 10) > balance) {
                      triggerAmountShake(amountShakeAnim);
                    }
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.suggestionText, softphoneAmount === sug && styles.suggestionTextActive]}>
                    {parseInt(sug, 10).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ═══════════ CATÉGORIE : BLR ═══════════ */}
        {selectedCategory === 'blr' && (
          <>
            <Text style={styles.label}>Numéro BLR</Text>
            <View style={styles.inputWrapper}>
              <View style={[styles.phonePrefix, { backgroundColor: COLORS.skySoft }]}>
                <Text style={[styles.phonePrefixText, { color: COLORS.sky }]}>BLR</Text>
              </View>
              <TextInput
                style={styles.inputField}
                placeholder="Ex : BLR0000NY"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                value={blrNumber}
                onChangeText={(t) => {
                  setBlrNumber(t);
                  if (blrResult) setBlrResult(null);
                  if (blrError)  setBlrError(null);
                }}
                maxLength={20}
                editable={!blrLoading}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: COLORS.sky, marginTop: 16 },
                (!blrNumber.trim() || blrLoading) && styles.actionButtonDisabled,
              ]}
              onPress={handleCheckBLR}
              disabled={!blrNumber.trim() || blrLoading}
              activeOpacity={0.85}
            >
              {blrLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.actionButtonText}>Vérifier l'abonnement</Text>
              )}
            </TouchableOpacity>

            {blrError && (
              <View style={styles.blrErrorCard}>
                <Text style={styles.blrErrorText}>⚠️ {blrError}</Text>
              </View>
            )}

            {blrResult && (
              <View style={styles.blrResultCard}>
                <View style={styles.blrResultHeader}>
                  <View style={styles.blrResultDot} />
                  <Text style={styles.blrResultBadge}>Abonnement trouvé</Text>
                </View>

                <View style={styles.blrRow}>
                  <Text style={styles.blrRowLabel}>Numéro BLR</Text>
                  <Text style={styles.blrRowValue}>
                    {blrResult.numeroBlr || cleanBlrNumber(blrNumber)}
                  </Text>
                </View>

                <View style={styles.blrRow}>
                  <Text style={styles.blrRowLabel}>Type</Text>
                  <Text style={[styles.blrRowValue, { flexShrink: 1, textAlign: 'right' }]}>
                    {blrResult.type || '—'}
                  </Text>
                </View>

                <View style={styles.blrRow}>
                  <Text style={styles.blrRowLabel}>Prix abonnement</Text>
                  <Text style={[styles.blrRowValue, { color: COLORS.primary }]}>
                    {Number(blrResult.prix || 0).toLocaleString()} FCFA
                  </Text>
                </View>

                <View style={[styles.blrRow, { borderBottomWidth: 0, marginBottom: 6 }]}>
                  <Text style={styles.blrRowLabel}>Facture impayée</Text>
                  <Text
                    style={[
                      styles.blrRowValue,
                      {
                        color: Number(blrResult.facture || 0) > 0 ? COLORS.danger : COLORS.success,
                      },
                    ]}
                  >
                    {Number(blrResult.facture || 0).toLocaleString()} FCFA
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: COLORS.primary, marginTop: 8 }]}
                  onPress={handleResubscribeBLR}
                  activeOpacity={0.85}
                >
                  <Text style={styles.actionButtonText}>
                    Réabonner
                    {Number(blrResult.prix || 0) > 0
                      ? ` • ${Number(blrResult.prix).toLocaleString()} FCFA`
                      : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* 🎙️ ASSISTANCE VOCALE SUR LE FORMULAIRE (uniquement quand tous les champs sont remplis) */}
        {(isCategoryCtaReady() || (selectedCategory === 'blr' && !!blrResult)) && !pinRequired && (
          <VoiceAssistantButton
            type={getVoiceType()}
            amount={getVoiceAmount()}
            recipientPhone={getVoicePhone()}
            recipientName={selectedProduct?.name || ''}
            containerStyle={{ marginTop: 18, marginBottom: 8 }}
          />
        )}

      </ScrollView>

      {/* ═══════════ CTA FIXE EN BAS (Stock / Crédit / Softphone) ═══════════ */}
      {selectedCategory && selectedCategory !== 'blr' && !pinRequired && (
        <View style={[styles.ctaContainer, { paddingBottom: Math.max(insets.bottom, 14) + 12 }]}>
          <TouchableOpacity
            style={[styles.cta, !isCategoryCtaReady() && styles.ctaDisabled]}
            onPress={() => {
              if (!isCategoryCtaReady()) {
                const amt = getVoiceAmount();
                if (amt === 0 || amt > balance) {
                  triggerAmountShake(amountShakeAnim);
                }
              } else {
                handleCategoryCta();
              }
            }}
            activeOpacity={0.85}
          >
            {isProcessing || isVerifyingAuth ? (
              <View style={styles.ctaContent}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.ctaText}>
                  {isProcessing ? 'Traitement…' : 'Vérification…'}
                </Text>
              </View>
            ) : (
              <View style={styles.ctaContent}>
                {isBiometricAvailable && useBiometric && isCategoryCtaReady() && (
                  <IconFingerprint color="#FFFFFF" size={20} />
                )}
                <Text style={[styles.ctaText, !isCategoryCtaReady() && styles.ctaTextDisabled]}>
                  {getCategoryCtaLabel()}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {getCategoryCtaHint() ? (
            <Text style={styles.ctaHintText}>{getCategoryCtaHint()}</Text>
          ) : null}
        </View>
      )}

      {/* ═══════════════════════════════════════════════════
          MODAL DE CONFIRMATION (bottom sheet)
          ═══════════════════════════════════════════════════ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeConfirmModal}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            onPress={closeConfirmModal}
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
              <Text style={styles.confirmTitle}>
                {selectedProduct?.isBLRResubscribe
                  ? 'Confirmer le réabonnement'
                  : selectedProduct?.isForOther || selectedProduct?.isSoftphone
                    ? 'Confirmer l\'envoi'
                    : 'Confirmer l\'achat'}
              </Text>
              <TouchableOpacity
                onPress={closeConfirmModal}
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
                <View
                  style={[
                    styles.confirmIconCircle,
                    {
                      backgroundColor: selectedProduct?.isBLRResubscribe
                        ? COLORS.skySoft
                        : COLORS.primarySoft,
                    },
                  ]}
                >
                  {selectedProduct?.isBLRResubscribe ? <IconBLR size={36} /> : <IconShop size={48} />}
                </View>
              </View>

              <Text style={styles.confirmProductName}>{selectedProduct?.name}</Text>
              <Text style={styles.confirmAmount}>
                {selectedProduct?.finalAmount?.toLocaleString()} FCFA
              </Text>

              {(selectedProduct?.isForOther || selectedProduct?.isSoftphone) && (
                <View style={styles.confirmInfoBox}>
                  <View style={styles.confirmInfoRow}>
                    <Text style={styles.confirmInfoLabel}>📱 Destinataire</Text>
                    <Text style={styles.confirmInfoValue}>
                      +227 {selectedProduct.phoneNumber}
                    </Text>
                  </View>
                </View>
              )}

              {selectedProduct?.isBLRResubscribe && (
                <View style={styles.confirmInfoBox}>
                  <View style={styles.confirmInfoRow}>
                    <Text style={styles.confirmInfoLabel}>📡 Abonnement</Text>
                    <Text style={styles.confirmInfoValue}>
                      {selectedProduct.blrNumber}
                    </Text>
                  </View>
                </View>
              )}

              {/* 🎙️ ASSISTANCE VOCALE DANS LE MODAL DE CONFIRMATION */}
              <VoiceAssistantButton
                type={getVoiceType()}
                amount={getVoiceAmount()}
                recipientPhone={getVoicePhone()}
                recipientName={selectedProduct?.name || ''}
                containerStyle={{ marginTop: 12, marginBottom: 8 }}
              />

              {/* PIN inline */}
              {pinRequired && (
                <View style={styles.pinInline}>
                  <VoiceAssistantButton
                    type={getVoiceType()}
                    amount={getVoiceAmount()}
                    recipientPhone={getVoicePhone()}
                    recipientName={selectedProduct?.name || ''}
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
                      editable={!isProcessing && !isVerifyingAuth}
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
                      disabled={isProcessing || isVerifyingAuth}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.pinInlineCancelText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.pinInlineConfirm,
                        (!pin || pin.length < 8 || isProcessing || isVerifyingAuth) && styles.pinInlineConfirmDisabled,
                      ]}
                      onPress={confirmWithPin}
                      disabled={!pin || pin.length < 8 || isProcessing || isVerifyingAuth}
                      activeOpacity={0.85}
                    >
                      {isProcessing || isVerifyingAuth ? (
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
                    (isProcessing || isVerifyingAuth) && styles.confirmButtonDisabled,
                  ]}
                  onPress={authenticateWithBiometrics}
                  disabled={isProcessing || isVerifyingAuth}
                  activeOpacity={0.85}
                >
                  {isProcessing || isVerifyingAuth ? (
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

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeConfirmModal}
                disabled={isProcessing || isVerifyingAuth}
                activeOpacity={0.75}
              >
                <Text style={styles.cancelButtonText}>
                  {isProcessing || isVerifyingAuth ? 'Traitement en cours…' : 'Annuler'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* ═══════════ OVERLAY VALIDATION ANIMÉE & CHIME ═══════════ */}
      <SuccessCheckmarkOverlay
        visible={successOverlayVisible}
        title={successOverlayData.title}
        amount={successOverlayData.amount}
        subtitle={successOverlayData.subtitle}
        onDismiss={() => setSuccessOverlayVisible(false)}
      />

    </KeyboardAvoidingView>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   STYLES — HARMONISÉS
   ═══════════════════════════════════════════════════════════════════════ */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  /* TOAST */
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

  /* Header */
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

  /* Loading */
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    marginTop: 14,
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },

  /* Contenu */
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

  /* Hero banner */
  heroBanner: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  heroIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  /* Categories grid */
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
  },
  categoryItem: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
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
  categoryHalo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryHaloInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.1,
    marginBottom: 3,
  },
  categoryDesc: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 14,
    fontWeight: '500',
    paddingHorizontal: 4,
  },

  /* Zone montant premium */
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
    borderStyle: 'solid',
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
    marginTop: 10,
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

  /* Chips suggestions */
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

  /* Input */
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  phonePrefix: {
    paddingLeft: 12,
    paddingRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primarySoft,
    borderRadius: 10,
    paddingVertical: 8,
    marginVertical: 6,
    marginLeft: 4,
  },
  phonePrefixText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  inputField: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  fieldHint: {
    fontSize: 11,
    color: COLORS.danger,
    marginTop: 5,
    fontStyle: 'italic',
    fontWeight: '500',
  },

  /* Mode toggle */
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    borderRadius: 11,
  },
  modeBtnActive: { backgroundColor: COLORS.primary },
  modeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: -0.1,
  },
  modeTextActive: { color: '#FFFFFF' },

  /* Action button */
  actionButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  actionButtonDisabled: {
    backgroundColor: COLORS.border,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  /* CTA fixe */
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

  /* Bottom sheet */
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11,18,32,0.5)',
    justifyContent: 'flex-end',
  },
  sheetBackdrop: { flex: 1 },
  confirmSheetContent: {
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
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.3,
    flex: 1,
  },
  sheetCloseBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmIconWrapper: { alignItems: 'center', marginBottom: 12 },
  confirmIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  confirmProductName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  confirmAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -1,
    marginBottom: 18,
    textAlign: 'center',
  },

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

  /* PIN inline */
  pinInline: {
    marginTop: 8,
    marginBottom: 16,
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

  /* Confirm button (bio) */
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

  cancelButton: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },

  /* BLR */
  blrResultCard: {
    backgroundColor: COLORS.surface,
    marginTop: 16,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.sky + '25',
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
  blrResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 12,
  },
  blrResultDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: COLORS.success,
  },
  blrResultBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.success,
    letterSpacing: -0.1,
  },
  blrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  blrRowLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  blrRowValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.1,
  },
  blrErrorCard: {
    backgroundColor: COLORS.dangerSoft,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.danger + '30',
  },
  blrErrorText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.danger,
    lineHeight: 17,
  },
});