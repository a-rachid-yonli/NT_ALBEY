// components/VoiceAssistantButton.js
// 🎙️ Bouton d'Assistance Vocale en Langues Locales (Français & Haoussa)
//    - Permet d'écouter vocalement le récapitulatif avant confirmation de sortie d'argent
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import {
  TranslatedText as Text,
  ThemedView as View,
  ThemedTouchableOpacity as TouchableOpacity,
} from '../context/LanguageContext';
import { triggerSelectionHaptic } from '../utils/haptics';
import {
  speakConfirmation,
  stopVoice,
  buildVoiceConfirmationText,
} from '../utils/voiceAssistant';

const IconSpeaker = ({ color = '#008933', size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 5L6 9H2v6h4l5 4V5z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const IconStop = ({ color = '#DC2626', size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M6 6h12v12H6z" />
  </Svg>
);

export default function VoiceAssistantButton({
  type = 'transfer_p2p',
  amount = 0,
  recipientName = '',
  recipientPhone = '',
  containerStyle = {},
}) {
  const [selectedLang, setSelectedLang] = useState('fr'); // 'fr' | 'ha'
  const [isPlaying, setIsPlaying] = useState(false);
  const [spokenText, setSpokenText] = useState('');

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Arrêter la voix si l'écran se ferme
  useEffect(() => {
    return () => {
      stopVoice();
    };
  }, []);

  // Animation pulsation quand le son est en cours
  useEffect(() => {
    let loop = null;
    if (isPlaying) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (loop) loop.stop();
    };
  }, [isPlaying, pulseAnim]);

  const handlePlay = async (targetLang) => {
    const langToUse = targetLang || selectedLang;
    setSelectedLang(langToUse);
    triggerSelectionHaptic();

    if (isPlaying && langToUse === selectedLang) {
      // Déjà en lecture pour cette langue -> arrêt
      await stopVoice();
      setIsPlaying(false);
      setSpokenText('');
      return;
    }

    const text = buildVoiceConfirmationText({
      type,
      amount,
      recipientName,
      recipientPhone,
      lang: langToUse,
    });

    setSpokenText(text);

    await speakConfirmation({
      text,
      lang: langToUse,
      onStart: () => setIsPlaying(true),
      onDone: () => {
        setIsPlaying(false);
        setSpokenText('');
      },
      onError: () => {
        setIsPlaying(false);
        setSpokenText('');
      },
    });
  };

  const handleStop = async () => {
    triggerSelectionHaptic();
    await stopVoice();
    setIsPlaying(false);
    setSpokenText('');
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <IconSpeaker color="#008933" size={17} />
          <Text style={styles.titleText}>Assistance Vocale</Text>
        </View>

        {isPlaying && (
          <TouchableOpacity
            style={styles.stopBtn}
            onPress={handleStop}
            activeOpacity={0.7}
          >
            <IconStop color="#DC2626" size={13} />
            <Text style={styles.stopText}>Arrêter</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.langButtonsRow}>
        {/* Bouton Français */}
        <Animated.View
          style={[
            styles.langBtnWrap,
            isPlaying && selectedLang === 'fr' && { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.langBtn,
              selectedLang === 'fr' && styles.langBtnSelected,
              isPlaying && selectedLang === 'fr' && styles.langBtnPlaying,
            ]}
            onPress={() => handlePlay('fr')}
            activeOpacity={0.75}
          >
            <Text style={styles.flagEmoji}>🇫🇷</Text>
            <Text
              style={[
                styles.langBtnText,
                selectedLang === 'fr' && styles.langBtnTextSelected,
              ]}
            >
              Français
            </Text>
            {isPlaying && selectedLang === 'fr' && (
              <Text style={styles.speakingIndicator}>🔊</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Bouton Haoussa */}
        <Animated.View
          style={[
            styles.langBtnWrap,
            isPlaying && selectedLang === 'ha' && { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.langBtn,
              selectedLang === 'ha' && styles.langBtnSelected,
              isPlaying && selectedLang === 'ha' && styles.langBtnPlaying,
            ]}
            onPress={() => handlePlay('ha')}
            activeOpacity={0.75}
          >
            <Text style={styles.flagEmoji}>🇳🇪</Text>
            <Text
              style={[
                styles.langBtnText,
                selectedLang === 'ha' && styles.langBtnTextSelected,
              ]}
            >
              Hausa
            </Text>
            {isPlaying && selectedLang === 'ha' && (
              <Text style={styles.speakingIndicator}>🔊</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Bulle de transcription en direct */}
      {spokenText !== '' && (
        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptLabel}>
            🎙️ En écoute ({selectedLang === 'ha' ? 'Hausa' : 'Français'}) :
          </Text>
          <Text style={styles.transcriptText}>{spokenText}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 12,
    marginVertical: 10,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.2,
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  stopText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  langButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langBtnWrap: {
    flex: 1,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  langBtnSelected: {
    borderColor: '#008933',
    backgroundColor: '#DCFCE7',
  },
  langBtnPlaying: {
    borderColor: '#008933',
    backgroundColor: '#008933',
  },
  flagEmoji: {
    fontSize: 14,
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  langBtnTextSelected: {
    color: '#166534',
  },
  speakingIndicator: {
    fontSize: 12,
  },
  transcriptBox: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#008933',
  },
  transcriptLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#008933',
    marginBottom: 2,
  },
  transcriptText: {
    fontSize: 12,
    color: '#1E293B',
    lineHeight: 16,
    fontWeight: '500',
  },
});
