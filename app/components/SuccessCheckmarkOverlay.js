// components/SuccessCheckmarkOverlay.js
// 🌟 Animation de validation bancaire signature ("Chime" Wave / Apple Pay)
//    - Bulle de validation animée avec effet ripple et spring physics
//    - Carillon de succès ("Ding") instantané à zéro latence
//    - Double vibration haptique synchronisée
//    - Compatible iOS, Android et Web
import React, { useEffect, useRef } from 'react';
import {
  Modal,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  ThemedView as View,
  TranslatedText as Text,
} from '../context/LanguageContext';
import Svg, { Path } from 'react-native-svg';
import { playSuccessChime } from '../utils/soundEffects';

const CheckmarkIcon = ({ size = 46, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 13l4 4L19 7"
      stroke={color}
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default function SuccessCheckmarkOverlay({
  visible = false,
  title = 'Transaction réussie !',
  amount = '',
  subtitle = '',
  duration = 2000,
  onDismiss,
}) {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rippleAnim1 = useRef(new Animated.Value(0.8)).current;
  const rippleOpacity1 = useRef(new Animated.Value(0.6)).current;
  const rippleAnim2 = useRef(new Animated.Value(0.8)).current;
  const rippleOpacity2 = useRef(new Animated.Value(0.4)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    if (visible) {
      // 1. Jouer immédiatement le son chime & haptique
      playSuccessChime();

      // Reset des animations
      scaleAnim.setValue(0.3);
      opacityAnim.setValue(0);
      rippleAnim1.setValue(0.8);
      rippleOpacity1.setValue(0.7);
      rippleAnim2.setValue(0.8);
      rippleOpacity2.setValue(0.4);
      textOpacity.setValue(0);
      textTranslateY.setValue(15);

      // 2. Lancement des animations synchronisées
      Animated.parallel([
        // Entrée en fondu du fond
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        // Rebond dynamique de l'icône (Spring Apple Pay / Wave)
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4.5,
          tension: 80,
          useNativeDriver: true,
        }),
        // Onde 1 (Ripple vert)
        Animated.parallel([
          Animated.timing(rippleAnim1, {
            toValue: 1.45,
            duration: 900,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(rippleOpacity1, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
        // Onde 2 avec léger décalage
        Animated.sequence([
          Animated.delay(120),
          Animated.parallel([
            Animated.timing(rippleAnim2, {
              toValue: 1.6,
              duration: 1000,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(rippleOpacity2, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        ]),
        // Apparition du texte montant & destinataire
        Animated.sequence([
          Animated.delay(180),
          Animated.parallel([
            Animated.timing(textOpacity, {
              toValue: 1,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(textTranslateY, {
              toValue: 0,
              duration: 250,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();

      // 3. Fermeture automatique après la durée spécifiée
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (typeof onDismiss === 'function') {
        onDismiss();
      }
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      >
        <Animated.View
          style={[
            styles.cardContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Ondes concentriques lumineuses (Ripples) */}
          <Animated.View
            style={[
              styles.rippleRing,
              {
                opacity: rippleOpacity1,
                transform: [{ scale: rippleAnim1 }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.rippleRing,
              {
                opacity: rippleOpacity2,
                transform: [{ scale: rippleAnim2 }],
              },
            ]}
          />

          {/* Badge rond central vert avec checkmark */}
          <View style={styles.iconCircle}>
            <CheckmarkIcon size={46} color="#FFFFFF" />
          </View>

          {/* Titre & Détails */}
          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: textOpacity,
                transform: [{ translateY: textTranslateY }],
              },
            ]}
          >
            <Text style={styles.titleText}>{title}</Text>

            {!!amount && (
              <Text style={styles.amountText}>
                {typeof amount === 'number'
                  ? `${amount.toLocaleString('fr-FR')} FCFA`
                  : amount}
              </Text>
            )}

            {!!subtitle && (
              <Text style={styles.subtitleText} numberOfLines={2}>
                {subtitle}
              </Text>
            )}
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#008933',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOpacity: 0.18,
      },
    }),
  },
  rippleRing: {
    position: 'absolute',
    top: 32,
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(0, 137, 51, 0.25)',
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#008933',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#008933',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  amountText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#008933',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    paddingHorizontal: 8,
  },
});
