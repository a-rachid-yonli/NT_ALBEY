// server/routes/notifications.js
const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const Notif = require('../services/notifications');

// GET /api/notifications → toutes mes notifs
router.get('/', verifyToken, (req, res) => {
  try {
    res.json(Notif.getForUser(req.user.id));
  } catch (e) {
    console.error('GET /notifications:', e);
    res.status(500).json({ error: 'Erreur chargement notifications' });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', verifyToken, (req, res) => {
  try {
    Notif.markAllRead(req.user.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

// POST /api/notifications/:id/read
router.post('/:id/read', verifyToken, (req, res) => {
  try {
    Notif.markRead(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

// DELETE /api/notifications/:id
router.delete('/:id', verifyToken, (req, res) => {
  try {
    Notif.remove(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

// DELETE /api/notifications
router.delete('/', verifyToken, (req, res) => {
  try {
    Notif.clearAll(req.user.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

module.exports = router;