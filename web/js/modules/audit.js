// web/js/modules/audit.js
// ============================================================
// MODULE AUDIT — Réservé au Super Admin
// ============================================================
import { API } from '../services/api.js';
import { state } from '../services/state.js';
import { Toast } from '../components/toast.js';
import { Modal } from '../components/modal.js';

// ------------------------------------------------------------
// Métadonnées des actions
// ------------------------------------------------------------
const ACTION_META = {
  // AUTH
  login_success:        { label: 'Connexion réussie',        icon: 'fa-sign-in-alt',       color: '#10b981' },
  login_failed:         { label: 'Échec de connexion',       icon: 'fa-exclamation-triangle', color: '#dc2626' },
  logout:               { label: 'Déconnexion',              icon: 'fa-sign-out-alt',      color: '#64748b' },
  // USERS
  create_user:          { label: 'Création utilisateur',     icon: 'fa-user-plus',         color: '#7c3aed' },
  update_user:          { label: 'Modification utilisateur', icon: 'fa-user-edit',         color: '#2563eb' },
  toggle_user_status:   { label: 'Changement statut',        icon: 'fa-toggle-on',         color: '#f59e0b' },
  reset_password:       { label: 'Réinitialisation MDP',     icon: 'fa-key',               color: '#f59e0b' },
  delete_user:          { label: 'Suppression utilisateur',  icon: 'fa-user-minus',        color: '#dc2626' },
  // TICKETS
  create_ticket:        { label: 'Création ticket',          icon: 'fa-ticket-alt',        color: '#2563eb' },
  update_ticket:        { label: 'Modification ticket',      icon: 'fa-edit',              color: '#f59e0b' },
  delete_ticket:        { label: 'Suppression ticket',       icon: 'fa-trash',             color: '#dc2626' },
  ticket_comment:       { label: 'Commentaire ticket',       icon: 'fa-comment',           color: '#0891b2' },
  ticket_resolved:      { label: 'Ticket résolu',            icon: 'fa-check-circle',      color: '#10b981' },
  ticket_closed:        { label: 'Ticket clôturé',           icon: 'fa-lock',              color: '#10b981' },
  // CONVERSATIONS
  create_conversation:  { label: 'Nouvelle conversation',    icon: 'fa-plus',              color: '#f57c00' },
  update_conversation_status: { label: 'Statut conversation', icon: 'fa-sync',             color: '#f59e0b' },
  archive_conversation: { label: 'Archivage conversation',   icon: 'fa-archive',           color: '#0891b2' },
  unarchive_conversation: { label: 'Désarchivage',           icon: 'fa-inbox',             color: '#0891b2' },
  delete_conversation:  { label: 'Suppression conversation', icon: 'fa-trash',             color: '#dc2626' },
  // SYSTEM
  clear_audit_logs:     { label: 'Purge du journal',         icon: 'fa-eraser',            color: '#dc2626' },
};

const CATEGORY_META = {
  auth:         { label: 'Auth',           color: '#0891b2' },
  user:         { label: 'Utilisateur',    color: '#7c3aed' },
  ticket:       { label: 'Ticket',         color: '#2563eb' },
  conversation: { label: 'Conversation',   color: '#f57c00' },
  system:       { label: 'Système',        color: '#64748b' },
};

const SEVERITY_META = {
  info:     { label: 'Info',      color: '#2563eb', bg: '#dbeafe' },
  warning:  { label: 'Attention', color: '#f59e0b', bg: '#fef3c7' },
  critical: { label: 'Critique',  color: '#dc2626', bg: '#fee2e2' },
};

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  chef: 'Chef Service',
  agent: 'Opérateur',
  admin_systeme: 'Admin Système',
};

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 30) return 'à l\'instant';
  if (s < 60) return 'il y a quelques secondes';
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR');
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

// ------------------------------------------------------------
// RENDER
// ------------------------------------------------------------
export async function render() {
  const user = state.getUser();

  // Garde d'accès
  if (!user || user.role !== 'super_admin') {
    return `
      <div class="card" style="text-align:center;padding:60px 20px;">
        <i class="fas fa-lock" style="font-size:48px;color:#dc2626;margin-bottom:16px;"></i>
        <h2 style="margin-bottom:8px;">Accès refusé</h2>
        <p style="color:var(--gray-500);">Le journal d'audit est réservé au <strong>Super Administrateur</strong>.</p>
      </div>
    `;
  }

  let stats = { total: 0, today: 0, week: 0, critical: 0, failed: 0, byCategory: {} };
  let logs = [];

  try {
    [stats, logs] = await Promise.all([
      API.getAuditStats(),
      API.getAuditLogs({ limit: 300 }),
    ]);
  } catch (err) {
    console.error('Erreur chargement audit:', err);
    Toast.error('Impossible de charger le journal d\'audit');
  }

  let html = `
    <!-- Bandeau -->
    <div class="audit-banner">
      <div class="audit-banner-icon"><i class="fas fa-shield-alt"></i></div>
      <div class="audit-banner-text">
        <h3>Journal d'audit</h3>
        <p>Traçabilité complète de toutes les actions effectuées sur la plateforme.</p>
      </div>
      <span class="audit-banner-badge">
        <i class="fas fa-lock"></i> Super Admin
      </span>
    </div>

    <!-- Stats -->
    <div class="audit-stats-grid">
      <div class="audit-stat-card">
        <div class="audit-stat-icon" style="background: rgba(37, 99, 235, 0.12); color: #2563eb;">
          <i class="fas fa-list"></i>
        </div>
        <div class="audit-stat-info">
          <div class="audit-stat-value" id="statTotal">${stats.total}</div>
          <div class="audit-stat-label">Total événements</div>
        </div>
      </div>
      <div class="audit-stat-card">
        <div class="audit-stat-icon" style="background: rgba(16, 185, 129, 0.12); color: #10b981;">
          <i class="fas fa-calendar-day"></i>
        </div>
        <div class="audit-stat-info">
          <div class="audit-stat-value" id="statToday">${stats.today}</div>
          <div class="audit-stat-label">Aujourd'hui</div>
        </div>
      </div>
      <div class="audit-stat-card">
        <div class="audit-stat-icon" style="background: rgba(245, 158, 11, 0.12); color: #f59e0b;">
          <i class="fas fa-calendar-week"></i>
        </div>
        <div class="audit-stat-info">
          <div class="audit-stat-value" id="statWeek">${stats.week}</div>
          <div class="audit-stat-label">7 derniers jours</div>
        </div>
      </div>
      <div class="audit-stat-card">
        <div class="audit-stat-icon" style="background: rgba(220, 38, 38, 0.12); color: #dc2626;">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="audit-stat-info">
          <div class="audit-stat-value" id="statCritical">${stats.critical + stats.failed}</div>
          <div class="audit-stat-label">Critiques / Échecs</div>
        </div>
      </div>
    </div>

    <!-- Filtres -->
    <div class="audit-filters-bar">
      <div class="audit-search-wrapper">
        <i class="fas fa-search"></i>
        <input type="text" id="auditSearch"
               placeholder="Rechercher (acteur, action, cible...)"
               class="audit-search-input">
      </div>
      <div class="audit-filter-group">
        <select id="auditCategory" class="audit-filter-select">
          <option value="all">Toutes catégories</option>
          <option value="auth">🔐 Authentification</option>
          <option value="user">👥 Utilisateurs</option>
          <option value="ticket">🎫 Tickets</option>
          <option value="conversation">💬 Conversations</option>
          <option value="system">⚙️ Système</option>
        </select>
        <select id="auditSeverity" class="audit-filter-select">
          <option value="all">Toutes sévérités</option>
          <option value="info">ℹ️ Info</option>
          <option value="warning">⚠️ Attention</option>
          <option value="critical">🚨 Critique</option>
        </select>
        <select id="auditSuccess" class="audit-filter-select">
          <option value="all">Succès & échecs</option>
          <option value="true">✅ Succès uniquement</option>
          <option value="false">❌ Échecs uniquement</option>
        </select>
        <button class="audit-btn-refresh" id="auditRefreshBtn" title="Rafraîchir">
          <i class="fas fa-sync-alt"></i>
        </button>
        <button class="audit-btn-export" id="auditExportBtn" title="Exporter en JSON">
          <i class="fas fa-download"></i> Exporter
        </button>
        <button class="audit-btn-danger" id="auditClearBtn" title="Purger le journal">
          <i class="fas fa-eraser"></i> Purger
        </button>
      </div>
    </div>

    <!-- Liste -->
    <div class="audit-list" id="auditList">
      ${buildLogsListHtml(logs)}
    </div>
  `;

  return html;
}

function buildLogsListHtml(logs) {
  if (!logs || logs.length === 0) {
    return `
      <div class="audit-empty">
        <i class="fas fa-clipboard-list" style="font-size:48px;color:var(--gray-300);margin-bottom:16px;"></i>
        <h3>Aucun événement</h3>
        <p style="color:var(--gray-500);">Les actions de la plateforme apparaîtront ici.</p>
      </div>
    `;
  }

  let html = '';
  logs.forEach(entry => {
    const meta = ACTION_META[entry.action] || { label: entry.action, icon: 'fa-circle', color: '#64748b' };
    const catMeta = CATEGORY_META[entry.category] || { label: entry.category, color: '#64748b' };
    const sevMeta = SEVERITY_META[entry.severity] || SEVERITY_META.info;
    const actorName = entry.actor?.name || entry.actor?.email || 'Système';
    const actorRole = entry.actor?.role ? (ROLE_LABELS[entry.actor.role] || entry.actor.role) : '—';
    const targetStr = entry.target
      ? `${entry.target.type || ''}${entry.target.id ? ' #' + entry.target.id : ''}${entry.target.name ? ' — ' + entry.target.name : ''}`
      : '—';

    html += `
      <div class="audit-item" data-id="${entry.id}">
        <div class="audit-item-bar" style="background: ${meta.color};"></div>
        <div class="audit-item-icon" style="background: ${meta.color}1a; color: ${meta.color};">
          <i class="fas ${meta.icon}"></i>
        </div>
        <div class="audit-item-content">
          <div class="audit-item-header">
            <div class="audit-item-title">
              <span class="audit-action-label" style="color: ${meta.color};">${escapeHtml(meta.label)}</span>
              <span class="audit-cat-badge" style="background: ${catMeta.color}1a; color: ${catMeta.color};">
                ${escapeHtml(catMeta.label)}
              </span>
              <span class="audit-sev-badge" style="background: ${sevMeta.bg}; color: ${sevMeta.color};">
                ${sevMeta.label}
              </span>
              ${!entry.success ? `<span class="audit-fail-badge"><i class="fas fa-times"></i> Échec</span>` : ''}
            </div>
            <div class="audit-item-time" title="${formatDateTime(entry.timestamp)}">
              <i class="fas fa-clock"></i> ${timeAgo(entry.timestamp)}
            </div>
          </div>
          <div class="audit-item-meta">
            <span class="audit-meta-item">
              <i class="fas fa-user-circle"></i>
              <strong>${escapeHtml(actorName)}</strong>
              <span class="audit-role-tag">${escapeHtml(actorRole)}</span>
            </span>
            ${entry.target ? `
              <span class="audit-meta-item">
                <i class="fas fa-crosshairs"></i> ${escapeHtml(targetStr)}
              </span>
            ` : ''}
            ${entry.ip ? `
              <span class="audit-meta-item">
                <i class="fas fa-network-wired"></i> ${escapeHtml(entry.ip)}
              </span>
            ` : ''}
          </div>
        </div>
        <button class="audit-item-view" data-id="${entry.id}" title="Voir les détails">
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    `;
  });

  return html;
}

// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------
export function init() {
  const user = state.getUser();
  if (!user || user.role !== 'super_admin') return;

  let currentFilters = {
    category: 'all',
    severity: 'all',
    success: 'all',
    search: '',
  };

  const searchInput = document.getElementById('auditSearch');
  const categorySel = document.getElementById('auditCategory');
  const severitySel = document.getElementById('auditSeverity');
  const successSel = document.getElementById('auditSuccess');
  const listEl = document.getElementById('auditList');

  // ---- Chargement
  async function loadLogs() {
    try {
      const filters = {
        limit: 300,
      };
      if (currentFilters.category !== 'all') filters.category = currentFilters.category;
      if (currentFilters.severity !== 'all') filters.severity = currentFilters.severity;
      if (currentFilters.success !== 'all') filters.success = currentFilters.success;
      if (currentFilters.search) filters.search = currentFilters.search;

      const logs = await API.getAuditLogs(filters);
      if (listEl) listEl.innerHTML = buildLogsListHtml(logs);
      attachItemHandlers();
    } catch (err) {
      console.error('Erreur chargement logs:', err);
      Toast.error('Erreur lors du chargement');
    }
  }

  async function loadStats() {
    try {
      const stats = await API.getAuditStats();
      const el = (id, val) => {
        const e = document.getElementById(id);
        if (e) e.textContent = val;
      };
      el('statTotal', stats.total);
      el('statToday', stats.today);
      el('statWeek', stats.week);
      el('statCritical', stats.critical + stats.failed);
    } catch { /* ignore */ }
  }

  // ---- Filtres
  let debounceTimer;
  searchInput?.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentFilters.search = this.value.trim();
      loadLogs();
    }, 300);
  });

  categorySel?.addEventListener('change', function () {
    currentFilters.category = this.value;
    loadLogs();
  });
  severitySel?.addEventListener('change', function () {
    currentFilters.severity = this.value;
    loadLogs();
  });
  successSel?.addEventListener('change', function () {
    currentFilters.success = this.value;
    loadLogs();
  });

  // ---- Actions
  document.getElementById('auditRefreshBtn')?.addEventListener('click', async () => {
    Toast.info('Actualisation du journal...');
    await Promise.all([loadLogs(), loadStats()]);
  });

  document.getElementById('auditExportBtn')?.addEventListener('click', async () => {
    try {
      const logs = await API.getAuditLogs({ limit: 5000 });
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-nt-albey-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      Toast.success('Journal exporté');
    } catch (err) {
      Toast.error('Erreur export : ' + err.message);
    }
  });

  document.getElementById('auditClearBtn')?.addEventListener('click', async () => {
    if (!confirm(
      '⚠️ PURGE DU JOURNAL D\'AUDIT\n\n' +
      'Toutes les entrées seront définitivement supprimées.\n' +
      'Seule l\'entrée de purge restera.\n\n' +
      'Confirmer ?'
    )) return;

    try {
      await API.clearAuditLogs();
      Toast.success('Journal d\'audit purgé');
      await Promise.all([loadLogs(), loadStats()]);
    } catch (err) {
      Toast.error('Erreur : ' + err.message);
    }
  });

  // ---- Détails au clic
  function attachItemHandlers() {
    document.querySelectorAll('.audit-item-view').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        showDetailModal(parseInt(this.dataset.id, 10));
      });
    });
    document.querySelectorAll('.audit-item').forEach(item => {
      item.addEventListener('click', function () {
        showDetailModal(parseInt(this.dataset.id, 10));
      });
    });
  }

  async function showDetailModal(id) {
    try {
      // On récupère via les logs actuels en mémoire
      const logs = await API.getAuditLogs({ limit: 5000 });
      const entry = logs.find(l => l.id === id);
      if (!entry) return Toast.error('Événement introuvable');

      const meta = ACTION_META[entry.action] || { label: entry.action, icon: 'fa-circle', color: '#64748b' };
      const sevMeta = SEVERITY_META[entry.severity] || SEVERITY_META.info;

      const content = `
        <div class="modal-modern modal-audit-detail">
          <div class="modal-header">
            <div class="modal-icon" style="background: ${meta.color};">
              <i class="fas ${meta.icon}"></i>
            </div>
            <div class="modal-title-group">
              <h2>${escapeHtml(meta.label)}</h2>
              <p>Événement #${entry.id} • ${formatDateTime(entry.timestamp)}</p>
            </div>
            <button class="modal-close" id="closeModalBtn"><i class="fas fa-times"></i></button>
          </div>

          <div class="modal-body">
            <div class="audit-detail-row">
              <label><i class="fas fa-tag"></i> Action</label>
              <code>${escapeHtml(entry.action)}</code>
            </div>
            <div class="audit-detail-row">
              <label><i class="fas fa-layer-group"></i> Catégorie</label>
              <span>${escapeHtml(entry.category)}</span>
            </div>
            <div class="audit-detail-row">
              <label><i class="fas fa-exclamation-circle"></i> Sévérité</label>
              <span class="audit-sev-badge" style="background:${sevMeta.bg};color:${sevMeta.color};">${sevMeta.label}</span>
            </div>
            <div class="audit-detail-row">
              <label><i class="fas fa-check-circle"></i> Statut</label>
              <span>${entry.success ? '✅ Succès' : '❌ Échec'}</span>
            </div>

            <div class="audit-detail-sep"></div>

            <div class="audit-detail-row">
              <label><i class="fas fa-user-circle"></i> Acteur</label>
              <div>
                <strong>${escapeHtml(entry.actor?.name || 'Système')}</strong>
                ${entry.actor?.email ? `<br><small>${escapeHtml(entry.actor.email)}</small>` : ''}
                ${entry.actor?.role ? `<br><span class="audit-role-tag">${escapeHtml(ROLE_LABELS[entry.actor.role] || entry.actor.role)}</span>` : ''}
              </div>
            </div>

            ${entry.target ? `
              <div class="audit-detail-row">
                <label><i class="fas fa-crosshairs"></i> Cible</label>
                <div>
                  <strong>${escapeHtml(entry.target.type || '')}${entry.target.id ? ' #' + entry.target.id : ''}</strong>
                  ${entry.target.name ? `<br><small>${escapeHtml(entry.target.name)}</small>` : ''}
                </div>
              </div>
            ` : ''}

            ${entry.ip ? `
              <div class="audit-detail-row">
                <label><i class="fas fa-network-wired"></i> Adresse IP</label>
                <code>${escapeHtml(entry.ip)}</code>
              </div>
            ` : ''}

            ${entry.details && Object.keys(entry.details).length ? `
              <div class="audit-detail-row audit-detail-full">
                <label><i class="fas fa-info-circle"></i> Détails</label>
                <pre class="audit-detail-json">${escapeHtml(JSON.stringify(entry.details, null, 2))}</pre>
              </div>
            ` : ''}
          </div>

          <div class="modal-footer">
            <button type="button" id="closeModalBtnFooter" class="btn-secondary">Fermer</button>
          </div>
        </div>
      `;

      Modal.show(content);

      document.querySelectorAll('#closeModalBtn, #closeModalBtnFooter').forEach(btn => {
        btn.addEventListener('click', Modal.close);
      });
    } catch (err) {
      Toast.error('Erreur : ' + err.message);
    }
  }

  // Initialisation
  attachItemHandlers();
}

// ------------------------------------------------------------
// STYLES
// ------------------------------------------------------------
(function injectStyles() {
  if (document.getElementById('auditModuleStyles')) return;
  const style = document.createElement('style');
  style.id = 'auditModuleStyles';
  style.textContent = `
    /* Bandeau */
    .audit-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      background: linear-gradient(135deg, #0b1220 0%, #1e293b 100%);
      color: white;
      padding: 18px 24px;
      border-radius: var(--radius);
      margin-bottom: 24px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.25);
      position: relative;
      overflow: hidden;
    }
    .audit-banner::before {
      content: '';
      position: absolute;
      top: -60px; right: -60px;
      width: 220px; height: 220px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(245,124,0,0.25), transparent 70%);
    }
    .audit-banner-icon {
      width: 52px; height: 52px;
      border-radius: 14px;
      background: rgba(255,255,255,0.1);
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; flex-shrink: 0;
      color: var(--orange-400);
      position: relative; z-index: 1;
    }
    .audit-banner-text { flex: 1; position: relative; z-index: 1; }
    .audit-banner-text h3 {
      font-size: 18px; font-weight: 700; margin: 0 0 4px;
    }
    .audit-banner-text p {
      font-size: 13px; opacity: 0.75; margin: 0;
    }
    .audit-banner-badge {
      background: rgba(245, 124, 0, 0.2);
      border: 1px solid rgba(245, 124, 0, 0.4);
      color: #ffb74d;
      padding: 6px 14px; border-radius: 20px;
      font-size: 12px; font-weight: 700;
      display: flex; align-items: center; gap: 6px;
      flex-shrink: 0;
      position: relative; z-index: 1;
    }

    /* Stats */
    .audit-stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px; margin-bottom: 24px;
    }
    .audit-stat-card {
      background: white; border-radius: var(--radius);
      padding: 20px 24px;
      display: flex; align-items: center; gap: 16px;
      border: 1px solid var(--gray-100);
      transition: var(--transition);
    }
    .audit-stat-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }
    .audit-stat-icon {
      width: 48px; height: 48px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; flex-shrink: 0;
    }
    .audit-stat-info { flex: 1; }
    .audit-stat-value {
      font-size: 28px; font-weight: 700; color: var(--gray-900); line-height: 1;
    }
    .audit-stat-label {
      font-size: 14px; color: var(--gray-500); margin-top: 4px;
    }

    /* Filtres */
    .audit-filters-bar {
      display: flex; gap: 12px; margin-bottom: 20px;
      flex-wrap: wrap; align-items: center;
      background: white; padding: 14px 18px;
      border-radius: var(--radius);
      border: 1px solid var(--gray-100);
    }
    .audit-search-wrapper {
      flex: 1; position: relative; min-width: 200px;
    }
    .audit-search-wrapper i {
      position: absolute; left: 14px; top: 50%;
      transform: translateY(-50%); color: var(--gray-400); font-size: 14px;
    }
    .audit-search-input {
      width: 100%; padding: 10px 14px 10px 42px;
      border: 2px solid var(--gray-200);
      border-radius: var(--radius-sm);
      font-size: 14px; font-family: inherit;
      transition: var(--transition); background: var(--gray-50);
    }
    .audit-search-input:focus {
      outline: none; border-color: var(--orange-500);
      background: white; box-shadow: 0 0 0 4px rgba(245,124,0,0.08);
    }
    .audit-filter-group {
      display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
    }
    .audit-filter-select {
      padding: 10px 14px; border: 2px solid var(--gray-200);
      border-radius: var(--radius-sm);
      font-size: 13px; font-family: inherit;
      background: var(--gray-50); color: var(--gray-700);
      cursor: pointer; transition: var(--transition);
    }
    .audit-filter-select:focus {
      outline: none; border-color: var(--orange-500);
    }
    .audit-btn-refresh, .audit-btn-export, .audit-btn-danger {
      padding: 10px 16px; border: none;
      border-radius: var(--radius-sm);
      font-size: 13px; font-weight: 600; cursor: pointer;
      font-family: inherit;
      display: inline-flex; align-items: center; gap: 6px;
      transition: var(--transition);
    }
    .audit-btn-refresh {
      background: var(--gray-100); color: var(--gray-700);
      width: 40px; justify-content: center;
    }
    .audit-btn-refresh:hover { background: var(--gray-200); }
    .audit-btn-export {
      background: linear-gradient(135deg, #0891b2, #06b6d4); color: white;
    }
    .audit-btn-export:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 15px rgba(8, 145, 178, 0.35);
    }
    .audit-btn-danger {
      background: linear-gradient(135deg, #dc2626, #ef4444); color: white;
    }
    .audit-btn-danger:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 15px rgba(220, 38, 38, 0.35);
    }

    /* Liste */
    .audit-list {
      display: flex; flex-direction: column; gap: 10px;
    }
    .audit-item {
      display: flex; gap: 14px; align-items: center;
      background: white; border-radius: var(--radius);
      border: 1px solid var(--gray-100);
      padding: 14px 16px 14px 0;
      transition: var(--transition);
      cursor: pointer; position: relative;
      overflow: hidden;
    }
    .audit-item:hover {
      box-shadow: var(--shadow-lg);
      border-color: var(--orange-200);
      transform: translateY(-1px);
    }
    .audit-item-bar {
      width: 4px; align-self: stretch;
      border-radius: 0 4px 4px 0; flex-shrink: 0;
    }
    .audit-item-icon {
      width: 42px; height: 42px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; flex-shrink: 0; margin-left: 12px;
    }
    .audit-item-content { flex: 1; min-width: 0; }
    .audit-item-header {
      display: flex; justify-content: space-between;
      align-items: center; gap: 12px;
      flex-wrap: wrap; margin-bottom: 6px;
    }
    .audit-item-title {
      display: flex; align-items: center;
      gap: 8px; flex-wrap: wrap;
    }
    .audit-action-label {
      font-size: 14px; font-weight: 700;
    }
    .audit-cat-badge, .audit-sev-badge, .audit-fail-badge {
      font-size: 11px; font-weight: 700;
      padding: 2px 10px; border-radius: 12px;
      text-transform: uppercase; letter-spacing: 0.3px;
    }
    .audit-fail-badge {
      background: #fee2e2; color: #dc2626;
    }
    .audit-item-time {
      font-size: 12px; color: var(--gray-400); font-style: italic;
    }
    .audit-item-meta {
      display: flex; flex-wrap: wrap;
      gap: 14px; font-size: 12.5px; color: var(--gray-600);
    }
    .audit-meta-item {
      display: inline-flex; align-items: center; gap: 6px;
    }
    .audit-meta-item i { color: var(--gray-400); }
    .audit-role-tag {
      font-size: 10.5px; font-weight: 700;
      padding: 1px 8px; border-radius: 10px;
      background: var(--gray-100); color: var(--gray-600);
      text-transform: uppercase; letter-spacing: 0.3px;
    }
    .audit-item-view {
      background: none; border: none;
      width: 34px; height: 34px; border-radius: 8px;
      color: var(--gray-400); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: var(--transition); flex-shrink: 0;
    }
    .audit-item-view:hover {
      background: var(--gray-100); color: var(--orange-600);
    }

    /* Empty */
    .audit-empty {
      text-align: center; padding: 60px 20px;
      background: white; border-radius: var(--radius);
      border: 2px dashed var(--gray-200);
    }
    .audit-empty h3 {
      font-size: 20px; color: var(--gray-700); margin-bottom: 4px;
    }

    /* Modale détail */
    .modal-audit-detail { max-width: 620px; }
    .audit-detail-row {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid var(--gray-100);
      align-items: flex-start;
      font-size: 14px;
    }
    .audit-detail-row label {
      font-size: 12px; font-weight: 700;
      color: var(--gray-500);
      text-transform: uppercase; letter-spacing: 0.3px;
      padding-top: 2px;
    }
    .audit-detail-row label i {
      color: var(--orange-500); margin-right: 6px; width: 14px;
    }
    .audit-detail-row code {
      background: var(--gray-100); padding: 2px 8px;
      border-radius: 6px; font-size: 12px;
      font-family: 'SFMono-Regular', 'Consolas', monospace;
      color: var(--gray-800); word-break: break-all;
    }
    .audit-detail-full { grid-template-columns: 1fr; }
    .audit-detail-full label { margin-bottom: 6px; }
    .audit-detail-json {
      background: #0b1220; color: #cbd5e1;
      padding: 14px 16px; border-radius: 10px;
      font-size: 12px; line-height: 1.6;
      font-family: 'SFMono-Regular', 'Consolas', monospace;
      overflow-x: auto; max-height: 320px;
      white-space: pre-wrap; word-break: break-word;
      margin: 0;
    }
    .audit-detail-sep {
      height: 1px; background: var(--gray-200);
      margin: 12px 0;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .audit-stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 768px) {
      .audit-stats-grid { grid-template-columns: 1fr 1fr; }
      .audit-filters-bar { flex-direction: column; align-items: stretch; }
      .audit-filter-group { flex-direction: column; align-items: stretch; }
      .audit-filter-select, .audit-btn-export, .audit-btn-danger, .audit-btn-refresh {
        width: 100%; justify-content: center;
      }
      .audit-item { flex-wrap: wrap; }
      .audit-item-header { flex-direction: column; align-items: flex-start; }
      .audit-detail-row { grid-template-columns: 1fr; gap: 4px; }
    }
    @media (max-width: 480px) {
      .audit-stats-grid { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(style);
})();