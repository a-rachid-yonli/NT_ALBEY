// server/socket/index.js
// ============================================================
// SOCKET.IO — Serveur temps réel NT Albey
// ============================================================
//
// Ce module expose :
//   - module.exports(io)         → branche tous les handlers
//   - module.exports.getIO()      → retourne l'instance io (pour les routes Express)
//   - module.exports.emitToUser() → émet un événement à un utilisateur précis
//   - module.exports.emitToRole() → émet un événement à tous les utilisateurs d'un rôle
//
// Rooms utilisées :
//   - conv-<id>           : pour une conversation précise
//   - ticket-<id>         : pour un ticket précis (fil de suivi en direct)
//   - tickets-room        : pour la liste globale des tickets (chefs / super_admin)
//   - role-super_admin    : tous les super admins connectés
//   - role-chef           : tous les chefs connectés
//   - role-agent          : tous les opérateurs connectés
//   - role-admin_systeme  : tous les admins système connectés
//   - user-<id>           : un utilisateur précis (notifications personnelles)
// ============================================================

// ============================================================
// ÉTAT INTERNE
// ============================================================
let ioInstance = null;

// Mapping socketId → { userId, role, name } pour tracer les connexions
const connectedSockets = new Map();

// ============================================================
// HELPERS D'ÉMISSION (exposés aux routes Express)
// ============================================================

/**
 * Émet un événement à un utilisateur précis (peu importe sa socket).
 * @param {number|string} userId
 * @param {string} event
 * @param {any} payload
 */
function emitToUser(userId, event, payload) {
  if (!ioInstance) {
    console.warn('⚠️ emitToUser : io non initialisé');
    return false;
  }
  if (userId === undefined || userId === null) {
    console.warn('⚠️ emitToUser : userId manquant');
    return false;
  }
  ioInstance.to(`user-${userId}`).emit(event, payload);
  console.log(`📤 [user-${userId}] ${event}`);
  return true;
}

/**
 * Émet un événement à tous les utilisateurs d'un rôle.
 * @param {string} role  'super_admin' | 'chef' | 'agent' | 'admin_systeme'
 * @param {string} event
 * @param {any} payload
 */
function emitToRole(role, event, payload) {
  if (!ioInstance) {
    console.warn('⚠️ emitToRole : io non initialisé');
    return false;
  }
  if (!role) {
    console.warn('⚠️ emitToRole : role manquant');
    return false;
  }
  ioInstance.to(`role-${role}`).emit(event, payload);
  console.log(`📤 [role-${role}] ${event}`);
  return true;
}

/**
 * Émet un événement à plusieurs rôles à la fois.
 * @param {string[]} roles
 * @param {string} event
 * @param {any} payload
 */
function emitToRoles(roles, event, payload) {
  if (!Array.isArray(roles)) return false;
  roles.forEach(role => emitToRole(role, event, payload));
  return true;
}

// ============================================================
// MODULE PRINCIPAL
// ============================================================
module.exports = (io) => {
  ioInstance = io;

  // ------------------------------------------------------------
  // CONNEXION
  // ------------------------------------------------------------
  io.on('connection', (socket) => {
    console.log('🔌 Nouveau client connecté :', socket.id);

    // ========================================================
    // 1. AUTHENTIFICATION SOCKET (identifie l'utilisateur)
    // ========================================================
    // Le client envoie ses infos après la connexion :
    //   socket.emit('authenticate', { userId, role, name })
    // On stocke ça et on rejoint automatiquement les rooms par rôle/user.
    socket.on('authenticate', (data) => {
      try {
        if (!data || !data.userId) {
          console.warn(`⚠️ authenticate sans userId (${socket.id})`);
          return;
        }

        const { userId, role, name } = data;

        // Mémoriser
        connectedSockets.set(socket.id, { userId, role, name });

        // Rejoindre les rooms automatiques
        socket.join(`user-${userId}`);
        if (role) socket.join(`role-${role}`);

        console.log(`✅ Socket ${socket.id} authentifiée : user-${userId} (${role})`);
      } catch (err) {
        console.error(`❌ Erreur authenticate (${socket.id}) :`, err.message);
      }
    });

    // ========================================================
    // 2. CONVERSATIONS (inchangé)
    // ========================================================

    // Rejoindre une conversation
    socket.on('join-conversation', (convId) => {
      if (convId === undefined || convId === null) {
        console.warn(`⚠️ join-conversation sans convId (${socket.id})`);
        return;
      }
      const room = `conv-${convId}`;
      socket.join(room);
      console.log(`📥 ${socket.id} → conv-${convId}`);
    });

    // Quitter une conversation
    socket.on('leave-conversation', (convId) => {
      if (convId === undefined || convId === null) {
        console.warn(`⚠️ leave-conversation sans convId (${socket.id})`);
        return;
      }
      const room = `conv-${convId}`;
      socket.leave(room);
      console.log(`📤 ${socket.id} ← conv-${convId}`);
    });

    // Nouveau message émis directement par un client socket
    // (le mobile par ex. — côté web, c'est la route Express qui émet)
    socket.on('new-message', (data) => {
      if (!data || data.conversationId === undefined || data.conversationId === null) {
        console.warn(`⚠️ new-message sans conversationId (${socket.id})`);
        return;
      }
      console.log(`💬 Nouveau message dans conv-${data.conversationId}`);

      io.to(`conv-${data.conversationId}`).emit('message-received', data.message);

      // Notifier les opérateurs d'un nouveau message client
      // (utile pour faire clignoter le badge de la sidebar)
      if (data.message && data.message.from === 'client') {
        emitToRoles(
          ['super_admin', 'chef', 'agent'],
          'conversation-updated',
          { conversationId: data.conversationId, lastMessage: data.message }
        );
      }
    });

    // ========================================================
    // 3. TICKETS (NOUVEAU)
    // ========================================================

    // Rejoindre la liste globale des tickets
    // (utilisé par les pages qui affichent la liste)
    socket.on('join-tickets', () => {
      socket.join('tickets-room');
      console.log(`📥 ${socket.id} → tickets-room`);
    });

    socket.on('leave-tickets', () => {
      socket.leave('tickets-room');
      console.log(`📤 ${socket.id} ← tickets-room`);
    });

    // Rejoindre le fil d'un ticket précis (pour voir les commentaires en direct)
    socket.on('join-ticket', (ticketId) => {
      if (ticketId === undefined || ticketId === null) {
        console.warn(`⚠️ join-ticket sans ticketId (${socket.id})`);
        return;
      }
      const room = `ticket-${ticketId}`;
      socket.join(room);
      console.log(`📥 ${socket.id} → ticket-${ticketId}`);
    });

    socket.on('leave-ticket', (ticketId) => {
      if (ticketId === undefined || ticketId === null) return;
      const room = `ticket-${ticketId}`;
      socket.leave(room);
      console.log(`📤 ${socket.id} ← ticket-${ticketId}`);
    });

    // Émission manuelle d'un nouveau ticket (généralement fait
    // par la route Express POST /api/tickets, mais on garde ce handler
    // pour les clients socket directs)
    socket.on('new-ticket', (ticket) => {
      if (!ticket || !ticket.id) {
        console.warn(`⚠️ new-ticket sans id (${socket.id})`);
        return;
      }
      console.log(`🎫 Nouveau ticket #${ticket.id}`);
      io.to('tickets-room').emit('ticket-created', ticket);

      // Notifier l'admin système s'il est assigné
      if (ticket.assignedTo) {
        emitToUser(ticket.assignedTo, 'ticket-assigned', ticket);
      }
    });

    // ========================================================
    // 4. DÉCONNEXION
    // ========================================================
    socket.on('disconnect', (reason) => {
      const info = connectedSockets.get(socket.id);
      if (info) {
        console.log(`🔌 Déconnexion : ${socket.id} (user-${info.userId}, ${info.role}) — ${reason}`);
        connectedSockets.delete(socket.id);
      } else {
        console.log(`🔌 Déconnexion : ${socket.id} — ${reason}`);
      }
    });

    // ========================================================
    // 5. ERREURS
    // ========================================================
    socket.on('error', (error) => {
      console.error(`❌ Erreur socket ${socket.id} :`, error?.message || error);
    });
  });
};

// ============================================================
// EXPORTS POUR LES ROUTES EXPRESS
// ============================================================
module.exports.getIO = () => ioInstance;
module.exports.emitToUser = emitToUser;
module.exports.emitToRole = emitToRole;
module.exports.emitToRoles = emitToRoles;