// screens/SendMoneyScreen.js - DÉCHIFFREMENT QR NT ALBEY + APPEL BACKEND RÉEL
// ✅ v11 : champ "Note optionnel" entièrement retiré (étape 3 supprimée)
// ✅ v10 : icône "Ajouter contact" retirée de l'input téléphone
//          → à la place, prompt "⭐ Ajouter aux favoris" dans le bloc "Compte trouvé"
// ✅ v10 : petite ⭐ dans le bloc contact sélectionné s'il n'est pas favori
// ✅ v9  : icônes QR / Contacts collées à l'input téléphone
// ✅ v9  : bannière frais supprimée (le calcul est déterministe)
// ✅ v8  : FIX bouton "✓ Terminé" (standalone, sans héritage de receiptButton)
// ✅ v6  : nom + téléphone visibles pour ÉMETTEUR et BÉNÉFICIAIRE
import React, { useState, useEffect, useRef } from 'react';
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
  Platform,
  Share,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
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
import { getLogoBase64 } from '../utils/pdfUtils';
import { useTransactions } from '../context/TransactionContext';
import { saveTxMetadata } from '../utils/txRefCache';
import { verifyTransactionAuth, AUTH_METHOD, AUTH_CANCELLED } from '../utils/transactionAuth';
import { parseAmount, isValidQRPayload } from '../utils/validators';
import { isDeviceCompromised, guardSensitiveOperation } from '../utils/security';

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
  gold:         '#F59E0B',
};

// ============================================================
// 🔐 DÉCHIFFREMENT DES QR CODES NT ALBEY
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
    pending:    '⏳ En attente',
    processing: '🔄 En cours',
    success:    '✅ Succès',
    failed:     '❌ Échoué',
    expired:    '⏰ Expiré',
    cancelled:  '🚫 Annulé',
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

// ===== ICÔNES SVG =====
const IconBack = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={COLORS.textPrimary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconBackWhite = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconQR = ({ color = COLORS.primary }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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

const IconContact = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={COLORS.primary} strokeWidth="1.8" />
    <Path d="M5 20v-2a7 7 0 0114 0v2" stroke={COLORS.primary} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const IconStar = ({ filled, color = '#FFD700' }) => (
  <Svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="1.8">
    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </Svg>
);

const IconClear = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={COLORS.textMuted} strokeWidth="1.8" />
    <Path d="M8 8l8 8M16 8l-8 8" stroke={COLORS.textMuted} strokeWidth="1.8" strokeLinecap="round" />
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

const IconArrowRight = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M5 12h14M12 5l7 7-7 7" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
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

export default function SendMoneyScreen({ navigation }) {
  const route = useRoute();
  const { width = 400, height = 800 } = useWindowDimensions();

  const [amount, setAmount] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);

  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrInput, setQrInput] = useState('');

  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);

  const [isSending, setIsSending] = useState(false);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(false);

  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [useBiometric, setUseBiometric] = useState(false);

  const [beneficiaryCheck, setBeneficiaryCheck] = useState(null);
  const [isVerifyingQR, setIsVerifyingQR] = useState(false);

  const [qrScannerVisible, setQrScannerVisible] = useState(false);
  const [qrTorchOn, setQrTorchOn] = useState(false);
  const [qrScanned, setQrScanned] = useState(false);
  const [qrContainerSize, setQrContainerSize] = useState({ width: 0, height: 0 });
  const [qrPermission, requestQrPermission] = useCameraPermissions();
  const qrScanAnim = useRef(new Animated.Value(0)).current;

  const [currentUserPhone, setCurrentUserPhone] = useState(null);
  const [currentUserName,  setCurrentUserName]  = useState(null);

  const { addTransaction, balance, refreshWallet } = useTransactions();

  const effectiveW = qrContainerSize.width > 0 ? qrContainerSize.width : width;
  const effectiveH = qrContainerSize.height > 0 ? qrContainerSize.height : height;

  const QR_FRAME_SIZE = Math.min(effectiveW - 80, 260);
  const qrFrameTop = (effectiveH - QR_FRAME_SIZE) / 2;
  const qrFrameLeft = (effectiveW - QR_FRAME_SIZE) / 2;

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

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await API.getCurrentUser();
        const clean = user?.phone ? String(user.phone).replace(/\s/g, '').replace(/^\+?227/, '') : null;
        const name = user?.name || user?.full_name || null;
        setCurrentUserPhone(clean);
        setCurrentUserName(name);
      } catch (e) {}
    };
    loadCurrentUser();
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

  useEffect(() => {
    const loadContacts = async () => {
      try {
        const data = await API.getContacts();
        const uniqueContacts = Array.isArray(data)
          ? data.filter((c, index, arr) => arr.findIndex(x => x.id === c.id) === index)
          : [];
        setContacts(uniqueContacts);
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de charger vos contacts.');
      } finally {
        setIsLoadingContacts(false);
      }
    };
    loadContacts();
  }, []);

  useEffect(() => {
    if (selectedContact?.isFromQR) return;
    if (selectedContact) { setBeneficiaryCheck(null); return; }

    const cleanPhone = String(manualPhone || '').replace(/\s/g, '').replace(/^\+?227/, '');

    if (!cleanPhone || cleanPhone.length < 8) { setBeneficiaryCheck(null); return; }
    if (contacts.some((c) => c.phone === cleanPhone)) { setBeneficiaryCheck(null); return; }

    setBeneficiaryCheck('loading');

    const timer = setTimeout(async () => {
      try {
        const result = await API.searchCustomerByPhone(cleanPhone);
        if (String(manualPhone).replace(/\s/g, '').replace(/^\+?227/, '') !== cleanPhone) return;

        if (result) {
          let realName = extractRealName(result);
          if (!realName && result.qr_name) realName = result.qr_name;
          if (!realName) {
            const localContact = contacts.find(c => c.phone === cleanPhone);
            if (localContact?.name) realName = localContact.name;
          }
          const finalDisplayName = realName || `+227 ${cleanPhone}`;
          setBeneficiaryCheck({
            found: true,
            name: realName,
            displayName: finalDisplayName,
            kyc: result.kyc_level || result.profile?.kyc_level || null,
            isSelf: !!result.isSelf,
            fromQR: false,
          });
        } else {
          setBeneficiaryCheck({ found: false, fromQR: false });
        }
      } catch (e) {
        setBeneficiaryCheck(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [manualPhone, selectedContact, contacts]);

  const prefilledApplied = useRef(false);

  useEffect(() => {
    if (prefilledApplied.current) return;
    if (isLoadingContacts) return;

    const params = route.params;
    if (!params || !params.prefilledPhone) { prefilledApplied.current = true; return; }

    let cleanPhone = String(params.prefilledPhone).replace(/[\s\-]/g, '').replace(/^\+?227/, '');

    const existingContact = contacts.find(c => c.phone === cleanPhone);
    if (existingContact) { setSelectedContact(existingContact); setManualPhone(''); }
    else { setManualPhone(cleanPhone); }

    if (params.prefilledAmount) setAmount(String(params.prefilledAmount));

    prefilledApplied.current = true;
    navigation.setParams({
      prefilledPhone: undefined,
      prefilledName: undefined,
      prefilledAmount: undefined,
    });
  }, [isLoadingContacts, route.params, contacts, navigation]);

  // ══════════════════════════════════════════════════════════════
  // ✅ Helpers "favoris"
  // ══════════════════════════════════════════════════════════════
  const isPhoneInFavorites = (phone) => {
    const cleanPhone = String(phone || '').replace(/\s/g, '').replace(/^\+?227/, '');
    if (!cleanPhone) return false;
    return contacts.some((c) => c.phone === cleanPhone && c.isFavorite);
  };

  const isSelectedContactFavorite = selectedContact
    ? contacts.some((c) => c.phone === selectedContact.phone && c.isFavorite)
    : false;

  const handleAddFoundToFavorites = async () => {
    const cleanPhone = String(manualPhone).replace(/\s/g, '').replace(/^\+?227/, '');
    if (!cleanPhone) return;

    const name = beneficiaryCheck?.name?.trim() || `+227 ${cleanPhone}`;

    try {
      const newContact = await API.addContact({
        name,
        phone: cleanPhone,
        avatar: buildInitials(name),
        color: pickRandomContactColor(),
        isFavorite: true,
      });

      addContactSafely(newContact);
      setSelectedContact(newContact);
      setManualPhone('');
      setBeneficiaryCheck(null);

      Alert.alert(
        '⭐ Ajouté aux favoris',
        `${name} a été ajouté à vos favoris.`
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter aux favoris.');
    }
  };

  const handleAddSelectedToFavorites = async () => {
    if (!selectedContact) return;

    const cleanPhone = String(selectedContact.phone).replace(/\s/g, '').replace(/^\+?227/, '');
    const name = selectedContact.name;
    const isEphemeral =
      selectedContact.isFromQR || String(selectedContact.id).startsWith('qr-');

    try {
      if (isEphemeral) {
        const newContact = await API.addContact({
          name,
          phone: cleanPhone,
          avatar: buildInitials(name),
          color: pickRandomContactColor(),
          isFavorite: true,
        });
        addContactSafely(newContact);
        setSelectedContact(newContact);
      } else {
        await API.updateContact(selectedContact.id, { isFavorite: true });
        setContacts((prev) =>
          prev.map((c) =>
            c.id === selectedContact.id ? { ...c, isFavorite: true } : c
          )
        );
        setSelectedContact((prev) => (prev ? { ...prev, isFavorite: true } : prev));
      }

      Alert.alert('⭐ Ajouté aux favoris', `${name} a été ajouté à vos favoris.`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter aux favoris.');
    }
  };

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
        Alert.alert('❌ QR Code invalide ou expiré', 'Demandez un nouveau QR à votre bénéficiaire.', [{ text: 'Compris' }]);
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
      Alert.alert('❌ QR Code non reconnu', 'Utilisez l\'onglet « Mon QR » de NT Albey.', [{ text: 'OK' }]);
      return;
    }

    const cleanedPhone = phone.replace(/^\+?227/, '');
    const existingContact = contacts.find(c => c.phone === cleanedPhone);
    if (existingContact) {
      setSelectedContact(existingContact);
      setManualPhone('');
      setBeneficiaryCheck(null);
      if (qrAmount) setAmount(String(qrAmount));
      setTimeout(() => { closeQRScanner(); Alert.alert('✅ Contact trouvé', existingContact.name); }, 200);
      return;
    }

    setIsVerifyingQR(true);
    try {
      const result = await API.searchCustomerByPhone(cleanedPhone);

      if (!result && !qrName) {
        setIsVerifyingQR(false);
        closeQRScanner();
        Alert.alert('❌ Compte introuvable', `Le numéro ${cleanedPhone} n'est pas enregistré sur NT Albey.`, [{ text: 'Compris' }]);
        return;
      }

      let realName = qrName || extractRealName(result) || null;
      const finalDisplayName = realName || `+227 ${cleanedPhone}`;
      const initials = buildInitials(realName || cleanedPhone);

      setSelectedContact({
        id: `qr-${cleanedPhone}`,
        name: finalDisplayName,
        phone: cleanedPhone,
        avatar: initials,
        color: COLORS.primary,
        isFavorite: false,
        isFromQR: true,
      });
      setManualPhone('');
      setBeneficiaryCheck({
        found: true,
        name: realName,
        displayName: finalDisplayName,
        kyc: result?.kyc_level || null,
        isSelf: !!result?.isSelf,
        fromQR: true,
      });

      if (qrAmount) setAmount(String(qrAmount));

      setIsVerifyingQR(false);
      setTimeout(() => {
        closeQRScanner();
        Alert.alert('✅ Compte vérifié', `${finalDisplayName}\n${cleanedPhone}`, [{ text: 'Continuer' }]);
      }, 200);
    } catch (e) {
      setIsVerifyingQR(false);
      closeQRScanner();
      Alert.alert('⚠️ Impossible de vérifier', 'Le serveur NT Albey est injoignable.', [{ text: 'OK' }]);
    }
  };

  const handleQRBarcodeScanned = ({ data }) => {
    if (qrScanned) return;
    setQrScanned(true);
    applyQRDataToForm(analyzeQRData(data));
  };

  const authenticateWithBiometrics = async () => {
    if (isSending || isVerifyingAuth) return;
    setIsVerifyingAuth(true);
    try {
      await verifyTransactionAuth(AUTH_METHOD.BIOMETRIC);
      await executeTransfer();
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

  const confirmWithPin = async () => {
    if (isSending || isVerifyingAuth) return;
    if (!pin || pin.length < 8 || pin.length > 20) {
      Alert.alert('Code incorrect', 'Le mot de passe doit contenir entre 8 et 20 caractères.');
      return;
    }
    setIsVerifyingAuth(true);
    try {
      await verifyTransactionAuth(AUTH_METHOD.PIN, pin);
      setPin('');
      await executeTransfer();
    } catch (error) {
      Alert.alert('Code incorrect', error.message || 'Le mot de passe saisi est incorrect.');
      setPin('');
    } finally {
      setIsVerifyingAuth(false);
    }
  };

  const executeTransfer = async () => {
    if (!transactionDetails) return;

    if (isDeviceCompromised()) {
      Alert.alert('🔒 Opération bloquée', 'Les transactions sont désactivées sur un appareil rooté.');
      return;
    }

    const receiverPhone = String(transactionDetails.phone || '').replace(/\s/g, '').replace(/^\+?227/, '');
    const amountValue = Number(amount);

    setConfirmModalVisible(false);
    setIsSending(true);

    try {
      const result = await API.accountToAccount({ receiver_phone: receiverPhone, amount: amountValue });

      const grossAmount = Number(result.gross_amount) || amountValue;
      const feeAmount   = Number(result.fee_amount)   || 0;
      const netAmount   = Number(result.net_amount)   || grossAmount;
      const totalDebited = grossAmount + (Number(result.total_debit) || 0);
      const currency = result.currency_code || 'XOF';
      const initiatedDate = result.initiated_at
        ? new Date(result.initiated_at).toLocaleString('fr-FR')
        : new Date().toLocaleString('fr-FR');

      setTransactionDetails({
        beneficiary:    transactionDetails.beneficiary,
        phone:          receiverPhone,
        senderPhone:    currentUserPhone || '',
        senderName:     currentUserName  || 'Moi',
        reference:        result.reference,
        transactionId:    result.id,
        status:           result.status,
        transType:        result.trans_type,
        currency:         currency,
        grossAmount:      grossAmount,
        feeAmount:        feeAmount,
        netAmount:        netAmount,
        totalDebited:     totalDebited,
        amount:  grossAmount.toLocaleString() + ' ' + currency,
        fees:    feeAmount.toLocaleString()   + ' ' + currency,
        total:   totalDebited.toLocaleString() + ' ' + currency,
        date:    initiatedDate,
        _pending: false,
      });

      if (result.id) {
        await saveTxMetadata(result.id, {
          reference:       result.reference,
          sender_phone:    currentUserPhone,
          sender_name:     currentUserName,
          receiver_phone:  receiverPhone,
          receiver_name:   transactionDetails.beneficiary,
        });
      }

      try {
        const beneficiaryLabel = transactionDetails.beneficiary?.trim()
          ? transactionDetails.beneficiary
          : `+227 ${receiverPhone}`;

        await API.addNotification({
          title: '📤 Transfert envoyé',
          message: `Vous avez envoyé ${grossAmount.toLocaleString('fr-FR')} ${currency} à ${beneficiaryLabel}.`,
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
      } catch (notifError) {}

      setPin('');
      setReceiptModalVisible(true);

      if (typeof refreshWallet === 'function') await refreshWallet();
    } catch (error) {
      Alert.alert('Échec du transfert', error.message || 'Impossible d\'effectuer le transfert.');
    } finally {
      setIsSending(false);
    }
  };

  const getDisplayAmount = () => {
    if (!amount || parseInt(amount) <= 0) return '0 FCFA';
    return parseInt(amount).toLocaleString() + ' FCFA';
  };

  const generatePDFHTML = (details, logoBase64) => {
    const logoHtml = logoBase64
      ? `<img src="${logoBase64}" alt="NT Albey Logo" class="logo" />`
      : `<h1 style="color:#008933;font-size:24px;margin:0;">NT ALBEY</h1>`;

    const date = details.date || new Date().toLocaleString('fr-FR');
    const senderName = details.senderName || 'Moi';
    const senderPhoneLine = details.senderPhone ? `+227 ${details.senderPhone}` : 'Mon compte';
    const receiverName = details.beneficiary || 'N/A';
    const receiverPhoneLine = details.phone ? `+227 ${details.phone}` : 'N/A';
    const netLine = details.netAmount != null ? `${details.netAmount.toLocaleString()} ${details.currency || 'XOF'}` : 'N/A';

    return `<!DOCTYPE html>
      <html><head><meta charset="UTF-8">
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Helvetica Neue',Arial,sans-serif; padding:40px 30px; max-width:700px; margin:0 auto; color:#1A1A1A; background:#fff; }
        .header { text-align:center; border-bottom:3px solid #008933; padding-bottom:20px; margin-bottom:25px; }
        .logo { max-width:100px; height:auto; margin-bottom:6px; }
        .header h1 { color:#008933; font-size:22px; margin:0; letter-spacing:3px; font-weight:800; }
        .success-badge { text-align:center; margin-bottom:20px; }
        .success-badge span { background-color:#10B981; color:white; padding:6px 24px; border-radius:30px; font-size:14px; font-weight:700; }
        .highlight-box { background-color:#F0FFF4; border-radius:12px; padding:18px; margin:16px 0; border-left:5px solid #008933; }
        .info-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #F0F0F0; }
        .info-row:last-child { border-bottom:none; }
        .info-label { color:#666; font-size:13px; }
        .info-value { color:#1A1A1A; font-size:13px; font-weight:600; text-align:right; max-width:60%; }
        .amount-highlight { color:#008933; font-size:16px; font-weight:800; }
        .amount-sent { color:#FF6600; font-size:16px; font-weight:800; }
        .fees-value { color:#FF4444; font-weight:700; }
        .net-value { color:#10B981; font-weight:700; }
        .ref-block { background-color:#FFF3E0; border-radius:12px; padding:16px; margin:16px 0; text-align:center; }
        .ref-label { color:#666; font-size:11px; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }
        .ref-value { color:#FF6600; font-size:18px; font-weight:800; letter-spacing:2px; font-family:monospace; }
        .ref-uuid-label { color:#999; font-size:10px; text-transform:uppercase; letter-spacing:1px; margin-top:12px; }
        .ref-uuid { color:#666; font-size:10px; font-family:monospace; word-break:break-all; }
        .footer { text-align:center; margin-top:30px; padding-top:20px; border-top:2px solid #F0F0F0; color:#999; font-size:11px; }
        .footer .brand { color:#008933; font-weight:700; font-size:14px; }
      </style></head>
      <body>
        <div class="header">${logoHtml}<h1>NT ALBEY</h1></div>
        <div class="success-badge"><span>✅ TRANSFERT ${formatStatus(details.status).toUpperCase()}</span></div>
        <div class="highlight-box">
          <div class="info-row"><span class="info-label">📱 Émetteur</span><span class="info-value">${senderName}</span></div>
          <div class="info-row"><span class="info-label">📞 Tél. émetteur</span><span class="info-value">${senderPhoneLine}</span></div>
          <div class="info-row"><span class="info-label">👤 Bénéficiaire</span><span class="info-value">${receiverName}</span></div>
          <div class="info-row"><span class="info-label">📞 Tél. bénéficiaire</span><span class="info-value">${receiverPhoneLine}</span></div>
        </div>
        <div class="info-row"><span class="info-label">💰 Montant envoyé</span><span class="info-value amount-sent">${details.amount || 'N/A'}</span></div>
        <div class="info-row"><span class="info-label">📋 Frais</span><span class="info-value fees-value">${details.fees || 'N/A'}</span></div>
        <div class="info-row"><span class="info-label">🎁 Net reçu</span><span class="info-value net-value">${netLine}</span></div>
        <div class="info-row"><span class="info-label">💳 Total débité</span><span class="info-value amount-highlight">${details.total || 'N/A'}</span></div>
        <div class="info-row"><span class="info-label">📅 Date</span><span class="info-value">${date}</span></div>
        <div class="ref-block">
          <div class="ref-label">🔑 Référence transaction</div>
          <div class="ref-value">${details.reference || 'N/A'}</div>
          ${details.transactionId ? `<div class="ref-uuid-label">🆔 ID technique</div><div class="ref-uuid">${details.transactionId}</div>` : ''}
        </div>
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

      const filename = `recu_transfert_${Date.now()}.pdf`;
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

    const senderName  = details.senderName  || 'Moi';
    const senderPhone = details.senderPhone ? `+227 ${details.senderPhone}` : 'Mon compte';
    const receiverName = details.beneficiary || 'N/A';
    const receiverPhone = details.phone ? `+227 ${details.phone}` : 'N/A';
    const netLine = details.netAmount != null ? `${details.netAmount.toLocaleString()} ${details.currency || 'XOF'}` : 'N/A';

    const message =
`NT ALBEY - REÇU DE TRANSFERT
━━━━━━━━━━━━━━━━━━━━━
✅ TRANSFERT ${formatStatus(details.status).toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━
📱 Émetteur            : ${senderName}
📞 Tél. émetteur       : ${senderPhone}
👤 Bénéficiaire        : ${receiverName}
📞 Tél. bénéficiaire   : ${receiverPhone}
━━━━━━━━━━━━━━━━━━━━━
💰 Montant envoyé      : ${details.amount || 'N/A'}
📋 Frais               : ${details.fees || 'N/A'}
🎁 Net reçu            : ${netLine}
💳 Total débité        : ${details.total || 'N/A'}
📅 Date                : ${details.date || new Date().toLocaleString('fr-FR')}
🔑 Référence (API)     : ${details.reference || 'N/A'}
${details.transactionId ? `🆔 ID technique (API)  : ${details.transactionId}\n` : ''}━━━━━━━━━━━━━━━━━━━━━
📞 Support : 555 | 📧 support@ntalbey.ne`;

    Alert.alert('Reçu copié', 'Le reçu a été copié.', [
      { text: 'OK' },
      { text: 'Partager', onPress: () => Share.share({ message, title: `Reçu - ${details.reference}` }) }
    ]);
  };

  const getContactFromPhone = (phone) => {
    const cleanPhone = String(phone || '').replace(/\s/g, '').replace(/^\+?227/, '');
    return contacts.find(c => c.phone === cleanPhone);
  };

  const addContactSafely = (newContact) => {
    setContacts(prev => {
      if (prev.some(c => c.id === newContact.id)) return prev;
      if (newContact.phone && prev.some(c => c.phone === newContact.phone)) return prev;
      return [...prev, newContact];
    });
  };

  const openPhoneContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const contact = await Contacts.presentContactPickerAsync();
        if (contact) {
          const phoneNumber = contact.phoneNumbers && contact.phoneNumbers.length > 0
            ? contact.phoneNumbers[0].number.replace(/\s/g, '').replace(/[^0-9]/g, '')
            : '';
          const contactName = contact.name || 'Contact inconnu';
          if (phoneNumber) {
            const existingContact = contacts.find(c => c.phone === phoneNumber);
            if (existingContact) {
              setSelectedContact(existingContact);
              setManualPhone('');
              Alert.alert('Contact trouvé', existingContact.name);
            } else {
              const newContact = await API.addContact({
                name: contactName,
                phone: phoneNumber,
                avatar: contactName.substring(0, 2).toUpperCase(),
                color: pickRandomContactColor(),
                isFavorite: true,
              });
              addContactSafely(newContact);
              setSelectedContact(newContact);
              setManualPhone('');
              Alert.alert('C\'est fait', `${contactName} a été ajouté.`);
            }
          }
        }
      } else {
        Alert.alert('Autorisation nécessaire', 'Accès au répertoire requis.', [
          { text: 'Réessayer', onPress: openPhoneContacts },
          { text: 'Annuler', style: 'cancel' }
        ]);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'accéder aux contacts.');
    }
  };

  const clearSelectedContact = () => {
    setSelectedContact(null);
    setManualPhone('');
    setBeneficiaryCheck(null);
  };

  const handleSend = () => {
    if (!guardSensitiveOperation('l\'envoi d\'argent')) return;

    const rawPhone = selectedContact?.phone || manualPhone;
    const targetPhone = String(rawPhone || '').replace(/\s/g, '').replace(/^\+?227/, '');

    const targetName =
      selectedContact?.name
      || (beneficiaryCheck?.name && beneficiaryCheck.name.trim() ? beneficiaryCheck.name : null)
      || beneficiaryCheck?.displayName
      || `+227 ${targetPhone}`;

    if (!targetPhone || targetPhone.length < 8) {
      Alert.alert('Attention', 'Veuillez sélectionner un contact ou entrer un numéro valide.');
      return;
    }

    if (!selectedContact && beneficiaryCheck && beneficiaryCheck.found === false) {
      Alert.alert('Compte introuvable', `Le numéro ${targetPhone} n'est pas enregistré sur NT Albey.`, [{ text: 'Compris' }]);
      return;
    }

    _continueSend(targetPhone, targetName);
  };

  const _continueSend = (targetPhone, targetName) => {
    const parsed = parseAmount(amount, { min: 100, max: 2_000_000 });
    if (!parsed.ok) { Alert.alert('Montant invalide', parsed.reason); return; }
    const amountValue = parsed.value;

    if (amountValue > balance) {
      Alert.alert('Solde insuffisant', `Votre solde : ${balance.toLocaleString()} FCFA.\nMontant : ${amountValue.toLocaleString()} FCFA.`);
      return;
    }

    setTransactionDetails({
      beneficiary: targetName,
      phone: targetPhone,
      senderPhone: currentUserPhone || '',
      senderName:  currentUserName  || 'Moi',
      amount: amountValue.toLocaleString() + ' FCFA',
      date: new Date().toLocaleString('fr-FR'),
      reference: null,
      fees: null,
      total: null,
      status: null,
      grossAmount: null,
      feeAmount: null,
      netAmount: null,
      transactionId: null,
      _pending: true,
    });

    setConfirmModalVisible(true);
    setUseBiometric(isBiometricAvailable);
    setPin('');
  };

  const finishSend = () => {
    Alert.alert('C\'est fait !', 'Votre transfert a été effectué avec succès.');
    setReceiptModalVisible(false);
    setAmount('');
    setSelectedContact(null);
    setManualPhone('');
    setTransactionDetails(null);
    setBeneficiaryCheck(null);
    navigation.goBack();
  };

  const handleQRScan = () => { openQRScanner(); };

  const handleManualQRInput = () => {
    setQrInput('');
    setQrModalVisible(true);
  };

  const applyManualQRInput = async () => {
    const val = (qrInput || '').replace(/\s/g, '').replace(/^\+?227/, '');
    if (!val || val.length < 8) { Alert.alert('Attention', 'Veuillez entrer un numéro valide.'); return; }

    const existingContact = contacts.find(c => c.phone === val);
    if (existingContact) {
      setSelectedContact(existingContact);
      setManualPhone('');
      Alert.alert('Contact trouvé', existingContact.name);
    } else {
      try {
        const newContact = await API.addContact({
          name: `QR-${val.slice(-4)}`,
          phone: val,
          avatar: 'QR',
          color: pickRandomContactColor(),
          isFavorite: true,
        });
        addContactSafely(newContact);
        setSelectedContact(newContact);
        setManualPhone('');
      } catch (e) {
        setSelectedContact({
          id: `qr-${val}`,
          name: `QR-${val.slice(-4)}`,
          phone: val,
          avatar: 'QR',
          color: pickRandomContactColor(),
          isFavorite: false,
          isFromQR: true,
        });
        setManualPhone('');
      }
    }

    setQrInput('');
    setQrModalVisible(false);
  };

  const sortedContacts = [...contacts].sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
  const favoriteContacts = sortedContacts.filter(c => c.isFavorite);

  const modalWidth = width ? width - 40 : 320;
  const receiptModalWidth = width ? width - 24 : 340;
  const receiptMaxHeight = height ? Math.min(height * 0.94, height - 40) : 700;

  if (isLoadingContacts) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
            <IconBack />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Envoyer de l'argent</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement…</Text>
        </View>
      </View>
    );
  }

  const hasAmount = !!(amount && parseInt(amount) > 0);

  const isBeneficiaryValid = (() => {
    if (selectedContact) return true;
    if (!manualPhone || manualPhone.length < 8) return false;
    if (getContactFromPhone(manualPhone)) return true;
    return !!(beneficiaryCheck && beneficiaryCheck.found === true);
  })();

  const canSend = isBeneficiaryValid && hasAmount;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <IconBack />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Envoyer</Text>
          <Text style={styles.headerSubtitle}>Transfert compte à compte</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <View style={styles.stepHeader}>
          <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>1</Text></View>
          <Text style={styles.stepTitle}>À qui envoyez-vous ?</Text>
        </View>

        {/* Favoris (affichés uniquement s'il y en a) */}
        {favoriteContacts.length > 0 && (
          <>
            <Text style={styles.favoritesLabel}>⭐ Favoris</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.contactsScroll}
              contentContainerStyle={styles.contactsScrollContent}
            >
              {favoriteContacts.map((contact, index) => (
                <TouchableOpacity
                  key={`fav-${contact.id}-${index}`}
                  style={[styles.contactCard, selectedContact?.id === contact.id && styles.contactCardSelected]}
                  onPress={() => { setSelectedContact(contact); setManualPhone(''); }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.contactAvatar, { backgroundColor: contact.color }]}>
                    <Text style={styles.contactAvatarText}>{contact.avatar}</Text>
                  </View>
                  <Text style={styles.contactName} numberOfLines={1}>{contact.name}</Text>
                  <Text style={styles.contactPhone} numberOfLines={1}>{contact.phone}</Text>
                  {contact.isFavorite && <View style={styles.favoriteStar}><IconStar filled={true} /></View>}
                  {selectedContact?.id === contact.id && <View style={styles.checkBadge}><IconCheckSmall /></View>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <View style={styles.card}>
          {selectedContact ? (
            <View style={[styles.selectedContactContainer, selectedContact.isFromQR && styles.selectedContactContainerQR]}>
              <View style={styles.selectedContactInfo}>
                <View style={[styles.selectedContactAvatar, { backgroundColor: selectedContact.color }]}>
                  <Text style={styles.selectedContactAvatarText}>{selectedContact.avatar}</Text>
                </View>
                <View style={styles.selectedContactDetails}>
                  <View style={styles.selectedContactNameRow}>
                    <Text style={styles.selectedContactName} numberOfLines={1}>{selectedContact.name}</Text>
                    {selectedContact.isFromQR && <View style={styles.qrBadge}><Text style={styles.qrBadgeText}>QR ✓</Text></View>}
                  </View>
                  <Text style={styles.selectedContactPhone}>+227 {selectedContact.phone}</Text>
                </View>
              </View>

              {/* ⭐ Bouton favori — uniquement si le contact n'est pas encore favori */}
              {!isSelectedContactFavorite && (
                <TouchableOpacity
                  onPress={handleAddSelectedToFavorites}
                  style={styles.favoriteToggleBtn}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Ajouter ce contact aux favoris"
                >
                  <IconStar filled={false} />
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={clearSelectedContact} style={styles.clearContactButton} activeOpacity={0.7}>
                <IconClear />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.inputLabel}>Numéro du bénéficiaire</Text>

              {/* Input téléphone + icônes d'action collées */}
              <View style={styles.manualPhoneRow}>
                <View style={styles.manualPhoneWrapper}>
                  <Text style={styles.phonePrefix}>+227</Text>
                  <TextInput
                    style={styles.manualPhoneInput}
                    placeholder="93 45 22 71"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="phone-pad"
                    value={manualPhone}
                    onChangeText={(text) => {
                      setManualPhone(text);
                      const contact = getContactFromPhone(text);
                      setSelectedContact(contact || null);
                    }}
                  />
                </View>

                <View style={styles.inputActionsIcons}>
                  <TouchableOpacity
                    style={styles.miniIconButton}
                    onPress={handleQRScan}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel="Scanner un QR Code"
                  >
                    <IconQR color={COLORS.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.miniIconButton}
                    onPress={openPhoneContacts}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel="Choisir dans mes contacts"
                  >
                    <IconContact />
                  </TouchableOpacity>
                </View>
              </View>

              {beneficiaryCheck === 'loading' && (
                <View style={styles.beneficiaryLoadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.beneficiaryLoadingText}>Vérification du bénéficiaire…</Text>
                </View>
              )}

              {beneficiaryCheck && beneficiaryCheck.found === true && (
                <View style={[styles.beneficiaryFoundContainer, beneficiaryCheck.isSelf && styles.beneficiaryFoundContainerSelf]}>
                  <View style={styles.beneficiaryFoundHeader}>
                    <View style={[styles.beneficiaryBadgeIcon, beneficiaryCheck.isSelf && { backgroundColor: '#DBEAFE' }]}>
                      <Text style={{ fontSize: 14 }}>{beneficiaryCheck.isSelf ? 'ℹ️' : '✓'}</Text>
                    </View>
                    <Text style={[styles.beneficiaryFoundTitle, beneficiaryCheck.isSelf && styles.beneficiaryFoundTitleSelf]}>
                      {beneficiaryCheck.isSelf ? 'C\'est votre propre numéro' : 'Compte NT Albey trouvé'}
                    </Text>
                  </View>
                  <Text style={styles.beneficiaryFoundName}>
                    {beneficiaryCheck.name || beneficiaryCheck.displayName || `+227 ${manualPhone}`}
                  </Text>

                  {/* ⭐ Prompt favori — seulement si le numéro n'est pas déjà favori */}
                  {!isPhoneInFavorites(manualPhone) && !beneficiaryCheck.isSelf && (
                    <TouchableOpacity
                      style={styles.addFavoritePrompt}
                      onPress={handleAddFoundToFavorites}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="Ajouter ce numéro aux favoris"
                    >
                      <IconStar filled={false} />
                      <Text style={styles.addFavoritePromptText}>
                        Ajouter aux favoris
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {beneficiaryCheck && beneficiaryCheck.found === false && (
                <View style={styles.unknownBeneficiaryContainer}>
                  <View style={styles.unknownHeader}>
                    <Text style={styles.unknownIcon}>⚠️</Text>
                    <Text style={styles.unknownBeneficiaryTitle}>Compte introuvable sur NT Albey</Text>
                  </View>
                  <Text style={styles.unknownBeneficiaryText}>Ce numéro n'est pas (encore) enregistré.</Text>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.stepHeader}>
          <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>2</Text></View>
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
              autoFocus={!amount}
            />
            <Text style={styles.currencySymbol}>FCFA</Text>
          </View>

          <View style={styles.suggestionsRow}>
            {['5000', '10000', '25000', '50000'].map((sug, index) => (
              <TouchableOpacity
                key={`sug-${sug}-${index}`}
                style={[styles.suggestionChip, amount === sug && styles.suggestionChipActive]}
                onPress={() => setAmount(sug)}
                activeOpacity={0.75}
              >
                <Text style={[styles.suggestionText, amount === sug && styles.suggestionTextActive]}>
                  {parseInt(sug).toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.85}
        >
          <View style={styles.sendButtonContent}>
            <Text style={[styles.sendButtonText, !canSend && styles.sendButtonTextDisabled]}>
              {selectedContact
                ? `Envoyer à ${selectedContact.name.split(' ')[0]}`
                : amount
                  ? `Envoyer ${parseInt(amount).toLocaleString()} FCFA`
                  : 'Envoyer'}
            </Text>
            {canSend && <View style={styles.sendIconCircle}><IconArrowRight /></View>}
          </View>
        </TouchableOpacity>

      </ScrollView>

      {/* MODAL SCANNER QR */}
      <Modal visible={qrScannerVisible} animationType="fade" presentationStyle="fullScreen" statusBarTranslucent={true}
        onRequestClose={() => { if (!isVerifyingQR) closeQRScanner(); }}>
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
              <Text style={styles.qrPermissionText}>Pour scanner un QR Code, NT Albey a besoin d'accéder à votre caméra.</Text>
              <TouchableOpacity style={styles.qrPermissionButton} onPress={requestQrPermission} activeOpacity={0.85}>
                <Text style={styles.qrPermissionButtonText}>Autoriser la caméra</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.qrManualLink} onPress={() => { closeQRScanner(); handleManualQRInput(); }}>
                <Text style={styles.qrManualLinkText}>Ou saisir manuellement →</Text>
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
                  <Text style={styles.qrInstructionSubtitle}>Le scan est automatique</Text>
                </View>
              )}
              {isVerifyingQR && (
                <View style={styles.qrVerifyingOverlay}>
                  <View style={styles.qrVerifyingBox}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.qrVerifyingText}>Vérification du compte…</Text>
                    <Text style={styles.qrVerifyingSubtext}>Recherche dans la base</Text>
                  </View>
                </View>
              )}
              {!isVerifyingQR && (
                <TouchableOpacity style={styles.qrCloseButton} onPress={closeQRScanner} activeOpacity={0.85}>
                  <IconBackWhite />
                </TouchableOpacity>
              )}
              {!isVerifyingQR && (
                <>
                  <View style={styles.qrTopTitle} pointerEvents="none">
                    <Text style={styles.qrTopTitleText}>Scanner un QR Code</Text>
                  </View>
                  <TouchableOpacity style={styles.qrTorchButton} onPress={() => setQrTorchOn(v => !v)} activeOpacity={0.85}>
                    {qrTorchOn ? <IconFlashOn /> : <IconFlashOff />}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.qrManualBottomButton} onPress={() => { closeQRScanner(); handleManualQRInput(); }} activeOpacity={0.85}>
                    <Text style={styles.qrManualBottomButtonText}>⌨️ Saisir manuellement</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>
      </Modal>

      {/* MODAL SAISIE MANUELLE QR */}
      <Modal animationType="slide" transparent={true} visible={qrModalVisible} onRequestClose={() => setQrModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: modalWidth }]}>
            <View style={styles.modalDragHandle} />
            <Text style={styles.modalTitle}>Saisie manuelle</Text>
            <Text style={styles.modalSubtitle}>Entrez le numéro du bénéficiaire</Text>
            <View style={styles.manualPhoneWrapper}>
              <Text style={styles.phonePrefix}>+227</Text>
              <TextInput style={styles.manualPhoneInput} placeholder="93123456" placeholderTextColor={COLORS.textMuted} keyboardType="phone-pad" value={qrInput} onChangeText={setQrInput} autoFocus />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => { setQrModalVisible(false); setQrInput(''); }} activeOpacity={0.75}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={applyManualQRInput} activeOpacity={0.85}>
                <Text style={styles.confirmButtonText}>Valider</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL CONFIRMATION */}
      <Modal animationType="slide" transparent={true} visible={confirmModalVisible}
        onRequestClose={() => { if (isSending || isVerifyingAuth) return; setConfirmModalVisible(false); setPin(''); setUseBiometric(isBiometricAvailable); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModalContent, { width: modalWidth }]}>
            <View style={styles.confirmIconWrapper}>
              <Svg width="60" height="60" viewBox="0 0 100 100" fill="none">
                <Circle cx="50" cy="50" r="45" fill={COLORS.primarySoft} />
                <Path d="M30 50 L70 50" stroke={COLORS.accent} strokeWidth="4" strokeLinecap="round" />
                <Path d="M60 40 L70 50 L60 60" stroke={COLORS.accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <Circle cx="35" cy="50" r="6" fill={COLORS.primary} />
                <Circle cx="65" cy="50" r="6" fill={COLORS.success} />
              </Svg>
            </View>
            <Text style={styles.confirmTitle}>Confirmer l'envoi</Text>
            <Text style={styles.confirmAmount}>{getDisplayAmount()}</Text>
            <Text style={styles.confirmRecipient}>
              à {selectedContact?.name || transactionDetails?.beneficiary || `+227 ${manualPhone}`}
            </Text>
            <View style={styles.confirmInfoBox}>
              <View style={styles.confirmInfoRow}>
                <Text style={styles.confirmInfoLabel}>Frais</Text>
                <Text style={styles.confirmInfoValue}>Calculés par NT Albey</Text>
              </View>
            </View>
            {isBiometricAvailable && useBiometric ? (
              <>
                <Text style={styles.confirmHintText}>Confirmez avec votre empreinte</Text>
                <TouchableOpacity style={styles.biometricButton} onPress={authenticateWithBiometrics} activeOpacity={0.75} disabled={isSending || isVerifyingAuth}>
                  {isSending || isVerifyingAuth ? <ActivityIndicator color={COLORS.primary} size="small" /> : <Image source={require('../assets/images/print.png')} style={styles.biometricIcon} />}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButtonFull, styles.confirmButton]} onPress={authenticateWithBiometrics} disabled={isSending || isVerifyingAuth} activeOpacity={0.85}>
                  {isSending || isVerifyingAuth ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.confirmButtonText}>Confirmer</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.switchMethodButton} onPress={() => setUseBiometric(false)} disabled={isSending || isVerifyingAuth} activeOpacity={0.7}>
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
                    editable={!isSending && !isVerifyingAuth}
                  />
                  <TouchableOpacity style={styles.pinEyeButton} onPress={() => setPinVisible((v) => !v)} disabled={isSending || isVerifyingAuth} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    {pinVisible ? <IconEyeOpen /> : <IconEyeClosed />}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.pinToggleLabelWrapper} onPress={() => setPinVisible((v) => !v)} disabled={isSending || isVerifyingAuth} activeOpacity={0.7}>
                  <Text style={styles.pinToggleLabelText}>{pinVisible ? 'Masquer' : 'Afficher'} le mot de passe</Text>
                </TouchableOpacity>
                {isBiometricAvailable && (
                  <TouchableOpacity style={styles.switchMethodButton} onPress={() => setUseBiometric(true)} disabled={isSending || isVerifyingAuth} activeOpacity={0.7}>
                    <Text style={styles.switchMethodText}>👆 Utiliser mon empreinte</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.modalButtonFull, styles.confirmButton]} onPress={confirmWithPin} disabled={isSending || isVerifyingAuth} activeOpacity={0.85}>
                  {isSending || isVerifyingAuth ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.confirmButtonText}>Confirmer</Text>}
                </TouchableOpacity>
              </>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]}
                onPress={() => { setConfirmModalVisible(false); setPin(''); setUseBiometric(isBiometricAvailable); }}
                disabled={isSending || isVerifyingAuth} activeOpacity={0.75}>
                <Text style={styles.cancelButtonText}>{isSending || isVerifyingAuth ? 'Envoi en cours…' : 'Annuler'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══════════════ MODAL REÇU ═══════════════ */}
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
                          {transactionDetails.senderPhone
                            ? `+227 ${transactionDetails.senderPhone}`
                            : 'Mon compte'}
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
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🎨 STYLES PREMIUM
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 40 },

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

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, color: COLORS.textSecondary, fontSize: 14, fontWeight: '500' },

  stepHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 20, marginBottom: 10, gap: 10 },
  stepBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
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

  // ─── Favoris ──────────────────────────────────────────────
  favoritesLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
    paddingHorizontal: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  contactsScroll: { maxHeight: 130 },
  contactsScrollContent: { paddingLeft: 16, paddingRight: 8, gap: 10 },

  contactCard: { width: 90, alignItems: 'center', backgroundColor: COLORS.surface, paddingVertical: 14, paddingHorizontal: 8, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderSoft, position: 'relative' },
  contactCardSelected: { borderWidth: 2, borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  contactAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  contactAvatarText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  contactName: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  contactPhone: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  favoriteStar: { position: 'absolute', top: 8, right: 8 },
  checkBadge: { position: 'absolute', top: 6, left: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.surface },

  // ─── Contact sélectionné ───────────────────────────────────
  selectedContactContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.primarySoft, borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: COLORS.primary + '30' },
  selectedContactContainerQR: { borderColor: COLORS.primary, backgroundColor: COLORS.successSoft },
  selectedContactInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  selectedContactAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  selectedContactAvatarText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  selectedContactDetails: { flex: 1 },
  selectedContactNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  selectedContactName: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.2 },
  selectedContactPhone: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  clearContactButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  favoriteToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF9DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#FFD70040',
  },
  qrBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  qrBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  // ─── Input téléphone + icônes d'action ────────────────────
  inputLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, letterSpacing: 0.2 },

  manualPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manualPhoneWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  phonePrefix: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 15,
    backgroundColor: COLORS.primarySoft,
    borderRightWidth: 1,
    borderRightColor: COLORS.primary + '20',
  },
  manualPhoneInput: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
    minWidth: 0,
  },

  inputActionsIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniIconButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '25',
  },

  // ─── Vérification bénéficiaire ─────────────────────────────
  beneficiaryLoadingContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 6 },
  beneficiaryLoadingText: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', fontWeight: '500' },
  beneficiaryFoundContainer: { backgroundColor: COLORS.successSoft, borderRadius: 14, padding: 14, marginTop: 12, borderWidth: 1, borderColor: COLORS.success + '50' },
  beneficiaryFoundContainerSelf: { backgroundColor: '#DBEAFE', borderColor: '#3B82F650' },
  beneficiaryFoundHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  beneficiaryBadgeIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center' },
  beneficiaryFoundTitle: { fontSize: 12, color: COLORS.primary, fontWeight: '800', letterSpacing: 0.2 },
  beneficiaryFoundTitleSelf: { color: '#1565C0' },
  beneficiaryFoundName: { fontSize: 16, color: COLORS.textPrimary, fontWeight: '800', letterSpacing: -0.2 },

  // ⭐ Prompt "Ajouter aux favoris"
  addFavoritePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFD70060',
    ...Platform.select({
      ios: { shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  addFavoritePromptText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.1,
  },

  unknownBeneficiaryContainer: { backgroundColor: COLORS.warningSoft, borderRadius: 14, padding: 14, marginTop: 12, borderWidth: 1, borderColor: COLORS.warning + '50' },
  unknownHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  unknownIcon: { fontSize: 16 },
  unknownBeneficiaryTitle: { fontSize: 13, color: '#B45309', fontWeight: '800', flex: 1 },
  unknownBeneficiaryText: { fontSize: 12, color: '#78350F', lineHeight: 18, fontWeight: '500' },

  // ─── Montant ───────────────────────────────────────────────
  amountInputContainer: { flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 2, borderBottomColor: COLORS.primary, paddingBottom: 10, marginBottom: 20 },
  amountInput: { flex: 1, fontSize: 42, fontWeight: '800', color: COLORS.textPrimary, padding: 0, letterSpacing: -1.5 },
  currencySymbol: { fontSize: 16, fontWeight: '800', color: COLORS.primary, marginBottom: 6, marginLeft: 8, letterSpacing: 0.5 },

  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: { flex: 1, minWidth: 70, backgroundColor: COLORS.surfaceAlt, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  suggestionChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  suggestionText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', letterSpacing: -0.1 },
  suggestionTextActive: { color: '#FFFFFF' },

  // ─── Bouton envoyer ────────────────────────────────────────
  sendButton: {
    marginHorizontal: 16, marginTop: 24, borderRadius: 18, backgroundColor: COLORS.primary,
    paddingVertical: 18, paddingHorizontal: 22,
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
      android: { elevation: 6 },
    }),
  },
  sendButtonDisabled: { backgroundColor: COLORS.border, ...Platform.select({ ios: { shadowOpacity: 0 }, android: { elevation: 0 } }) },
  sendButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sendButtonText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2, flex: 1 },
  sendButtonTextDisabled: { color: COLORS.textMuted },
  sendIconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },

  // ─── Modales ───────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 22 },
  modalDragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', letterSpacing: -0.3 },
  modalSubtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 20 },

  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 4, width: '100%' },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalButtonFull: { width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },

  cancelButton: { backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border },
  cancelButtonText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '700' },
  confirmButton: {
    backgroundColor: COLORS.primary,
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  confirmButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },

  // ─── QR Scanner ────────────────────────────────────────────
  qrScannerContainer: { flex: 1, backgroundColor: '#000', position: 'relative', overflow: 'hidden' },
  qrCenterContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, backgroundColor: '#000' },
  qrLoadingText: { marginTop: 14, color: '#94A3B8', fontSize: 14 },
  qrPermissionIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(0,230,118,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  qrPermissionTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  qrPermissionText: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 24, lineHeight: 21 },
  qrPermissionButton: { backgroundColor: COLORS.primary, paddingVertical: 15, paddingHorizontal: 32, borderRadius: 14, alignItems: 'center', marginBottom: 14 },
  qrPermissionButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  qrManualLink: { padding: 8 },
  qrManualLinkText: { color: '#00E676', fontSize: 14, fontWeight: '700' },
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
  qrInstructionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  qrInstructionSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 },
  qrVerifyingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  qrVerifyingBox: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, alignItems: 'center', minWidth: 240 },
  qrVerifyingText: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginTop: 16, textAlign: 'center' },
  qrVerifyingSubtext: { fontSize: 12, color: COLORS.textMuted, marginTop: 6, textAlign: 'center' },
  qrCloseButton: { position: 'absolute', top: 52, left: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', zIndex: 20 },
  qrTopTitle: { position: 'absolute', top: 64, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  qrTopTitleText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.4, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  qrTorchButton: { position: 'absolute', bottom: 120, width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignSelf: 'center', left: '50%', marginLeft: -28 },
  qrManualBottomButton: { position: 'absolute', bottom: 50, alignSelf: 'center', left: '50%', marginLeft: -110, width: 220, paddingVertical: 12, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  qrManualBottomButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },

  // ─── Modal Confirmation ────────────────────────────────────
  confirmModalContent: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 24, alignItems: 'center' },
  confirmIconWrapper: { marginBottom: 16 },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.2, marginBottom: 6 },
  confirmAmount: { fontSize: 26, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.5, marginBottom: 4 },
  confirmRecipient: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 18, textAlign: 'center' },
  confirmInfoBox: { backgroundColor: COLORS.surfaceAlt, borderRadius: 12, padding: 12, width: '100%', marginBottom: 18, borderWidth: 1, borderColor: COLORS.borderSoft },
  confirmInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confirmInfoLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  confirmInfoValue: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '700' },
  confirmHintText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 12 },

  pinInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.primary + '40', paddingHorizontal: 12, marginBottom: 6, width: '100%' },
  pinInput: { flex: 1, fontSize: 18, fontWeight: '700', letterSpacing: 4, color: COLORS.textPrimary, textAlign: 'center', paddingVertical: 14 },
  pinEyeButton: { padding: 8, marginLeft: 4, alignItems: 'center', justifyContent: 'center' },
  pinToggleLabelWrapper: { alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 8, marginBottom: 8 },
  pinToggleLabelText: { fontSize: 12, fontWeight: '700', color: COLORS.primary, textDecorationLine: 'underline' },

  biometricButton: { backgroundColor: COLORS.primarySoft, width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: 4, borderWidth: 2, borderColor: COLORS.primary + '25' },
  biometricIcon: { width: 44, height: 44, resizeMode: 'contain', tintColor: COLORS.primary },
  switchMethodButton: { marginVertical: 10, paddingVertical: 6 },
  switchMethodText: { color: COLORS.primary, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },

  // ─── Reçu ──────────────────────────────────────────────────
  receiptOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, paddingTop: 40, paddingBottom: 30 },
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