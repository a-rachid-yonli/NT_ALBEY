import React, { useState } from 'react';
import {
  StyleSheet,
  Modal,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

import { API } from '../services/api';
import { useTranslation, TranslatedText as Text, TranslatedTextInput as TextInput, TranslatedAlert as Alert, ThemedView as View, ThemedTouchableOpacity as TouchableOpacity, ThemedScrollView as ScrollView } from '../context/LanguageContext';
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
    // ✅ v13 : message uniformisé
    if (!isValidPin(newPin)) {
      Alert.alert(t('common.error'), PIN_HELPER_TEXT);
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

                <Text style={forgotStyles.modalHelper}>
                  {PIN_HELPER_TEXT}
                </Text>

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
  modalHelper: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 8,
    fontStyle: 'italic',
    textAlign: 'center',
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

export default ForgotPasswordModal;
