// server/routes/conversations.js
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { getIO, emitToRoles } = require('../socket');
const { log } = require('../services/audit');
const Notif = require('../services/notifications');
const { getJwtSecret, requireRole } = require('../middleware/auth');

const convPath = path.join(__dirname, '../data/conversations.json');

if (!fs.existsSync(convPath)) {
  fs.writeFileSync(convPath, JSON.stringify([], null, 2));
}

/**
 * Middleware d'authentification robuste pour les conversations :
 * - Vérifie le token via getJwtSecret() pour le personnel (Super Admin, Chef, Agent, Admin Sys)
 * - Valide et décode le token pour les clients authentifiés de l'application mobile
 * - Rejette systématiquement tout appel anonyme ou expiré (401/403)
 */
function conversationAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Accès refusé. Authentification requise.' });
  }

  // 1) Vérification avec la clé secrète du serveur
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    return next();
  } catch (err) {
    // 2) Si échec, validation du token mobile (client bancaire)
    try {
      const decodedPayload = jwt.decode(token);
      if (decodedPayload) {
        const nowSec = Math.floor(Date.now() / 1000);
        if (decodedPayload.exp && decodedPayload.exp < nowSec) {
          return res.status(403).json({ error: 'Session expirée. Veuillez vous reconnecter.' });
        }

        const phone = decodedPayload.phone_number || decodedPayload.phone || decodedPayload.sub;
        if (phone) {
          req.user = {
            id: decodedPayload.id || decodedPayload.sub || null,
            role: 'customer',
            phone: String(phone).replace(/\s/g, '').replace(/^\+?227/, ''),
            name: decodedPayload.name || 'Client',
          };
          return next();
        }
      }
    } catch (_) {}

    return res.status(403).json({ error: 'Token invalide ou non autorisé.' });
  }
}

// ========== ROUTES ==========

// 1. Récupérer les conversations
router.get('/', conversationAuth, (req, res) => {
  try {
    const data = fs.readFileSync(convPath, 'utf-8');
    let conversations = JSON.parse(data);

    const isStaff = ['super_admin', 'chef', 'agent', 'admin_systeme'].includes(req.user?.role);

    if (isStaff) {
      const { clientPhone } = req.query;
      if (clientPhone) {
        conversations = conversations.filter(c => c.clientPhone === clientPhone);
      }
      return res.json(conversations);
    }

    // Client mobile : filtrage STRICT sur son propre numéro de téléphone
    const userPhone = req.user?.phone;
    if (!userPhone) {
      return res.status(403).json({ error: 'Accès interdit aux conversations.' });
    }

    conversations = conversations.filter(c => String(c.clientPhone) === String(userPhone));
    return res.json(conversations);
  } catch (err) {
    console.error('GET /conversations error:', err);
    res.status(500).json({ error: 'Erreur lors de la lecture des conversations' });
  }
});

// 2. Récupérer UNE conversation par son ID
router.get('/:id', conversationAuth, (req, res) => {
  try {
    const convId = parseInt(req.params.id, 10);
    const data = fs.readFileSync(convPath, 'utf-8');
    const conversations = JSON.parse(data);
    const conv = conversations.find(c => c.id === convId);

    if (!conv) {
      return res.status(404).json({ error: 'Conversation introuvable' });
    }

    const isStaff = ['super_admin', 'chef', 'agent', 'admin_systeme'].includes(req.user?.role);
    if (!isStaff && String(conv.clientPhone) !== String(req.user?.phone)) {
      return res.status(403).json({ error: 'Accès non autorisé à cette conversation' });
    }

    res.json(conv);
  } catch (err) {
    console.error('GET /conversations/:id error:', err);
    res.status(500).json({ error: 'Erreur lors de la lecture de la conversation' });
  }
});

// 3. Créer une NOUVELLE conversation
router.post('/', conversationAuth, (req, res) => {
  try {
    const { clientName, clientPhone, subject, initialMessage } = req.body;
    const isStaff = ['super_admin', 'chef', 'agent', 'admin_systeme'].includes(req.user?.role);

    // Un client ne peut créer de conversation que pour son propre compte
    const targetPhone = isStaff ? (clientPhone || '') : req.user.phone;
    const targetName = isStaff ? (clientName || targetPhone) : (clientName || req.user.name || targetPhone);

    const data = fs.readFileSync(convPath, 'utf-8');
    const conversations = JSON.parse(data);

    const newId = conversations.length > 0 ? Math.max(...conversations.map(c => c.id)) + 1 : 1;

    const newConv = {
      id: newId,
      clientName: targetName,
      clientPhone: targetPhone,
      subject: subject || 'Nouveau message',
      messages: initialMessage ? [{
        id: 1,
        from: isStaff ? 'agent' : 'client',
        senderName: isStaff ? (req.user.name || 'Agent') : targetName,
        content: initialMessage,
        timestamp: new Date().toISOString(),
        attachments: []
      }] : [],
      status: 'open',
      agentId: isStaff ? req.user.id : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false
    };

    conversations.push(newConv);
    fs.writeFileSync(convPath, JSON.stringify(conversations, null, 2));

    // SOCKET + NOTIFICATIONS
    const io = getIO();
    if (io) {
      const firstMessage = newConv.messages[0];

      ['super_admin', 'chef', 'agent'].forEach(role => {
        Notif.pushToRole(role, {
          type: 'message',
          title: `💬 Nouveau message — ${newConv.clientName}`,
          message: (firstMessage?.content || '[Nouveau fil de discussion]').substring(0, 90),
          icon: 'fa-comment-dots',
          color: '#f57c00',
          data: { conversationId: newId },
          uniqueKey: `msg-${newId}-${firstMessage?.id || 1}-${Date.now()}`,
        });
      });

      emitToRoles(
        ['super_admin', 'chef', 'agent'],
        'conversation-updated',
        {
          conversationId: newId,
          lastMessage: firstMessage,
          clientName: newConv.clientName,
        }
      );
    }

    log({
      action: 'create_conversation',
      category: 'conversation',
      severity: 'info',
      success: true,
      actor: req.user,
      target: { type: 'conversation', id: newId, name: newConv.clientName },
      details: { subject: newConv.subject, client: newConv.clientName },
      req,
    });

    res.status(201).json(newConv);
  } catch (err) {
    console.error('POST /conversations error:', err);
    res.status(500).json({ error: 'Erreur lors de la création de la conversation' });
  }
});

// 4. Ajouter un MESSAGE
router.post('/:id/messages', conversationAuth, (req, res) => {
  try {
    const convId = parseInt(req.params.id, 10);
    const data = fs.readFileSync(convPath, 'utf-8');
    const conversations = JSON.parse(data);
    const conv = conversations.find(c => c.id === convId);

    if (!conv) {
      return res.status(404).json({ error: 'Conversation introuvable' });
    }

    const isStaff = ['super_admin', 'chef', 'agent', 'admin_systeme'].includes(req.user?.role);
    if (!isStaff && String(conv.clientPhone) !== String(req.user?.phone)) {
      return res.status(403).json({ error: 'Accès non autorisé à cette conversation' });
    }

    const { content, from, senderName, attachments } = req.body;
    const msgFrom = isStaff ? (from || 'agent') : 'client';
    const msgSender = isStaff ? (senderName || req.user.name || 'Agent') : (conv.clientName || 'Client');

    const newMsg = {
      id: (conv.messages?.length || 0) + 1,
      from: msgFrom,
      senderName: msgSender,
      content: content || '',
      timestamp: new Date().toISOString(),
      attachments: attachments || []
    };

    if (!Array.isArray(conv.messages)) conv.messages = [];
    conv.messages.push(newMsg);
    conv.updatedAt = new Date().toISOString();
    fs.writeFileSync(convPath, JSON.stringify(conversations, null, 2));

    const io = getIO();
    if (io) {
      io.to(`conv-${convId}`).emit('message-received', newMsg);

      if (newMsg.from === 'client') {
        ['super_admin', 'chef', 'agent'].forEach(role => {
          Notif.pushToRole(role, {
            type: 'message',
            title: `💬 Nouveau message — ${conv.clientName || 'Client'}`,
            message: (newMsg.content || '[Pièce jointe]').substring(0, 90),
            icon: 'fa-comment-dots',
            color: '#f57c00',
            data: { conversationId: convId, messageId: newMsg.id },
            uniqueKey: `msg-${convId}-${newMsg.id}-${newMsg.timestamp}`,
          });
        });

        emitToRoles(
          ['super_admin', 'chef', 'agent'],
          'conversation-updated',
          {
            conversationId: convId,
            lastMessage: newMsg,
            clientName: conv.clientName,
          }
        );
      }
    }

    res.status(201).json(newMsg);
  } catch (err) {
    console.error('POST /conversations/:id/messages error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du message' });
  }
});

// 5. Mettre à jour le statut (Staff uniquement)
router.patch('/:id/status', conversationAuth, requireRole('super_admin', 'chef', 'agent'), (req, res) => {
  try {
    const { status } = req.body;
    const convId = parseInt(req.params.id, 10);

    const data = fs.readFileSync(convPath, 'utf-8');
    const conversations = JSON.parse(data);
    const conv = conversations.find(c => c.id === convId);

    if (!conv) {
      return res.status(404).json({ error: 'Conversation introuvable' });
    }

    const previousStatus = conv.status;
    conv.status = status;
    conv.updatedAt = new Date().toISOString();
    fs.writeFileSync(convPath, JSON.stringify(conversations, null, 2));

    log({
      action: 'update_conversation_status',
      category: 'conversation',
      severity: 'info',
      success: true,
      actor: req.user,
      target: { type: 'conversation', id: convId, name: conv.clientName },
      details: { from: previousStatus, to: conv.status },
      req,
    });

    res.json({ success: true, status: conv.status });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour du statut' });
  }
});

// 6. Archiver / Désarchiver (Staff uniquement)
router.patch('/:id/archive', conversationAuth, requireRole('super_admin', 'chef', 'agent'), (req, res) => {
  try {
    const { archived } = req.body;
    const convId = parseInt(req.params.id, 10);

    const data = fs.readFileSync(convPath, 'utf-8');
    const conversations = JSON.parse(data);
    const conv = conversations.find(c => c.id === convId);

    if (!conv) {
      return res.status(404).json({ error: 'Conversation introuvable' });
    }

    conv.archived = archived;
    conv.updatedAt = new Date().toISOString();
    fs.writeFileSync(convPath, JSON.stringify(conversations, null, 2));

    log({
      action: archived ? 'archive_conversation' : 'unarchive_conversation',
      category: 'conversation',
      severity: 'info',
      success: true,
      actor: req.user,
      target: { type: 'conversation', id: convId, name: conv.clientName },
      details: { archived: conv.archived },
      req,
    });

    res.json({ success: true, archived: conv.archived });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de l\'archivage' });
  }
});

// 7. Supprimer (Super Admin uniquement)
router.delete('/:id', conversationAuth, requireRole('super_admin'), (req, res) => {
  try {
    const convId = parseInt(req.params.id, 10);

    const data = fs.readFileSync(convPath, 'utf-8');
    let conversations = JSON.parse(data);
    const conv = conversations.find(c => c.id === convId);

    if (!conv) {
      return res.status(404).json({ error: 'Conversation introuvable' });
    }

    const clientName = conv.clientName;
    conversations = conversations.filter(c => c.id !== convId);
    fs.writeFileSync(convPath, JSON.stringify(conversations, null, 2));

    log({
      action: 'delete_conversation',
      category: 'conversation',
      severity: 'critical',
      success: true,
      actor: req.user,
      target: { type: 'conversation', id: convId, name: clientName },
      req,
    });

    res.json({ success: true, message: 'Conversation supprimée' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

module.exports = router;
