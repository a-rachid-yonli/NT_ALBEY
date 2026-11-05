// server/routes/auth.js
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { log } = require('../services/audit');
const { verifyToken, getJwtSecret } = require('../middleware/auth');

const usersPath = path.join(__dirname, '../data/users.json');

// ─── PROTECTION ANTI-BRUTEFORCE (RATE LIMITING EN MÉMOIRE) ─────────────
const LOGIN_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_LOGIN_ATTEMPTS = 5;
const loginAttempts = new Map();

function checkLoginRateLimit(key) {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record || now - record.firstAttempt > LOGIN_WINDOW_MS) {
    return { allowed: true };
  }
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    const retryAfterSec = Math.ceil((LOGIN_WINDOW_MS - (now - record.firstAttempt)) / 1000);
    return { allowed: false, retryAfterSec };
  }
  return { allowed: true };
}

function recordFailedLogin(key) {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record || now - record.firstAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttempt: now });
  } else {
    record.count += 1;
  }
}

function clearLoginAttempts(key) {
  loginAttempts.delete(key);
}

// ------------------------------------------------------------
// POST /api/auth/login
// ------------------------------------------------------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || '').toLowerCase().trim();
  const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
  const rateKey = `${clientIp}:${normalizedEmail}`;

  const rateCheck = checkLoginRateLimit(rateKey);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: `Trop de tentatives de connexion. Réessayez dans ${Math.ceil(rateCheck.retryAfterSec / 60)} min.`,
      retryAfterSec: rateCheck.retryAfterSec,
    });
  }

  if (!normalizedEmail || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  console.log(`🔐 Tentative de connexion: ${normalizedEmail}`);

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

  const user = users.find((u) => u.email?.toLowerCase() === normalizedEmail);

  if (!user) {
    recordFailedLogin(rateKey);
    console.warn(`⚠️ Utilisateur non trouvé: ${normalizedEmail}`);
    log({
      action: 'login_failed',
      category: 'auth',
      severity: 'warning',
      success: false,
      actor: { email: normalizedEmail },
      details: { reason: 'Email inconnu', email: normalizedEmail },
      req,
    });
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }

  let passwordOk = false;
  if (typeof user.password === 'string' && user.password.startsWith('$2')) {
    passwordOk = await bcrypt.compare(password, user.password);
  } else {
    passwordOk = user.password === password;
  }

  if (!passwordOk) {
    recordFailedLogin(rateKey);
    console.warn(`⚠️ Mot de passe incorrect pour: ${normalizedEmail}`);
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
    console.warn(`⛔ Compte suspendu : ${normalizedEmail}`);
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
      error: 'Votre compte a été suspendu. Contactez votre administrateur.',
    });
  }

  clearLoginAttempts(rateKey);
  console.log(`✅ Authentification réussie: ${normalizedEmail} (${user.role})`);

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: '7d' }
  );

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
      status: user.status || 'active',
    },
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
    actor: { id: req.user.id, email: req.user.email, role: req.user.role },
    details: {},
    req,
  });

  res.json({ message: 'Déconnexion enregistrée' });
});

module.exports = router;
