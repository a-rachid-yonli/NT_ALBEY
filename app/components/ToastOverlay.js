// components/ToastOverlay.js
// ✨ Toast premium 100% AUTO-DISMISS
//    - Slide depuis la droite, gradient vert
//    - Disparaît tout seul après `duration` (défaut 3s)
//    - AUCUNE interaction possible (pas de tap, pas de swipe)
//    - `pointerEvents="none"` → ne bloque AUCUN toucher sur l'app
//    - Barre de progression subtile qui indique qu'il va s'effacer
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useToast } from '../context/ToastContext';

// ═══════════════════════════════════════════════════════════════
// 🎨 PALETTE
// ═══════════════════════════════════════════════════════════════
const COLORS = {
  shadow: '#0F172A',
};

// Dégradés par type de toast
const GRADIENTS = {
  success: ['#008933', '#00A34D'],
  error:   ['#EF4444', '#DC2626'],
  warning: ['#F59E0B', '#D97706'],
  info:    ['#3B82F6', '#2563EB'],
};

// Icône par type de toast
const ICONS = {
  success: '✓',
  error:   '✕',
  warning: '!',
  info:    'i',
};

// Largeur utilisée pour le slide out (marge généreuse pour être sûr
// que le toast soit totalement hors-écran même sur grands écrans)
const OFFSCREEN_X = 500;

const ToastOverlay = () => {
  const { toast, hideToast } = useToast();

  const translateX = useRef(new Animated.Value(OFFSCREEN_X)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(1)).current;
  const isAnimatingOut = useRef(false);

  useEffect(() => {
    if (!toast) return;

    isAnimatingOut.current = false;

    // Reset des valeurs animées
    translateX.setValue(OFFSCREEN_X);
    opacity.setValue(0);
    progress.setValue(1);

    // ── Slide IN : droite → centre
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        tension: 65,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    // ── Durée totale (avant auto-dismiss)
    const duration = toast.duration || 3000;

    // ── Barre de progression (descend de 100% à 0%)
    Animated.timing(progress, {
      toValue: 0,
      duration,
      useNativeDriver: false, // width ne supporte pas useNativeDriver
    }).start();

    // ── Auto-dismiss — JAMAIS de clic requis
    const timer = setTimeout(() => {
      animateOut();
    }, duration);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.id]);

  const animateOut = () => {
    if (isAnimatingOut.current) return;
    isAnimatingOut.current = true;

    // Slide OUT : centre → droite + fade
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: OFFSCREEN_X,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      hideToast();
      isAnimatingOut.current = false;
    });
  };

  if (!toast) return null;

  const type = toast.type || 'success';
  const gradient = GRADIENTS[type] || GRADIENTS.success;
  const icon = toast.icon || ICONS[type] || '✓';

  // Interpolation 0→1 en "0%"→"100%" pour la largeur de la barre
  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={[
        styles.container,
        { top: Platform.OS === 'ios' ? 60 : 40 },
      ]}
      // ✨ CRITIQUE : le toast ne capte AUCUN toucher
      //    → l'utilisateur peut continuer à utiliser l'app en dessous
      pointerEvents="none"
    >
      <Animated.View
        style={[
          styles.animatedWrap,
          {
            opacity,
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.toastCard}
        >
          <View style={styles.toastContent}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>{icon}</Text>
            </View>

            <View style={styles.textWrap}>
              {toast.title ? (
                <Text style={styles.title} numberOfLines={1}>
                  {toast.title}
                </Text>
              ) : null}
              {toast.message ? (
                <Text style={styles.message} numberOfLines={2}>
                  {toast.message}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Barre de progression — indique qu'il va s'effacer */}
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  // ═══════════════════════════════════════════════════════════════
  // 📦 CONTENEUR — positionné en haut, centré horizontalement
  // ═══════════════════════════════════════════════════════════════
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  // ═══════════════════════════════════════════════════════════════
  // 🎬 WRAPPER ANIMÉ — porte l'ombre
  // ═══════════════════════════════════════════════════════════════
  animatedWrap: {
    width: '100%',
    maxWidth: 500,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.32,
        shadowRadius: 20,
      },
      android: { elevation: 14 },
    }),
  },

  // ═══════════════════════════════════════════════════════════════
  // 🎨 CARTE DU TOAST
  // ═══════════════════════════════════════════════════════════════
  toastCard: {
    borderRadius: 18,
    overflow: 'hidden',
    paddingTop: 14,
    paddingHorizontal: 16,
  },

  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
  },

  // Cercle de l'icône
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  iconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },

  // Zone de texte
  textWrap: {
    flex: 1,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 2,
  },

  message: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },

  // ═══════════════════════════════════════════════════════════════
  // 📊 BARRE DE PROGRESSION
  // ═══════════════════════════════════════════════════════════════
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: 'hidden',
  },

  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderBottomLeftRadius: 18,
  },
});

export default ToastOverlay;