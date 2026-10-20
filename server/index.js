// server/index.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json());

// ===== ROUTES API =====
const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');
const ticketRoutes = require('./routes/tickets');
const usersRoutes = require('./routes/users');
const auditRoutes = require('./routes/audit');
const notificationRoutes = require('./routes/notifications'); // ✅ NOUVEAU

app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes); // ✅ NOUVEAU

app.get('/api/health', (req, res) => {
  res.json({ message: 'Serveur NT Albey opérationnel !' });
});

app.use(express.static(path.join(__dirname, '../web')));

require('./socket')(io);

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('📁 Dossier /data créé');
}

const convPath = path.join(dataDir, 'conversations.json');
if (!fs.existsSync(convPath)) {
  fs.writeFileSync(convPath, JSON.stringify([], null, 2));
  console.log('📁 Fichier conversations.json créé');
}

const usersPath = path.join(dataDir, 'users.json');
if (!fs.existsSync(usersPath)) {
  fs.writeFileSync(usersPath, JSON.stringify([], null, 2));
  console.log('📁 Fichier users.json créé');
}

const auditPath = path.join(dataDir, 'audit.json');
if (!fs.existsSync(auditPath)) {
  fs.writeFileSync(auditPath, JSON.stringify([], null, 2));
  console.log('📁 Fichier audit.json créé');
}

// ✅ NOUVEAU — fichier notifications.json
const notifPath = path.join(dataDir, 'notifications.json');
if (!fs.existsSync(notifPath)) {
  fs.writeFileSync(notifPath, JSON.stringify([], null, 2));
  console.log('📁 Fichier notifications.json créé');
}

const { seedSuperAdmin } = require('./scripts/seed-super-admin');

const PORT = process.env.PORT || 3000;

seedSuperAdmin()
  .then(() => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
      console.log(`🌐 Site web accessible sur http://localhost:${PORT}`);
      console.log(`📡 Accessible sur le réseau via votre IP:${PORT}`);
      console.log('');
    });
  })
  .catch((err) => {
    console.error('❌ Erreur lors du seed Super Admin :', err);
    server.listen(PORT, '0.0.0.0', () => {
      console.warn(`⚠️  Serveur démarré SANS seed : http://localhost:${PORT}`);
    });
  });