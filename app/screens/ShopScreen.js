// ╔══════════════════════════════════════════════════════════════════════╗
// ║                    NT ALBEY — screens/ShopScreen.js                  ║
// ║                          Version 16.4.0                              ║
// ║                                                                      ║
// ║  ✨ NOUVEAUTÉS v16.4 :                                               ║
// ║  ├── NEW : 4 icônes illustratives redessinées                        ║
// ║  │        ├── Stock     : entrepôt + flèche "charger"                ║
// ║  │        ├── Crédit    : smartphone + ondes GSM                     ║
// ║  │        ├── Softphone : SIM dans un cloud (eSIM)                   ║
// ║  │        └── BLR       : antenne radio + ondes                      ║
// ║  ├── NEW : prop `size` sur les 4 icônes (défaut 30, +visible)        ║
// ║  └── KEPT : tout le reste de la logique métier inchangée             ║
// ║                                                                      ║
// ║  v16.3 :                                                             ║
// ║  ├── FIX : IconShop accepte une prop `size` → plus de débordement    ║
// ║  ├── FIX : message d'erreur BLR différencié (check vs renew)         ║
// ║  ├── FIX : refreshAfterPurchase avec cleanup (useRef + useEffect)    ║
// ║  ├── CLEAN : suppression du code mort (balance, IconShield, etc.)    ║
// ║  └── A11Y : accessibilityLabel sur les boutons critiques             ║
// ╚══════════════════════════════════════════════════════════════════════╝

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  Image,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import * as LocalAuthentication from 'expo-local-authentication';

import { useTransactions } from '../context/TransactionContext';
import { API } from '../services/api';
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
   PALETTE PREMIUM
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
  textPrimary:   '#0F172A',
  textSecondary: '#64748B',
  textMuted:     '#94A3B8',
  border:        '#E2E8F0',
  borderSoft:    '#F1F5F9',
  surface:       '#FFFFFF',
  surfaceAlt:    '#F8FAFC',
  background:    '#F1F5F9',
  danger:        '#EF4444',
  dangerSoft:    '#FEE2E2',
  success:       '#10B981',
  successSoft:   '#D1FAE5',
  shadow:        '#0F172A',
};

/* ═══════════════════════════════════════════════════════════════════════
   ICÔNES SVG
   ═══════════════════════════════════════════════════════════════════════ */

const IconBack = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={COLORS.textPrimary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ✅ v16.3 : `size` prop pour éviter le débordement dans le modal (76×76)
const IconShop = ({ size = 90 }) => (
  <Image
    source={require('../assets/images/boutique.png')}
    style={{ width: size, height: size, resizeMode: 'contain' }}
  />
);

/* ═══════════════════════════════════════════════════════════════════════
   ✨ v16.4 — ICÔNES ILLUSTRATIVES REDESSINÉES
   ═══════════════════════════════════════════════════════════════════════ */

// 📦 STOCK — Entrepôt + flèche "charger vers le bas"
//    Métaphore : je recharge mon entrepôt (stock) pour revendre ensuite
const IconStock = ({ color = COLORS.teal, size = 30 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Toit / hangar */}
    <Path
      d="M3 9 L12 3 L21 9"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Corps de l'entrepôt */}
    <Path
      d="M5 9 V21 H19 V9"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={`${color}12`}
    />
    {/* Flèche "charger vers le bas" */}
    <Path d="M12 11.5 V17" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Path
      d="M9 14.5 L12 17.5 L15 14.5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Sol */}
    <Path d="M3 21 H21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

// 📱 CRÉDIT — Smartphone + ondes GSM
//    Métaphore : crédit téléphonique GSM (appels, SMS, internet mobile)
const IconCredit = ({ color = COLORS.accent, size = 30 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Smartphone */}
    <Rect
      x="7" y="3" width="10" height="18" rx="2"
      stroke={color} strokeWidth="1.8"
      fill={`${color}12`}
    />
    {/* Écran */}
    <Rect
      x="9" y="5.5" width="6" height="8.5" rx="0.5"
      stroke={color} strokeWidth="1.5"
    />
    {/* Bouton home */}
    <Circle cx="12" cy="18" r="1" fill={color} />
    {/* Ondes GSM gauche */}
    <Path
      d="M5 7 A5 5 0 0 0 5 15"
      stroke={color} strokeWidth="1.8" strokeLinecap="round"
    />
    <Path
      d="M2.5 4.5 A8.5 8.5 0 0 0 2.5 17.5"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"
    />
    {/* Ondes GSM droite */}
    <Path
      d="M19 7 A5 5 0 0 1 19 15"
      stroke={color} strokeWidth="1.8" strokeLinecap="round"
    />
    <Path
      d="M21.5 4.5 A8.5 8.5 0 0 1 21.5 17.5"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"
    />
  </Svg>
);

// 📞 SOFTPHONE — SIM card dans un cloud (eSIM / téléphone virtuel)
//    Métaphore : la SIM n'est pas dans le téléphone mais dans le cloud
const IconSoftphone = ({ color = COLORS.purple, size = 30 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Cloud */}
    <Path
      d="M8 10 A3.5 3.5 0 0 1 11 7 A4 4 0 0 1 18 8 A3 3 0 0 1 18 13 H9 A3 3 0 0 1 8 10 Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinejoin="round"
      fill={`${color}15`}
    />
    {/* SIM card sous le cloud (coin coupé = SIM classique) */}
    <Path
      d="M8 15 L10.5 12.5 H18 V21 H8 Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinejoin="round"
      fill={`${color}10`}
    />
    {/* Puce (chip) sur la SIM */}
    <Rect
      x="11" y="16.5" width="3.5" height="3.5" rx="0.4"
      stroke={color} strokeWidth="1.3"
    />
    {/* Petit éclair dans la puce (indice "téléphone actif") */}
    <Path
      d="M12.6 17.6 L12 18.8 H13.3 L12.7 19.9"
      stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

// 📡 BLR — Antenne radio (mât + traverses + ondes)
//    Métaphore : Boucle Locale Radio (internet haut débit via ondes radio)
const IconBLR = ({ color = COLORS.sky, size = 30 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Mât central */}
    <Path d="M12 4 V21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    {/* Pieds (A-frame / tour Eiffel) */}
    <Path d="M7 21 L12 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M17 21 L12 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    {/* Traverses */}
    <Path d="M9 16 H15" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M10 10.5 H14" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    {/* Sommet émetteur */}
    <Circle cx="12" cy="4" r="1.3" fill={color} />
    {/* Ondes internes gauche / droite */}
    <Path d="M6.5 5.5 A4.5 4.5 0 0 0 6.5 11" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M17.5 5.5 A4.5 4.5 0 0 1 17.5 11" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    {/* Ondes externes gauche / droite */}
    <Path d="M3.5 3 A8 8 0 0 0 3.5 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    <Path d="M20.5 3 A8 8 0 0 1 20.5 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
  </Svg>
);

/* ─── Autres icônes (inchangées) ───────────────────────────────────── */

const IconUser = ({ color = COLORS.primary }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.8" />
    <Path d="M5 20v-2a7 7 0 0114 0v2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconUsers = ({ color = COLORS.textMuted }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <Circle cx="9" cy="8" r="3.5" stroke={color} strokeWidth="1.8" />
    <Path d="M3 20v-2a6 6 0 0112 0v2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M16 4a4 4 0 010 8M18 20v-2a6 6 0 00-3-5.2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
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

/* ═══════════════════════════════════════════════════════════════════════
   HELPERS
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

/* ═══════════════════════════════════════════════════════════════════════
   HELPERS POST-ACHAT
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ═══════════════════════════════════════════════════════════════════════ */

export default function ShopScreen({ navigation }) {
  const { width = 400 } = useWindowDimensions();

  /* ─── Navigation interne ─────────────────────────────────────────── */
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct]   = useState(null);
  const [mainCategories, setMainCategories]     = useState([]);
  const [isLoading, setIsLoading]               = useState(true);

  /* ─── Modal + Auth ───────────────────────────────────────────────── */
  const [modalVisible, setModalVisible]         = useState(false);
  const [pin, setPin]                           = useState('');
  const [pinVisible, setPinVisible]             = useState(false);

  /* ─── Champs Stock / Crédit / Softphone ──────────────────────────── */
  const [stockAmount, setStockAmount]               = useState('');
  const [airtimeAmount, setAirtimeAmount]           = useState('');
  const [softphoneAmount, setSoftphoneAmount]       = useState('');
  const [airtimeMode, setAirtimeMode]               = useState('self');
  const [airtimeTargetPhone, setAirtimeTargetPhone] = useState('');
  const [softphoneTargetPhone, setSoftphoneTargetPhone] = useState('');

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

  /* ─── Hooks context ──────────────────────────────────────────────── */
  const { refreshWallet, refreshData } = useTransactions();

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
        Alert.alert('Erreur', 'Impossible de charger la boutique. Veuillez réessayer.');
      } finally {
        setIsLoading(false);
      }
    };
    loadMainCategories();
  }, []);

  /* ═══════════════════════════════════════════════════════════════════
     AUTHENTIFICATION
     ═══════════════════════════════════════════════════════════════════ */

  const authenticateWithBiometrics = async () => {
    if (isProcessing || isVerifyingAuth) return;
    setIsVerifyingAuth(true);
    try {
      await verifyTransactionAuth(AUTH_METHOD.BIOMETRIC);
      await executePurchase();
    } catch (error) {
      if (error?.message === AUTH_CANCELLED) return;
      if (__DEV__) console.error('❌ [Shop] Biométrie :', error?.message);

      const msg = String(error?.message || '');
      if (msg.includes('Session biométrique expirée') || msg.includes('Aucune empreinte')) {
        setUseBiometric(false);
      }
      Alert.alert('Authentification refusée', msg || 'Veuillez réessayer.');
    } finally {
      setIsVerifyingAuth(false);
    }
  };

  const confirmWithPin = async () => {
    if (isProcessing || isVerifyingAuth) return;
    if (!isValidPin(pin)) {
      Alert.alert('Mot de passe invalide', 'Le mot de passe doit contenir entre 8 et 20 caractères.');
      return;
    }

    setIsVerifyingAuth(true);
    try {
      await verifyTransactionAuth(AUTH_METHOD.PIN, pin);
      setPin('');
      await executePurchase();
    } catch (error) {
      Alert.alert('Mot de passe incorrect', error?.message || 'Le mot de passe saisi est incorrect.');
      setPin('');
    } finally {
      setIsVerifyingAuth(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════════════
     EXÉCUTION DE L'ACHAT
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

        Alert.alert(
          '✅ Stock rechargé',
          result?.message || `Votre stock a été rechargé de ${amount.toLocaleString()} FCFA.`,
          [{ text: 'OK' }]
        );

        await refreshAfterPurchase('stock');
      } catch (error) {
        const friendly = buildFriendlyAlertMessage('stock', error?.message);
        Alert.alert('Recharge impossible', friendly, [{ text: 'Compris' }]);
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

        Alert.alert(
          '✅ ' + (isForOther ? 'Crédit envoyé' : 'Crédit rechargé'),
          result?.message ||
            (isForOther
              ? `Vous avez rechargé le crédit de +227 ${phoneNumber} pour un montant de ${amount.toLocaleString()} FCFA.`
              : `Votre crédit téléphonique a été rechargé de ${amount.toLocaleString()} FCFA.`),
          [{ text: 'OK' }]
        );

        await refreshAfterPurchase('crédit');
      } catch (error) {
        const friendly = buildFriendlyAlertMessage('airtime', error?.message);
        Alert.alert('Recharge impossible', friendly, [{ text: 'Compris' }]);
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

        Alert.alert(
          '✅ Softphone envoyé',
          result?.message ||
            `Vous avez rechargé le Softphone de +227 ${phoneNumber} pour un montant de ${amount.toLocaleString()} FCFA.`,
          [{ text: 'OK' }]
        );

        await refreshAfterPurchase('softphone');
      } catch (error) {
        const friendly = buildFriendlyAlertMessage('softphone', error?.message);
        Alert.alert('Recharge impossible', friendly, [{ text: 'Compris' }]);
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

        try {
          const fresh = await API.checkBLR(blrCode);
          setBlrResult(fresh);
        } catch (_) {}

        Alert.alert('Abonnement renouvelé', successMessage, [{ text: 'OK' }]);

        await refreshAfterPurchase('BLR');
      } catch (error) {
        const friendlyBlrError = buildBlrRenewErrorMessage(error?.message);
        Alert.alert('Renouvellement impossible', friendlyBlrError, [{ text: 'Compris' }]);
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
      Alert.alert('Erreur', 'Veuillez entrer un montant valide.');
      return;
    }
    if (amt > 5_000_000) {
      Alert.alert('Erreur', 'Le montant maximum est de 5 000 000 FCFA.');
      return;
    }

    setSelectedProduct({
      id: 'stock_self',
      name: 'Recharge Stock NT Albey',
      finalAmount: amt,
      phoneNumber: null,
      isStock: true,
    });
    setModalVisible(true);
    setUseBiometric(isBiometricAvailable);
    setPin('');
  };

  const handleBuyAirtime = () => {
    if (!guardSensitiveOperation('la recharge de crédit')) return;

    const amt = parseInt(airtimeAmount, 10);
    if (!amt || amt <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide.');
      return;
    }
    if (amt > 5_000_000) {
      Alert.alert('Erreur', 'Le montant maximum est de 5 000 000 FCFA.');
      return;
    }

    if (airtimeMode === 'other') {
      const clean = cleanNigerPhone(airtimeTargetPhone);
      if (!isValidNigerPhoneLocal(clean)) {
        Alert.alert(
          'Numéro invalide',
          'Le numéro du bénéficiaire doit commencer par 83 ou 93, suivi de 6 chiffres.'
        );
        return;
      }
      setSelectedProduct({
        id: 'airtime_other',
        name: 'Crédit pour un autre numéro',
        finalAmount: amt,
        phoneNumber: clean,
        isAirtime: true,
        isForOther: true,
      });
    } else {
      setSelectedProduct({
        id: 'airtime_self',
        name: 'Recharge Crédit téléphonique',
        finalAmount: amt,
        phoneNumber: null,
        isAirtime: true,
        isForOther: false,
      });
    }

    setModalVisible(true);
    setUseBiometric(isBiometricAvailable);
    setPin('');
  };

  const handleBuySoftphone = () => {
    if (!guardSensitiveOperation('la recharge Softphone')) return;

    const amt = parseInt(softphoneAmount, 10);
    if (!amt || amt <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide.');
      return;
    }
    if (amt > 5_000_000) {
      Alert.alert('Erreur', 'Le montant maximum est de 5 000 000 FCFA.');
      return;
    }

    const clean = cleanNigerPhone(softphoneTargetPhone);
    if (!isValidNigerPhoneLocal(clean)) {
      Alert.alert('Numéro invalide', 'Le numéro doit commencer par 83 ou 93, suivi de 6 chiffres.');
      return;
    }

    setSelectedProduct({
      id: 'softphone_other',
      name: 'Recharge Softphone',
      finalAmount: amt,
      phoneNumber: clean,
      isSoftphone: true,
    });
    setModalVisible(true);
    setUseBiometric(isBiometricAvailable);
    setPin('');
  };

  /* ─── BLR : Vérification ─────────────────────────────────────────── */
  const handleCheckBLR = async () => {
    if (blrLoading) return;
    if (!guardSensitiveOperation('la vérification BLR')) return;

    const clean = cleanBlrNumber(blrNumber);
    if (!clean) {
      Alert.alert('Erreur', 'Veuillez saisir un numéro BLR.');
      return;
    }
    if (clean.length > 20) {
      Alert.alert('Erreur', 'Le numéro BLR est trop long (20 caractères max).');
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

    setSelectedProduct({
      id: 'blr_resubscribe',
      name: 'Réabonnement BLR',
      finalAmount: price,
      blrNumber: blrCode,
      isBLRResubscribe: true,
    });
    setModalVisible(true);
    setUseBiometric(isBiometricAvailable);
    setPin('');
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

  const closeModal = () => {
    if (isProcessing || isVerifyingAuth) return;
    setModalVisible(false);
    setPin('');
    setPinVisible(false);
    setUseBiometric(isBiometricAvailable);
  };

  /* ═══════════════════════════════════════════════════════════════════
     HELPERS DE RENDU
     ═══════════════════════════════════════════════════════════════════ */

  const renderIcon = (iconName) => {
    const map = {
      IconCredit:    <IconCredit />,
      IconStock:     <IconStock />,
      IconSoftphone: <IconSoftphone />,
      IconBLR:       <IconBLR />,
    };
    return map[iconName] || <IconCredit />;
  };

  const screenWidth = width || 400;
  const H_PADDING = 16;
  const GAP = 12;
  const categoryCardWidth = Math.floor((screenWidth - H_PADDING * 2 - GAP) / 2);
  const modalWidth = width ? width - 40 : 320;

  /* ─── Validations dynamiques ─────────────────────────────────────── */
  const airtimeClean      = cleanNigerPhone(airtimeTargetPhone);
  const airtimeOtherValid = isValidNigerPhoneLocal(airtimeClean);
  const isAirtimeReady =
    airtimeAmount && parseInt(airtimeAmount, 10) > 0 &&
    (airtimeMode === 'self' || airtimeOtherValid);

  const softphoneClean   = cleanNigerPhone(softphoneTargetPhone);
  const softphoneValid   = isValidNigerPhoneLocal(softphoneClean);
  const isSoftphoneReady = softphoneAmount && parseInt(softphoneAmount, 10) > 0 && softphoneValid;

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
          <Text style={styles.headerTitle}>Boutique</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* ═══════════ EN-TÊTE ═══════════ */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton} activeOpacity={0.7}>
          <IconBack />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {selectedCategory
              ? mainCategories.find((c) => c.id === selectedCategory)?.name || 'Boutique'
              : 'Boutique'}
          </Text>
          {!selectedCategory && (
            <Text style={styles.headerSubtitle}>Rechargez en un clin d'œil</Text>
          )}
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ═══════════ CATÉGORIES (niveau 0) ═══════════ */}
        {!selectedCategory && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionLabel}>Nos services</Text>
            </View>

            <View style={[styles.categoriesGrid, { gap: GAP }]}>
              {mainCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryCard, { width: categoryCardWidth }]}
                  onPress={() => setSelectedCategory(category.id)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: `${category.color}15` }]}>
                    {renderIcon(category.icon)}
                  </View>
                  <Text style={styles.categoryName}>{category.name}</Text>
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
            <View style={styles.sectionHeader}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionLabel}>Recharger mon stock</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardIconWrapper}>
                <View style={[styles.cardIconCircle, { backgroundColor: COLORS.tealSoft }]}>
                  <IconStock size={34} />
                </View>
              </View>

              <Text style={styles.cardTitle}>Stock NT Albey</Text>
              <Text style={styles.cardSubtitle}>
                Rechargez votre stock pour vos opérations (envoi de crédit...)
              </Text>

              <Text style={styles.inputLabel}>💵 Montant à recharger</Text>
              <View style={styles.amountInputWrapper}>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={stockAmount}
                  onChangeText={setStockAmount}
                />
                <Text style={styles.currencySymbol}>FCFA</Text>
              </View>

              <View style={styles.suggestionsRow}>
                {['500', '1000', '2000', '5000', '10000', '20000'].map((sug) => (
                  <TouchableOpacity
                    key={sug}
                    style={[styles.chip, stockAmount === sug && styles.chipActive]}
                    onPress={() => setStockAmount(sug)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, stockAmount === sug && styles.chipTextActive]}>
                      {parseInt(sug, 10).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: COLORS.teal },
                  (!stockAmount || parseInt(stockAmount, 10) <= 0) && styles.actionButtonDisabled,
                ]}
                onPress={handleBuyStock}
                disabled={!stockAmount || parseInt(stockAmount, 10) <= 0}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Recharger le stock"
              >
                <Text style={styles.actionButtonText}>
                  Recharger {stockAmount ? `${parseInt(stockAmount, 10).toLocaleString()} FCFA` : ''}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>ℹ️ À propos du stock</Text>
              <Text style={styles.infoText}>• Le montant est prélevé de votre solde Albey</Text>
              <Text style={styles.infoText}>• Le stock est disponible immédiatement</Text>
              <Text style={styles.infoText}>• Utilisez-le pour vos opérations d'envoi de crédit</Text>
            </View>
          </>
        )}

        {/* ═══════════ CATÉGORIE : CRÉDIT ═══════════ */}
        {selectedCategory === 'credit' && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionLabel}>Recharger du crédit</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardIconWrapper}>
                <View style={[styles.cardIconCircle, { backgroundColor: COLORS.accentSoft }]}>
                  <IconCredit size={34} />
                </View>
              </View>

              <Text style={styles.cardTitle}>Crédit téléphonique</Text>
              <Text style={styles.cardSubtitle}>
                Rechargez votre crédit ou celui d'un proche en quelques secondes
              </Text>

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
                <View style={styles.fieldBlock}>
                  <Text style={styles.inputLabel}>📱 Numéro du bénéficiaire</Text>
                  <View style={styles.phoneInputWrapper}>
                    <Text style={styles.phonePrefix}>+227</Text>
                    <TextInput
                      style={styles.phoneInput}
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
                      Format attendu : commence par 83 ou 93, suivi de 6 chiffres.
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.fieldBlock}>
                <Text style={styles.inputLabel}>💵 Montant à recharger</Text>
                <View style={styles.amountInputWrapper}>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    value={airtimeAmount}
                    onChangeText={setAirtimeAmount}
                  />
                  <Text style={[styles.currencySymbol, { color: COLORS.accent }]}>FCFA</Text>
                </View>
              </View>

              <View style={styles.suggestionsRow}>
                {['100', '200', '500', '1000', '2000', '5000'].map((sug) => (
                  <TouchableOpacity
                    key={sug}
                    style={[
                      styles.chip,
                      airtimeAmount === sug && { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
                    ]}
                    onPress={() => setAirtimeAmount(sug)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, airtimeAmount === sug && styles.chipTextActive]}>
                      {parseInt(sug, 10).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: COLORS.accent },
                  !isAirtimeReady && styles.actionButtonDisabled,
                ]}
                onPress={handleBuyAirtime}
                disabled={!isAirtimeReady}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={airtimeMode === 'other' ? 'Envoyer le crédit' : 'Recharger le crédit'}
              >
                <Text style={styles.actionButtonText}>
                  {airtimeMode === 'other'
                    ? `Envoyer ${airtimeAmount ? `${parseInt(airtimeAmount, 10).toLocaleString()} FCFA` : ''}`
                    : `Recharger ${airtimeAmount ? `${parseInt(airtimeAmount, 10).toLocaleString()} FCFA` : ''}`}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>ℹ️ À propos du crédit</Text>
              <Text style={styles.infoText}>• Le montant est prélevé de votre solde Albey</Text>
              <Text style={styles.infoText}>• Le crédit est disponible immédiatement</Text>
              <Text style={styles.infoText}>
                • {airtimeMode === 'other'
                    ? 'Le bénéficiaire doit être un numéro NT (83 ou 93)'
                    : 'Utilisez-le pour vos appels, SMS et internet'}
              </Text>
            </View>
          </>
        )}

        {/* ═══════════ CATÉGORIE : SOFTPHONE ═══════════ */}
        {selectedCategory === 'softphone' && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionLabel}>Recharger du Softphone</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardIconWrapper}>
                <View style={[styles.cardIconCircle, { backgroundColor: COLORS.purpleSoft }]}>
                  <IconSoftphone size={34} />
                </View>
              </View>

              <Text style={styles.cardTitle}>Crédit Softphone</Text>
              <Text style={styles.cardSubtitle}>
                Rechargez le crédit Softphone d'un numéro NT (pour appels via Softphone NT)
              </Text>

              <View style={styles.fieldBlock}>
                <Text style={styles.inputLabel}>📱 Numéro du bénéficiaire</Text>
                <View style={styles.phoneInputWrapper}>
                  <Text style={[styles.phonePrefix, {
                    color: COLORS.purple,
                    backgroundColor: COLORS.purpleSoft,
                    borderRightColor: COLORS.purple + '30',
                  }]}>
                    +227
                  </Text>
                  <TextInput
                    style={styles.phoneInput}
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
                    Format attendu : commence par 83 ou 93, suivi de 6 chiffres.
                  </Text>
                )}
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.inputLabel}>💵 Montant à recharger</Text>
                <View style={styles.amountInputWrapper}>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    value={softphoneAmount}
                    onChangeText={setSoftphoneAmount}
                  />
                  <Text style={[styles.currencySymbol, { color: COLORS.purple }]}>FCFA</Text>
                </View>
              </View>

              <View style={styles.suggestionsRow}>
                {['500', '1000', '2000', '5000', '10000', '20000'].map((sug) => (
                  <TouchableOpacity
                    key={sug}
                    style={[
                      styles.chip,
                      softphoneAmount === sug && { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
                    ]}
                    onPress={() => setSoftphoneAmount(sug)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, softphoneAmount === sug && styles.chipTextActive]}>
                      {parseInt(sug, 10).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: COLORS.purple },
                  !isSoftphoneReady && styles.actionButtonDisabled,
                ]}
                onPress={handleBuySoftphone}
                disabled={!isSoftphoneReady}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Envoyer le crédit Softphone"
              >
                <Text style={styles.actionButtonText}>
                  Envoyer {softphoneAmount ? `${parseInt(softphoneAmount, 10).toLocaleString()} FCFA` : ''}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>ℹ️ À propos du Softphone</Text>
              <Text style={styles.infoText}>• Le montant est prélevé de votre solde Albey</Text>
              <Text style={styles.infoText}>• Le crédit est disponible immédiatement</Text>
              <Text style={styles.infoText}>• Le bénéficiaire doit être un numéro Niger Télécoms</Text>
            </View>
          </>
        )}

        {/* ═══════════ CATÉGORIE : BLR ═══════════ */}
        {selectedCategory === 'blr' && (
          <>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccent, { backgroundColor: COLORS.sky }]} />
              <Text style={styles.sectionLabel}>Boucle Locale Radio</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardIconWrapper}>
                <View style={[styles.cardIconCircle, { backgroundColor: COLORS.skySoft }]}>
                  <IconBLR size={34} />
                </View>
              </View>

              <Text style={styles.cardTitle}>Abonnement BLR</Text>
              <Text style={styles.cardSubtitle}>
                Vérifiez votre abonnement BLR puis réabonnez-vous en quelques secondes.
              </Text>

              <View style={styles.fieldBlock}>
                <Text style={styles.inputLabel}>📡 Numéro BLR</Text>
                <View style={styles.phoneInputWrapper}>
                  <Text
                    style={[
                      styles.phonePrefix,
                      {
                        color: COLORS.sky,
                        backgroundColor: COLORS.skySoft,
                        borderRightColor: COLORS.sky + '30',
                      },
                    ]}
                  >
                    BLR
                  </Text>
                  <TextInput
                    style={styles.phoneInput}
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
              </View>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: COLORS.sky },
                  (!blrNumber.trim() || blrLoading) && styles.actionButtonDisabled,
                ]}
                onPress={handleCheckBLR}
                disabled={!blrNumber.trim() || blrLoading}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Vérifier l'abonnement BLR"
              >
                {blrLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.actionButtonText}>Vérifier l'abonnement</Text>
                )}
              </TouchableOpacity>
            </View>

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
                        color:
                          Number(blrResult.facture || 0) > 0
                            ? COLORS.danger
                            : COLORS.success,
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
                  accessibilityRole="button"
                  accessibilityLabel="Réabonner la BLR"
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

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>ℹ️ À propos de la BLR</Text>
              <Text style={styles.infoText}>
                • La BLR (Boucle Locale Radio) est un service Internet haut débit NT
              </Text>
              <Text style={styles.infoText}>
                • Saisissez votre numéro BLR (ex : BLR0000NY) pour vérifier votre abonnement
              </Text>
              <Text style={styles.infoText}>
                • Vous pourrez ensuite procéder au réabonnement en toute sécurité
              </Text>
            </View>
          </>
        )}

      </ScrollView>

      {/* ═══════════ MODAL DE CONFIRMATION ═══════════ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: modalWidth }]}>
            <View style={styles.modalIconWrapper}>
              <View
                style={[
                  styles.modalIconCircle,
                  {
                    backgroundColor: selectedProduct?.isBLRResubscribe
                      ? COLORS.skySoft
                      : COLORS.primarySoft,
                  },
                ]}
              >
                {selectedProduct?.isBLRResubscribe ? <IconBLR size={40} /> : <IconShop size={54} />}
              </View>
            </View>

            <Text style={styles.modalTitle}>
              {selectedProduct?.isBLRResubscribe
                ? 'Confirmer le réabonnement'
                : selectedProduct?.isForOther || selectedProduct?.isSoftphone
                  ? 'Confirmer l\'envoi'
                  : 'Confirmer l\'achat'}
            </Text>
            <Text style={styles.modalSubtitle}>{selectedProduct?.name}</Text>
            <Text style={styles.modalPrice}>
              {selectedProduct?.finalAmount?.toLocaleString()} FCFA
            </Text>

            {(selectedProduct?.isForOther || selectedProduct?.isSoftphone) && (
              <View style={styles.modalPhoneWrapper}>
                <Text style={styles.modalPhone}>
                  Destinataire : +227 {selectedProduct.phoneNumber}
                </Text>
              </View>
            )}

            {selectedProduct?.isBLRResubscribe && (
              <View style={styles.modalPhoneWrapper}>
                <Text style={styles.modalPhone}>
                  Abonnement : {selectedProduct.blrNumber}
                </Text>
              </View>
            )}

            {isBiometricAvailable && useBiometric ? (
              <>
                <Text style={styles.modalLabel}>
                  Confirmez avec votre empreinte digitale
                </Text>

                <TouchableOpacity
                  style={styles.biometricButton}
                  onPress={authenticateWithBiometrics}
                  activeOpacity={0.75}
                  disabled={isProcessing || isVerifyingAuth}
                >
                  {isProcessing || isVerifyingAuth ? (
                    <ActivityIndicator color={COLORS.primary} size="small" />
                  ) : (
                    <Image
                      source={require('../assets/images/print.png')}
                      style={styles.biometricIcon}
                    />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={authenticateWithBiometrics}
                  disabled={isProcessing || isVerifyingAuth}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Confirmer avec l'empreinte"
                >
                  {isProcessing || isVerifyingAuth ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Confirmer</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchMethodButton}
                  onPress={() => setUseBiometric(false)}
                  disabled={isProcessing || isVerifyingAuth}
                  activeOpacity={0.7}
                >
                  <Text style={styles.switchMethodText}>🔑 Utiliser mon mot de passe</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalLabel}>
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
                    editable={!isProcessing && !isVerifyingAuth}
                  />
                  <TouchableOpacity
                    style={styles.pinEyeButton}
                    onPress={() => setPinVisible((v) => !v)}
                    disabled={isProcessing || isVerifyingAuth}
                    activeOpacity={0.7}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    {pinVisible ? <IconEyeOpen /> : <IconEyeClosed />}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.pinToggleLabelWrapper}
                  onPress={() => setPinVisible((v) => !v)}
                  disabled={isProcessing || isVerifyingAuth}
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
                    disabled={isProcessing || isVerifyingAuth}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.switchMethodText}>👆 Utiliser mon empreinte</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={confirmWithPin}
                  disabled={isProcessing || isVerifyingAuth}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Confirmer avec le mot de passe"
                >
                  {isProcessing || isVerifyingAuth ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Confirmer</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={closeModal}
              disabled={isProcessing || isVerifyingAuth}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Annuler l'achat"
            >
              <Text style={styles.cancelButtonText}>
                {isProcessing || isVerifyingAuth ? 'Traitement en cours…' : 'Annuler'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════════════ */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  /* ─── Header ──────────────────────────────────────────────────── */
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
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },

  /* ─── Loading ─────────────────────────────────────────────────── */
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    marginTop: 16,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },

  scrollContent: { paddingBottom: 40 },

  /* ─── Section header ──────────────────────────────────────────── */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionAccent: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },

  /* ─── Categories grid ─────────────────────────────────────────── */
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  categoryCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 20,
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
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  categoryDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 15,
    fontWeight: '500',
  },

  /* ─── Card ────────────────────────────────────────────────────── */
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
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
  cardIconWrapper: { alignItems: 'center', marginBottom: 12 },
  cardIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 18,
    fontWeight: '500',
  },

  /* ─── Inputs ──────────────────────────────────────────────────── */
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    height: 60,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    paddingVertical: 0,
    letterSpacing: -0.5,
  },
  currencySymbol: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    marginLeft: 8,
    letterSpacing: 0.5,
  },

  /* ─── Phone ───────────────────────────────────────────────────── */
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    height: 56,
    overflow: 'hidden',
  },
  phonePrefix: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 16,
    backgroundColor: COLORS.accentSoft,
    borderRightWidth: 1,
    borderRightColor: COLORS.accent + '25',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 0,
    letterSpacing: 0.5,
  },
  fieldBlock: { marginBottom: 16 },
  fieldHint: {
    fontSize: 11,
    color: COLORS.danger,
    marginTop: 6,
    fontStyle: 'italic',
    fontWeight: '500',
  },

  /* ─── Chips ───────────────────────────────────────────────────── */
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: -0.1,
  },
  chipTextActive: { color: '#FFFFFF' },

  /* ─── Mode toggle ─────────────────────────────────────────────── */
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  modeBtnActive: { backgroundColor: COLORS.primary },
  modeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: -0.1,
  },
  modeTextActive: { color: '#FFFFFF' },

  /* ─── Action button ───────────────────────────────────────────── */
  actionButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  /* ─── Info card ───────────────────────────────────────────────── */
  infoCard: {
    backgroundColor: COLORS.primarySoft,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '25',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginBottom: 10,
    letterSpacing: -0.1,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
    lineHeight: 18,
    fontWeight: '500',
  },

  /* ─── Modal ───────────────────────────────────────────────────── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'stretch',
  },
  modalIconWrapper: { alignItems: 'center', marginBottom: 12 },
  modalIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalPrice: {
    fontSize: 26,
    color: COLORS.primary,
    fontWeight: '800',
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  modalPhoneWrapper: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  modalPhone: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  /* ─── PIN ─────────────────────────────────────────────────────── */
  pinInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primary + '40',
    paddingHorizontal: 12,
    marginBottom: 6,
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

  /* ─── Biométrie ───────────────────────────────────────────────── */
  biometricButton: {
    backgroundColor: COLORS.primarySoft,
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 12,
    borderWidth: 2,
    borderColor: COLORS.primary + '25',
  },
  biometricIcon: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
    tintColor: COLORS.primary,
  },
  switchMethodButton: {
    marginVertical: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  switchMethodText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  /* ─── Boutons modal ───────────────────────────────────────────── */
  confirmButton: {
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
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
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
    width: '100%',
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },

  /* ─── BLR : résultat / erreur ─────────────────────────────────── */
  blrResultCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
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
    gap: 8,
    marginBottom: 14,
  },
  blrResultDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
  },
  blrResultBadge: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.success,
    letterSpacing: -0.1,
  },
  blrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  blrRowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  blrRowValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.1,
  },
  blrErrorCard: {
    backgroundColor: COLORS.dangerSoft,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.danger + '30',
  },
  blrErrorText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.danger,
    lineHeight: 18,
  },
});