// server/services/audit.js
// ============================================================
// SERVICE D'AUDIT — Trace toutes les actions de la plateforme
// ============================================================
// Persistance JSON (max 5000 entrées, rotation automatique)
// Catégories : auth | user | ticket | conversation | system
// Sévérités  : info | warning | critical
// ============================================================

const fs = require('fs');
const path = require('path');

const AUDIT_PATH = path.join(__dirname, '../data/audit.json');
const USERS_PATH = path.join(__dirname, '../data/users.json');
const MAX_ENTRIES = 5000;

// ------------------------------------------------------------
// Helpers fichiers
// ------------------------------------------------------------
function ensureFile() {
  const dir = path.dirname(AUDIT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(AUDIT_PATH)) {
    fs.writeFileSync(AUDIT_PATH, JSON.stringify([], null, 2));
  }
}

function readLogs() {
  ensureFile();
  try {
    const raw = fs.readFileSync(AUDIT_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLogs(logs) {
  try {
    fs.writeFileSync(
      AUDIT_PATH,
      JSON.stringify(logs.slice(0, MAX_ENTRIES), null, 2)
    );
  } catch (e) {
    console.error('❌ Audit write error:', e.message);
  }
}

function nextId(logs) {
  if (!logs.length) return 1;
  return Math.max(...logs.map(l => l.id || 0)) + 1;
}

// ------------------------------------------------------------
// Enrichit l'acteur avec son nom/email depuis users.json
// (le JWT ne contient que id/email/role)
// ------------------------------------------------------------
function enrichActor(actor) {
  if (!actor) return null;
  if (actor.name && actor.email) return actor;
  if (!actor.id) return actor;

  try {
    const users = JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
    const u = users.find(x => x.id === actor.id);
    if (u) {
      return { id: u.id, name: u.name, email: u.email, role: u.role };
    }
  } catch { /* ignore */ }

  return actor;
}

// ------------------------------------------------------------
// Log principal
// ------------------------------------------------------------
function log({
  action,
  category = 'system',
  severity = 'info',
  success = true,
  actor = null,
  target = null,
  details = null,
  req = null,
}) {
  const logs = readLogs();
  const enrichedActor = enrichActor(actor);

  const entry = {
    id: nextId(logs),
    action,
    category,
    severity,
    success,
    actor: enrichedActor
      ? {
          id: enrichedActor.id,
          name: enrichedActor.name,
          email: enrichedActor.email,
          role: enrichedActor.role,
        }
      : null,
    target: target || null,
    details: details || null,
    ip: req
      ? req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        null
      : null,
    userAgent: req ? req.headers['user-agent'] || null : null,
    timestamp: new Date().toISOString(),
  };

  logs.unshift(entry);
  writeLogs(logs);
  return entry;
}

module.exports = { log, readLogs };