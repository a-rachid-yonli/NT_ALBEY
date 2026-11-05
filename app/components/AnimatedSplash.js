// components/AnimatedSplash.js
// ✨ Animation de démarrage - NT Albey (Image + Tracé superposé parfait)

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// ═══════════════════════════════════════════════════════════════
// 🎨 PALETTE OFFICIELLE
// ═══════════════════════════════════════════════════════════════
const COLORS = {
  background: '#FFFFFF',
  orange:     'rgb(208, 128, 30)', 
  textDark:   '#58595B',
};

// Le tracé SVG
const logoPath = "M 100 5 C 45 5 5 45 5 100 C 5 150 40 190 85 190 L 195 190 L 195 100 C 195 45 155 5 100 5 Z";

const AnimatedSplash = ({ onFinish }) => {
  const introProgress = useRef(new Animated.Value(0)).current; 
  const strokeProgress = useRef(new Animated.Value(0)).current; 
  const textTitleAnim = useRef(new Animated.Value(0)).current;  
  const textSubtitleAnim = useRef(new Animated.Value(0)).current; 

  useEffect(() => {
    // 1. Apparition du logo
    Animated.timing(introProgress, {
      toValue: 1,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // 2. Tracé orange
    setTimeout(() => {
      Animated.timing(strokeProgress, {
        toValue: 1,
        duration: 2500, 
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false, 
      }).start();
    }, 1000); 

    // 3. Titre
    setTimeout(() => {
      Animated.timing(textTitleAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true, 
      }).start();
    }, 3500); 

    // 4. Sous-titre
    setTimeout(() => {
      Animated.timing(textSubtitleAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true, 
      }).start(({ finished }) => {
        if (finished && onFinish) onFinish();
      });
    }, 4500); 
  }, []);

  // ─── Interpolations ───
  const dotScale = introProgress.interpolate({
    inputRange: [0, 0.3, 0.6],
    outputRange: [0, 1, 0],
  });
  const iconScale = introProgress.interpolate({
    inputRange: [0.4, 1],
    outputRange: [0.5, 1],
  });
  const iconOpacity = introProgress.interpolate({
    inputRange: [0.4, 0.8],
    outputRange: [0, 1],
  });

  const strokeDashoffset = strokeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1000, 0], 
  });

  const titleTranslateX = textTitleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 0], 
  });
  const titleOpacity = textTitleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 1],
  });

  const subtitleTranslateY = textSubtitleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 0], 
  });
  const subtitleOpacity = textSubtitleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>

        <Animated.View
          style={[
            styles.initialDot,
            {
              transform: [{ scale: dotScale }],
              opacity: Animated.subtract(1, iconOpacity),
            },
          ]}
        />

        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: iconOpacity,
              transform: [{ scale: iconScale }],
            },
          ]}
        >
          {/* L'image du logo en fond */}
          <Image
            source={require('../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />

          {/* Le tracé SVG par-dessus */}
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 200 200"
            style={styles.svgOverlay}
          >
            {/* 
              ═══════════════════════════════════════════════════════════════
              🛠️ COMMENT DÉCALER LE TRACÉ (LIGNE CI-DESSOUS) :
              
              La propriété transform="translate(100, 100) scale(0.68) translate(X, Y)"
              contrôle la position et la taille du tracé.
              
              - X (le 1er chiffre du 2ème translate, ici -92) : Contrôle la position horizontale.
                => Pour décaler vers la GAUCHE : Diminuez X (ex: -95, -98).
                => Pour décaler vers la DROITE : Augmentez X (ex: -89, -86).
              
              - Y (le 2ème chiffre du 2ème translate, ici -95) : Contrôle la position verticale.
                => Pour décaler vers le HAUT : Augmentez Y (ex: -92, -89).
                => Pour décaler vers le BAS : Diminuez Y (ex: -98, -101).
              
              - scale(0.68) : Contrôle la taille.
                => Plus le chiffre est grand, plus le tracé est grand.
                => Plus le chiffre est petit, plus le tracé est petit.
              ═══════════════════════════════════════════════════════════════
            */}
            <AnimatedPath
              d={logoPath}
              fill="none"
              stroke={COLORS.orange}
              strokeWidth="8" 
              strokeDasharray="1000 1000"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              strokeLinejoin="round"
              transform="translate(100, 100) scale(0.74) translate(-103, -103)" 
            />
          </Svg>
        </Animated.View>

        <View style={styles.textContainer}>
          <View style={styles.textMask}>
            <Animated.View
              style={{
                transform: [{ translateX: titleTranslateX }],
                opacity: titleOpacity,
                flexDirection: 'row', 
              }}
            >
              <Text style={[styles.brandTitle, { color: COLORS.orange }]}>NT </Text>
              <Text style={[styles.brandTitle, { color: COLORS.textDark }]}>albey</Text>
            </Animated.View>
          </View>

          <Animated.View
            style={{
              transform: [{ translateY: subtitleTranslateY }],
              opacity: subtitleOpacity,
            }}
          >
            <Text style={styles.brandSubtitle}>Global, rapide &amp; sécurisé</Text>
          </Animated.View>
        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialDot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.orange,
  },
  logoContainer: {
    width: 180, 
    height: 180,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textMask: {
    overflow: 'hidden',
    height: 80, 
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  brandTitle: {
    fontSize: 56, 
    fontWeight: '900',
    letterSpacing: -1,
  },
  brandSubtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.orange,
    letterSpacing: 0.5,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default AnimatedSplash;