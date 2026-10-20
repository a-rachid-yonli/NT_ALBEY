// server/scripts/seed-super-admin.js
// ============================================================
// SEED — Garantit qu'un compte Super Admin existe
// ============================================================
// Appelé au démarrage du serveur (voir index.js).
// Idempotent : ne fait rien si un super_admin actif existe déjà.
// ============================================================

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const USERS_PATH = path.join(__dirname, '../data/users.json');

// ⚙️ Identifiants par défaut — À CHANGER après la 1ère connexion !
const DEFAULT_SUPER_ADMIN = {
  name: 'Super Admin',
  email: process.env.SUPER_ADMIN_EMAIL || 'super@nt.com',
  password: process.env.SUPER_ADMIN_PASSWORD || 'super123',
  role: 'super_admin',
};

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function ensureFile() {
  const dir = path.dirname(USERS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(USERS_PATH)) {
    fs.writeFileSync(USERS_PATH, JSON.stringify([], null, 2));
  }
}

function readUsers() {
  ensureFile();
  try {
    const raw = fs.readFileSync(USERS_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
}

function nextId(users) {
  if (users.length === 0) return 1;
  return Math.max(...users.map(u => u.id || 0)) + 1;
}

// ------------------------------------------------------------
// Fonction principale
// ------------------------------------------------------------
async function seedSuperAdmin() {
  const users = readUsers();

  // 1) Un super_admin actif existe déjà ? → on ne fait rien
  const existing = users.find(
    u => u.role === 'super_admin' && u.status !== 'suspended'
  );
  if (existing) {
    console.log(`ℹ️  Super Admin existant : ${existing.email}`);
    return { created: false, user: existing };
  }

  // 2) Vérifier qu'aucun super_admin (même suspendu) n'utilise cet email
  const emailTaken = users.some(
    u => u.email?.toLowerCase() === DEFAULT_SUPER_ADMIN.email.toLowerCase()
  );
  if (emailTaken) {
    console.warn(
      `⚠️  Un compte utilise déjà ${DEFAULT_SUPER_ADMIN.email} ` +
      `mais son rôle n'est pas super_admin. Vérifie users.json.`
    );
    return { created: false, user: null };
  }

  // 3) Créer le super_admin
  const hashed = await bcrypt.hash(DEFAULT_SUPER_ADMIN.password, 10);
  const newUser = {
    id: nextId(users),
    name: DEFAULT_SUPER_ADMIN.name,
    email: DEFAULT_SUPER_ADMIN.email.toLowerCase().trim(),
    password: hashed,                          // ✅ bcrypt
    role: 'super_admin',
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  writeUsers(users);

  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  🎉 SUPER ADMIN CRÉÉ AUTOMATIQUEMENT            ║');
  console.log('╠════════════════════════════════════════════════╣');
  console.log(`║  Email    : ${newUser.email.padEnd(34)}║`);
  console.log(`║  Password : ${DEFAULT_SUPER_ADMIN.password.padEnd(34)}║`);
  console.log('║  ⚠️  Change-le après ta 1ère connexion !        ║');
  console.log('╚════════════════════════════════════════════════╝');

  return { created: true, user: newUser };
}

module.exports = { seedSuperAdmin };