-- =====================================================
-- TICKETS
-- =====================================================
CREATE TABLE IF NOT EXISTS tickets (
  id            SERIAL PRIMARY KEY,
  subject       VARCHAR(255) NOT NULL,
  client        VARCHAR(255) NOT NULL,
  phone         VARCHAR(50)  NOT NULL,
  description   TEXT         NOT NULL,
  priority      VARCHAR(20)  NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low','medium','high','urgent')),
  status        VARCHAR(20)  NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','in_progress','resolved','closed')),
  category      VARCHAR(50)  DEFAULT 'general',
  assigned_to   INTEGER,
  created_by    INTEGER,
  relance_count INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  closed_at     TIMESTAMPTZ
);

-- =====================================================
-- COMMENTAIRES / FIL DE SUIVI
-- =====================================================
CREATE TABLE IF NOT EXISTS ticket_comments (
  id           SERIAL PRIMARY KEY,
  ticket_id    INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id    INTEGER,
  author_name  VARCHAR(255) NOT NULL,
  author_role  VARCHAR(50)  NOT NULL,
  type         VARCHAR(30)  NOT NULL DEFAULT 'comment',
  text         TEXT         NOT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket
  ON ticket_comments(ticket_id);

CREATE INDEX IF NOT EXISTS idx_tickets_status
  ON tickets(status);

CREATE INDEX IF NOT EXISTS idx_tickets_assigned
  ON tickets(assigned_to);

-- Démarre les IDs à 1001 (esthétique, comme l'ancienne simulation)
SELECT setval(
  'tickets_id_seq',
  GREATEST((SELECT COALESCE(MAX(id), 0) FROM tickets), 1000)
);