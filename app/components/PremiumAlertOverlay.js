// components/PremiumAlertOverlay.js
// ✨ Modale d'alerte 100% Premium — remplace les Alert.alert natifs gris d'Android/iOS
//    par une carte moderne, animée, traduite et facile à comprendre.
import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import {
  TranslatedText as Text,
  ThemedView as View,
  ThemedTouchableOpacity as TouchableOpacity,
  getCurrentLanguage,
  registerCustomAlertHandler,
} from '../context/LanguageContext';
import { translatePhrase } from '../translations/phrases';
import { humanizeError } from '../utils/errorHandler';
import { triggerErrorHaptic, triggerSuccessHaptic, triggerLightHaptic } from '../utils/haptics';

let externalShowAlert = null;

export function showPremiumAlert(title, message, buttons, options) {
  if (typeof externalShowAlert === 'function') {
    externalShowAlert({ title, message, buttons, options });
  }
}

function detectAlertVariant(title = '', message = '', buttons = []) {
  const combined = `${title} ${message}`.toLowerCase();
  const hasDestructive =
    Array.isArray(buttons) && buttons.some((b) => b && b.style === 'destructive');

  if (
    combined.includes('erreur') ||
    combined.includes('error') ||
    combined.includes('kuskure') ||
    combined.includes('firka') ||
    combined.includes('invalide') ||
    combined.includes('invalid') ||
    combined.includes('impossible') ||
    combined.includes('introuvable') ||
    combined.includes('insuffisant') ||
    combined.includes('incorrect') ||
    combined.includes('échec') ||
    combined.includes('refus') ||
    combined.includes('bloqué') ||
    combined.includes('❌')
  ) {
    return 'error';
  }

  if (
    combined.includes('succès') ||
    combined.includes('success') ||
    combined.includes('félicitations') ||
    combined.includes('bienvenue') ||
    combined.includes('créé') ||
    combined.includes('confirmé') ||
    combined.includes('enregistré') ||
    combined.includes('✅') ||
    combined.includes('🎉')
  ) {
    return 'success';
  }

  if (
    hasDestructive ||
    combined.includes('déconnexion') ||
    combined.includes('effacer') ||
    combined.includes('supprimer') ||
    combined.includes('attention') ||
    combined.includes('trop de tentatives') ||
    combined.includes('⚠️')
  ) {
    return 'warning';
  }

  return 'info';
}

const VARIANT_CONFIG = {
  error: {
    iconBg: '#FEE2E2',
    iconBorder: '#FECACA',
    iconColor: '#EF4444',
    iconSymbol: '!',
    primaryBg: '#008933',
    defaultTitle: 'Attention',
  },
  success: {
    iconBg: '#D1FAE5',
    iconBorder: '#A7F3D0',
    iconColor: '#008933',
    iconSymbol: '✓',
    primaryBg: '#008933',
    defaultTitle: 'Opération réussie',
  },
  warning: {
    iconBg: '#FEF3C7',
    iconBorder: '#FDE68A',
    iconColor: '#D97706',
    iconSymbol: '!',
    primaryBg: '#008933',
    defaultTitle: 'Confirmation',
  },
  info: {
    iconBg: '#E8F5E9',
    iconBorder: '#C8E6C9',
    iconColor: '#008933',
    iconSymbol: 'i',
    primaryBg: '#008933',
    defaultTitle: 'Information',
  },
};

export default function PremiumAlertOverlay() {
  const [alertState, setAlertState] = useState(null);
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    externalShowAlert = ({ title, message, buttons, options }) => {
      const lang = getCurrentLanguage();
      const rawTitle = typeof title === 'string' ? title.trim() : '';
      const rawMsg = typeof message === 'string' ? message.trim() : '';

      const variant = detectAlertVariant(rawTitle, rawMsg, buttons);

      if (variant === 'error') {
        triggerErrorHaptic();
      } else if (variant === 'success') {
        triggerSuccessHaptic();
      } else {
        triggerLightHaptic();
      }

      const cleanTitle =
        rawTitle === '✅' || rawTitle === '⚠️' || rawTitle === '❌' || !rawTitle
          ? VARIANT_CONFIG[variant].defaultTitle
          : rawTitle.replace(/^[✅⚠️❌✨🔒]+\s*/, '');

      const cleanMessage = rawMsg
        ? variant === 'error'
          ? humanizeError(rawMsg)
          : rawMsg
        : '';

      const normalizedButtons =
        Array.isArray(buttons) && buttons.length > 0
          ? buttons
          : [{ text: translatePhrase('Compris', lang), style: 'default' }];

      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);

      setAlertState({
        title: translatePhrase(cleanTitle, lang),
        message: translatePhrase(cleanMessage, lang),
        buttons: normalizedButtons.map((b) => ({
          ...b,
          text: translatePhrase(b?.text || 'OK', lang),
        })),
        options,
        variant,
      });

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 75,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    };

    registerCustomAlertHandler((title, message, buttons, options) => {
      if (typeof externalShowAlert === 'function') {
        externalShowAlert({ title, message, buttons, options });
      }
    });

    return () => {
      externalShowAlert = null;
      registerCustomAlertHandler(null);
    };
  }, [scaleAnim, opacityAnim]);

  const handleClose = (btn) => {
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      setAlertState(null);
      if (btn && typeof btn.onPress === 'function') {
        setTimeout(() => {
          try {
            btn.onPress();
          } catch (_) {}
        }, 40);
      }
    });
  };

  if (!alertState) return null;

  const vConfig = VARIANT_CONFIG[alertState.variant] || VARIANT_CONFIG.info;
  const buttons = alertState.buttons || [];
  const isTwoButtons = buttons.length === 2;

  return (
    <Modal
      transparent
      visible={!!alertState}
      animationType="none"
      onRequestClose={() => {
        if (alertState.options?.cancelable !== false) {
          const cancelBtn = buttons.find((b) => b.style === 'cancel') || buttons[0];
          handleClose(cancelBtn);
        }
      }}
    >
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Animated.View
          style={[
            styles.cardWrap,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.card}>
            {/* Cercle d'icône contextuel */}
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: vConfig.iconBg,
                  borderColor: vConfig.iconBorder,
                },
              ]}
            >
              <Text style={[styles.iconSymbol, { color: vConfig.iconColor }]}>
                {vConfig.iconSymbol}
              </Text>
            </View>

            {/* Titre */}
            {!!alertState.title && (
              <Text style={styles.title}>{alertState.title}</Text>
            )}

            {/* Message clair & lisible */}
            {!!alertState.message && (
              <Text style={styles.message}>{alertState.message}</Text>
            )}

            {/* Boutons d'action */}
            <View
              style={[
                styles.buttonsContainer,
                isTwoButtons && styles.buttonsRow,
              ]}
            >
              {buttons.map((btn, idx) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';

                return (
                  <TouchableOpacity
                    key={`alert-btn-${idx}`}
                    style={[
                      styles.button,
                      isTwoButtons && { flex: 1 },
                      isCancel
                        ? styles.buttonCancel
                        : isDestructive
                        ? styles.buttonDestructive
                        : { backgroundColor: vConfig.primaryBg },
                    ]}
                    onPress={() => handleClose(btn)}
                    activeOpacity={0.82}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isCancel
                          ? styles.buttonTextCancel
                          : styles.buttonTextPrimary,
                      ]}
                      numberOfLines={1}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 380,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
      },
      android: { elevation: 16 },
    }),
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconSymbol: {
    fontSize: 28,
    fontWeight: '900',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 22,
  },
  buttonsContainer: {
    width: '100%',
    gap: 10,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCancel: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  buttonDestructive: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
  },
  buttonTextCancel: {
    color: '#475569',
  },
});
