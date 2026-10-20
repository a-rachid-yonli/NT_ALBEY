// screens/ChatbotScreen.js - Version unifiée : Bot + Agent + Escalade + Persistance
// ✅ DESIGN PREMIUM : moderne, épuré, professionnel
// ✅ FIX v2 : avatar du bot = logo NT Albey (au lieu de l'emoji 🤖)
//             le conseiller humain reste en 👨‍💼
// ✅ FIX v3 : filigrane NT Albey en arrière-plan de la zone messages
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '../context/LanguageContext';
import { API } from '../services/api';
import {
  initSocket,
  onMessageReceived,
  joinConversation,
  getOrCreateConversation,
  sendMessage as sendMessageAPI,
  buildContextMessage,
  disconnectSocket,
} from '../services/chatService';

// ═══════════════════════════════════════════════════════════════
// 🎨 PALETTE PREMIUM
// ═══════════════════════════════════════════════════════════════
const COLORS = {
  primary:      '#008933',
  primarySoft:  '#E8F5E9',
  primaryDark:  '#006B28',
  accent:       '#FF6600',
  accentSoft:   '#FFF3E0',
  blue:         '#3B82F6',
  blueSoft:     '#DBEAFE',
  teal:         '#10B981',
  tealSoft:     '#D1FAE5',
  textPrimary:  '#0F172A',
  textSecondary:'#64748B',
  textMuted:    '#94A3B8',
  border:       '#E2E8F0',
  borderSoft:   '#F1F5F9',
  surface:      '#FFFFFF',
  surfaceAlt:   '#F8FAFC',
  background:   '#F1F5F9',
  danger:       '#EF4444',
  dangerSoft:   '#FEE2E2',
  shadow:       '#0F172A',
};

// ===== CLÉS DE PERSISTANCE =====
const CHAT_HISTORY_KEY = '@ntalbey_chatbot_history';
const CHAT_MODE_KEY = '@ntalbey_chatbot_mode';
const CHAT_CONV_ID_KEY = '@ntalbey_chatbot_conv_id';

// ===== LOGO NT ALBEY (avatar du bot) =====
const NT_LOGO = require('../assets/images/logo-carre.png');

// ===== PATTERN FILIGRANE (identique à HomeScreen) =====
const WATERMARK_PATTERN = require('../assets/patern.png');

// ═══════════════════════════════════════════════════════════════
// 🎯 ICÔNES SVG
// ═══════════════════════════════════════════════════════════════
const IconBack = () => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={COLORS.textPrimary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconSend = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M22 2L11 13" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconHeadset = ({ color = COLORS.primary }) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M3 18v-6a9 9 0 0118 0v6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconBotSwitch = ({ color = COLORS.primary }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M9 3h6v2H9z" fill={color} />
    <Path d="M12 5v3" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Path d="M20 10a8 8 0 01-16 0 8 8 0 0116 0z" stroke={color} strokeWidth="2" />
    <Circle cx="9" cy="11" r="1.2" fill={color} />
    <Circle cx="15" cy="11" r="1.2" fill={color} />
  </Svg>
);

const IconTrash = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2" stroke={COLORS.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M10 11v6M14 11v6" stroke={COLORS.danger} strokeWidth="2" strokeLinecap="round" />
    <Path d="M5 6l1 14a2 2 0 002 2h8a2 2 0 002-2l1-14" stroke={COLORS.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ===== RÉPONSES DU BOT =====
const getChatbotResponses = (t) => ({
  'bonjour': t('chatbot.respBonjour') || 'Bonjour ! 👋 Comment puis-je vous aider aujourd\'hui ?',
  'salut': t('chatbot.respSalut') || 'Salut ! 👋 Que puis-je faire pour vous ?',
  'hello': t('chatbot.respHello') || 'Hello ! 👋 How can I help you today ?',
  'hi': t('chatbot.respHi') || 'Hi there! 👋 How can I assist you?',
  'coucou': t('chatbot.respCoucou') || 'Coucou ! 😊 Comment puis-je vous aider ?',
  'transfert': t('chatbot.respTransfert') || 'Pour effectuer un transfert d\'argent :\n1. Allez dans "Envoyer"\n2. Choisissez un bénéficiaire\n3. Saisissez le montant\n4. Confirmez avec votre PIN',
  'envoyer': t('chatbot.respEnvoyer') || 'Pour envoyer de l\'argent, rendez-vous dans le menu "Envoyer" sur votre page d\'accueil.',
  'retrait': t('chatbot.respRetrait') || 'Pour retirer de l\'argent :\n1. Allez dans "Retrait"\n2. Choisissez votre méthode\n3. Saisissez le montant\n4. Confirmez avec votre PIN',
  'retirer': t('chatbot.respRetirer') || '💰 Vous pouvez retirer votre argent dans n\'importe quelle agence NT Albey. Allez dans "Retrait" sur l\'accueil pour commencer.',
  'pin': t('chatbot.respPin') || 'Pour changer votre PIN :\n1. Allez dans "Profil"\n2. Cliquez sur "Sécurité"\n3. Choisissez "Changer mon PIN"\n4. Suivez les instructions',
  'mot de passe': t('chatbot.respMotDePasse') || 'Pour réinitialiser votre mot de passe, cliquez sur "Mot de passe oublié" sur l\'écran de connexion.',
  'compte': t('chatbot.respCompte') || 'Vous pouvez gérer votre compte dans la section "Profil" de l\'application.',
  'facture': t('chatbot.respFacture') || 'Pour payer une facture :\n1. Allez dans "Paiement"\n2. Choisissez la catégorie\n3. Saisissez les informations\n4. Confirmez avec votre PIN',
  'paiement': t('chatbot.respPaiement') || 'Pour effectuer un paiement, utilisez le menu "Paiement" sur votre page d\'accueil.',
  'carte': t('chatbot.respCarte') || 'Pour gérer vos cartes virtuelles, rendez-vous dans "Visa & Cartes" depuis l\'accueil.',
  'visa': t('chatbot.respVisa') || 'La section "Visa & Cartes" vous permet de créer des cartes virtuelles et de les recharger.',
  'gouv': t('chatbot.respGouv') || 'Gouv-Pay vous permet de payer vos impôts et taxes en ligne depuis l\'application.',
  'boutique': t('chatbot.respBoutique') || 'La Boutique NT vous permet d\'acheter des forfaits, crédit téléphonique et services NT.',
  'merci': t('chatbot.respMerci') || 'Avec plaisir ! 😊 N\'hésitez pas si vous avez d\'autres questions.',
  'thanks': t('chatbot.respThanks') || 'You\'re welcome ! 😊 Feel free to ask if you have more questions.',
  'aide': t('chatbot.respAide') || 'Voici ce que je peux faire pour vous :\n• Répondre à vos questions sur l\'application\n• Vous guider sur les transferts et paiements\n• Vous aider avec votre compte\n• Vous orienter vers le support',
  'support': t('chatbot.respSupport') || 'Vous pouvez contacter notre support :\n• Par téléphone : 555\n• Par email : support@ntalbey.ne\n• Dans l\'application : section "Profil" > "Support"',
  'default': t('chatbot.respDefault') || 'Je n\'ai pas compris votre question. 😅\n\nVoici quelques sujets que je peux traiter :\n• Transfert d\'argent 💰\n• Paiement de factures 📄\n• Gestion du compte 👤\n• Carte Visa 💳\n• Gouv-Pay 🏛️\n• Boutique NT 🛍️\n\nOu tapez "aide" pour plus d\'options.',
});

// ===== DÉTECTION D'INTENTION D'ESCALADE =====
const ESCALATION_KEYWORDS = [
  'agent', 'humain', 'conseiller', 'service client', 'service cli',
  'parler à un', 'parler a un', 'parler à quelqu', 'parler a quelqu',
  'réclamation', 'reclamation', 'plainte', 'urgent', 'problème grave',
  'probleme grave', 'vrai personne', 'vraie personne',
  'talk to a human', 'talk to an agent', 'talk to someone',
  'real person', 'human agent', 'customer service', 'advisor', 'representative',
];

const detectEscalationIntent = (text) => {
  const lower = String(text || '').toLowerCase();
  return ESCALATION_KEYWORDS.some((k) => lower.includes(k));
};

// ===== GÉNÉRATEUR D'ID UNIQUE =====
let messageIdCounter = 0;
const generateUniqueId = () => {
  messageIdCounter += 1;
  return `msg_${Date.now()}_${messageIdCounter}_${Math.random().toString(36).slice(2, 8)}`;
};

// ===== UTILS =====
const formatTime = (isoString) => {
  try {
    const date = isoString ? new Date(isoString) : new Date();
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } catch {
    return '';
  }
};

// ═══════════════════════════════════════════════════════════════
// 🖼️ FILIGRANE — pattern de logos NT Albey en arrière-plan
// ═══════════════════════════════════════════════════════════════
const ChatWatermark = () => {
  const { width = 400, height = 800 } = useWindowDimensions();
  const LOGO_SIZE = 42;
  const GAP = 10;
  const STEP = LOGO_SIZE + GAP;
  const cols = Math.ceil(width / STEP) + 1;
  const rows = Math.ceil(height / STEP) + 2;

  const tiles = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      tiles.push(
        <Image
          key={`wm-${row}-${col}`}
          source={WATERMARK_PATTERN}
          style={styles.watermarkLogo}
          resizeMode="contain"
        />
      );
    }
  }

  return (
    <View style={styles.watermarkContainer} pointerEvents="none">
      <View style={styles.watermarkGrid}>{tiles}</View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🧩 SOUS-COMPOSANTS
// ═══════════════════════════════════════════════════════════════

// Message système (centré)
const SystemMessage = ({ text }) => (
  <View style={styles.systemMessageWrapper}>
    <View style={styles.systemMessageBubble}>
      <Text style={styles.systemMessageText}>{text}</Text>
    </View>
  </View>
);

// Carte d'escalade
const EscalationCard = ({ t, onAccept, onLater, isLoading }) => (
  <View style={styles.escalationCardWrapper}>
    <View style={styles.escalationCard}>
      <View style={styles.escalationIconRow}>
        <View style={styles.escalationIconCircle}>
          <IconHeadset color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.escalationTitle}>{t('chatbot.escalateTitle')}</Text>
          <Text style={styles.escalationBadge}>🎧 Support humain</Text>
        </View>
      </View>

      <Text style={styles.escalationSubtitle}>{t('chatbot.escalateSubtitle')}</Text>

      <View style={styles.escalationActions}>
        <TouchableOpacity
          style={styles.escalationPrimaryButton}
          onPress={onAccept}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <IconHeadset color="#FFFFFF" />
              <Text style={styles.escalationPrimaryText}>{t('chatbot.escalateButton')}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.escalationSecondaryButton}
          onPress={onLater}
          disabled={isLoading}
          activeOpacity={0.75}
        >
          <Text style={styles.escalationSecondaryText}>{t('chatbot.escalateLater')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

// ═══════════════════════════════════════════════════════════════
// 🚀 COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function ChatbotScreen({ navigation }) {
  const { t } = useTranslation();
  const scrollViewRef = useRef();

  const [messages, setMessages] = useState([]);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [mode, setMode] = useState('bot');

  const [showEscalationCard, setShowEscalationCard] = useState(false);
  const [escalationOffered, setEscalationOffered] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);

  const [clientPhone, setClientPhone] = useState('');
  const [clientName, setClientName] = useState('Client');
  const [conversationId, setConversationId] = useState(null);

  const [historyLoaded, setHistoryLoaded] = useState(false);

  // ═════════════════════════════════════════════════════════
  // 1️⃣ CHARGEMENT DE L'HISTORIQUE AU MONTAGE
  // ═════════════════════════════════════════════════════════
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const rawHistory = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
        const rawMode = await AsyncStorage.getItem(CHAT_MODE_KEY);
        const rawConvId = await AsyncStorage.getItem(CHAT_CONV_ID_KEY);

        if (rawHistory) {
          const parsed = JSON.parse(rawHistory);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }
        if (rawMode === 'agent' || rawMode === 'bot') {
          setMode(rawMode);
        }
        if (rawConvId) {
          const id = parseInt(rawConvId, 10);
          if (!isNaN(id)) setConversationId(id);
        }
      } catch (e) {
        console.error('Erreur chargement historique chat:', e);
      } finally {
        setHistoryLoaded(true);
      }
    };
    loadHistory();
  }, []);

  // ═════════════════════════════════════════════════════════
  // 2️⃣ MESSAGE DE BIENVENUE SI L'HISTORIQUE EST VIDE
  // ═════════════════════════════════════════════════════════
  useEffect(() => {
    if (!historyLoaded) return;
    if (messages.length === 0) {
      setMessages([
        {
          id: generateUniqueId(),
          text: t('chatbot.initialMessage'),
          sender: 'bot',
          time: formatTime(),
        },
      ]);
    }
  }, [historyLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ═════════════════════════════════════════════════════════
  // 3️⃣ SAUVEGARDE AUTOMATIQUE À CHAQUE CHANGEMENT
  // ═════════════════════════════════════════════════════════
  useEffect(() => {
    if (!historyLoaded) return;
    if (messages.length === 0) return;
    const save = async () => {
      try {
        await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
      } catch (e) {
        console.error('Erreur sauvegarde historique chat:', e);
      }
    };
    save();
  }, [messages, historyLoaded]);

  useEffect(() => {
    if (!historyLoaded) return;
    (async () => {
      try {
        await AsyncStorage.setItem(CHAT_MODE_KEY, mode);
      } catch (e) {
        console.error('Erreur sauvegarde mode chat:', e);
      }
    })();
  }, [mode, historyLoaded]);

  useEffect(() => {
    if (!historyLoaded) return;
    (async () => {
      try {
        if (conversationId) {
          await AsyncStorage.setItem(CHAT_CONV_ID_KEY, String(conversationId));
        } else {
          await AsyncStorage.removeItem(CHAT_CONV_ID_KEY);
        }
      } catch (e) {
        console.error('Erreur sauvegarde convId:', e);
      }
    })();
  }, [conversationId, historyLoaded]);

  // ═════════════════════════════════════════════════════════
  // 4️⃣ RECONNEXION AUTOMATIQUE À LA CONVERSATION SI MODE AGENT
  // ═════════════════════════════════════════════════════════
  useEffect(() => {
    if (!historyLoaded) return;
    if (!clientPhone) return;
    if (mode !== 'agent') return;
    if (!conversationId) return;

    try {
      initSocket(clientPhone);
      joinConversation(conversationId);

      onMessageReceived((newMsg) => {
        if (!newMsg) return;
        const fromAgent = newMsg.from === 'agent' || newMsg.from === 'support';
        if (!fromAgent) return;

        setMessages((prev) => {
          const exists = prev.some((m) => m.id === newMsg.id);
          if (exists) return prev;
          return [
            ...prev,
            {
              id: newMsg.id || generateUniqueId(),
              text: newMsg.content || '',
              sender: 'agent',
              time: formatTime(newMsg.timestamp),
            },
          ];
        });
        scrollToEnd();
      });
    } catch (e) {
      console.error('Erreur reconnexion socket:', e);
    }
  }, [historyLoaded, clientPhone, mode, conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== CHARGEMENT USER =====
  useEffect(() => {
    (async () => {
      try {
        const user = await API.getCurrentUser();
        if (user) {
          setClientPhone(user.phone || '');
          setClientName(user.name || 'Client');
        }
      } catch (e) {
        console.log('Erreur user chatbot:', e);
      }
    })();
  }, []);

  const scrollToEnd = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // ===== RÉPONSE DU BOT =====
  const getBotResponse = (text) => {
    const lower = text.toLowerCase().trim();
    const responses = getChatbotResponses(t);
    for (const [key, val] of Object.entries(responses)) {
      if (key === 'default') continue;
      if (lower.includes(key)) {
        return { text: val, isDefault: false };
      }
    }
    return { text: responses.default, isDefault: true };
  };

  // ===== PROPOSER L'ESCALADE =====
  const offerEscalation = () => {
    setEscalationOffered(true);
    setShowEscalationCard(true);
    scrollToEnd();
  };

  // ===== ENVOI D'UN MESSAGE =====
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;

    const userMsg = {
      id: generateUniqueId(),
      text,
      sender: 'user',
      time: formatTime(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    scrollToEnd();

    // --- Mode AGENT ---
    if (mode === 'agent') {
      if (!conversationId) {
        Alert.alert('Erreur', t('chatbot.transferError'));
        return;
      }
      try {
        await sendMessageAPI(conversationId, text, [], clientName);
      } catch (e) {
        console.error('Erreur envoi agent:', e);
        Alert.alert('Erreur', 'Impossible d\'envoyer le message.');
      }
      return;
    }

    // --- Mode BOT ---
    const wantsEscalation = detectEscalationIntent(text);

    setIsTyping(true);
    setTimeout(() => {
      const response = getBotResponse(text);
      setIsTyping(false);

      const botMsg = {
        id: generateUniqueId(),
        text: response.text,
        sender: 'bot',
        time: formatTime(),
      };
      setMessages((prev) => [...prev, botMsg]);
      scrollToEnd();

      // ✅ 1) L'utilisateur demande explicitement un humain
      if (wantsEscalation && !escalationOffered) {
        setTimeout(() => offerEscalation(), 600);
        return;
      }

      // ✅ 2) Le bot n'a PAS compris → on propose l'escalade
      if (response.isDefault && !escalationOffered) {
        setTimeout(() => offerEscalation(), 600);
      }
    }, 900);
  };

  // ===== ESCALADE VERS L'AGENT =====
  const handleEscalate = async () => {
    if (isEscalating) return;
    setIsEscalating(true);
    setShowEscalationCard(false);

    setMessages((prev) => [
      ...prev,
      {
        id: generateUniqueId(),
        text: t('chatbot.transferring'),
        sender: 'system',
        time: formatTime(),
      },
    ]);
    scrollToEnd();

    try {
      const conv = await getOrCreateConversation(clientPhone, clientName);
      setConversationId(conv.id);

      const contextMsg = buildContextMessage(messagesRef.current, clientName, clientPhone);
      await sendMessageAPI(conv.id, contextMsg, [], clientName);

      initSocket(clientPhone);
      joinConversation(conv.id);

      onMessageReceived((newMsg) => {
        if (!newMsg) return;
        const fromAgent = newMsg.from === 'agent' || newMsg.from === 'support';
        if (!fromAgent) return;

        setMessages((prev) => {
          const exists = prev.some((m) => m.id === newMsg.id);
          if (exists) return prev;
          return [
            ...prev,
            {
              id: newMsg.id || generateUniqueId(),
              text: newMsg.content || '',
              sender: 'agent',
              time: formatTime(newMsg.timestamp),
            },
          ];
        });
        scrollToEnd();
      });

      setMode('agent');

      setMessages((prev) => [
        ...prev,
        {
          id: generateUniqueId(),
          text: t('chatbot.transferComplete'),
          sender: 'system',
          time: formatTime(),
        },
      ]);
      scrollToEnd();
    } catch (e) {
      console.error('Erreur escalade:', e);
      Alert.alert('Erreur', t('chatbot.transferError'));
      setMode('bot');
    } finally {
      setIsEscalating(false);
    }
  };

  // ===== RETOUR AU BOT =====
  const handleBackToBot = () => {
    Alert.alert(
      t('chatbot.backToBot'),
      t('chatbot.backToBotConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'OK',
          onPress: () => {
            setMode('bot');
            setEscalationOffered(false);
            setShowEscalationCard(false);
            setMessages((prev) => [
              ...prev,
              {
                id: generateUniqueId(),
                text: t('chatbot.backToBotConfirmed'),
                sender: 'system',
                time: formatTime(),
              },
            ]);
            scrollToEnd();
          },
        },
      ]
    );
  };

  // ===== DÉCLINER L'ESCALADE =====
  const handleDeclineEscalation = () => {
    setShowEscalationCard(false);
  };

  // ===== EFFACER L'HISTORIQUE =====
  const handleClearHistory = () => {
    Alert.alert(
      'Effacer la conversation ?',
      'Tout l\'historique de discussion sera supprimé. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
              await AsyncStorage.removeItem(CHAT_MODE_KEY);
              await AsyncStorage.removeItem(CHAT_CONV_ID_KEY);
            } catch (e) {
              console.error('Erreur effacement historique:', e);
            }
            setMessages([
              {
                id: generateUniqueId(),
                text: t('chatbot.initialMessage'),
                sender: 'bot',
                time: formatTime(),
              },
            ]);
            setEscalationOffered(false);
            setShowEscalationCard(false);
            setMode('bot');
            setConversationId(null);
          },
        },
      ]
    );
  };

  // ===== SUGGESTIONS RAPIDES =====
  const quickSuggestions = [
    { label: `💰 ${t('chatbot.sugTransfer') || 'Transfert'}`, value: 'transfert' },
    { label: `📄 ${t('chatbot.sugBill') || 'Facture'}`, value: 'facture' },
    { label: `👤 ${t('chatbot.sugAccount') || 'Compte'}`, value: 'compte' },
    { label: `💳 ${t('chatbot.sugCard') || 'Carte'}`, value: 'carte' },
    { label: `🆘 ${t('chatbot.sugHelp') || 'Aide'}`, value: 'aide' },
  ];

  const handleSuggestion = (value) => {
    setInputText(value);
    setTimeout(() => handleSend(), 100);
  };

  // ===== RENDU D'UNE BULLE =====
  const renderMessage = (message) => {
    if (message.sender === 'system') {
      return <SystemMessage key={message.id} text={message.text} />;
    }

    const isUser = message.sender === 'user';
    const isAgent = message.sender === 'agent';

    return (
      <View
        key={message.id}
        style={[
          styles.messageWrapper,
          isUser ? styles.messageWrapperUser : styles.messageWrapperBot,
        ]}
      >
        {!isUser && (
          <View
            style={[
              styles.messageAvatarWrap,
              isAgent ? styles.messageAvatarWrapAgent : styles.messageAvatarWrapBot,
            ]}
          >
            {isAgent ? (
              <Text style={styles.messageAvatarText}>👨‍💼</Text>
            ) : (
              <Image
                source={NT_LOGO}
                style={styles.messageAvatarImage}
                resizeMode="contain"
              />
            )}
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            isUser
              ? styles.messageBubbleUser
              : isAgent
              ? styles.messageBubbleAgent
              : styles.messageBubbleBot,
          ]}
        >
          {isAgent && (
            <View style={styles.agentLabelWrapper}>
              <Text style={styles.agentLabelText}>{t('chatbot.agentLabel')}</Text>
            </View>
          )}

          <Text
            style={[
              styles.messageText,
              isUser ? styles.messageTextUser : styles.messageTextBot,
            ]}
          >
            {message.text}
          </Text>

          <Text
            style={[
              styles.messageTime,
              isUser ? styles.messageTimeUser : styles.messageTimeBot,
            ]}
          >
            {message.time}
          </Text>
        </View>
      </View>
    );
  };

  const isAgentMode = mode === 'agent';

  return (
    <View style={styles.container}>
      {/* ═══════════ HEADER PREMIUM ═══════════ */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <IconBack />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View
            style={[
              styles.botAvatar,
              isAgentMode ? styles.botAvatarAgent : styles.botAvatarBot,
            ]}
          >
            {isAgentMode ? (
              <Text style={styles.botAvatarText}>👨‍💼</Text>
            ) : (
              <Image
                source={NT_LOGO}
                style={styles.botAvatarImage}
                resizeMode="contain"
              />
            )}
            <View
              style={[
                styles.botStatusDot,
                { backgroundColor: isAgentMode ? COLORS.blue : COLORS.teal },
              ]}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {isAgentMode ? t('chatbot.agentTitle') : t('chatbot.botTitle')}
            </Text>
            <View style={styles.headerStatusRow}>
              <View
                style={[
                  styles.headerStatusDot,
                  { backgroundColor: isAgentMode ? COLORS.blue : COLORS.teal },
                ]}
              />
              <Text
                style={[
                  styles.headerStatus,
                  isAgentMode && styles.headerStatusAgent,
                ]}
              >
                {isAgentMode ? 'Conseiller en ligne' : 'Assistant en ligne'}
              </Text>
            </View>
          </View>
        </View>

        {isAgentMode ? (
          <TouchableOpacity
            style={styles.backToBotButton}
            onPress={handleBackToBot}
            activeOpacity={0.75}
          >
            <IconBotSwitch color={COLORS.primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearHistory}
            activeOpacity={0.75}
          >
            <IconTrash />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* ═══════════ ZONE MESSAGES (avec filigrane) ═══════════ */}
        <View style={styles.messagesWrapper}>
          {/* 🖼️ Filigrane NT Albey — arrière-plan */}
          <ChatWatermark />

          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={scrollToEnd}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map(renderMessage)}

            {showEscalationCard && (
              <EscalationCard
                t={t}
                onAccept={handleEscalate}
                onLater={handleDeclineEscalation}
                isLoading={isEscalating}
              />
            )}

            {isTyping && (
              <View style={styles.typingRow}>
                <View style={[styles.messageAvatarWrap, styles.messageAvatarWrapBot]}>
                  <Image
                    source={NT_LOGO}
                    style={styles.messageAvatarImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.typingBubble}>
                  <View style={styles.typingDots}>
                    <View style={[styles.typingDot, styles.typingDot1]} />
                    <View style={[styles.typingDot, styles.typingDot2]} />
                    <View style={[styles.typingDot, styles.typingDot3]} />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>

        {/* ═══════════ SUGGESTIONS RAPIDES ═══════════ */}
        {!isAgentMode && (
          <View style={styles.suggestionsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsContent}
            >
              {quickSuggestions.map((sug, index) => (
                <TouchableOpacity
                  key={`suggestion-${index}-${sug.value}`}
                  style={styles.suggestionChip}
                  onPress={() => handleSuggestion(sug.value)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.suggestionText}>{sug.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ═══════════ INPUT ═══════════ */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder={t('chatbot.placeholder')}
              placeholderTextColor={COLORS.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim()}
            activeOpacity={0.85}
          >
            <IconSend />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🎨 STYLES PREMIUM
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // ═══════════════ HEADER ═══════════════
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
    gap: 12,
    zIndex: 2,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  botAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  botAvatarBot: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.primary + '25',
  },
  botAvatarAgent: {
    backgroundColor: COLORS.blueSoft,
    borderColor: COLORS.blue + '25',
  },
  botAvatarText: { fontSize: 22 },
  botAvatarImage: {
    width: 34,
    height: 34,
  },
  botStatusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  headerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerStatus: {
    fontSize: 11,
    color: COLORS.teal,
    fontWeight: '600',
  },
  headerStatusAgent: {
    color: COLORS.blue,
  },
  backToBotButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '25',
  },
  clearButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.danger + '25',
  },

  // ═══════════════ MESSAGES WRAPPER (avec filigrane) ═══════════════
  messagesWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: COLORS.background,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },

  // ═══════════════ FILIGRANE ═══════════════
  watermarkContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    overflow: 'hidden',
  },
  watermarkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  watermarkLogo: {
    width: 42,
    height: 42,
    marginRight: 10,
    marginBottom: 10,
    opacity: 0.045,
  },

  // ═══════════════ MESSAGE WRAPPER ═══════════════
  messageWrapper: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageWrapperUser: {
    justifyContent: 'flex-end',
  },
  messageWrapperBot: {
    justifyContent: 'flex-start',
  },

  // ═══════════════ AVATAR (à côté de la bulle) ═══════════════
  messageAvatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  messageAvatarWrapBot: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.primary + '25',
  },
  messageAvatarWrapAgent: {
    backgroundColor: COLORS.blueSoft,
    borderColor: COLORS.blue + '25',
  },
  messageAvatarText: { fontSize: 16 },
  messageAvatarImage: {
    width: 24,
    height: 24,
  },

  // ═══════════════ BULLES ═══════════════
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  messageBubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 6,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  messageBubbleBot: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
    }),
  },
  messageBubbleAgent: {
    backgroundColor: COLORS.blueSoft,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.blue + '30',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.blue,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
    }),
  },

  // ═══════════════ BADGE AGENT ═══════════════
  agentLabelWrapper: {
    backgroundColor: COLORS.blue,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  agentLabelText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ═══════════════ TEXTE ═══════════════
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  messageTextUser: { color: '#FFFFFF' },
  messageTextBot: { color: COLORS.textPrimary },

  messageTime: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
    fontWeight: '500',
  },
  messageTimeUser: { color: 'rgba(255,255,255,0.7)' },
  messageTimeBot: { color: COLORS.textMuted },

  // ═══════════════ MESSAGE SYSTÈME ═══════════════
  systemMessageWrapper: {
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  systemMessageBubble: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  systemMessageText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    fontWeight: '500',
  },

  // ═══════════════ CARTE D'ESCALADE ═══════════════
  escalationCardWrapper: {
    marginVertical: 14,
    alignItems: 'center',
  },
  escalationCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: COLORS.primary + '25',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  escalationIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  escalationIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  escalationTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  escalationBadge: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  escalationSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: 16,
    fontWeight: '500',
  },
  escalationActions: {
    flexDirection: 'row',
    gap: 10,
  },
  escalationPrimaryButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: 14,
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
  escalationPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  escalationSecondaryButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  escalationSecondaryText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },

  // ═══════════════ TYPING ═══════════════
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  typingBubble: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
    }),
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.primary,
  },
  typingDot1: { opacity: 0.3 },
  typingDot2: { opacity: 0.6 },
  typingDot3: { opacity: 0.9 },

  // ═══════════════ SUGGESTIONS ═══════════════
  suggestionsWrapper: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSoft,
    zIndex: 1,
  },
  suggestionsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary + '25',
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  // ═══════════════ INPUT BAR ═══════════════
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSoft,
    gap: 8,
    zIndex: 1,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 10,
    maxHeight: 100,
    fontWeight: '500',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
  sendButtonDisabled: {
    backgroundColor: COLORS.border,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
});