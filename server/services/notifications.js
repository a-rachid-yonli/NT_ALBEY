// server/services/notifications.js
// ============================================================
// STOCKAGE PERSISTANT DES NOTIFICATIONS
// ============================================================
// Une entrée par notification, indexée par userId.
// Permet à un utilisateur de retrouver ses notifs à la reconnexion.
// ============================================================

const fs = require('fs');
const path = require('path');

const NOTIF_PATH = path.join(__dirname, '../data/notifications.json');
const USERS_PATH = path.join(__dirname, '../data/users.json');
const MAX_PER_USER = 200;
const MAX_AGE_MS = 30 * 24 * 3600 * 1000; // 30 jours

// ------------------------------------------------------------
// Helpers fichiers
// ------------------------------------------------------------
function ensureFile() {
  const dir = path.dirname(NOTIF_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(NOTIF_PATH)) {
    fs.writeFileSync(NOTIF_PATH, JSON.stringify([], null, 2));
  }
}

function readAll() {
  ensureFile();
  try {
    const raw = fs.readFileSync(NOTIF_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeAll(list) {
  try {
    fs.writeFileSync(NOTIF_PATH, JSON.stringify(list, null, 2));
  } catch (e) {
    console.error('❌ notif write:', e.message);
  }
}

function readUsers() {
  try {
    const raw = fs.readFileSync(USERS_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function prune(list) {
  const now = Date.now();
  return list.filter(n => now - new Date(n.timestamp).getTime() < MAX_AGE_MS);
}

// ------------------------------------------------------------
// Ajoute une notification pour un utilisateur
// ------------------------------------------------------------
function push(userId, { type, title, message = '', icon = 'fa-bell', color = '#f57c00', data = {}, uniqueKey = null }) {
  const uid = Number(userId);
  if (!uid) return null;

  let list = prune(readAll());

  // Anti-doublon (fenêtre 5s sur uniqueKey)
  if (uniqueKey) {
    const existing = list.find(n =>
      Number(n.userId) === uid &&
      n.uniqueKey === uniqueKey &&
      Date.now() - new Date(n.timestamp).getTime() < 5000
    );
    if (existing) return null;
  }

  const entry = {
    id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: uid,
    type, title, message, icon, color, data, uniqueKey,
    timestamp: new Date().toISOString(),
    read: false,
  };

  list.unshift(entry);

  // Plafond par utilisateur
  const mine = list.filter(n => Number(n.userId) === uid);
  if (mine.length > MAX_PER_USER) {
    const excess = new Set(mine.slice(MAX_PER_USER).map(n => n.id));
    list = list.filter(n => !excess.has(n.id));
  }

  writeAll(list);
  return entry;
}

// ------------------------------------------------------------
// Ajoute une notif à TOUS les utilisateurs d'un rôle
// ------------------------------------------------------------
function pushToRole(role, notifData, excludeUserIds = []) {
  const users = readUsers();
  const exclude = new Set(excludeUserIds.map(Number));
  const targets = users.filter(u =>
    u.role === role &&
    u.status === 'active' &&
    !exclude.has(Number(u.id))
  );
  return targets.map(u => push(u.id, notifData)).filter(Boolean);
}

// ------------------------------------------------------------
// Lectures / mutations
// ------------------------------------------------------------
function getForUser(userId) {
  const uid = Number(userId);
  return prune(readAll())
    .filter(n => Number(n.userId) === uid)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function markRead(userId, notifId) {
  const uid = Number(userId);
  const list = readAll();
  const n = list.find(x => x.id === notifId && Number(x.userId) === uid);
  if (n && !n.read) { n.read = true; writeAll(list); return true; }
  return false;
}

function markAllRead(userId) {
  const uid = Number(userId);
  const list = readAll();
  let changed = false;
  list.forEach(n => {
    if (Number(n.userId) === uid && !n.read) { n.read = true; changed = true; }
  });
  if (changed) writeAll(list);
  return changed;
}

function remove(userId, notifId) {
  const uid = Number(userId);
  const list = readAll();
  const filtered = list.filter(n => !(n.id === notifId && Number(n.userId) === uid));
  if (filtered.length !== list.length) { writeAll(filtered); return true; }
  return false;
}

function clearAll(userId) {
  const uid = Number(userId);
  const list = readAll();
  const filtered = list.filter(n => Number(n.userId) !== uid);
  if (filtered.length !== list.length) { writeAll(filtered); return true; }
  return false;
}

module.exports = {
  push, pushToRole,
  getForUser, markRead, markAllRead, remove, clearAll,
};