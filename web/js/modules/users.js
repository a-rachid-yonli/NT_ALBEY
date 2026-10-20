// web/js/modules/users.js
// ============================================
// MODULE RÉSERVÉ AU SUPER ADMIN
// Gestion des comptes sensibles : Chefs Service + Admins Système
// ============================================
import { API } from '../services/api.js';
import { state } from '../services/state.js';
import { Toast } from '../components/toast.js';
import { Modal } from '../components/modal.js';

// ============================================
// MÉTADONNÉES DES RÔLES
// ============================================
const ROLE_META = {
    super_admin:   { label: 'Super Admin',   icon: 'fa-shield-halved', color: '#7c3aed', badge: 'super-admin' },
    chef:          { label: 'Chef Service',  icon: 'fa-crown',         color: '#f57c00', badge: 'chef' },
    agent:         { label: 'Opérateur',     icon: 'fa-user-tie',      color: '#0d47a1', badge: 'agent' },
    admin_systeme: { label: 'Admin Système', icon: 'fa-user-shield',   color: '#0891b2', badge: 'admin-sys' },
};

// ============================================
// GARDE D'ACCÈS
// ============================================
function guardSuperAdmin() {
    const user = state.getUser();
    if (!user || user.role !== 'super_admin') {
        return false;
    }
    return true;
}

// ============================================
// RENDER
// ============================================
export async function render() {
    const currentUser = state.getUser();

    // Sécurité : redirection si pas super_admin
    if (!guardSuperAdmin()) {
        return `
            <div class="card" style="text-align:center;padding:60px 20px;">
                <i class="fas fa-lock" style="font-size:48px;color:#dc2626;margin-bottom:16px;"></i>
                <h2 style="margin-bottom:8px;">Accès refusé</h2>
                <p style="color:var(--gray-500);">
                    Cette page est réservée au <strong>Super Administrateur</strong>.
                </p>
            </div>
        `;
    }

    // Chargement de tous les utilisateurs (sauf le super_admin connecté)
    const allUsers = await API.getAgents();
    const users = allUsers.filter(u => u.id !== currentUser.id);

    // ===== Statistiques =====
    const total       = users.length;
    const chefs       = users.filter(u => u.role === 'chef').length;
    const adminsSys   = users.filter(u => u.role === 'admin_systeme').length;
    const operators   = users.filter(u => u.role === 'agent').length;
    const suspended   = users.filter(u => u.status === 'suspended').length;
    const active      = users.filter(u => u.status === 'active').length;

    let html = `
        <!-- ============================================ -->
        <!-- BANDEAU SUPER ADMIN                          -->
        <!-- ============================================ -->
        <div class="users-super-banner">
            <div class="users-super-banner-icon">
                <i class="fas fa-shield-halved"></i>
            </div>
            <div class="users-super-banner-text">
                <h3>Espace Super Administrateur</h3>
                <p>Vous avez un contrôle total : créez, modifiez, suspendez ou supprimez n'importe quel compte.</p>
            </div>
            <span class="users-super-badge">
                <i class="fas fa-bolt"></i> Accès illimité
            </span>
        </div>

        <!-- ============================================ -->
        <!-- STATISTIQUES                                  -->
        <!-- ============================================ -->
        <div class="users-stats-grid">
            <div class="users-stat-card">
                <div class="users-stat-icon" style="background: rgba(124, 58, 237, 0.12); color: #7c3aed;">
                    <i class="fas fa-users"></i>
                </div>
                <div class="users-stat-info">
                    <div class="users-stat-value">${total}</div>
                    <div class="users-stat-label">Total utilisateurs</div>
                </div>
            </div>
            <div class="users-stat-card">
                <div class="users-stat-icon" style="background: rgba(245, 124, 0, 0.12); color: #f57c00;">
                    <i class="fas fa-crown"></i>
                </div>
                <div class="users-stat-info">
                    <div class="users-stat-value">${chefs}</div>
                    <div class="users-stat-label">Chefs Service</div>
                </div>
            </div>
            <div class="users-stat-card">
                <div class="users-stat-icon" style="background: rgba(8, 145, 178, 0.12); color: #0891b2;">
                    <i class="fas fa-user-shield"></i>
                </div>
                <div class="users-stat-info">
                    <div class="users-stat-value">${adminsSys}</div>
                    <div class="users-stat-label">Admins Système</div>
                </div>
            </div>
            <div class="users-stat-card">
                <div class="users-stat-icon" style="background: rgba(13, 71, 161, 0.12); color: #0d47a1;">
                    <i class="fas fa-user-tie"></i>
                </div>
                <div class="users-stat-info">
                    <div class="users-stat-value">${operators}</div>
                    <div class="users-stat-label">Opérateurs</div>
                </div>
            </div>
        </div>

        <!-- ============================================ -->
        <!-- BARRE D'ACTION                                -->
        <!-- ============================================ -->
        <div class="users-actions-bar">
            <div class="users-search-wrapper">
                <i class="fas fa-search"></i>
                <input type="text" id="searchUser" placeholder="Rechercher par nom ou email..." class="users-search-input">
            </div>
            <div class="users-filter-group">
                <select id="filterUserRole" class="users-filter-select">
                    <option value="all">Tous les rôles</option>
                    <option value="chef">👑 Chefs Service</option>
                    <option value="admin_systeme">🛡 Admins Système</option>
                    <option value="agent">🛠 Opérateurs</option>
                </select>
                <select id="filterUserStatus" class="users-filter-select">
                    <option value="all">Tous les statuts</option>
                    <option value="active">✅ Actifs</option>
                    <option value="suspended">⛔ Suspendus</option>
                </select>
                <button class="users-btn-add" id="addChefBtn" title="Créer un Chef Service Client">
                    <i class="fas fa-crown"></i> Chef Service
                </button>
                <button class="users-btn-add users-btn-add-alt" id="addAdminSysBtn" title="Créer un Admin Système">
                    <i class="fas fa-user-shield"></i> Admin Système
                </button>
            </div>
        </div>

        <!-- ============================================ -->
        <!-- ALERTE COMPTES SUSPENDUS                     -->
        <!-- ============================================ -->
        ${suspended > 0 ? `
            <div class="users-alert">
                <i class="fas fa-exclamation-triangle"></i>
                <span><strong>${suspended}</strong> compte(s) actuellement suspendu(s) sur ${total}</span>
            </div>
        ` : ''}

        <!-- ============================================ -->
        <!-- LISTE DES UTILISATEURS                        -->
        <!-- ============================================ -->
        <div class="users-list" id="usersList">
    `;

    if (users.length === 0) {
        html += `
            <div class="users-empty">
                <i class="fas fa-user-shield" style="font-size:48px;color:var(--gray-300);margin-bottom:16px;"></i>
                <h3>Aucun utilisateur</h3>
                <p style="color:var(--gray-500);">Créez un Chef Service ou un Admin Système pour commencer</p>
                <div style="display:flex;gap:12px;justify-content:center;margin-top:16px;flex-wrap:wrap;">
                    <button class="users-btn-add" id="addChefBtnEmpty">
                        <i class="fas fa-crown"></i> Créer un Chef Service
                    </button>
                    <button class="users-btn-add users-btn-add-alt" id="addAdminSysBtnEmpty">
                        <i class="fas fa-user-shield"></i> Créer un Admin Système
                    </button>
                </div>
            </div>
        `;
    } else {
        // Trier : chefs → admins système → opérateurs
        const roleOrder = { chef: 0, admin_systeme: 1, agent: 2 };
        users.sort((a, b) => (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99));

        users.forEach(user => {
            const statusClass = user.status === 'active' ? 'active' : 'suspended';
            const statusText  = user.status === 'active' ? 'Actif' : 'Suspendu';
            const statusColor = user.status === 'active' ? '#4caf50' : '#ef4444';

            const meta = ROLE_META[user.role] || ROLE_META.agent;
            const initials = (user.name || '?')
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);

            // Couleur d'avatar par rôle
            const avatarColor = meta.color;

            // Protection : on n'affiche pas les boutons sur notre propre compte
            const isSelf = user.id === currentUser.id;

            html += `
                <div class="user-item" data-id="${user.id}" data-status="${user.status}" data-role="${user.role}">
                    <div class="user-item-bar" style="background: ${meta.color};"></div>
                    <div class="user-item-avatar" style="background: ${avatarColor};">
                        ${initials}
                    </div>
                    <div class="user-item-content">
                        <div class="user-item-header">
                            <div class="user-item-title">
                                <h4>${user.name}</h4>
                                <span class="user-item-role-badge ${meta.badge}">
                                    <i class="fas ${meta.icon}"></i> ${meta.label}
                                </span>
                                ${isSelf ? `<span class="user-item-self-badge"><i class="fas fa-user"></i> Vous</span>` : ''}
                            </div>
                            <span class="user-item-status ${statusClass}">
                                <i class="fas fa-circle" style="font-size:8px;color:${statusColor};"></i>
                                ${statusText}
                            </span>
                        </div>
                        <div class="user-item-meta">
                            <span><i class="fas fa-envelope"></i> ${user.email}</span>
                            <span><i class="fas fa-hashtag"></i> ID #${user.id}</span>
                            <span><i class="fas fa-comment"></i> ${user.messages || 0} messages</span>
                            <span><i class="fas fa-star" style="color:#ff9800;"></i> ${user.rating || '-'}</span>
                        </div>
                    </div>
                    <div class="user-item-actions">
                        ${!isSelf ? `
                            <button class="user-action-btn edit-user" data-id="${user.id}" title="Modifier">
                                <i class="fas fa-pen" style="color: #2563eb;"></i>
                            </button>
                            <button class="user-action-btn reset-pwd" data-id="${user.id}" title="Réinitialiser le mot de passe">
                                <i class="fas fa-key" style="color: #f59e0b;"></i>
                            </button>
                            <button class="user-action-btn toggle-user" data-id="${user.id}"
                                    title="${user.status === 'active' ? 'Suspendre' : 'Réactiver'}">
                                <i class="fas ${user.status === 'active' ? 'fa-pause' : 'fa-play'}"
                                   style="color: ${user.status === 'active' ? '#f59e0b' : '#22c55e'};"></i>
                            </button>
                            <button class="user-action-btn delete-user" data-id="${user.id}" title="Supprimer définitivement">
                                <i class="fas fa-trash" style="color: #ef4444;"></i>
                            </button>
                        ` : `
                            <span class="user-item-protected">
                                <i class="fas fa-lock"></i> Protégé
                            </span>
                        `}
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
    if (!guardSuperAdmin()) return;

    // Boutons de création
    document.getElementById('addChefBtn')?.addEventListener('click', () => showCreateUserModal('chef'));
    document.getElementById('addAdminSysBtn')?.addEventListener('click', () => showCreateUserModal('admin_systeme'));
    document.getElementById('addChefBtnEmpty')?.addEventListener('click', () => showCreateUserModal('chef'));
    document.getElementById('addAdminSysBtnEmpty')?.addEventListener('click', () => showCreateUserModal('admin_systeme'));

    // Actions sur chaque utilisateur
    document.querySelectorAll('.edit-user').forEach(btn => {
        btn.addEventListener('click', function () {
            showEditUserModal(parseInt(this.dataset.id));
        });
    });
    document.querySelectorAll('.reset-pwd').forEach(btn => {
        btn.addEventListener('click', function () {
            showResetPasswordModal(parseInt(this.dataset.id));
        });
    });
    document.querySelectorAll('.toggle-user').forEach(btn => {
        btn.addEventListener('click', function () {
            toggleUser(parseInt(this.dataset.id));
        });
    });
    document.querySelectorAll('.delete-user').forEach(btn => {
        btn.addEventListener('click', function () {
            deleteUser(parseInt(this.dataset.id));
        });
    });

    // Filtres
    document.getElementById('searchUser')?.addEventListener('input', filterUsers);
    document.getElementById('filterUserRole')?.addEventListener('change', filterUsers);
    document.getElementById('filterUserStatus')?.addEventListener('change', filterUsers);
}

// ============================================
// FILTRES
// ============================================
function filterUsers() {
    const search = (document.getElementById('searchUser')?.value || '').toLowerCase().trim();
    const role   = document.getElementById('filterUserRole')?.value || 'all';
    const status = document.getElementById('filterUserStatus')?.value || 'all';

    document.querySelectorAll('.user-item').forEach(item => {
        const name  = item.querySelector('.user-item-title h4')?.textContent?.toLowerCase() || '';
        const email = item.querySelector('.user-item-meta span')?.textContent?.toLowerCase() || '';
        const itemRole   = item.dataset.role;
        const itemStatus = item.dataset.status;

        const matchSearch = name.includes(search) || email.includes(search);
        const matchRole   = role === 'all' || itemRole === role;
        const matchStatus = status === 'all' || itemStatus === status;

        item.style.display = (matchSearch && matchRole && matchStatus) ? '' : 'none';
    });
}

// ============================================
// MODALE CRÉATION UTILISATEUR (Chef / Admin Sys)
// ============================================
function showCreateUserModal(role) {
    if (!guardSuperAdmin()) return;

    const isChef = role === 'chef';
    const meta = ROLE_META[role];

    const content = `
        <div class="modal-modern">
            <div class="modal-header">
                <div class="modal-icon" style="background: ${meta.color};">
                    <i class="fas ${meta.icon}"></i>
                </div>
                <div class="modal-title-group">
                    <h2>Nouveau ${meta.label}</h2>
                    <p>${isChef
                        ? 'Créez un chef qui supervisera la plateforme et créera les opérateurs'
                        : 'Créez un admin qui traitera les tickets assignés'
                    }</p>
                </div>
                <button class="modal-close" id="closeModalBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <form id="createUserForm">
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-user"></i> Nom complet</label>
                            <input type="text" id="newUserName" placeholder="Ex: Ali Mainassara" required>
                            <span class="input-hint">Nom et prénom de l'utilisateur</span>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-envelope"></i> Email professionnel</label>
                            <input type="email" id="newUserEmail" placeholder="utilisateur@nt-albey.com" required>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-lock"></i> Mot de passe initial</label>
                            <div class="password-wrapper">
                                <input type="password" id="newUserPassword" placeholder="••••••••" required minlength="6">
                                <button type="button" class="password-toggle" onclick="window.toggleUserPassword(this)">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                            <span class="input-hint">Minimum 6 caractères – à communiquer à l'utilisateur</span>
                        </div>
                    </div>

                    <div class="info-box-role" style="background:${meta.color}15;border-left:4px solid ${meta.color};padding:12px 16px;border-radius:8px;margin-top:8px;">
                        <strong style="color:${meta.color};display:block;margin-bottom:4px;">
                            <i class="fas ${meta.icon}"></i> Rôle : ${meta.label}
                        </strong>
                        <small style="color:var(--gray-600);">
                            ${isChef
                                ? 'Pourra gérer les opérateurs, répondre aux messages, créer des tickets, mais ne pourra PAS supprimer de comptes.'
                                : 'Pourra uniquement voir et traiter les tickets qui lui sont assignés.'
                            }
                        </small>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" id="closeModalBtnFooter" class="btn-secondary">Annuler</button>
                    <button type="submit" class="btn-primary" style="background:${meta.color};">
                        <i class="fas fa-plus"></i> Créer le ${meta.label}
                    </button>
                </div>
            </form>
        </div>
    `;

    Modal.show(content);

    document.getElementById('createUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('newUserName').value.trim();
        const email = document.getElementById('newUserEmail').value.trim();
        const password = document.getElementById('newUserPassword').value;

        if (!name || !email || !password) {
            Toast.error('Veuillez remplir tous les champs');
            return;
        }
        if (password.length < 6) {
            Toast.error('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        try {
            await API.createAgent({ name, email, role, password });
            Toast.success(`${meta.label} "${name}" créé avec succès !`);
            Modal.close();
            window.loadPage('users');
        } catch (error) {
            Toast.error('Erreur : ' + error.message);
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
    if (!guardSuperAdmin()) return;

    const user = await API.getAgent(id);
    if (!user) {
        Toast.error('Utilisateur non trouvé');
        return;
    }

    const content = `
        <div class="modal-modern">
            <div class="modal-header">
                <div class="modal-icon" style="background: linear-gradient(135deg, #2563eb, #3b82f6);">
                    <i class="fas fa-pen"></i>
                </div>
                <div class="modal-title-group">
                    <h2>Modifier l'utilisateur</h2>
                    <p>Mettez à jour le compte de ${user.name}</p>
                </div>
                <button class="modal-close" id="closeModalBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <form id="editUserForm">
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-user"></i> Nom complet</label>
                            <input type="text" id="editUserName" value="${user.name}" required>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-envelope"></i> Email</label>
                            <input type="email" id="editUserEmail" value="${user.email}" required>
                        </div>
                    </div>

                    <div class="form-row form-row-2">
                        <div class="form-group">
                            <label><i class="fas fa-briefcase"></i> Rôle</label>
                            <select id="editUserRole" class="users-form-select">
                                <option value="chef" ${user.role === 'chef' ? 'selected' : ''}>👑 Chef Service Client</option>
                                <option value="agent" ${user.role === 'agent' ? 'selected' : ''}>🛠 Opérateur / Agent</option>
                                <option value="admin_systeme" ${user.role === 'admin_systeme' ? 'selected' : ''}>🛡 Admin Système</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label><i class="fas fa-toggle-on"></i> Statut</label>
                            <select id="editUserStatus" class="users-form-select">
                                <option value="active" ${user.status === 'active' ? 'selected' : ''}>✅ Actif</option>
                                <option value="suspended" ${user.status === 'suspended' ? 'selected' : ''}>⛔ Suspendu</option>
                            </select>
                        </div>
                    </div>

                    <div class="info-box-warning" style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:8px;margin-top:8px;">
                        <strong style="color:#92400e;display:block;margin-bottom:4px;">
                            <i class="fas fa-exclamation-triangle"></i> Attention
                        </strong>
                        <small style="color:#78350f;">
                            Modifier le rôle d'un utilisateur change immédiatement ses permissions d'accès à la plateforme.
                        </small>
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

    document.getElementById('editUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
            name:   document.getElementById('editUserName').value.trim(),
            email:  document.getElementById('editUserEmail').value.trim(),
            role:   document.getElementById('editUserRole').value,
            status: document.getElementById('editUserStatus').value,
        };

        try {
            await API.updateAgent(id, data);
            Toast.success(`Utilisateur "${data.name}" modifié avec succès !`);
            Modal.close();
            window.loadPage('users');
        } catch (error) {
            Toast.error('Erreur : ' + error.message);
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
    if (!guardSuperAdmin()) return;

    const user = await API.getAgent(id);
    if (!user) {
        Toast.error('Utilisateur non trouvé');
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
                    <p>Pour <strong>${user.name}</strong> (${user.email})</p>
                </div>
                <button class="modal-close" id="closeModalBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <form id="resetPwdForm">
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-lock"></i> Nouveau mot de passe</label>
                            <div class="password-wrapper">
                                <input type="password" id="newPwd" placeholder="••••••••" required minlength="6">
                                <button type="button" class="password-toggle" onclick="window.toggleUserPassword(this)">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                            <span class="input-hint">Minimum 6 caractères</span>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-check-circle"></i> Confirmation</label>
                            <div class="password-wrapper">
                                <input type="password" id="confirmPwd" placeholder="••••••••" required>
                                <button type="button" class="password-toggle" onclick="window.toggleUserPassword(this)">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
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

    document.getElementById('resetPwdForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const newPwd = document.getElementById('newPwd').value;
        const confirmPwd = document.getElementById('confirmPwd').value;

        if (newPwd.length < 6) {
            Toast.error('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }
        if (newPwd !== confirmPwd) {
            Toast.error('Les mots de passe ne correspondent pas');
            return;
        }

        try {
            await API.resetPassword(id, newPwd);
            Toast.success(`Mot de passe réinitialisé pour ${user.name}`);
            Modal.close();
            window.loadPage('users');
        } catch (error) {
            Toast.error('Erreur : ' + error.message);
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
    if (!guardSuperAdmin()) return;

    const user = await API.getAgent(id);
    if (!user) return;

    const action = user.status === 'active' ? 'suspendre' : 'réactiver';
    if (confirm(`⚠️ Voulez-vous ${action} "${user.name}" ?`)) {
        try {
            await API.toggleAgent(id);
            Toast.success(`Utilisateur ${action} avec succès`);
            window.loadPage('users');
        } catch (error) {
            Toast.error('Erreur : ' + error.message);
        }
    }
}

async function deleteUser(id) {
    if (!guardSuperAdmin()) return;

    const user = await API.getAgent(id);
    if (!user) return;

    if (confirm(`⚠️ SUPPRESSION DÉFINITIVE\n\nVoulez-vous vraiment supprimer "${user.name}" (${user.role}) ?\n\nCette action est IRRÉVERSIBLE.`)) {
        try {
            await API.deleteAgent(id);
            Toast.success(`Compte "${user.name}" supprimé définitivement`);
            window.loadPage('users');
        } catch (error) {
            Toast.error('Erreur : ' + error.message);
        }
    }
}

// ============================================
// TOGGLE VISIBILITÉ MOT DE PASSE
// ============================================
window.toggleUserPassword = function (btn) {
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
    if (document.getElementById('usersModuleStyles')) return;
    const style = document.createElement('style');
    style.id = 'usersModuleStyles';
    style.textContent = `
        /* Bandeau Super Admin */
        .users-super-banner {
            display: flex;
            align-items: center;
            gap: 16px;
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
            color: white;
            padding: 18px 24px;
            border-radius: var(--radius);
            margin-bottom: 24px;
            box-shadow: 0 8px 24px rgba(124, 58, 237, 0.25);
            position: relative;
            overflow: hidden;
        }
        .users-super-banner::before {
            content: '';
            position: absolute;
            top: -50px;
            right: -50px;
            width: 200px;
            height: 200px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.08);
        }
        .users-super-banner-icon {
            width: 52px;
            height: 52px;
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.18);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            flex-shrink: 0;
        }
        .users-super-banner-text { flex: 1; position: relative; z-index: 1; }
        .users-super-banner-text h3 {
            font-size: 18px;
            font-weight: 700;
            margin: 0 0 4px;
        }
        .users-super-banner-text p {
            font-size: 13px;
            opacity: 0.9;
            margin: 0;
        }
        .users-super-badge {
            background: rgba(255, 255, 255, 0.2);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
            position: relative;
            z-index: 1;
        }

        /* Stats */
        .users-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 24px;
        }
        .users-stat-card {
            background: white;
            border-radius: var(--radius);
            padding: 20px 24px;
            display: flex;
            align-items: center;
            gap: 16px;
            border: 1px solid var(--gray-100);
            transition: var(--transition);
        }
        .users-stat-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }
        .users-stat-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            flex-shrink: 0;
        }
        .users-stat-info { flex: 1; }
        .users-stat-value {
            font-size: 28px;
            font-weight: 700;
            color: var(--gray-900);
            line-height: 1;
        }
        .users-stat-label {
            font-size: 14px;
            color: var(--gray-500);
            margin-top: 4px;
        }

        /* Barre d'action */
        .users-actions-bar {
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
        .users-search-wrapper {
            flex: 1;
            position: relative;
            min-width: 200px;
        }
        .users-search-wrapper i {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--gray-400);
            font-size: 14px;
        }
        .users-search-input {
            width: 100%;
            padding: 10px 14px 10px 42px;
            border: 2px solid var(--gray-200);
            border-radius: var(--radius-sm);
            font-size: 14px;
            font-family: inherit;
            transition: var(--transition);
            background: var(--gray-50);
        }
        .users-search-input:focus {
            outline: none;
            border-color: #7c3aed;
            background: white;
            box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.08);
        }
        .users-filter-group {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
        }
        .users-filter-select {
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
        .users-filter-select:focus {
            outline: none;
            border-color: #7c3aed;
        }
        .users-btn-add {
            padding: 10px 20px;
            background: linear-gradient(135deg, #f57c00, #ff9800);
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
            white-space: nowrap;
        }
        .users-btn-add:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(245, 124, 0, 0.35);
        }
        .users-btn-add-alt {
            background: linear-gradient(135deg, #0891b2, #06b6d4);
        }
        .users-btn-add-alt:hover {
            box-shadow: 0 4px 15px rgba(8, 145, 178, 0.35);
        }

        /* Alerte */
        .users-alert {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 20px;
            background: #fef3c7;
            border: 1px solid #fcd34d;
            border-radius: var(--radius);
            color: #92400e;
            margin-bottom: 20px;
            font-size: 14px;
        }
        .users-alert i {
            font-size: 18px;
            color: #f59e0b;
        }

        /* Liste */
        .users-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .user-item {
            display: flex;
            gap: 16px;
            align-items: center;
            background: white;
            border-radius: var(--radius);
            border: 1px solid var(--gray-100);
            padding: 16px 20px 16px 0;
            transition: var(--transition);
            position: relative;
            overflow: hidden;
        }
        .user-item:hover {
            box-shadow: var(--shadow-lg);
            border-color: #7c3aed33;
            transform: translateY(-2px);
        }
        .user-item-bar {
            width: 4px;
            align-self: stretch;
            border-radius: 0 4px 4px 0;
            flex-shrink: 0;
        }
        .user-item-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 16px;
            flex-shrink: 0;
            margin-left: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .user-item-content {
            flex: 1;
            min-width: 0;
        }
        .user-item-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
            margin-bottom: 6px;
        }
        .user-item-title {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            min-width: 0;
        }
        .user-item-title h4 {
            font-size: 15px;
            font-weight: 700;
            color: var(--gray-900);
            margin: 0;
        }
        .user-item-role-badge {
            font-size: 11px;
            font-weight: 600;
            padding: 3px 10px;
            border-radius: 12px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .user-item-role-badge.chef        { background: #fff3e0; color: #e65100; }
        .user-item-role-badge.agent       { background: #e3f2fd; color: #0d47a1; }
        .user-item-role-badge.admin-sys   { background: #cffafe; color: #0e7490; }
        .user-item-role-badge.super-admin { background: #ede9fe; color: #6d28d9; }
        .user-item-self-badge {
            font-size: 11px;
            font-weight: 600;
            padding: 3px 10px;
            border-radius: 12px;
            background: #e0e7ff;
            color: #4338ca;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .user-item-status {
            font-size: 12px;
            font-weight: 600;
            padding: 4px 12px;
            border-radius: 20px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
        }
        .user-item-status.active {
            background: #e8f5e9;
            color: #2e7d32;
        }
        .user-item-status.suspended {
            background: #ffebee;
            color: #c62828;
        }
        .user-item-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            font-size: 13px;
            color: var(--gray-500);
        }
        .user-item-meta i {
            color: var(--gray-400);
            margin-right: 4px;
            width: 14px;
        }
        .user-item-actions {
            display: flex;
            gap: 4px;
            flex-shrink: 0;
        }
        .user-action-btn {
            width: 36px;
            height: 36px;
            border: none;
            background: transparent;
            border-radius: 8px;
            cursor: pointer;
            transition: var(--transition);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
        }
        .user-action-btn:hover {
            background: var(--gray-100);
            transform: scale(1.1);
        }
        .user-item-protected {
            font-size: 12px;
            font-weight: 600;
            color: var(--gray-400);
            padding: 6px 12px;
            background: var(--gray-50);
            border-radius: 20px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        /* Empty state */
        .users-empty {
            text-align: center;
            padding: 60px 20px;
            background: white;
            border-radius: var(--radius);
            border: 2px dashed var(--gray-200);
        }
        .users-empty h3 {
            font-size: 20px;
            color: var(--gray-700);
            margin-bottom: 4px;
        }

        /* Modales (hérite du système existant) */
        .users-form-select {
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
        .users-form-select:focus {
            outline: none;
            border-color: #7c3aed;
            background: white;
            box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.08);
        }

        /* Responsive */
        @media (max-width: 1024px) {
            .users-stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
            .users-stats-grid { grid-template-columns: 1fr 1fr; }
            .users-actions-bar { flex-direction: column; align-items: stretch; }
            .users-filter-group { flex-direction: column; align-items: stretch; }
            .user-item { flex-wrap: wrap; padding: 14px 14px 14px 0; }
            .user-item-avatar { margin-left: 10px; }
            .user-item-actions { width: 100%; justify-content: flex-end; margin-top: 8px; }
            .users-super-banner { flex-direction: column; text-align: center; }
        }
        @media (max-width: 480px) {
            .users-stats-grid { grid-template-columns: 1fr; }
            .user-item-header { flex-direction: column; align-items: flex-start; }
            .user-item-meta { flex-direction: column; gap: 4px; }
        }
    `;
    document.head.appendChild(style);
})();