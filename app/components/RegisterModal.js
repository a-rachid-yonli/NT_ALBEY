import React, { useState } from 'react';
import {
  StyleSheet,
  Modal,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';

import { API } from '../services/api';
import { useTranslation, TranslatedText as Text, TranslatedTextInput as TextInput, TranslatedAlert as Alert, ThemedView as View, ThemedTouchableOpacity as TouchableOpacity, ThemedScrollView as ScrollView } from '../context/LanguageContext';
import { COUNTRIES, getFlagEmoji } from '../utils/countries';
import { COLORS } from '../constants/colors';
import { LOREM_IPSUM, getTermsDocument } from '../constants/terms';
import {
  cleanPhone as cleanPhoneUtil,
  isValidNigerPhone,
  isValidName,
  isValidEmail,
  isValidPin,
  isValidDate,
  PIN_HELPER_TEXT,
} from '../utils/validators';

const RegisterModal = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const { width = 400, height = 800 } = useWindowDimensions();
  const { t, language } = useTranslation();

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

    // ✅ v13 : message uniformisé via PIN_HELPER_TEXT
    if (!isValidPin(pin)) {
      Alert.alert(t('common.error'), PIN_HELPER_TEXT);
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

            <Text style={registerStyles.inputHelper}>
              {PIN_HELPER_TEXT}
            </Text>

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
              <View style={[registerStyles.countryModalContent, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
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
                  <Text style={registerStyles.termsModalBody}>{getTermsDocument(termsModalTitle, language)}</Text>
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

export default RegisterModal;
