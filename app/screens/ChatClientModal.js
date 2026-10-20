// screens/ChatClientModal.js - Version sans notes vocales
// ✅ DESIGN PREMIUM : moderne, épuré, professionnel
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import {
  initSocket,
  getOrCreateConversation,
  sendMessage,
  onMessageReceived,
  joinConversation,
} from '../services/chatService';
import { API } from '../services/api';

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

// ===== ICÔNES SVG =====
const IconClose = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={COLORS.textPrimary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconSend = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path d="M22 2L11 13" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconCheck = ({ read }) => (
  <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <Path
      d={read ? 'M20 6L9 17l-5-5' : 'M20 10L9 21l-5-5'}
      stroke={read ? COLORS.teal : COLORS.textMuted}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {read && (
      <Path
        d="M20 6L9 17l-5-5"
        stroke={COLORS.teal}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(2, -1)"
      />
    )}
  </Svg>
);

const IconSparkle = () => (
  <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <Path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2z" fill="#FFD700" />
  </Svg>
);

// ═══════════════════════════════════════════════════════════════
// 💬 COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════
const ChatClientModal = ({ visible, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef();

  const [clientPhone, setClientPhone] = useState('');
  const [clientName, setClientName] = useState('Client');
  const [conversationId, setConversationId] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await API.getCurrentUser();
        if (user) {
          setClientPhone(user.phone || '');
          setClientName(user.name || 'Client');
        } else {
          setClientPhone('83 35 62 00');
          setClientName('Moussa Ibrahim');
        }
      } catch (error) {
        console.error('Erreur chargement utilisateur:', error);
        setClientPhone('83 35 62 00');
        setClientName('Moussa Ibrahim');
      }
    };
    if (visible) {
      loadUser();
    }
  }, [visible]);

  useEffect(() => {
    if (visible && clientPhone) {
      loadMessages();
      const s = initSocket(clientPhone);
      onMessageReceived((newMsg) => {
        setMessages((prev) => [...prev, newMsg]);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      });
      return () => {
        if (s) s.disconnect();
      };
    }
  }, [visible, clientPhone]);

  const loadMessages = async () => {
    if (!clientPhone) return;
    setIsLoading(true);
    try {
      const conv = await getOrCreateConversation(clientPhone, clientName);
      setConversationId(conv.id);
      setMessages(conv.messages || []);
      joinConversation(conv.id);
    } catch (error) {
      console.error('Erreur chargement messages:', error);
      Alert.alert(
        'Erreur',
        'Impossible de charger la conversation. Vérifiez votre connexion.'
      );
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    if (!clientPhone || !conversationId) {
      Alert.alert(
        'Erreur',
        'La conversation n\'est pas encore prête. Veuillez patienter.'
      );
      return;
    }

    const text = inputText.trim();
    setInputText('');

    try {
      await sendMessage(conversationId, text, [], clientName);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error('Erreur envoi:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message. Réessayez.');
    }
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // ===== Initiale du client pour l'avatar =====
  const clientInitial = (clientName || 'C').charAt(0).toUpperCase();

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* ═══════════ HEADER PREMIUM ═══════════ */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <IconClose />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.headerAvatarWrap}>
              <Text style={styles.headerAvatarText}>{clientInitial}</Text>
              <View style={styles.headerStatusDot} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {clientName}
              </Text>
              <View style={styles.headerStatusRow}>
                <View style={styles.headerStatusDotSmall} />
                <Text style={styles.headerStatusText}>En ligne</Text>
              </View>
            </View>
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* ═══════════ MESSAGES ═══════════ */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Chargement des messages…</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Text style={styles.emptyEmoji}>💬</Text>
              </View>
              <Text style={styles.emptyTitle}>Aucun message</Text>
              <Text style={styles.emptyText}>
                Envoyez votre premier message pour démarrer la conversation.
              </Text>
            </View>
          ) : (
            messages.map((msg, index) => {
              const isClient = msg.from === 'client';
              return (
                <View
                  key={msg.id || index}
                  style={[
                    styles.messageWrapper,
                    isClient ? styles.messageWrapperClient : styles.messageWrapperSupport,
                  ]}
                >
                  {!isClient && (
                    <View style={styles.supportAvatar}>
                      <Text style={styles.supportAvatarText}>👨‍💼</Text>
                    </View>
                  )}

                  <View
                    style={[
                      styles.messageBubble,
                      isClient ? styles.messageBubbleClient : styles.messageBubbleSupport,
                    ]}
                  >
                    {msg.content !== '' && (
                      <Text
                        style={[
                          styles.messageText,
                          isClient ? styles.messageTextClient : styles.messageTextSupport,
                        ]}
                      >
                        {msg.content}
                      </Text>
                    )}
                    <View style={styles.messageFooter}>
                      <Text
                        style={[
                          styles.messageTime,
                          isClient ? styles.messageTimeClient : styles.messageTimeSupport,
                        ]}
                      >
                        {formatTime(msg.timestamp)}
                      </Text>
                      {isClient && <IconCheck read={msg.isRead} />}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* ═══════════ INPUT BAR PREMIUM ═══════════ */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputRow}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Écrivez votre message…"
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
              onPress={handleSendMessage}
              disabled={!inputText.trim()}
              activeOpacity={0.85}
            >
              <IconSend />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🎨 STYLES PREMIUM
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ═══════════════ HEADER ═══════════════
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
    gap: 12,
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
  closeButton: {
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
  headerAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  headerAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerStatusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.teal,
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
    marginTop: 3,
  },
  headerStatusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.teal,
  },
  headerStatusText: {
    fontSize: 11,
    color: COLORS.teal,
    fontWeight: '600',
  },

  // ═══════════════ MESSAGES CONTAINER ═══════════════
  messagesContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },

  // ═══════════════ LOADING ═══════════════
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // ═══════════════ EMPTY STATE ═══════════════
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  emptyEmoji: {
    fontSize: 44,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    fontWeight: '500',
  },

  // ═══════════════ MESSAGE WRAPPER ═══════════════
  messageWrapper: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageWrapperClient: {
    justifyContent: 'flex-end',
  },
  messageWrapperSupport: {
    justifyContent: 'flex-start',
  },

  // ═══════════════ AVATAR SUPPORT ═══════════════
  supportAvatar: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: COLORS.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.blue + '25',
  },
  supportAvatarText: {
    fontSize: 16,
  },

  // ═══════════════ BULLES ═══════════════
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  messageBubbleClient: {
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
  messageBubbleSupport: {
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

  // ═══════════════ TEXTE ═══════════════
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  messageTextClient: {
    color: '#FFFFFF',
  },
  messageTextSupport: {
    color: COLORS.textPrimary,
  },

  // ═══════════════ FOOTER (heure + check) ═══════════════
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 10,
    fontWeight: '500',
  },
  messageTimeClient: {
    color: 'rgba(255,255,255,0.7)',
  },
  messageTimeSupport: {
    color: COLORS.textMuted,
  },

  // ═══════════════ INPUT BAR ═══════════════
  inputWrapper: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputContainer: {
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

export default ChatClientModal;