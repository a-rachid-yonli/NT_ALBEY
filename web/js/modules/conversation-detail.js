// web/modules/conversation-detail.js
import { API } from '../services/api.js';
import { state } from '../services/state.js';
import { Toast } from '../components/toast.js';
import {
    initSocket,
    joinConversation,
    leaveConversation,
    onMessageReceived,
} from '../services/socket.js';

// ============================================
// VARIABLES DE MODULE
// ============================================
let currentConvId = null;

// ✅ Anti-doublon : on garde la trace des messages déjà affichés
const seenMessageKeys = new Set();

// Constantes de statut
const STATUS_OPTIONS = ['open', 'pending', 'closed'];
const STATUS_LABELS = { open: 'Ouvert', pending: 'En attente', closed: 'Fermé' };
const STATUS_COLORS = { open: '#4caf50', pending: '#ff9800', closed: '#9e9e9e' };

// ============================================
// LOGS / ERREURS
// ============================================
function addLog(message, isError = false) {
    console.log(`[${isError ? 'ERREUR' : 'INFO'}] ${message}`);
}

// ============================================
// SÉCURITÉ : échapper le HTML pour éviter les
// injections et préserver tous les caractères
// ============================================
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Détecte si le message est un "contexte d'escalade" transféré
// depuis le bot mobile → permet de le styliser différemment
function isContextMessage(content) {
    if (!content || typeof content !== 'string') return false;
    return (
        content.startsWith('━━━') ||
        content.startsWith('▬▬▬') ||
        content.includes('CONTEXTE DE CONVERSATION TRANSFÉRÉE') ||
        content.includes('HISTORIQUE COMPLET DE LA CONVERSATION')
    );
}

// ============================================
// RENDER
// ============================================
export async function render(id) {
    const conv = await API.getConversation(id);
    if (!conv) {
        return `<div class="card"><h2>Conversation non trouvée</h2></div>`;
    }

    seenMessageKeys.clear();

    const isChef = state.isChef();
    const user = state.getUser();
    const isAssignedAgent = user && user.role === 'agent' && conv.agentId === user.id;

    let messagesHtml = '';
    if (conv.messages && conv.messages.length > 0) {
        conv.messages.forEach((msg) => {
            seenMessageKeys.add(messageKey(msg));
            messagesHtml += buildMessageHtml(msg, conv.clientName || conv.client);
        });
    } else {
        messagesHtml = `<p class="chat-empty" style="text-align:center;color:var(--gray-500);padding:20px;">Aucun message dans cette conversation.</p>`;
    }

    return `
        <div class="conversation-detail" data-id="${id}">
            <div class="detail-header">
                <div class="detail-back">
                    <button onclick="window.loadPage('conversations')" class="back-btn">
                        <i class="fas fa-arrow-left"></i> Retour
                    </button>
                </div>
                <div class="detail-info">
                    <div class="detail-title">
                        <h2>${escapeHtml(conv.subject || 'Conversation')}</h2>
                        <span class="detail-status" id="statusBadge" style="background: ${STATUS_COLORS[conv.status] || '#9e9e9e'};">
                            ${STATUS_LABELS[conv.status] || conv.status}
                        </span>
                    </div>
                    <div class="detail-meta">
                        <span><i class="fas fa-user"></i> ${escapeHtml(conv.clientName || conv.client || 'Client')}</span>
                        <span><i class="fas fa-phone"></i> ${escapeHtml(conv.clientPhone || 'Non renseigné')}</span>
                        <span><i class="fas fa-user-tie"></i> ${conv.agentId ? 'Assigné' : 'Non assigné'}</span>
                        <span><i class="fas fa-calendar"></i> ${new Date(conv.createdAt).toLocaleString('fr-FR')}</span>
                    </div>
                </div>
                <div class="detail-actions">
                    ${isChef || isAssignedAgent ? `
                        <select id="statusSelect" class="status-select">
                            ${STATUS_OPTIONS.map((s) => `<option value="${s}" ${s === conv.status ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`).join('')}
                        </select>
                        <button class="archive-btn" id="archiveBtn">
                            <i class="fas ${conv.archived ? 'fa-inbox' : 'fa-archive'}"></i>
                            ${conv.archived ? 'Désarchiver' : 'Archiver'}
                        </button>
                    ` : ''}
                </div>
            </div>

            <div class="chat-container" id="chatContainer">
                ${messagesHtml}
            </div>

            <div class="reply-area">
                <div class="reply-input-wrapper">
                    <textarea id="replyContent" rows="2" placeholder="Écrivez votre réponse..." required></textarea>
                    <div class="reply-actions">
                        <button type="button" class="send-btn" id="sendMessageBtn">
                            <i class="fas fa-paper-plane"></i> Envoyer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// HELPERS
// ============================================
function messageKey(msg) {
    return `${msg.id || ''}-${msg.timestamp || ''}-${msg.from || ''}-${msg.content || ''}`;
}

function buildMessageHtml(msg, clientName) {
    try {
        const isClient = msg.from === 'client';
        const sender = isClient ? (clientName || 'Client') : (msg.senderName || 'Agent');
        const time = msg.timestamp
            ? new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            : '';
        const content = msg.content || '';
        const isRead = msg.isRead || false;

        // ✅ Détection : ce message est-il un contexte d'escalade ?
        const isContext = isClient && isContextMessage(content);
        const escapedContent = escapeHtml(content);

        // ✅ Rendu spécial pour les messages de contexte
        if (isContext) {
            return `
                <div class="chat-message ${isClient ? 'client' : 'agent'} chat-message-context">
                    <div class="chat-bubble chat-bubble-context">
                        <div class="chat-context-header">
                            <span class="chat-context-icon">📋</span>
                            <span class="chat-context-title">Contexte transféré par l'assistant</span>
                        </div>
                        <div class="chat-content chat-content-context">${escapedContent}</div>
                        <div class="chat-time">${time} ${isRead ? '✓' : ''}</div>
                    </div>
                </div>
            `;
        }

        // ✅ Rendu standard
        return `
            <div class="chat-message ${isClient ? 'client' : 'agent'}">
                <div class="chat-bubble">
                    <div class="chat-sender">${escapeHtml(sender)}</div>
                    ${content ? `<div class="chat-content">${escapedContent}</div>` : ''}
                    <div class="chat-time">${time} ${isRead ? '✓' : ''}</div>
                </div>
            </div>
        `;
    } catch (error) {
        addLog(`Erreur buildMessageHtml: ${error.message}`, true);
        return `<div style="color:red;padding:10px;">Erreur d'affichage</div>`;
    }
}

// ============================================
// INIT
// ============================================
export function init(id) {
    const conversationId = parseInt(id);
    currentConvId = conversationId;
    addLog(`🚀 INIT conversation ${conversationId}`);

    // ===== SOCKET =====
    initSocket();

    onMessageReceived((msg) => {
        try {
            if (currentConvId === null) return;

            const key = messageKey(msg);
            if (seenMessageKeys.has(key)) {
                addLog(`⏭️ Message déjà affiché, ignoré : ${key}`);
                return;
            }
            seenMessageKeys.add(key);

            if (seenMessageKeys.size > 500) seenMessageKeys.clear();

            appendMessage(msg);
        } catch (error) {
            addLog(`❌ Erreur onMessageReceived: ${error.message}`, true);
            console.error(error);
        }
    });

    joinConversation(conversationId);

    // ===== GESTION DU STATUT =====
    const statusSelect = document.getElementById('statusSelect');
    if (statusSelect) {
        statusSelect.addEventListener('change', async function () {
            const newStatus = this.value;
            try {
                await API.updateConversationStatus(conversationId, newStatus);
                Toast.success(`Statut mis à jour : ${this.options[this.selectedIndex].text}`);
                const badge = document.getElementById('statusBadge');
                if (badge) {
                    badge.style.background = STATUS_COLORS[newStatus] || '#9e9e9e';
                    badge.textContent = STATUS_LABELS[newStatus] || newStatus;
                }
            } catch (error) {
                Toast.error('Erreur : ' + error.message);
            }
        });
    }

    // ===== ARCHIVER =====
    const archiveBtn = document.getElementById('archiveBtn');
    if (archiveBtn) {
        archiveBtn.addEventListener('click', async function () {
            const conv = await API.getConversation(conversationId);
            const isArchived = conv.archived || false;
            try {
                if (isArchived) {
                    await API.unarchiveConversation(conversationId);
                    Toast.success('Conversation désarchivée');
                } else {
                    await API.archiveConversation(conversationId);
                    Toast.success('Conversation archivée');
                }
                const newConv = await API.getConversation(conversationId);
                const container = document.getElementById('chatContainer');
                if (container) {
                    let newMessagesHtml = '';
                    if (newConv.messages && newConv.messages.length > 0) {
                        newConv.messages.forEach((msg) => {
                            newMessagesHtml += buildMessageHtml(msg, newConv.clientName || newConv.client);
                        });
                    } else {
                        newMessagesHtml = `<p class="chat-empty" style="text-align:center;color:var(--gray-500);padding:20px;">Aucun message dans cette conversation.</p>`;
                    }
                    container.innerHTML = newMessagesHtml;
                    container.scrollTop = container.scrollHeight;
                }
                const badge = document.getElementById('statusBadge');
                if (badge) {
                    badge.style.background = STATUS_COLORS[newConv.status] || '#9e9e9e';
                    badge.textContent = STATUS_LABELS[newConv.status] || newConv.status;
                }
            } catch (error) {
                Toast.error('Erreur : ' + error.message);
            }
        });
    }

    // ===== ENVOI DE MESSAGE =====
    const sendBtn = document.getElementById('sendMessageBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', async function (e) {
            e.preventDefault();
            e.stopPropagation();

            const textarea = document.getElementById('replyContent');
            const content = textarea.value.trim();
            if (!content) {
                Toast.error('Veuillez écrire votre réponse');
                return;
            }

            try {
                const sender = { name: state.getUser()?.name || 'Agent' };
                const result = await API.sendMessage(conversationId, content, sender);
                if (result) {
                    textarea.value = '';
                    Toast.success('Message envoyé !');
                } else {
                    Toast.error("Erreur lors de l'envoi");
                }
            } catch (error) {
                Toast.error('Erreur : ' + error.message);
            }
        });
    }

    // Scroll en bas
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

// ============================================
// AJOUT D'UN MESSAGE DANS LE DOM
// ============================================
function appendMessage(msg) {
    const container = document.getElementById('chatContainer');
    if (!container) {
        addLog('Container #chatContainer introuvable', true);
        return;
    }

    const clientNameEl = document.querySelector('.detail-meta .fa-user')?.parentElement;
    const clientName = clientNameEl ? clientNameEl.textContent.trim() : 'Client';

    const emptyMsg = container.querySelector('.chat-empty');
    if (emptyMsg) {
        container.innerHTML = '';
    }

    const html = buildMessageHtml(msg, clientName);
    container.insertAdjacentHTML('beforeend', html);
    container.scrollTop = container.scrollHeight;
}

// ============================================
// CLEANUP
// ============================================
export function cleanup() {
    addLog('🧹 Nettoyage de conversation-detail');

    if (currentConvId !== null) {
        leaveConversation(currentConvId);
    }
    currentConvId = null;
}

// ============================================
// STYLES (injectés automatiquement)
// ============================================
(function injectStyles() {
    if (document.getElementById('conversationDetailStyles')) return;
    const style = document.createElement('style');
    style.id = 'conversationDetailStyles';
    style.textContent = `
        .conversation-detail {
            display: flex;
            flex-direction: column;
            height: calc(100vh - 160px);
            background: #F8F9FC;
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid #E8E8E8;
            font-family: 'Inter', sans-serif;
        }
        .detail-header {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 16px;
            padding: 16px 24px;
            border-bottom: 1px solid #F0F0F0;
            background: #FFFFFF;
            flex-shrink: 0;
        }
        .detail-back .back-btn {
            background: none;
            border: none;
            color: #666;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 6px;
            transition: background 0.2s;
        }
        .detail-back .back-btn:hover {
            background: #F5F5F5;
        }
        .detail-info {
            flex: 1;
            min-width: 200px;
        }
        .detail-title {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }
        .detail-title h2 {
            font-size: 18px;
            font-weight: 700;
            color: #1A1A1A;
            margin: 0;
        }
        .detail-status {
            font-size: 12px;
            font-weight: 600;
            color: white;
            padding: 2px 12px;
            border-radius: 12px;
            text-transform: uppercase;
        }
        .detail-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            font-size: 13px;
            color: #888;
            margin-top: 4px;
        }
        .detail-meta i {
            margin-right: 4px;
            width: 16px;
        }
        .detail-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            align-items: center;
        }
        .status-select {
            padding: 6px 12px;
            border: 1px solid #E0E0E0;
            border-radius: 6px;
            font-size: 13px;
            font-family: inherit;
            background: white;
            cursor: pointer;
        }
        .archive-btn {
            background: #F5F5F5;
            color: #666;
            border: none;
            padding: 6px 14px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            font-size: 13px;
            transition: background 0.2s;
        }
        .archive-btn:hover {
            background: #E8E8E8;
        }
        .chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 24px 28px;
            background: #F8F9FC;
            display: flex;
            flex-direction: column;
            gap: 18px;
        }
        .chat-message {
            display: flex;
            flex-direction: column;
            max-width: 78%;
        }
        .chat-message.client { align-self: flex-start; }
        .chat-message.agent { align-self: flex-end; }
        .chat-bubble {
            padding: 12px 18px;
            border-radius: 16px;
            background: white;
            box-shadow: 0 1px 2px rgba(0,0,0,0.04);
            word-wrap: break-word;
            max-width: 100%;
        }
        .chat-message.client .chat-bubble {
            background: white;
            border-bottom-left-radius: 4px;
            border: 1px solid #F0F0F0;
        }
        .chat-message.agent .chat-bubble {
            background: #F0FFF4;
            border-bottom-right-radius: 4px;
            border: 1px solid #D0E8D0;
        }
        .chat-sender {
            font-size: 12px;
            font-weight: 600;
            color: #888;
            margin-bottom: 4px;
        }

        /* ══════════════════════════════════════════════════
           ✅ FIX PRINCIPAL : préserver les retours à la ligne
           ══════════════════════════════════════════════════ */
        .chat-content {
            font-size: 14px;
            line-height: 1.55;
            color: #1A1A1A;
            white-space: pre-wrap;
            word-break: break-word;
            overflow-wrap: anywhere;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        /* ══════════════════════════════════════════════════
           ✅ STYLE SPÉCIAL POUR LES MESSAGES DE CONTEXTE
           ══════════════════════════════════════════════════ */
        .chat-message-context {
            max-width: 92%;
        }
        .chat-bubble-context {
            background: linear-gradient(180deg, #FAFBFC 0%, #F2F6FA 100%);
            border: 1.5px solid #D6E4F0;
            border-left: 4px solid #008933;
            border-radius: 14px;
            padding: 0;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 137, 51, 0.06);
        }
        .chat-context-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 18px;
            background: linear-gradient(90deg, #008933 0%, #00A34D 100%);
            color: white;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.4px;
            text-transform: uppercase;
        }
        .chat-context-icon {
            font-size: 14px;
        }
        .chat-context-title {
            flex: 1;
        }
        .chat-content-context {
            padding: 18px 20px;
            background: #FFFFFF;
            font-family: 'SFMono-Regular', 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.7;
            color: #1A2B3C;
            white-space: pre-wrap;
            word-break: break-word;
            overflow-wrap: anywhere;
            max-height: 520px;
            overflow-y: auto;
        }
        .chat-bubble-context .chat-time {
            padding: 8px 18px;
            background: #F2F6FA;
            border-top: 1px solid #E6EEF5;
            margin-top: 0;
        }

        .chat-time {
            font-size: 10px;
            color: #999;
            margin-top: 4px;
            text-align: right;
        }
        .reply-area {
            padding: 12px 24px;
            border-top: 1px solid #F0F0F0;
            background: white;
            flex-shrink: 0;
        }
        .reply-input-wrapper {
            display: flex;
            gap: 10px;
            align-items: flex-end;
        }
        .reply-input-wrapper textarea {
            flex: 1;
            padding: 10px 14px;
            border: 2px solid #E8E8E8;
            border-radius: 24px;
            font-size: 14px;
            font-family: inherit;
            resize: vertical;
            min-height: 44px;
            max-height: 120px;
            transition: border-color 0.3s, box-shadow 0.3s;
            background: #F5F5F5;
            color: #1A1A1A;
        }
        .reply-input-wrapper textarea:focus {
            outline: none;
            border-color: #008933;
            background: white;
            box-shadow: 0 0 0 4px rgba(0,137,51,0.08);
        }
        .reply-actions {
            display: flex;
            gap: 6px;
            align-items: center;
        }
        .send-btn {
            padding: 10px 20px;
            background: linear-gradient(135deg, #008933, #00A34D);
            color: white;
            border: none;
            border-radius: 24px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
            height: 44px;
            box-shadow: 0 2px 8px rgba(0,137,51,0.2);
        }
        .send-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(0,137,51,0.35);
        }
        @media (max-width: 768px) {
            .conversation-detail {
                height: calc(100vh - 120px);
                border-radius: 0;
            }
            .detail-header {
                flex-direction: column;
                align-items: stretch;
                gap: 8px;
                padding: 12px 16px;
            }
            .detail-actions { justify-content: flex-start; }
            .chat-message { max-width: 92%; }
            .chat-message-context { max-width: 98%; }
            .chat-content-context {
                font-size: 12px;
                padding: 14px 14px;
                max-height: 400px;
            }
            .reply-input-wrapper {
                flex-direction: column;
                align-items: stretch;
            }
            .reply-actions {
                flex-wrap: wrap;
                justify-content: flex-end;
            }
            .send-btn {
                width: 100%;
                justify-content: center;
            }
        }
        @media (max-width: 480px) {
            .detail-title h2 { font-size: 16px; }
            .detail-meta { font-size: 12px; gap: 8px; }
            .chat-container { padding: 12px; gap: 12px; }
            .reply-area { padding: 8px 12px; }
            .chat-context-header { font-size: 11px; padding: 8px 12px; }
        }
    `;
    document.head.appendChild(style);
})();