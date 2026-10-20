// web/js/app.js
import { state } from './services/state.js';
import { AuthModule } from './modules/auth.js';
import { Toast } from './components/toast.js';
import { Notifications } from './services/notifications.js';
import { initNotificationsUI, ringBell } from './components/notifications-ui.js';
import {
    initSocket,
    getSocket,
} from './services/socket.js';

// 🔧 DEBUG — expose la socket sur window pour les tests en console
window.__getSocket = getSocket;

// ============================================
// HELPER PERMISSIONS (centralisé)
// ============================================
export const Permissions = {
    isSuperAdmin: (u) => u?.role === 'super_admin',
    isChef:       (u) => u?.role === 'chef',
    isAgent:      (u) => u?.role === 'agent',
    isAdminSys:   (u) => u?.role === 'admin_systeme',

    canCreateChef:     (u) => u?.role === 'super_admin',
    canCreateAdminSys: (u) => u?.role === 'super_admin',
    canCreateAgent:    (u) => ['super_admin', 'chef'].includes(u?.role),
    canCreateUser:     (u) => ['super_admin', 'chef'].includes(u?.role),

    canEditUser: (u, target) => {
        if (u?.role === 'super_admin') return true;
        if (u?.role === 'chef') return target?.role === 'agent';
        return false;
    },
    canSuspendUser: (u, target) => {
        if (u?.role === 'super_admin') return true;
        if (u?.role === 'chef') return target?.role === 'agent';
        return false;
    },

    canDeleteUser: (u) => u?.role === 'super_admin',

    canViewAllTickets: (u) => ['super_admin', 'chef'].includes(u?.role),
    canViewAssignedTicketsOnly: (u) => u?.role === 'admin_systeme',
    canTreatTicket: (u) => u?.role === 'admin_systeme',

    canViewStats:    (u) => ['super_admin', 'chef'].includes(u?.role),
    canViewSettings: (u) => ['super_admin', 'chef'].includes(u?.role),
    canViewAudit:    (u) => u?.role === 'super_admin',
};

window.Permissions = Permissions;

// ============================================
// PAGE PAR DÉFAUT SELON LE RÔLE
// ============================================
function getDefaultPage(user) {
    switch (user?.role) {
        case 'admin_systeme': return 'tickets';
        case 'agent':         return 'conversations';
        case 'chef':
        case 'super_admin':
        default:              return 'dashboard';
    }
}

// ============================================
// PAGES AUTORISÉES SELON LE RÔLE
// ============================================
function getAuthorizedPages(user) {
    switch (user?.role) {
        case 'super_admin':
            return [
                'dashboard', 'agents', 'users',
                'conversations', 'conversation-detail',
                'tickets', 'statistiques', 'parametres',
                'audit'
            ];

        case 'chef':
            return [
                'dashboard', 'agents',
                'conversations', 'conversation-detail',
                'tickets', 'statistiques', 'parametres'
            ];

        case 'agent':
            return ['conversations', 'conversation-detail', 'tickets'];

        case 'admin_systeme':
            return ['tickets'];

        default:
            return [];
    }
}

// ============================================
// MISE À JOUR DE LA SIDEBAR
// ============================================
function updateSidebar(user) {
    const authorized = getAuthorizedPages(user);
    const navLinks = document.querySelectorAll('#sidebar [data-page]');
    navLinks.forEach(link => {
        const page = link.dataset.page;
        if (authorized.includes(page)) {
            link.style.display = 'flex';
        } else {
            link.style.display = 'none';
        }
    });

    const agentsBadge = document.getElementById('agentsCount');
    if (agentsBadge) {
        agentsBadge.style.display = authorized.includes('agents') ? '' : 'none';
    }

    const usersBadge = document.getElementById('usersCount');
    if (usersBadge) {
        usersBadge.style.display = authorized.includes('users') ? '' : 'none';
    }

    const convBadge = document.getElementById('conversationsCount');
    if (convBadge) {
        convBadge.style.display = authorized.includes('conversations') ? '' : 'none';
    }
}

window.updateSidebar = updateSidebar;

// ============================================
// NOTIFICATIONS GLOBALES (cloche header)
// ============================================
let notificationsBound = false;

function _notifHandlerConvUpdated(payload) {
    console.log('🔔 [Notifs] conversation-updated reçu :', payload);
    const user = state.getUser();
    if (!user) return;
    const msg = payload?.lastMessage;
    if (!msg || msg.from !== 'client') return;
    if (!['super_admin', 'chef', 'agent'].includes(user.role)) return;

    const preview = (msg.content || '[Pièce jointe]').toString().substring(0, 90);
    const created = Notifications.push({
        type: 'message',
        title: `💬 Nouveau message — ${payload.clientName || 'Client'}`,
        message: preview,
        icon: 'fa-comment-dots',
        color: '#f57c00',
        data: { conversationId: payload.conversationId, messageId: msg.id },
        uniqueKey: `msg-${payload.conversationId}-${msg.id}-${msg.timestamp || ''}`,
    });
    if (created) ringBell();
}

function _notifHandlerTicketCreated(ticket) {
    console.log('🔔 [Notifs] ticket-created reçu :', ticket);
    const user = state.getUser();
    if (!user || !ticket || !ticket.id) return;

    // ✅ Normalisation : createdBy peut être un objet {id, name} ou un id direct
    const creatorId = typeof ticket.createdBy === 'object'
        ? ticket.createdBy?.id
        : ticket.createdBy;

    // ✅ FIX 1 : comparer en Number() car user.id vient du localStorage (string)
    //    alors que creatorId vient du serveur (number).
    //    Avant : creatorId === user.id pouvait être false → l'expéditeur voyait la notif.
    if (Number(creatorId) === Number(user.id)) {
        console.log(`   ↳ ignoré (créateur = user actuel : ${user.id})`);
        return;
    }

    // ✅ FIX 2 : comparer en Number() ici aussi.
    //    Avant : ticket.assignedTo !== user.id renvoyait true à tort
    //    → l'admin_systeme assigné était filtré et ne voyait rien en temps réel.
    if (user.role === 'admin_systeme' && Number(ticket.assignedTo) !== Number(user.id)) {
        console.log(`   ↳ ignoré (admin_systeme non assigné : assignedTo=${ticket.assignedTo}, me=${user.id})`);
        return;
    }

    const created = Notifications.push({
        type: 'ticket',
        title: `🎫 Nouveau ticket #${ticket.id}`,
        message: ticket.subject || 'Nouveau ticket',
        icon: 'fa-ticket-alt',
        color: '#2563eb',
        data: { ticketId: ticket.id },
        uniqueKey: `ticket-${ticket.id}`,
    });
    if (created) {
        ringBell();
        Toast.info(`Nouveau ticket #${ticket.id}`);
    }
}

function _notifHandlerTicketAssigned(ticket) {
    console.log('🔔 [Notifs] ticket-assigned reçu :', ticket);
    const user = state.getUser();
    if (!user || !ticket || !ticket.id) return;

    if (Number(ticket.assignedTo) !== Number(user.id)) {
        console.log(`   ↳ ignoré (assignedTo=${ticket.assignedTo} ≠ user.id=${user.id})`);
        return;
    }

    const created = Notifications.push({
        type: 'ticket-assigned',
        title: `🛡️ Ticket #${ticket.id} vous est assigné`,
        message: ticket.subject || 'Action requise',
        icon: 'fa-user-shield',
        color: '#0891b2',
        data: { ticketId: ticket.id },
        uniqueKey: `ticket-assigned-${ticket.id}-${ticket.updatedAt || ''}`,
    });
    if (created) {
        ringBell();
        Toast.warning(`🎫 Ticket #${ticket.id} vous est assigné`);
    }
}

function _notifHandlerTicketUpdated(ticket) {
    console.log('🔔 [Notifs] ticket-updated reçu :', ticket);
    const user = state.getUser();
    if (!user || !ticket || ticket.deleted) return;

    const creatorId = typeof ticket.createdBy === 'object'
        ? ticket.createdBy?.id
        : ticket.createdBy;

    // ✅ FIX : comparaisons robustes (string/number) pour éviter les faux négatifs
    const isCreator    = Number(creatorId) === Number(user.id);
    const isAssignee   = Number(ticket.assignedTo) === Number(user.id);
    const isSupervisor = ['super_admin', 'chef'].includes(user.role);

    if (!isCreator && !isAssignee && !isSupervisor) {
        console.log(`   ↳ ignoré (non concerné : creator=${creatorId}, assigned=${ticket.assignedTo}, me=${user.id})`);
        return;
    }

    let title   = `🔄 Ticket #${ticket.id} mis à jour`;
    let message = `Statut : ${ticket.status || 'modifié'}`;
    let icon    = 'fa-sync-alt';
    let color   = '#ff9800';

    if (isAssignee && !isSupervisor) {
        title   = `📥 Ticket #${ticket.id} — action requise`;
        message = ticket.subject || 'Un ticket vous a été transmis';
        icon    = 'fa-user-shield';
        color   = '#0891b2';
    } else if (isCreator && !isSupervisor) {
        title   = `📬 Mise à jour du ticket #${ticket.id}`;
        message = ticket.subject || 'Votre ticket a été mis à jour';
        icon    = 'fa-reply';
        color   = '#2563eb';
    }

    const created = Notifications.push({
        type: 'ticket-updated',
        title,
        message,
        icon,
        color,
        data: { ticketId: ticket.id },
        uniqueKey: `ticket-up-${ticket.id}-${ticket.status}-${ticket.updatedAt || ''}`,
    });
    if (created) ringBell();
}

let _notifsSetupDone = false;

function setupGlobalNotifications() {
    if (_notifsSetupDone) {
        console.log('🔔 [Notifs] setup déjà fait, on skip');
        return;
    }

    const user = state.getUser();
    if (!user) return;

    const socket = initSocket();
    if (!socket) {
        console.warn('⚠️ [Notifs] socket indisponible');
        return;
    }

    // Retire nos anciens handlers si présents
    socket.off('conversation-updated', _notifHandlerConvUpdated);
    socket.off('ticket-created',       _notifHandlerTicketCreated);
    socket.off('ticket-assigned',      _notifHandlerTicketAssigned);
    socket.off('ticket-updated',       _notifHandlerTicketUpdated);

    // Branche une seule fois
    socket.on('conversation-updated', _notifHandlerConvUpdated);
    socket.on('ticket-created',       _notifHandlerTicketCreated);
    socket.on('ticket-assigned',      _notifHandlerTicketAssigned);
    socket.on('ticket-updated',       _notifHandlerTicketUpdated);

    // Re-branche à chaque reconnexion (au cas où)
    socket.off('connect', setupGlobalNotifications);
    socket.on('connect', () => {
        _notifsSetupDone = false;
        setTimeout(setupGlobalNotifications, 100);
    });

    _notifsSetupDone = true;
    notificationsBound = true;
    console.log('🔔 [Notifs] handlers branchés (unique)');
}

window.__testNotif = (type = 'ticket-assigned') => {
    Notifications.push({
        type,
        title: `🧪 Test — ${type}`,
        message: 'Notification de test déclenchée manuellement',
        icon: 'fa-flask',
        color: '#7c3aed',
        data: {},
        uniqueKey: `test-${Date.now()}`,
    });
    ringBell();
    console.log('✅ Notification de test envoyée');
};

window.__socketDebug = () => {
    const s = window.__getSocket?.();
    if (!s) {
        console.log('❌ Pas de socket (window.__getSocket indisponible)');
        return;
    }
    console.log('socket.connected =', s.connected);
    console.log('socket.id =', s.id);
    console.log('Listeners sur ticket-assigned =', s.listeners('ticket-assigned').length);
    console.log('Listeners sur ticket-created =', s.listeners('ticket-created').length);
    console.log('Listeners sur conversation-updated =', s.listeners('conversation-updated').length);
    console.log('Listeners sur ticket-updated =', s.listeners('ticket-updated').length);
};

// ============================================
// AFFICHAGE / CACHAGE DES PAGES
// ============================================
function showApp() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    const user = state.getUser();
    if (user) {
        const userNameEl = document.getElementById('userName');
        if (userNameEl) userNameEl.textContent = user.name;
        updateSidebar(user);

        initNotificationsUI();

        // ✅ Hydrate les notifications persistées côté serveur
        //    → la cloche affiche immédiatement le compteur des notifs en attente
        Notifications.hydrateFromServer().catch(err =>
            console.warn('Hydratation notifs:', err)
        );

        // Branche les handlers socket (temps réel)
        setupGlobalNotifications();
    }
}

function showLogin() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    const errorEl = document.getElementById('loginError');
    if (errorEl) errorEl.className = 'error-message';
}

// ✅ Exposer globalement pour AuthModule
window.showApp = showApp;
window.setupGlobalNotifications = setupGlobalNotifications;
window.initNotificationsUI = initNotificationsUI;

// ============================================
// CHARGEMENT DES PAGES
// ============================================
async function loadPage(page, params = null) {
    const user = state.getUser();
    if (!user) {
        showLogin();
        return;
    }

    const authorized = getAuthorizedPages(user);
    if (!authorized.includes(page)) {
        const defaultPage = getDefaultPage(user);
        Toast.warning(`Accès non autorisé – redirection vers ${defaultPage}`);
        loadPage(defaultPage);
        return;
    }

    try {
        const currentPage = document.querySelector('[data-page].active')?.dataset.page;
        if (currentPage === 'conversation-detail' && page !== 'conversation-detail') {
            const module = await import('./modules/conversation-detail.js');
            if (module.cleanup) module.cleanup();
        }
    } catch (err) {
        console.debug('Nettoyage socket ignoré:', err.message);
    }

    document.querySelectorAll('[data-page]').forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });

    const titles = {
        dashboard: 'Tableau de bord',
        agents: 'Gestion des agents',
        users: 'Gestion des utilisateurs',
        conversations: 'Conversations',
        'conversation-detail': 'Détail de la conversation',
        tickets: 'Gestion des tickets',
        statistiques: 'Statistiques',
        parametres: 'Paramètres',
        audit: 'Journal d\'audit'
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[page] || page;

    const contentEl = document.getElementById('pageContent');
    if (contentEl) {
        contentEl.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; padding:80px 0;">
                <div style="text-align:center;">
                    <i class="fas fa-spinner fa-spin" style="font-size:40px; color:#f57c00; margin-bottom:16px;"></i>
                    <p style="color:var(--gray-500);">Chargement...</p>
                </div>
            </div>
        `;
    }

    try {
        const module = await import(`./modules/${page}.js`);
        const content = typeof module.render === 'function' 
            ? await module.render(params)
            : await module.render();
        if (contentEl) contentEl.innerHTML = content;

        if (module.init) {
            setTimeout(() => { module.init(params); }, 150);
        }
    } catch (error) {
        console.error('Erreur de chargement:', error);
        if (contentEl) {
            contentEl.innerHTML = `
                <div class="card" style="text-align:center;padding:60px 20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size:48px;color:#f57c00;margin-bottom:16px;"></i>
                    <h2 style="margin-bottom:8px;">Erreur de chargement</h2>
                    <p style="color:var(--gray-500);margin-bottom:16px;">
                        Le module "${page}" n'a pas pu être chargé.<br>
                        <span style="font-size:13px;color:var(--gray-400);">${error.message}</span>
                    </p>
                    <button onclick="loadPage('${getDefaultPage(user)}')" class="btn-primary">
                        <i class="fas fa-arrow-left"></i> Retour
                    </button>
                </div>
            `;
        }
    }
}

window.loadPage = loadPage;

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.logo-img, .sidebar-logo').forEach(img => {
        img.addEventListener('error', function() {
            this.style.display = 'none';
            const fallback = this.closest('.login-logo')?.querySelector('.logo-text-fallback') ||
                            this.closest('.sidebar-header')?.querySelector('.sidebar-logo-fallback');
            if (fallback) fallback.style.display = 'flex';
        });
    });

    if (state.isAuthenticated()) {
        const user = state.getUser();
        showApp();
        loadPage(getDefaultPage(user));
    } else {
        showLogin();
    }

    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            loginBtn.disabled = true;
            loginBtn.innerHTML = `
                <span class="btn-text">Connexion...</span>
                <i class="fas fa-spinner fa-spin"></i>
            `;

            const email = document.getElementById('loginEmail')?.value?.trim() || '';
            const password = document.getElementById('loginPassword')?.value || '';
            const rememberMe = document.getElementById('rememberMe')?.checked || false;

            const result = await AuthModule.login(email, password, rememberMe);

            loginBtn.disabled = false;
            loginBtn.innerHTML = `
                <span class="btn-text">Se connecter</span>
                <i class="fas fa-arrow-right"></i>
            `;
        });
    }

    const togglePassword = document.querySelector('.toggle-password');
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const input = document.getElementById('loginPassword');
            const icon = this.querySelector('i');
            if (input) {
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            }
        });
    }

    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            loadPage(page);
        });
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            AuthModule.logout();
            notificationsBound = false;
            _notifsSetupDone = false;
            Toast.success('Déconnecté avec succès');
        });
    }

    const toggleSidebar = document.getElementById('toggleSidebar');
    if (toggleSidebar) {
        toggleSidebar.addEventListener('click', () => {
            document.getElementById('sidebar')?.classList.toggle('open');
        });
    }
});