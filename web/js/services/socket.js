// web/js/services/socket.js
// ============================================================
// SERVICE SOCKET.IO — Version 4 rôles
// ============================================================
//
// Fonctionnalités :
//   - Connexion unique et réutilisable
//   - Authentification automatique (event `authenticate`) avec userId/role/name
//   - Rooms conversations : join/leave
//   - Rooms tickets : join/leave (liste + fil)
//   - Listeners avec anti-doublons "owned" (remplace uniquement notre callback)
//   - Ré-authentification automatique après reconnexion
//
// ⚠️ Ce service ne fait AUCUNE modification du DOM.
//    Il fournit uniquement des callbacks aux modules qui l'utilisent.
// ============================================================

import { API_URL } from '../config.js';
import { state } from './state.js';

// ============================================================
// ÉTAT INTERNE
// ============================================================
let socket = null;

// Conversation en cours (utile si la socket n'est pas encore connectée)
let pendingConversationId = null;

// Ticket en cours (même logique pour le fil de suivi)
let pendingTicketId = null;

// Flag pour savoir si on a déjà envoyé `authenticate` sur cette socket
let isAuthenticated = false;

// ✅ NOUVEAU : trace des listeners installés PAR CE MODULE.
// Permet de remplacer uniquement notre ancien callback sans écraser
// les listeners externes (ex : app.js qui écoute les mêmes events
// pour les notifications globales).
const ownedListeners = new Map(); // event -> callback installé par ce module

// ============================================================
// HELPERS INTERNES
// ============================================================
function getUserPayload() {
  const user = state.getUser();
  if (!user) return null;
  return {
    userId: user.id,
    role: user.role,
    name: user.name,
  };
}

/**
 * Envoie l'événement `authenticate` au serveur.
 * Sans ça, le serveur ne pourra pas router les events `role-*` ni `user-*`.
 */
function authenticateSocket() {
  if (!socket || !socket.connected) return;

  const payload = getUserPayload();
  if (!payload) {
    console.warn('⚠️ authenticateSocket : aucun utilisateur connecté');
    return;
  }

  socket.emit('authenticate', payload);
  isAuthenticated = true;
  console.log(`🔐 Socket authentifiée : user-${payload.userId} (${payload.role})`);

  // Rejoindre les rooms en attente
  if (pendingConversationId !== null) {
    socket.emit('join-conversation', pendingConversationId);
    console.log(`📥 Rejoint conv-${pendingConversationId} (après auth)`);
  }
  if (pendingTicketId !== null) {
    socket.emit('join-ticket', pendingTicketId);
    console.log(`📥 Rejoint ticket-${pendingTicketId} (après auth)`);
  }
}

// ============================================================
// INITIALISATION
// ============================================================

/**
 * Initialise (ou réutilise) la connexion Socket.IO.
 * - Réutilise la socket existante si elle est déjà connectée.
 * - Nettoie proprement l'ancienne avant d'en créer une nouvelle.
 * - Laisse Socket.IO gérer la reconnexion automatiquement.
 */
export const initSocket = () => {
  // ✅ Réutiliser si déjà connectée
  if (socket && socket.connected) {
    if (!isAuthenticated) authenticateSocket();
    return socket;
  }

  // Nettoyer proprement l'ancienne socket
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    isAuthenticated = false;
    ownedListeners.clear();
  }

  // Créer la connexion
  socket = io(API_URL, {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
    forceNew: true,
    transports: ['websocket', 'polling'],
    timeout: 10000,
  });

  // -------- Connexion établie --------
  socket.on('connect', () => {
    console.log('✅ Socket connectée :', socket.id);
    authenticateSocket();
  });

  // -------- Reconnexion --------
  socket.io.on('reconnect', () => {
    console.log('🔄 Socket reconnectée — ré-authentification');
    isAuthenticated = false;
    authenticateSocket();
  });

  // -------- Déconnexion --------
  socket.on('disconnect', (reason) => {
    console.warn('❌ Socket déconnectée :', reason);
    isAuthenticated = false;
  });

  // -------- Erreur de connexion --------
  socket.on('connect_error', (err) => {
    console.error('❌ Erreur de connexion Socket.IO :', err.message);
  });

  return socket;
};

// ============================================================
// ACCESSEUR
// ============================================================

/**
 * Retourne la socket courante (peut être null).
 */
export const getSocket = () => socket;

/**
 * Indique si la socket est actuellement authentifiée.
 */
export const isSocketAuthenticated = () => isAuthenticated && socket?.connected;

// ============================================================
// CONVERSATIONS — JOIN / LEAVE
// ============================================================

/**
 * Rejoint une conversation.
 * Si la socket n'est pas encore connectée, on mémorise l'ID
 * pour la rejoindre dès que possible.
 */
export const joinConversation = (convId) => {
  pendingConversationId = convId;

  if (socket && socket.connected && isAuthenticated) {
    socket.emit('join-conversation', convId);
    console.log(`📥 Rejoint conv-${convId}`);
  } else {
    console.log(`⏳ En attente de connexion pour rejoindre conv-${convId}`);
  }
};

/**
 * Quitte une conversation.
 */
export const leaveConversation = (convId) => {
  if (socket && socket.connected) {
    socket.emit('leave-conversation', convId);
  }
  if (pendingConversationId === convId) {
    pendingConversationId = null;
  }
};

// ============================================================
// TICKETS — JOIN / LEAVE
// ============================================================

/**
 * Rejoint la liste globale des tickets.
 * À utiliser dans la page tickets (liste).
 */
export const joinTickets = () => {
  if (socket && socket.connected && isAuthenticated) {
    socket.emit('join-tickets');
    console.log('📥 Rejoint tickets-room');
  } else {
    console.log('⏳ En attente de connexion pour rejoindre tickets-room');
  }
};

/**
 * Quitte la liste globale des tickets.
 */
export const leaveTickets = () => {
  if (socket && socket.connected) {
    socket.emit('leave-tickets');
  }
};

/**
 * Rejoint le fil d'un ticket précis (pour voir les commentaires en direct).
 */
export const joinTicket = (ticketId) => {
  pendingTicketId = ticketId;

  if (socket && socket.connected && isAuthenticated) {
    socket.emit('join-ticket', ticketId);
    console.log(`📥 Rejoint ticket-${ticketId}`);
  } else {
    console.log(`⏳ En attente de connexion pour rejoindre ticket-${ticketId}`);
  }
};

/**
 * Quitte le fil d'un ticket précis.
 */
export const leaveTicket = (ticketId) => {
  if (socket && socket.connected) {
    socket.emit('leave-ticket', ticketId);
  }
  if (pendingTicketId === ticketId) {
    pendingTicketId = null;
  }
};

// ============================================================
// LISTENERS — pattern "owned" (remplace uniquement notre callback)
// ============================================================
// ✅ NOUVEAU : chaque fonction `onXxx` remplace UNIQUEMENT le callback
// qu'ELLE a précédemment installé (via socket.off(event, callback)),
// sans toucher aux listeners externes installés directement via
// socket.on() par d'autres modules (ex : app.js pour les notifications).
//
// Avant : socket.off('message-received') → écrasait TOUS les listeners.
// Après : on ne retire QUE notre ancien callback.
// ============================================================

function installOwnedListener(event, callback) {
  if (!socket) {
    console.warn(`⚠️ installOwnedListener(${event}) : socket non initialisée`);
    return;
  }
  const prev = ownedListeners.get(event);
  if (prev) socket.off(event, prev);   // retire uniquement notre ancien listener
  socket.on(event, callback);
  ownedListeners.set(event, callback);
}

/**
 * Écoute les nouveaux messages d'une conversation.
 */
export const onMessageReceived = (callback) => {
  installOwnedListener('message-received', callback);
};

/**
 * Écoute les mises à jour de conversation (badge, nouvelle liste).
 */
export const onConversationUpdated = (callback) => {
  installOwnedListener('conversation-updated', callback);
};

/**
 * Écoute la création d'un nouveau ticket.
 */
export const onTicketCreated = (callback) => {
  installOwnedListener('ticket-created', callback);
};

/**
 * Écoute les mises à jour d'un ticket (statut, priorité, assignation...).
 */
export const onTicketUpdated = (callback) => {
  installOwnedListener('ticket-updated', callback);
};

/**
 * Écoute les assignations de tickets à l'utilisateur courant.
 * (Event envoyé uniquement à la room user-<id>)
 */
export const onTicketAssigned = (callback) => {
  installOwnedListener('ticket-assigned', callback);
};

/**
 * Écoute les nouveaux commentaires ajoutés sur un ticket.
 */
export const onTicketCommented = (callback) => {
  installOwnedListener('ticket-commented', callback);
};

// ============================================================
// NETTOYAGE COMPLET
// ============================================================

/**
 * Déconnexion complète (à utiliser au logout ou changement d'utilisateur).
 * Réinitialise TOUTES les variables d'état.
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  ownedListeners.clear();          // ✅ NOUVEAU
  pendingConversationId = null;
  pendingTicketId = null;
  isAuthenticated = false;
};

/**
 * Retire un listener précis (utile si un module veut se désabonner).
 */
export const offEvent = (eventName) => {
  if (socket && eventName) {
    socket.off(eventName);
  }
};

/**
 * Retire TOUS les listeners d'un événement donné.
 */
export const offAll = () => {
  if (socket) {
    socket.removeAllListeners();
  }
  ownedListeners.clear();
};