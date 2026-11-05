import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Image,
  Modal,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTranslation, TranslatedText as Text, TranslatedTextInput as TextInput, TranslatedAlert as Alert, ThemedView as View, ThemedTouchableOpacity as TouchableOpacity, ThemedKeyboardAvoidingView as KeyboardAvoidingView, ThemedScrollView as ScrollView } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { AVAILABLE_LANGUAGES } from '../translations';
import { COLORS } from '../constants/colors';
import {
  checkRateLimit,
  resetRateLimit,
  formatRetryAfter,
} from '../utils/rateLimiter';
import {
  cleanPhone as cleanPhoneUtil,
  isValidNigerPhone,
  isValidPin,
  PIN_HELPER_TEXT,
} from '../utils/validators';

import LanguagePickerModal from '../components/LanguagePickerModal';
import RegisterModal from '../components/RegisterModal';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width = 400, height = 800 } = useWindowDimensions();
  const {
    login,
    loginWithBiometric,
    lastUserPhone,
    skipAutoBioOnce,
    consumeSkipAutoBio,
  } = useAuth();
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

  // ✨ v10/v11/v12 : Garde-fous pour l'auto-trigger biométrie
  const hasAutoTriggeredBio = useRef(false);
  const userHasInteracted = useRef(false);
  const autoBioTimerRef = useRef(null);
  const componentMountedRef = useRef(true);

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

  // ✅ v10 : cleanup UNIQUEMENT au démontage
  useEffect(() => {
    componentMountedRef.current = true;
    return () => {
      componentMountedRef.current = false;
      if (autoBioTimerRef.current) {
        clearTimeout(autoBioTimerRef.current);
        autoBioTimerRef.current = null;
      }
    };
  }, []);

  // ✨ Marque l'interaction utilisateur
  const markInteraction = () => {
    userHasInteracted.current = true;
  };

  const handleChangeAccount = () => {
    markInteraction();
    hasAutoTriggeredBio.current = false;
    setShowFullForm(true);
    setPhoneNumber('');
    setPin('');
  };

  const handleBackToSaved = () => {
    markInteraction();
    hasAutoTriggeredBio.current = false;
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

    // ✅ v13 : message uniformisé
    if (!isValidPin(pin)) {
      Alert.alert(t('common.error'), PIN_HELPER_TEXT);
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
      // 🔐 Zeroization : purge mémoire immédiate du PIN en RAM (OWASP MASVS / PCI-DSS)
      setPin('');
    }
  };

  // ✅ v9/v10 : accepte des paramètres pour contourner le stale closure
  const handleFingerprintLogin = async (params = {}) => {
    const phoneToUse = params.phone || effectivePhone;
    const enrolledToUse =
      params.enrolled !== undefined ? params.enrolled : isPhoneEnrolled;

    const cleanPhone = String(phoneToUse || '').replace(/\s/g, '');

    if (__DEV__) {
      console.log('🔐 [Login] handleFingerprintLogin →', {
        phoneToUse,
        cleanPhone,
        enrolledToUse,
        source: params.source || 'manual',
      });
    }

    if (!cleanPhone || cleanPhone.length < 8) {
      Alert.alert(t('common.error'), t('login.phoneRequiredForBiometric'));
      return;
    }

    if (!enrolledToUse) {
      Alert.alert(
        '🔒 Empreinte non configurée',
        `Le numéro "${phoneToUse}" n'est pas associé à une empreinte digitale sur cet appareil.\n\n` +
        `👉 Connectez-vous d'abord avec votre mot de passe, puis activez l'empreinte depuis votre Profil.`,
        [{ text: 'Compris' }]
      );
      return;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authentification par empreinte digitale',
        fallbackLabel: t('common.usePin'),
        disableDeviceFallback: true,
      });

      if (result.success) {
        try {
          const userData = await loginWithBiometric(cleanPhone);

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

  // ═══════════════════════════════════════════════════════════════════
  // ✨ AUTO-TRIGGER BIOMÉTRIE (v12)
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    // 🚫 SKIP si logout explicite récent
    if (skipAutoBioOnce) {
      if (__DEV__) {
        console.log('🚫 [Login] Auto-bio skippée (logout explicite récent)');
      }
      hasAutoTriggeredBio.current = true;
      return;
    }

    const conditionsMet =
      hasSavedAccount &&
      isBiometricAvailable &&
      isPhoneEnrolled &&
      !isLoading &&
      !registerModalVisible &&
      !forgotModalVisible &&
      !languageModalVisible &&
      !showFullForm &&
      !userHasInteracted.current &&
      !hasAutoTriggeredBio.current;

    if (__DEV__) {
      console.log('🔍 [Login] Auto-trigger conditions :', {
        hasSavedAccount,
        isBiometricAvailable,
        isPhoneEnrolled,
        isLoading,
        modalOpen: registerModalVisible || forgotModalVisible || languageModalVisible,
        showFullForm,
        userHasInteracted: userHasInteracted.current,
        hasAutoTriggered: hasAutoTriggeredBio.current,
        skipAutoBioOnce,
        conditionsMet,
      });
    }

    if (!conditionsMet) return;
    if (autoBioTimerRef.current) return;

    hasAutoTriggeredBio.current = true;

    if (__DEV__) {
      console.log('🔐 [Login] Auto-trigger biométrie programmé (600ms)');
    }

    autoBioTimerRef.current = setTimeout(() => {
      autoBioTimerRef.current = null;

      if (!componentMountedRef.current) {
        if (__DEV__) console.log('⚠️ [Login] Composant démonté → abort auto-bio');
        return;
      }

      if (__DEV__) console.log('🔐 [Login] Auto-trigger biométrie → exécution');

      handleFingerprintLogin({
        phone: lastUserPhone,
        enrolled: true,
        source: 'auto',
      });
    }, 600);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasSavedAccount,
    isBiometricAvailable,
    isPhoneEnrolled,
    isLoading,
    registerModalVisible,
    forgotModalVisible,
    languageModalVisible,
    showFullForm,
    skipAutoBioOnce,
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // ✨ v11/v12 : Consommation du flag skipAutoBioOnce
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (skipAutoBioOnce && !isLoading) {
      const timer = setTimeout(() => {
        if (__DEV__) console.log('♻️ [Login] Consommation flag skipAutoBioOnce');
        consumeSkipAutoBio();
      }, 300);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipAutoBioOnce, isLoading]);

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
          style={[loginStyles.languageFloatingButton, { top: Math.max(insets.top, 16) + 12 }]}
          onPress={() => {
            markInteraction();
            setLanguageModalVisible(true);
          }}
          activeOpacity={0.75}
        >
          <Text style={loginStyles.languageFloatingText}>
            {currentLangData.code.toUpperCase()}
          </Text>
        </TouchableOpacity>

        <View style={[loginStyles.topBackgroundContainer, { height: topBgHeight }]}>
          <Image
            source={require('../assets/images/top.png')}
            style={loginStyles.topBackgroundImage}
            resizeMode="cover"
          />
        </View>

        <View style={[loginStyles.bottomBackgroundContainer, { height: bottomBgHeight }]}>
          <Image
            source={require('../assets/images/bottom.png')}
            style={loginStyles.bottomBackgroundImage}
            resizeMode="cover"
          />
        </View>

        <ScrollView style={{ zIndex: 2 }} contentContainerStyle={[loginStyles.mainContent, { paddingBottom: Math.max(insets.bottom, 16) + 32 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={loginStyles.logoWrapper}>
            <Image
              source={require('../assets/images/logo.png')}
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
                      Pas vous ? Changer de compte
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
                    onChangeText={(v) => {
                      markInteraction();
                      setPin(v);
                    }}
                    autoFocus={!isPhoneEnrolled}
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
                  onPress={() => {
                    markInteraction();
                    setForgotModalVisible(true);
                  }}
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
                      onPress={() => handleFingerprintLogin({ source: 'manual' })}
                      activeOpacity={0.75}
                    >
                      <Image
                        source={require('../assets/images/print.png')}
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
                    onChangeText={(v) => {
                      markInteraction();
                      setPhoneNumber(v);
                    }}
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
                    onChangeText={(v) => {
                      markInteraction();
                      setPin(v);
                    }}
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
                  onPress={() => {
                    markInteraction();
                    setForgotModalVisible(true);
                  }}
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
                      onPress={() => handleFingerprintLogin({ source: 'manual' })}
                      activeOpacity={0.75}
                    >
                      <Image
                        source={require('../assets/images/print.png')}
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
            <TouchableOpacity
              onPress={() => {
                markInteraction();
                setRegisterModalVisible(true);
              }}
              activeOpacity={0.75}
            >
              <Text style={loginStyles.registerLinkInline}>{t('login.signUp')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

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

export default LoginScreen;
