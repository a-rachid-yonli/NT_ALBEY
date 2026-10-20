// services/chatService.js
// 🔐 SÉCURITÉ : toutes les requêtes sont désormais authentifiées
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import io from 'socket.io-client';
import { API_URL } from '../config';

// ===== SOCKET =====
let socket = null;
let currentConvId = null;
let messageListenerAttached = false;

// ✅ Lire le token depuis SecureStore
const getAuthToken = async () => {
  try {
    return await SecureStore.getItemAsync('ntalbey_access_token', {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch (_) {
    return null;
  }
};

// ✅ Helper : headers authentifiés
const authHeaders = async (extra = {}) => {
  const token = await getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
};

// Initialiser la connexion Socket.IO
export const initSocket = (clientPhone) => {
  if (socket && socket.connected) {
    console.log('ℹ️ Socket déjà connectée, réutilisation');
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = io(API_URL, {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
    transports: ['websocket', 'polling'],
    timeout: 10000,
    // ✅ Envoi du token au serveur (le backend doit le vérifier)
    auth: async (cb) => {
      const token = await getAuthToken();
      cb({ token });
    },
  });

  socket.on('connect', () => {
    console.log('✅ Socket connecté :', socket.id);
    if (currentConvId !== null) {
      socket.emit('join-conversation', currentConvId);
      console.log(`📥 Rejoint la salle conv-${currentConvId} (après connexion)`);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket déconnecté, raison:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Erreur de connexion socket:', error.message);
  });

  return socket;
};

export const joinConversation = (convId) => {
  currentConvId = convId;
  if (socket && socket.connected) {
    socket.emit('join-conversation', convId);
    console.log(`📥 Rejoint la salle conv-${convId}`);
  } else {
    console.log(`⏳ En attente de connexion pour rejoindre conv-${convId}`);
  }
};

export const leaveConversation = (convId) => {
  if (socket && socket.connected) {
    socket.emit('leave-conversation', convId);
    console.log(`📤 Quitté la salle conv-${convId}`);
  }
  if (currentConvId === convId) {
    currentConvId = null;
  }
};

export const onMessageReceived = (callback) => {
  if (!socket) {
    console.warn('⚠️ onMessageReceived appelé sans socket initialisée');
    return;
  }
  socket.off('message-received');
  socket.on('message-received', callback);
  messageListenerAttached = true;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  currentConvId = null;
  messageListenerAttached = false;
};

// ===== API (authentifiées) =====

export const getOrCreateConversation = async (clientPhone, clientName = 'Client') => {
  try {
    // ✅ Auth obligatoire
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/api/conversations`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const conversations = await res.json();

    let conv = conversations.find((c) => c.clientPhone === clientPhone);

    if (!conv) {
      const createRes = await fetch(`${API_URL}/api/conversations`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          clientName: clientName,
          clientPhone: clientPhone,
          subject: 'Nouvelle conversation',
          initialMessage: '',
        }),
      });
      if (!createRes.ok) throw new Error(`HTTP ${createRes.status}`);
      conv = await createRes.json();
    }

    return conv;
  } catch (error) {
    console.error('Erreur getOrCreateConversation:', error);
    throw error;
  }
};

export const sendMessage = async (
  conversationId,
  text,
  attachments = [],
  senderName = 'Client'
) => {
  try {
    const msgData = {
      content: text,
      from: 'client',
      senderName: senderName,
      attachments: attachments,
    };

    const res = await fetch(`${API_URL}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(msgData),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const newMessage = await res.json();
    return newMessage;
  } catch (error) {
    console.error('Erreur sendMessage:', error);
    throw error;
  }
};

export const getConversationDetail = async (conversationId) => {
  try {
    const res = await fetch(`${API_URL}/api/conversations/${conversationId}`, {
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error('Conversation introuvable');
    return await res.json();
  } catch (error) {
    console.error('Erreur getConversationDetail:', error);
    throw error;
  }
};

export const markAsRead = async (conversationId) => {
  console.log(`📖 Marquer comme lu : conversation ${conversationId}`);
  return true;
};

// =============================================================
// 🆕 CONSTRUCTION DU CONTEXTE D'ESCALADE (v3 - ULTRA-AÉRÉ)
// =============================================================
export const buildContextMessage = (messages, clientName = 'Client', clientPhone = '') => {
  const SEP  = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  const SEP2 = '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';
  const parts = [];

  parts.push(SEP);
  parts.push('📋  CONTEXTE DE CONVERSATION TRANSFÉRÉE');
  parts.push(SEP);
  parts.push('');
  parts.push(`👤  Client        :   ${clientName}`);
  if (clientPhone) parts.push(`📞  Téléphone     :   ${clientPhone}`);
  parts.push(`📅  Date          :   ${new Date().toLocaleString('fr-FR')}`);
  parts.push(`💬  Messages      :   ${messages.length} échangés avec le bot`);
  parts.push('');
  parts.push('');
  parts.push('');

  parts.push(SEP);
  parts.push('📜  HISTORIQUE COMPLET DE LA CONVERSATION');
  parts.push(SEP);
  parts.push('');
  parts.push('');

  let msgIndex = 0;
  (messages || []).forEach((msg) => {
    if (!msg || msg.sender === 'system') return;
    msgIndex++;

    let icon = '•';
    let role = 'Système';
    if (msg.sender === 'user')       { icon = '👤';  role = clientName; }
    else if (msg.sender === 'bot')   { icon = '🤖';  role = 'Assistant'; }
    else if (msg.sender === 'agent') { icon = '👨‍💼'; role = 'Conseiller'; }

    const time = msg.time ? `   ·   ${msg.time}` : '';
    const text = (msg.text || '(vide)').trim();

    const indentedText = text
      .split('\n')
      .map((line) => '       ' + line)
      .join('\n');

    parts.push(`▶  ${icon}  ${role}${time}`);
    parts.push(indentedText);
    parts.push('');
    parts.push('');
    parts.push('');
  });

  parts.push(SEP);
  parts.push('🎯  DEMANDE DU CLIENT');
  parts.push(SEP);
  parts.push('');
  parts.push('');
  parts.push('Le client souhaite maintenant parler à un conseiller humain.');
  parts.push('');
  parts.push('👉  Merci de prendre le relais dès que possible.  🙏');
  parts.push('');
  parts.push('');
  parts.push(SEP2);

  return parts.join('\n');
};

// =============================================================
// UTILITAIRES
// =============================================================

export const getCurrentUser = async () => {
  try {
    const json = await AsyncStorage.getItem('@ntalbey_user');
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
};