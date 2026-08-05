-- Team lifecycle columns, player profiles, and the join-request workflow.

-- ---------------------------------------------------------------------------
-- parties: visibility, locking, rename tracking
-- ---------------------------------------------------------------------------
-- visibility is deliberately independent of passwordHash. Treating "has a
-- password" as "is private" would conflate two different rules and make
-- "remove password" silently switch the join model from approval to instant.
--   PUBLIC  — joinable straight away with the invite code (+ password if set)
--   PRIVATE — the code only lets you *request*; the leader must accept
ALTER TABLE parties
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(10) NOT NULL DEFAULT 'PUBLIC';

-- Locked teams refuse new members and new requests without losing their
-- visibility setting, so a leader can reopen without reconfiguring.
ALTER TABLE parties
    ADD COLUMN IF NOT EXISTS isLocked BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE parties
    ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Rejects a typo'd visibility before it reaches the read path, where an
-- unexpected value would otherwise be silently treated as PRIVATE.
DO $$
BEGIN
    ALTER TABLE parties
        ADD CONSTRAINT parties_visibility_check
        CHECK (visibility IN ('PUBLIC', 'PRIVATE'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE parties
        ADD CONSTRAINT parties_max_players_check
        CHECK (maxPlayers BETWEEN 1 AND 4);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Case-insensitive uniqueness on team name: "Team Rocket" and "team rocket"
-- are the same team to a human reading a leaderboard.
CREATE UNIQUE INDEX IF NOT EXISTS idx_parties_name_lower ON parties (LOWER(name));

DO $$
BEGIN
    ALTER TABLE user_auth
        ADD CONSTRAINT user_auth_role_check CHECK (role IN ('PLAYER', 'ADMIN'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- player_profiles: the registration data the portal exists to collect
-- ---------------------------------------------------------------------------
-- The team UI has always asked for these six fields but had nowhere to put
-- them, so every submission was discarded. One row per user rather than
-- columns on user_auth: user_auth is OAuth identity owned by the sign-in
-- flow, this is self-reported event data with a different lifecycle.
CREATE TABLE IF NOT EXISTS player_profiles (
    userId          UUID PRIMARY KEY REFERENCES user_auth(userId) ON DELETE CASCADE,
    fullName        VARCHAR(100) NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    discordUsername VARCHAR(64) NOT NULL,
    year            SMALLINT NOT NULL,
    branch          VARCHAR(50) NOT NULL,
    rollNumber      VARCHAR(30) NOT NULL,
    createdAt       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT player_profiles_year_check CHECK (year BETWEEN 1 AND 4)
);

-- A roll number identifies one student; two accounts claiming the same one is
-- a duplicate registration.
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_profiles_roll
    ON player_profiles (UPPER(rollNumber));

-- ---------------------------------------------------------------------------
-- party_join_requests: approval workflow for PRIVATE teams
-- ---------------------------------------------------------------------------
-- Resolved requests are kept rather than deleted so a rejected user cannot
-- spam a leader by re-requesting, and so the audit trail survives.
CREATE TABLE IF NOT EXISTS party_join_requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partyId     VARCHAR(36) NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    userId      UUID NOT NULL REFERENCES user_auth(userId) ON DELETE CASCADE,
    status      VARCHAR(10) NOT NULL DEFAULT 'PENDING',
    createdAt   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolvedAt  TIMESTAMPTZ,
    resolvedBy  UUID REFERENCES user_auth(userId) ON DELETE SET NULL,
    CONSTRAINT party_join_requests_status_check
        CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'))
);

-- At most one *open* request per (party, user). A partial unique index is what
-- makes this a database guarantee instead of a check-then-insert race between
-- two concurrent requests.
CREATE UNIQUE INDEX IF NOT EXISTS idx_join_requests_one_pending
    ON party_join_requests (partyId, userId)
    WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_join_requests_party_status
    ON party_join_requests (partyId, status);
CREATE INDEX IF NOT EXISTS idx_join_requests_user
    ON party_join_requests (userId, status);
