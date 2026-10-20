// server/routes/audit.js
// ============================================================
// ROUTES D'AUDIT — Accessibles UNIQUEMENT au Super Admin
// ============================================================

const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { readLogs, log } = require('../services/audit');
const { verifyToken } = require('../middleware/auth');

const AUDIT_PATH = path.join(__dirname, '../data/audit.json');

// ------------------------------------------------------------
// Middleware : Super Admin uniquement
// ------------------------------------------------------------
function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Accès réservé au Super Admin' });
  }
  next();
}

// ------------------------------------------------------------
// GET /api/audit — Liste filtrée
// ------------------------------------------------------------
router.get('/', verifyToken, requireSuperAdmin, (req, res) => {
  try {
    const { category, severity, actorId, search, limit, success } = req.query;

    let logs = readLogs();

    if (category && category !== 'all') {
      logs = logs.filter(l => l.category === category);
    }
    if (severity && severity !== 'all') {
      logs = logs.filter(l => l.severity === severity);
    }
    if (actorId) {
      logs = logs.filter(l => l.actor?.id === parseInt(actorId, 10));
    }
    if (success === 'true')  logs = logs.filter(l => l.success === true);
    if (success === 'false') logs = logs.filter(l => l.success === false);

    if (search) {
      const q = search.toLowerCase();
      logs = logs.filter(l =>
        l.action?.toLowerCase().includes(q) ||
        l.actor?.name?.toLowerCase().includes(q) ||
        l.actor?.email?.toLowerCase().includes(q) ||
        l.target?.name?.toLowerCase().includes(q) ||
        l.target?.type?.toLowerCase().includes(q) ||
        JSON.stringify(l.details || {}).toLowerCase().includes(q)
      );
    }

    const max = Math.min(parseInt(limit, 10) || 300, 2000);
    res.json(logs.slice(0, max));
  } catch (err) {
    console.error('GET /audit:', err);
    res.status(500).json({ error: 'Erreur chargement audit' });
  }
});

// ------------------------------------------------------------
// GET /api/audit/stats
// ------------------------------------------------------------
router.get('/stats', verifyToken, requireSuperAdmin, (req, res) => {
  try {
    const logs = readLogs();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const stats = {
      total:    logs.length,
      today:    logs.filter(l => now - new Date(l.timestamp).getTime() < dayMs).length,
      week:     logs.filter(l => now - new Date(l.timestamp).getTime() < 7 * dayMs).length,
      critical: logs.filter(l => l.severity === 'critical').length,
      failed:   logs.filter(l => l.success === false).length,
      byCategory: {
        auth:         logs.filter(l => l.category === 'auth').length,
        user:         logs.filter(l => l.category === 'user').length,
        ticket:       logs.filter(l => l.category === 'ticket').length,
        conversation: logs.filter(l => l.category === 'conversation').length,
        system:       logs.filter(l => l.category === 'system').length,
      },
    };

    res.json(stats);
  } catch (err) {
    console.error('GET /audit/stats:', err);
    res.status(500).json({ error: 'Erreur stats audit' });
  }
});

// ------------------------------------------------------------
// DELETE /api/audit — Purge complète (loggée)
// ------------------------------------------------------------
router.delete('/', verifyToken, requireSuperAdmin, (req, res) => {
  try {
    // Vider le fichier
    fs.writeFileSync(AUDIT_PATH, JSON.stringify([], null, 2));

    // Puis inscrire l'action de purge (reste seule entrée)
    log({
      action: 'clear_audit_logs',
      category: 'system',
      severity: 'warning',
      actor: req.user,
      details: { message: 'Purge complète du journal d\'audit' },
      req,
    });

    res.json({ success: true, message: 'Journal d\'audit purgé' });
  } catch (err) {
    console.error('DELETE /audit:', err);
    res.status(500).json({ error: 'Erreur purge audit' });
  }
});

module.exports = router;