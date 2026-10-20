// web/js/modules/tickets.js
// ============================================================
// GESTION DES TICKETS — 4 rôles
// ============================================================
import { API } from '../services/api.js';
import { state } from '../services/state.js';
import { Toast } from '../components/toast.js';
import { Modal } from '../components/modal.js';
import {
    initSocket,
    joinTickets,
    onTicketCreated,
    onTicketUpdated,
    onTicketAssigned,
} from '../services/socket.js';

// ============================================================
// CONSTANTES
// ============================================================
const PRIORITY_LABELS = {
    low: 'Basse', medium: 'Moyenne', high: 'Haute', urgent: 'Urgente'
};
const PRIORITY_COLORS = {
    low: '#4caf50', medium: '#ff9800', high: '#f57c00', urgent: '#dc2626'
};
const STATUS_LABELS = {
    open: 'Ouvert', in_progress: 'En cours', resolved: 'Résolu', closed: 'Fermé'
};
const STATUS_COLORS = {
    open: '#2563eb', in_progress: '#ff9800', resolved: '#4caf50', closed: '#9e9e9e'
};
const ROLE_LABELS = {
    super_admin:   'Super Admin',
    chef:          'Chef Service',
    agent:         'Opérateur',
    admin_systeme: 'Admin Système',
};
const COMMENT_TYPE_LABELS = {
    comment:    'Commentaire',
    resolution: 'Problème résolu',
    rejection:  'Non résolu / Besoin d\'infos',
    relance:    'Relance',
    validation: 'Validation & clôture',
    status:     'Changement de statut',
    assignment: 'Assignation',
};

// ============================================================
// HELPERS — UTILISATEUR & RÔLES
// ============================================================
function getCurrentUser() {
    return state.getUser() || { id: null, name: 'Utilisateur', role: 'agent' };
}

// Raccourcis de rôles
const isSuperAdmin = (u) => u?.role === 'super_admin';
const isChef       = (u) => u?.role === 'chef';
const isAgent      = (u) => u?.role === 'agent';
const isAdminSys   = (u) => u?.role === 'admin_systeme';

// Qui peut créer un ticket ?
const canCreateTicket = (u) => ['super_admin', 'chef', 'agent'].includes(u?.role);

// Qui peut voir TOUS les tickets ?
const canSeeAllTickets = (u) => ['super_admin', 'chef'].includes(u?.role);

// Qui peut modifier un ticket ?
const canEditTicket = (u) => ['super_admin', 'chef'].includes(u?.role);

// Qui peut supprimer un ticket ? (super_admin UNIQUEMENT)
const canDeleteTicket = (u) => isSuperAdmin(u);

// Qui traite les tickets (résoudre / non résolu) ?
const canTreatTicket = (u) => isAdminSys(u);

// ════════════════════════════════════════════════════════════
// ✅ NOUVEAU — Helper de récupération des utilisateurs
// ════════════════════════════════════════════════════════════
// Compatible avec TOUS les rôles :
//   - super_admin / chef → API.getAgents() (route privilégiée)
//   - agent / admin_systeme → API.getPublicUsers() (fallback)
//
// Utilisé pour :
//   - Afficher le nom de l'agent assigné sur chaque ticket
//   - Alimenter le <select> d'assignation dans la modale de création
// ════════════════════════════════════════════════════════════
async function fetchUsersForTickets() {
    try {
        // ✅ Utilise UNIQUEMENT la route publique /api/users/list
        //    Accessible à TOUS les rôles (super_admin, chef, agent, admin_systeme)
        //    et renvoie TOUS les utilisateurs (id, name, role, status)
        const users = await API.getPublicUsers();
        console.log('✅ [Tickets] Utilisateurs chargés :', users.length);
        return users;
    } catch (err) {
        console.error('❌ [Tickets] Impossible de charger les utilisateurs :', err.message);
        return [];
    }
}

function getTicketCreatorId(ticket) {
    if (!ticket.createdBy) return null;
    return typeof ticket.createdBy === 'object' ? ticket.createdBy.id : ticket.createdBy;
}

function isTicketCreator(ticket, user) {
    return user && getTicketCreatorId(ticket) === user.id;
}

function isAssignedTo(ticket, user) {
    return user && ticket.assignedTo === user.id;
}

function getLastWorkflowAction(ticket) {
    const comments = ticket.comments || [];
    for (let i = comments.length - 1; i >= 0; i--) {
        if (['resolution', 'validation', 'relance', 'rejection'].includes(comments[i].type)) {
            return comments[i];
        }
    }
    return null;
}

function isWaitingValidation(ticket) {
    return ticket.status === 'resolved' && getLastWorkflowAction(ticket)?.type === 'resolution';
}

function needsMyAction(ticket, user) {
    if (!user || ticket.status === 'closed') return false;

    if (isAssignedTo(ticket, user) && isAdminSys(user)) {
        return ['open', 'in_progress'].includes(ticket.status);
    }

    if (isTicketCreator(ticket, user) && isWaitingValidation(ticket)) {
        return true;
    }

    return false;
}

// ============================================================
// RENDER
// ============================================================
export async function render() {
    const user = getCurrentUser();

    // ✅ Chargement robuste : ne bloque plus si une requête échoue
    let tickets = [];
    let agents  = [];

    try {
        tickets = await API.getTicketsForUser(user);
    } catch (err) {
        console.error('Erreur chargement tickets :', err);
        Toast.error('Impossible de charger vos tickets');
    }

    try {
        agents = await fetchUsersForTickets();
    } catch (err) {
        console.warn('Liste utilisateurs indisponible :', err);
        agents = [];
    }

    const total      = tickets.length;
    const open       = tickets.filter(t => t.status === 'open').length;
    const inProgress = tickets.filter(t => t.status === 'in_progress').length;
    const resolved   = tickets.filter(t => t.status === 'resolved').length;
    const urgent     = tickets.filter(t => t.priority === 'urgent' && t.status !== 'closed').length;
    const waitingMe  = tickets.filter(t => needsMyAction(t, user)).length;

    let roleBanner = '';
    if (isAdminSys(user)) {
        roleBanner = `
            <div class="tickets-role-banner banner-admin-sys">
                <i class="fas fa-user-shield"></i>
                <div>
                    <strong>Espace Admin Système</strong>
                    <span>Vous voyez uniquement les tickets qui vous sont assignés.</span>
                </div>
            </div>
        `;
    } else if (isAgent(user)) {
        roleBanner = `
            <div class="tickets-role-banner banner-agent">
                <i class="fas fa-user-tie"></i>
                <div>
                    <strong>Espace Opérateur</strong>
                    <span>Vous voyez les tickets que vous avez créés et ceux non assignés.</span>
                </div>
            </div>
        `;
    } else if (isSuperAdmin(user)) {
        roleBanner = `
            <div class="tickets-role-banner banner-super">
                <i class="fas fa-shield-halved"></i>
                <div>
                    <strong>Vue Super Admin</strong>
                    <span>Vous voyez tous les tickets de la plateforme.</span>
                </div>
            </div>
        `;
    }

    let html = `
        ${roleBanner}

        <!-- ============================================ -->
        <!-- STATISTIQUES                                  -->
        <!-- ============================================ -->
        <div class="tickets-stats-grid">
            <div class="tickets-stat-card">
                <div class="tickets-stat-icon" style="background: rgba(245,124,0,0.12); color:#f57c00;">
                    <i class="fas fa-ticket-alt"></i>
                </div>
                <div class="tickets-stat-info">
                    <div class="tickets-stat-value">${total}</div>
                    <div class="tickets-stat-label">${canSeeAllTickets(user) ? 'Total tickets' : 'Mes tickets'}</div>
                </div>
            </div>
            <div class="tickets-stat-card">
                <div class="tickets-stat-icon" style="background: rgba(37,99,235,0.12); color:#2563eb;">
                    <i class="fas fa-folder-open"></i>
                </div>
                <div class="tickets-stat-info">
                    <div class="tickets-stat-value">${open}</div>
                    <div class="tickets-stat-label">Ouverts</div>
                </div>
            </div>
            <div class="tickets-stat-card">
                <div class="tickets-stat-icon" style="background: rgba(255,152,0,0.12); color:#ff9800;">
                    <i class="fas fa-spinner"></i>
                </div>
                <div class="tickets-stat-info">
                    <div class="tickets-stat-value">${inProgress}</div>
                    <div class="tickets-stat-label">En cours</div>
                </div>
            </div>
            <div class="tickets-stat-card">
                <div class="tickets-stat-icon" style="background: rgba(76,175,80,0.12); color:#4caf50;">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="tickets-stat-info">
                    <div class="tickets-stat-value">${resolved}</div>
                    <div class="tickets-stat-label">Résolus</div>
                </div>
            </div>
        </div>

        ${waitingMe > 0 ? `
            <div class="tickets-alert tickets-alert-action">
                <i class="fas fa-bell"></i>
                <span><strong>${waitingMe}</strong> ticket(s) <strong>nécessite(nt) votre action</strong> directement.</span>
            </div>
        ` : ''}

        ${urgent > 0 ? `
            <div class="tickets-alert">
                <i class="fas fa-exclamation-triangle"></i>
                <span><strong>${urgent}</strong> ticket(s) urgent(s) en cours</span>
            </div>
        ` : ''}

        <!-- ============================================ -->
        <!-- BARRE D'ACTION                                -->
        <!-- ============================================ -->
        <div class="tickets-actions-bar">
            <div class="tickets-search-wrapper">
                <i class="fas fa-search"></i>
                <input type="text" id="searchTicket" placeholder="Rechercher (sujet, client, téléphone...)" class="tickets-search-input">
            </div>
            <div class="tickets-filter-group">
                <select id="filterTicketStatus" class="tickets-filter-select">
                    <option value="all">Tous les statuts</option>
                    <option value="open">🔵 Ouverts</option>
                    <option value="in_progress">🟠 En cours</option>
                    <option value="resolved">🟢 Résolus</option>
                    <option value="closed">⚫ Fermés</option>
                </select>
                <select id="filterTicketPriority" class="tickets-filter-select">
                    <option value="all">Toutes priorités</option>
                    <option value="urgent">🔴 Urgente</option>
                    <option value="high">🟠 Haute</option>
                    <option value="medium">🟡 Moyenne</option>
                    <option value="low">🟢 Basse</option>
                </select>
                ${canCreateTicket(user) ? `
                    <button class="tickets-btn-add" id="addTicketBtn">
                        <i class="fas fa-plus"></i> Nouveau ticket
                    </button>
                ` : ''}
            </div>
        </div>

        <!-- ============================================ -->
        <!-- LISTE DES TICKETS                             -->
        <!-- ============================================ -->
        <div class="tickets-list" id="ticketsList">
    `;

    if (tickets.length === 0) {
        const emptyMessage = isAdminSys(user)
            ? 'Aucun ticket ne vous est actuellement assigné'
            : (isAgent(user)
                ? 'Vous n\'avez créé aucun ticket pour le moment'
                : 'Aucun ticket sur la plateforme');

        html += `
            <div class="tickets-empty">
                <i class="fas fa-ticket-alt" style="font-size:48px;color:var(--gray-300);margin-bottom:16px;"></i>
                <h3>Aucun ticket</h3>
                <p style="color:var(--gray-500);">${emptyMessage}</p>
                ${canCreateTicket(user) ? `
                    <button class="tickets-btn-add" id="addTicketBtnEmpty" style="margin-top:16px;">
                        <i class="fas fa-plus"></i> Créer un ticket
                    </button>
                ` : ''}
            </div>
        `;
    } else {
        tickets.forEach(ticket => {
            const priorityColor = PRIORITY_COLORS[ticket.priority] || '#9e9e9e';
            const statusLabel   = STATUS_LABELS[ticket.status] || ticket.status;
            const priorityLabel = PRIORITY_LABELS[ticket.priority] || ticket.priority;
            const assignedAgent = agents.find(a => a.id === ticket.assignedTo);
            const creatorId     = getTicketCreatorId(ticket);
            const creator       = creatorId ? agents.find(a => a.id === creatorId) : null;
            const date          = ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('fr-FR') : '-';
            const initials      = (ticket.client || 'C').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            const phone         = ticket.phone || '-';
            const relanceCount  = ticket.relanceCount || 0;
            const actionRequired = needsMyAction(ticket, user);
            const waitValidation = isWaitingValidation(ticket);

            const showEdit   = canEditTicket(user);
            const showDelete = canDeleteTicket(user);

            html += `
                <div class="ticket-item ${actionRequired ? 'needs-action' : ''}"
                     data-id="${ticket.id}" data-status="${ticket.status}" data-priority="${ticket.priority}">
                    <div class="ticket-priority-bar" style="background: ${priorityColor};"></div>
                    <div class="ticket-avatar" style="background: ${priorityColor};">${initials}</div>
                    <div class="ticket-content">
                        <div class="ticket-header">
                            <div class="ticket-title-group">
                                <span class="ticket-id">#${ticket.id}</span>
                                <h4 class="ticket-subject">${ticket.subject || 'Sans objet'}</h4>
                                ${actionRequired ? `<span class="ticket-action-badge"><i class="fas fa-bolt"></i> Action requise</span>` : ''}
                                ${relanceCount > 0 ? `<span class="ticket-relance-badge"><i class="fas fa-redo"></i> Relancé ${relanceCount}×</span>` : ''}
                                ${waitValidation ? `<span class="ticket-wait-badge"><i class="fas fa-hourglass-half"></i> En attente validation</span>` : ''}
                            </div>
                            <div class="ticket-badges">
                                <span class="ticket-badge priority-${ticket.priority}">${priorityLabel}</span>
                                <span class="ticket-badge status-${ticket.status}">${statusLabel}</span>
                            </div>
                        </div>
                        <div class="ticket-description">${(ticket.description || '').substring(0, 140)}${(ticket.description || '').length > 140 ? '...' : ''}</div>
                        <div class="ticket-footer">
                            <span class="ticket-meta"><i class="fas fa-user"></i> ${ticket.client || 'Client'}</span>
                            <span class="ticket-meta ticket-meta-phone"><i class="fas fa-phone"></i>
                                ${phone !== '-'
                                    ? `<a href="tel:${phone}" class="ticket-phone-link">${phone}</a>`
                                    : 'Non renseigné'}
                            </span>
                            <span class="ticket-meta"><i class="fas fa-user-tie"></i> ${assignedAgent ? assignedAgent.name : 'Non assigné'}</span>
                            ${creator ? `<span class="ticket-meta"><i class="fas fa-user-edit"></i> Créé par ${creator.name}</span>` : ''}
                            <span class="ticket-meta"><i class="fas fa-calendar"></i> ${date}</span>
                            <span class="ticket-actions">
                                <button class="ticket-btn view-ticket" data-id="${ticket.id}" title="Voir / Traiter">
                                    <i class="fas fa-eye"></i>
                                </button>
                                ${showEdit ? `
                                    <button class="ticket-btn edit-ticket" data-id="${ticket.id}" title="Modifier">
                                        <i class="fas fa-pen"></i>
                                    </button>
                                ` : ''}
                                ${showDelete ? `
                                    <button class="ticket-btn delete-ticket" data-id="${ticket.id}" title="Supprimer">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                ` : ''}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    html += `</div>`;
    return html;
}

// ============================================================
// INIT
// ============================================================
export function init() {
    document.getElementById('addTicketBtn')?.addEventListener('click', showAddTicketModal);
    document.getElementById('addTicketBtnEmpty')?.addEventListener('click', showAddTicketModal);

    document.querySelectorAll('.view-ticket').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            showViewTicketModal(parseInt(this.dataset.id));
        });
    });

    document.querySelectorAll('.edit-ticket').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            showEditTicketModal(parseInt(this.dataset.id));
        });
    });

    document.querySelectorAll('.delete-ticket').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            deleteTicket(parseInt(this.dataset.id));
        });
    });

    document.getElementById('searchTicket')?.addEventListener('input', filterTickets);
    document.getElementById('filterTicketStatus')?.addEventListener('change', filterTickets);
    document.getElementById('filterTicketPriority')?.addEventListener('change', filterTickets);

    // --- Socket temps réel ---
    initSocket();
    joinTickets();

    onTicketCreated((ticket) => {
        Toast.info(`🎫 Nouveau ticket : #${ticket.id} — ${ticket.subject}`);
        refreshIfNoModal();
    });

    onTicketUpdated(() => {
        refreshIfNoModal();
    });

    onTicketAssigned((ticket) => {
        Toast.warning(`🎫 Ticket assigné : #${ticket.id} — ${ticket.subject}`);
        refreshIfNoModal();
    });
}

function refreshIfNoModal() {
    const modalContainer = document.getElementById('modalContainer');
    const hasModal = modalContainer && modalContainer.innerHTML.trim() !== '';
    if (!hasModal) {
        window.loadPage('tickets');
    }
}

// ============================================================
// FILTRES
// ============================================================
function filterTickets() {
    const search   = (document.getElementById('searchTicket')?.value || '').toLowerCase().trim();
    const status   = document.getElementById('filterTicketStatus')?.value || 'all';
    const priority = document.getElementById('filterTicketPriority')?.value || 'all';

    document.querySelectorAll('.ticket-item').forEach(item => {
        const subject = item.querySelector('.ticket-subject')?.textContent?.toLowerCase() || '';
        const desc    = item.querySelector('.ticket-description')?.textContent?.toLowerCase() || '';
        const phone   = item.querySelector('.ticket-meta-phone')?.textContent?.toLowerCase() || '';
        const client  = item.querySelector('.ticket-meta')?.textContent?.toLowerCase() || '';
        const cardStatus   = item.dataset.status;
        const cardPriority = item.dataset.priority;

        const matchSearch   = subject.includes(search) || desc.includes(search)
                           || phone.includes(search) || client.includes(search);
        const matchStatus   = status === 'all' || cardStatus === status;
        const matchPriority = priority === 'all' || cardPriority === priority;

        item.style.display = (matchSearch && matchStatus && matchPriority) ? '' : 'none';
    });
}

// ============================================================
// WORKFLOW — HELPERS
// ============================================================
async function appendComment(ticketId, comment) {
    return API.addTicketComment(ticketId, comment);
}

function buildComment(user, type, text) {
    return {
        authorId: user.id,
        authorName: user.name || 'Utilisateur',
        authorRole: user.role || 'agent',
        type,
        text,
    };
}

// ============================================================
// MODALE — VOIR / TRAITER UN TICKET
// ============================================================
async function showViewTicketModal(id) {
    const ticket = await API.getTicket(id);
    if (!ticket) return Toast.error('Ticket introuvable');

    // ✅ Utilise le helper compatible avec tous les rôles
    const agents = await fetchUsersForTickets();
    const user = getCurrentUser();
    const assignedAgent = agents.find(a => a.id === ticket.assignedTo);
    const creatorId = getTicketCreatorId(ticket);
    const creator = creatorId ? agents.find(a => a.id === creatorId) : null;
    const priorityColor = PRIORITY_COLORS[ticket.priority] || '#9e9e9e';
    const phone = ticket.phone || '';
    const comments = ticket.comments || [];
    const relanceCount = ticket.relanceCount || 0;

    const isAssigned = isAssignedTo(ticket, user);
    const isCreator  = isTicketCreator(ticket, user);
    const superAdmin = isSuperAdmin(user);

    const canAgentRespond = (isAssigned && isAdminSys(user)) && ['open', 'in_progress'].includes(ticket.status);

    const waitingValidation = isWaitingValidation(ticket);
    const canOperatorValidate = (isCreator || superAdmin) && waitingValidation;

    const canComment = ticket.status !== 'closed';

    const threadHtml = comments.length === 0
        ? `<div class="ticket-thread-empty"><i class="fas fa-comments"></i> Aucun échange pour l'instant</div>`
        : comments.map(c => {
            const roleLabel = ROLE_LABELS[c.authorRole] || c.authorRole || 'Utilisateur';
            const typeClass = `thread-type-${c.type || 'comment'}`;
            const typeLabel = COMMENT_TYPE_LABELS[c.type] || 'Commentaire';
            const dateStr = c.createdAt ? new Date(c.createdAt).toLocaleString('fr-FR') : '';
            return `
                <div class="ticket-thread-item ${typeClass}">
                    <div class="ticket-thread-avatar">${(c.authorName || '?').split(' ').map(n=>n[0]).join('').toUpperCase().substring(0,2)}</div>
                    <div class="ticket-thread-content">
                        <div class="ticket-thread-meta">
                            <strong>${c.authorName || 'Utilisateur'}</strong>
                            <span class="thread-role">${roleLabel}</span>
                            <span class="thread-type-label">${typeLabel}</span>
                            <span class="thread-date">${dateStr}</span>
                        </div>
                        <div class="ticket-thread-text">${(c.text || '').replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div>
                    </div>
                </div>
            `;
        }).join('');

    let actionButtons = '';
    if (canAgentRespond) {
        actionButtons = `
            <button type="button" class="btn-action btn-resolve" id="btnResolve">
                <i class="fas fa-check-circle"></i> Marquer comme résolu
            </button>
            <button type="button" class="btn-action btn-not-resolve" id="btnNotResolve">
                <i class="fas fa-times-circle"></i> Non résolu / Besoin d'infos
            </button>
        `;
    } else if (canOperatorValidate) {
        actionButtons = `
            <button type="button" class="btn-action btn-validate" id="btnValidate">
                <i class="fas fa-check-double"></i> Valider & clôturer
            </button>
            <button type="button" class="btn-action btn-relance" id="btnRelance">
                <i class="fas fa-redo"></i> Relancer le gestionnaire
            </button>
        `;
    }

    const content = `
        <div class="modal-modern modal-ticket-view">
            <div class="modal-header">
                <div class="modal-icon" style="background: ${priorityColor};">
                    <i class="fas fa-ticket-alt"></i>
                </div>
                <div class="modal-title-group">
                    <h2>Ticket #${ticket.id}</h2>
                    <p>${ticket.subject || 'Sans objet'}</p>
                </div>
                <button class="modal-close" id="closeModalBtn"><i class="fas fa-times"></i></button>
            </div>

            <div class="modal-body">
                <div class="ticket-view-badges">
                    <span class="ticket-badge priority-${ticket.priority}">
                        <i class="fas fa-flag"></i> ${PRIORITY_LABELS[ticket.priority] || ticket.priority}
                    </span>
                    <span class="ticket-badge status-${ticket.status}">
                        <i class="fas fa-circle"></i> ${STATUS_LABELS[ticket.status] || ticket.status}
                    </span>
                    ${waitingValidation ? `<span class="ticket-wait-badge"><i class="fas fa-hourglass-half"></i> En attente validation</span>` : ''}
                    ${relanceCount > 0 ? `<span class="ticket-relance-badge"><i class="fas fa-redo"></i> Relancé ${relanceCount}×</span>` : ''}
                </div>

                <div class="ticket-view-grid">
                    <div class="ticket-view-item">
                        <label><i class="fas fa-user"></i> Client</label>
                        <p>${ticket.client || 'Non renseigné'}</p>
                    </div>
                    <div class="ticket-view-item">
                        <label><i class="fas fa-phone"></i> Téléphone</label>
                        <p>${phone
                            ? `<a href="tel:${phone}" class="ticket-phone-link"><i class="fas fa-phone-alt"></i> ${phone}</a>`
                            : 'Non renseigné'}</p>
                    </div>
                    <div class="ticket-view-item">
                        <label><i class="fas fa-user-tie"></i> Assigné à</label>
                        <p>${assignedAgent ? assignedAgent.name : 'Non assigné'}</p>
                    </div>
                    <div class="ticket-view-item">
                        <label><i class="fas fa-user-edit"></i> Créé par</label>
                        <p>${creator ? creator.name : 'Inconnu'}</p>
                    </div>
                    <div class="ticket-view-item">
                        <label><i class="fas fa-calendar"></i> Créé le</label>
                        <p>${ticket.createdAt ? new Date(ticket.createdAt).toLocaleString('fr-FR') : '-'}</p>
                    </div>
                    <div class="ticket-view-item">
                        <label><i class="fas fa-tag"></i> Catégorie</label>
                        <p>${ticket.category || 'Général'}</p>
                    </div>
                </div>

                <div class="ticket-view-description">
                    <label><i class="fas fa-align-left"></i> Description</label>
                    <p>${(ticket.description || 'Aucune description').replace(/</g,'&lt;')}</p>
                </div>

                <div class="ticket-thread-section">
                    <h4 class="ticket-thread-title">
                        <i class="fas fa-comments"></i> Suivi & échanges (${comments.length})
                    </h4>
                    <div class="ticket-thread">${threadHtml}</div>

                    ${canComment ? `
                        <div class="ticket-comment-form">
                            <textarea id="newCommentText" rows="2" placeholder="Ajouter un commentaire..."></textarea>
                            <button type="button" class="btn-send-comment" id="btnSendComment">
                                <i class="fas fa-paper-plane"></i> Envoyer
                            </button>
                        </div>
                    ` : `
                        <div class="ticket-thread-closed">
                            <i class="fas fa-lock"></i> Ticket fermé — plus aucun commentaire possible
                        </div>
                    `}
                </div>
            </div>

            <div class="modal-footer modal-footer-actions">
                ${phone ? `<a href="tel:${phone}" class="btn-call"><i class="fas fa-phone-alt"></i> Appeler</a>` : ''}
                ${actionButtons}
                <button type="button" id="closeModalBtnFooter" class="btn-secondary">Fermer</button>
            </div>
        </div>
    `;

    Modal.show(content);

    document.querySelectorAll('#closeModalBtn, #closeModalBtnFooter').forEach(btn => {
        btn.addEventListener('click', Modal.close);
    });

    document.getElementById('btnSendComment')?.addEventListener('click', async () => {
        const text = document.getElementById('newCommentText').value.trim();
        if (!text) return Toast.error('Saisissez un commentaire');

        try {
            await appendComment(id, buildComment(user, 'comment', text));
            Toast.success('Commentaire ajouté');
            await refreshViewModal(id);
        } catch (e) { Toast.error('Erreur : ' + e.message); }
    });

    document.getElementById('btnResolve')?.addEventListener('click', async () => {
        const text = document.getElementById('newCommentText').value.trim();
        if (!text) return Toast.error('Veuillez décrire la résolution dans le commentaire');

        try {
            await appendComment(id, buildComment(user, 'resolution', text));
            Toast.success('Ticket marqué comme résolu. En attente de validation.');
            await refreshViewModal(id);
            window.loadPage('tickets');
        } catch (e) { Toast.error('Erreur : ' + e.message); }
    });

    document.getElementById('btnNotResolve')?.addEventListener('click', async () => {
        const text = document.getElementById('newCommentText').value.trim();
        if (!text) return Toast.error('Expliquez pourquoi le problème n\'est pas résolu');

        try {
            await appendComment(id, buildComment(user, 'rejection', text));
            Toast.info('Retour envoyé au créateur');
            await refreshViewModal(id);
        } catch (e) { Toast.error('Erreur : ' + e.message); }
    });

    document.getElementById('btnValidate')?.addEventListener('click', async () => {
        const text = document.getElementById('newCommentText').value.trim()
            || 'Problème validé. Ticket clôturé.';

        try {
            await appendComment(id, buildComment(user, 'validation', text));
            Toast.success('Ticket validé et clôturé ✅');
            Modal.close();
            window.loadPage('tickets');
        } catch (e) { Toast.error('Erreur : ' + e.message); }
    });

    document.getElementById('btnRelance')?.addEventListener('click', async () => {
        const text = document.getElementById('newCommentText').value.trim();
        if (!text) return Toast.error('Précisez la raison de la relance');

        try {
            await appendComment(id, buildComment(user, 'relance', text));
            Toast.warning('Ticket relancé au gestionnaire');
            await refreshViewModal(id);
            window.loadPage('tickets');
        } catch (e) { Toast.error('Erreur : ' + e.message); }
    });
}

async function refreshViewModal(id) {
    Modal.close();
    setTimeout(() => showViewTicketModal(id), 150);
}

// ============================================================
// MODALE — CRÉATION TICKET
// ============================================================
async function showAddTicketModal() {
    const user = getCurrentUser();

    if (!canCreateTicket(user)) {
        Toast.error('Vous n\'êtes pas autorisé à créer un ticket');
        return;
    }

    // ✅ Utilise le helper compatible avec tous les rôles
    const agents = await fetchUsersForTickets();

    // ✅ On ne peut assigner qu'à des admins système actifs
    const assignableUsers = agents.filter(a =>
        a.role === 'admin_systeme' && a.status === 'active'
    );

    const content = `
        <div class="modal-modern">
            <div class="modal-header">
                <div class="modal-icon"><i class="fas fa-ticket-alt"></i></div>
                <div class="modal-title-group">
                    <h2>Nouveau ticket</h2>
                    <p>Créé par ${user.name || 'vous'} — assignez à un Admin Système</p>
                </div>
                <button class="modal-close" id="closeModalBtn"><i class="fas fa-times"></i></button>
            </div>

            <form id="ticketForm">
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-tag"></i> Sujet</label>
                            <input type="text" id="ticketSubject" placeholder="Ex: Problème de connexion" required>
                        </div>
                    </div>

                    <div class="form-row form-row-2">
                        <div class="form-group">
                            <label><i class="fas fa-user"></i> Client</label>
                            <input type="text" id="ticketClient" placeholder="Nom du client" required>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-phone"></i> Téléphone <span style="color:#dc2626;">*</span></label>
                            <input type="tel" id="ticketPhone" placeholder="Ex: +227 90 12 34 56"
                                   pattern="[0-9+\\s\\-()]{6,20}" required>
                        </div>
                    </div>

                    <div class="form-row form-row-2">
                        <div class="form-group">
                            <label><i class="fas fa-flag"></i> Priorité</label>
                            <select id="ticketPriority" required>
                                <option value="low">🟢 Basse</option>
                                <option value="medium" selected>🟡 Moyenne</option>
                                <option value="high">🟠 Haute</option>
                                <option value="urgent">🔴 Urgente</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-tag"></i> Catégorie</label>
                            <select id="ticketCategory">
                                <option value="general">Général</option>
                                <option value="technique">Technique</option>
                                <option value="facturation">Facturation</option>
                                <option value="reclamation">Réclamation</option>
                                <option value="autre">Autre</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-user-shield"></i> Assigner à un Admin Système <span style="color:#dc2626;">*</span></label>
                            ${assignableUsers.length === 0 ? `
                                <div class="info-box-warning" style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:8px;">
                                    <strong style="color:#92400e;display:block;margin-bottom:4px;">
                                        <i class="fas fa-exclamation-triangle"></i> Aucun Admin Système disponible
                                    </strong>
                                    <small style="color:#78350f;">
                                        Contactez votre Super Admin pour créer un compte Admin Système.
                                    </small>
                                </div>
                                <select id="ticketAssignedTo" required disabled style="display:none;"></select>
                            ` : `
                                <select id="ticketAssignedTo" required>
                                    <option value="">— Sélectionner un Admin Système —</option>
                                    ${assignableUsers.map(a =>
                                        `<option value="${a.id}">${a.name} — ${ROLE_LABELS[a.role] || a.role}</option>`
                                    ).join('')}
                                </select>
                            `}
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-align-left"></i> Description</label>
                            <textarea id="ticketDescription" rows="4"
                                placeholder="Décrivez le problème rencontré par le client..." required></textarea>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" id="closeModalBtnFooter" class="btn-secondary">Annuler</button>
                    <button type="submit" class="btn-primary" ${assignableUsers.length === 0 ? 'disabled' : ''}>
                        <i class="fas fa-plus"></i> Créer et assigner
                    </button>
                </div>
            </form>
        </div>
    `;

    Modal.show(content);

    document.getElementById('ticketForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const assignedToRaw = document.getElementById('ticketAssignedTo')?.value || '';
        const assignedAgent = agents.find(a => a.id === parseInt(assignedToRaw));

        const data = {
            subject:     document.getElementById('ticketSubject').value.trim(),
            client:      document.getElementById('ticketClient').value.trim(),
            phone:       document.getElementById('ticketPhone').value.trim(),
            priority:    document.getElementById('ticketPriority').value,
            category:    document.getElementById('ticketCategory').value,
            assignedTo:  assignedToRaw ? parseInt(assignedToRaw) : null,
            description: document.getElementById('ticketDescription').value.trim(),
            createdBy:   user.id || null,
            initialComment: {
                authorId:   user.id || null,
                authorName: user.name || 'Utilisateur',
                authorRole: user.role || 'agent',
                type:       'status',
                text:       assignedAgent
                    ? `Ticket créé et assigné à ${assignedAgent.name}.`
                    : 'Ticket créé (non assigné).'
            }
        };

        if (!data.subject || !data.client || !data.phone || !data.description || !data.assignedTo) {
            Toast.error('Veuillez remplir tous les champs obligatoires');
            return;
        }

        const phoneRegex = /^[0-9+\s\-()]{6,20}$/;
        if (!phoneRegex.test(data.phone)) {
            Toast.error('Numéro de téléphone invalide');
            return;
        }

        try {
            await API.createTicket(data);
            Toast.success(`Ticket "${data.subject}" créé et assigné à ${assignedAgent.name}`);
            Modal.close();
            window.loadPage('tickets');
        } catch (error) {
            Toast.error('Erreur : ' + error.message);
        }
    });

    document.querySelectorAll('#closeModalBtn, #closeModalBtnFooter').forEach(btn => {
        btn.addEventListener('click', Modal.close);
    });
}

// ============================================================
// MODALE — MODIFICATION (super_admin + chef)
// ============================================================
async function showEditTicketModal(id) {
    const user = getCurrentUser();
    if (!canEditTicket(user)) {
        Toast.error('Vous n\'êtes pas autorisé à modifier ce ticket');
        return;
    }

    const ticket = await API.getTicket(id);
    if (!ticket) return Toast.error('Ticket introuvable');

    // ✅ Utilise le helper compatible avec tous les rôles
    const agents = await fetchUsersForTickets();
    const phone = ticket.phone || '';

    const assignableUsers = agents.filter(a =>
        a.role === 'admin_systeme' && (a.status === 'active' || a.id === ticket.assignedTo)
    );

    const content = `
        <div class="modal-modern">
            <div class="modal-header">
                <div class="modal-icon" style="background: linear-gradient(135deg, #2563eb, #3b82f6);">
                    <i class="fas fa-pen"></i>
                </div>
                <div class="modal-title-group">
                    <h2>Modifier le ticket #${ticket.id}</h2>
                    <p>Mettez à jour les informations</p>
                </div>
                <button class="modal-close" id="closeModalBtn"><i class="fas fa-times"></i></button>
            </div>

            <form id="editTicketForm">
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-tag"></i> Sujet</label>
                            <input type="text" id="editTicketSubject" value="${ticket.subject || ''}" required>
                        </div>
                    </div>

                    <div class="form-row form-row-2">
                        <div class="form-group">
                            <label><i class="fas fa-user"></i> Client</label>
                            <input type="text" id="editTicketClient" value="${ticket.client || ''}" required>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-phone"></i> Téléphone</label>
                            <input type="tel" id="editTicketPhone" value="${phone}"
                                   pattern="[0-9+\\s\\-()]{6,20}" required>
                        </div>
                    </div>

                    <div class="form-row form-row-2">
                        <div class="form-group">
                            <label><i class="fas fa-circle"></i> Statut</label>
                            <select id="editTicketStatus">
                                <option value="open" ${ticket.status === 'open' ? 'selected' : ''}>🔵 Ouvert</option>
                                <option value="in_progress" ${ticket.status === 'in_progress' ? 'selected' : ''}>🟠 En cours</option>
                                <option value="resolved" ${ticket.status === 'resolved' ? 'selected' : ''}>🟢 Résolu</option>
                                <option value="closed" ${ticket.status === 'closed' ? 'selected' : ''}>⚫ Fermé</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-flag"></i> Priorité</label>
                            <select id="editTicketPriority">
                                <option value="low" ${ticket.priority === 'low' ? 'selected' : ''}>🟢 Basse</option>
                                <option value="medium" ${ticket.priority === 'medium' ? 'selected' : ''}>🟡 Moyenne</option>
                                <option value="high" ${ticket.priority === 'high' ? 'selected' : ''}>🟠 Haute</option>
                                <option value="urgent" ${ticket.priority === 'urgent' ? 'selected' : ''}>🔴 Urgente</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-user-shield"></i> Assigner à un Admin Système</label>
                            <select id="editTicketAssignedTo">
                                <option value="">— Non assigné —</option>
                                ${assignableUsers.map(a =>
                                    `<option value="${a.id}" ${ticket.assignedTo === a.id ? 'selected' : ''}>${a.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-align-left"></i> Description</label>
                            <textarea id="editTicketDescription" rows="4" required>${ticket.description || ''}</textarea>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" id="closeModalBtnFooter" class="btn-secondary">Annuler</button>
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-save"></i> Mettre à jour
                    </button>
                </div>
            </form>
        </div>
    `;

    Modal.show(content);

    document.getElementById('editTicketForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            subject:     document.getElementById('editTicketSubject').value.trim(),
            client:      document.getElementById('editTicketClient').value.trim(),
            phone:       document.getElementById('editTicketPhone').value.trim(),
            status:      document.getElementById('editTicketStatus').value,
            priority:    document.getElementById('editTicketPriority').value,
            assignedTo:  document.getElementById('editTicketAssignedTo').value || null,
            description: document.getElementById('editTicketDescription').value.trim()
        };

        const phoneRegex = /^[0-9+\s\-()]{6,20}$/;
        if (data.phone && !phoneRegex.test(data.phone)) {
            return Toast.error('Numéro de téléphone invalide');
        }

        try {
            await API.updateTicket(id, data);
            Toast.success(`Ticket #${id} mis à jour !`);
            Modal.close();
            window.loadPage('tickets');
        } catch (error) { Toast.error('Erreur : ' + error.message); }
    });

    document.querySelectorAll('#closeModalBtn, #closeModalBtnFooter').forEach(btn => {
        btn.addEventListener('click', Modal.close);
    });
}

// ============================================================
// SUPPRESSION (super_admin uniquement)
// ============================================================
async function deleteTicket(id) {
    const user = getCurrentUser();
    if (!canDeleteTicket(user)) {
        Toast.error('Seul le Super Admin peut supprimer un ticket');
        return;
    }

    const ticket = await API.getTicket(id);
    if (!ticket) return;

    if (confirm(`⚠️ SUPPRESSION DÉFINITIVE\n\nVoulez-vous vraiment supprimer le ticket #${id} "${ticket.subject}" ?\n\nCette action est irréversible.`)) {
        try {
            await API.deleteTicket(id);
            Toast.success(`Ticket #${id} supprimé`);
            window.loadPage('tickets');
        } catch (error) { Toast.error('Erreur : ' + error.message); }
    }
}

// ============================================================
// STYLES
// ============================================================
(function injectStyles() {
    if (document.getElementById('ticketsStyles')) return;
    const style = document.createElement('style');
    style.id = 'ticketsStyles';
    style.textContent = `
        /* Bandeau contextuel rôle */
        .tickets-role-banner {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 14px 20px;
            border-radius: var(--radius);
            margin-bottom: 20px;
            font-size: 14px;
            border-left: 4px solid;
        }
        .tickets-role-banner i {
            font-size: 24px;
            flex-shrink: 0;
        }
        .tickets-role-banner strong {
            display: block;
            font-size: 15px;
            margin-bottom: 2px;
        }
        .tickets-role-banner span {
            font-size: 13px;
            opacity: 0.85;
        }
        .tickets-role-banner.banner-admin-sys {
            background: #cffafe;
            border-color: #0891b2;
            color: #0e7490;
        }
        .tickets-role-banner.banner-admin-sys i { color: #0891b2; }
        .tickets-role-banner.banner-agent {
            background: #e3f2fd;
            border-color: #0d47a1;
            color: #0d47a1;
        }
        .tickets-role-banner.banner-agent i { color: #0d47a1; }
        .tickets-role-banner.banner-super {
            background: #ede9fe;
            border-color: #7c3aed;
            color: #6d28d9;
        }
        .tickets-role-banner.banner-super i { color: #7c3aed; }

        /* Stats */
        .tickets-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .tickets-stat-card { background: white; border-radius: var(--radius); padding: 20px 24px;
            display: flex; align-items: center; gap: 16px; border: 1px solid var(--gray-100); transition: var(--transition); }
        .tickets-stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
        .tickets-stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex;
            align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .tickets-stat-info { flex: 1; }
        .tickets-stat-value { font-size: 28px; font-weight: 700; color: var(--gray-900); line-height: 1; }
        .tickets-stat-label { font-size: 14px; color: var(--gray-500); margin-top: 4px; }

        /* Alertes */
        .tickets-alert { display: flex; align-items: center; gap: 12px; padding: 12px 20px;
            background: #fef3c7; border: 1px solid #fcd34d; border-radius: var(--radius);
            color: #92400e; margin-bottom: 20px; font-size: 14px; }
        .tickets-alert i { font-size: 18px; color: #f59e0b; }
        .tickets-alert-action { background: #dbeafe; border-color: #93c5fd; color: #1e40af; }
        .tickets-alert-action i { color: #2563eb; }

        /* Barre d'action */
        .tickets-actions-bar { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;
            align-items: center; background: white; padding: 16px 20px;
            border-radius: var(--radius); border: 1px solid var(--gray-100); }
        .tickets-search-wrapper { flex: 1; position: relative; min-width: 200px; }
        .tickets-search-wrapper i { position: absolute; left: 14px; top: 50%;
            transform: translateY(-50%); color: var(--gray-400); font-size: 14px; }
        .tickets-search-input { width: 100%; padding: 10px 14px 10px 42px;
            border: 2px solid var(--gray-200); border-radius: var(--radius-sm);
            font-size: 14px; font-family: inherit; transition: var(--transition); background: var(--gray-50); }
        .tickets-search-input:focus { outline: none; border-color: var(--orange-500);
            background: white; box-shadow: 0 0 0 4px rgba(245,124,0,0.08); }
        .tickets-filter-group { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .tickets-filter-select { padding: 10px 14px; border: 2px solid var(--gray-200);
            border-radius: var(--radius-sm); font-size: 14px; font-family: inherit;
            background: var(--gray-50); color: var(--gray-700); cursor: pointer; transition: var(--transition); }
        .tickets-btn-add { padding: 10px 20px; background: var(--orange-gradient); color: white;
            border: none; border-radius: var(--radius-sm); font-weight: 600; font-size: 14px;
            cursor: pointer; transition: var(--transition); display: flex; align-items: center;
            gap: 8px; font-family: inherit; }
        .tickets-btn-add:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(245,124,0,0.35); }

        /* Liste */
        .tickets-list { display: flex; flex-direction: column; gap: 12px; }
        .ticket-item { display: flex; gap: 16px; background: white; border-radius: var(--radius);
            border: 1px solid var(--gray-100); padding: 16px 20px 16px 0;
            transition: var(--transition); position: relative; overflow: hidden; }
        .ticket-item:hover { box-shadow: var(--shadow-lg); border-color: var(--orange-200); transform: translateY(-2px); }
        .ticket-item.needs-action { border-color: #fbbf24; background: linear-gradient(90deg, rgba(251,191,36,0.04), white); }
        .ticket-priority-bar { width: 4px; border-radius: 0 4px 4px 0; flex-shrink: 0; }
        .ticket-avatar { width: 44px; height: 44px; border-radius: 50%; display: flex;
            align-items: center; justify-content: center; color: white; font-weight: 700;
            font-size: 15px; flex-shrink: 0; margin-left: 12px; }
        .ticket-content { flex: 1; min-width: 0; }
        .ticket-header { display: flex; justify-content: space-between; align-items: flex-start;
            gap: 12px; flex-wrap: wrap; margin-bottom: 6px; }
        .ticket-title-group { display: flex; align-items: center; gap: 10px; min-width: 0; flex-wrap: wrap; }
        .ticket-id { font-size: 12px; font-weight: 700; color: var(--gray-400);
            background: var(--gray-100); padding: 2px 8px; border-radius: 6px; }
        .ticket-subject { font-size: 15px; font-weight: 700; color: var(--gray-900);
            margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 320px; }
        .ticket-action-badge { font-size: 11px; font-weight: 700; padding: 3px 10px;
            border-radius: 20px; background: #fef3c7; color: #92400e;
            display: inline-flex; align-items: center; gap: 4px; }
        .ticket-relance-badge { font-size: 11px; font-weight: 700; padding: 3px 10px;
            border-radius: 20px; background: #fee2e2; color: #dc2626;
            display: inline-flex; align-items: center; gap: 4px; }
        .ticket-wait-badge { font-size: 11px; font-weight: 700; padding: 3px 10px;
            border-radius: 20px; background: #e0e7ff; color: #4338ca;
            display: inline-flex; align-items: center; gap: 4px; }
        .ticket-badges { display: flex; gap: 6px; flex-shrink: 0; }
        .ticket-badge { font-size: 11px; font-weight: 700; padding: 3px 10px;
            border-radius: 20px; text-transform: uppercase; letter-spacing: 0.3px; }
        .ticket-badge.priority-low { background: #e8f5e9; color: #2e7d32; }
        .ticket-badge.priority-medium { background: #fff8e1; color: #f57c00; }
        .ticket-badge.priority-high { background: #fff3e0; color: #e65100; }
        .ticket-badge.priority-urgent { background: #ffebee; color: #c62828; }
        .ticket-badge.status-open { background: #e3f2fd; color: #0d47a1; }
        .ticket-badge.status-in_progress { background: #fff3e0; color: #e65100; }
        .ticket-badge.status-resolved { background: #e8f5e9; color: #2e7d32; }
        .ticket-badge.status-closed { background: #f5f5f5; color: #616161; }
        .ticket-description { font-size: 13px; color: var(--gray-600); margin-bottom: 10px; line-height: 1.5; }
        .ticket-footer { display: flex; flex-wrap: wrap; gap: 16px; align-items: center;
            font-size: 12px; color: var(--gray-500); }
        .ticket-meta i { margin-right: 4px; color: var(--gray-400); }
        .ticket-meta-phone i { color: var(--orange-500); }
        .ticket-phone-link { color: var(--orange-600); font-weight: 600;
            text-decoration: none; transition: var(--transition); }
        .ticket-phone-link:hover { color: var(--orange-500); text-decoration: underline; }
        .ticket-actions { display: flex; gap: 4px; margin-left: auto; }
        .ticket-btn { background: none; border: none; cursor: pointer; padding: 6px 10px;
            border-radius: 6px; transition: var(--transition); color: var(--gray-500); font-size: 13px; }
        .ticket-btn:hover { background: var(--gray-100); color: var(--orange-600); }
        .ticket-btn.delete-ticket:hover { background: #fee2e2; color: #dc2626; }

        /* Empty */
        .tickets-empty { text-align: center; padding: 60px 20px; background: white;
            border-radius: var(--radius); border: 2px dashed var(--gray-200); }
        .tickets-empty h3 { font-size: 20px; color: var(--gray-700); margin-bottom: 4px; }

        /* Vue ticket */
        .modal-ticket-view { max-width: 780px; }
        .ticket-view-badges { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
        .ticket-view-badges .ticket-badge { padding: 6px 14px; font-size: 12px; }
        .ticket-view-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .ticket-view-item label { display: block; font-size: 12px; color: var(--gray-500); margin-bottom: 4px; }
        .ticket-view-item label i { color: var(--orange-500); margin-right: 4px; }
        .ticket-view-item p { font-size: 14px; font-weight: 600; color: var(--gray-800); margin: 0; }
        .ticket-view-item p .ticket-phone-link { display: inline-flex; align-items: center;
            gap: 6px; padding: 4px 10px; background: rgba(245,124,0,0.1); border-radius: 8px; }
        .ticket-view-description { background: var(--gray-50); border-radius: var(--radius-sm);
            padding: 16px; margin-bottom: 20px; }
        .ticket-view-description label { display: block; font-size: 12px; color: var(--gray-500); margin-bottom: 6px; }
        .ticket-view-description label i { color: var(--orange-500); margin-right: 4px; }
        .ticket-view-description p { font-size: 14px; line-height: 1.6; color: var(--gray-700);
            margin: 0; white-space: pre-wrap; }

        /* Fil de discussion */
        .ticket-thread-section { border-top: 1px solid var(--gray-100); padding-top: 16px; }
        .ticket-thread-title { font-size: 14px; font-weight: 700; color: var(--gray-700);
            margin: 0 0 12px; display: flex; align-items: center; gap: 8px; }
        .ticket-thread-title i { color: var(--orange-500); }
        .ticket-thread { display: flex; flex-direction: column; gap: 10px; max-height: 320px;
            overflow-y: auto; padding: 4px; margin-bottom: 12px; }
        .ticket-thread-empty { text-align: center; padding: 24px; color: var(--gray-400);
            font-size: 13px; }
        .ticket-thread-empty i { font-size: 24px; display: block; margin-bottom: 8px; opacity: 0.5; }
        .ticket-thread-item { display: flex; gap: 10px; padding: 10px 12px;
            background: var(--gray-50); border-radius: var(--radius-sm); border-left: 3px solid var(--gray-300); }
        .ticket-thread-item.thread-type-resolution { background: #ecfdf5; border-left-color: #10b981; }
        .ticket-thread-item.thread-type-rejection { background: #fff7ed; border-left-color: #f97316; }
        .ticket-thread-item.thread-type-relance { background: #fef2f2; border-left-color: #ef4444; }
        .ticket-thread-item.thread-type-validation { background: #ecfdf5; border-left-color: #059669; }
        .ticket-thread-item.thread-type-status { background: #eff6ff; border-left-color: #3b82f6; }
        .ticket-thread-avatar { width: 32px; height: 32px; border-radius: 50%;
            background: var(--orange-gradient); color: white; display: flex;
            align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .ticket-thread-content { flex: 1; min-width: 0; }
        .ticket-thread-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
            margin-bottom: 4px; font-size: 11px; color: var(--gray-500); }
        .ticket-thread-meta strong { color: var(--gray-800); font-size: 12px; }
        .thread-role { background: var(--gray-200); color: var(--gray-700);
            padding: 1px 8px; border-radius: 10px; font-weight: 600; }
        .thread-type-label { background: rgba(245,124,0,0.15); color: var(--orange-600);
            padding: 1px 8px; border-radius: 10px; font-weight: 600; }
        .thread-date { margin-left: auto; font-style: italic; }
        .ticket-thread-text { font-size: 13px; color: var(--gray-700); line-height: 1.5; word-wrap: break-word; }

        /* Formulaire commentaire */
        .ticket-comment-form { display: flex; gap: 8px; align-items: flex-start; }
        .ticket-comment-form textarea { flex: 1; padding: 10px 14px;
            border: 2px solid var(--gray-200); border-radius: var(--radius-sm);
            font-size: 14px; font-family: inherit; resize: vertical; min-height: 44px;
            background: var(--gray-50); transition: var(--transition); }
        .ticket-comment-form textarea:focus { outline: none; border-color: var(--orange-500);
            background: white; box-shadow: 0 0 0 4px rgba(245,124,0,0.08); }
        .btn-send-comment { padding: 10px 16px; background: var(--orange-gradient);
            color: white; border: none; border-radius: var(--radius-sm); font-weight: 600;
            font-size: 13px; cursor: pointer; display: flex; align-items: center;
            gap: 6px; transition: var(--transition); white-space: nowrap; }
        .btn-send-comment:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(245,124,0,0.3); }
        .ticket-thread-closed { padding: 12px; text-align: center; color: var(--gray-500);
            font-size: 13px; background: var(--gray-50); border-radius: var(--radius-sm);
            display: flex; align-items: center; justify-content: center; gap: 8px; }

        /* Actions footer */
        .modal-footer-actions { flex-wrap: wrap; gap: 8px; }
        .btn-action { padding: 10px 16px; border: none; border-radius: var(--radius-sm);
            font-weight: 600; font-size: 13px; cursor: pointer; display: inline-flex;
            align-items: center; gap: 6px; transition: var(--transition); font-family: inherit; }
        .btn-resolve { background: #10b981; color: white; }
        .btn-resolve:hover { background: #059669; transform: translateY(-1px); }
        .btn-not-resolve { background: #f97316; color: white; }
        .btn-not-resolve:hover { background: #ea580c; transform: translateY(-1px); }
        .btn-validate { background: #059669; color: white; }
        .btn-validate:hover { background: #047857; transform: translateY(-1px); }
        .btn-relance { background: #dc2626; color: white; }
        .btn-relance:hover { background: #b91c1c; transform: translateY(-1px); }
        .btn-call { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px;
            background: #4caf50; color: white; border: none; border-radius: var(--radius-sm);
            font-weight: 600; font-size: 14px; cursor: pointer; text-decoration: none;
            transition: var(--transition); margin-right: auto; }
        .btn-call:hover { background: #43a047; transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(76,175,80,0.35); }

        /* Formulaires */
        .form-row { margin-bottom: 16px; }
        .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-group label { display: block; font-size: 14px; font-weight: 600;
            color: var(--gray-700); margin-bottom: 6px; }
        .form-group label i { color: var(--orange-500); margin-right: 6px; }
        .form-group input, .form-group select, .form-group textarea { width: 100%;
            padding: 12px 16px; border: 2px solid var(--gray-200);
            border-radius: var(--radius-sm); font-size: 15px; font-family: inherit;
            transition: var(--transition); background: var(--gray-50); color: var(--gray-800); }
        .form-group textarea { resize: vertical; min-height: 100px; }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
            outline: none; border-color: var(--orange-500); background: white;
            box-shadow: 0 0 0 4px rgba(245,124,0,0.08); }

        /* Responsive */
        @media (max-width: 1024px) { .tickets-stats-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 768px) {
            .tickets-stats-grid { grid-template-columns: 1fr 1fr; }
            .tickets-actions-bar { flex-direction: column; align-items: stretch; }
            .tickets-filter-group { flex-direction: column; align-items: stretch; }
            .ticket-header { flex-direction: column; }
            .ticket-footer { flex-direction: column; align-items: flex-start; }
            .ticket-actions { margin-left: 0; width: 100%; justify-content: flex-end; }
            .ticket-view-grid { grid-template-columns: 1fr; }
            .form-row-2 { grid-template-columns: 1fr; }
            .ticket-subject { max-width: 100%; }
        }
        @media (max-width: 480px) {
            .tickets-stats-grid { grid-template-columns: 1fr; }
            .ticket-item { padding: 14px 14px 14px 0; }
            .ticket-avatar { margin-left: 8px; }
            .modal-footer-actions { flex-direction: column; }
            .modal-footer-actions > * { width: 100%; justify-content: center; }
            .btn-call { margin-right: 0; }
        }
    `;
    document.head.appendChild(style);
})();