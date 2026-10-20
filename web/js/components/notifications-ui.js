// web/js/components/notifications-ui.js
// ============================================================
// UI DE LA CLOCHE — badge, panneau, animations, navigation
// ============================================================
// ✅ Logique d'affichage du badge : 100% CSS.
//    JS toggle UNIQUEMENT la classe .has-unread sur le wrapper.
//    Le CSS décide si le badge est visible.
//    → Plus de conflit avec un éventuel style inline display:none.
// ============================================================
import { Notifications } from '../services/notifications.js';
import { state } from '../services/state.js';

let initialized = false;
let unsub = null;

const TYPE_CLASS = {
    message:           'notif-type-message',
    ticket:            'notif-type-ticket',
    'ticket-assigned': 'notif-type-assigned',
    'ticket-updated':  'notif-type-updated',
};

function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 30)   return 'à l\'instant';
    if (s < 60)   return 'il y a quelques secondes';
    const m = Math.floor(s / 60);
    if (m < 60)   return `il y a ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24)   return `il y a ${h} h`;
    const d = Math.floor(h / 24);
    return `il y a ${d} j`;
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function renderItem(n) {
    const cls = TYPE_CLASS[n.type] || '';
    return `
        <div class="notif-item ${n.read ? 'read' : 'unread'} ${cls}" data-id="${n.id}" data-type="${n.type}">
            <div class="notif-item-icon" style="background:${n.color}1a;color:${n.color};">
                <i class="fas ${n.icon}"></i>
            </div>
            <div class="notif-item-body">
                <div class="notif-item-title">${escapeHtml(n.title)}</div>
                ${n.message ? `<div class="notif-item-message">${escapeHtml(n.message)}</div>` : ''}
                <div class="notif-item-time">${timeAgo(n.timestamp)}</div>
            </div>
            <button class="notif-item-close" data-id="${n.id}" title="Supprimer" aria-label="Supprimer">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
}

function renderList(items) {
    const list = document.getElementById('notificationsList');
    if (!list) return;
    if (!items.length) {
        list.innerHTML = `
            <div class="notif-empty">
                <i class="fas fa-bell-slash"></i>
                <p>Aucune notification</p>
                <small>Vous êtes à jour !</small>
            </div>`;
        return;
    }
    list.innerHTML = items.map(renderItem).join('');
}

function applyState({ items, unread }) {
    const badge   = document.getElementById('notifCount');
    const wrapper = document.getElementById('notificationsWrapper');

    // ✅ Le badge : on ne touche PLUS JAMAIS à style.display ni style inline.
    // C'est le CSS qui décide (via .has-unread sur le parent).
    if (badge) {
        badge.textContent = unread > 99 ? '99+' : String(unread);
        badge.classList.toggle('pulse', unread > 0);
    }

    // ✅ Le parent : on toggle uniquement la classe .has-unread
    if (wrapper) {
        wrapper.classList.toggle('has-unread', unread > 0);
    }

    renderList(items);
}

/** Fait sonner la cloche (animation) — appelée à chaque nouvelle notif */
export function ringBell() {
    const wrapper = document.getElementById('notificationsWrapper');
    if (!wrapper) return;
    wrapper.classList.remove('ringing');
    void wrapper.offsetWidth; // reflow pour rejouer l'animation
    wrapper.classList.add('ringing');
    clearTimeout(wrapper._ringTimer);
    wrapper._ringTimer = setTimeout(() => wrapper.classList.remove('ringing'), 2200);
}

export function initNotificationsUI() {
    if (initialized) return;

    const wrapper  = document.getElementById('notificationsWrapper');
    const btn      = document.getElementById('notificationsBtn');
    const panel    = document.getElementById('notificationsPanel');
    const markAll  = document.getElementById('markAllReadBtn');
    const clearAll = document.getElementById('clearNotifsBtn');

    if (!wrapper || !btn || !panel) {
        console.warn('[NotificationsUI] éléments DOM manquants');
        return;
    }

    // Ouverture / fermeture du panneau
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !panel.hasAttribute('hidden');
        if (isOpen) panel.setAttribute('hidden', '');
        else        panel.removeAttribute('hidden');
    });

    // Fermeture au clic extérieur
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) panel.setAttribute('hidden', '');
    });

    // Fermeture sur Échap
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') panel.setAttribute('hidden', '');
    });

    markAll?.addEventListener('click', (e) => {
        e.stopPropagation();
        Notifications.markAllRead();
    });

    clearAll?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Effacer toutes les notifications ?')) Notifications.clearAll();
    });

    // Clic sur une notification
    panel.addEventListener('click', (e) => {
        const closeBtn = e.target.closest('.notif-item-close');
        if (closeBtn) {
            e.stopPropagation();
            Notifications.remove(closeBtn.dataset.id);
            return;
        }
        const item = e.target.closest('.notif-item');
        if (!item) return;

        const id = item.dataset.id;
        const notif = Notifications.getState().items.find(n => n.id === id);
        if (!notif) return;

        Notifications.markRead(id);
        panel.setAttribute('hidden', '');

        const user = state.getUser();
        if (!user) return;

        // Navigation contextuelle
        if (notif.type === 'message' && notif.data?.conversationId) {
            if (['super_admin', 'chef', 'agent'].includes(user.role)) {
                window.loadPage('conversation-detail', notif.data.conversationId);
            }
        } else if (String(notif.type).startsWith('ticket')) {
            if (['super_admin', 'chef', 'agent', 'admin_systeme'].includes(user.role)) {
                window.loadPage('tickets');
            }
        }
    });

    // S'abonner aux changements
    unsub = Notifications.subscribe(applyState);
    initialized = true;
}

export function resetNotificationsUI() {
    if (unsub) { unsub(); unsub = null; }
    initialized = false;
}