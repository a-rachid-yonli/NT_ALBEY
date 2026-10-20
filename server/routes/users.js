// server/routes/users.js
// ============================================================
// GESTION DES UTILISATEURS — 4 rôles
// ============================================================

const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { log } = require('../services/audit');

const USERS_PATH = path.join(__dirname, '../data/users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'ma_super_cle_secrete';

const USE_BCRYPT = true;
const VALID_ROLES = ['super_admin', 'chef', 'agent', 'admin_systeme'];

// ============================================================
// HELPERS FICHIER
// ============================================================
function ensureUsersFile() {
  const dir = path.dirname(USERS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(USERS_PATH)) fs.writeFileSync(USERS_PATH, JSON.stringify([], null, 2));
}

function readUsers() {
  ensureUsersFile();
  try {
    const raw = fs.readFileSync(USERS_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('❌ Lecture users.json :', err.message);
    return [];
  }
}

function writeUsers(users) {
  try {
    fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
    return true;
  } catch (err) {
    console.error('❌ Écriture users.json :', err.message);
    return false;
  }
}

function sanitize(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

async function hashPassword(plain) {
  if (USE_BCRYPT) return bcrypt.hash(plain, 10);
  return plain;
}

function nextId(users) {
  if (users.length === 0) return 1;
  return Math.max(...users.map(u => u.id || 0)) + 1;
}

// ============================================================
// MIDDLEWARES
// ============================================================
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token invalide ou expiré' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé pour votre rôle' });
    }
    next();
  };
}

// ============================================================
// PERMISSIONS
// ============================================================
const isSuperAdmin = (u) => u?.role === 'super_admin';
const isChef       = (u) => u?.role === 'chef';

function canManage(currentUser, targetUser) {
  if (!currentUser || !targetUser) return false;
  if (isSuperAdmin(currentUser)) return true;
  if (isChef(currentUser)) return targetUser.role === 'agent';
  return false;
}

function canCreateRole(currentUser, role) {
  if (isSuperAdmin(currentUser)) {
    return ['chef', 'admin_systeme'].includes(role);
  }
  if (isChef(currentUser)) {
    return role === 'agent';
  }
  return false;
}

// ════════════════════════════════════════════════════════════
// ⚠️  ORDRE CRITIQUE DES ROUTES — NE PAS INVERSER
// ════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────
// 1️⃣  GET /api/users  → Liste complète (super_admin + chef)
// ────────────────────────────────────────────────────────────
router.get('/', verifyToken, requireRole('super_admin', 'chef'), (req, res) => {
  const users = readUsers();
  const me = req.user;

  let visible = [];

  if (isSuperAdmin(me)) {
    visible = users.filter(u => u.id !== me.id);
  } else if (isChef(me)) {
    visible = users.filter(u => u.role === 'agent');
  }

  res.json(visible.map(sanitize));
});

// ────────────────────────────────────────────────────────────
// 2️⃣  GET /api/users/list  → ✅ DOIT ÊTRE AVANT /:id !
//     Accessible à TOUS les rôles authentifiés
// ────────────────────────────────────────────────────────────
router.get('/list', verifyToken, (req, res) => {
  try {
    const users = readUsers();
    console.log(`📋 GET /users/list par ${req.user.email} (${req.user.role}) — ${users.length} utilisateurs`);

    const minimal = users.map(u => ({
      id:     u.id,
      name:   u.name,
      role:   u.role,
      status: u.status || 'active',
    }));

    res.json(minimal);
  } catch (err) {
    console.error('GET /users/list :', err);
    res.status(500).json({ error: 'Erreur chargement liste utilisateurs' });
  }
});

// ────────────────────────────────────────────────────────────
// 3️⃣  GET /api/users/:id  → APRÈS /list !
// ────────────────────────────────────────────────────────────
router.get('/:id', verifyToken, requireRole('super_admin', 'chef'), (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'ID invalide' });
  }

  const users = readUsers();
  const target = users.find(u => u.id === id);

  if (!target) {
    return res.status(404).json({ error: 'Utilisateur introuvable' });
  }

  if (!canManage(req.user, target)) {
    return res.status(403).json({ error: 'Vous ne pouvez pas consulter cet utilisateur' });
  }

  res.json(sanitize(target));
});

// ────────────────────────────────────────────────────────────
// 4️⃣  POST /api/users  → Création
// ────────────────────────────────────────────────────────────
router.post('/', verifyToken, requireRole('super_admin', 'chef'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Champs obligatoires : name, email, password, role' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Rôle invalide. Valeurs autorisées : ${VALID_ROLES.join(', ')}` });
    }

    if (!canCreateRole(req.user, role)) {
      return res.status(403).json({
        error: `Vous n'êtes pas autorisé à créer un compte avec le rôle "${role}"`
      });
    }

    const users = readUsers();

    const exists = users.some(u => u.email?.toLowerCase() === email.toLowerCase().trim());
    if (exists) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    const newUser = {
      id: nextId(users),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: await hashPassword(password),
      role,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    if (!writeUsers(users)) {
      return res.status(500).json({ error: 'Erreur de sauvegarde du fichier utilisateurs' });
    }

    // ✅ AUDIT
    log({
      action: 'create_user',
      category: 'user',
      severity: 'info',
      success: true,
      actor: req.user,
      target: { type: 'user', id: newUser.id, name: newUser.name, email: newUser.email },
      details: { role: newUser.role, createdBy: req.user.email },
      req,
    });

    console.log(`✅ Utilisateur créé : ${newUser.email} (${newUser.role}) par ${req.user.email}`);
    res.status(201).json(sanitize(newUser));
  } catch (err) {
    console.error('POST /users :', err);
    res.status(500).json({ error: 'Erreur création utilisateur' });
  }
});

// ────────────────────────────────────────────────────────────
// 5️⃣  PATCH /api/users/:id  → Mise à jour
// ────────────────────────────────────────────────────────────
router.patch('/:id', verifyToken, requireRole('super_admin', 'chef'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const users = readUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const target = users[idx];
    const me = req.user;

    if (!canManage(me, target)) {
      return res.status(403).json({ error: 'Vous ne pouvez pas modifier cet utilisateur' });
    }

    const isSelf = me.id === target.id;

    const updates = {};

    if (req.body.name !== undefined) {
      const n = String(req.body.name).trim();
      if (n.length < 2) return res.status(400).json({ error: 'Nom trop court' });
      updates.name = n;
    }

    if (req.body.email !== undefined) {
      const e = String(req.body.email).toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
        return res.status(400).json({ error: 'Email invalide' });
      }
      const dup = users.some(u => u.id !== id && u.email?.toLowerCase() === e);
      if (dup) return res.status(409).json({ error: 'Cet email est déjà utilisé' });
      updates.email = e;
    }

    if (req.body.role !== undefined) {
      if (!isSuperAdmin(me)) {
        return res.status(403).json({ error: 'Seul un Super Admin peut changer un rôle' });
      }
      if (!VALID_ROLES.includes(req.body.role)) {
        return res.status(400).json({ error: 'Rôle invalide' });
      }
      if (isSelf) {
        return res.status(400).json({ error: 'Vous ne pouvez pas changer votre propre rôle' });
      }
      updates.role = req.body.role;
    }

    if (req.body.status !== undefined) {
      if (!['active', 'suspended'].includes(req.body.status)) {
        return res.status(400).json({ error: 'Statut invalide (active | suspended)' });
      }
      if (isSelf) {
        return res.status(400).json({ error: 'Vous ne pouvez pas modifier votre propre statut' });
      }
      updates.status = req.body.status;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    }

    users[idx] = { ...target, ...updates };
    if (!writeUsers(users)) {
      return res.status(500).json({ error: 'Erreur de sauvegarde' });
    }

    // ✅ AUDIT
    log({
      action: 'update_user',
      category: 'user',
      severity: 'info',
      success: true,
      actor: me,
      target: { type: 'user', id: target.id, name: users[idx].name, email: users[idx].email },
      details: { changes: updates, previousRole: target.role },
      req,
    });

    console.log(`✏️  Utilisateur #${id} modifié par ${me.email} :`, Object.keys(updates).join(', '));
    res.json(sanitize(users[idx]));
  } catch (err) {
    console.error('PATCH /users/:id :', err);
    res.status(500).json({ error: 'Erreur mise à jour utilisateur' });
  }
});

// ────────────────────────────────────────────────────────────
// 6️⃣  PATCH /api/users/:id/status  → Bascule actif/suspendu
// ────────────────────────────────────────────────────────────
router.patch('/:id/status', verifyToken, requireRole('super_admin', 'chef'), (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const users = readUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const target = users[idx];
    const me = req.user;

    if (!canManage(me, target)) {
      return res.status(403).json({ error: 'Vous ne pouvez pas modifier cet utilisateur' });
    }

    if (me.id === target.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas modifier votre propre statut' });
    }

    const previousStatus = target.status;
    users[idx].status = target.status === 'active' ? 'suspended' : 'active';
    users[idx].updatedAt = new Date().toISOString();

    if (!writeUsers(users)) {
      return res.status(500).json({ error: 'Erreur de sauvegarde' });
    }

    // ✅ AUDIT
    log({
      action: 'toggle_user_status',
      category: 'user',
      severity: users[idx].status === 'suspended' ? 'warning' : 'info',
      success: true,
      actor: me,
      target: { type: 'user', id: target.id, name: target.name, email: target.email },
      details: { from: previousStatus, to: users[idx].status },
      req,
    });

    console.log(`🔁 Statut de ${target.email} → ${users[idx].status} (par ${me.email})`);
    res.json(sanitize(users[idx]));
  } catch (err) {
    console.error('PATCH /users/:id/status :', err);
    res.status(500).json({ error: 'Erreur changement de statut' });
  }
});

// ────────────────────────────────────────────────────────────
// 7️⃣  POST /api/users/:id/reset-password
// ────────────────────────────────────────────────────────────
router.post('/:id/reset-password', verifyToken, requireRole('super_admin', 'chef'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const { newPassword } = req.body || {};
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'Mot de passe trop court (min. 6 caractères)' });
    }

    const users = readUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const target = users[idx];
    if (!canManage(req.user, target)) {
      return res.status(403).json({ error: 'Vous ne pouvez pas modifier cet utilisateur' });
    }

    users[idx].password = await hashPassword(newPassword);
    users[idx].updatedAt = new Date().toISOString();

    if (!writeUsers(users)) {
      return res.status(500).json({ error: 'Erreur de sauvegarde' });
    }

    // ✅ AUDIT
    log({
      action: 'reset_password',
      category: 'user',
      severity: 'warning',
      success: true,
      actor: req.user,
      target: { type: 'user', id: target.id, name: target.name, email: target.email },
      details: { resetBy: req.user.email },
      req,
    });

    console.log(`🔑 Mot de passe réinitialisé pour ${target.email} (par ${req.user.email})`);
    res.json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
  } catch (err) {
    console.error('POST /users/:id/reset-password :', err);
    res.status(500).json({ error: 'Erreur réinitialisation mot de passe' });
  }
});

// ────────────────────────────────────────────────────────────
// 8️⃣  DELETE /api/users/:id  → Super Admin uniquement
// ────────────────────────────────────────────────────────────
router.delete('/:id', verifyToken, requireRole('super_admin'), (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const me = req.user;
    if (me.id === id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    const users = readUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const target = users[idx];

    if (target.role === 'super_admin') {
      const superAdmins = users.filter(u => u.role === 'super_admin');
      if (superAdmins.length <= 1) {
        return res.status(400).json({
          error: 'Impossible de supprimer le dernier Super Admin'
        });
      }
    }

    users.splice(idx, 1);
    if (!writeUsers(users)) {
      return res.status(500).json({ error: 'Erreur de sauvegarde' });
    }

    // ✅ AUDIT
    log({
      action: 'delete_user',
      category: 'user',
      severity: 'critical',
      success: true,
      actor: me,
      target: { type: 'user', id: target.id, name: target.name, email: target.email },
      details: { role: target.role, deletedBy: me.email },
      req,
    });

    console.log(`🗑️  Utilisateur supprimé : ${target.email} (par ${me.email})`);
    res.json({ success: true, message: `Utilisateur "${target.name}" supprimé` });
  } catch (err) {
    console.error('DELETE /users/:id :', err);
    res.status(500).json({ error: 'Erreur suppression utilisateur' });
  }
});

module.exports = router;