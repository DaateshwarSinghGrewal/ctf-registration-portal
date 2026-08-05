-- Notifications, audit log, and event-wide registration settings.

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
-- Persisted rather than emitted-and-forgotten: a socket delivers only to a
-- user who happens to be connected, and a registration portal has to survive
-- the leader being offline when a join request arrives.
--
-- `payload` is JSONB because each type carries different context (a party id,
-- an actor's username, a deadline). Typing it per notification kind would mean
-- a column per kind or a table per kind; the discriminant is `type`, and the
-- TypeScript layer owns the per-type shape.
CREATE TABLE IF NOT EXISTS notifications (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId    UUID NOT NULL REFERENCES user_auth(userId) ON DELETE CASCADE,
    type      VARCHAR(40) NOT NULL,
    title     VARCHAR(120) NOT NULL,
    body      TEXT NOT NULL,
    payload   JSONB NOT NULL DEFAULT '{}'::jsonb,
    readAt    TIMESTAMPTZ,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Serves both the inbox (newest first) and the unread badge from one index.
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON notifications (userId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications (userId) WHERE readAt IS NULL;

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
-- actorId is nullable and ON DELETE SET NULL: the record of what happened has
-- to outlive the account that did it, otherwise deleting a user erases the
-- evidence. Same reason targetType/targetId are loose strings rather than
-- foreign keys — the log must still describe a party that no longer exists.
CREATE TABLE IF NOT EXISTS audit_logs (
    id         BIGSERIAL PRIMARY KEY,
    actorId    UUID REFERENCES user_auth(userId) ON DELETE SET NULL,
    action     VARCHAR(60) NOT NULL,
    targetType VARCHAR(30) NOT NULL,
    targetId   VARCHAR(64),
    metadata   JSONB NOT NULL DEFAULT '{}'::jsonb,
    ipAddress  VARCHAR(45),
    createdAt  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actorId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs (targetType, targetId);

-- ---------------------------------------------------------------------------
-- event_settings
-- ---------------------------------------------------------------------------
-- Single-row table holding whether registration is open. The CHECK on id
-- makes "there is exactly one settings row" a database invariant, so no code
-- path can create a second one and leave the answer ambiguous.
CREATE TABLE IF NOT EXISTS event_settings (
    id                  BOOLEAN PRIMARY KEY DEFAULT TRUE,
    registrationOpen    BOOLEAN NOT NULL DEFAULT TRUE,
    registrationClosesAt TIMESTAMPTZ,
    updatedAt           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedBy           UUID REFERENCES user_auth(userId) ON DELETE SET NULL,
    CONSTRAINT event_settings_singleton CHECK (id)
);

INSERT INTO event_settings (id, registrationOpen)
VALUES (TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;
