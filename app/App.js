// App.js - Version Premium HARMONISÉE + Label "Mot de passe" + Bouton sans flèche
// ✅ Design homogène avec les autres écrans (palette, radius, ombres, badges)
// ✅ MULTILINGUE + APP LOCK + SÉCURITÉ BIOMÉTRIE
// ✅ Plus d'auto-login au démarrage → mémorisation du numéro uniquement
// ✅ DateTimePicker : API classique (onChange) UNIQUEMENT + applyDate défensif
// 🔐 SÉCURITÉ RENFORCÉE :
//    - Rate limiting login + forgot password
//    - Validation stricte inscription
//    - Neutralisation du code reset hardcodé
//    - ❌ SUPPRESSION de LogBox.ignoreAllLogs(true) → voir les erreurs en dev
// ✅ v2 : le champ Email est OPTIONNEL à l'inscription
// ✅ v3 : Détection Root/Jailbreak désactivée (plus d'alerte au démarrage)
// ✨ v4 : ÉCRAN DE CONNEXION ADAPTATIF
//    - Si un compte est mémorisé → carte "Bon retour" + mot de passe seul
//    - Lien "Pas vous ? Changer de compte →" pour saisir un nouveau numéro
//    - Lien "← Revenir au compte ..." pour revenir au compte sauvegardé
// ✨ v5 : CGU / POLITIQUE DE CONFIDENTIALITÉ cliquables
//    - Liens dans le label du checkbox inscription
//    - Modal dédié avec texte Lorem ipsum (placeholder à remplacer)
//    - Bouton "J'ai lu et j'accepte" qui coche automatiquement
// ✨ v6 : TOAST PREMIUM auto-dismiss après connexion réussie
//    - Slide depuis la droite, gradient vert
//    - Disparaît tout seul après 3 secondes (AUCUN clic requis)
//    - pointerEvents="none" → ne bloque aucun toucher
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';

import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as LocalAuthentication from 'expo-local-authentication';

import { API } from './services/api';
import { TransactionProvider } from './context/TransactionContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useTranslation } from './context/LanguageContext';
import { AVAILABLE_LANGUAGES } from './translations';
import { COUNTRIES, getFlagEmoji } from './utils/countries';
import { AppLockProvider } from './context/AppLockContext';
import AppLockOverlay from './components/AppLockOverlay';

// ✨ NOUVEAU : Toast premium auto-dismiss
import { ToastProvider, useToast } from './context/ToastContext';
import ToastOverlay from './components/ToastOverlay';

// ✅ Utils de sécurité (warnIfCompromised retiré)
import {
  checkRateLimit,
  resetRateLimit,
  formatRetryAfter,
} from './utils/rateLimiter';
import {
  cleanPhone as cleanPhoneUtil,
  isValidNigerPhone,
  isValidName,
  isValidEmail,
  isValidPin,
  isValidDate,
} from './utils/validators';

import HomeScreen from './screens/HomeScreen';
import SendMoneyScreen from './screens/SendMoneyScreen';
import WithdrawScreen from './screens/WithdrawScreen';
import PaymentScreen from './screens/PaymentScreen';
import BillsScreen from './screens/BillsScreen';
import ShopScreen from './screens/ShopScreen';
import GouvPayScreen from './screens/GouvPayScreen';
import HistoryScreen from './screens/HistoryScreen';
import TransferScreen from './screens/TransferScreen';
import ExpensesScreen from './screens/ExpensesScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ProfileScreen from './screens/ProfileScreen';
import QRScreen from './screens/QRScreen';
import VisaScreen from './screens/VisaScreen';
import TransferToAgencyScreen from './screens/TransferToAgencyScreen';
import ChatbotScreen from './screens/ChatbotScreen';
import FAQScreen from './screens/FAQScreen';
import SavingsScreen from './screens/SavingsScreen';
import CashInScreen from './screens/CashInScreen';

const Stack = createStackNavigator();

// ═══════════════════════════════════════════════════════════════════════
// 🎨 PALETTE CENTRALISÉE (identique à tous les écrans)
// ═══════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════
// 📄 PLACEHOLDER — Texte des CGU / Politique de confidentialité
// ⚠️ TODO : remplacer par le vrai contenu juridique avant production
// ═══════════════════════════════════════════════════════════════════════
const LOREM_IPSUM = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean eget bibendum mi. Suspendisse consequat dictum massa et convallis. Etiam in ligula dictum, commodo mi non, interdum lacus. Sed at posuere risus. Donec vel risus a ante rhoncus molestie sit amet vel neque. Cras nec ullamcorper erat. Morbi ornare nisl ac blandit ultricies. Duis sed ligula sapien. Nulla tellus massa, varius non velit vitae, sollicitudin elementum nibh. Nulla mollis ultricies velit sed rhoncus. Aliquam erat volutpat. Praesent blandit facilisis tempor. Mauris luctus porttitor justo, vitae suscipit dui bibendum nec. Aenean quis ipsum iaculis, egestas mauris at, vulputate tellus.

Vivamus nisl turpis, lacinia vitae iaculis non, pellentesque id libero. In in cursus sapien, sit amet auctor purus. Aliquam venenatis arcu a lacus faucibus, ut interdum nisi pretium. Duis et nisl euismod, sollicitudin nisi at, viverra ligula. Nulla et ligula nisl. Integer ornare pharetra tellus, vitae dictum dui ornare nec. Fusce et commodo erat, a dictum elit. Phasellus cursus arcu enim, nec rutrum lacus molestie quis.

Proin blandit sem nisl, tristique varius risus faucibus ac. Nulla venenatis, augue ut lobortis tristique, ex mi pulvinar libero, sed convallis sem tellus vitae ligula. Suspendisse a risus feugiat, pulvinar dolor vel, porta ante. Phasellus nisl magna, fringilla eu fermentum id, dapibus efficitur velit. Etiam vitae ligula sit amet lectus hendrerit euismod. Donec mollis lectus ac sagittis venenatis. Sed eleifend porttitor urna in malesuada.

Pellentesque eget molestie metus, ac pharetra est. Mauris vestibulum rutrum sem sit amet vehicula. Aenean quis enim odio. In at mollis massa. Aenean ut ultrices ante, viverra suscipit augue. Proin eget dui eleifend, dictum velit et, cursus est. Integer lobortis ultrices nisi, eu ornare libero mollis a.

Vestibulum egestas sem et risus commodo vestibulum. Cras viverra, tellus vel placerat vulputate, ligula orci eleifend dui, vel faucibus felis magna a massa. Ut scelerisque velit at tristique pharetra. Phasellus luctus leo vitae feugiat pulvinar. Integer dapibus nunc sodales sapien pulvinar, vel egestas sem iaculis. Vivamus volutpat, sapien eu consectetur iaculis, diam velit placerat turpis, in ultrices leo nibh non mauris. Donec congue neque sit amet efficitur bibendum. Phasellus ultricies felis dictum risus aliquam elementum. Morbi nulla risus, placerat pharetra ipsum a, venenatis efficitur ante. Nunc sagittis elementum eros, at ullamcorper sem auctor id. Proin vulputate risus non dui lacinia tempor.

Donec nec posuere elit. Etiam at semper velit, eu accumsan sem. Aenean lacinia massa euismod velit interdum, et volutpat nisi finibus. Maecenas eget urna id lectus tincidunt iaculis. Sed a nisi varius, pretium nulla sed, posuere lacus. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. In sollicitudin dapibus porttitor. In hac habitasse platea dictumst. Pellentesque lectus arcu, sollicitudin at mi sed, auctor blandit neque. Aenean mauris nunc, dignissim non nisl quis, tempus lacinia urna.`;

// ═══════════════════════════════════════════════════════════════════════
// 🌍 MODAL DE SÉLECTION DE LANGUE
// ═══════════════════════════════════════════════════════════════════════
const LanguagePickerModal = ({ visible, onClose }) => {
  const { t, language, setLanguage } = useTranslation();

  const handleSelect = async (code) => {
    await setLanguage(code);
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={langStyles.overlay}>
        <View style={langStyles.content}>
          <View style={langStyles.dragHandle} />

          <View style={langStyles.header}>
            <View style={{ flex: 1 }}>
              <Text style={langStyles.title}>{t('language.selectLanguage')}</Text>
              <Text style={langStyles.subtitle}>Choisissez votre langue préférée</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={langStyles.closeBtn} activeOpacity={0.7}>
              <Text style={langStyles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {AVAILABLE_LANGUAGES.map((lang) => {
            const isActive = language === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[langStyles.item, isActive && langStyles.itemActive]}
                onPress={() => handleSelect(lang.code)}
                activeOpacity={0.75}
              >
                <View style={[langStyles.abbr, isActive && langStyles.abbrActive]}>
                  <Text style={[langStyles.abbrText, isActive && langStyles.abbrTextActive]}>
                    {lang.code.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={langStyles.native}>{lang.nativeLabel}</Text>
                  <Text style={langStyles.label}>{lang.label}</Text>
                </View>
                {isActive && (
                  <View style={langStyles.check}>
                    <Text style={langStyles.checkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// 📝 MODAL INSCRIPTION
// ═══════════════════════════════════════════════════════════════════════
const RegisterModal = ({ visible, onClose }) => {
  const { width = 400, height = 800 } = useWindowDimensions();
  const { t } = useTranslation();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('NE');
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // ✨ Contrôle du modal CGU / Politique
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [termsModalTitle, setTermsModalTitle] = useState('');

  const resetForm = () => {
    setFullName('');
    setPhoneNumber('');
    setEmail('');
    setDateOfBirth('');
    setSelectedDate(new Date(2000, 0, 1));
    setShowDatePicker(false);
    setGender('');
    setNationality('NE');
    setCountryModalVisible(false);
    setCountrySearch('');
    setCity('');
    setAddress('');
    setPin('');
    setConfirmPin('');
    setPinVisible(false);
    setAgreeTerms(false);
    setTermsModalVisible(false);
    setTermsModalTitle('');
  };

  const formatDateForDisplay = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // ✅ Convertit N'IMPORTE QUEL format en Date valide
  const applyDate = (rawDate) => {
    if (!rawDate) {
      if (__DEV__) console.log('📅 [DatePicker] applyDate: aucune date reçue');
      return;
    }

    let dateObj = rawDate;

    if (!(rawDate instanceof Date)) {
      try {
        dateObj = new Date(rawDate);
      } catch (e) {
        if (__DEV__) console.log('❌ [DatePicker] Conversion impossible :', rawDate);
        return;
      }
    }

    if (!dateObj || isNaN(dateObj.getTime())) {
      if (__DEV__) console.log('❌ [DatePicker] Date invalide :', dateObj);
      return;
    }

    if (__DEV__) console.log('✅ [DatePicker] Date appliquée :', dateObj.toISOString());

    setSelectedDate(dateObj);
    setDateOfBirth(formatDateForDisplay(dateObj));
  };

  const onDateChange = (event, date) => {
    if (__DEV__) {
      console.log('📅 [DatePicker] onChange →', {
        type: event?.type,
        date,
        isDate: date instanceof Date,
      });
    }

    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event?.type === 'dismissed') {
      if (__DEV__) console.log('📅 [DatePicker] Annulé par l\'utilisateur');
      return;
    }

    applyDate(date);
  };

  const openDatePicker = () => {
    if (__DEV__) console.log('📅 [DatePicker] Ouverture du picker');
    setShowDatePicker(true);
  };

  const closeDatePickerIOS = () => {
    setShowDatePicker(false);
  };

  const isFormReady = agreeTerms && !isSubmitting;

  const filteredCountries = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const selectedCountry = COUNTRIES.find((c) => c.code === nationality);

  const handleSelectCountry = (code) => {
    setNationality(code);
    setCountryModalVisible(false);
    setCountrySearch('');
  };

  // ✨ Ouvre le modal CGU / Politique avec le bon titre
  const openTerms = (title) => {
    setTermsModalTitle(title);
    setTermsModalVisible(true);
  };

  const handleRegister = async () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('📝 [INSCRIPTION] Début de la création de compte');
    console.log('═══════════════════════════════════════════════════');

    if (!isValidName(fullName)) {
      Alert.alert(
        t('common.error'),
        'Nom invalide. Utilisez 2 à 80 caractères alphabétiques (lettres, espaces, apostrophes, tirets).'
      );
      return;
    }

    const cleanPhone = cleanPhoneUtil(phoneNumber);
    if (!isValidNigerPhone(cleanPhone)) {
      Alert.alert(
        t('common.error'),
        'Numéro invalide. Seuls les numéros Niger Telecom (commençant par 83 ou 93, suivi de 6 chiffres) sont autorisés.'
      );
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      Alert.alert(t('common.error'), t('register.errEmail'));
      return;
    }

    if (!isValidDate(dateOfBirth)) {
      Alert.alert(
        t('common.error'),
        'Date de naissance invalide. Format attendu : AAAA-MM-JJ.'
      );
      return;
    }

    if (gender !== 'M' && gender !== 'F') {
      Alert.alert(t('common.error'), t('register.errGender'));
      return;
    }

    if (!nationality.trim() || nationality.trim().length !== 2) {
      Alert.alert(t('common.error'), t('register.errNationality'));
      return;
    }

    if (!city.trim()) {
      Alert.alert(t('common.error'), t('register.errCity'));
      return;
    }

    if (!address.trim()) {
      Alert.alert(t('common.error'), t('register.errAddress'));
      return;
    }

    if (!isValidPin(pin)) {
      Alert.alert(
        t('common.error'),
        'Le mot de passe doit contenir entre 8 et 20 caractères.'
      );
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert(t('common.error'), 'Les mots de passe ne correspondent pas.');
      return;
    }

    if (!agreeTerms) {
      Alert.alert(t('common.error'), t('register.errTerms'));
      return;
    }

    console.log('✅ [INSCRIPTION] Toutes les validations passées');
    console.log('');

    setIsSubmitting(true);
    try {
      const payload = {
        phone_number: cleanPhone,
        full_name: fullName.trim(),
        date_of_birth: dateOfBirth.trim(),
        gender: gender,
        nationality: nationality.trim().toUpperCase(),
        city: city.trim(),
        address: address.trim(),
        pin: pin,
      };

      if (trimmedEmail) {
        payload.email = trimmedEmail;
      }

      console.log('📦 [INSCRIPTION] Payload envoyé à l\'API :');
      console.log(JSON.stringify({ ...payload, pin: '********' }, null, 2));
      console.log('');
      console.log('⏳ [INSCRIPTION] Appel de API.registerCustomer()...');

      const startTime = Date.now();
      const newUser = await API.registerCustomer(payload);
      const elapsed = Date.now() - startTime;

      console.log('');
      console.log('🎉 [INSCRIPTION] COMPTE CRÉÉ AVEC SUCCÈS en', elapsed, 'ms');
      console.log('📥 [INSCRIPTION] Réponse du serveur :');
      console.log(JSON.stringify(newUser, null, 2));
      console.log('═══════════════════════════════════════════════════');
      console.log('');

      Alert.alert(
        t('register.successTitle'),
        `${t('register.welcome')} ${newUser.name || newUser.full_name} !\n\n${t('register.canLogin')}`,
        [
          {
            text: t('common.ok'),
            onPress: () => {
              onClose();
              resetForm();
            },
          },
        ]
      );
    } catch (error) {
      console.log('');
      console.log('❌ [INSCRIPTION] ÉCHEC de la création du compte');
      console.log('   Message :', error?.message);
      console.log('═══════════════════════════════════════════════════');
      console.log('');

      Alert.alert(
        t('common.error'),
        error.message || t('register.errGeneric')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalWidth = width ? width - 40 : 320;
  const modalMaxHeight = (height || 800) * 0.85;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => { onClose(); resetForm(); }}
    >
      <View style={registerStyles.modalOverlay}>
        <View style={[registerStyles.modalContent, { width: modalWidth, maxHeight: modalMaxHeight }]}>
          <View style={registerStyles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={registerStyles.modalTitle}>{t('register.title')}</Text>
              <Text style={registerStyles.modalTitleSub}>Créez votre compte NT Albey</Text>
            </View>
            <TouchableOpacity
              onPress={() => { onClose(); resetForm(); }}
              style={registerStyles.modalCloseButton}
              activeOpacity={0.7}
            >
              <Text style={registerStyles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={registerStyles.modalSubtitle}>
              {t('register.subtitle')}
            </Text>

            <Text style={registerStyles.modalLabel}>{t('register.fullName')}</Text>
            <TextInput
              style={registerStyles.modalInput}
              placeholder={t('register.fullNamePlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />

            <Text style={registerStyles.modalLabel}>{t('register.phoneLabel')}</Text>
            <TextInput
              style={registerStyles.modalInput}
              placeholder="Ex : 93000000 ou 83000000"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
            <Text style={registerStyles.inputHelper}>
              📞 Numéro Niger Telecom uniquement (commence par 83 ou 93)
            </Text>

            <Text style={registerStyles.modalLabel}>
              {String(t('register.emailLabel')).replace(/\s*\*$/, '')}
              <Text style={registerStyles.optionalHint}> (optionnel)</Text>
            </Text>
            <TextInput
              style={registerStyles.modalInput}
              placeholder={t('register.emailPlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />

            <Text style={registerStyles.modalLabel}>{t('register.birthDateLabel')}</Text>
            <TouchableOpacity
              style={registerStyles.datePickerButton}
              onPress={openDatePicker}
              activeOpacity={0.75}
            >
              <Text style={[
                registerStyles.datePickerText,
                !dateOfBirth && registerStyles.datePickerPlaceholder
              ]}>
                {dateOfBirth || 'Sélectionner une date (AAAA-MM-JJ)'}
              </Text>
              <Text style={registerStyles.datePickerIcon}>📅</Text>
            </TouchableOpacity>
            <Text style={registerStyles.inputHelper}>
              {t('register.birthDateHelper')}
            </Text>

            {showDatePicker && (
              <View style={registerStyles.datePickerContainer}>
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
                    style={registerStyles.datePickerDoneButton}
                    onPress={closeDatePickerIOS}
                    activeOpacity={0.85}
                  >
                    <Text style={registerStyles.datePickerDoneText}>Valider la date</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <Text style={registerStyles.modalLabel}>{t('register.genderLabel')}</Text>
            <View style={registerStyles.genderRow}>
              <TouchableOpacity
                style={[registerStyles.genderButton, gender === 'M' && registerStyles.genderButtonActive]}
                onPress={() => setGender('M')}
                activeOpacity={0.75}
              >
                <Text style={[registerStyles.genderButtonText, gender === 'M' && registerStyles.genderButtonTextActive]}>
                  {t('register.male')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[registerStyles.genderButton, gender === 'F' && registerStyles.genderButtonActive]}
                onPress={() => setGender('F')}
                activeOpacity={0.75}
              >
                <Text style={[registerStyles.genderButtonText, gender === 'F' && registerStyles.genderButtonTextActive]}>
                  {t('register.female')}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={registerStyles.modalLabel}>{t('register.nationalityLabel')}</Text>
            <TouchableOpacity
              style={registerStyles.countryPickerButton}
              onPress={() => setCountryModalVisible(true)}
              activeOpacity={0.75}
            >
              <View style={registerStyles.countryPickerContent}>
                <Text style={registerStyles.countryPickerFlag}>
                  {getFlagEmoji(nationality)}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={registerStyles.countryPickerName}>
                    {selectedCountry ? selectedCountry.name : 'Sélectionner un pays'}
                  </Text>
                  <Text style={registerStyles.countryPickerCode}>
                    {nationality} • Appuyez pour changer
                  </Text>
                </View>
                <Text style={registerStyles.countryPickerChevron}>▾</Text>
              </View>
            </TouchableOpacity>
            <Text style={registerStyles.inputHelper}>
              {t('register.nationalityHelper')}
            </Text>

            <Text style={registerStyles.modalLabel}>{t('register.cityLabel')}</Text>
            <TextInput
              style={registerStyles.modalInput}
              placeholder={t('register.cityPlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="words"
              value={city}
              onChangeText={setCity}
            />

            <Text style={registerStyles.modalLabel}>{t('register.addressLabel')}</Text>
            <TextInput
              style={registerStyles.modalInput}
              placeholder={t('register.addressPlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              value={address}
              onChangeText={setAddress}
              multiline
            />

            <Text style={registerStyles.modalLabel}>Mot de passe</Text>
            <TextInput
              style={registerStyles.modalInput}
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
            />

            <Text style={registerStyles.modalLabel}>Confirmer le mot de passe</Text>
            <TextInput
              style={registerStyles.modalInput}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!pinVisible}
              maxLength={20}
              value={confirmPin}
              onChangeText={setConfirmPin}
              textAlign="center"
            />

            <TouchableOpacity
              style={registerStyles.modalEyeButton}
              onPress={() => setPinVisible(!pinVisible)}
              activeOpacity={0.75}
            >
              <Text style={registerStyles.modalEyeText}>
                {pinVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              </Text>
            </TouchableOpacity>

            {/* ✨ CGU / Politique — checkbox cliquable + liens cliquables */}
            <View style={registerStyles.modalCheckbox}>
              <TouchableOpacity
                onPress={() => setAgreeTerms(!agreeTerms)}
                activeOpacity={0.75}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View style={[registerStyles.checkbox, agreeTerms && registerStyles.checkboxChecked]}>
                  {agreeTerms && <Text style={registerStyles.checkboxCheck}>✓</Text>}
                </View>
              </TouchableOpacity>

              <Text style={registerStyles.modalCheckboxText}>
                J'accepte les{' '}
                <Text
                  style={registerStyles.linkText}
                  onPress={() => openTerms("Conditions d'utilisation")}
                >
                  conditions d'utilisation
                </Text>
                {' '}et la{' '}
                <Text
                  style={registerStyles.linkText}
                  onPress={() => openTerms('Politique de confidentialité')}
                >
                  politique de confidentialité
                </Text>
              </Text>
            </View>

            <View style={registerStyles.infoBanner}>
              <Text style={registerStyles.infoBannerText}>
                ℹ️ Tous les champs marqués d'un * sont obligatoires.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                registerStyles.modalConfirmButton,
                !isFormReady && registerStyles.modalConfirmButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={!isFormReady}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[
                  registerStyles.modalConfirmText,
                  !isFormReady && registerStyles.modalConfirmTextDisabled,
                ]}>
                  {t('login.signUp')}
                </Text>
              )}
            </TouchableOpacity>

            {!agreeTerms && (
              <Text style={registerStyles.termsHint}>
                ⚠️ Veuillez accepter les conditions d'utilisation pour continuer
              </Text>
            )}
          </ScrollView>

          {/* ═══════════ MODAL SÉLECTION PAYS ═══════════ */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={countryModalVisible}
            onRequestClose={() => {
              setCountryModalVisible(false);
              setCountrySearch('');
            }}
          >
            <View style={registerStyles.countryModalOverlay}>
              <View style={registerStyles.countryModalContent}>
                <View style={registerStyles.dragHandle} />

                <View style={registerStyles.countryModalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={registerStyles.countryModalTitle}>Sélectionner un pays</Text>
                    <Text style={registerStyles.countryModalSubtitle}>
                      {filteredCountries.length} pays disponible{filteredCountries.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setCountryModalVisible(false);
                      setCountrySearch('');
                    }}
                    style={registerStyles.countryModalCloseBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={registerStyles.countryModalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={registerStyles.countrySearchWrapper}>
                  <Text style={registerStyles.countrySearchIcon}>🔍</Text>
                  <TextInput
                    style={registerStyles.countrySearchInput}
                    placeholder="Rechercher un pays..."
                    placeholderTextColor={COLORS.textMuted}
                    value={countrySearch}
                    onChangeText={setCountrySearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {countrySearch !== '' && (
                    <TouchableOpacity onPress={() => setCountrySearch('')} activeOpacity={0.7}>
                      <Text style={registerStyles.countrySearchClear}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView
                  style={registerStyles.countryList}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {filteredCountries.length === 0 ? (
                    <Text style={registerStyles.countryEmptyText}>
                      Aucun pays trouvé
                    </Text>
                  ) : (
                    filteredCountries.map((country) => {
                      const isSelected = country.code === nationality;
                      return (
                        <TouchableOpacity
                          key={country.code}
                          style={[
                            registerStyles.countryItem,
                            isSelected && registerStyles.countryItemSelected,
                          ]}
                          onPress={() => handleSelectCountry(country.code)}
                          activeOpacity={0.75}
                        >
                          <Text style={registerStyles.countryItemFlag}>
                            {getFlagEmoji(country.code)}
                          </Text>
                          <Text
                            style={[
                              registerStyles.countryItemName,
                              isSelected && registerStyles.countryItemNameSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {country.name}
                          </Text>
                          <Text style={registerStyles.countryItemCode}>
                            {country.code}
                          </Text>
                          {isSelected && (
                            <Text style={registerStyles.countryItemCheck}>✓</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                  <View style={{ height: 20 }} />
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* ✨ MODAL CGU / POLITIQUE — placeholder Lorem ipsum */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={termsModalVisible}
            onRequestClose={() => setTermsModalVisible(false)}
          >
            <View style={registerStyles.termsModalOverlay}>
              <View style={registerStyles.termsModalContent}>
                <View style={registerStyles.termsModalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={registerStyles.termsModalTitle}>{termsModalTitle}</Text>
                    <Text style={registerStyles.termsModalSubtitle}>
                      NT Albey • Version 1.0
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setTermsModalVisible(false)}
                    style={registerStyles.termsModalCloseBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={registerStyles.termsModalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={registerStyles.termsModalScroll}
                  showsVerticalScrollIndicator={true}
                >
                  <Text style={registerStyles.termsModalBody}>{LOREM_IPSUM}</Text>
                  <View style={{ height: 20 }} />
                </ScrollView>

                <TouchableOpacity
                  style={registerStyles.termsModalAcceptBtn}
                  onPress={() => {
                    setAgreeTerms(true);
                    setTermsModalVisible(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={registerStyles.termsModalAcceptText}>
                    ✓ J'ai lu et j'accepte
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// 🔐 MODAL MOT DE PASSE OUBLIÉ
// ═══════════════════════════════════════════════════════════════════════
const ForgotPasswordModal = ({ visible, onClose }) => {
  const { width = 400, height = 800 } = useWindowDimensions();
  const { t } = useTranslation();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);

  const handleSendCode = () => {
    const cleanPhone = cleanPhoneUtil(phoneNumber);

    if (!isValidNigerPhone(cleanPhone)) {
      Alert.alert(t('common.error'), t('forgot.errPhone'));
      return;
    }

    const limit = checkRateLimit(`forgot:${cleanPhone}`, 3, 10 * 60 * 1000);
    if (!limit.allowed) {
      Alert.alert(
        'Trop de tentatives',
        `Réessayez dans ${formatRetryAfter(limit.retryAfterMs)}.`
      );
      return;
    }

    Alert.alert(
      'Bientôt disponible',
      'La réinitialisation par SMS sera disponible prochainement. ' +
      'En attendant, contactez le support au 555.'
    );
    return;
  };

  const handleVerifyCode = () => {
    Alert.alert(
      'Bientôt disponible',
      'La vérification de code sera bientôt disponible.'
    );
    return;
  };

  const handleResetPin = () => {
    if (!isValidPin(newPin)) {
      Alert.alert(
        t('common.error'),
        'Le mot de passe doit contenir entre 8 et 20 caractères.'
      );
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert(t('common.error'), 'Les mots de passe ne correspondent pas.');
      return;
    }

    Alert.alert(
      'Bientôt disponible',
      'La réinitialisation sera bientôt disponible.'
    );
    return;
  };

  const resetModal = () => {
    setStep(1);
    setPhoneNumber('');
    setCode('');
    setNewPin('');
    setConfirmPin('');
    setPinVisible(false);
    onClose();
  };

  const modalTitle = step === 1
    ? 'Mot de passe oublié'
    : step === 2
    ? 'Vérification'
    : 'Nouveau mot de passe';

  const modalWidth = width ? width - 40 : 320;
  const modalMaxHeight = (height || 800) * 0.8;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={resetModal}
    >
      <View style={forgotStyles.modalOverlay}>
        <View style={[forgotStyles.modalContent, { width: modalWidth, maxHeight: modalMaxHeight }]}>
          <View style={forgotStyles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={forgotStyles.modalTitle}>{modalTitle}</Text>
              <Text style={forgotStyles.modalTitleSub}>
                {step === 1 ? 'Réinitialisez votre mot de passe'
                  : step === 2 ? 'Vérification du code'
                  : 'Créez un nouveau mot de passe'}
              </Text>
            </View>
            <TouchableOpacity onPress={resetModal} style={forgotStyles.modalCloseButton} activeOpacity={0.7}>
              <Text style={forgotStyles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {step === 1 && (
              <>
                <Text style={forgotStyles.modalSubtitle}>
                  {t('forgot.subtitle')}
                </Text>
                <Text style={forgotStyles.modalLabel}>{t('common.phone')}</Text>
                <TextInput
                  style={forgotStyles.modalInput}
                  placeholder="Ex: 93 45 22 71"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />
                <TouchableOpacity style={forgotStyles.modalConfirmButton} onPress={handleSendCode} activeOpacity={0.85}>
                  <Text style={forgotStyles.modalConfirmText}>{t('forgot.sendCode')}</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 2 && (
              <>
                <Text style={forgotStyles.modalSubtitle}>
                  {`${t('forgot.verifySubtitle')} ${phoneNumber}.`}
                </Text>
                <Text style={forgotStyles.modalLabel}>{t('forgot.codeLabel')}</Text>
                <TextInput
                  style={forgotStyles.modalCodeInput}
                  placeholder={t('forgot.codePlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={code}
                  onChangeText={setCode}
                  textAlign="center"
                />
                <TouchableOpacity style={forgotStyles.modalConfirmButton} onPress={handleVerifyCode} activeOpacity={0.85}>
                  <Text style={forgotStyles.modalConfirmText}>{t('forgot.verify')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={forgotStyles.modalSecondaryButton} onPress={handleSendCode} activeOpacity={0.75}>
                  <Text style={forgotStyles.modalSecondaryText}>{t('forgot.resendCode')}</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 3 && (
              <>
                <Text style={forgotStyles.modalSubtitle}>
                  {t('forgot.newPinSubtitle')}
                </Text>

                <Text style={forgotStyles.modalLabel}>Nouveau mot de passe</Text>
                <TextInput
                  style={forgotStyles.modalInput}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="default"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!pinVisible}
                  maxLength={20}
                  value={newPin}
                  onChangeText={setNewPin}
                  textAlign="center"
                />

                <Text style={forgotStyles.modalLabel}>Confirmer le mot de passe</Text>
                <TextInput
                  style={forgotStyles.modalInput}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="default"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!pinVisible}
                  maxLength={20}
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  textAlign="center"
                />

                <TouchableOpacity
                  style={forgotStyles.modalEyeButton}
                  onPress={() => setPinVisible(!pinVisible)}
                  activeOpacity={0.75}
                >
                  <Text style={forgotStyles.modalEyeText}>
                    {pinVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={forgotStyles.modalConfirmButton} onPress={handleResetPin} activeOpacity={0.85}>
                  <Text style={forgotStyles.modalConfirmText}>{t('forgot.reset')}</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// 🔑 ÉCRAN DE CONNEXION — v6 avec toast premium auto-dismiss
// ═══════════════════════════════════════════════════════════════════════
function LoginScreen({ navigation }) {
  const { width = 400, height = 800 } = useWindowDimensions();
  const { login, loginWithBiometric, lastUserPhone } = useAuth();
  const { t, language } = useTranslation();

  // ✨ TOAST PREMIUM : auto-dismiss, aucun clic requis
  const { showToast } = useToast();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isPhoneEnrolled, setIsPhoneEnrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  // ✨ Bascule entre "compte mémorisé" et "nouveau compte"
  const [showFullForm, setShowFullForm] = useState(false);

  const currentLangData =
    AVAILABLE_LANGUAGES.find((l) => l.code === language) || AVAILABLE_LANGUAGES[0];

  const hasSavedAccount =
    !!lastUserPhone &&
    isValidNigerPhone(lastUserPhone) &&
    !showFullForm;

  const effectivePhone = hasSavedAccount ? lastUserPhone : phoneNumber;

  const maskPhone = (phone) => {
    const clean = String(phone || '').replace(/\s/g, '').replace(/^\+?227/, '');
    if (clean.length !== 8) return clean ? `+227 ${clean}` : '';
    return `+227 ${clean.slice(0, 2)} •• ••• ${clean.slice(-2)}`;
  };

  // ✅ Vérifie la disponibilité de la biométrie sur l'appareil
  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setIsBiometricAvailable(compatible && enrolled);
      } catch (error) {
        console.log('Erreur biométrie:', error);
        setIsBiometricAvailable(false);
      }
    };
    checkBiometrics();
  }, []);

  useEffect(() => {
    const checkEnrollment = async () => {
      const cleanPhone = String(effectivePhone || '').replace(/\s/g, '');
      if (!cleanPhone || cleanPhone.length < 8) {
        setIsPhoneEnrolled(false);
        return;
      }
      try {
        const enrolled = await API.isPhoneEnrolledForBiometric(cleanPhone);
        setIsPhoneEnrolled(enrolled);
      } catch {
        setIsPhoneEnrolled(false);
      }
    };
    checkEnrollment();
  }, [effectivePhone]);

  const handleChangeAccount = () => {
    setShowFullForm(true);
    setPhoneNumber('');
    setPin('');
  };

  const handleBackToSaved = () => {
    setShowFullForm(false);
    setPhoneNumber('');
    setPin('');
  };

  const handleLogin = async () => {
    const clean = cleanPhoneUtil(effectivePhone);

    if (!isValidNigerPhone(clean)) {
      Alert.alert(t('common.error'), t('register.errPhone'));
      return;
    }

    if (!isValidPin(pin)) {
      Alert.alert(
        t('common.error'),
        'Le mot de passe doit contenir entre 8 et 20 caractères.'
      );
      return;
    }

    const rateKey = `login:${clean}`;
    const limit = checkRateLimit(rateKey, 5, 5 * 60 * 1000);
    if (!limit.allowed) {
      Alert.alert(
        'Trop de tentatives',
        `Réessayez dans ${formatRetryAfter(limit.retryAfterMs)}.`
      );
      return;
    }

    setIsLoading(true);
    try {
      const userData = await login(clean, pin);
      resetRateLimit(rateKey);

      // ✨ TOAST PREMIUM auto-dismiss (aucun clic requis)
      const firstName = (userData.name || 'client').split(' ')[0];
      showToast({
        type: 'success',
        title: `Bienvenue, ${firstName} !`,
        duration: 3000,
      });
    } catch (error) {
      if (__DEV__) console.log('❌ [Login] Échec :', error?.message);
      Alert.alert(t('common.error'), error.message || t('common.incorrectPin'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFingerprintLogin = async () => {
    const cleanPhone = String(effectivePhone || '').replace(/\s/g, '');

    if (!cleanPhone || cleanPhone.length < 8) {
      Alert.alert(t('common.error'), t('login.phoneRequiredForBiometric'));
      return;
    }

    if (!isPhoneEnrolled) {
      Alert.alert(
        '🔒 Empreinte non configurée',
        `Le numéro "${effectivePhone}" n'est pas associé à une empreinte digitale sur cet appareil.\n\n` +
        `👉 Connectez-vous d'abord avec votre mot de passe, puis activez l'empreinte depuis votre Profil.`,
        [{ text: 'Compris' }]
      );
      return;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authentification par empreinte digitale',
        fallbackLabel: t('common.usePin'),
        disableDeviceFallback: false,
      });

      if (result.success) {
        try {
          const userData = await loginWithBiometric(cleanPhone);

          // ✨ TOAST PREMIUM auto-dismiss (aucun clic requis)
          const firstName = (userData.name || 'client').split(' ')[0];
          showToast({
            type: 'success',
            title: `Bienvenue, ${firstName} !`,
            duration: 3000,
          });
        } catch (error) {
          Alert.alert(
            t('common.error'),
            error.message || 'Aucun compte n\'est associé à ce numéro de téléphone.'
          );
        }
      } else {
        if (result.error !== 'user_cancel') {
          Alert.alert(t('common.error'), t('common.authFailed'));
        }
      }
    } catch (error) {
      console.log('Erreur authentification biométrique:', error);
      Alert.alert(t('common.error'), t('common.authProblem'));
    }
  };

  const topBgHeight = (height || 800) * 0.28;
  const bottomBgHeight = (height || 800) * 0.18;
  const logoSize = (width || 400) * 0.2;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={loginStyles.loginContainer}>
        {isLoading && (
          <View style={loginStyles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        )}

        <TouchableOpacity
          style={loginStyles.languageFloatingButton}
          onPress={() => setLanguageModalVisible(true)}
          activeOpacity={0.75}
        >
          <Text style={loginStyles.languageFloatingText}>
            {currentLangData.code.toUpperCase()}
          </Text>
        </TouchableOpacity>

        <View style={[loginStyles.topBackgroundContainer, { height: topBgHeight }]}>
          <Image
            source={require('./assets/images/top.png')}
            style={loginStyles.topBackgroundImage}
            resizeMode="cover"
          />
        </View>

        <View style={[loginStyles.bottomBackgroundContainer, { height: bottomBgHeight }]}>
          <Image
            source={require('./assets/images/bottom.png')}
            style={loginStyles.bottomBackgroundImage}
            resizeMode="cover"
          />
        </View>

        <View style={loginStyles.mainContent}>
          <View style={loginStyles.logoWrapper}>
            <Image
              source={require('./assets/images/logo.png')}
              style={[loginStyles.logoImage, { width: logoSize, height: logoSize, borderRadius: logoSize / 2 }]}
            />
            <Text style={loginStyles.appTagline}>{t('login.tagline')}</Text>
          </View>

          <View style={loginStyles.formCard}>
            {hasSavedAccount ? (
              <>
                <View style={loginStyles.savedAccountCard}>
                  <View style={loginStyles.savedAccountEmojiWrap}>
                    <Text style={loginStyles.savedAccountEmoji}>👋</Text>
                  </View>
                  <Text style={loginStyles.savedAccountGreeting}>
                    {t('login.welcome') || 'Bon retour !'}
                  </Text>
                  <Text style={loginStyles.savedAccountPhone}>
                    {maskPhone(lastUserPhone)}
                  </Text>

                  <TouchableOpacity
                    style={loginStyles.changeAccountLink}
                    onPress={handleChangeAccount}
                    activeOpacity={0.7}
                  >
                    <Text style={loginStyles.changeAccountLinkText}>
                      Pas vous ? Changer de compte →
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={loginStyles.inputContainer}>
                  <View style={loginStyles.iconContainer}>
                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <Rect x="5" y="11" width="14" height="10" rx="2" stroke={COLORS.primary} strokeWidth="1.8" />
                      <Path
                        d="M8 11V7a4 4 0 018 0v4"
                        stroke={COLORS.primary}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <Circle cx="12" cy="16" r="1.2" fill={COLORS.primary} />
                    </Svg>
                  </View>
                  <TextInput
                    style={loginStyles.inputWithIcon}
                    placeholder="Mot de passe"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="default"
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={!pinVisible}
                    maxLength={20}
                    value={pin}
                    onChangeText={setPin}
                    autoFocus
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity
                    style={loginStyles.trailingIconContainer}
                    onPress={() => setPinVisible(!pinVisible)}
                    activeOpacity={0.7}
                  >
                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                        stroke={COLORS.textMuted}
                        strokeWidth="1.8"
                      />
                      <Circle cx="12" cy="12" r="3" stroke={COLORS.textMuted} strokeWidth="1.8" />
                    </Svg>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={loginStyles.forgotPasswordContainer}
                  onPress={() => setForgotModalVisible(true)}
                  activeOpacity={0.75}
                >
                  <Text style={loginStyles.forgotPassword}>Mot de passe oublié ?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={loginStyles.loginButton}
                  onPress={handleLogin}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  <Text style={loginStyles.loginButtonText}>
                    {isLoading ? t('login.connecting') : t('login.connect')}
                  </Text>
                </TouchableOpacity>

                {isBiometricAvailable && isPhoneEnrolled && (
                  <>
                    <View style={loginStyles.separator}>
                      <View style={loginStyles.line} />
                      <Text style={loginStyles.orText}>{t('login.or')}</Text>
                      <View style={loginStyles.line} />
                    </View>

                    <TouchableOpacity
                      style={loginStyles.fingerprintButton}
                      onPress={handleFingerprintLogin}
                      activeOpacity={0.75}
                    >
                      <Image
                        source={require('./assets/images/print.png')}
                        style={loginStyles.fingerprintIcon}
                      />
                    </TouchableOpacity>

                    <Text style={loginStyles.fingerprintHint}>
                      🔒 Empreinte enregistrée pour ce numéro
                    </Text>
                  </>
                )}
              </>
            ) : (
              <>
                <Text style={loginStyles.title}>{t('login.welcome')}</Text>
                <Text style={loginStyles.subtitle}>{t('login.subtitle')}</Text>

                {lastUserPhone && isValidNigerPhone(lastUserPhone) && (
                  <TouchableOpacity
                    style={loginStyles.backToSavedButton}
                    onPress={handleBackToSaved}
                    activeOpacity={0.75}
                  >
                    <Text style={loginStyles.backToSavedText}>
                      ← Revenir au compte {maskPhone(lastUserPhone)}
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={loginStyles.inputContainer}>
                  <View style={loginStyles.iconContainer}>
                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.61 21 3 13.39 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z"
                        stroke={COLORS.primary}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </View>
                  <TextInput
                    style={loginStyles.inputWithIcon}
                    placeholder={t('login.phoneLabel')}
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    autoFocus
                  />
                  {phoneNumber.length >= 8 && (
                    <View style={loginStyles.trailingIconContainer}>
                      <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <Circle cx="12" cy="12" r="10" stroke={COLORS.primary} strokeWidth="1.8" />
                        <Path
                          d="M8 12.5l3 3 5-5"
                          stroke={COLORS.primary}
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    </View>
                  )}
                </View>

                <View style={loginStyles.inputContainer}>
                  <View style={loginStyles.iconContainer}>
                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <Rect x="5" y="11" width="14" height="10" rx="2" stroke={COLORS.primary} strokeWidth="1.8" />
                      <Path
                        d="M8 11V7a4 4 0 018 0v4"
                        stroke={COLORS.primary}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <Circle cx="12" cy="16" r="1.2" fill={COLORS.primary} />
                    </Svg>
                  </View>
                  <TextInput
                    style={loginStyles.inputWithIcon}
                    placeholder="Mot de passe"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="default"
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={!pinVisible}
                    maxLength={20}
                    value={pin}
                    onChangeText={setPin}
                  />
                  <TouchableOpacity
                    style={loginStyles.trailingIconContainer}
                    onPress={() => setPinVisible(!pinVisible)}
                    activeOpacity={0.7}
                  >
                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                        stroke={COLORS.textMuted}
                        strokeWidth="1.8"
                      />
                      <Circle cx="12" cy="12" r="3" stroke={COLORS.textMuted} strokeWidth="1.8" />
                    </Svg>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={loginStyles.forgotPasswordContainer}
                  onPress={() => setForgotModalVisible(true)}
                  activeOpacity={0.75}
                >
                  <Text style={loginStyles.forgotPassword}>Mot de passe oublié ?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={loginStyles.loginButton}
                  onPress={handleLogin}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  <Text style={loginStyles.loginButtonText}>
                    {isLoading ? t('login.connecting') : t('login.connect')}
                  </Text>
                </TouchableOpacity>

                {isBiometricAvailable && isPhoneEnrolled && (
                  <>
                    <View style={loginStyles.separator}>
                      <View style={loginStyles.line} />
                      <Text style={loginStyles.orText}>{t('login.or')}</Text>
                      <View style={loginStyles.line} />
                    </View>

                    <TouchableOpacity
                      style={loginStyles.fingerprintButton}
                      onPress={handleFingerprintLogin}
                      activeOpacity={0.75}
                    >
                      <Image
                        source={require('./assets/images/print.png')}
                        style={loginStyles.fingerprintIcon}
                      />
                    </TouchableOpacity>

                    <Text style={loginStyles.fingerprintHint}>
                      🔒 Empreinte enregistrée pour ce numéro
                    </Text>
                  </>
                )}
              </>
            )}
          </View>

          <View style={loginStyles.securityBanner}>
            <View style={loginStyles.shieldIconWrapper}>
              <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 2L4 5v6c0 5.25 3.5 9.74 8 11 4.5-1.26 8-5.75 8-11V5l-8-3z"
                  fill={COLORS.primary}
                />
                <Path
                  d="M8.5 12.5l2.5 2.5 4-4"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View style={loginStyles.securityTextWrapper}>
              <Text style={loginStyles.securityTop}>{t('login.securityTitle')}</Text>
              <Text style={loginStyles.securitySub}>{t('login.securitySub')}</Text>
            </View>
          </View>

          <View style={loginStyles.registerWrapperInline}>
            <Text style={loginStyles.registerTextInline}>{t('login.noAccount')} </Text>
            <TouchableOpacity onPress={() => setRegisterModalVisible(true)} activeOpacity={0.75}>
              <Text style={loginStyles.registerLinkInline}>{t('login.signUp')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <RegisterModal
          visible={registerModalVisible}
          onClose={() => setRegisterModalVisible(false)}
        />

        <ForgotPasswordModal
          visible={forgotModalVisible}
          onClose={() => setForgotModalVisible(false)}
        />

        <LanguagePickerModal
          visible={languageModalVisible}
          onClose={() => setLanguageModalVisible(false)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 🧭 ROOT NAVIGATOR
// ═══════════════════════════════════════════════════════════════════════
function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="SendMoney" component={SendMoneyScreen} />
            <Stack.Screen name="Withdraw" component={WithdrawScreen} />
            <Stack.Screen name="Payment" component={PaymentScreen} />
            <Stack.Screen name="Bills" component={BillsScreen} />
            <Stack.Screen name="Shop" component={ShopScreen} />
            <Stack.Screen name="GouvPay" component={GouvPayScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="Transfer" component={TransferScreen} />
            <Stack.Screen name="Expenses" component={ExpensesScreen} />
            <Stack.Screen name="Transactions" component={TransactionsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="QRPay" component={QRScreen} />
            <Stack.Screen name="Visa" component={VisaScreen} />
            <Stack.Screen name="TransferToAgency" component={TransferToAgencyScreen} />
            <Stack.Screen name="Chatbot" component={ChatbotScreen} />
            <Stack.Screen name="FAQ" component={FAQScreen} />
            <Stack.Screen name="Savings" component={SavingsScreen} />
            <Stack.Screen name="CashIn" component={CashInScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 🚀 APP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════
export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppLockProvider>
          <TransactionProvider>
            {/* ✨ TOAST PROVIDER : englobe tout pour permettre showToast() partout */}
            <ToastProvider>
              <RootNavigator />
              <AppLockOverlay />
              <ToastOverlay />
            </ToastProvider>
          </TransactionProvider>
        </AppLockProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 🎨 STYLES — LANGUAGE PICKER MODAL
// ═══════════════════════════════════════════════════════════════════════
const langStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
    fontWeight: '500',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  closeText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  itemActive: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  abbr: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  abbrActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  abbrText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },
  abbrTextActive: {
    color: '#FFFFFF',
  },
  native: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.1,
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
});

// ═══════════════════════════════════════════════════════════════════════
// 🎨 STYLES — REGISTER MODAL
// ═══════════════════════════════════════════════════════════════════════
const registerStyles = StyleSheet.create({
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  modalTitleSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
    fontWeight: '500',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  modalCloseText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 19,
    fontWeight: '500',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 12,
    letterSpacing: 0.2,
  },
  optionalHint: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  modalInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 4,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  inputHelper: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 4,
  },
  datePickerText: {
    fontSize: 15,
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    marginBottom: 12,
    overflow: 'hidden',
  },
  datePickerDoneButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  datePickerDoneText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderButtonActive: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  genderButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  genderButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  modalEyeButton: {
    alignSelf: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  modalEyeText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  modalCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  modalCheckboxText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
    fontWeight: '500',
    lineHeight: 19,
  },
  linkText: {
    color: COLORS.primary,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  modalConfirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
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
  modalConfirmButtonDisabled: {
    backgroundColor: COLORS.border,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  modalConfirmTextDisabled: {
    color: COLORS.textMuted,
  },
  termsHint: {
    fontSize: 11,
    color: COLORS.accent,
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  infoBanner: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: `${COLORS.primary}25`,
    marginBottom: 8,
  },
  infoBannerText: {
    fontSize: 11,
    color: COLORS.primary,
    lineHeight: 16,
    fontWeight: '600',
  },
  countryPickerButton: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 4,
  },
  countryPickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countryPickerFlag: {
    fontSize: 26,
  },
  countryPickerName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  countryPickerCode: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  countryPickerChevron: {
    fontSize: 18,
    color: COLORS.textMuted,
    fontWeight: '800',
  },
  countryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'flex-end',
  },
  countryModalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    minHeight: '60%',
    paddingTop: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  countryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  countryModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  countryModalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
    fontWeight: '500',
  },
  countryModalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  countryModalCloseText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  countrySearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  countrySearchIcon: {
    fontSize: 16,
  },
  countrySearchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingVertical: 0,
    fontWeight: '500',
  },
  countrySearchClear: {
    fontSize: 14,
    color: COLORS.textMuted,
    paddingHorizontal: 6,
    fontWeight: '700',
  },
  countryList: {
    paddingHorizontal: 12,
    flex: 1,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 12,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  countryItemSelected: {
    backgroundColor: COLORS.primarySoft,
    borderColor: `${COLORS.primary}40`,
  },
  countryItemFlag: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
  },
  countryItemName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  countryItemNameSelected: {
    fontWeight: '800',
    color: COLORS.primary,
  },
  countryItemCode: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
  },
  countryItemCheck: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '800',
    marginLeft: 4,
  },
  countryEmptyText: {
    textAlign: 'center',
    paddingVertical: 40,
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  termsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'flex-end',
  },
  termsModalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    minHeight: '55%',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  termsModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  termsModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  termsModalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 3,
    fontWeight: '500',
  },
  termsModalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  termsModalCloseText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  termsModalScroll: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  termsModalBody: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    fontWeight: '500',
    paddingBottom: 12,
  },
  termsModalAcceptBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
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
  termsModalAcceptText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

// ═══════════════════════════════════════════════════════════════════════
// 🎨 STYLES — FORGOT PASSWORD MODAL
// ═══════════════════════════════════════════════════════════════════════
const forgotStyles = StyleSheet.create({
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  modalTitleSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
    fontWeight: '500',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  modalCloseText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 12,
    letterSpacing: 0.2,
  },
  modalInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 16,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  modalCodeInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    padding: 14,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 16,
    color: COLORS.textPrimary,
  },
  modalEyeButton: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalEyeText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  modalConfirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  modalSecondaryButton: {
    backgroundColor: COLORS.surfaceAlt,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  modalSecondaryText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});

// ═══════════════════════════════════════════════════════════════════════
// 🎨 STYLES — LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════════════
const loginStyles = StyleSheet.create({
  loginContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  languageFloatingButton: {
    position: 'absolute',
    top: 52,
    right: 20,
    zIndex: 100,
    minWidth: 44,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  languageFloatingText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  topBackgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
    overflow: 'hidden',
  },
  topBackgroundImage: {
    width: '100%',
    height: '100%',
  },
  bottomBackgroundContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 0,
    overflow: 'hidden',
    borderWidth: 0,
    margin: 0,
    padding: 0,
  },
  bottomBackgroundImage: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '100%',
    borderWidth: 0,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    zIndex: 2,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    resizeMode: 'contain',
    backgroundColor: COLORS.surface,
  },
  appTagline: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: COLORS.surface,
    paddingVertical: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 5 },
    }),
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: COLORS.textPrimary,
    marginBottom: 6,
    paddingHorizontal: 24,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginBottom: 28,
    paddingHorizontal: 24,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  iconContainer: {
    paddingLeft: 14,
    paddingRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWithIcon: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  trailingIconContainer: {
    paddingRight: 14,
    paddingLeft: 8,
    justifyContent: 'center',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginHorizontal: 20,
    marginBottom: 20,
    marginTop: 2,
  },
  forgotPassword: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
    marginHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 5 },
    }),
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginHorizontal: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.borderSoft,
  },
  orText: {
    marginHorizontal: 12,
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  fingerprintButton: {
    backgroundColor: 'transparent',
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    width: 44,
    height: 44,
    alignSelf: 'center',
  },
  fingerprintIcon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
    tintColor: COLORS.primary,
  },
  fingerprintHint: {
    fontSize: 11,
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 20,
    fontWeight: '700',
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    gap: 12,
  },
  shieldIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  securityTextWrapper: {
    flex: 1,
  },
  securityTop: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  securitySub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  registerWrapperInline: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  registerTextInline: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  registerLinkInline: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  savedAccountCard: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: `${COLORS.primary}25`,
  },
  savedAccountEmojiWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  savedAccountEmoji: {
    fontSize: 26,
  },
  savedAccountGreeting: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  savedAccountPhone: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 12,
    fontVariant: ['tabular-nums'],
  },
  changeAccountLink: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  changeAccountLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textDecorationLine: 'underline',
    letterSpacing: 0.2,
  },
  backToSavedButton: {
    alignSelf: 'center',
    marginHorizontal: 20,
    marginBottom: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${COLORS.primary}25`,
  },
  backToSavedText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
});