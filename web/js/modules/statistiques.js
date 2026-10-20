// modules/statistiques.js
import { API } from '../services/api.js';
import { Toast } from '../components/toast.js';

let chartActivity = null;
let chartStatus = null;
let chartResponseByAgent = null;

// État local pour la pagination
let currentPage = 1;
const pageSize = 5;
let filteredConversations = [];
let allConversations = [];

export async function render() {
    try {
        // Récupération des données via l'API
        const stats = await API.getStats();
        const messageStats = await API.getMessageStats();
        const performance = await API.getAgentPerformance();
        const satisfaction = await API.getSatisfaction();
        const conversations = await API.getConversations();
        const agents = await API.getAgents();
        const activityData = await API.getActivityData();
        const statusDistribution = await API.getStatusDistribution();

        // Stocker les conversations pour les filtres et la pagination
        allConversations = conversations;
        filteredConversations = conversations;
        currentPage = 1;

        // Valeurs par défaut
        const total = messageStats.total || 0;
        const unread = messageStats.unread || 0;
        const avgResponse = stats.avgResponseTime || '0h';
        const avgRating = stats.avgRating || 0;
        const totalRatings = stats.totalRatings || 0;

        let html = `
            <!-- Barre de filtres -->
            <div class="stats-filters-bar">
                <div class="stats-filter-group">
                    <label for="periodSelectStats">Période :</label>
                    <select id="periodSelectStats" class="stats-filter-select">
                        <option value="7">7 jours</option>
                        <option value="14" selected>14 jours</option>
                        <option value="30">30 jours</option>
                    </select>
                </div>
                <div class="stats-filter-group">
                    <label for="agentFilterStats">Agent :</label>
                    <select id="agentFilterStats" class="stats-filter-select">
                        <option value="all">Tous</option>
                        ${agents.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                    </select>
                </div>
                <div class="stats-filter-group">
                    <label for="statusFilterStats">Statut :</label>
                    <select id="statusFilterStats" class="stats-filter-select">
                        <option value="all">Tous</option>
                        <option value="open">Ouvert</option>
                        <option value="pending">En attente</option>
                        <option value="closed">Fermé</option>
                    </select>
                </div>
                <button class="stats-refresh-btn" id="refreshStatsBtn">
                    <i class="fas fa-sync-alt"></i> Appliquer
                </button>
            </div>

            <!-- Indicateurs -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon" style="background: rgba(245, 124, 0, 0.12); color: #f57c00;">
                            <i class="fas fa-envelope"></i>
                        </div>
                    </div>
                    <div class="stat-value">${total}</div>
                    <div class="stat-label">Total messages</div>
                    <div class="stat-sub">${messageStats.today || 0} aujourd’hui</div>
                </div>
                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon" style="background: rgba(239, 68, 68, 0.12); color: #dc2626;">
                            <i class="fas fa-envelope-open"></i>
                        </div>
                    </div>
                    <div class="stat-value">${unread}</div>
                    <div class="stat-label">Non lus</div>
                    <div class="stat-sub">${messageStats.open || 0} ouverts</div>
                </div>
                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon" style="background: rgba(255, 152, 0, 0.12); color: #ff9800;">
                            <i class="fas fa-clock"></i>
                        </div>
                    </div>
                    <div class="stat-value">${avgResponse}</div>
                    <div class="stat-label">Temps réponse moyen</div>
                    <div class="stat-sub">Objectif : 1h30</div>
                </div>
                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon" style="background: rgba(76, 175, 80, 0.12); color: #4caf50;">
                            <i class="fas fa-star"></i>
                        </div>
                    </div>
                    <div class="stat-value">${avgRating}</div>
                    <div class="stat-label">Satisfaction moyenne</div>
                    <div class="stat-sub">${totalRatings} avis</div>
                </div>
            </div>

            <!-- Graphiques -->
            <div class="charts-row">
                <div class="card chart-card">
                    <div class="card-header">
                        <div class="card-title">
                            <i class="fas fa-chart-line" style="color: #f57c00;"></i> Évolution des messages
                        </div>
                    </div>
                    <div class="chart-wrapper">
                        <canvas id="activityChartStats"></canvas>
                    </div>
                </div>
                <div class="card chart-card">
                    <div class="card-header">
                        <div class="card-title">
                            <i class="fas fa-chart-pie" style="color: #2e7d32;"></i> Répartition des statuts
                        </div>
                    </div>
                    <div class="chart-wrapper">
                        <canvas id="statusChartStats"></canvas>
                    </div>
                </div>
            </div>

            <!-- Tableau des conversations -->
            <div class="card">
                <div class="card-header">
                    <div class="card-title">
                        <i class="fas fa-list" style="color: #f57c00;"></i> Liste des conversations
                    </div>
                    <div class="card-actions">
                        <span id="convCount" style="font-size:13px;color:var(--gray-500);">0 conversation(s)</span>
                    </div>
                </div>
                <div class="table-container">
                    <table class="stats-table" id="conversationsTable">
                        <thead>
                            <tr>
                                <th>Client</th>
                                <th>Sujet</th>
                                <th>Statut</th>
                                <th>Agent</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="conversationsTableBody">
                            <!-- Rempli par JS -->
                        </tbody>
                    </table>
                </div>
                <div class="pagination-controls" id="paginationControls">
                    <button id="prevPageBtn" class="page-btn" disabled><i class="fas fa-chevron-left"></i></button>
                    <span id="pageInfo">Page 1 / 1</span>
                    <button id="nextPageBtn" class="page-btn" disabled><i class="fas fa-chevron-right"></i></button>
                </div>
            </div>

            <!-- Tableau des agents -->
            <div class="card">
                <div class="card-header">
                    <div class="card-title">
                        <i class="fas fa-users" style="color: #2e7d32;"></i> Performance des agents
                    </div>
                    <div class="card-actions">
                        <span id="agentCount" style="font-size:13px;color:var(--gray-500);">${agents.length} agent(s)</span>
                    </div>
                </div>
                <div class="table-container">
                    <table class="stats-table" id="agentsTable">
                        <thead>
                            <tr>
                                <th>Agent</th>
                                <th>Messages</th>
                                <th>Temps moyen</th>
                                <th>Note</th>
                                <th>Statut</th>
                            </tr>
                        </thead>
                        <tbody id="agentsTableBody">
                            ${agents.map(a => `
                                <tr>
                                    <td><strong>${a.name}</strong></td>
                                    <td>${a.messages || 0}</td>
                                    <td>${a.avgTime || '-'}</td>
                                    <td>${a.rating || '-'}</td>
                                    <td><span class="status-badge ${a.status === 'active' ? 'active' : 'suspended'}">${a.status === 'active' ? 'Actif' : 'Suspendu'}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Exports -->
            <div class="card">
                <div class="card-header">
                    <div class="card-title">
                        <i class="fas fa-download" style="color: #ff9800;"></i> Exporter les données
                    </div>
                </div>
                <div style="display:flex; gap:12px; flex-wrap:wrap;">
                    <button class="btn-primary" onclick="Toast.info('Export CSV en cours...')"><i class="fas fa-file-csv"></i> CSV</button>
                    <button class="btn-primary" onclick="Toast.info('Export Excel en cours...')"><i class="fas fa-file-excel"></i> Excel</button>
                    <button class="btn-primary" style="background: #dc2626;" onclick="Toast.info('Export PDF en cours...')"><i class="fas fa-file-pdf"></i> PDF</button>
                </div>
            </div>
        `;

        // Stocker les données pour les graphiques
        window._statsActivity = activityData;
        window._statsStatus = statusDistribution;

        return html;
    } catch (error) {
        console.error('Erreur statistiques:', error);
        return `
            <div class="card" style="text-align:center;padding:60px 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size:48px;color:#f57c00;margin-bottom:16px;"></i>
                <h2>Erreur de chargement</h2>
                <p style="color:var(--gray-500);">${error.message}</p>
                <button onclick="window.loadPage('statistiques')" class="btn-primary" style="margin-top:16px;">
                    <i class="fas fa-sync"></i> Réessayer
                </button>
            </div>
        `;
    }
}

export function init() {
    setTimeout(() => {
        try {
            initCharts();
            initListeners();
            renderTable();
        } catch (error) {
            console.error('Erreur init statistiques:', error);
        }
    }, 300);
}

// ============================================
// GRAPHIQUES
// ============================================
function initCharts() {
    const activity = window._statsActivity || { labels: [], incoming: [], processed: [] };
    const status = window._statsStatus || { labels: [], data: [], colors: [] };

    const ctx1 = document.getElementById('activityChartStats');
    if (ctx1) {
        if (chartActivity) chartActivity.destroy();
        chartActivity = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: activity.labels,
                datasets: [
                    {
                        label: 'Entrants',
                        data: activity.incoming,
                        borderColor: '#f57c00',
                        backgroundColor: 'rgba(245, 124, 0, 0.08)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#f57c00',
                        pointRadius: 4,
                    },
                    {
                        label: 'Traités',
                        data: activity.processed,
                        borderColor: '#2e7d32',
                        backgroundColor: 'rgba(46, 125, 50, 0.08)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#2e7d32',
                        pointRadius: 4,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true, padding: 20 } }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    const ctx2 = document.getElementById('statusChartStats');
    if (ctx2) {
        if (chartStatus) chartStatus.destroy();
        chartStatus = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: status.labels,
                datasets: [{
                    data: status.data,
                    backgroundColor: status.colors,
                    borderColor: '#fff',
                    borderWidth: 3,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } }
                }
            }
        });
    }
}

// ============================================
// TABLEAU DES CONVERSATIONS (pagination)
// ============================================
function renderTable() {
    const tbody = document.getElementById('conversationsTableBody');
    if (!tbody) return;

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = filteredConversations.slice(start, end);

    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--gray-500);">Aucune conversation trouvée</td></tr>`;
    } else {
        tbody.innerHTML = pageData.map(conv => `
            <tr>
                <td><strong>${conv.client}</strong></td>
                <td>${conv.subject || 'Sans objet'}</td>
                <td><span class="status-badge ${conv.status}">${conv.status === 'open' ? 'Ouvert' : conv.status === 'pending' ? 'En attente' : 'Fermé'}</span></td>
                <td>${conv.agent || 'Non assigné'}</td>
                <td>${new Date(conv.createdAt).toLocaleDateString('fr-FR')}</td>
                <td>
                    <button class="conv-action-btn" onclick="window.loadPage('conversation-detail', ${conv.id})" title="Voir">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    const totalPages = Math.ceil(filteredConversations.length / pageSize);
    document.getElementById('pageInfo').textContent = `Page ${currentPage} / ${totalPages || 1}`;
    document.getElementById('prevPageBtn').disabled = currentPage <= 1;
    document.getElementById('nextPageBtn').disabled = currentPage >= totalPages;
    document.getElementById('convCount').textContent = `${filteredConversations.length} conversation(s)`;
}

function applyFilters() {
    const agentId = parseInt(document.getElementById('agentFilterStats').value);
    const status = document.getElementById('statusFilterStats').value;
    filteredConversations = allConversations.filter(c => {
        const matchAgent = isNaN(agentId) || c.agentId === agentId;
        const matchStatus = status === 'all' || c.status === status;
        return matchAgent && matchStatus;
    });
    currentPage = 1;
    renderTable();
}

// ============================================
// ÉVÉNEMENTS
// ============================================
function initListeners() {
    document.getElementById('refreshStatsBtn')?.addEventListener('click', applyFilters);
    document.getElementById('prevPageBtn')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });
    document.getElementById('nextPageBtn')?.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredConversations.length / pageSize);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });
    document.getElementById('periodSelectStats')?.addEventListener('change', function() {
        Toast.info(`Période changée pour ${this.value} jours`);
        window.loadPage('statistiques');
    });
}

// ============================================
// STYLES SPÉCIFIQUES
// ============================================
const statsStyles = document.createElement('style');
statsStyles.textContent = `
    .stats-filters-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        align-items: center;
        background: white;
        padding: 12px 20px;
        border-radius: var(--radius);
        border: 1px solid var(--gray-100);
        margin-bottom: 20px;
    }
    .stats-filter-group {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .stats-filter-group label {
        font-weight: 500;
        color: var(--gray-600);
        font-size: 14px;
    }
    .stats-filter-select {
        padding: 8px 14px;
        border: 2px solid var(--gray-200);
        border-radius: var(--radius-sm);
        font-size: 14px;
        font-family: inherit;
        background: var(--gray-50);
        cursor: pointer;
        transition: var(--transition);
    }
    .stats-filter-select:focus {
        outline: none;
        border-color: var(--orange-500);
    }
    .stats-refresh-btn {
        padding: 8px 20px;
        background: var(--orange-gradient);
        color: white;
        border: none;
        border-radius: var(--radius-sm);
        font-weight: 600;
        cursor: pointer;
        transition: var(--transition);
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        margin-left: auto;
    }
    .stats-refresh-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(245, 124, 0, 0.3);
    }
    .stats-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
    }
    .stats-table th {
        text-align: left;
        padding: 12px 16px;
        background: var(--gray-50);
        font-weight: 600;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--gray-500);
        border-bottom: 2px solid var(--gray-200);
    }
    .stats-table td {
        padding: 12px 16px;
        border-bottom: 1px solid var(--gray-100);
        vertical-align: middle;
    }
    .stats-table tr:hover {
        background: var(--gray-50);
    }
    .conv-action-btn {
        background: none;
        border: none;
        color: var(--gray-400);
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: var(--transition);
    }
    .conv-action-btn:hover {
        background: var(--gray-100);
        color: var(--orange-600);
    }
    .pagination-controls {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 12px;
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid var(--gray-200);
    }
    .page-btn {
        padding: 6px 14px;
        border: 1px solid var(--gray-200);
        border-radius: var(--radius-sm);
        background: white;
        cursor: pointer;
        transition: var(--transition);
        font-size: 14px;
        color: var(--gray-600);
    }
    .page-btn:hover:not(:disabled) {
        background: var(--gray-100);
        border-color: var(--orange-500);
    }
    .page-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
    #pageInfo {
        font-size: 14px;
        color: var(--gray-600);
    }
    @media (max-width: 768px) {
        .stats-filters-bar {
            flex-direction: column;
            align-items: stretch;
        }
        .stats-filter-group {
            flex-wrap: wrap;
        }
        .stats-refresh-btn {
            margin-left: 0;
            width: 100%;
            justify-content: center;
        }
        .stats-table {
            font-size: 13px;
        }
        .stats-table th, .stats-table td {
            padding: 8px 10px;
        }
        .stats-table th:nth-child(3), .stats-table td:nth-child(3),
        .stats-table th:nth-child(4), .stats-table td:nth-child(4) {
            display: none;
        }
    }
    @media (max-width: 480px) {
        .stats-grid {
            grid-template-columns: 1fr 1fr;
        }
    }
`;
document.head.appendChild(statsStyles);