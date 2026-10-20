// components/AppLockOverlay.js
// ✅ SÉCURITÉ RENFORCÉE :
//    - Biométrie proposée QUE si l'utilisateur l'a activée pour CE compte
//    - Biométrie re-vérifiée auprès du BACKEND après succès OS
//    - 🔐 NOUVEAU : biométrie désactivée si device rooté/jailbreaké
//    - Rate limiting côté client sur les tentatives PIN
//    - Validation stricte du PIN (8-20 caractères)
//    - verifyPin utilise /auth/verify-pin (pas de swap de session)
// ✅ v2 : toggle œil SVG propre (voir/cacher le mot de passe) + zone tactile large
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import * as LocalAuthentication from 'expo-local-authentication';

import { useAppLock } from '../context/AppLockContext';
import { useTranslation } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import {
  checkRateLimit,
  resetRateLimit,
  formatRetryAfter,
} from '../utils/rateLimiter';
import { isValidPin } from '../utils/validators';

// ═══════════════════════════════════════════════════════════
// 🎨 ICÔNES ŒIL (SVG)
// ═══════════════════════════════════════════════════════════
const IconEyeOpen = ({ color = '#008933' }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path
      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
      stroke={color}
      strokeWidth="1.9"
    />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.9" />
  </Svg>
);

const IconEyeClosed = ({ color = '#94A3B8' }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path
      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
      stroke={color}
      strokeWidth="1.9"
    />
    <Path
      d="M3 3l18 18"
      stroke={color}
      strokeWidth="1.9"
      strokeLinecap="round"
    />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.9" />
  </Svg>
);

export default function AppLockOverlay() {
  const {
    isLocked,
    unlock,
    registerFailedAttempt,
    remainingAttempts,
    deviceCompromised,
  } = useAppLock();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [pin, setPin] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [deviceHasBiometric, setDeviceHasBiometric] = useState(false);
  const [userHasEnrolledBiometric, setUserHasEnrolledBiometric] = useState(false);

  const autoTriggeredRef = useRef(false);
  const pinInputRef = useRef(null);

  const isBiometricAvailable =
    deviceHasBiometric && userHasEnrolledBiometric && !deviceCompromised;

  const isPinValid = isValidPin(pin);

  useEffect(() => {
    (async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setDeviceHasBiometric(compatible && enrolled);
      } catch {
        setDeviceHasBiometric(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!user?.phone) {
        setUserHasEnrolledBiometric(false);
        return;
      }
      try {
        const enrolled = await API.isPhoneEnrolledForBiometric(user.phone);
        if (__DEV__) console.log('🔐 [AppLock] Empreinte activée pour ce compte :', enrolled);
        setUserHasEnrolledBiometric(enrolled);
      } catch (e) {
        if (__DEV__) console.log('⚠️ [AppLock] Erreur vérif enrollment');
        setUserHasEnrolledBiometric(false);
      }
    })();
  }, [user?.phone, isLocked]);

  useEffect(() => {
    if (isLocked) {
      setPin('');
      setError('');
      setPinVisible(false);
      setIsVerifying(false);
      autoTriggeredRef.current = false;
    }
  }, [isLocked]);

  useEffect(() => {
    if (isLocked && isBiometricAvailable && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true;
      const timer = setTimeout(() => handleBiometric(), 350);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked, isBiometricAvailable]);

  const handleBiometric = async () => {
    if (!userHasEnrolledBiometric) {
      if (__DEV__) console.log('🚫 [AppLock] Refusé : empreinte non activée pour ce compte');
      return;
    }
    if (deviceCompromised) {
      setError('Biométrie désactivée : appareil compromis. Utilisez votre PIN.');
      return;
    }
    if (isAuthenticating) return;

    setIsAuthenticating(true);
    setError('');
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('appLock.biometricPrompt'),
        fallbackLabel: t('common.usePin'),
        disableDeviceFallback: false,
      });

      if (result.success) {
        try {
          await API.verifyBiometricForTransaction(user?.phone);
          resetRateLimit(`applock:${user?.phone || 'unknown'}`);
          unlock();
        } catch (backendErr) {
          if (__DEV__) console.log('⚠️ [AppLock] Vérif backend échouée');
          setError('Session biométrique invalide. Utilisez votre PIN.');
        }
      }
    } catch (e) {
      if (__DEV__) console.log('Erreur biométrie (AppLock)');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePinSubmit = async () => {
    if (!isPinValid) {
      setError('Le PIN doit contenir entre 8 et 20 caractères.');
      return;
    }
    if (isVerifying) return;

    const rateKey = `applock:${user?.phone || 'unknown'}`;
    const limit = checkRateLimit(rateKey, 5, 5 * 60 * 1000);

    if (!limit.allowed) {
      setError(
        `Trop de tentatives. Réessayez dans ${formatRetryAfter(limit.retryAfterMs)}.`
      );
      return;
    }

    setIsVerifying(true);
    setError('');
    try {
      await API.verifyPin(pin);
      resetRateLimit(rateKey);
      setPin('');
      setError('');
      unlock();
    } catch (e) {
      registerFailedAttempt();
      setPin('');

      const remaining = Math.max(0, limit.remaining - 1);
      if (remaining <= 0) {
        setError(t('appLock.tooManyAttempts'));
      } else {
        setError(
          `${t('common.incorrectPin')} • ${remaining} ${
            remaining > 1 ? t('appLock.attemptsLeft') : t('appLock.attemptLeft')
          }`
        );
      }
      setTimeout(() => pinInputRef.current?.focus(), 100);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Modal
      visible={isLocked}
      animationType="fade"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={() => {}}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.card}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>{t('appLock.title')}</Text>
          <Text style={styles.subtitle}>{t('appLock.subtitle')}</Text>

          {deviceCompromised && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>
                ⚠️ Appareil compromis — biométrie désactivée. Utilisez votre PIN.
              </Text>
            </View>
          )}

          {isBiometricAvailable && (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometric}
              disabled={isAuthenticating || isVerifying}
              activeOpacity={0.7}
            >
              {isAuthenticating ? (
                <ActivityIndicator size="small" color="#008933" />
              ) : (
                <Image
                  source={require('../assets/images/print.png')}
                  style={styles.biometricIcon}
                />
              )}
              <Text style={styles.biometricText}>
                {t('appLock.useBiometric')}
              </Text>
            </TouchableOpacity>
          )}

          {isBiometricAvailable && (
            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.orText}>{t('common.or')}</Text>
              <View style={styles.line} />
            </View>
          )}

          <Text style={styles.pinLabel}>
            Entrez votre code PIN (8 à 20 caractères)
          </Text>

          <View style={styles.pinContainer}>
            <TextInput
              ref={pinInputRef}
              style={styles.pinInput}
              placeholder="••••••••"
              placeholderTextColor="#CCC"
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!pinVisible}
              maxLength={20}
              value={pin}
              onChangeText={(v) => {
                setPin(v);
                if (error) setError('');
              }}
              editable={!isVerifying}
              textAlign="center"
            />
            <TouchableOpacity
              style={styles.pinEye}
              onPress={() => setPinVisible((v) => !v)}
              activeOpacity={0.7}
              disabled={isVerifying}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            >
              {pinVisible ? <IconEyeOpen /> : <IconEyeClosed />}
            </TouchableOpacity>
          </View>

          {/* Toggle texte cliquable (accessibilité + UX) */}
          <TouchableOpacity
            style={styles.toggleLabelWrapper}
            onPress={() => setPinVisible((v) => !v)}
            activeOpacity={0.7}
            disabled={isVerifying}
          >
            <Text style={styles.toggleLabelText}>
              {pinVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.charCounter}>{pin.length}/20</Text>

          {error !== '' && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[
              styles.unlockButton,
              (!isPinValid || isVerifying) && styles.unlockButtonDisabled,
            ]}
            onPress={handlePinSubmit}
            disabled={!isPinValid || isVerifying}
            activeOpacity={0.85}
          >
            {isVerifying ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.unlockButtonText}>{t('appLock.unlock')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  logo: { width: 80, height: 80, marginBottom: 16 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  warningBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warningText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  biometricButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  biometricIcon: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
    tintColor: '#008933',
    marginBottom: 6,
  },
  biometricText: { color: '#008933', fontSize: 14, fontWeight: '600' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 16,
  },
  line: { flex: 1, height: 1, backgroundColor: '#EEEEEE' },
  orText: { marginHorizontal: 12, color: '#AAAAAA', fontSize: 13 },
  pinLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  pinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 4,
    position: 'relative',
  },
  pinInput: {
    width: 230,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 4,
    color: '#1A1A1A',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#008933',
    paddingVertical: 8,
    paddingRight: 34,
  },
  pinEye: {
    position: 'absolute',
    right: 0,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleLabelWrapper: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  toggleLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#008933',
    textDecorationLine: 'underline',
  },
  charCounter: {
    fontSize: 11,
    color: '#AAA',
    marginTop: 2,
    marginBottom: 8,
    alignSelf: 'flex-end',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  unlockButton: {
    backgroundColor: '#008933',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 8,
    minHeight: 50,
  },
  unlockButtonDisabled: { backgroundColor: '#CCCCCC' },
  unlockButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});