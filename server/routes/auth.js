// server/routes/auth.js
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { log } = require('../services/audit');
const { verifyToken } = require('../middleware/auth');

const usersPath = path.join(__dirname, '../data/users.json');

// ------------------------------------------------------------
// POST /api/auth/login
// ------------------------------------------------------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`🔐 Tentative de connexion: ${email}`);

  if (!fs.existsSync(usersPath)) {
    console.error('❌ Fichier users.json introuvable !');
    return res.status(500).json({ error: 'Fichier utilisateurs introuvable' });
  }

  let users = [];
  try {
    const data = fs.readFileSync(usersPath, 'utf-8');
    users = JSON.parse(data);
  } catch (err) {
    console.error('❌ Erreur lecture users.json:', err.message);
    return res.status(500).json({ error: 'Erreur de lecture du fichier utilisateurs' });
  }

  const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase().trim());

  if (!user) {
    console.warn(`⚠️ Utilisateur non trouvé: ${email}`);
    log({
      action: 'login_failed',
      category: 'auth',
      severity: 'warning',
      success: false,
      actor: { email },
      details: { reason: 'Email inconnu', email },
      req,
    });
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }

  let passwordOk = false;
  if (typeof user.password === 'string' && user.password.startsWith('$2')) {
    passwordOk = await bcrypt.compare(password, user.password);
  } else {
    passwordOk = (user.password === password);
  }

  if (!passwordOk) {
    console.warn(`⚠️ Mot de passe incorrect pour: ${email}`);
    log({
      action: 'login_failed',
      category: 'auth',
      severity: 'warning',
      success: false,
      actor: { id: user.id, name: user.name, email: user.email, role: user.role },
      details: { reason: 'Mot de passe incorrect' },
      req,
    });
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }

  if (user.status === 'suspended') {
    console.warn(`⛔ Compte suspendu : ${email}`);
    log({
      action: 'login_failed',
      category: 'auth',
      severity: 'critical',
      success: false,
      actor: { id: user.id, name: user.name, email: user.email, role: user.role },
      details: { reason: 'Compte suspendu' },
      req,
    });
    return res.status(403).json({
      error: 'Votre compte a été suspendu. Contactez votre administrateur.'
    });
  }

  console.log(`✅ Authentification réussie: ${email} (${user.role})`);

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'ma_super_cle_secrete',
    { expiresIn: '7d' }
  );

  // ✅ AUDIT — Connexion réussie
  log({
    action: 'login_success',
    category: 'auth',
    severity: 'info',
    success: true,
    actor: { id: user.id, name: user.name, email: user.email, role: user.role },
    details: { role: user.role },
    req,
  });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status || 'active'
    }
  });
});

// ------------------------------------------------------------
// POST /api/auth/logout
// ------------------------------------------------------------
router.post('/logout', verifyToken, (req, res) => {
  log({
    action: 'logout',
    category: 'auth',
    severity: 'info',
    success: true,
    actor: req.user,
    req,
  });
  res.json({ success: true });
});

module.exports = router;