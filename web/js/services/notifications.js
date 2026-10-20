// web/js/services/notifications.js
// ============================================================
// SERVICE DE NOTIFICATIONS — centralisé, persistant, réactif
// ============================================================
// - Stocke les notifications (max 50, purge auto > 7j)
// - Persiste dans localStorage (cache local rapide)
// - Hydrate depuis le serveur au login (persistance réelle)
// - Notifie tous les abonnés à chaque changement
// - Anti-doublon par "uniqueKey" (fenêtre 5s)
// ============================================================

const STORAGE_KEY = 'nt_notifications_v1';
const MAX_ITEMS = 50;
const MAX_AGE_MS = 7 * 24 * 3600 * 1000;

class NotificationService {
    constructor() {
        this.items = this._load();
        this.listeners = new Set();
    }

    _load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(parsed)) return [];
            const now = Date.now();
            return parsed.filter(n => now - new Date(n.timestamp).getTime() < MAX_AGE_MS);
        } catch {
            return [];
        }
    }

    _persist() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items.slice(0, MAX_ITEMS)));
        } catch {}
    }

    _emit() {
        const state = this.getState();
        this.listeners.forEach(fn => {
            try { fn(state); } catch (e) { console.error('[Notifications]', e); }
        });
    }

    /** S'abonne aux changements. Renvoie la fonction de désabonnement. */
    subscribe(fn) {
        this.listeners.add(fn);
        try { fn(this.getState()); } catch {}
        return () => this.listeners.delete(fn);
    }

    getState() {
        return {
            items: [...this.items],
            unread: this.items.filter(n => !n.read).length,
            total: this.items.length,
        };
    }

    getUnreadCount() {
        return this.items.filter(n => !n.read).length;
    }

    /**
     * Ajoute une notification.
     * @returns {Object|null} entry ou null si doublon détecté
     */
    push({ type, title, message = '', icon = 'fa-bell', color = '#f57c00', data = {}, uniqueKey = null }) {
        if (uniqueKey) {
            const recent = this.items.find(n =>
                n.uniqueKey === uniqueKey &&
                Date.now() - new Date(n.timestamp).getTime() < 5000
            );
            if (recent) return null;
        }

        const entry = {
            id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            type, title, message, icon, color,
            data, uniqueKey,
            timestamp: new Date().toISOString(),
            read: false,
        };

        this.items.unshift(entry);
        if (this.items.length > MAX_ITEMS) this.items = this.items.slice(0, MAX_ITEMS);

        this._persist();
        this._emit();
        return entry;
    }

    markRead(id) {
        const n = this.items.find(x => x.id === id);
        if (n && !n.read) {
            n.read = true;
            this._persist();
            this._emit();
            // Sync serveur si c'est une notif serveur
            if (n.serverId && typeof window !== 'undefined' && window.API) {
                window.API.markNotificationRead(n.serverId).catch(() => {});
            }
        }
    }

    markAllRead() {
        let changed = false;
        this.items.forEach(n => { if (!n.read) { n.read = true; changed = true; } });
        if (changed) {
            this._persist();
            this._emit();
            if (typeof window !== 'undefined' && window.API) {
                window.API.markAllNotificationsRead().catch(() => {});
            }
        }
    }

    remove(id) {
        const before = this.items.length;
        const target = this.items.find(n => n.id === id);
        this.items = this.items.filter(n => n.id !== id);
        if (this.items.length !== before) {
            this._persist();
            this._emit();
            if (target && target.serverId && typeof window !== 'undefined' && window.API) {
                window.API.deleteNotification(target.serverId).catch(() => {});
            }
        }
    }

    clearAll() {
        if (!this.items.length) return;
        this.items = [];
        this._persist();
        this._emit();
        if (typeof window !== 'undefined' && window.API) {
            window.API.clearAllNotifications().catch(() => {});
        }
    }

    /**
     * ✅ Récupère les notifications persistées côté serveur
     *    et les fusionne avec le cache local (dédup par uniqueKey).
     *    Appelée au login → la cloche affiche immédiatement le compteur.
     */
    async hydrateFromServer() {
        try {
            const { API } = await import('./api.js');
            const serverItems = await API.getMyNotifications();

            const existingKeys = new Set(
                this.items.map(n => n.uniqueKey || n.id)
            );

            let added = 0;
            serverItems.forEach(n => {
                const key = n.uniqueKey || n.id;
                if (existingKeys.has(key)) return;

                this.items.push({
                    id: n.id,
                    type: n.type,
                    title: n.title,
                    message: n.message || '',
                    icon: n.icon || 'fa-bell',
                    color: n.color || '#f57c00',
                    data: n.data || {},
                    uniqueKey: n.uniqueKey,
                    timestamp: n.timestamp,
                    read: !!n.read,
                    serverId: n.id,
                });
                added++;
            });

            if (added > 0) {
                this.items.sort(
                    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
                );
                this.items = this.items.slice(0, MAX_ITEMS);
                this._persist();
                this._emit();
            }

            console.log(`🔔 [Notifs] Hydraté depuis serveur : +${added} (total ${this.items.length})`);
            return added;
        } catch (e) {
            console.warn('⚠️ Hydratation notifs échouée:', e.message);
            return 0;
        }
    }
}

export const Notifications = new NotificationService();