// web/js/modules/agents.js
import { API } from '../services/api.js';
import { state } from '../services/state.js';
import { Toast } from '../components/toast.js';
import { Modal } from '../components/modal.js';

// ============================================
// PERMISSIONS GLOBALES (exposées par app.js)
// ============================================
const P = window.Permissions || {};

// ============================================
// MÉTADONNÉES DES RÔLES (label / icône / couleur)
// ============================================
const ROLE_META = {
    super_admin:   { label: 'Super Admin',   icon: 'fa-shield-halved', color: '#7c3aed', badge: 'super-admin' },
    chef:          { label: 'Chef Service',  icon: 'fa-crown',         color: '#f57c00', badge: 'chef' },
    agent:         { label: 'Opérateur',     icon: 'fa-user-tie',      color: '#0d47a1', badge: 'agent' },
    admin_systeme: { label: 'Admin Système', icon: 'fa-user-shield',   color: '#0891b2', badge: 'admin-sys' },
};

// ============================================
// FILTRE : quels utilisateurs le currentUser peut-il voir ?
// ============================================
function filterVisibleUsers(users, currentUser) {
    if (!currentUser) return [];
    const role = currentUser.role;

    if (role === 'super_admin') {
        // Le super_admin voit tout le monde SAUF les autres super_admins (pour éviter
        // qu'il se supprime lui-même par erreur). On peut aussi le laisser voir tous
        // si tu préfères — ici on masque juste son propre compte.
        return users.filter(u => u.id !== currentUser.id);
    }

    if (role === 'chef') {
        // Le chef ne voit QUE les opérateurs (agents)
        return users.filter(u => u.role === 'agent');
    }

    // Les autres rôles n'ont pas accès à cette page
    return [];
}

// ============================================
// RENDER
// ============================================
export async function render() {
    const currentUser = state.getUser();
    const allAgents = await API.getAgents();

    // ✅ NOUVEAU : filtre selon les droits
    const agents = filterVisibleUsers(allAgents, currentUser);

    const isSuperAdmin = P.isSuperAdmin?.(currentUser) || currentUser?.role === 'super_admin';
    const isChef       = P.isChef?.(currentUser)       || currentUser?.role === 'chef';
    const canCreate    = isSuperAdmin || isChef;

    // ===== Statistiques dynamiques =====
    const total     = agents.length;
    const active    = agents.filter(a => a.status === 'active').length;
    const suspended = agents.filter(a => a.status === 'suspended').length;
    const chefs     = agents.filter(a => a.role === 'chef').length;
    const adminsSys = agents.filter(a => a.role === 'admin_systeme').length;
    const operators = agents.filter(a => a.role === 'agent').length;

    // ✅ NOUVEAU : les cartes stats s'adaptent au rôle
    const statsCards = isSuperAdmin ? `
        <div class="agents-stat-card">
            <div class="agents-stat-icon" style="background: rgba(245, 124, 0, 0.12); color: #f57c00;">
                <i class="fas fa-users"></i>
            </div>
            <div class="agents-stat-info">
                <div class="agents-stat-value">${total}</div>
                <div class="agents-stat-label">Total utilisateurs</div>
            </div>
        </div>
        <div class="agents-stat-card">
            <div class="agents-stat-icon" style="background: rgba(245, 124, 0, 0.12); color: #f57c00;">
                <i class="fas fa-crown"></i>
            </div>
            <div class="agents-stat-info">
                <div class="agents-stat-value">${chefs}</div>
                <div class="agents-stat-label">Chefs Service</div>
            </div>
        </div>
        <div class="agents-stat-card">
            <div class="agents-stat-icon" style="background: rgba(13, 71, 161, 0.12); color: #0d47a1;">
                <i class="fas fa-user-tie"></i>
            </div>
            <div class="agents-stat-info">
                <div class="agents-stat-value">${operators}</div>
                <div class="agents-stat-label">Opérateurs</div>
            </div>
        </div>
        <div class="agents-stat-card">
            <div class="agents-stat-icon" style="background: rgba(8, 145, 178, 0.12); color: #0891b2;">
                <i class="fas fa-user-shield"></i>
            </div>
            <div class="agents-stat-info">
                <div class="agents-stat-value">${adminsSys}</div>
                <div class="agents-stat-label">Admins Système</div>
            </div>
        </div>
    ` : `
        <div class="agents-stat-card">
            <div class="agents-stat-icon" style="background: rgba(245, 124, 0, 0.12); color: #f57c00;">
                <i class="fas fa-users"></i>
            </div>
            <div class="agents-stat-info">
                <div class="agents-stat-value">${total}</div>
                <div class="agents-stat-label">Total opérateurs</div>
            </div>
        </div>
        <div class="agents-stat-card">
            <div class="agents-stat-icon" style="background: rgba(46, 125, 50, 0.12); color: #2e7d32;">
                <i class="fas fa-user-check"></i>
            </div>
            <div class="agents-stat-info">
                <div class="agents-stat-value">${active}</div>
                <div class="agents-stat-label">Actifs</div>
            </div>
        </div>
        <div class="agents-stat-card">
            <div class="agents-stat-icon" style="background: rgba(239, 68, 68, 0.12); color: #dc2626;">
                <i class="fas fa-user-slash"></i>
            </div>
            <div class="agents-stat-info">
                <div class="agents-stat-value">${suspended}</div>
                <div class="agents-stat-label">Suspendus</div>
            </div>
        </div>
        <div class="agents-stat-card">
            <div class="agents-stat-icon" style="background: rgba(255, 152, 0, 0.12); color: #ff9800;">
                <i class="fas fa-comments"></i>
            </div>
            <div class="agents-stat-info">
                <div class="agents-stat-value">${active}</div>
                <div class="agents-stat-label">Disponibles</div>
            </div>
        </div>
    `;

    // ✅ NOUVEAU : libellé du bouton d'ajout selon le rôle
    const addButtonLabel = isSuperAdmin ? 'Nouvel utilisateur' : 'Nouvel opérateur';

    let html = `
        <!-- ============================================ -->
        <!-- STATISTIQUES                                  -->
        <!-- ============================================ -->
        <div class="agents-stats-grid">
            ${statsCards}
        </div>

        <!-- ============================================ -->
        <!-- BARRE D'ACTION                                -->
        <!-- ============================================ -->
        <div class="agents-actions-bar">
            <div class="agents-search-wrapper">
                <i class="fas fa-search"></i>
                <input type="text" id="searchAgent" placeholder="Rechercher un utilisateur..." class="agents-search-input">
            </div>
            <div class="agents-filter-group">
                <select id="filterStatus" class="agents-filter-select">
                    <option value="all">Tous les statuts</option>
                    <option value="active">✅ Actifs</option>
                    <option value="suspended">⛔ Suspendus</option>
                </select>
                ${isSuperAdmin ? `
                    <select id="filterRole" class="agents-filter-select">
                        <option value="all">Tous les rôles</option>
                        <option value="chef">👑 Chefs Service</option>
                        <option value="agent">🛠 Opérateurs</option>
                        <option value="admin_systeme">🛡 Admins Système</option>
                    </select>
                ` : ''}
                ${canCreate ? `
                    <button class="agents-btn-add" id="addAgentBtn">
                        <i class="fas fa-plus"></i> ${addButtonLabel}
                    </button>
                ` : ''}
            </div>
        </div>

        <!-- ============================================ -->
        <!-- GRILLE DES UTILISATEURS                       -->
        <!-- ============================================ -->
        <div class="agents-grid" id="agentsGrid">
    `;

    if (agents.length === 0) {
        html += `
            <div class="agents-empty">
                <i class="fas fa-users" style="font-size:48px;color:var(--gray-300);margin-bottom:16px;"></i>
                <h3>Aucun utilisateur trouvé</h3>
                <p style="color:var(--gray-500);">
                    ${isSuperAdmin
                        ? 'Commencez par créer un Chef Service ou un Admin Système'
                        : 'Commencez par créer votre premier opérateur'}
                </p>
                ${canCreate ? `
                    <button class="agents-btn-add" id="addAgentBtnEmpty" style="margin-top:16px;">
                        <i class="fas fa-plus"></i> ${addButtonLabel}
                    </button>
                ` : ''}
            </div>
        `;
    } else {
        agents.forEach(agent => {
            const statusClass = agent.status === 'active' ? 'active' : 'suspended';
            const statusText  = agent.status === 'active' ? 'Actif' : 'Suspendu';
            const statusColor = agent.status === 'active' ? '#4caf50' : '#ef4444';

            const roleMeta = ROLE_META[agent.role] || ROLE_META.agent;

            // Initiales
            const initials = (agent.name || '?')
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);

            // Couleur d'avatar stable
            const avatarColors = ['#f57c00', '#2e7d32', '#ff9800', '#4caf50', '#2563eb', '#7c3aed', '#dc2626', '#0891b2'];
            const avatarColor = avatarColors[agent.id % avatarColors.length];

            // ✅ NOUVEAU : boutons visibles selon les permissions
            const canEditThis    = P.canEditUser?.(currentUser, agent)    ?? (isSuperAdmin || (isChef && agent.role === 'agent'));
            const canSuspendThis = P.canSuspendUser?.(currentUser, agent) ?? (isSuperAdmin || (isChef && agent.role === 'agent'));
            const canDeleteThis  = P.canDeleteUser?.(currentUser)         ?? isSuperAdmin;

            // Empêcher un super_admin de se suspendre / se supprimer lui-même
            const isSelf = agent.id === currentUser.id;

            html += `
                <div class="agent-card" data-id="${agent.id}" data-status="${agent.status}" data-role="${agent.role}">
                    <div class="agent-card-header">
                        <div class="agent-card-status">
                            <span class="status-indicator ${statusClass}">
                                <i class="fas fa-circle" style="color: ${statusColor}; font-size: 10px;"></i>
                                ${statusText}
                            </span>
                            <div class="agent-card-actions">
                                ${canEditThis && !isSelf ? `
                                    <button class="agent-action-btn edit-agent" data-id="${agent.id}" title="Modifier">
                                        <i class="fas fa-pen" style="color: #2563eb;"></i>
                                    </button>
                                    <button class="agent-action-btn reset-password" data-id="${agent.id}" title="Réinitialiser le mot de passe">
                                        <i class="fas fa-key" style="color: #f59e0b;"></i>
                                    </button>
                                ` : ''}
                                ${canSuspendThis && !isSelf ? `
                                    <button class="agent-action-btn toggle-agent" data-id="${agent.id}"
                                            title="${agent.status === 'active' ? 'Suspendre' : 'Réactiver'}">
                                        <i class="fas ${agent.status === 'active' ? 'fa-pause' : 'fa-play'}"
                                           style="color: ${agent.status === 'active' ? '#f59e0b' : '#22c55e'};"></i>
                                    </button>
                                ` : ''}
                                ${canDeleteThis && !isSelf ? `
                                    <button class="agent-action-btn delete-agent" data-id="${agent.id}" title="Supprimer">
                                        <i class="fas fa-trash" style="color: #ef4444;"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="agent-card-body">
                        <div class="agent-card-avatar" style="background: ${avatarColor};">
                            ${initials}
                        </div>
                        <div class="agent-card-info">
                            <div class="agent-card-name">${agent.name}</div>
                            <div class="agent-card-email">${agent.email}</div>
                            <div class="agent-card-meta">
                                <span class="agent-card-role ${roleMeta.badge}">
                                    <i class="fas ${roleMeta.icon}"></i> ${roleMeta.label}
                                </span>
                                <span class="agent-card-id">ID: #${agent.id}</span>
                            </div>
                        </div>
                    </div>
                    <div class="agent-card-footer">
                        <div class="agent-card-stats">
                            <div class="agent-stat-item">
                                <i class="fas fa-comment"></i>
                                <span>${agent.messages || 0} messages</span>
                            </div>
                            <div class="agent-stat-item">
                                <i class="fas fa-clock"></i>
                                <span>${agent.avgTime || '0h'}</span>
                            </div>
                            <div class="agent-stat-item">
                                <i class="fas fa-star" style="color: #ff9800;"></i>
                                <span>${agent.rating || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    html += `</div>`;

    return html;
}

// ============================================
// INIT
// ============================================
export function init() {
    const addBtn = document.getElementById('addAgentBtn');
    if (addBtn) addBtn.addEventListener('click', () => showAddUserModal());

    const addBtnEmpty = document.getElementById('addAgentBtnEmpty');
    if (addBtnEmpty) addBtnEmpty.addEventListener('click', () => showAddUserModal());

    document.querySelectorAll('.edit-agent').forEach(btn => {
        btn.addEventListener('click', function () {
            showEditUserModal(parseInt(this.dataset.id));
        });
    });

    document.querySelectorAll('.reset-password').forEach(btn => {
        btn.addEventListener('click', function () {
            showResetPasswordModal(parseInt(this.dataset.id));
        });
    });

    document.querySelectorAll('.toggle-agent').forEach(btn => {
        btn.addEventListener('click', function () {
            toggleUser(parseInt(this.dataset.id));
        });
    });

    document.querySelectorAll('.delete-agent').forEach(btn => {
        btn.addEventListener('click', function () {
            deleteUser(parseInt(this.dataset.id));
        });
    });

    document.getElementById('searchAgent')?.addEventListener('input', filterAgents);
    document.getElementById('filterStatus')?.addEventListener('change', filterAgents);
    document.getElementById('filterRole')?.addEventListener('change', filterAgents);
}

// ============================================
// FILTRES
// ============================================
function filterAgents() {
    const search = (document.getElementById('searchAgent')?.value || '').toLowerCase().trim();
    const status = document.getElementById('filterStatus')?.value || 'all';
    const role   = document.getElementById('filterRole')?.value || 'all';

    document.querySelectorAll('.agent-card').forEach(card => {
        const name  = card.querySelector('.agent-card-name')?.textContent?.toLowerCase() || '';
        const email = card.querySelector('.agent-card-email')?.textContent?.toLowerCase() || '';
        const cardStatus = card.dataset.status || 'active';
        const cardRole   = card.dataset.role || 'agent';

        const matchSearch = name.includes(search) || email.includes(search);
        const matchStatus = status === 'all' || cardStatus === status;
        const matchRole   = role === 'all' || cardRole === role;

        card.style.display = (matchSearch && matchStatus && matchRole) ? '' : 'none';
    });
}

// ============================================
// UTILISATEUR COURANT (helper)
// ============================================
function getCurrentUser() {
    return state.getUser();
}

// ============================================
// GÉNÉRATION DES OPTIONS DE RÔLE SELON LE CREATEUR
// ============================================
function buildRoleOptionsHtml(currentUser, selectedRole = null) {
    const isSuperAdmin = currentUser?.role === 'super_admin';
    const isChef       = currentUser?.role === 'chef';

    // SUPER ADMIN : peut créer Chef OU Admin Système
    if (isSuperAdmin) {
        const isChefChecked = selectedRole === 'chef' || selectedRole === null;
        const isSysChecked  = selectedRole === 'admin_systeme';
        return `
            <label class="role-option">
                <input type="radio" name="role" value="chef" ${isChefChecked ? 'checked' : ''}>
                <span class="role-card">
                    <i class="fas fa-crown"></i>
                    <strong>Chef Service</strong>
                    <small>Supervise la plateforme</small>
                </span>
            </label>
            <label class="role-option">
                <input type="radio" name="role" value="admin_systeme" ${isSysChecked ? 'checked' : ''}>
                <span class="role-card">
                    <i class="fas fa-user-shield"></i>
                    <strong>Admin Système</strong>
                    <small>Traite les tickets</small>
                </span>
            </label>
        `;
    }

    // CHEF : ne peut créer QUE des opérateurs
    if (isChef) {
        return `
            <label class="role-option">
                <input type="radio" name="role" value="agent" checked>
                <span class="role-card">
                    <i class="fas fa-user-tie"></i>
                    <strong>Opérateur</strong>
                    <small>Support client</small>
                </span>
            </label>
        `;
    }

    return '';
}

// ============================================
// TITRE DYNAMIQUE DE LA MODALE
// ============================================
function getAddModalTitle(currentUser) {
    if (currentUser?.role === 'super_admin') return 'Nouvel utilisateur';
    if (currentUser?.role === 'chef')        return 'Nouvel opérateur';
    return 'Nouvel utilisateur';
}

function getAddModalSubtitle(currentUser) {
    if (currentUser?.role === 'super_admin') {
        return 'Créez un Chef Service Client ou un Admin Système';
    }
    if (currentUser?.role === 'chef') {
        return 'Ajoutez un nouvel opérateur à votre équipe';
    }
    return 'Ajoutez un nouvel utilisateur';
}

// ============================================
// MODALE AJOUT
// ============================================
function showAddUserModal() {
    const currentUser = getCurrentUser();
    const roleOptions = buildRoleOptionsHtml(currentUser);

    const content = `
        <div class="modal-modern">
            <div class="modal-header">
                <div class="modal-icon">
                    <i class="fas fa-user-plus"></i>
                </div>
                <div class="modal-title-group">
                    <h2>${getAddModalTitle(currentUser)}</h2>
                    <p>${getAddModalSubtitle(currentUser)}</p>
                </div>
                <button class="modal-close" id="closeModalBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <form id="agentForm">
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-user"></i> Nom complet</label>
                            <input type="text" id="agentName" placeholder="Ex: Ali Mainassara" required>
                            <span class="input-hint">Nom et prénom de l'utilisateur</span>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-envelope"></i> Email</label>
                            <input type="email" id="agentEmail" placeholder="utilisateur@exemple.com" required>
                            <span class="input-hint">Adresse email professionnelle</span>
                        </div>
                    </div>

                    <div class="form-row form-row-2">
                        <div class="form-group">
                            <label><i class="fas fa-briefcase"></i> Rôle</label>
                            <div class="role-selector">
                                ${roleOptions}
                            </div>
                        </div>

                        <div class="form-group">
                            <label><i class="fas fa-lock"></i> Mot de passe</label>
                            <div class="password-wrapper">
                                <input type="password" id="agentPassword" placeholder="••••••••" required minlength="6">
                                <button type="button" class="password-toggle" onclick="window.togglePasswordVisibility(this)">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                            <span class="input-hint">Minimum 6 caractères</span>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" id="closeModalBtnFooter" class="btn-secondary">Annuler</button>
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-plus"></i> Créer
                    </button>
                </div>
            </form>
        </div>
    `;

    Modal.show(content);

    // Activation visuelle du rôle sélectionné
    document.querySelectorAll('input[name="role"]').forEach(radio => {
        radio.addEventListener('change', function () {
            document.querySelectorAll('.role-option').forEach(opt => {
                opt.classList.toggle('active', opt.querySelector('input').checked);
            });
        });
    });
    const firstRadio = document.querySelector('input[name="role"]');
    if (firstRadio) firstRadio.dispatchEvent(new Event('change'));

    document.getElementById('agentForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name     = document.getElementById('agentName').value.trim();
        const email    = document.getElementById('agentEmail').value.trim();
        const role     = document.querySelector('input[name="role"]:checked')?.value || 'agent';
        const password = document.getElementById('agentPassword').value;

        if (!name || !email || !password) {
            Toast.error('Veuillez remplir tous les champs');
            return;
        }
        if (password.length < 6) {
            Toast.error('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        // ✅ Vérification de sécurité côté client
        const me = getCurrentUser();
        if (me.role === 'chef' && role !== 'agent') {
            Toast.error('Vous ne pouvez créer que des opérateurs');
            return;
        }
        if (me.role === 'super_admin' && !['chef', 'admin_systeme'].includes(role)) {
            Toast.error('Rôle non autorisé');
            return;
        }

        try {
            await API.createAgent({ name, email, role, password });
            Toast.success(`Utilisateur "${name}" créé avec succès !`);
            Modal.close();
            window.loadPage('agents');
        } catch (error) {
            Toast.error('Erreur: ' + error.message);
        }
    });

    document.querySelectorAll('#closeModalBtn, #closeModalBtnFooter').forEach(btn => {
        btn.addEventListener('click', Modal.close);
    });
}

// ============================================
// MODALE MODIFICATION
// ============================================
async function showEditUserModal(id) {
    const agent = await API.getAgent(id);
    if (!agent) {
        Toast.error('Utilisateur non trouvé');
        return;
    }

    const me = getCurrentUser();

    // ✅ Vérification des droits
    const canEdit = (me.role === 'super_admin') || (me.role === 'chef' && agent.role === 'agent');
    if (!canEdit) {
        Toast.error('Vous n\'avez pas les droits pour modifier cet utilisateur');
        return;
    }

    // Le chef ne peut pas changer le rôle d'un utilisateur (il ne gère que des agents)
    const canChangeRole = me.role === 'super_admin';

    // Options de rôle pour la modif (seul le super_admin peut changer)
    let roleOptions = '';
    if (canChangeRole) {
        roleOptions = buildRoleOptionsHtml(me, agent.role);
    } else {
        const meta = ROLE_META[agent.role] || ROLE_META.agent;
        roleOptions = `
            <div class="role-locked" style="padding:14px;background:var(--gray-50);border-radius:10px;border:2px dashed var(--gray-200);text-align:center;">
                <i class="fas ${meta.icon}" style="color:${meta.color};font-size:24px;"></i>
                <strong style="display:block;margin-top:6px;color:var(--gray-700);">${meta.label}</strong>
                <small style="color:var(--gray-400);">Le rôle ne peut pas être modifié</small>
            </div>
        `;
    }

    const content = `
        <div class="modal-modern">
            <div class="modal-header">
                <div class="modal-icon" style="background: linear-gradient(135deg, #2563eb, #3b82f6);">
                    <i class="fas fa-pen"></i>
                </div>
                <div class="modal-title-group">
                    <h2>Modifier l'utilisateur</h2>
                    <p>Mettez à jour les informations de ${agent.name}</p>
                </div>
                <button class="modal-close" id="closeModalBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <form id="editAgentForm">
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-user"></i> Nom complet</label>
                            <input type="text" id="editAgentName" value="${agent.name}" required>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-envelope"></i> Email</label>
                            <input type="email" id="editAgentEmail" value="${agent.email}" required>
                        </div>
                    </div>

                    <div class="form-row form-row-2">
                        <div class="form-group">
                            <label><i class="fas fa-briefcase"></i> Rôle</label>
                            <div class="role-selector">
                                ${roleOptions}
                            </div>
                        </div>

                        <div class="form-group">
                            <label><i class="fas fa-toggle-on"></i> Statut</label>
                            <div class="status-selector">
                                <label class="status-option">
                                    <input type="radio" name="editStatus" value="active" ${agent.status === 'active' ? 'checked' : ''}>
                                    <span class="status-card active">
                                        <i class="fas fa-check-circle"></i>
                                        <strong>Actif</strong>
                                    </span>
                                </label>
                                <label class="status-option">
                                    <input type="radio" name="editStatus" value="suspended" ${agent.status === 'suspended' ? 'checked' : ''}>
                                    <span class="status-card suspended">
                                        <i class="fas fa-pause-circle"></i>
                                        <strong>Suspendu</strong>
                                    </span>
                                </label>
                            </div>
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

    // Handlers visuels
    document.querySelectorAll('input[name="role"]').forEach(radio => {
        radio.addEventListener('change', function () {
            document.querySelectorAll('.role-option').forEach(opt => {
                opt.classList.toggle('active', opt.querySelector('input').checked);
            });
        });
    });
    document.querySelectorAll('input[name="editStatus"]').forEach(radio => {
        radio.addEventListener('change', function () {
            document.querySelectorAll('.status-option').forEach(opt => {
                opt.classList.toggle('active', opt.querySelector('input').checked);
            });
        });
    });
    document.querySelectorAll('input[name="role"]:checked, input[name="editStatus"]:checked').forEach(el => {
        el.dispatchEvent(new Event('change'));
    });

    document.getElementById('editAgentForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
            name:   document.getElementById('editAgentName').value.trim(),
            email:  document.getElementById('editAgentEmail').value.trim(),
            status: document.querySelector('input[name="editStatus"]:checked')?.value || 'active',
        };

        // Le rôle n'est modifiable que par le super_admin
        if (canChangeRole) {
            data.role = document.querySelector('input[name="role"]:checked')?.value || agent.role;
        }

        try {
            await API.updateAgent(id, data);
            Toast.success(`Utilisateur "${data.name}" modifié avec succès !`);
            Modal.close();
            window.loadPage('agents');
        } catch (error) {
            Toast.error('Erreur: ' + error.message);
        }
    });

    document.querySelectorAll('#closeModalBtn, #closeModalBtnFooter').forEach(btn => {
        btn.addEventListener('click', Modal.close);
    });
}

// ============================================
// MODALE RÉINITIALISATION MOT DE PASSE
// ============================================
async function showResetPasswordModal(id) {
    const agent = await API.getAgent(id);
    if (!agent) {
        Toast.error('Utilisateur non trouvé');
        return;
    }

    const me = getCurrentUser();
    const canReset = (me.role === 'super_admin') || (me.role === 'chef' && agent.role === 'agent');
    if (!canReset) {
        Toast.error('Vous n\'avez pas les droits pour cet utilisateur');
        return;
    }

    const content = `
        <div class="modal-modern">
            <div class="modal-header">
                <div class="modal-icon" style="background: linear-gradient(135deg, #f59e0b, #f97316);">
                    <i class="fas fa-key"></i>
                </div>
                <div class="modal-title-group">
                    <h2>Réinitialiser le mot de passe</h2>
                    <p>Pour <strong>${agent.name}</strong> (${agent.email})</p>
                </div>
                <button class="modal-close" id="closeModalBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <form id="resetPasswordForm">
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-lock"></i> Nouveau mot de passe</label>
                            <div class="password-wrapper">
                                <input type="password" id="newPassword" placeholder="••••••••" required minlength="6">
                                <button type="button" class="password-toggle" onclick="window.togglePasswordVisibility(this)">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                            <span class="input-hint">Minimum 6 caractères</span>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-check-circle"></i> Confirmer le mot de passe</label>
                            <div class="password-wrapper">
                                <input type="password" id="confirmPassword" placeholder="••••••••" required>
                                <button type="button" class="password-toggle" onclick="window.togglePasswordVisibility(this)">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                            <span class="input-hint">Saisissez à nouveau le mot de passe</span>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" id="closeModalBtnFooter" class="btn-secondary">Annuler</button>
                    <button type="submit" class="btn-primary" style="background: linear-gradient(135deg, #f59e0b, #f97316);">
                        <i class="fas fa-key"></i> Réinitialiser
                    </button>
                </div>
            </form>
        </div>
    `;

    Modal.show(content);

    document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const newPassword     = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword.length < 6) {
            Toast.error('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }
        if (newPassword !== confirmPassword) {
            Toast.error('Les mots de passe ne correspondent pas');
            return;
        }

        try {
            await API.resetPassword(id, newPassword);
            Toast.success(`Mot de passe réinitialisé pour ${agent.name} !`);
            Modal.close();
            window.loadPage('agents');
        } catch (error) {
            Toast.error('Erreur: ' + error.message);
        }
    });

    document.querySelectorAll('#closeModalBtn, #closeModalBtnFooter').forEach(btn => {
        btn.addEventListener('click', Modal.close);
    });
}

// ============================================
// ACTIONS
// ============================================
async function toggleUser(id) {
    const agent = await API.getAgent(id);
    if (!agent) return;

    const me = getCurrentUser();
    const canSuspend = (me.role === 'super_admin') || (me.role === 'chef' && agent.role === 'agent');
    if (!canSuspend) {
        Toast.error('Action non autorisée');
        return;
    }

    const action = agent.status === 'active' ? 'suspendre' : 'réactiver';

    if (confirm(`⚠️ Voulez-vous ${action} "${agent.name}" ?`)) {
        try {
            await API.toggleAgent(id);
            Toast.success(`Utilisateur ${action} avec succès`);
            window.loadPage('agents');
        } catch (error) {
            Toast.error('Erreur: ' + error.message);
        }
    }
}

async function deleteUser(id) {
    const me = getCurrentUser();

    // ✅ SEUL le super_admin peut supprimer
    if (!P.canDeleteUser?.(me) && me.role !== 'super_admin') {
        Toast.error('Seul le Super Admin peut supprimer un utilisateur');
        return;
    }

    const agent = await API.getAgent(id);
    if (!agent) return;

    if (confirm(`⚠️ Voulez-vous vraiment supprimer "${agent.name}" ?\n\nCette action est IRRÉVERSIBLE.`)) {
        try {
            await API.deleteAgent(id);
            Toast.success(`Utilisateur "${agent.name}" supprimé`);
            window.loadPage('agents');
        } catch (error) {
            Toast.error('Erreur: ' + error.message);
        }
    }
}

// ============================================
// TOGGLE MOT DE PASSE
// ============================================
window.togglePasswordVisibility = function (btn) {
    const wrapper = btn.closest('.password-wrapper');
    const input = wrapper.querySelector('input');
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
};

// ============================================
// STYLES
// ============================================
(function injectStyles() {
    if (document.getElementById('agentsModuleStyles')) return;
    const agentStyles = document.createElement('style');
    agentStyles.id = 'agentsModuleStyles';
    agentStyles.textContent = `
        .agents-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 24px;
        }
        .agents-stat-card {
            background: white;
            border-radius: var(--radius);
            padding: 20px 24px;
            display: flex;
            align-items: center;
            gap: 16px;
            border: 1px solid var(--gray-100);
            transition: var(--transition);
        }
        .agents-stat-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }
        .agents-stat-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            flex-shrink: 0;
        }
        .agents-stat-info { flex: 1; }
        .agents-stat-value {
            font-size: 28px;
            font-weight: 700;
            color: var(--gray-900);
            line-height: 1;
        }
        .agents-stat-label {
            font-size: 14px;
            color: var(--gray-500);
            margin-top: 4px;
        }
        .agents-actions-bar {
            display: flex;
            gap: 16px;
            margin-bottom: 24px;
            flex-wrap: wrap;
            align-items: center;
            background: white;
            padding: 16px 20px;
            border-radius: var(--radius);
            border: 1px solid var(--gray-100);
        }
        .agents-search-wrapper {
            flex: 1;
            position: relative;
            min-width: 200px;
        }
        .agents-search-wrapper i {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--gray-400);
            font-size: 14px;
        }
        .agents-search-input {
            width: 100%;
            padding: 10px 14px 10px 42px;
            border: 2px solid var(--gray-200);
            border-radius: var(--radius-sm);
            font-size: 14px;
            font-family: inherit;
            transition: var(--transition);
            background: var(--gray-50);
        }
        .agents-search-input:focus {
            outline: none;
            border-color: var(--orange-500);
            background: white;
            box-shadow: 0 0 0 4px rgba(245, 124, 0, 0.08);
        }
        .agents-filter-group {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
        }
        .agents-filter-select {
            padding: 10px 14px;
            border: 2px solid var(--gray-200);
            border-radius: var(--radius-sm);
            font-size: 14px;
            font-family: inherit;
            background: var(--gray-50);
            color: var(--gray-700);
            cursor: pointer;
            transition: var(--transition);
        }
        .agents-filter-select:focus {
            outline: none;
            border-color: var(--orange-500);
        }
        .agents-btn-add {
            padding: 10px 20px;
            background: var(--orange-gradient);
            color: white;
            border: none;
            border-radius: var(--radius-sm);
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: var(--transition);
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: inherit;
        }
        .agents-btn-add:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(245, 124, 0, 0.35);
        }
        .agents-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 20px;
        }
        .agent-card {
            background: white;
            border-radius: var(--radius);
            border: 1px solid var(--gray-100);
            overflow: hidden;
            transition: var(--transition);
        }
        .agent-card:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-lg);
            border-color: var(--orange-200);
        }
        .agent-card-header { padding: 16px 20px 0 20px; }
        .agent-card-status {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .status-indicator {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 600;
            padding: 4px 12px;
            border-radius: 20px;
        }
        .status-indicator.active {
            background: #e8f5e9;
            color: #2e7d32;
        }
        .status-indicator.suspended {
            background: #ffebee;
            color: #c62828;
        }
        .agent-card-actions {
            display: flex;
            gap: 4px;
        }
        .agent-action-btn {
            width: 32px;
            height: 32px;
            border: none;
            background: transparent;
            border-radius: 6px;
            cursor: pointer;
            transition: var(--transition);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
        }
        .agent-action-btn:hover {
            background: var(--gray-100);
            transform: scale(1.1);
        }
        .agent-card-body {
            padding: 16px 20px;
            display: flex;
            align-items: center;
            gap: 16px;
        }
        .agent-card-avatar {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 20px;
            flex-shrink: 0;
        }
        .agent-card-info { flex: 1; min-width: 0; }
        .agent-card-name {
            font-size: 16px;
            font-weight: 700;
            color: var(--gray-900);
        }
        .agent-card-email {
            font-size: 14px;
            color: var(--gray-500);
            margin-top: 2px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .agent-card-meta {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 6px;
            flex-wrap: wrap;
        }
        .agent-card-role {
            font-size: 12px;
            font-weight: 600;
            padding: 2px 10px;
            border-radius: 12px;
        }
        .agent-card-role.agent        { background: #e3f2fd; color: #0d47a1; }
        .agent-card-role.chef         { background: #fff3e0; color: #e65100; }
        .agent-card-role.super-admin  { background: #ede9fe; color: #6d28d9; }
        .agent-card-role.admin-sys    { background: #cffafe; color: #0e7490; }
        .agent-card-id {
            font-size: 12px;
            color: var(--gray-400);
        }
        .agent-card-footer {
            padding: 12px 20px 16px 20px;
            border-top: 1px solid var(--gray-100);
        }
        .agent-card-stats {
            display: flex;
            gap: 16px;
            justify-content: space-around;
        }
        .agent-stat-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            color: var(--gray-600);
        }
        .agent-stat-item i {
            font-size: 14px;
            color: var(--gray-400);
        }
        .agents-empty {
            grid-column: 1 / -1;
            text-align: center;
            padding: 60px 20px;
            background: white;
            border-radius: var(--radius);
            border: 2px dashed var(--gray-200);
        }
        .agents-empty h3 {
            font-size: 20px;
            color: var(--gray-700);
            margin-bottom: 4px;
        }
        .modal-modern {
            width: 100%;
            max-width: 560px;
        }
        .modal-header {
            display: flex;
            align-items: flex-start;
            gap: 16px;
            margin-bottom: 24px;
            position: relative;
        }
        .modal-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: var(--orange-gradient);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 22px;
            flex-shrink: 0;
        }
        .modal-title-group { flex: 1; }
        .modal-title-group h2 {
            font-size: 22px;
            font-weight: 700;
            color: var(--gray-900);
            margin: 0;
            line-height: 1.2;
        }
        .modal-title-group p {
            font-size: 14px;
            color: var(--gray-500);
            margin: 2px 0 0;
        }
        .modal-close {
            position: absolute;
            top: -6px;
            right: -6px;
            width: 36px;
            height: 36px;
            border: none;
            background: var(--gray-100);
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--gray-500);
            transition: var(--transition);
            font-size: 16px;
        }
        .modal-close:hover {
            background: #fee2e2;
            color: #dc2626;
            transform: rotate(90deg);
        }
        .modal-body { margin-bottom: 24px; }
        .form-row { margin-bottom: 16px; }
        .form-row-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }
        .form-group label {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: var(--gray-700);
            margin-bottom: 6px;
        }
        .form-group label i {
            color: var(--orange-500);
            margin-right: 6px;
            width: 16px;
        }
        .form-group input,
        .form-group select {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid var(--gray-200);
            border-radius: var(--radius-sm);
            font-size: 15px;
            font-family: inherit;
            transition: var(--transition);
            background: var(--gray-50);
            color: var(--gray-800);
        }
        .form-group input:focus {
            outline: none;
            border-color: var(--orange-500);
            background: white;
            box-shadow: 0 0 0 4px rgba(245, 124, 0, 0.08);
        }
        .input-hint {
            display: block;
            font-size: 12px;
            color: var(--gray-400);
            margin-top: 4px;
        }
        .password-wrapper { position: relative; }
        .password-wrapper input { padding-right: 48px; }
        .password-toggle {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: var(--gray-400);
            cursor: pointer;
            font-size: 18px;
            padding: 4px;
            transition: var(--transition);
        }
        .password-toggle:hover { color: var(--orange-600); }
        .role-selector {
            display: flex;
            gap: 12px;
        }
        .role-option { flex: 1; cursor: pointer; }
        .role-option input { display: none; }
        .role-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 14px 12px;
            border: 2px solid var(--gray-200);
            border-radius: var(--radius-sm);
            transition: var(--transition);
            background: var(--gray-50);
            text-align: center;
        }
        .role-card i {
            font-size: 24px;
            color: var(--gray-400);
            margin-bottom: 4px;
            transition: var(--transition);
        }
        .role-card strong {
            font-size: 14px;
            color: var(--gray-700);
        }
        .role-card small {
            font-size: 12px;
            color: var(--gray-400);
        }
        .role-option input:checked + .role-card {
            border-color: var(--orange-500);
            background: rgba(245, 124, 0, 0.05);
            box-shadow: 0 0 0 3px rgba(245, 124, 0, 0.15);
        }
        .role-option input:checked + .role-card i {
            color: var(--orange-500);
        }
        .role-option input:checked + .role-card strong {
            color: var(--orange-700);
        }
        .role-option:hover .role-card {
            border-color: var(--orange-300);
            transform: translateY(-2px);
        }
        .status-selector {
            display: flex;
            gap: 12px;
        }
        .status-option { flex: 1; cursor: pointer; }
        .status-option input { display: none; }
        .status-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 12px;
            border: 2px solid var(--gray-200);
            border-radius: var(--radius-sm);
            transition: var(--transition);
            background: var(--gray-50);
            text-align: center;
        }
        .status-card i {
            font-size: 20px;
            margin-bottom: 4px;
            transition: var(--transition);
        }
        .status-card strong {
            font-size: 13px;
            color: var(--gray-700);
        }
        .status-card.active i    { color: #4caf50; }
        .status-card.suspended i { color: #ef4444; }
        .status-option input:checked + .status-card {
            border-color: var(--orange-500);
            background: rgba(245, 124, 0, 0.05);
            box-shadow: 0 0 0 3px rgba(245, 124, 0, 0.15);
        }
        .status-option input:checked + .status-card strong {
            color: var(--orange-700);
        }
        .status-option:hover .status-card {
            border-color: var(--orange-300);
            transform: translateY(-2px);
        }
        .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding-top: 16px;
            border-top: 1px solid var(--gray-200);
        }
        .btn-secondary {
            padding: 10px 24px;
            background: var(--gray-100);
            color: var(--gray-700);
            border: none;
            border-radius: var(--radius-sm);
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: var(--transition);
            font-family: inherit;
        }
        .btn-secondary:hover { background: var(--gray-200); }

        /* Responsive */
        @media (max-width: 1024px) {
            .agents-stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
            .agents-stats-grid { grid-template-columns: 1fr 1fr; }
            .agents-actions-bar { flex-direction: column; align-items: stretch; }
            .agents-filter-group { flex-direction: column; align-items: stretch; }
            .agents-grid { grid-template-columns: 1fr; }
            .agent-card-stats { flex-direction: column; gap: 6px; }
            .form-row-2 { grid-template-columns: 1fr; }
            .role-selector { flex-direction: column; }
            .status-selector { flex-direction: column; }
            .modal-header { flex-wrap: wrap; }
            .modal-icon { width: 40px; height: 40px; font-size: 18px; }
            .modal-title-group h2 { font-size: 18px; }
            .modal-footer { flex-direction: column-reverse; }
            .modal-footer button { width: 100%; justify-content: center; }
        }
        @media (max-width: 480px) {
            .agents-stats-grid { grid-template-columns: 1fr; }
            .agent-card-body { flex-direction: column; text-align: center; }
            .agent-card-meta { justify-content: center; }
            .agent-card-status { flex-direction: column; align-items: flex-start; gap: 8px; }
            .agent-card-actions { width: 100%; justify-content: flex-end; }
            .agent-card-stats { flex-direction: column; align-items: center; }
        }
    `;
    document.head.appendChild(agentStyles);
})();