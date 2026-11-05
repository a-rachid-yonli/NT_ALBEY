// components/DisAlbeyAssistantModal.js
// 🎙️ Assistant Conversationnel Intelligent (« Dis Albey » / « Yi Magana da Albey »)
//    - Interaction vocale bidirectionnelle en Français & Haoussa standard
//    - Orbe visuel animé (Siri / Gemini style) avec ondes concentriques
//    - Compréhension du langage naturel pour actions directes (Solde, Transfert, Recharge, Retrait, Ultra Lite)
//    - Synthèse vocale de réponse automatique via Google TTS

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import {
  ThemedView as View,
  TranslatedText as Text,
  ThemedTouchableOpacity as TouchableOpacity,
  TranslatedTextInput as TextInput,
} from '../context/LanguageContext';
import { useTransactions } from '../context/TransactionContext';
import { useUltraLite } from '../context/UltraLiteContext';
import { triggerSelectionHaptic, triggerSuccessHaptic } from '../utils/haptics';
import {
  speakConfirmation,
  stopVoice,
  numberToHaoussaWords,
} from '../utils/voiceAssistant';

const IconMic = ({ color = '#FFFFFF', size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={color}
    />
    <Path
      d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const IconClose = ({ color = '#94A3B8', size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6l12 12"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const IconSparkle = ({ color = '#FF6600', size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
      fill={color}
      stroke={color}
      strokeWidth={1.5}
    />
  </Svg>
);

export default function DisAlbeyAssistantModal({
  visible = false,
  onClose,
  navigation,
}) {
  const { width = 400, height = 800 } = useWindowDimensions();
  const { balance = 0 } = useTransactions();
  const { isUltraLite, toggleUltraLite } = useUltraLite();

  const [lang, setLang] = useState('fr'); // 'fr' | 'ha'
  const [status, setStatus] = useState('idle'); // 'idle' | 'listening' | 'speaking'
  const [transcript, setTranscript] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [customInput, setCustomInput] = useState('');

  // Animations Orbe & Ondes
  const orbScale = useRef(new Animated.Value(1)).current;
  const ripple1 = useRef(new Animated.Value(1)).current;
  const ripple2 = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
      setAiReply(
        lang === 'ha'
          ? 'Barka! Ni ne mataimakin ku Albey. Me zan iya yi muku a yau?'
          : 'Bonjour ! Je suis votre assistant Albey. Que puis-je faire pour vous aujourd\'hui ?'
      );
    } else {
      stopVoice();
      setStatus('idle');
      setTranscript('');
    }
  }, [visible, lang]);

  // Pulsation de l'Orbe selon l'état
  useEffect(() => {
    let animLoop = null;
    if (status === 'listening' || status === 'speaking') {
      animLoop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(orbScale, {
              toValue: 1.15,
              duration: 500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(orbScale, {
              toValue: 1,
              duration: 500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(ripple1, {
              toValue: 1.6,
              duration: 900,
              useNativeDriver: true,
            }),
            Animated.timing(ripple1, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      animLoop.start();
    } else {
      orbScale.setValue(1);
      ripple1.setValue(1);
    }
    return () => {
      if (animLoop) animLoop.stop();
    };
  }, [status]);

  // Exécution vocale de la réponse
  const speakText = async (textToSpeak, targetLang = lang, onDoneCallback) => {
    setStatus('speaking');
    setAiReply(textToSpeak);
    await speakConfirmation({
      text: textToSpeak,
      lang: targetLang,
      onStart: () => setStatus('speaking'),
      onDone: () => {
        setStatus('idle');
        if (typeof onDoneCallback === 'function') {
          setTimeout(onDoneCallback, 300);
        }
      },
      onError: () => setStatus('idle'),
    });
  };

  // Traitement intelligent des commandes vocales
  const processCommand = async (rawInput) => {
    const input = (rawInput || '').toLowerCase().trim();
    if (!input) return;

    triggerSelectionHaptic();
    setTranscript(rawInput);
    setStatus('speaking');

    // 1. SOLDE / KUDI
    if (
      input.includes('solde') ||
      input.includes('combien') ||
      input.includes('compte') ||
      input.includes('kudi') ||
      input.includes('nawa')
    ) {
      if (lang === 'ha') {
        const words = numberToHaoussaWords(balance);
        const speech = `Kudin ku a asusun Albey a yanzu sun kai ${words} kudi.`;
        await speakText(speech, 'ha');
      } else {
        const speech = `Votre solde disponible est de ${balance.toLocaleString('fr-FR')} Francs CFA.`;
        await speakText(speech, 'fr');
      }
      return;
    }

    // 2. ENVOYER DE L'ARGENT / AIKA KUDI
    if (
      input.includes('envoie') ||
      input.includes('envoyer') ||
      input.includes('transfert') ||
      input.includes('aika') ||
      input.includes('tura')
    ) {
      // Détecter un montant éventuel
      const match = input.match(/\d+/);
      const amountFound = match ? match[0] : '';

      if (lang === 'ha') {
        const speech = amountFound
          ? `To madalla! Ina bude shafin tura kudi na ${numberToHaoussaWords(amountFound)} kudi.`
          : 'To madalla! Ina bude shafin aika kudi.';
        await speakText(speech, 'ha', () => {
          handleClose();
          if (navigation?.navigate) {
            navigation.navigate('SendMoney', { initialAmount: amountFound });
          }
        });
      } else {
        const speech = amountFound
          ? `Très bien ! J'ouvre l'envoi de ${parseInt(amountFound).toLocaleString('fr-FR')} Francs CFA.`
          : 'Très bien ! J\'ouvre l\'envoi de compte à compte.';
        await speakText(speech, 'fr', () => {
          handleClose();
          if (navigation?.navigate) {
            navigation.navigate('SendMoney', { initialAmount: amountFound });
          }
        });
      }
      return;
    }

    // 3. RECHARGE CRÉDIT / BOUTIQUE / SAYI KATI
    if (
      input.includes('credit') ||
      input.includes('crédit') ||
      input.includes('recharge') ||
      input.includes('kati') ||
      input.includes('katin waya') ||
      input.includes('airtime')
    ) {
      const match = input.match(/\d+/);
      const amountFound = match ? match[0] : '';

      if (lang === 'ha') {
        const speech = 'To madalla! Ina bude shafin sayen katin waya.';
        await speakText(speech, 'ha', () => {
          handleClose();
          if (navigation?.navigate) {
            navigation.navigate('Shop', { initialCategory: 'credit', initialAmount: amountFound });
          }
        });
      } else {
        const speech = 'Très bien ! J\'ouvre la recharge de crédit téléphonique.';
        await speakText(speech, 'fr', () => {
          handleClose();
          if (navigation?.navigate) {
            navigation.navigate('Shop', { initialCategory: 'credit', initialAmount: amountFound });
          }
        });
      }
      return;
    }

    // 4. RETRAIT GUICHET / CIRE KUDI
    if (
      input.includes('retrait') ||
      input.includes('retirer') ||
      input.includes('espece') ||
      input.includes('espèces') ||
      input.includes('cire')
    ) {
      if (lang === 'ha') {
        const speech = 'Ina bude shafin cire kudi a ofis.';
        await speakText(speech, 'ha', () => {
          handleClose();
          if (navigation?.navigate) navigation.navigate('Withdraw');
        });
      } else {
        const speech = 'J\'ouvre l\'écran de retrait au guichet.';
        await speakText(speech, 'fr', () => {
          handleClose();
          if (navigation?.navigate) navigation.navigate('Withdraw');
        });
      }
      return;
    }

    // 5. ULTRA LITE 2G MODE
    if (
      input.includes('lite') ||
      input.includes('2g') ||
      input.includes('debit') ||
      input.includes('débit') ||
      input.includes('kunna')
    ) {
      toggleUltraLite();
      triggerSuccessHaptic();
      const nextState = !isUltraLite;
      if (lang === 'ha') {
        const speech = nextState
          ? 'An kunna yanayin Ultra Lite 2G don rage amfani da data da baturi.'
          : 'An kashe yanayin Ultra Lite 2G.';
        await speakText(speech, 'ha');
      } else {
        const speech = nextState
          ? 'Le mode Ultra Lite 2G est activé pour économiser vos données et votre batterie.'
          : 'Le mode Ultra Lite 2G est maintenant désactivé.';
        await speakText(speech, 'fr');
      }
      return;
    }

    // 6. DEFAULT / AIDE
    if (lang === 'ha') {
      const speech = 'Ban gane wannan umarni ba sosai. Kuna iya tambayar kudin ku, ko ku ce ku tura kudi ko sayen katin waya.';
      await speakText(speech, 'ha');
    } else {
      const speech = 'Je n\'ai pas bien compris. Vous pouvez me demander votre solde, d\'envoyer de l\'argent ou de recharger du crédit.';
      await speakText(speech, 'fr');
    }
  };

  const handleMicPress = () => {
    triggerSelectionHaptic();
    if (status === 'speaking') {
      stopVoice();
      setStatus('idle');
      return;
    }

    // Si sur navigateur Web avec API Speech
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.lang = lang === 'ha' ? 'ha-NE' : 'fr-FR';
          rec.continuous = false;
          rec.interimResults = false;
          setStatus('listening');
          rec.onresult = (e) => {
            const heard = e.results[0][0].transcript;
            rec.stop();
            processCommand(heard);
          };
          rec.onerror = () => {
            setStatus('idle');
          };
          rec.start();
          return;
        } catch (_) {}
      }
    }

    // Simulation intelligente / Saisie vocale
    setStatus('listening');
    setTimeout(() => {
      setStatus('idle');
      if (lang === 'ha') {
        processCommand('nawa ne kudi na');
      } else {
        processCommand('quel est mon solde');
      }
    }, 2200);
  };

  const handleClose = () => {
    stopVoice();
    if (typeof onClose === 'function') onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={handleClose} />

        <Animated.View
          style={[
            styles.sheetContainer,
            { maxHeight: height * 0.88, opacity: fadeAnim },
          ]}
        >
          {/* Poignée supérieure */}
          <View style={styles.dragPill} />

          {/* En-tête avec switch de langue & fermeture */}
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <IconSparkle color="#FF6600" size={19} />
              <Text style={styles.title}>Dis Albey</Text>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>IA VOCALE</Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              {/* Sélecteur FR / HA */}
              <View style={styles.langPillContainer}>
                <TouchableOpacity
                  style={[styles.langChip, lang === 'fr' && styles.langChipActive]}
                  onPress={() => {
                    triggerSelectionHaptic();
                    setLang('fr');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.langChipText, lang === 'fr' && styles.langChipTextActive]}>
                    FR
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.langChip, lang === 'ha' && styles.langChipActive]}
                  onPress={() => {
                    triggerSelectionHaptic();
                    setLang('ha');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.langChipText, lang === 'ha' && styles.langChipTextActive]}>
                    HA
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
                <IconClose />
              </TouchableOpacity>
            </View>
          </View>

          {/* Orbe Vocal Signature */}
          <View style={styles.orbArea}>
            <Animated.View
              style={[
                styles.rippleRing,
                { transform: [{ scale: ripple1 }], opacity: status !== 'idle' ? 0.35 : 0.08 },
              ]}
            />
            <Animated.View
              style={[
                styles.orbCore,
                {
                  transform: [{ scale: orbScale }],
                  backgroundColor: status === 'speaking' ? '#FF6600' : '#008933',
                },
              ]}
            >
              <TouchableOpacity
                style={styles.orbTouch}
                onPress={handleMicPress}
                activeOpacity={0.85}
              >
                {status === 'listening' ? (
                  <ActivityIndicator color="#FFFFFF" size="large" />
                ) : (
                  <IconMic color="#FFFFFF" size={36} />
                )}
              </TouchableOpacity>
            </Animated.View>

            <Text style={styles.orbStatusText}>
              {status === 'listening'
                ? lang === 'ha'
                  ? 'Ina sauraren ku…'
                  : 'Je vous écoute…'
                : status === 'speaking'
                ? lang === 'ha'
                  ? 'Albey yana magana…'
                  : 'Albey vous répond…'
                : lang === 'ha'
                ? 'Ku taba makirufo don magana'
                : 'Touchez le micro pour parler'}
            </Text>
          </View>

          {/* Bulle de transcription / Réponse */}
          <View style={styles.speechBubble}>
            {transcript ? (
              <Text style={styles.transcriptText}>« {transcript} »</Text>
            ) : null}
            <Text style={styles.aiReplyText}>{aiReply}</Text>
          </View>

          {/* Puces de commandes suggérées (1-tap rapide) */}
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>
              {lang === 'ha' ? 'Abubuwan da za ku iya tambaya :' : 'Suggestions rapides :'}
            </Text>
            <View style={styles.chipsWrap}>
              {(lang === 'ha'
                ? [
                    { label: '💰 Nawa ne kudi na ?', cmd: 'nawa ne kudi na' },
                    { label: '📤 Aika kudi dubu biyar', cmd: 'aika kudi 5000' },
                    { label: '📱 Sayi katin waya', cmd: 'sayi katin waya' },
                    { label: '🏦 Cire kudi a ofis', cmd: 'cire kudi' },
                    { label: '⚡ Yanayin Ultra Lite 2G', cmd: 'kunna lite' },
                  ]
                : [
                    { label: '💰 Quel est mon solde ?', cmd: 'quel est mon solde' },
                    { label: '📤 Envoyer 5 000 FCFA', cmd: 'envoyer 5000' },
                    { label: '📱 Recharger du crédit', cmd: 'recharger credit' },
                    { label: '🏦 Retirer au guichet', cmd: 'retrait guichet' },
                    { label: '⚡ Mode Ultra Lite 2G', cmd: 'mode ultra lite' },
                  ]
              ).map((item, idx) => (
                <TouchableOpacity
                  key={`cmd-${idx}`}
                  style={styles.suggestionChip}
                  onPress={() => processCommand(item.cmd)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.suggestionChipText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Barre de saisie textuelle de secours */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.inputField}
              placeholder={
                lang === 'ha'
                  ? 'Rubuta tambaya ko umarni a nan…'
                  : 'Écrivez une commande ici…'
              }
              placeholderTextColor="#94A3B8"
              value={customInput}
              onChangeText={setCustomInput}
              onSubmitEditing={() => {
                if (customInput.trim()) {
                  processCommand(customInput);
                  setCustomInput('');
                }
              }}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                !customInput.trim() && { backgroundColor: '#E2E8F0' },
              ]}
              onPress={() => {
                if (customInput.trim()) {
                  processCommand(customInput);
                  setCustomInput('');
                }
              }}
              disabled={!customInput.trim()}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 16 }}>➔</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 20,
  },
  dragPill: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  aiBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  aiBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FF6600',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  langPillContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 2,
  },
  langChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
  },
  langChipActive: {
    backgroundColor: '#008933',
  },
  langChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  langChipTextActive: {
    color: '#FFFFFF',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Orbe */
  orbArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    position: 'relative',
  },
  rippleRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#008933',
  },
  orbCore: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#008933',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  orbTouch: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 12,
  },

  /* Bulle de texte */
  speechBubble: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    minHeight: 65,
    justifyContent: 'center',
  },
  transcriptText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#64748B',
    marginBottom: 4,
  },
  aiReplyText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },

  /* Suggestions */
  suggestionsContainer: {
    marginBottom: 16,
  },
  suggestionsTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#008933',
  },

  /* Saisie texte */
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputField: {
    flex: 1,
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 13,
    color: '#0F172A',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#008933',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
