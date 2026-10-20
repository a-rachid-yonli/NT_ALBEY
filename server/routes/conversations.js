// server/routes/conversations.js
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { getIO, emitToRoles } = require('../socket');
const { log } = require('../services/audit');
const Notif = require('../services/notifications'); // ✅ NOUVEAU
const jwt = require('jsonwebtoken');

const convPath = path.join(__dirname, '../data/conversations.json');
const JWT_SECRET = process.env.JWT_SECRET || 'ma_super_cle_secrete';

if (!fs.existsSync(convPath)) {
  fs.writeFileSync(convPath, JSON.stringify([]));
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch {
    req.user = null;
  }
  next();
}

// ========== ROUTES ==========

// 1. Récupérer TOUTES les conversations
router.get('/', (req, res) => {
  try {
    const data = fs.readFileSync(convPath, 'utf-8');
    const conversations = JSON.parse(data);
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la lecture des conversations' });
  }
});

// 2. Récupérer UNE conversation par son ID
router.get('/:id', (req, res) => {
  try {
    const data = fs.readFileSync(convPath, 'utf-8');
    const conversations = JSON.parse(data);
    const conv = conversations.find(c => c.id === parseInt(req.params.id));
    if (!conv) {
      return res.status(404).json({ error: 'Conversation introuvable' });
    }
    res.json(conv);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la lecture de la conversation' });
  }
});

// 3. Créer une NOUVELLE conversation
router.post('/', optionalAuth, (req, res) => {
  try {
    const { clientName, clientPhone, subject, initialMessage } = req.body;

    const data = fs.readFileSync(convPath, 'utf-8');
    const conversations = JSON.parse(data);

    const newId = conversations.length > 0 ? Math.max(...conversations.map(c => c.id)) + 1 : 1;

    const newConv = {
      id: newId,
      clientName: clientName || clientPhone,
      clientPhone: clientPhone,
      subject: subject || 'Nouveau message',
      messages: [{
        id: 1,
        from: 'client',
        senderName: clientName || clientPhone,
        content: initialMessage || '',
        timestamp: new Date().toISOString(),
        attachments: []
      }],
      status: 'open',
      agentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false
    };

    conversations.push(newConv);
    fs.writeFileSync(convPath, JSON.stringify(conversations, null, 2));

    // ✅ SOCKET + PERSISTANCE
    const io = getIO();
    if (io) {
      const firstMessage = newConv.messages[0];

      ['super_admin', 'chef', 'agent'].forEach(role => {
        Notif.pushToRole(role, {
          type: 'message',
          title: `💬 Nouveau message — ${newConv.clientName}`,
          message: (firstMessage.content || '[Pièce jointe]').substring(0, 90),
          icon: 'fa-comment-dots',
          color: '#f57c00',
          data: { conversationId: newId },
          uniqueKey: `msg-${newId}-${firstMessage.id}-${firstMessage.timestamp}`,
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
      console.log(`🔔 [notif] Nouvelle conversation #${newId} broadcastée`);
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
    console.error('POST /conversations :', err);
    res.status(500).json({ error: 'Erreur lors de la création de la conversation' });
  }
});

// 4. Ajouter un MESSAGE
router.post('/:id/messages', optionalAuth, (req, res) => {
  try {
    const { content, from, senderName, attachments } = req.body;
    const convId = parseInt(req.params.id);

    const data = fs.readFileSync(convPath, 'utf-8');
    const conversations = JSON.parse(data);
    const conv = conversations.find(c => c.id === convId);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation introuvable' });
    }

    const newMsg = {
      id: conv.messages.length + 1,
      from: from || 'client',
      senderName: senderName || 'Client',
      content: content || '',
      timestamp: new Date().toISOString(),
      attachments: attachments || []
    };

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
    console.error('POST /conversations/:id/messages :', err);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du message' });
  }
});

// 5. Mettre à jour le statut
router.patch('/:id/status', optionalAuth, (req, res) => {
  try {
    const { status } = req.body;
    const convId = parseInt(req.params.id);

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

// 6. Archiver / Désarchiver
router.patch('/:id/archive', optionalAuth, (req, res) => {
  try {
    const { archived } = req.body;
    const convId = parseInt(req.params.id);

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

// 7. Supprimer
router.delete('/:id', optionalAuth, (req, res) => {
  try {
    const convId = parseInt(req.params.id);

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