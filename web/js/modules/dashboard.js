// modules/dashboard.js
import { API } from '../services/api.js';

export async function render() {
    try {
        const stats = await API.getStats();
        const agents = await API.getAgents();
        const messageStats = await API.getMessageStats();

        const safeStats = stats || { totalMessages: 0, todayMessages: 0, avgResponseTime: '0h', avgRating: 0, totalRatings: 0 };
        const safeAgents = agents || [];

        // ✅ On ne compte QUE les opérateurs (role === 'agent') dans les cartes agents
        const operatorsOnly = safeAgents.filter(a => a.role === 'agent');
        const onlineAgents = operatorsOnly.filter(a => a.status === 'active').length;
        const totalOperators = operatorsOnly.length;
        const totalUsers = safeAgents.length;

        let html = `
            <!-- 4 indicateurs clés -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon" style="background: rgba(245, 124, 0, 0.12); color: #f57c00;">
                            <i class="fas fa-envelope"></i>
                        </div>
                        <span class="stat-trend up">+12%</span>
                    </div>
                    <div class="stat-value">${safeStats.totalMessages}</div>
                    <div class="stat-label">Messages total</div>
                    <div class="stat-sub">${safeStats.todayMessages} aujourd'hui</div>
                </div>
                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon" style="background: rgba(46, 125, 50, 0.12); color: #2e7d32;">
                            <i class="fas fa-users"></i>
                        </div>
                        <span class="stat-trend up">+2</span>
                    </div>
                    <div class="stat-value">${onlineAgents}/${totalOperators}</div>
                    <div class="stat-label">Opérateurs en ligne</div>
                    <div class="stat-sub">${totalOperators - onlineAgents} hors ligne</div>
                </div>
                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon" style="background: rgba(255, 152, 0, 0.12); color: #ff9800;">
                            <i class="fas fa-clock"></i>
                        </div>
                        <span class="stat-trend down">-5%</span>
                    </div>
                    <div class="stat-value">${safeStats.avgResponseTime}</div>
                    <div class="stat-label">Temps réponse moyen</div>
                </div>
                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon" style="background: rgba(76, 175, 80, 0.12); color: #4caf50;">
                            <i class="fas fa-star"></i>
                        </div>
                        <span class="stat-trend up">+0.3</span>
                    </div>
                    <div class="stat-value">${safeStats.avgRating}</div>
                    <div class="stat-label">Satisfaction client</div>
                    <div class="stat-sub">${safeStats.totalRatings} avis</div>
                </div>
            </div>

            <!-- Tuiles de raccourci -->
            <div class="dashboard-shortcuts">
                <div class="shortcut-card" data-page="agents">
                    <div class="shortcut-icon" style="background: linear-gradient(135deg, #f57c00, #ff9800);">
                        <i class="fas fa-users"></i>
                    </div>
                    <h3>Agents</h3>
                    <p>Gérer votre équipe</p>
                    <span class="shortcut-badge">${totalUsers}</span>
                </div>
                <div class="shortcut-card" data-page="conversations">
                    <div class="shortcut-icon" style="background: linear-gradient(135deg, #2e7d32, #4caf50);">
                        <i class="fas fa-comments"></i>
                    </div>
                    <h3>Conversations</h3>
                    <p>Voir tous les messages</p>
                    <span class="shortcut-badge">${messageStats.total || 0}</span>
                </div>
                <div class="shortcut-card" data-page="statistiques">
                    <div class="shortcut-icon" style="background: linear-gradient(135deg, #1565c0, #42a5f5);">
                        <i class="fas fa-chart-bar"></i>
                    </div>
                    <h3>Statistiques</h3>
                    <p>Analyses détaillées</p>
                </div>
                <div class="shortcut-card" data-page="parametres">
                    <div class="shortcut-icon" style="background: linear-gradient(135deg, #6d4c41, #a1887f);">
                        <i class="fas fa-cog"></i>
                    </div>
                    <h3>Paramètres</h3>
                    <p>Configuration</p>
                </div>
            </div>
        `;

        return html;
    } catch (error) {
        console.error('Erreur dashboard:', error);
        return `
            <div class="card" style="text-align:center;padding:60px 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size:48px;color:#f57c00;margin-bottom:16px;"></i>
                <h2>Erreur de chargement</h2>
                <p style="color:var(--gray-500);">${error.message}</p>
                <button onclick="window.loadPage('dashboard')" class="btn-primary" style="margin-top:16px;">
                    <i class="fas fa-sync"></i> Réessayer
                </button>
            </div>
        `;
    }
}

export function init() {
    document.querySelectorAll('.shortcut-card').forEach(card => {
        card.addEventListener('click', function() {
            const page = this.dataset.page;
            if (page) {
                window.loadPage(page);
            }
        });
    });
}

// ============================================
// STYLES
// ============================================
const dashboardStyles = document.createElement('style');
dashboardStyles.textContent = `
    .dashboard-shortcuts {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-top: 24px;
    }
    .shortcut-card {
        background: white;
        border-radius: var(--radius);
        padding: 24px 20px;
        text-align: center;
        border: 1px solid var(--gray-100);
        transition: var(--transition);
        cursor: pointer;
        position: relative;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .shortcut-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 10px 40px rgba(0,0,0,0.08);
        border-color: var(--orange-200);
    }
    .shortcut-icon {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 12px;
        color: white;
        font-size: 24px;
    }
    .shortcut-card h3 {
        font-size: 18px;
        font-weight: 700;
        color: var(--gray-800);
        margin-bottom: 4px;
    }
    .shortcut-card p {
        font-size: 14px;
        color: var(--gray-500);
        margin-bottom: 8px;
    }
    .shortcut-badge {
        position: absolute;
        top: 12px;
        right: 12px;
        background: var(--orange-500);
        color: white;
        font-size: 12px;
        font-weight: 700;
        padding: 2px 10px;
        border-radius: 20px;
        min-width: 24px;
        text-align: center;
    }

    @media (max-width: 768px) {
        .dashboard-shortcuts { grid-template-columns: 1fr 1fr; }
        .shortcut-card { padding: 20px 16px; }
        .shortcut-icon { width: 48px; height: 48px; font-size: 20px; }
        .shortcut-card h3 { font-size: 16px; }
    }
    @media (max-width: 480px) {
        .dashboard-shortcuts { grid-template-columns: 1fr; }
    }
`;
document.head.appendChild(dashboardStyles);