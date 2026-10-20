// web/js/modules/auth.js
import { state } from '../services/state.js';
import { Toast } from '../components/toast.js';
import { API } from '../services/api.js';
import { disconnectSocket } from '../services/socket.js';

// ✅ Page par défaut selon le rôle
function getDefaultPage(user) {
    switch (user?.role) {
        case 'admin_systeme': return 'tickets';
        case 'agent':         return 'conversations';
        case 'chef':
        case 'super_admin':
        default:              return 'dashboard';
    }
}

export const AuthModule = {
    async login(email, password, rememberMe) {
        try {
            if (!email || !password) {
                throw new Error('Veuillez remplir tous les champs');
            }

            const user = await API.login(email, password);
            state.setUser(user, rememberMe);

            // ✅ CORRECTIF : on utilise showApp() au lieu de bricoler le DOM.
            //    → ça déclenche initNotificationsUI() + setupGlobalNotifications()
            //    → la cloche est branchée dès le premier login (plus besoin de F5)
            if (typeof window.showApp === 'function') {
                window.showApp();
            } else {
                // Fallback si showApp n'est pas encore exposé
                document.getElementById('loginPage').style.display = 'none';
                document.getElementById('app').style.display = 'flex';
                document.getElementById('userName').textContent = user.name;

                if (window.updateSidebar) window.updateSidebar(user);

                // Force le setup des notifications malgré tout
                if (typeof window.initNotificationsUI === 'function') {
                    window.initNotificationsUI();
                }
                if (typeof window.setupGlobalNotifications === 'function') {
                    setTimeout(window.setupGlobalNotifications, 300);
                }
            }

            // ✅ Redirection selon le rôle (4 rôles)
            const defaultPage = getDefaultPage(user);
            await window.loadPage(defaultPage);

            Toast.success(`Bienvenue ${user.name} !`);
            return { success: true };
        } catch (error) {
            this._showError(error.message);
            return { success: false, error: error.message };
        }
    },

    logout() {
        // ✅ Fire-and-forget : log côté serveur AVANT de nettoyer l'état
        API.logout().catch(() => {});

        // ✅ Déconnecter la socket AVANT de nettoyer l'état
        try {
            disconnectSocket();
        } catch (err) {
            console.debug('Socket déjà déconnectée');
        }

        state.clearUser();
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
        document.getElementById('loginError').className = 'error-message';
    },

    _showError(message) {
        const errorEl = document.getElementById('loginError');
        errorEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        errorEl.className = 'error-message show';

        const form = document.getElementById('loginForm');
        form.style.animation = 'shake 0.5s ease';
        setTimeout(() => form.style.animation = '', 500);
    }
};