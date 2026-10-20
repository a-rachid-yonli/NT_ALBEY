// web/js/services/api.js
// API hybride :
//  - Appels RÉELS vers le serveur pour : auth, conversations, tickets, users, audit, notifications
//  - Données SIMULÉES pour : stats, activité, clients, paramètres

import { API_URL } from '../config.js';

// ============================================================
// HELPERS
// ============================================================
function delay(ms = 400) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
}

function authHeaders() {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ============================================================
// RÔLES VALIDES
// ============================================================
export const VALID_ROLES = ['super_admin', 'chef', 'agent', 'admin_systeme'];

// ============================================================
// API PUBLIQUE
// ============================================================
export const API = {
  // ============================================================
  // 1. AUTHENTIFICATION
  // ============================================================
  async login(email, password) {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Identifiants incorrects');
    }
    const data = await response.json();
    localStorage.setItem('token', data.token);
    return data.user;
  },

  async logout() {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: authHeaders()
      });
    } catch { /* ignore */ }
  },

  // ============================================================
  // 2. CONVERSATIONS
  // ============================================================
  async getConversations() {
    const response = await fetch(`${API_URL}/api/conversations`);
    if (!response.ok) throw new Error('Erreur chargement conversations');
    return response.json();
  },

  async getConversation(id) {
    const response = await fetch(`${API_URL}/api/conversations/${id}`);
    if (!response.ok) throw new Error('Conversation introuvable');
    return response.json();
  },

  async createConversation(data) {
    const response = await fetch(`${API_URL}/api/conversations`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        clientName: data.client,
        clientPhone: data.email || 'client@exemple.com',
        subject: data.subject || 'Nouvelle conversation',
        initialMessage: data.content || ''
      })
    });
    if (!response.ok) throw new Error('Erreur création conversation');
    return response.json();
  },

  async sendMessage(conversationId, content, sender, attachments = []) {
    const response = await fetch(`${API_URL}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        content,
        from: 'agent',
        senderName: sender.name || 'Agent',
        attachments
      })
    });
    if (!response.ok) throw new Error('Erreur envoi message');
    return response.json();
  },

  async updateConversationStatus(id, status) {
    const response = await fetch(`${API_URL}/api/conversations/${id}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status })
    });
    if (!response.ok) throw new Error('Erreur mise à jour statut');
    return response.json();
  },

  async archiveConversation(id) { return this.toggleArchive(id, true); },
  async unarchiveConversation(id) { return this.toggleArchive(id, false); },
  async toggleArchive(id, archived) {
    const response = await fetch(`${API_URL}/api/conversations/${id}/archive`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ archived })
    });
    if (!response.ok) throw new Error('Erreur archivage');
    return response.json();
  },

  async deleteConversation(id) {
    const response = await fetch(`${API_URL}/api/conversations/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!response.ok) throw new Error('Erreur suppression');
    return response.json();
  },

  // ============================================================
  // 3. STATISTIQUES
  // ============================================================
  async getStats() {
    const conversations = await this.getConversations();
    const total = conversations.length;
    const unread = conversations.reduce((acc, c) => {
      const last = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
      return acc + (last && last.from === 'client' && !last.isRead ? 1 : 0);
    }, 0);
    return {
      totalMessages: total,
      todayMessages: 0,
      avgResponseTime: '1h 12min',
      avgRating: 4.7,
      totalRatings: 89
    };
  },

  async getConversationStats() {
    const conversations = await this.getConversations();
    const total = conversations.length;
    const nonLus = conversations.filter(c => {
      const last = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
      return last && last.from === 'client' && !last.isRead;
    }).length;
    const lus = total - nonLus;
    const archives = conversations.filter(c => c.archived).length;
    return { total, nonLus, lus, archives };
  },

  async getMessageStats() {
    const conversations = await this.getConversations();
    return {
      total: conversations.length,
      unread: conversations.filter(c => {
        const last = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
        return last && last.from === 'client' && !last.isRead;
      }).length,
      open: conversations.filter(c => c.status === 'open').length,
      pending: conversations.filter(c => c.status === 'pending').length,
      closed: conversations.filter(c => c.status === 'closed').length,
      archived: conversations.filter(c => c.archived).length,
    };
  },

  // ============================================================
  // 4. GESTION DES UTILISATEURS
  // ============================================================
  async getAgents() {
    const response = await fetch(`${API_URL}/api/users`, {
      headers: authHeaders()
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Erreur chargement utilisateurs');
    }
    return response.json();
  },

  async getAgent(id) {
    const response = await fetch(`${API_URL}/api/users/${id}`, {
      headers: authHeaders()
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Utilisateur introuvable');
    }
    return response.json();
  },

  async getUsersByRole(role) {
    const users = await this.getAgents();
    if (!role || role === 'all') return users;
    return users.filter(u => u.role === role);
  },

  async getPublicUsers() {
    const response = await fetch(`${API_URL}/api/users/list`, {
      headers: authHeaders()
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Erreur chargement liste utilisateurs');
    }
    return response.json();
  },

  async createAgent(data) {
    if (!data?.name || !data?.email || !data?.role) {
      throw new Error('Champs requis manquants (name, email, role)');
    }
    const response = await fetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Erreur création utilisateur');
    }
    return response.json();
  },

  async updateAgent(id, data) {
    const response = await fetch(`${API_URL}/api/users/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Erreur mise à jour utilisateur');
    }
    return response.json();
  },

  async toggleAgent(id) {
    const response = await fetch(`${API_URL}/api/users/${id}/status`, {
      method: 'PATCH',
      headers: authHeaders()
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Erreur changement statut');
    }
    return response.json();
  },

  async resetPassword(id, newPassword) {
    const response = await fetch(`${API_URL}/api/users/${id}/reset-password`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ newPassword })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Erreur réinitialisation mot de passe');
    }
    return response.json();
  },

  async deleteAgent(id) {
    const response = await fetch(`${API_URL}/api/users/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Erreur suppression utilisateur');
    }
    return response.json();
  },

  // ============================================================
  // 5. TICKETS
  // ============================================================
  async getTickets() {
    const response = await fetch(`${API_URL}/api/tickets`, {
      headers: authHeaders()
    });
    if (!response.ok) throw new Error('Erreur chargement tickets');
    return response.json();
  },

  async getTicket(id) {
    const response = await fetch(`${API_URL}/api/tickets/${id}`, {
      headers: authHeaders()
    });
    if (!response.ok) throw new Error('Ticket introuvable');
    return response.json();
  },

  async createTicket(data) {
    const response = await fetch(`${API_URL}/api/tickets`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Erreur création ticket');
    }
    return response.json();
  },

  async updateTicket(id, data) {
    const response = await fetch(`${API_URL}/api/tickets/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Erreur mise à jour ticket');
    }
    return response.json();
  },

  async deleteTicket(id) {
    const response = await fetch(`${API_URL}/api/tickets/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!response.ok) throw new Error('Erreur suppression ticket');
    return response.json();
  },

  async addTicketComment(ticketId, comment) {
    const response = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(comment)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Erreur ajout commentaire');
    }
    return response.json();
  },

  async getTicketsForUser(user) {
    if (!user) return [];
    return this.getTickets();
  },

  // ============================================================
  // 6. ACTIVITÉ RÉCENTE (simulée)
  // ============================================================
  async getRecentActivity() {
    await delay(300);
    return [
      { id: 1, text: 'Ali Mainassara a envoyé un nouveau message', time: 'Il y a 2 min', icon: 'fa-envelope', color: '#f57c00' },
      { id: 2, text: 'Amina Barkiré a rejoint la conversation #456', time: 'Il y a 8 min', icon: 'fa-user-plus', color: '#2e7d32' },
      { id: 3, text: 'Ticket #789 résolu par Oumarou Mamane', time: 'Il y a 15 min', icon: 'fa-check-circle', color: '#4caf50' },
      { id: 4, text: "Temps d'attente dépassé pour Hadiara Soumana", time: 'Il y a 25 min', icon: 'fa-clock', color: '#ff9800' },
      { id: 5, text: 'Nouvel avis 5⭐ de Bachir Sani', time: 'Il y a 42 min', icon: 'fa-star', color: '#ff9800' },
      { id: 6, text: 'Mahamadou Sani est maintenant en ligne', time: 'Il y a 1h', icon: 'fa-users', color: '#2e7d32' },
    ];
  },

  // ============================================================
  // 7. DONNÉES POUR GRAPHIQUES (simulées)
  // ============================================================
  async getActivityData() {
    await delay(400);
    return {
      labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
      incoming: [65, 78, 90, 82, 105, 70, 55],
      processed: [45, 60, 72, 68, 85, 55, 40]
    };
  },

  async getStatusDistribution() {
    const conversations = await this.getConversations();
    const open = conversations.filter(c => c.status === 'open').length;
    const pending = conversations.filter(c => c.status === 'pending').length;
    const closed = conversations.filter(c => c.status === 'closed').length;
    const archived = conversations.filter(c => c.archived).length;
    return {
      labels: ['Ouverts', 'En attente', 'Fermés', 'Archivés'],
      data: [open, pending, closed, archived],
      colors: ['#4caf50', '#ff9800', '#9e9e9e', '#42a5f5']
    };
  },

  // ============================================================
  // 8. PERFORMANCE DES AGENTS (simulée)
  // ============================================================
  async getAgentPerformance() {
    await delay(500);
    let users = [];
    try { users = await this.getAgents(); } catch { users = []; }
    const operators = users.filter(u => u.role === 'agent' && u.status === 'active');
    const maxMessages = Math.max(...operators.map(a => a.messages || 0), 1);
    return operators.map(agent => ({
      name: agent.name,
      messages: agent.messages || 0,
      avgTime: agent.avgTime || '0m',
      rating: agent.rating || 0,
      percentage: Math.round(((agent.messages || 0) / maxMessages) * 100),
      color: agent.color || '#f57c00'
    })).sort((a, b) => b.percentage - a.percentage);
  },

  async getSatisfaction() {
    await delay(300);
    return {
      average: 4.7,
      breakdown: [
        { label: '5⭐', percentage: 45, color: '#2e7d32' },
        { label: '4⭐', percentage: 30, color: '#4caf50' },
        { label: '3⭐', percentage: 15, color: '#ff9800' },
        { label: '2⭐', percentage: 7, color: '#f57c00' },
        { label: '1⭐', percentage: 3, color: '#c62828' }
      ]
    };
  },

  // ============================================================
  // 9. CLIENTS (simulés)
  // ============================================================
  async getClients() {
    await delay(300);
    const firstNames = ['Ali', 'Hadiara', 'Bachir', 'Ramatou', 'Ibrahim', 'Aissatou', 'Moustapha', 'Fati', 'Kader', 'Zara', 'Moussa', 'Fatima', 'Oumarou', 'Rakia', 'Amina', 'Mahamadou', 'Sani', 'Yacouba', 'Garba', 'Mainassara'];
    const lastNames = ['Mainassara', 'Soumana', 'Sani', 'Moussa', 'Yacouba', 'Garba', 'Issa', 'Ali', 'Zakari', 'Mamane', 'Barkiré', 'Abdoulaye', 'Amadou', 'Bachir', 'Oumar', 'Ibrahim', 'Moussa', 'Amina', 'Kader', 'Zara'];
    const clients = [];
    const used = new Set();
    while (clients.length < 1000) {
      const f = firstNames[Math.floor(Math.random() * firstNames.length)];
      const l = lastNames[Math.floor(Math.random() * lastNames.length)];
      const full = `${f} ${l}`;
      if (!used.has(full)) {
        used.add(full);
        clients.push(full);
      }
    }
    return clients;
  },

  // ============================================================
  // 10. PARAMÈTRES UTILISATEUR (simulés)
  // ============================================================
  async getSettings() {
    await delay(300);
    const saved = localStorage.getItem('userSettings');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return {
      emailNotifications: true,
      pushNotifications: false,
      newConversations: true,
      weeklyReports: true
    };
  },

  async updateSettings(settings) {
    await delay(300);
    localStorage.setItem('userSettings', JSON.stringify(settings));
    return { success: true };
  },

  // ============================================================
  // 11. SÉCURITÉ (simulée)
  // ============================================================
  async changePassword() { await delay(500); return { success: true }; },
  async enable2FA()      { await delay(500); return { success: true }; },

  // ============================================================
  // 12. EXPORT DE DONNÉES (simulé)
  // ============================================================
  async exportData(format) {
    await delay(800);
    console.log(`📤 Export en ${format} simulé`);
    return { success: true };
  },

  // ============================================================
  // 13. COMPATIBILITÉ
  // ============================================================
  async getRecentConversations() { return this.getConversations(); },

  async replyToConversation(id, reply) {
    return this.sendMessage(id, reply, { name: 'Agent' });
  },

  async toggleArchiveConversation(id) {
    const conv = await this.getConversation(id);
    if (!conv) throw new Error('Conversation introuvable');
    return this.toggleArchive(id, !conv.archived);
  },

  async searchConversations(query) {
    const conversations = await this.getConversations();
    const q = query.toLowerCase();
    return conversations.filter(c =>
      c.clientName?.toLowerCase().includes(q) ||
      c.subject?.toLowerCase().includes(q) ||
      c.messages?.some(m => m.content?.toLowerCase().includes(q))
    );
  },

  // ============================================================
  // 14. AUDIT (Super Admin uniquement)
  // ============================================================
  async getAuditLogs(filters = {}) {
    const params = new URLSearchParams();
    if (filters.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters.severity && filters.severity !== 'all') params.append('severity', filters.severity);
    if (filters.actorId) params.append('actorId', filters.actorId);
    if (filters.search)  params.append('search', filters.search);
    if (filters.success !== undefined && filters.success !== 'all') {
      params.append('success', filters.success);
    }
    if (filters.limit)   params.append('limit', filters.limit);

    const response = await fetch(`${API_URL}/api/audit?${params.toString()}`, {
      headers: authHeaders()
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Erreur chargement audit');
    }
    return response.json();
  },

  async getAuditStats() {
    const response = await fetch(`${API_URL}/api/audit/stats`, {
      headers: authHeaders()
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Erreur stats audit');
    }
    return response.json();
  },

  async clearAuditLogs() {
    const response = await fetch(`${API_URL}/api/audit`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Erreur purge audit');
    }
    return response.json();
  },

  // ============================================================
  // 15. NOTIFICATIONS PERSISTANTES ✅ NOUVEAU
  // ============================================================
  async getMyNotifications() {
    const r = await fetch(`${API_URL}/api/notifications`, { headers: authHeaders() });
    if (!r.ok) throw new Error('Erreur chargement notifications');
    return r.json();
  },

  async markNotificationRead(id) {
    await fetch(`${API_URL}/api/notifications/${id}/read`, {
      method: 'POST', headers: authHeaders()
    });
  },

  async markAllNotificationsRead() {
    await fetch(`${API_URL}/api/notifications/read-all`, {
      method: 'POST', headers: authHeaders()
    });
  },

  async deleteNotification(id) {
    await fetch(`${API_URL}/api/notifications/${id}`, {
      method: 'DELETE', headers: authHeaders()
    });
  },

  async clearAllNotifications() {
    await fetch(`${API_URL}/api/notifications`, {
      method: 'DELETE', headers: authHeaders()
    });
  },
};

if (typeof window !== 'undefined') {
  window.API = API;
}