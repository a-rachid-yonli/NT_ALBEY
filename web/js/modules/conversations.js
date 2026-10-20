// modules/conversations.js
import { API } from '../services/api.js';
import { state } from '../services/state.js';
import { Toast } from '../components/toast.js';
import { Modal } from '../components/modal.js';
import { initSocket, onMessageReceived } from '../services/socket.js';

// ============================================
// RENDER
// ============================================
export async function render() {
    const conversations = await API.getConversations();
    const isChef = state.isChef();

    const stats = await API.getConversationStats();
    const total = stats.total || 0;
    const nonLus = stats.nonLus || 0;
    const archives = stats.archives || 0;
    const lus = stats.lus || 0;

    let html = `
        <div class="conversations-stats-grid">
            <div class="conversations-stat-card">
                <div class="conversations-stat-icon" style="background: rgba(245, 124, 0, 0.12); color: #f57c00;">
                    <i class="fas fa-envelope"></i>
                </div>
                <div class="conversations-stat-info">
                    <div class="conversations-stat-value">${total}</div>
                    <div class="conversations-stat-label">Total messages</div>
                </div>
            </div>
            <div class="conversations-stat-card">
                <div class="conversations-stat-icon" style="background: rgba(46, 125, 50, 0.12); color: #2e7d32;">
                    <i class="fas fa-envelope-open"></i>
                </div>
                <div class="conversations-stat-info">
                    <div class="conversations-stat-value">${nonLus}</div>
                    <div class="conversations-stat-label">Non lus</div>
                </div>
            </div>
            <div class="conversations-stat-card">
                <div class="conversations-stat-icon" style="background: rgba(255, 152, 0, 0.12); color: #ff9800;">
                    <i class="fas fa-archive"></i>
                </div>
                <div class="conversations-stat-info">
                    <div class="conversations-stat-value">${archives}</div>
                    <div class="conversations-stat-label">Archivés</div>
                </div>
            </div>
            <div class="conversations-stat-card">
                <div class="conversations-stat-icon" style="background: rgba(76, 175, 80, 0.12); color: #4caf50;">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="conversations-stat-info">
                    <div class="conversations-stat-value">${lus}</div>
                    <div class="conversations-stat-label">Lus</div>
                </div>
            </div>
        </div>

        <div class="conversations-actions-bar">
            <div class="conversations-search-wrapper">
                <i class="fas fa-search"></i>
                <input type="text" id="searchConversation" placeholder="Rechercher un message..." class="conversations-search-input">
            </div>
            <div class="conversations-filter-group">
                <select id="filterStatus" class="conversations-filter-select">
                    <option value="all">Tous</option>
                    <option value="nonlu">Non lus</option>
                    <option value="lu">Lus</option>
                    <option value="archive">Archivés</option>
                </select>
                <button class="conversations-btn-add" id="newMessageBtn">
                    <i class="fas fa-plus"></i> Nouveau message
                </button>
            </div>
        </div>

        <div class="conversations-list" id="conversationsList">
            ${buildConversationsListHtml(conversations)}
        </div>
    `;

    return html;
}

// ============================================
// CONSTRUCTION DE LA LISTE (extraite pour réutilisation)
// ============================================
function buildConversationsListHtml(conversations) {
    if (!conversations || conversations.length === 0) {
        return `
            <div class="conversations-empty">
                <i class="fas fa-inbox" style="font-size:48px;color:var(--gray-300);margin-bottom:16px;"></i>
                <h3>Aucun message</h3>
                <p style="color:var(--gray-500);">Les messages des clients apparaîtront ici</p>
            </div>
        `;
    }

    let html = '';
    conversations.forEach((conv) => {
        let isRead = true;
        if (conv.messages && conv.messages.length > 0) {
            const last = conv.messages[conv.messages.length - 1];
            if (last.from === 'client' && !last.isRead) isRead = false;
        }

        const isArchived = conv.archived !== undefined ? conv.archived : false;

        const statusIcon = isRead ? 'fa-check-circle' : 'fa-circle';
        const statusColor = isRead ? '#4caf50' : '#f57c00';
        const archiveClass = isArchived ? 'archive' : '';
        const archiveIcon = isArchived ? 'fa-archive' : 'fa-inbox';

        const expediteur = conv.clientName || conv.client || 'Client inconnu';
        const date = conv.createdAt ? new Date(conv.createdAt).toLocaleString('fr-FR') : 'Date inconnue';
        const sujet = conv.subject || 'Sans objet';
        let contenu = '';
        if (conv.messages && conv.messages.length > 0) {
            const firstMsg = conv.messages.find((m) => m.from === 'client');
            if (firstMsg) contenu = firstMsg.content;
        }
        const repondant = conv.agentId ? 'Assigné' : 'En attente de réponse';
        const hasAttachment = conv.messages?.some((m) => m.attachments?.length > 0) || false;

        html += `
            <div class="conversation-item ${archiveClass}" data-id="${conv.id}" data-lu="${isRead}" data-archive="${isArchived}" onclick="window.loadPage('conversation-detail', ${conv.id})" style="cursor:pointer;">
                <div class="conv-status">
                    <i class="fas ${statusIcon}" style="color: ${statusColor};"></i>
                </div>
                <div class="conv-content">
                    <div class="conv-header">
                        <span class="conv-sender"><strong>${expediteur}</strong></span>
                        <span class="conv-date">${date}</span>
                    </div>
                    <div class="conv-subject">${sujet}</div>
                    <div class="conv-preview">${contenu.substring(0, 100)}${contenu.length > 100 ? '...' : ''}</div>
                    <div class="conv-footer">
                        <span class="conv-agent"><i class="fas fa-user-tie"></i> Répondu par : ${repondant}</span>
                        ${hasAttachment ? `<span class="conv-attachments"><i class="fas fa-paperclip"></i> Pièce jointe</span>` : ''}
                        <span class="conv-actions">
                            <button class="conv-btn reply-btn" data-id="${conv.id}" title="Répondre"><i class="fas fa-reply"></i></button>
                            <button class="conv-btn toggle-archive" data-id="${conv.id}" title="${isArchived ? 'Désarchiver' : 'Archiver'}"><i class="fas ${archiveIcon}"></i></button>
                            <button class="conv-btn delete-conv" data-id="${conv.id}" title="Supprimer"><i class="fas fa-trash"></i></button>
                        </span>
                    </div>
                </div>
            </div>
        `;
    });
    return html;
}

// ============================================
// INIT
// ============================================
export function init() {
    // Actions classiques
    document.getElementById('newMessageBtn')?.addEventListener('click', showNewMessageModal);
    document.getElementById('searchConversation')?.addEventListener('input', filterConversations);
    document.getElementById('filterStatus')?.addEventListener('change', filterConversations);

    attachItemEventListeners();

    // ✅ Initialiser la socket (idempotent : réutilise si déjà connectée)
    initSocket();

    // ✅ Écouter les nouveaux messages pour mettre à jour badge + liste en temps réel.
    // NB : ce listener sera remplacé par celui de conversation-detail.js
    // si l'utilisateur ouvre une conversation (comportement voulu).
    onMessageReceived(() => {
        updateBadge();
        refreshConversationsListIfVisible();
    });

    updateBadge();
}

// ============================================
// ATTACHEMENT DES LISTENERS SUR LES ITEMS
// (extrait pour pouvoir le ré-appliquer après un refresh dynamique)
// ============================================
function attachItemEventListeners() {
    document.querySelectorAll('.reply-btn').forEach((btn) => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const id = parseInt(this.dataset.id);
            showReplyModal(id);
        });
    });

    document.querySelectorAll('.toggle-archive').forEach((btn) => {
        btn.addEventListener('click', async function (e) {
            e.stopPropagation();
            const id = parseInt(this.dataset.id);
            await toggleArchive(id);
        });
    });

    document.querySelectorAll('.delete-conv').forEach((btn) => {
        btn.addEventListener('click', async function (e) {
            e.stopPropagation();
            const id = parseInt(this.dataset.id);
            if (confirm('Voulez-vous vraiment supprimer ce message ?')) {
                try {
                    await API.deleteConversation(id);
                    Toast.success('Message supprimé');
                    window.loadPage('conversations');
                } catch (error) {
                    Toast.error('Erreur : ' + error.message);
                }
            }
        });
    });
}

// ============================================
// REFRESH DE LA LISTE SANS RE-RENDER COMPLET
// ============================================
async function refreshConversationsListIfVisible() {
    const listEl = document.getElementById('conversationsList');
    if (!listEl) return; // pas sur la page conversations

    // Sauvegarder l'état de l'UI
    const searchValue = document.getElementById('searchConversation')?.value || '';
    const filterValue = document.getElementById('filterStatus')?.value || 'all';

    try {
        const conversations = await API.getConversations();
        listEl.innerHTML = buildConversationsListHtml(conversations);

        // Réattacher les handlers sur les nouveaux éléments
        attachItemEventListeners();

        // Restaurer les valeurs et ré-appliquer le filtre
        const searchInput = document.getElementById('searchConversation');
        const filterSelect = document.getElementById('filterStatus');
        if (searchInput) searchInput.value = searchValue;
        if (filterSelect) filterSelect.value = filterValue;
        filterConversations();

        // Rafraîchir aussi les compteurs en haut
        const stats = await API.getConversationStats();
        updateStatsCards(stats);
    } catch (error) {
        console.error('Erreur refresh liste conversations:', error);
    }
}

function updateStatsCards(stats) {
    const cards = document.querySelectorAll('.conversations-stat-value');
    if (cards.length >= 4) {
        cards[0].textContent = stats.total || 0;
        cards[1].textContent = stats.nonLus || 0;
        cards[2].textContent = stats.archives || 0;
        cards[3].textContent = stats.lus || 0;
    }
}

// ============================================
// FILTRES
// ============================================
function filterConversations() {
    const search = (document.getElementById('searchConversation')?.value || '').toLowerCase().trim();
    const filter = document.getElementById('filterStatus')?.value || 'all';

    document.querySelectorAll('.conversation-item').forEach((item) => {
        const sujet = item.querySelector('.conv-subject')?.textContent?.toLowerCase() || '';
        const expediteur = item.querySelector('.conv-sender')?.textContent?.toLowerCase() || '';
        const contenu = item.querySelector('.conv-preview')?.textContent?.toLowerCase() || '';
        const isLu = item.dataset.lu === 'true';
        const isArchive = item.dataset.archive === 'true';

        const matchSearch = sujet.includes(search) || expediteur.includes(search) || contenu.includes(search);
        let matchFilter = true;
        if (filter === 'nonlu') matchFilter = !isLu;
        else if (filter === 'lu') matchFilter = isLu;
        else if (filter === 'archive') matchFilter = isArchive;

        item.style.display = (matchSearch && matchFilter) ? '' : 'none';
    });
}

// ============================================
// MODALE RÉPONSE
// ============================================
async function showReplyModal(id) {
    const conv = await API.getConversation(id);
    if (!conv) {
        Toast.error('Message non trouvé');
        return;
    }

    const content = `
        <div class="modal-modern modal-conversation">
            <div class="modal-header">
                <div class="modal-icon" style="background: linear-gradient(135deg, #f59e0b, #f97316);">
                    <i class="fas fa-reply"></i>
                </div>
                <div class="modal-title-group">
                    <h2>Répondre à ${conv.clientName || conv.client || 'client'}</h2>
                    <p>Sujet : ${conv.subject || 'Sans objet'}</p>
                </div>
                <button class="modal-close" id="closeModalBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="replyForm">
                <div class="modal-body">
                    <div class="form-group">
                        <label><i class="fas fa-comment"></i> Votre réponse</label>
                        <textarea id="replyContent" rows="4" placeholder="Écrivez votre réponse..." required></textarea>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-paperclip"></i> Pièce jointe (simulée)</label>
                        <input type="file" id="replyAttachment" multiple>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" id="closeModalBtnFooter" class="btn-secondary">Annuler</button>
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-paper-plane"></i> Envoyer la réponse
                    </button>
                </div>
            </form>
        </div>
    `;

    Modal.show(content);

    document.getElementById('replyForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const reply = document.getElementById('replyContent').value.trim();
        if (!reply) {
            Toast.error('Veuillez écrire votre réponse');
            return;
        }
        try {
            await API.replyToConversation(id, reply);
            Toast.success('Réponse envoyée !');
            Modal.close();
            window.loadPage('conversations');
        } catch (error) {
            Toast.error('Erreur : ' + error.message);
        }
    });

    document.querySelectorAll('#closeModalBtn, #closeModalBtnFooter').forEach((btn) => {
        btn.addEventListener('click', Modal.close);
    });
}

// ============================================
// ARCHIVER / DÉSARCHIVER
// ============================================
async function toggleArchive(id) {
    try {
        const conv = await API.getConversation(id);
        if (!conv) {
            Toast.error('Conversation introuvable');
            return;
        }
        const isArchived = conv.archived || false;
        if (isArchived) {
            await API.unarchiveConversation(id);
            Toast.success('Conversation désarchivée');
        } else {
            await API.archiveConversation(id);
            Toast.success('Conversation archivée');
        }
        window.loadPage('conversations');
    } catch (error) {
        Toast.error('Erreur : ' + error.message);
    }
}

// ============================================
// MODALE NOUVEAU MESSAGE
// ============================================
async function showNewMessageModal() {
    let clients = [];
    try {
        clients = await API.getClients();
    } catch (error) {
        console.error('Erreur chargement clients:', error);
        Toast.error('Impossible de charger la liste des clients');
        return;
    }

    if (!clients || clients.length === 0) {
        Toast.warning('Aucun client disponible');
        return;
    }

    const uniqueClients = clients;

    const content = `
        <div class="modal-modern modal-conversation">
            <div class="modal-header">
                <div class="modal-icon" style="background: linear-gradient(135deg, #2563eb, #3b82f6);">
                    <i class="fas fa-pen"></i>
                </div>
                <div class="modal-title-group">
                    <h2>Nouveau message</h2>
                    <p>Envoyez un message à vos clients</p>
                </div>
                <button class="modal-close" id="closeModalBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="newMessageForm">
                <div class="modal-body">
                    <div class="form-group">
                        <label><i class="fas fa-users"></i> Destinataires</label>
                        <div class="recipient-selector-modern">
                            <div class="recipient-search-area">
                                <i class="fas fa-search"></i>
                                <input type="text" id="recipientSearch" placeholder="Rechercher un client..." class="recipient-search-input">
                                <span class="recipient-count" id="recipientCount">0 client(s)</span>
                            </div>
                            <div class="recipient-select-all">
                                <label class="select-all-label">
                                    <input type="checkbox" id="selectAllCheckbox">
                                    <span class="custom-checkbox"></span>
                                    Tous les clients
                                </label>
                                <span class="selected-count" id="selectedCount">0 sélectionné(s)</span>
                            </div>
                            <div class="recipient-list-modern" id="recipientListModern"></div>
                            <div class="selected-recipients-modern" id="selectedRecipientsModern">
                                <span class="placeholder">Aucun destinataire sélectionné</span>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label><i class="fas fa-tag"></i> Sujet</label>
                        <input type="text" id="messageSubject" placeholder="Sujet du message" required>
                    </div>

                    <div class="form-group">
                        <label><i class="fas fa-comment"></i> Contenu</label>
                        <textarea id="messageContent" rows="4" placeholder="Votre message..." required></textarea>
                    </div>

                    <div class="form-group">
                        <label><i class="fas fa-paperclip"></i> Pièces jointes</label>
                        <div class="file-upload-area" id="fileUploadArea">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Glissez vos fichiers ici ou cliquez pour choisir</p>
                            <input type="file" id="messageAttachment" multiple style="display:none;">
                            <button type="button" class="btn-upload" id="uploadBtn">Choisir des fichiers</button>
                        </div>
                        <div class="file-list" id="fileList"></div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" id="closeModalBtnFooter" class="btn-secondary">Annuler</button>
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-paper-plane"></i> Envoyer
                    </button>
                </div>
            </form>
        </div>
    `;

    Modal.show(content);

    const recipientList = document.getElementById('recipientListModern');
    const selectedContainer = document.getElementById('selectedRecipientsModern');
    const searchInput = document.getElementById('recipientSearch');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const recipientCount = document.getElementById('recipientCount');
    const selectedCount = document.getElementById('selectedCount');

    let selectedClients = new Set();
    let currentFilteredClients = [];

    function renderClientList(filter = '') {
        const filtered = uniqueClients.filter((c) => c.toLowerCase().includes(filter.toLowerCase()));
        currentFilteredClients = filtered;
        recipientCount.textContent = `${filtered.length} client(s)`;

        if (filtered.length === 0) {
            recipientList.innerHTML = `<div class="recipient-empty">Aucun client trouvé</div>`;
            return;
        }

        const allChecked = filtered.every((c) => selectedClients.has(c));
        selectAllCheckbox.checked = allChecked;

        let html = '';
        filtered.forEach((client) => {
            const checked = selectedClients.has(client) ? 'checked' : '';
            html += `
                <label class="recipient-item-modern">
                    <input type="checkbox" value="${client}" ${checked}>
                    <span class="recipient-name">${client}</span>
                </label>
            `;
        });
        recipientList.innerHTML = html;

        recipientList.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
            cb.addEventListener('change', function () {
                if (this.checked) {
                    selectedClients.add(this.value);
                } else {
                    selectedClients.delete(this.value);
                }
                updateSelectedDisplay();
                const allCheckedNow = currentFilteredClients.every((c) => selectedClients.has(c));
                selectAllCheckbox.checked = allCheckedNow;
                updateSelectedCount();
            });
        });
    }

    function updateSelectedDisplay() {
        if (selectedClients.size === 0) {
            selectedContainer.innerHTML = `<span class="placeholder">Aucun destinataire sélectionné</span>`;
            return;
        }
        const displayClients = Array.from(selectedClients).slice(0, 20);
        let html = '';
        displayClients.forEach((client) => {
            html += `
                <span class="selected-tag">
                    ${client}
                    <i class="fas fa-times remove-tag" data-client="${client}"></i>
                </span>
            `;
        });
        if (selectedClients.size > 20) {
            html += `<span class="selected-tag more">+${selectedClients.size - 20} autres</span>`;
        }
        selectedContainer.innerHTML = html;
        selectedContainer.querySelectorAll('.remove-tag').forEach((btn) => {
            btn.addEventListener('click', function () {
                const client = this.dataset.client;
                selectedClients.delete(client);
                const cb = recipientList.querySelector(`input[value="${client}"]`);
                if (cb) cb.checked = false;
                updateSelectedDisplay();
                updateSelectedCount();
                const allCheckedNow = currentFilteredClients.every((c) => selectedClients.has(c));
                selectAllCheckbox.checked = allCheckedNow;
            });
        });
        updateSelectedCount();
    }

    function updateSelectedCount() {
        selectedCount.textContent = `${selectedClients.size} sélectionné(s)`;
    }

    searchInput.addEventListener('input', function () {
        renderClientList(this.value);
    });

    selectAllCheckbox.addEventListener('change', function () {
        const isChecked = this.checked;
        const checkboxes = recipientList.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((cb) => {
            cb.checked = isChecked;
            const client = cb.value;
            if (isChecked) {
                selectedClients.add(client);
            } else {
                selectedClients.delete(client);
            }
        });
        updateSelectedDisplay();
    });

    renderClientList();

    const fileInput = document.getElementById('messageAttachment');
    const fileList = document.getElementById('fileList');
    const uploadBtn = document.getElementById('uploadBtn');
    const dropArea = document.getElementById('fileUploadArea');

    uploadBtn.addEventListener('click', () => fileInput.click());
    dropArea.addEventListener('click', () => fileInput.click());

    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('dragover');
    });
    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('dragover');
    });
    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            updateFileList();
        }
    });

    fileInput.addEventListener('change', updateFileList);

    function updateFileList() {
        const files = fileInput.files;
        if (files.length === 0) {
            fileList.innerHTML = '';
            return;
        }
        let html = '';
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            html += `
                <div class="file-item">
                    <i class="fas fa-file"></i>
                    <span>${f.name}</span>
                    <span class="file-size">(${(f.size / 1024).toFixed(1)} KB)</span>
                    <button type="button" class="file-remove" data-index="${i}"><i class="fas fa-times"></i></button>
                </div>
            `;
        }
        fileList.innerHTML = html;
        fileList.querySelectorAll('.file-remove').forEach((btn) => {
            btn.addEventListener('click', function () {
                const index = parseInt(this.dataset.index);
                const dt = new DataTransfer();
                const filesArray = Array.from(fileInput.files);
                filesArray.splice(index, 1);
                filesArray.forEach((f) => dt.items.add(f));
                fileInput.files = dt.files;
                updateFileList();
            });
        });
    }

    document.getElementById('newMessageForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const subject = document.getElementById('messageSubject').value.trim();
        const content = document.getElementById('messageContent').value.trim();
        const files = fileInput.files;

        if (!subject || !content) {
            Toast.error('Veuillez remplir le sujet et le contenu');
            return;
        }

        if (selectedClients.size === 0) {
            Toast.error('Veuillez sélectionner au moins un destinataire');
            return;
        }

        try {
            for (const client of selectedClients) {
                await API.createConversation({
                    client: client,
                    subject: subject,
                    content: content,
                    attachments: files.length > 0 ? Array.from(files) : [],
                });
            }
            Toast.success(`Message envoyé à ${selectedClients.size} client(s) !`);
            Modal.close();
            window.loadPage('conversations');
        } catch (error) {
            Toast.error('Erreur : ' + error.message);
        }
    });

    document.querySelectorAll('#closeModalBtn, #closeModalBtnFooter').forEach((btn) => {
        btn.addEventListener('click', Modal.close);
    });
}

// ============================================
// BADGE (compteur non-lus dans la sidebar)
// ============================================
export async function updateBadge() {
    const badge = document.querySelector('[data-page="conversations"] .badge');
    if (!badge) return;

    try {
        const conversations = await API.getConversations();
        const unread = conversations.filter((c) => {
            const last = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
            return last && last.from === 'client' && !last.isRead;
        }).length;
        badge.textContent = unread > 0 ? unread : '';
    } catch (error) {
        console.error('Erreur mise à jour badge:', error);
    }
}

// ============================================
// STYLES (injectés automatiquement, avec garde anti-doublon)
// ============================================
(function injectStyles() {
    if (document.getElementById('conversationsStyles')) return;
    const style = document.createElement('style');
    style.id = 'conversationsStyles';
    style.textContent = `
        .conversations-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 24px;
        }
        .conversations-stat-card {
            background: white;
            border-radius: var(--radius);
            padding: 20px 24px;
            display: flex;
            align-items: center;
            gap: 16px;
            border: 1px solid var(--gray-100);
            transition: var(--transition);
        }
        .conversations-stat-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }
        .conversations-stat-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            flex-shrink: 0;
        }
        .conversations-stat-info { flex: 1; }
        .conversations-stat-value {
            font-size: 28px;
            font-weight: 700;
            color: var(--gray-900);
            line-height: 1;
        }
        .conversations-stat-label {
            font-size: 14px;
            color: var(--gray-500);
            margin-top: 4px;
        }
        .conversations-actions-bar {
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
        .conversations-search-wrapper {
            flex: 1;
            position: relative;
            min-width: 200px;
        }
        .conversations-search-wrapper i {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--gray-400);
            font-size: 14px;
        }
        .conversations-search-input {
            width: 100%;
            padding: 10px 14px 10px 42px;
            border: 2px solid var(--gray-200);
            border-radius: var(--radius-sm);
            font-size: 14px;
            font-family: inherit;
            transition: var(--transition);
            background: var(--gray-50);
        }
        .conversations-search-input:focus {
            outline: none;
            border-color: var(--orange-500);
            background: white;
            box-shadow: 0 0 0 4px rgba(245, 124, 0, 0.08);
        }
        .conversations-filter-group {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
        }
        .conversations-filter-select {
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
        .conversations-filter-select:focus {
            outline: none;
            border-color: var(--orange-500);
        }
        .conversations-btn-add {
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
        .conversations-btn-add:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(245, 124, 0, 0.35);
        }
        .conversations-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .conversation-item {
            background: white;
            border-radius: var(--radius);
            padding: 16px 20px;
            border: 1px solid var(--gray-100);
            transition: var(--transition);
            display: flex;
            gap: 16px;
            align-items: flex-start;
            cursor: pointer;
        }
        .conversation-item:hover {
            box-shadow: var(--shadow-lg);
            border-color: var(--orange-200);
        }
        .conversation-item.archive {
            opacity: 0.7;
            background: var(--gray-50);
            border-style: dashed;
        }
        .conv-status {
            font-size: 18px;
            margin-top: 4px;
            flex-shrink: 0;
        }
        .conv-content { flex: 1; min-width: 0; }
        .conv-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 4px;
        }
        .conv-sender { font-size: 16px; color: var(--gray-800); }
        .conv-date { font-size: 12px; color: var(--gray-400); }
        .conv-subject {
            font-weight: 600;
            font-size: 15px;
            color: var(--gray-800);
            margin-bottom: 4px;
        }
        .conv-preview {
            font-size: 14px;
            color: var(--gray-600);
            margin-bottom: 8px;
        }
        .conv-footer {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 12px;
            font-size: 13px;
            color: var(--gray-500);
        }
        .conv-agent i { margin-right: 4px; }
        .conv-attachments {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            color: var(--orange-600);
        }
        .conv-actions {
            display: flex;
            gap: 6px;
            margin-left: auto;
        }
        .conv-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: var(--transition);
            color: var(--gray-500);
            font-size: 14px;
        }
        .conv-btn:hover {
            background: var(--gray-100);
            color: var(--orange-600);
        }
        .conversations-empty {
            text-align: center;
            padding: 60px 20px;
            background: white;
            border-radius: var(--radius);
            border: 2px dashed var(--gray-200);
        }
        .conversations-empty h3 {
            font-size: 20px;
            color: var(--gray-700);
            margin-bottom: 4px;
        }
        .modal-modern.modal-conversation {
            max-width: 720px !important;
            width: 95% !important;
        }
        .modal-conversation .modal-body {
            max-height: 65vh;
            overflow-y: auto;
            padding-right: 4px;
        }
        .modal-conversation .form-group { margin-bottom: 18px; }
        .modal-conversation .form-group label {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: var(--gray-700);
            margin-bottom: 6px;
        }
        .modal-conversation .form-group label i {
            color: var(--orange-500);
            margin-right: 6px;
        }
        .modal-conversation .form-group input[type="text"],
        .modal-conversation .form-group textarea {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid var(--gray-200);
            border-radius: 10px;
            font-size: 15px;
            font-family: inherit;
            transition: all 0.3s ease;
            background: var(--gray-50);
        }
        .modal-conversation .form-group input[type="text"]:focus,
        .modal-conversation .form-group textarea:focus {
            outline: none;
            border-color: var(--orange-500);
            background: white;
            box-shadow: 0 0 0 4px rgba(245, 124, 0, 0.08);
        }
        .recipient-selector-modern {
            border: 2px solid var(--gray-200);
            border-radius: 10px;
            padding: 14px;
            background: var(--gray-50);
        }
        .recipient-search-area {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
            flex-wrap: wrap;
        }
        .recipient-search-input {
            flex: 1;
            padding: 10px 14px;
            border: 2px solid var(--gray-200);
            border-radius: 8px;
            font-size: 14px;
            background: white;
            min-width: 120px;
        }
        .recipient-search-input:focus {
            outline: none;
            border-color: var(--orange-500);
        }
        .recipient-count {
            font-size: 13px;
            color: var(--gray-500);
            background: var(--gray-100);
            padding: 4px 12px;
            border-radius: 20px;
        }
        .recipient-select-all {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0 10px 0;
            border-bottom: 1px solid var(--gray-100);
            margin-bottom: 8px;
            flex-wrap: wrap;
        }
        .select-all-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
        }
        .select-all-label input[type="checkbox"] { display: none; }
        .custom-checkbox {
            width: 18px;
            height: 18px;
            border: 2px solid var(--gray-300);
            border-radius: 4px;
            display: inline-block;
            position: relative;
            background: white;
        }
        .select-all-label input:checked + .custom-checkbox {
            background: var(--orange-500);
            border-color: var(--orange-500);
        }
        .select-all-label input:checked + .custom-checkbox::after {
            content: '✓';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 13px;
            font-weight: 700;
        }
        .selected-count {
            font-size: 13px;
            color: var(--gray-500);
            background: var(--gray-100);
            padding: 2px 12px;
            border-radius: 20px;
        }
        .recipient-list-modern {
            max-height: 160px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 2px;
            padding: 4px 2px;
            margin-bottom: 8px;
            background: white;
            border-radius: 8px;
            border: 1px solid var(--gray-100);
        }
        .recipient-item-modern {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
        }
        .recipient-item-modern:hover { background: var(--gray-50); }
        .recipient-item-modern input[type="checkbox"] {
            accent-color: var(--orange-500);
            width: 16px;
            height: 16px;
            cursor: pointer;
            flex-shrink: 0;
        }
        .recipient-empty {
            padding: 16px;
            text-align: center;
            color: var(--gray-400);
            font-size: 14px;
        }
        .selected-recipients-modern {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            padding-top: 10px;
            border-top: 1px solid var(--gray-200);
            min-height: 40px;
            align-items: center;
        }
        .selected-recipients-modern .placeholder {
            color: var(--gray-400);
            font-size: 13px;
        }
        .selected-tag {
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            color: #92400e;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 13px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            animation: tagAppear 0.2s ease;
            border: 1px solid #fcd34d;
        }
        .selected-tag .remove-tag {
            cursor: pointer;
            font-size: 12px;
            opacity: 0.6;
            transition: opacity 0.2s, transform 0.2s;
            color: #92400e;
        }
        .selected-tag .remove-tag:hover { opacity: 1; transform: scale(1.2); }
        .selected-tag.more {
            background: var(--gray-200);
            color: var(--gray-600);
            border-color: var(--gray-300);
        }
        @keyframes tagAppear {
            0% { transform: scale(0.8); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }
        .file-upload-area {
            border: 2px dashed var(--gray-300);
            border-radius: 10px;
            padding: 24px;
            text-align: center;
            cursor: pointer;
            background: var(--gray-50);
        }
        .file-upload-area:hover {
            border-color: var(--orange-500);
            background: rgba(245, 124, 0, 0.04);
        }
        .file-upload-area.dragover {
            border-color: var(--orange-500);
            background: rgba(245, 124, 0, 0.08);
            transform: scale(1.02);
        }
        .file-upload-area i {
            font-size: 32px;
            color: var(--gray-400);
            margin-bottom: 6px;
            display: block;
        }
        .file-upload-area p {
            font-size: 14px;
            color: var(--gray-500);
            margin-bottom: 10px;
        }
        .btn-upload {
            padding: 8px 24px;
            background: var(--gray-200);
            color: var(--gray-700);
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
        }
        .btn-upload:hover { background: var(--gray-300); }
        .file-list {
            margin-top: 8px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .file-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            background: var(--gray-50);
            border-radius: 8px;
            font-size: 13px;
            border: 1px solid var(--gray-200);
        }
        .file-item .file-size {
            color: var(--gray-400);
            font-size: 12px;
            margin-left: auto;
        }
        .file-item .file-remove {
            background: none;
            border: none;
            color: var(--gray-400);
            cursor: pointer;
            padding: 2px 6px;
            border-radius: 4px;
        }
        .file-item .file-remove:hover {
            background: #fee2e2;
            color: #dc2626;
        }
        .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding-top: 16px;
            border-top: 1px solid var(--gray-200);
            flex-wrap: wrap;
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
        }
        .btn-secondary:hover { background: var(--gray-200); }
        .btn-primary {
            padding: 10px 24px;
            background: var(--orange-gradient);
            color: white;
            border: none;
            border-radius: var(--radius-sm);
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(245, 124, 0, 0.35);
        }
        @media (max-width: 768px) {
            .conversations-stats-grid { grid-template-columns: 1fr 1fr; }
            .conversations-actions-bar {
                flex-direction: column;
                align-items: stretch;
            }
            .conversations-filter-group {
                flex-direction: column;
                align-items: stretch;
            }
            .conversation-item {
                flex-direction: column;
                align-items: stretch;
            }
            .conv-status { text-align: right; }
            .conv-footer {
                flex-direction: column;
                align-items: flex-start;
            }
            .conv-actions {
                margin-left: 0;
                width: 100%;
                justify-content: flex-end;
            }
        }
        @media (max-width: 480px) {
            .conversations-stats-grid { grid-template-columns: 1fr; }
            .modal-footer { flex-direction: column-reverse; }
            .modal-footer button {
                width: 100%;
                justify-content: center;
            }
        }
    `;
    document.head.appendChild(style);
})();