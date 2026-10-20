// screens/ProfileScreen.js - Version sécurisée
// ✅ DESIGN PREMIUM : moderne, épuré, professionnel
// ✅ DateTimePicker intégré au mode édition (même logique qu'App.js)
// 🔐 SÉCURITÉ RENFORCÉE :
//    - PII (nom, email, adresse...) stockées dans SecureStore (chiffré)
//    - Utilise la même clé SecureStore que services/api.js
//    - Aucun changement dans la logique métier
// ✅ FIX v2 : le spinner biométrique s'arrête TOUJOURS
//    (activation réussie / annulée / erreur réseau / désactivation)
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
  Switch,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import DateTimePicker from '@react-native-community/datetimepicker';

import MainLayout from '../components/MainLayout';
import { API } from '../services/api';
import { useTranslation } from '../context/LanguageContext';

// ═══════════════════════════════════════════════════════════════
// 🔐 SÉCURITÉ : clé SecureStore partagée avec services/api.js
// ═══════════════════════════════════════════════════════════════
const SECURE_USER_KEY = 'ntalbey_user_profile';
const SECURE_OPTS = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/**
 * ✅ Lecture sécurisée de l'utilisateur (SecureStore prioritaire).
 *    Migre automatiquement depuis AsyncStorage si nécessaire.
 */
const readSecureUser = async () => {
  try {
    const raw = await SecureStore.getItemAsync(SECURE_USER_KEY, SECURE_OPTS);
    if (raw) {
      try { return JSON.parse(raw); } catch { return null; }
    }
    // Migration lazy depuis l'ancien AsyncStorage
    const legacy = await AsyncStorage.getItem('@ntalbey_user');
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        await SecureStore.setItemAsync(SECURE_USER_KEY, legacy, SECURE_OPTS);
        await AsyncStorage.removeItem('@ntalbey_user');
        if (__DEV__) console.log('🔁 [Profile] Migration USER → SecureStore');
        return parsed;
      } catch { return null; }
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * ✅ Écriture sécurisée de l'utilisateur.
 */
const writeSecureUser = async (userObj) => {
  try {
    await SecureStore.setItemAsync(
      SECURE_USER_KEY,
      JSON.stringify(userObj),
      SECURE_OPTS
    );
    // Nettoyer l'ancien emplacement pour éviter les fuites résiduelles
    try { await AsyncStorage.removeItem('@ntalbey_user'); } catch (_) {}
  } catch (e) {
    if (__DEV__) console.warn('⚠️ [Profile] Écriture SecureStore échouée');
    // Fallback ponctuel sur AsyncStorage
    try {
      await AsyncStorage.setItem('@ntalbey_user', JSON.stringify(userObj));
    } catch (_) {}
  }
};

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
// 🎯 ICÔNES SVG
// ═══════════════════════════════════════════════════════════════
const IconEyeOpen = ({ color = COLORS.primary }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth="1.8" />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8" />
  </Svg>
);

const IconEyeClosed = ({ color = COLORS.textMuted }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth="1.8" />
    <Path d="M3 3l18 18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8" />
  </Svg>
);

const IconEdit = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M17 3l4 4-7 7H10v-4l7-7z" stroke={COLORS.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3 21h18" stroke={COLORS.primary} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconCamera = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke="#FFF" strokeWidth="2" />
    <Path d="M20 7h-4.5L15 4h-6L8.5 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconLock = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Rect x="5" y="11" width="14" height="10" rx="2" stroke={COLORS.primary} strokeWidth="2" />
    <Path d="M8 11V7a4 4 0 018 0v4" stroke={COLORS.primary} strokeWidth="2" strokeLinecap="round" />
    <Circle cx="12" cy="16" r="1.5" fill={COLORS.primary} />
  </Svg>
);

const IconVerify = ({ color = COLORS.teal, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Path d="M8 12.5l3 3 5-5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconUpload = ({ color = COLORS.primary }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M12 3v12M8 11l4 4 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 20h14" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconChevron = ({ color = COLORS.textMuted }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconFAQ = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={COLORS.gold} strokeWidth="2" />
    <Path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" stroke={COLORS.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconSupport = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={COLORS.blue} strokeWidth="2" />
    <Path d="M8 10v2a4 4 0 008 0v-2" stroke={COLORS.blue} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const IconRefresh = ({ color = COLORS.primary }) => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <Path d="M17 2l4 4-4 4M3 11V9a4 4 0 014-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ═══════════════════════════════════════════════════════════════
// ✅ NETTOYAGE DES VALEURS PLACEHOLDER DU BACKEND
// ═══════════════════════════════════════════════════════════════
const sanitizeField = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (str === '' || str.toLowerCase() === 'string' || str.toLowerCase() === 'null') return '';
  return str;
};

const displayOrPlaceholder = (value, placeholder = 'Non renseigné') => {
  const clean = sanitizeField(value);
  return clean === '' ? placeholder : clean;
};

// ✅ Parse une date "YYYY-MM-DD" ou autre format en objet Date valide
const parseDateString = (str, fallback = new Date(2000, 0, 1)) => {
  const clean = sanitizeField(str);
  if (!clean) return fallback;

  // Format ISO YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const parsed = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // Fallback : tentative native
  const native = new Date(clean);
  if (!isNaN(native.getTime())) return native;

  return fallback;
};

// ✅ Formate un Date en "YYYY-MM-DD"
const formatDateForDisplay = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ═══════════════════════════════════════════════════════════════
// ✅ STATUTS KYC
// ═══════════════════════════════════════════════════════════════
const KYC_STATUS_CONFIG = {
  approved: { label: 'Vérifié',                  color: COLORS.teal,  bg: COLORS.tealSoft },
  pending:  { label: 'En cours de vérification', color: COLORS.gold,  bg: COLORS.goldSoft },
  rejected: { label: 'Vérification refusée',     color: COLORS.danger, bg: COLORS.dangerSoft },
  expired:  { label: 'Vérification expirée',     color: COLORS.gold,  bg: COLORS.goldSoft },
  none:     { label: 'Compte non vérifié',       color: COLORS.textMuted, bg: COLORS.surfaceAlt },
};

export default function ProfileScreen({ navigation, onLogout }) {
  const { t } = useTranslation();
  const { width = 400 } = useWindowDimensions();

  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    birthDate: '',
    address: '',
    idNumber: '',
    nationality: '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(profile);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [kycStatus, setKycStatus] = useState('none');
  const [kycLevel, setKycLevel] = useState('kyc1');
  const [kycVerificationData, setKycVerificationData] = useState(null);

  // ═════════════════════════════════════════════════════
  // 📅 ÉTAT DU DATE PICKER (mode édition)
  // ═════════════════════════════════════════════════════
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date(2000, 0, 1));

  // ═════════════════════════════════════════════════════
  // ✅ CHARGEMENT DES DONNÉES
  // ═════════════════════════════════════════════════════
  useEffect(() => {
    const loadUser = async () => {
      try {
        if (__DEV__) console.log('');
        if (__DEV__) console.log('📋 [Profile] Chargement du profil...');

        const cachedUser = await API.getCurrentUser();
        if (cachedUser) {
          if (__DEV__) console.log('📋 [Profile] User en cache :', cachedUser.name);
          applyUserToState(cachedUser);
        }

        if (cachedUser?.phone) {
          try {
            if (__DEV__) console.log('📡 [Profile] Récupération depuis l\'API...');
            const freshData = await API.getMyProfile();

            if (freshData && freshData.profile) {
              const p = freshData.profile;

              const mergedUser = {
                ...cachedUser,
                name: sanitizeField(p.full_name || p.name) || cachedUser.name,
                phone: sanitizeField(p.phone_number) || cachedUser.phone,
                email: sanitizeField(p.email) || cachedUser.email || '',
                city: sanitizeField(p.city) || '',
                address: sanitizeField(p.address) || '',
                birthDate: sanitizeField(p.date_of_birth) || cachedUser.birthDate || '',
                nationality: sanitizeField(p.nationality) || '',
                kyc_level: freshData.kyc_level || cachedUser.kyc_level || 'kyc1',
                status: sanitizeField(p.status) || cachedUser.status || 'active',
              };

              // ✅ SÉCURITÉ : écriture dans SecureStore
              await writeSecureUser(mergedUser);
              if (__DEV__) console.log('💾 [Profile] Cache chiffré mis à jour');

              applyUserToState(mergedUser);

              const userId = freshData.id || cachedUser.id;
              if (userId) {
                await fetchAndApplyKycStatus(userId, freshData.kyc_level);
              }
            }
          } catch (apiErr) {
            if (__DEV__) console.warn('⚠️ [Profile] Erreur API (on garde le cache)');
            applyKycFromLevel(cachedUser.kyc_level);
          }
        }

        try {
          const compatible = await LocalAuthentication.hasHardwareAsync();
          const enrolled = await LocalAuthentication.isEnrolledAsync();
          const available = compatible && enrolled;
          setIsBiometricSupported(available);

          if (cachedUser?.phone) {
            const isEnrolledForApp = await API.isPhoneEnrolledForBiometric(cachedUser.phone);
            setBiometricEnabled(available && isEnrolledForApp);
          }
        } catch (bioErr) {
          if (__DEV__) console.log('Erreur vérification biométrie');
          setIsBiometricSupported(false);
          setBiometricEnabled(false);
        }

        if (!cachedUser) {
          Alert.alert('Session expirée', 'Veuillez vous reconnecter');
          navigation.replace('Login');
        }
      } catch (error) {
        if (__DEV__) console.error('❌ [Profile] Erreur chargement');
        Alert.alert('Erreur', 'Impossible de charger les informations du profil');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const fetchAndApplyKycStatus = async (userId, kycLevelFromMe) => {
    try {
      if (__DEV__) console.log('📡 [Profile] Récupération statut KYC pour', userId);
      const kycData = await API.getKycStatus(userId);

      if (kycData && kycData.status) {
        if (__DEV__) console.log('✅ [Profile] Statut KYC réel :', kycData.status);
        setKycStatus(kycData.status);
        setKycVerificationData(kycData);
        if (kycData.kyc_level) setKycLevel(kycData.kyc_level);
      } else if (kycData && kycData._forbidden) {
        if (__DEV__) console.log('⚠️ [Profile] 403 KYC — on déduit du niveau');
        applyKycFromLevel(kycLevelFromMe);
      } else {
        if (__DEV__) console.log('ℹ️ [Profile] Aucune vérification KYC enregistrée');
        applyKycFromLevel(kycLevelFromMe);
      }
    } catch (e) {
      if (__DEV__) console.warn('⚠️ [Profile] Erreur récupération KYC');
      applyKycFromLevel(kycLevelFromMe);
    }
  };

  const applyKycFromLevel = (level) => {
    const lvl = level || 'kyc1';
    setKycLevel(lvl);
    if (lvl === 'kyc2' || lvl === 'kyc3') {
      setKycStatus('approved');
    } else {
      setKycStatus('none');
    }
  };

  const applyUserToState = (user) => {
    const cleanProfile = {
      name: sanitizeField(user.name),
      phone: sanitizeField(user.phone),
      birthDate: sanitizeField(user.birthDate),
      address: sanitizeField(user.address),
      idNumber: sanitizeField(user.idNumber),
      nationality: sanitizeField(user.nationality),
    };
    setProfile(cleanProfile);
    setEditForm(cleanProfile);

    if (user.kyc_level) setKycLevel(user.kyc_level);
  };

  // ═════════════════════════════════════════════════════
  // 📅 HANDLERS DU DATE PICKER
  // ═════════════════════════════════════════════════════
  const applyDate = (rawDate) => {
    if (!rawDate) {
      if (__DEV__) console.log('📅 [Profile/DatePicker] applyDate: aucune date reçue');
      return;
    }

    let dateObj = rawDate;

    if (!(rawDate instanceof Date)) {
      try {
        dateObj = new Date(rawDate);
      } catch (e) {
        if (__DEV__) console.log('❌ [Profile/DatePicker] Conversion impossible :', rawDate);
        return;
      }
    }

    if (!dateObj || isNaN(dateObj.getTime())) {
      if (__DEV__) console.log('❌ [Profile/DatePicker] Date invalide :', dateObj);
      return;
    }

    if (__DEV__) console.log('✅ [Profile/DatePicker] Date appliquée :', dateObj.toISOString());

    setSelectedDate(dateObj);
    setEditForm((prev) => ({ ...prev, birthDate: formatDateForDisplay(dateObj) }));
  };

  const onDateChange = (event, date) => {
    if (__DEV__) {
      console.log('📅 [Profile/DatePicker] onChange →', {
        type: event?.type,
        date,
        isDate: date instanceof Date,
      });
    }

    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event?.type === 'dismissed') {
      if (__DEV__) console.log('📅 [Profile/DatePicker] Annulé par l\'utilisateur');
      return;
    }

    applyDate(date);
  };

  const openDatePicker = () => {
    // Initialise le picker avec la date actuelle du formulaire
    const initial = parseDateString(editForm.birthDate, new Date(2000, 0, 1));
    if (__DEV__) console.log('📅 [Profile/DatePicker] Ouverture avec :', initial.toISOString());
    setSelectedDate(initial);
    setShowDatePicker(true);
  };

  const closeDatePickerIOS = () => {
    setShowDatePicker(false);
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    if (__DEV__) console.log('');
    if (__DEV__) console.log('🔄 [Profile] Refresh manuel → appel API');
    try {
      const freshData = await API.getMyProfile();
      if (freshData && freshData.profile) {
        const p = freshData.profile;
        const cachedUser = await API.getCurrentUser();

        const mergedUser = {
          ...(cachedUser || {}),
          name: sanitizeField(p.full_name || p.name) || cachedUser?.name || '',
          phone: sanitizeField(p.phone_number) || cachedUser?.phone || '',
          email: sanitizeField(p.email) || cachedUser?.email || '',
          city: sanitizeField(p.city) || '',
          address: sanitizeField(p.address) || '',
          birthDate: sanitizeField(p.date_of_birth) || cachedUser?.birthDate || '',
          nationality: sanitizeField(p.nationality) || '',
          kyc_level: freshData.kyc_level || cachedUser?.kyc_level || 'kyc1',
          status: sanitizeField(p.status) || cachedUser?.status || 'active',
        };

        // ✅ SÉCURITÉ : écriture dans SecureStore
        await writeSecureUser(mergedUser);
        applyUserToState(mergedUser);

        const userId = freshData.id || cachedUser?.id;
        if (userId) {
          await fetchAndApplyKycStatus(userId, freshData.kyc_level);
        }

        if (__DEV__) console.log('✅ [Profile] Refresh terminé — données à jour');
      } else {
        if (__DEV__) console.warn('⚠️ [Profile] Refresh : données invalides reçues');
        Alert.alert('Info', 'Impossible de récupérer les données fraîches. Réessayez plus tard.');
      }
    } catch (e) {
      if (__DEV__) console.warn('❌ [Profile] Erreur refresh');
      Alert.alert('Erreur', 'Impossible de rafraîchir les informations. Vérifiez votre connexion.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const pickImage = () =>
    Alert.alert('Changer la photo', 'Fonctionnalité disponible sur mobile');

  const handleSaveProfile = async () => {
    if (__DEV__) console.log('💾 [Profile] Sauvegarde...');

    const cleanEdit = {
      name: sanitizeField(editForm.name),
      phone: sanitizeField(editForm.phone),
      birthDate: sanitizeField(editForm.birthDate),
      address: sanitizeField(editForm.address),
      idNumber: sanitizeField(editForm.idNumber),
      nationality: sanitizeField(editForm.nationality),
    };

    setProfile(cleanEdit);
    setIsEditing(false);

    try {
      const cachedUser = await API.getCurrentUser();
      if (cachedUser) {
        const updated = { ...cachedUser, ...cleanEdit };
        // ✅ SÉCURITÉ : écriture dans SecureStore
        await writeSecureUser(updated);
        if (__DEV__) console.log('💾 [Profile] Cache chiffré mis à jour');
      }
    } catch (e) {
      if (__DEV__) console.warn('⚠️ [Profile] Erreur sauvegarde cache');
    }

    Alert.alert('Succès', 'Profil mis à jour');
  };

  // ═════════════════════════════════════════════════════
  // 🔐 TOGGLE BIOMÉTRIE
  // ✅ FIX v2 : le spinner s'arrête dans TOUS les cas :
  //   - activation réussie
  //   - annulation utilisateur
  //   - erreur auth biométrique
  //   - erreur API
  //   - désactivation (via finally interne)
  // ═════════════════════════════════════════════════════
  const handleBiometricToggle = async (value) => {
    if (!isBiometricSupported) {
      Alert.alert(
        '📵 Capteur indisponible',
        'Votre appareil ne dispose pas de capteur d\'empreinte digitale configuré.',
        [{ text: 'Compris' }]
      );
      return;
    }

    if (biometricLoading) return;
    setBiometricLoading(true);

    try {
      if (value) {
        // ═══════════════════════════════════════════════════
        // BRANCHE ACTIVATION
        // ═══════════════════════════════════════════════════
        let result = null;
        try {
          result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Confirmez votre identité pour activer la connexion par empreinte',
            fallbackLabel: 'Utiliser mon PIN',
            disableDeviceFallback: false,
          });
        } catch (authErr) {
          if (__DEV__) console.log('⚠️ [Bio] Erreur authenticateAsync :', authErr?.message);
          Alert.alert(
            'Erreur',
            'Impossible de lancer la vérification biométrique. Réessayez.'
          );
          return;
        }

        // Si l'utilisateur annule ou échoue → on sort, le finally coupe le spinner
        if (!result?.success) {
          if (__DEV__) console.log('ℹ️ [Bio] Authentification annulée ou échouée');
          return;
        }

        // Appel API sécurisé
        try {
          await API.enableBiometricForUser(profile.phone);
          setBiometricEnabled(true);
          Alert.alert(
            '✅ Empreinte activée',
            `Vous pouvez maintenant vous connecter au compte ${profile.phone} avec votre empreinte digitale.`,
            [{ text: 'OK' }]
          );
        } catch (apiErr) {
          if (__DEV__) console.error('❌ [Bio] Échec enableBiometricForUser :', apiErr?.message);
          Alert.alert(
            'Erreur',
            'Impossible d\'activer la connexion par empreinte. Réessayez.'
          );
        }
      } else {
        // ═══════════════════════════════════════════════════
        // BRANCHE DÉSACTIVATION
        // ═══════════════════════════════════════════════════
        // Note : on remet le spinner à false tout de suite
        //        pour laisser l'Alert prendre le relais UX.
        setBiometricLoading(false);

        Alert.alert(
          'Désactiver la connexion par empreinte ?',
          `Vous ne pourrez plus vous connecter au compte ${profile.phone} avec votre empreinte.`,
          [
            {
              text: 'Annuler',
              style: 'cancel',
              // Rien à faire — le switch reste à "activé" visuellement
              // (on ne change pas l'état local)
            },
            {
              text: 'Désactiver',
              style: 'destructive',
              onPress: async () => {
                try {
                  await API.disableBiometricForUser(profile.phone);
                  setBiometricEnabled(false);
                  Alert.alert(
                    '🔒 Empreinte désactivée',
                    'La connexion par empreinte a été désactivée.',
                    [{ text: 'OK' }]
                  );
                } catch (e) {
                  if (__DEV__) console.error('❌ [Bio] Échec disableBiometricForUser :', e?.message);
                  Alert.alert(
                    'Erreur',
                    'Impossible de désactiver la connexion par empreinte.'
                  );
                }
              },
            },
          ]
        );
        return; // ✅ On sort — pas de finally sur la branche désactivation
      }
    } catch (e) {
      if (__DEV__) console.error('❌ [Bio] Erreur toggle biométrie :', e?.message);
      Alert.alert('Erreur', 'Un problème est survenu. Veuillez réessayer.');
    } finally {
      // ✅ GARANTIE : sur la branche ACTIVATION uniquement,
      //    le spinner s'arrête quoi qu'il arrive.
      //    (la branche désactivation gère son propre loading + return)
      setBiometricLoading(false);
    }
  };

  const handleChangePin = async () => {
    if (!currentPin || currentPin.length < 8 || currentPin.length > 20) {
      return Alert.alert('PIN actuel invalide', 'Le PIN actuel doit contenir entre 8 et 20 caractères.');
    }
    if (!newPin || newPin.length < 8 || newPin.length > 20) {
      return Alert.alert('Nouveau PIN invalide', 'Le nouveau PIN doit contenir entre 8 et 20 caractères.');
    }
    if (newPin !== confirmPin) {
      return Alert.alert('PIN non identiques', 'Les deux PIN ne correspondent pas. Vérifiez votre saisie.');
    }
    if (newPin === currentPin) {
      return Alert.alert('PIN inchangé', "Le nouveau PIN doit être différent de l'ancien.");
    }

    setIsChangingPin(true);
    try {
      const user = await API.getCurrentUser();
      if (!user || !user.id) {
        setIsChangingPin(false);
        return Alert.alert('Session expirée', 'Veuillez vous reconnecter pour changer votre PIN.');
      }

      await API.changeCustomerPin(user.id, currentPin, newPin);

      setIsChangingPin(false);
      Alert.alert(
        '✅ PIN modifié',
        'Votre nouveau code PIN a été enregistré avec succès.\n\nUtilisez-le à votre prochaine connexion.',
        [
          {
            text: 'Compris',
            onPress: () => {
              setPinModalVisible(false);
              setCurrentPin('');
              setNewPin('');
              setConfirmPin('');
              setPinVisible(false);
            },
          },
        ]
      );
    } catch (error) {
      setIsChangingPin(false);
      if (__DEV__) console.error('Erreur changement PIN');

      const msg = String(error?.message || '').toLowerCase();
      let userMessage = 'Impossible de changer le PIN. Veuillez réessayer.';

      if (msg.includes('incorrect') || msg.includes('invalide')) {
        userMessage = 'Le PIN actuel que vous avez saisi est incorrect.';
      } else if (msg.includes('network') || msg.includes('joindre')) {
        userMessage = 'Impossible de joindre le serveur. Vérifiez votre connexion.';
      } else if (msg.includes('422')) {
        userMessage = 'Les PIN saisis ne respectent pas les règles (8-20 caractères).';
      }

      Alert.alert('Erreur', userMessage);
    }
  };

  const handleUploadDocument = () => {
    Alert.alert(
      'Upload de document',
      'Cette fonctionnalité permet d\'uploader votre pièce d\'identité.',
      [{ text: 'OK' }]
    );
  };

  const kycConfig = KYC_STATUS_CONFIG[kycStatus] || KYC_STATUS_CONFIG.none;
  const isKycVerified = kycStatus === 'approved';

  const modalWidth = width ? width - 40 : 320;

  const initials = profile.name
    ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  if (isLoading) {
    return (
      <MainLayout activeScreen="Profile" onLogout={onLogout}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement…</Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout activeScreen="Profile" onLogout={onLogout}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════ AVATAR / HEADER ═══════════ */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer} activeOpacity={0.85}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </View>
            <View style={styles.cameraIcon}>
              <IconCamera />
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>
            {displayOrPlaceholder(profile.name, 'Utilisateur')}
          </Text>
          <Text style={styles.userPhone}>
            {displayOrPlaceholder(profile.phone, '—')}
          </Text>

          <View style={[styles.kycBadge, { backgroundColor: kycConfig.bg }]}>
            <IconVerify color={kycConfig.color} size={16} />
            <Text style={[styles.kycBadgeText, { color: kycConfig.color }]}>
              {kycConfig.label}
            </Text>
          </View>
        </View>

        {/* ═══════════ MODE ÉDITION / LECTURE ═══════════ */}
        {isEditing ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Modifier mes informations</Text>
            </View>

            <Text style={styles.inputLabel}>Nom complet</Text>
            <TextInput
              style={styles.input}
              value={editForm.name}
              onChangeText={(value) => setEditForm({ ...editForm, name: value })}
              placeholder="Non renseigné"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.inputLabel}>Numéro de téléphone</Text>
            <TextInput
              style={styles.input}
              value={editForm.phone}
              onChangeText={(value) => setEditForm({ ...editForm, phone: value })}
              keyboardType="phone-pad"
              placeholder="Non renseigné"
              placeholderTextColor={COLORS.textMuted}
            />

            {/* ✅ DATE DE NAISSANCE AVEC DATE PICKER */}
            <Text style={styles.inputLabel}>Date de naissance</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={openDatePicker}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.datePickerText,
                  !editForm.birthDate && styles.datePickerPlaceholder,
                ]}
              >
                {editForm.birthDate || 'Sélectionner une date (AAAA-MM-JJ)'}
              </Text>
              <Text style={styles.datePickerIcon}>📅</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                  onChange={onDateChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                  locale="fr-FR"
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.datePickerDoneButton}
                    onPress={closeDatePickerIOS}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.datePickerDoneText}>Valider la date</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <Text style={styles.inputLabel}>Adresse</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={editForm.address}
              onChangeText={(value) => setEditForm({ ...editForm, address: value })}
              placeholder="Ex : Quartier Koira Kano, Rue 12, Niamey"
              placeholderTextColor={COLORS.textMuted}
              multiline
            />

            <Text style={styles.inputLabel}>Nationalité</Text>
            <TextInput
              style={styles.input}
              value={editForm.nationality}
              onChangeText={(value) => setEditForm({ ...editForm, nationality: value })}
              placeholder="Ex : NE, FR..."
              placeholderTextColor={COLORS.textMuted}
            />

            <View style={styles.editButtons}>
              <TouchableOpacity
                style={styles.cancelEditButton}
                onPress={() => {
                  setShowDatePicker(false);
                  setIsEditing(false);
                }}
                activeOpacity={0.75}
              >
                <Text style={styles.cancelEditText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveEditButton}
                onPress={handleSaveProfile}
                activeOpacity={0.85}
              >
                <Text style={styles.saveEditText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.cardIconWrap}>
                  <Text style={styles.cardIconEmoji}>👤</Text>
                </View>
                <Text style={styles.cardTitle}>Informations personnelles</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                style={styles.editHeaderButton}
                activeOpacity={0.75}
              >
                <IconEdit />
              </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nom complet</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {displayOrPlaceholder(profile.name)}
              </Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Téléphone</Text>
              <Text style={styles.infoValue}>
                {displayOrPlaceholder(profile.phone)}
              </Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date de naissance</Text>
              <Text style={styles.infoValue}>
                {displayOrPlaceholder(profile.birthDate, 'Non renseignée')}
              </Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Adresse</Text>
              <Text
                style={[styles.infoValue, styles.infoValueMultiline]}
                numberOfLines={3}
              >
                {displayOrPlaceholder(profile.address, 'Non renseignée')}
              </Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pièce d'identité</Text>
              <Text style={styles.infoValue}>
                {displayOrPlaceholder(profile.idNumber, 'Non renseignée')}
              </Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nationalité</Text>
              <Text style={styles.infoValue}>
                {displayOrPlaceholder(profile.nationality, 'Non renseignée')}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
              disabled={isRefreshing}
              activeOpacity={0.75}
            >
              {isRefreshing ? (
                <View style={styles.refreshLoadingWrapper}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.refreshButtonText}>Synchronisation…</Text>
                </View>
              ) : (
                <>
                  <IconRefresh />
                  <Text style={styles.refreshButtonText}>Rafraîchir mes informations</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ═══════════ VÉRIFICATION KYC ═══════════ */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardIconWrap, { backgroundColor: COLORS.purpleSoft }]}>
                <Text style={styles.cardIconEmoji}>🛡️</Text>
              </View>
              <Text style={styles.cardTitle}>Vérification d'identité</Text>
            </View>
          </View>

          {isKycVerified ? (
            <View style={styles.kycVerifiedCard}>
              <View style={styles.kycVerifiedIcon}>
                <IconVerify color={COLORS.teal} size={36} />
              </View>
              <Text style={styles.kycVerifiedTitle}>Compte vérifié</Text>
              <Text style={styles.kycVerifiedText}>
                Votre identité a été vérifiée. Vous bénéficiez de limites plus élevées.
              </Text>
              {kycVerificationData?.verified_at && (
                <Text style={styles.kycVerifiedDate}>
                  Vérifié le {new Date(kycVerificationData.verified_at).toLocaleDateString('fr-FR')}
                </Text>
              )}
            </View>
          ) : kycStatus === 'pending' ? (
            <View style={styles.kycPendingCard}>
              <View style={[styles.kycStatusIconWrap, { backgroundColor: COLORS.goldSoft }]}>
                <Text style={styles.kycStatusIcon}>⏳</Text>
              </View>
              <Text style={[styles.kycStatusTitle, { color: COLORS.gold }]}>
                Vérification en cours
              </Text>
              <Text style={styles.kycStatusText}>
                Votre dossier a bien été reçu et est en cours d'examen par notre équipe.
                Vous recevrez une notification dès qu'il sera traité (généralement sous 24-48h).
              </Text>
            </View>
          ) : kycStatus === 'rejected' ? (
            <>
              <View style={styles.kycRejectedCard}>
                <View style={[styles.kycStatusIconWrap, { backgroundColor: COLORS.dangerSoft }]}>
                  <Text style={styles.kycStatusIcon}>❌</Text>
                </View>
                <Text style={[styles.kycStatusTitle, { color: COLORS.danger }]}>
                  Vérification refusée
                </Text>
                <Text style={styles.kycStatusText}>
                  {kycVerificationData?.rejection_reason
                    ? `Motif : ${kycVerificationData.rejection_reason}`
                    : 'Votre dossier n\'a pas pu être validé. Veuillez soumettre de nouveaux documents.'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.kycUploadButton}
                onPress={handleUploadDocument}
                activeOpacity={0.85}
              >
                <IconUpload color="#FFF" />
                <Text style={styles.kycUploadButtonText}>Soumettre à nouveau</Text>
              </TouchableOpacity>
            </>
          ) : kycStatus === 'expired' ? (
            <>
              <View style={styles.kycPendingCard}>
                <View style={[styles.kycStatusIconWrap, { backgroundColor: COLORS.goldSoft }]}>
                  <Text style={styles.kycStatusIcon}>⏰</Text>
                </View>
                <Text style={[styles.kycStatusTitle, { color: COLORS.gold }]}>
                  Vérification expirée
                </Text>
                <Text style={styles.kycStatusText}>
                  Votre vérification d'identité a expiré. Veuillez soumettre de nouveaux documents
                  pour continuer à bénéficier de vos limites élevées.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.kycUploadButton}
                onPress={handleUploadDocument}
                activeOpacity={0.85}
              >
                <IconUpload color="#FFF" />
                <Text style={styles.kycUploadButtonText}>Renouveler ma vérification</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.kycDescription}>
                Pour augmenter vos limites de transaction, veuillez vérifier votre identité.
              </Text>

              <View style={styles.kycLimits}>
                <View style={styles.kycLimitItem}>
                  <Text style={styles.kycLimitLabel}>LIMITE ACTUELLE</Text>
                  
                  <Text style={styles.kycLimitValue}>200 000</Text>
                  <Text style={styles.kycLimitUnit}>FCFA/jour</Text>
                </View>

                <View style={styles.kycLimitDivider} />

                <View style={styles.kycLimitItem}>
                  <Text style={styles.kycLimitLabel}>APRÈS VÉRIFICATION</Text>
                  
                  <Text style={[styles.kycLimitValue, { color: COLORS.primary }]}>1 000 000</Text>
                  <Text style={styles.kycLimitUnit}>FCFA/jour</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.kycUploadButton}
                onPress={handleUploadDocument}
                activeOpacity={0.85}
              >
                <IconUpload color="#FFF" />
                <Text style={styles.kycUploadButtonText}>Uploader ma pièce d'identité</Text>
              </TouchableOpacity>

              <View style={styles.kycNoteWrapper}>
                <Text style={styles.kycNote}>
                  📄 Documents acceptés : Carte d'identité, Passeport, Permis de conduire
                </Text>
              </View>
            </>
          )}
        </View>

        {/* ═══════════ SÉCURITÉ ═══════════ */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardIconWrap, { backgroundColor: COLORS.primarySoft }]}>
                <Text style={styles.cardIconEmoji}>🔐</Text>
              </View>
              <Text style={styles.cardTitle}>Sécurité</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setPinModalVisible(true)}
            activeOpacity={0.75}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuItemIconWrap}>
                <IconLock />
              </View>
              <View>
                <Text style={styles.menuItemTitle}>Changer mon PIN</Text>
                <Text style={styles.menuItemSubtitle}>8 à 20 caractères</Text>
              </View>
            </View>
            <IconChevron />
          </TouchableOpacity>
        </View>

        {/* ═══════════ PRÉFÉRENCES ═══════════ */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardIconWrap, { backgroundColor: COLORS.blueSoft }]}>
                <Text style={styles.cardIconEmoji}>⚙️</Text>
              </View>
              <Text style={styles.cardTitle}>Préférences</Text>
            </View>
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceLeft}>
              <View style={styles.preferenceIconWrap}>
                <Text style={styles.preferenceEmoji}>🔔</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.preferenceTitle}>Notifications push</Text>
                <Text style={styles.preferenceSubtitle}>Alertes en temps réel</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.preferenceDivider} />

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceLeft}>
              <View style={styles.preferenceIconWrap}>
                <Text style={styles.preferenceEmoji}>👆</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.preferenceTitle}>Authentification biométrique</Text>
                {!isBiometricSupported && (
                  <Text style={styles.preferenceSubDisabled}>
                    📵 Non disponible sur cet appareil
                  </Text>
                )}
                {isBiometricSupported && biometricEnabled && (
                  <Text style={styles.preferenceSubEnabled}>
                    ✅ Activée pour ce compte
                  </Text>
                )}
                {isBiometricSupported && !biometricEnabled && (
                  <Text style={styles.preferenceSubInfo}>
                    Activer la connexion rapide
                  </Text>
                )}
              </View>
            </View>
            {biometricLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                disabled={!isBiometricSupported}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor="#FFFFFF"
              />
            )}
          </View>
        </View>

        {/* ═══════════ SUPPORT ═══════════ */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardIconWrap, { backgroundColor: COLORS.accentSoft }]}>
                <Text style={styles.cardIconEmoji}>💬</Text>
              </View>
              <Text style={styles.cardTitle}>Support</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('FAQ')}
            activeOpacity={0.75}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuItemIconWrap}>
                <IconFAQ />
              </View>
              <View>
                <Text style={styles.menuItemTitle}>Foire aux questions</Text>
                <Text style={styles.menuItemSubtitle}>Réponses aux questions fréquentes</Text>
              </View>
            </View>
            <IconChevron />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              Alert.alert(
                'Support',
                '📞 Appelez le 555\n📧 support@ntalbey.ne'
              )
            }
            activeOpacity={0.75}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuItemIconWrap}>
                <IconSupport />
              </View>
              <View>
                <Text style={styles.menuItemTitle}>Contacter le support</Text>
                <Text style={styles.menuItemSubtitle}>555 · support@ntalbey.ne</Text>
              </View>
            </View>
            <IconChevron />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ═══════════ MODAL CHANGEMENT DE PIN ═══════════ */}
      <Modal
        visible={pinModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!isChangingPin) {
            setPinModalVisible(false);
            setCurrentPin('');
            setNewPin('');
            setConfirmPin('');
            setPinVisible(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: modalWidth }]}>
            <View style={styles.modalIconWrap}>
              <IconLock />
            </View>

            <Text style={styles.modalTitle}>Changer mon PIN</Text>
            <Text style={styles.modalSubtitle}>
              Choisissez un nouveau code PIN sécurisé
            </Text>

            <Text style={styles.modalLabel}>PIN actuel (8-20 caractères)</Text>
            <View style={styles.modalInputWrapper}>
              <TextInput
                style={styles.modalInputField}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="default"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!pinVisible}
                maxLength={20}
                value={currentPin}
                onChangeText={setCurrentPin}
                editable={!isChangingPin}
                textAlign="center"
              />
              <TouchableOpacity
                style={styles.modalEyeButton}
                onPress={() => setPinVisible(!pinVisible)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {pinVisible ? <IconEyeOpen /> : <IconEyeClosed />}
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Nouveau PIN (8-20 caractères)</Text>
            <View style={styles.modalInputWrapper}>
              <TextInput
                style={styles.modalInputField}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="default"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!pinVisible}
                maxLength={20}
                value={newPin}
                onChangeText={setNewPin}
                editable={!isChangingPin}
                textAlign="center"
              />
              <TouchableOpacity
                style={styles.modalEyeButton}
                onPress={() => setPinVisible(!pinVisible)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {pinVisible ? <IconEyeOpen /> : <IconEyeClosed />}
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Confirmer le nouveau PIN</Text>
            <View style={styles.modalInputWrapper}>
              <TextInput
                style={styles.modalInputField}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="default"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!pinVisible}
                maxLength={20}
                value={confirmPin}
                onChangeText={setConfirmPin}
                editable={!isChangingPin}
                textAlign="center"
              />
              <TouchableOpacity
                style={styles.modalEyeButton}
                onPress={() => setPinVisible(!pinVisible)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {pinVisible ? <IconEyeOpen /> : <IconEyeClosed />}
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setPinModalVisible(false);
                  setCurrentPin('');
                  setNewPin('');
                  setConfirmPin('');
                  setPinVisible(false);
                }}
                disabled={isChangingPin}
                activeOpacity={0.75}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  isChangingPin && { backgroundColor: '#A5D6B7' },
                ]}
                onPress={handleChangePin}
                disabled={isChangingPin}
                activeOpacity={0.85}
              >
                {isChangingPin ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Modifier</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </MainLayout>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🎨 STYLES PREMIUM
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },

  avatarSection: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    padding: 4,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 1,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.surface,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  userPhone: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: '600',
  },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  kycBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 20,
    padding: 16,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconEmoji: {
    fontSize: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  editHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  infoDivider: {
    height: 1,
    backgroundColor: COLORS.borderSoft,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flexShrink: 0,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
    letterSpacing: -0.1,
  },
  infoValueMultiline: {
    lineHeight: 19,
  },

  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 12,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  inputMultiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },

  // ✅ Styles du Date Picker (mode édition)
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  datePickerText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  datePickerPlaceholder: {
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  datePickerIcon: {
    fontSize: 18,
  },
  datePickerContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    marginTop: 8,
    overflow: 'hidden',
  },
  datePickerDoneButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  datePickerDoneText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  editButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  cancelEditButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelEditText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  saveEditButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
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
  saveEditText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  refreshButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  refreshLoadingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButtonText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  kycDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 19,
    fontWeight: '500',
  },
  kycLimits: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  kycLimitItem: {
    flex: 1,
    alignItems: 'center',
  },
  kycLimitDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  kycLimitLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginBottom: 6,
    textAlign: 'center',
    fontWeight: '800',
    letterSpacing: 1,
  },
  kycLimitLevel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  kycLimitValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  kycLimitUnit: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  kycUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
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
  kycUploadButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  kycNoteWrapper: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  kycNote: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 16,
  },

  kycVerifiedCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.tealSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.teal + '25',
  },
  kycVerifiedIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  kycVerifiedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  kycVerifiedText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
  kycVerifiedDate: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 10,
    fontStyle: 'italic',
    fontWeight: '600',
  },

  kycPendingCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.goldSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gold + '25',
  },
  kycStatusIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  kycStatusIcon: {
    fontSize: 32,
  },
  kycStatusTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  kycStatusText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },

  kycRejectedCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.danger + '25',
    marginBottom: 12,
  },

  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuItemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  menuItemTitle: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  menuItemSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.borderSoft,
    marginVertical: 4,
  },

  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  preferenceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  preferenceEmoji: {
    fontSize: 18,
  },
  preferenceTitle: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  preferenceSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  preferenceSubEnabled: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 2,
    fontWeight: '700',
  },
  preferenceSubDisabled: {
    fontSize: 11,
    color: COLORS.accent,
    marginTop: 2,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  preferenceSubInfo: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  preferenceDivider: {
    height: 1,
    backgroundColor: COLORS.borderSoft,
    marginVertical: 4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
    alignSelf: 'flex-start',
    letterSpacing: 0.2,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    width: '100%',
    marginBottom: 14,
    paddingRight: 8,
  },
  modalInputField: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 4,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  modalEyeButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
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
  modalConfirmText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});