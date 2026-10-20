// modules/parametres.js
import { API } from '../services/api.js';
import { state } from '../services/state.js';
import { Toast } from '../components/toast.js';

export async function render() {
    // Récupérer l'utilisateur courant
    const user = state.getUser();
    if (!user) {
        return `<div class="card"><p>Veuillez vous connecter pour accéder aux paramètres.</p></div>`;
    }

    // Récupérer les paramètres depuis l'API
    const settings = await API.getSettings();

    // Valeurs par défaut
    const emailNotifications = settings.emailNotifications !== undefined ? settings.emailNotifications : true;
    const pushNotifications = settings.pushNotifications || false;
    const newConversations = settings.newConversations !== undefined ? settings.newConversations : true;
    const weeklyReports = settings.weeklyReports !== undefined ? settings.weeklyReports : true;

    return `
        <div class="card">
            <div class="card-header">
                <div class="card-title">
                    <i class="fas fa-cog" style="color: #f57c00;"></i>
                    Paramètres du système
                </div>
            </div>
            
            <div style="padding: 20px 0;">
                <p style="color: var(--gray-500); margin-bottom: 24px;">
                    Gérez les paramètres de votre plateforme de service client.
                </p>
                
                <!-- Section 1 : Profil -->
                <div style="background: var(--gray-50); border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                    <h3 style="margin-bottom: 12px; font-size: 16px;">
                        <i class="fas fa-user" style="color: #f57c00;"></i> Profil administrateur
                    </h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div>
                            <label style="font-size: 13px; color: var(--gray-500);">Nom</label>
                            <p style="font-weight: 600;">${user.name || 'Non défini'}</p>
                        </div>
                        <div>
                            <label style="font-size: 13px; color: var(--gray-500);">Email</label>
                            <p style="font-weight: 600;">${user.email || 'Non défini'}</p>
                        </div>
                        <div>
                            <label style="font-size: 13px; color: var(--gray-500);">Rôle</label>
                            <p style="font-weight: 600;">
                                <span class="status-badge ${user.role === 'chef' ? 'active' : 'suspended'}">
                                    ${user.role === 'chef' ? 'Chef de service' : 'Agent'}
                                </span>
                            </p>
                        </div>
                        <div>
                            <label style="font-size: 13px; color: var(--gray-500);">Membre depuis</label>
                            <p style="font-weight: 600;">${user.joinedAt || 'Janvier 2025'}</p>
                        </div>
                    </div>
                </div>
                
                <!-- Section 2 : Notifications -->
                <div style="background: var(--gray-50); border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                    <h3 style="margin-bottom: 12px; font-size: 16px;">
                        <i class="fas fa-bell" style="color: #f57c00;"></i> Notifications
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                            <input type="checkbox" id="emailNotif" ${emailNotifications ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #f57c00;">
                            Notifications par email
                        </label>
                        <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                            <input type="checkbox" id="pushNotif" ${pushNotifications ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #f57c00;">
                            Notifications push
                        </label>
                        <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                            <input type="checkbox" id="newConvNotif" ${newConversations ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #f57c00;">
                            Nouvelles conversations
                        </label>
                        <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                            <input type="checkbox" id="weeklyNotif" ${weeklyReports ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #f57c00;">
                            Rapports hebdomadaires
                        </label>
                    </div>
                </div>
                
                <!-- Section 3 : Sécurité -->
                <div style="background: var(--gray-50); border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                    <h3 style="margin-bottom: 12px; font-size: 16px;">
                        <i class="fas fa-shield-alt" style="color: #2e7d32;"></i> Sécurité
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <button class="btn-primary" id="changePasswordBtn">
                            <i class="fas fa-key"></i> Changer le mot de passe
                        </button>
                        <button class="btn-primary" style="background: var(--green-gradient);" id="enable2faBtn">
                            <i class="fas fa-shield-alt"></i> Activer la double authentification
                        </button>
                    </div>
                </div>
                
                <!-- Section 4 : Export -->
                <div style="background: var(--gray-50); border-radius: 12px; padding: 20px;">
                    <h3 style="margin-bottom: 12px; font-size: 16px;">
                        <i class="fas fa-download" style="color: #ff9800;"></i> Export des données
                    </h3>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        <button class="btn-primary" id="exportPdfBtn">
                            <i class="fas fa-file-pdf"></i> PDF Agents
                        </button>
                        <button class="btn-primary" id="exportExcelBtn">
                            <i class="fas fa-file-excel"></i> Excel Conversations
                        </button>
                        <button class="btn-primary" style="background: var(--green-gradient);" id="exportCsvBtn">
                            <i class="fas fa-file-csv"></i> CSV Statistiques
                        </button>
                    </div>
                </div>

                <!-- Bouton d'enregistrement global -->
                <div style="margin-top: 24px; text-align: right;">
                    <button class="btn-primary" id="saveSettingsBtn">
                        <i class="fas fa-save"></i> Enregistrer les paramètres
                    </button>
                </div>
            </div>
        </div>
    `;
}

export function init() {
    console.log('📌 Module Paramètres chargé');

    // Récupérer les éléments
    const emailNotif = document.getElementById('emailNotif');
    const pushNotif = document.getElementById('pushNotif');
    const newConvNotif = document.getElementById('newConvNotif');
    const weeklyNotif = document.getElementById('weeklyNotif');
    const saveBtn = document.getElementById('saveSettingsBtn');

    // Fonction de sauvegarde des paramètres
    async function saveSettings() {
        const settings = {
            emailNotifications: emailNotif.checked,
            pushNotifications: pushNotif.checked,
            newConversations: newConvNotif.checked,
            weeklyReports: weeklyNotif.checked
        };

        try {
            await API.updateSettings(settings);
            Toast.success('Paramètres enregistrés avec succès');
        } catch (error) {
            Toast.error('Erreur lors de l\'enregistrement : ' + error.message);
        }
    }

    // Sauvegarde immédiate lors du changement d'une case à cocher
    [emailNotif, pushNotif, newConvNotif, weeklyNotif].forEach(cb => {
        cb?.addEventListener('change', saveSettings);
    });

    // Bouton d'enregistrement global
    saveBtn?.addEventListener('click', saveSettings);

    // Sécurité : Changer mot de passe
    document.getElementById('changePasswordBtn')?.addEventListener('click', async () => {
        try {
            await API.changePassword();
            Toast.success('Un email de réinitialisation vous a été envoyé.');
        } catch (error) {
            Toast.error('Erreur : ' + error.message);
        }
    });

    // Sécurité : Double authentification
    document.getElementById('enable2faBtn')?.addEventListener('click', async () => {
        try {
            const result = await API.enable2FA();
            if (result.success) {
                Toast.success('Double authentification activée avec succès.');
            } else {
                Toast.error('Échec de l\'activation.');
            }
        } catch (error) {
            Toast.error('Erreur : ' + error.message);
        }
    });

    // Exports
    document.getElementById('exportPdfBtn')?.addEventListener('click', async () => {
        try {
            await API.exportData('pdf');
            Toast.success('Export PDF en cours de génération...');
        } catch (error) {
            Toast.error('Erreur d\'export : ' + error.message);
        }
    });

    document.getElementById('exportExcelBtn')?.addEventListener('click', async () => {
        try {
            await API.exportData('excel');
            Toast.success('Export Excel en cours de génération...');
        } catch (error) {
            Toast.error('Erreur d\'export : ' + error.message);
        }
    });

    document.getElementById('exportCsvBtn')?.addEventListener('click', async () => {
        try {
            await API.exportData('csv');
            Toast.success('Export CSV en cours de génération...');
        } catch (error) {
            Toast.error('Erreur d\'export : ' + error.message);
        }
    });
}