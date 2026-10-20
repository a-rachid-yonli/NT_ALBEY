export const Modal = {
    /**
     * Affiche une modale avec le contenu HTML fourni
     * @param {string} content - Contenu HTML à afficher dans la modale
     */
    show(content) {
        const container = document.getElementById('modalContainer');
        if (!container) {
            console.error('❌ Conteneur modal introuvable !');
            return;
        }

        // Créer la modale
        container.innerHTML = `
            <div class="modal-overlay" id="modalOverlay">
                <div class="modal-content">
                    ${content}
                </div>
            </div>
        `;

        // Fermer en cliquant sur l'overlay
        const overlay = document.getElementById('modalOverlay');
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close();
            }
        });

        // Fermer avec la touche Echap
        document.addEventListener('keydown', this._handleEscape);
    },

    /**
     * Ferme la modale
     */
    close() {
        const container = document.getElementById('modalContainer');
        if (container) {
            container.innerHTML = '';
        }
        document.removeEventListener('keydown', this._handleEscape);
    },

    /**
     * Gestionnaire de touche Echap
     * @param {KeyboardEvent} e
     */
    _handleEscape(e) {
        if (e.key === 'Escape') {
            Modal.close();
        }
    }
};