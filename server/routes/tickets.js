// server/routes/tickets.js
const router = require('express').Router();
const db = require('../db');
const { emitToUser, emitToRole, emitToRoles } = require('../socket');
const { verifyToken } = require('../middleware/auth');
const { log } = require('../services/audit');
const Notif = require('../services/notifications'); // ✅ NOUVEAU

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES   = ['open', 'in_progress', 'resolved', 'closed'];

// ─────────────────────────────────────────────
// Effet workflow d'un commentaire
// ─────────────────────────────────────────────
function workflowEffect(type) {
  switch (type) {
    case 'resolution': return { status: 'resolved' };
    case 'rejection':  return { status: 'in_progress' };
    case 'validation': return { status: 'closed' };
    case 'relance':    return { status: 'in_progress', bumpRelance: true };
    default:           return null;
  }
}

// ─────────────────────────────────────────────
// Helpers SQL → JSON
// ─────────────────────────────────────────────
function rowToComment(r) {
  return {
    id:         r.id,
    ticketId:   r.ticket_id,
    authorId:   r.author_id,
    authorName: r.author_name,
    authorRole: r.author_role,
    type:       r.type,
    text:       r.text,
    createdAt:  r.created_at,
  };
}

function rowToTicket(r, comments = []) {
  return {
    id:           r.id,
    subject:      r.subject,
    client:       r.client,
    phone:        r.phone,
    description:  r.description,
    priority:     r.priority,
    status:       r.status,
    category:     r.category,
    assignedTo:   r.assigned_to,
    createdBy:    r.created_by,
    relanceCount: r.relance_count,
    createdAt:    r.created_at,
    updatedAt:    r.updated_at,
    closedAt:     r.closed_at,
    comments:     comments.map(rowToComment),
  };
}

async function fetchComments(ticketId) {
  const { rows } = await db.query(
    'SELECT * FROM ticket_comments WHERE ticket_id = $1 ORDER BY created_at ASC',
    [ticketId]
  );
  return rows;
}

const toIntOrNull = (v) => {
  const n = parseInt(v, 10);
  return Number.isInteger(n) ? n : null;
};

// ═════════════════════════════════════════════
// GET /api/tickets — filtré par rôle
// ═════════════════════════════════════════════
router.get('/', verifyToken, async (req, res) => {
  try {
    const me = req.user;

    let query = 'SELECT * FROM tickets';
    const params = [];

    if (me.role === 'admin_systeme') {
      query += ' WHERE assigned_to = $1';
      params.push(me.id);
    } else if (me.role === 'agent') {
      query += ' WHERE created_by = $1 OR assigned_to IS NULL';
      params.push(me.id);
    }

    query += ' ORDER BY created_at DESC';

    const { rows } = await db.query(query, params);
    if (rows.length === 0) return res.json([]);

    const ids = rows.map((r) => r.id);
    const { rows: commentRows } = await db.query(
      'SELECT * FROM ticket_comments WHERE ticket_id = ANY($1::int[]) ORDER BY created_at ASC',
      [ids]
    );

    const grouped = commentRows.reduce((acc, c) => {
      (acc[c.ticket_id] ||= []).push(c);
      return acc;
    }, {});

    res.json(rows.map((r) => rowToTicket(r, grouped[r.id] || [])));
  } catch (err) {
    console.error('GET /tickets:', err);
    res.status(500).json({ error: 'Erreur chargement tickets' });
  }
});

// ═════════════════════════════════════════════
// GET /api/tickets/:id
// ═════════════════════════════════════════════
router.get('/:id', verifyToken, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID invalide' });

  try {
    const { rows } = await db.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Ticket introuvable' });

    const comments = await fetchComments(id);
    res.json(rowToTicket(rows[0], comments));
  } catch (err) {
    console.error('GET /tickets/:id:', err);
    res.status(500).json({ error: 'Erreur chargement ticket' });
  }
});

// ═════════════════════════════════════════════
// POST /api/tickets
// ═════════════════════════════════════════════
router.post('/', verifyToken, async (req, res) => {
  const {
    subject, client, phone, description,
    priority = 'medium',
    status,
    category = 'general',
    assignedTo = null,
    initialComment = null,
  } = req.body || {};

  const createdBy = req.user.id;

  if (!subject || !client || !phone || !description) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }
  if (!PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: 'Priorité invalide' });
  }

  const finalStatus =
    status && STATUSES.includes(status)
      ? status
      : assignedTo ? 'in_progress' : 'open';

  const cli = await db.pool.connect();
  try {
    await cli.query('BEGIN');

    const { rows } = await cli.query(
      `INSERT INTO tickets
         (subject, client, phone, description, priority, status, category, assigned_to, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        subject, client, phone, description, priority, finalStatus,
        category, toIntOrNull(assignedTo), toIntOrNull(createdBy),
      ]
    );
    const ticket = rows[0];

    if (initialComment && initialComment.text) {
      await cli.query(
        `INSERT INTO ticket_comments (ticket_id, author_id, author_name, author_role, type, text)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          ticket.id,
          toIntOrNull(initialComment.authorId ?? createdBy),
          initialComment.authorName || 'Système',
          initialComment.authorRole || 'system',
          initialComment.type || 'status',
          initialComment.text,
        ]
      );
    }

    await cli.query('COMMIT');

    const comments = await fetchComments(ticket.id);
    const newTicket = rowToTicket(ticket, comments);

    // ✅ ÉMISSION SOCKET + PERSISTANCE
    const actorId = req.user.id;

    emitToRoles(['super_admin', 'chef', 'agent'], 'ticket-created', newTicket);
    emitToRole('admin_systeme', 'ticket-created', newTicket);

    if (newTicket.assignedTo && Number(newTicket.assignedTo) !== Number(actorId)) {
      // 1) Persiste en base
      Notif.push(newTicket.assignedTo, {
        type: 'ticket-assigned',
        title: `🛡️ Ticket #${newTicket.id} vous est assigné`,
        message: newTicket.subject || '',
        icon: 'fa-user-shield',
        color: '#0891b2',
        data: { ticketId: newTicket.id },
        uniqueKey: `ticket-assigned-${newTicket.id}`,
      });
      // 2) Émet en temps réel
      emitToUser(newTicket.assignedTo, 'ticket-assigned', newTicket);
      console.log(`📤 [ticket-assigned] → user-${newTicket.assignedTo}`);
    }

    // ✅ AUDIT
    log({
      action: 'create_ticket',
      category: 'ticket',
      severity: priority === 'urgent' ? 'warning' : 'info',
      success: true,
      actor: req.user,
      target: { type: 'ticket', id: newTicket.id, name: newTicket.subject },
      details: {
        priority: newTicket.priority,
        status: newTicket.status,
        assignedTo: newTicket.assignedTo,
        client: newTicket.client,
      },
      req,
    });

    res.status(201).json(newTicket);
  } catch (err) {
    await cli.query('ROLLBACK');
    console.error('POST /tickets:', err);
    res.status(500).json({ error: 'Erreur création ticket' });
  } finally {
    cli.release();
  }
});

// ═════════════════════════════════════════════
// PATCH /api/tickets/:id (super_admin + chef)
// ═════════════════════════════════════════════
router.patch('/:id', verifyToken, async (req, res) => {
  if (!['super_admin', 'chef'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès refusé pour votre rôle' });
  }

  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID invalide' });

  const allowed = {
    subject:      'subject',
    client:       'client',
    phone:        'phone',
    description:  'description',
    priority:     'priority',
    status:       'status',
    category:     'category',
    assignedTo:   'assigned_to',
    relanceCount: 'relance_count',
  };

  const updates = [];
  const values = [];
  let i = 1;

  for (const [key, col] of Object.entries(allowed)) {
    if (req.body[key] !== undefined) {
      updates.push(`${col} = $${i++}`);
      values.push(key === 'assignedTo' ? toIntOrNull(req.body[key]) : req.body[key]);
    }
  }

  if (req.body.status === 'closed') {
    updates.push(`closed_at = NOW()`);
  } else if (req.body.status && req.body.status !== 'closed') {
    updates.push(`closed_at = NULL`);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  try {
    const { rows } = await db.query(
      `UPDATE tickets SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Ticket introuvable' });

    const comments = await fetchComments(id);
    const updated = rowToTicket(rows[0], comments);

    // ✅ ÉMISSION SOCKET + PERSISTANCE
    const actorId = req.user.id;

    emitToRoles(['super_admin', 'chef'], 'ticket-updated', updated);

    const parties = new Set();
    if (updated.createdBy)  parties.add(Number(updated.createdBy));
    if (updated.assignedTo) parties.add(Number(updated.assignedTo));

    parties.forEach(uid => {
      if (uid && uid !== Number(actorId)) {
        Notif.push(uid, {
          type: 'ticket-updated',
          title: `🔄 Ticket #${updated.id} mis à jour`,
          message: updated.subject || '',
          icon: 'fa-sync-alt',
          color: '#ff9800',
          data: { ticketId: updated.id },
          uniqueKey: `ticket-up-${updated.id}-${updated.status}-${Date.now()}`,
        });
        emitToUser(uid, 'ticket-updated', updated);
      }
    });

    if (updated.assignedTo && Number(updated.assignedTo) !== Number(actorId)) {
      emitToUser(updated.assignedTo, 'ticket-assigned', updated);
    }

    // ✅ AUDIT
    log({
      action: 'update_ticket',
      category: 'ticket',
      severity: 'info',
      success: true,
      actor: req.user,
      target: { type: 'ticket', id: updated.id, name: updated.subject },
      details: { changes: Object.keys(req.body), status: updated.status },
      req,
    });

    res.json(updated);
  } catch (err) {
    console.error('PATCH /tickets/:id:', err);
    res.status(500).json({ error: 'Erreur mise à jour' });
  }
});

// ═════════════════════════════════════════════
// DELETE /api/tickets/:id (super_admin uniquement)
// ═════════════════════════════════════════════
router.delete('/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Seul le Super Admin peut supprimer un ticket' });
  }

  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID invalide' });

  try {
    const { rows: foundRows } = await db.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (foundRows.length === 0) return res.status(404).json({ error: 'Ticket introuvable' });

    const ticket = foundRows[0];
    const ticketSubject = ticket.subject;

    await db.query('DELETE FROM tickets WHERE id = $1', [id]);

    emitToRoles(['super_admin', 'chef'], 'ticket-updated', { id, deleted: true });

    const parties = new Set();
    if (ticket.created_by)  parties.add(Number(ticket.created_by));
    if (ticket.assigned_to) parties.add(Number(ticket.assigned_to));
    parties.forEach(uid => {
      if (uid && uid !== Number(req.user.id)) {
        emitToUser(uid, 'ticket-updated', { id, deleted: true });
      }
    });

    log({
      action: 'delete_ticket',
      category: 'ticket',
      severity: 'critical',
      success: true,
      actor: req.user,
      target: { type: 'ticket', id, name: ticketSubject },
      details: { deletedBy: req.user.email },
      req,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /tickets/:id:', err);
    res.status(500).json({ error: 'Erreur suppression' });
  }
});

// ═════════════════════════════════════════════
// POST /api/tickets/:id/comments
// ═════════════════════════════════════════════
router.post('/:id/comments', verifyToken, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID invalide' });

  const {
    text,
    type = 'comment',
    authorName = 'Utilisateur',
    authorRole = 'agent',
  } = req.body || {};

  const authorId = req.user.id;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Texte du commentaire requis' });
  }

  const effect = workflowEffect(type);
  const cli = await db.pool.connect();

  try {
    await cli.query('BEGIN');

    const { rows: ticketRows } = await cli.query(
      'SELECT * FROM tickets WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (ticketRows.length === 0) {
      await cli.query('ROLLBACK');
      return res.status(404).json({ error: 'Ticket introuvable' });
    }

    await cli.query(
      `INSERT INTO ticket_comments (ticket_id, author_id, author_name, author_role, type, text)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, toIntOrNull(authorId), authorName, authorRole, type, text.trim()]
    );

    if (effect) {
      const updates = ['updated_at = NOW()'];
      const values = [];
      let i = 1;

      if (effect.status) {
        updates.push(`status = $${i++}`);
        values.push(effect.status);

        if (effect.status === 'closed') {
          updates.push('closed_at = NOW()');
        } else {
          updates.push('closed_at = NULL');
        }
      }
      if (effect.bumpRelance) {
        updates.push('relance_count = relance_count + 1');
      }

      values.push(id);
      await cli.query(
        `UPDATE tickets SET ${updates.join(', ')} WHERE id = $${i}`,
        values
      );
    }

    await cli.query('COMMIT');

    const { rows } = await db.query('SELECT * FROM tickets WHERE id = $1', [id]);
    const comments = await fetchComments(id);
    const updated = rowToTicket(rows[0], comments);

    // ✅ ÉMISSION SOCKET + PERSISTANCE
    const actorId = req.user.id;

    emitToRoles(['super_admin', 'chef'], 'ticket-updated', updated);

    const parties = new Set();
    if (updated.createdBy)  parties.add(Number(updated.createdBy));
    if (updated.assignedTo) parties.add(Number(updated.assignedTo));

    parties.forEach(uid => {
      if (uid && uid !== Number(actorId)) {
        const isAssignee = uid === Number(updated.assignedTo);
        const isCreator  = uid === Number(updated.createdBy);

        let title, icon, color;
        if (isAssignee && !isCreator) {
          title = `📥 Ticket #${updated.id} — action requise`;
          icon  = 'fa-user-shield';
          color = '#0891b2';
        } else if (isCreator && !isAssignee) {
          title = `📬 Mise à jour du ticket #${updated.id}`;
          icon  = 'fa-reply';
          color = '#2563eb';
        } else {
          title = `🔄 Ticket #${updated.id} mis à jour`;
          icon  = 'fa-sync-alt';
          color = '#ff9800';
        }

        Notif.push(uid, {
          type: 'ticket-updated',
          title,
          message: updated.subject || '',
          icon, color,
          data: { ticketId: updated.id },
          uniqueKey: `ticket-up-${updated.id}-${updated.status}-${Date.now()}`,
        });

        emitToUser(uid, 'ticket-updated', updated);
      }
    });

    const auditAction =
      type === 'resolution' ? 'ticket_resolved'
      : type === 'validation' ? 'ticket_closed'
      : type === 'rejection' ? 'ticket_rejected'
      : type === 'relance' ? 'ticket_relanced'
      : 'ticket_comment';

    log({
      action: auditAction,
      category: 'ticket',
      severity: type === 'rejection' ? 'warning' : 'info',
      success: true,
      actor: req.user,
      target: { type: 'ticket', id: updated.id, name: updated.subject },
      details: {
        commentType: type,
        textPreview: text.slice(0, 200),
        newStatus: updated.status,
      },
      req,
    });

    res.status(201).json(updated);
  } catch (err) {
    await cli.query('ROLLBACK');
    console.error('POST /tickets/:id/comments:', err);
    res.status(500).json({ error: 'Erreur ajout commentaire' });
  } finally {
    cli.release();
  }
});

module.exports = router;