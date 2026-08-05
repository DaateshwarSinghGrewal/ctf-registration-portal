-- Baseline: the schema as it exists in the deployed database.
--
-- This reconciles a real drift. The previous schema.sql never declared
-- user_auth.role, but the live database has it (VARCHAR NOT NULL DEFAULT
-- 'PLAYER') because it was added by hand. Anyone provisioning a fresh
-- database from that file got no role column, so every /admin route and
-- updateUserRole failed. Declaring it here makes a new environment match the
-- deployed one.
--
-- Every statement is idempotent and additive: this file runs safely against
-- the populated production database (17 users / 11 parties / 16 memberships).

CREATE TABLE IF NOT EXISTS user_auth (
    userId    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    googleId  TEXT UNIQUE NOT NULL,
    email     VARCHAR(255) UNIQUE NOT NULL,
    username  VARCHAR(50) UNIQUE NOT NULL,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lastLogin TIMESTAMPTZ
);

-- The drift fix. NOT NULL is safe alongside a default even on existing rows.
ALTER TABLE user_auth
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'PLAYER';

CREATE TABLE IF NOT EXISTS parties (
    id           VARCHAR(36) PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    passwordHash VARCHAR(255),
    leaderId     UUID NOT NULL REFERENCES user_auth(userId) ON DELETE CASCADE,
    maxPlayers   INT NOT NULL DEFAULT 4,
    createdAt    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS party_members (
    partyId  VARCHAR(36) NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    userId   UUID NOT NULL REFERENCES user_auth(userId) ON DELETE CASCADE,
    joinedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (partyId, userId)
);

-- "Which party am I in?" is the single hottest lookup in the portal (the SPA
-- currently caches it in localStorage because no endpoint exposed it), and it
-- queries by userId — the non-leading half of the composite primary key,
-- which that index cannot serve.
CREATE INDEX IF NOT EXISTS idx_party_members_user ON party_members (userId);
CREATE INDEX IF NOT EXISTS idx_parties_leader ON parties (leaderId);
