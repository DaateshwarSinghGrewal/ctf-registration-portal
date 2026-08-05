# Somnium API — Endpoint Reference

Backend reference for the Somnium CTF registration portal.

**Base URL** — `http://localhost:3000` in development; `VITE_API_URL` on the client.

**Naming.** The UI calls them *teams*; the API and database call them *parties*
(`/party/*`, `parties`, `party_members`). The REST paths were kept as-is so the
existing SPA keeps working. Socket events use the `team:*` names. Same entity
throughout.

---

## Conventions

### Authentication

A successful Google sign-in sets an **httpOnly cookie** named `token`
(HS256 JWT, 5 hour lifetime). It is `Secure` + `SameSite=None` in production and
`SameSite=Lax` in development.

The browser sends it automatically. JavaScript cannot read it, which is the point:
there is no token in `localStorage` for an XSS payload to steal. Every
cross-origin request must use `credentials: 'include'`.

Claims: `{ userId, email, role }`. Anything mutable — username, profile
completeness — is read from the database per request, so a change takes effect
immediately rather than after the token expires.

### Response envelope

Every endpoint returns the same shape.

```jsonc
// success
{ "success": true, "message": "Team created", "data": { } }

// failure
{ "success": false, "message": "Only the team leader can do that",
  "error": { "code": "FORBIDDEN" } }
```

Validation failures add per-field detail:

```jsonc
{ "success": false, "message": "name: Team name must be at least 3 characters",
  "error": { "code": "VALIDATION_ERROR",
             "details": [{ "field": "name", "message": "Team name must be at least 3 characters" }] } }
```

`GET /auth/me` additionally repeats `user` at the top level, because the existing
SPA reads `payload.user`.

### Error codes

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Body, params or query failed its schema |
| `UNAUTHENTICATED` | 401 | Missing, expired or invalid session cookie |
| `FORBIDDEN` | 403 | Authenticated but not permitted (not the leader, no profile, registration closed) |
| `NOT_FOUND` | 404 | No such route or resource |
| `CONFLICT` | 409 | Valid request, wrong state (team full, already in a team, duplicate request) |
| `RATE_LIMITED` | 429 | Too many requests in the window |
| `INTERNAL_ERROR` | 500 | Unexpected — logged server-side with a stack; never leaked to the client in production |

### Rate limits

Sliding window, per user when signed in and per IP otherwise. Redis-backed when
`REDIS_URL` is set, in-memory otherwise. Responses carry `X-RateLimit-Limit`,
`X-RateLimit-Remaining` and, on a 429, `Retry-After`.

| Bucket | Limit | Applies to |
|---|---|---|
| `auth` | 10 / min | `GET /auth/google` |
| `party:join` | 10 / min | joining, requesting to join |
| `party:write` | 30 / min | team create and all leader mutations |

### Gates applied to registration actions

Creating a team, joining one, and requesting to join all check, in order:

1. **Registration open** — `event_settings.registrationOpen`, and
   `registrationClosesAt` if it is in the past → `403`
2. **Profile complete** — a `player_profiles` row must exist → `403`
3. **Not already in a team** — a user belongs to at most one → `409`

---

## Health & event

### `GET /health`
Liveness probe. **No auth.**

`200` → `{ "data": { "status": "up" } }`

Touches nothing. Use it for the host platform's health check.

---

### `GET /event/status`
Whether registration is open. **No auth** — the landing page needs it before
anyone signs in.

`200` →
```json
{ "success": true, "message": "OK",
  "data": { "registrationOpen": true, "registrationClosesAt": null,
            "updatedAt": "2026-08-05T19:56:45.104Z" } }
```

**Errors** — `500` if migrations have not run (the settings row is missing).
Deliberately loud: defaulting to "open" on an unmigrated database would let
registrations through into a schema that cannot hold them.

**Tables** — `event_settings` (read).

---

## Auth

### `GET /auth/google`
Starts the OAuth round trip. A **top-level browser navigation**, not a fetch.

**No auth.** Rate limit `auth`.

`302` → `accounts.google.com/o/oauth2/v2/auth?...&state=<nonce>`
Also sets `oauth_state` — an httpOnly, `SameSite=Lax`, 10-minute cookie scoped to
`/auth`, holding the CSRF nonce.

**Notes** — `SameSite=Lax` is required, not a preference: the callback arrives as
a cross-site redirect from Google, and a `Strict` cookie would be withheld there,
failing every sign-in.

---

### `GET /auth/google/callback`
Google returns here. Browser navigation; never called by JS.

**No auth** (this is what establishes it).

**Query** — `code`, `state` (both from Google).

**Flow** — verify `state` against the cookie → exchange the code → upsert
`user_auth` (keyed on `googleId`) → assign role from `ADMIN_EMAILS` → sign JWT →
set `token` cookie → audit → redirect.

**Responses**

| Outcome | Redirect |
|---|---|
| Success | `{FRONTEND_URL}/team` with the `token` cookie set |
| `state` missing/mismatched | `{FRONTEND_URL}/auth?error=Sign-in+session+expired...` |
| Consent denied / Google error | `{FRONTEND_URL}/auth?error=Google+sign-in+was+cancelled...` |
| Upsert or DB failure | `{FRONTEND_URL}/auth?error=Sign-in+failed...` |

**Notes** — failures redirect to the **SPA**, never to `/auth/google`. Pointing
`failureRedirect` back at the start of the flow (as this once did) produces a
redirect loop on the API origin with no way for the user to see what went wrong.

**Tables** — `user_auth` (upsert, refreshes `lastLogin`), `audit_logs`.

---

### `GET /auth/me`
Current user. Used by the SPA to rehydrate auth on load and after a refresh.

**Auth required.**

`200` →
```json
{ "success": true, "message": "OK",
  "data": { "user": { "userId": "…", "email": "…", "username": "…",
                      "role": "PLAYER", "hasProfile": false } },
  "user": { "userId": "…", "email": "…", "username": "…",
            "role": "PLAYER", "hasProfile": false } }
```

**Errors** — `401` no/invalid cookie, or the account was deleted while its token
was still valid (the cookie is cleared in that case).

**Notes** — reads the database rather than echoing token claims, so a role change
or a newly saved profile shows up at once. A `401` here is the normal "signed out"
answer; the SPA treats it as such rather than an error.

**Tables** — `user_auth`, `player_profiles` (existence check).

---

### `POST /auth/logout`
Clears the session cookie. **Auth required.**

`200` → `{ "data": null, "message": "Logged out" }`

**Notes** — the clear uses byte-identical cookie attributes to the ones used when
setting it; a browser ignores a mismatched clear, which would make sign-out
silently fail.

---

## Profile

The six registration fields the team UI collects. A user only ever reads or writes
their own — there is no `/profile/:userId`, because phone and roll numbers are not
public. All routes **require auth**.

### `GET /profile`

`200` → the profile, or `data: null` with `"No profile yet"`.

```json
{ "success": true, "message": "OK",
  "data": { "userId": "…", "fullName": "Rishank Sharma", "phone": "+91 98765 43210",
            "discordUsername": "rishank", "year": 2, "branch": "COPC",
            "rollNumber": "1025170123", "updatedAt": "2026-08-06T…" } }
```

`null` rather than a `404`: having no profile yet is the normal first state, not an
error.

**Tables** — `player_profiles`.

---

### `PUT /profile`
Creates or replaces the caller's profile.

**Body** — all fields required.

| Field | Rules |
|---|---|
| `fullName` | 2–100 chars, trimmed |
| `phone` | 8–20 chars, at least 8 digits |
| `discordUsername` | 2–64 chars, `[a-zA-Z0-9._#]` |
| `year` | integer 1–4 |
| `branch` | 2–50 chars |
| `rollNumber` | 3–30 chars, `[A-Za-z0-9/-]` |

`200` → the saved profile.

**Errors** — `400` validation; `409` that roll number belongs to another account.

**Notes** — `PUT`, not `POST`: the client submits the whole form each time, so this
is idempotent replacement. Roll-number uniqueness is enforced by a database index
rather than a preceding `SELECT`, because a check-then-insert leaves a window
where two concurrent submissions both pass.

**Tables** — `player_profiles` (upsert), `audit_logs`.

---

## Teams

All routes **require auth**. Leader-only checks are enforced in the service, which
already holds the team row — a middleware guard would need a second read and could
disagree about who leads.

### `GET /party/me`
The caller's team, with roster. `data: null` if they are in none.

`200` →
```json
{ "success": true, "message": "OK",
  "data": { "id": "A1B2C3", "name": "The Dreaming Owls", "leaderId": "…",
            "maxPlayers": 4, "memberCount": 2, "hasPassword": false,
            "visibility": "PUBLIC", "isLocked": false, "createdAt": "…",
            "members": [ { "userId": "…", "username": "…", "isLeader": true,
                           "joinedAt": "…" } ] } }
```

**Notes** — this did not exist before, so the SPA cached the invite code in
`localStorage`. That answer was lost when storage was cleared and stale if the
user had been removed meanwhile. Prefer this endpoint.

**Tables** — `parties`, `party_members`, `user_auth`.

---

### `POST /party/create`
Creates a team with the caller as leader. Rate limit `party:write`.

**Body**

| Field | Required | Rules |
|---|---|---|
| `name` | yes | 3–100 chars, unique case-insensitively |
| `password` | no | 4–128 chars; `""`/`null` means none |
| `maxPlayers` | no | 1–4, default `4` |
| `visibility` | no | `PUBLIC` \| `PRIVATE`, default `PUBLIC` |

`201` → the team summary, including the generated 6-hex-character `id` (the invite
code).

**Errors** — `400` validation · `403` registration closed or no profile · `409`
name taken or already in a team · `429` rate limited.

**Sockets** — the creator's sockets join `party:<id>`, then `team:created`.

**Tables** — `parties`, `party_members` (leader inserted as a member),
`notifications`, `audit_logs`.

**Notes** — the leader *is* a member, because every capacity check counts members;
excluding them would let a team of four hold five.

---

### `POST /party/join`
Joins a **PUBLIC** team immediately. Rate limit `party:join`.

**Body** — `inviteCode` **or** `partyId` (either is accepted; the SPA sends
`inviteCode`), plus `password` if the team has one. Codes are case-insensitive.

`200` → full team details.

**Errors**

| Status | Cause |
|---|---|
| `400` | malformed code, or neither field supplied |
| `401` | wrong team password |
| `403` | team is `PRIVATE` (use the request flow), registration closed, or no profile |
| `404` | no team with that code |
| `409` | team full, locked, or you are already in a team |

**Sockets** — joiner's sockets join the room, then `team:memberJoined` to the room.

**Tables** — `parties` (locked `FOR UPDATE`), `party_members`, `notifications`,
`audit_logs`.

**Notes** — the capacity check and the insert run inside one transaction under a
row lock. Without it two concurrent joins both see three of four seats taken and
both insert.

---

### `GET /party/:partyId`
Team details by invite code. Any authenticated user — the code is itself the access
control, and a prospective member has to see the team before asking to join.

`200` → team details (never the password hash; only `hasPassword`).

**Errors** — `400` malformed code · `404` not found.

---

### `POST /party/leave/:partyId`
Caller leaves their team.

`200` → `{ "data": null, "message": "Left team" }`

**Behaviour** — three outcomes, decided in one transaction:

| Situation | Result |
|---|---|
| Last member leaves | team deleted → `team:deleted` |
| Leader leaves, others remain | longest-standing member promoted → `team:memberLeft` + `team:leaderChanged` |
| Ordinary member leaves | `team:memberLeft` |

**Errors** — `404` team not found · `409` not a member.

**Tables** — `party_members`, `parties`, `notifications`, `audit_logs`.

**Notes** — the original implementation did read → delete → conditional
leader-update as three separate queries, so two concurrent leaves could each
decide they were not the last one out and orphan the team.

---

### `DELETE /party/:partyId/members/:userId`
Leader removes a member. Rate limit `party:write`.

`200` → updated team details.

**Errors** — `400` leader targeting themselves · `403` not the leader · `404` team
or member not found.

**Sockets** — `team:memberRemoved` to the room **and** to the removed user's
personal room (they have already left the room), then their sockets leave it.

**Tables** — `party_members`, `notifications`, `audit_logs`.

---

### `POST /party/kick`  *(legacy)*
Same as the route above, with the body shape the existing SPA sends. Kept for
compatibility; delegates to the same service function rather than duplicating the
logic.

**Body** — `{ "partyId": "A1B2C3", "targetUserId": "<uuid>" }`

Prefer `DELETE /party/:partyId/members/:userId` in new code.

---

### `PATCH /party/:partyId/name`
Rename. **Leader only.** Rate limit `party:write`.

**Body** — `{ "name": "New Name" }` (3–100 chars, unique case-insensitively)

`200` → team summary. **Errors** — `400` · `403` not leader · `404` · `409` name taken.
**Sockets** — `team:renamed`. **Tables** — `parties`, `audit_logs`.

---

### `PATCH /party/:partyId/password`
Set or clear the team password. **Leader only.**

**Body** — `{ "password": "hunter2" }` to set, `{ "password": null }` to remove.

`200` → team summary with `hasPassword` updated.

**Errors** — `400` · `403` not leader · `404`.
**Sockets** — `team:updated`. **Tables** — `parties`, `audit_logs`.

**Notes** — hashed with scrypt. Passwords stored under the previous PBKDF2-1000
scheme still verify, so existing teams are not locked out; anything set or rotated
from now on is scrypt.

---

### `PATCH /party/:partyId/visibility`
**Leader only.** Body `{ "visibility": "PUBLIC" | "PRIVATE" }`.

`200` → team summary. **Sockets** — `team:updated`. **Tables** — `parties`, `audit_logs`.

**Notes** — visibility is independent of whether a password is set. Treating "has a
password" as "is private" would conflate two rules and make *remove password*
silently switch the join model from approval to instant.

---

### `PATCH /party/:partyId/lock`
**Leader only.** Body `{ "isLocked": true | false }`.

A locked team accepts no new members and no new requests, without losing its
visibility setting — so a leader can reopen without reconfiguring.

`200` → team summary. **Sockets** — `team:locked` / `team:unlocked`.
**Tables** — `parties`, `notifications`, `audit_logs`.

---

### `PATCH /party/:partyId/leader`
Transfer leadership. **Leader only.**

**Body** — `{ "newLeaderId": "<uuid>" }`

`200` → team details with `isLeader` moved.

**Errors** — `400` target is not a member, or is already the leader · `403` not the
leader · `404`.

**Sockets** — `team:leaderChanged`. **Tables** — `parties`, `notifications`, `audit_logs`.

**Notes** — the target must already be a member; otherwise leadership could be
handed to an outsider who would then control a team they never joined.

---

### `DELETE /party/:partyId`
Leader disbands the team.

`200` → `{ "data": null, "message": "Team disbanded" }`

**Errors** — `403` not the leader · `404`.

**Sockets** — `team:deleted` to the room, then the room is emptied.

**Tables** — `parties` (delete; `party_members` and `party_join_requests` cascade),
`notifications`, `audit_logs`.

---

## Join requests

The approval workflow for **PRIVATE** teams:

```
requester asks → leader notified → leader accepts / rejects → room updates live
```

Membership is only ever written by *accept* — never by the request itself. All
routes **require auth**.

### `POST /party/:partyId/requests`
Request to join a private team. Rate limit `party:join`. No body.

`201` →
```json
{ "success": true, "message": "Join request sent",
  "data": { "id": "<uuid>", "partyId": "A1B2C3", "userId": "…",
            "username": "…", "status": "PENDING", "createdAt": "…",
            "resolvedAt": null } }
```

**Errors** — `400` team is `PUBLIC` (join directly) · `403` registration closed or
no profile · `404` no such team · `409` already have a pending request, already in
a team, team full or locked.

**Sockets** — `team:joinRequestCreated` to the team room.
**Tables** — `party_join_requests`, `notifications`, `audit_logs`.

**Notes** — "one open request per user per team" is a partial unique index, not a
check-then-insert, so two concurrent requests cannot both succeed.

---

### `GET /party/:partyId/requests`
Pending requests for a team. **Leader only.**

`200` → array of requests, each with the requester's `username`.
**Errors** — `403` not the leader · `404`.

---

### `GET /party/requests/mine`
The caller's own requests, in any state. `200` → array, newest first.

---

### `POST /join-requests/:requestId/accept`
**Leader only.** The only path that adds a member to a private team.

`200` → the resolved request.

**Errors** — `403` not the leader · `404` no such request · `409` already resolved,
team full, team locked, or the requester joined another team while waiting.

**Sockets** — `team:joinRequestResolved` (room + requester), then
`team:memberJoined` to the room.

**Tables** — `party_join_requests`, `party_members`, `notifications`, `audit_logs`.

**Notes** — everything that decides the outcome is re-checked inside the
transaction under a row lock. Those facts were true when the leader loaded the page
and may not be now. Accepting also cancels the requester's other pending requests,
so no leader is left looking at a request that can never succeed.

---

### `POST /join-requests/:requestId/reject`
**Leader only.** `200` → the resolved request.

**Errors** — `403` · `404` · `409` already resolved.
**Sockets** — `team:joinRequestResolved`. **Tables** — `party_join_requests`,
`notifications`, `audit_logs`.

**Notes** — rejected rows are kept, not deleted, so a rejected user cannot re-request
in a loop and the trail survives.

---

### `DELETE /join-requests/:requestId`
Requester withdraws their own pending request.

`200` → `{ "data": null }`. **Errors** — `403` not yours · `404` · `409` already
resolved. **Sockets** — `team:joinRequestResolved`.

---

## Notifications

Durable inbox — the counterpart to the `notification:new` socket event. The socket
covers a user who is connected; this covers what they missed. Both read the same
rows. All routes **require auth**.

### `GET /notifications`

**Query** — `limit` (1–100, default 20) · `offset` (default 0) ·
`unreadOnly` (`true`/`false`, default `false`)

`200` →
```json
{ "success": true, "message": "OK",
  "data": { "notifications": [ { "id": "…", "type": "JOIN_REQUEST_RECEIVED",
                                 "title": "New join request",
                                 "body": "rishank asked to join \"Owls\".",
                                 "payload": { "partyId": "A1B2C3" },
                                 "readAt": null, "createdAt": "…" } ],
            "unreadCount": 3 } }
```

**Tables** — `notifications`.

---

### `POST /notifications/:notificationId/read`
`200` → `{ "data": null }`. **Errors** — `404` not found, not yours, or already read
— one message for all three, because distinguishing them would confirm another
user's notification id exists.

---

### `POST /notifications/read-all`
`200` → `{ "data": { "updated": 4 } }`

---

### Notification types

`TEAM_CREATED` · `MEMBER_JOINED` · `MEMBER_LEFT` · `MEMBER_REMOVED` ·
`YOU_WERE_REMOVED` · `JOIN_REQUEST_RECEIVED` · `JOIN_REQUEST_ACCEPTED` ·
`JOIN_REQUEST_REJECTED` · `LEADER_CHANGED` · `TEAM_LOCKED` · `TEAM_UNLOCKED` ·
`TEAM_FULL` · `TEAM_DELETED` · `REGISTRATION_CLOSING_SOON` ·
`REGISTRATION_CLOSED` · `REGISTRATION_OPENED`

---

## Admin

All routes **require auth + `role = ADMIN`**, applied at the router so a new admin
endpoint is protected by default.

Admins are seeded from `ADMIN_EMAILS` (comma-separated) and the role is re-applied
on every sign-in — so removing an address demotes that account on its next login.
**With `ADMIN_EMAILS` empty, no account can reach these routes.**

Every override writes an audit entry; that is the point of the audit log.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/admin/users` | List users. Query `limit` (1–200, default 50), `offset`. Returns `{ users, total }` |
| `GET` | `/admin/users/:userId` | One user |
| `PATCH` | `/admin/users/:userId/role` | Body `{ "role": "PLAYER" \| "ADMIN" }` |
| `DELETE` | `/admin/parties/:partyId` | Force-delete any team |
| `DELETE` | `/admin/parties/:partyId/members/:userId` | Force-remove any member |
| `PATCH` | `/admin/registration` | Body `{ "registrationOpen": bool, "registrationClosesAt"?: ISO\|null }` |
| `GET` | `/admin/audit` | Audit log. Query `limit`, `offset`, `action`, `actorId` |

**Notable errors**

- `PATCH /admin/users/:userId/role` → `400` demoting yourself. Self-demotion cannot
  be undone by the person who did it, and if they are the only admin it locks
  everyone out.
- `DELETE /admin/parties/:partyId/members/:userId` → `400` target is the leader.
  Removing them would leave `leaderId` pointing at a non-member, and every leader
  check would then fail for everyone.

**Sockets** — force-delete emits `team:deleted` and empties the room;
force-remove emits `team:memberRemoved`; `PATCH /admin/registration` emits
`registration:opened` / `registration:closed` to **every** connected client.

**Tables** — `user_auth`, `parties`, `party_members`, `event_settings`, `audit_logs`.

---

## Socket.IO

**URL** — the API origin. **Auth** — the same `token` cookie; the browser sends it
on the handshake, so there is no second token to issue.

```js
import { io } from 'socket.io-client'
const socket = io(import.meta.env.VITE_API_URL, { withCredentials: true })
```

A handshake without a valid cookie is rejected with `connect_error`.

### Rooms

| Room | Who is in it | Joined how |
|---|---|---|
| `user:<userId>` | every connection of one user (tabs, phone) | on connect |
| `party:<partyId>` | every member of one team | resolved from the **database** on connect, and kept in step as members join and leave |

Room membership is never taken from anything the client says. Letting a client name
its own room would let any authenticated user subscribe to any team's private
events by guessing a six-character code.

### Direction

**Server → client only.** No state-changing client event is accepted. Mutations go
through REST, which owns validation, authorisation and the audit trail; accepting
them over the socket would mean a second, parallel implementation of all three.

### Events

Membership events carry the **full roster** alongside the delta, so a client that
missed one during a reconnect self-heals instead of drifting.

| Event | Scope | Payload |
|---|---|---|
| `team:created` | team room | `{ party, actor }` |
| `team:renamed` | team room | `{ partyId, name, previousName, actor }` |
| `team:updated` | team room | `{ party, actor }` — password or visibility changed |
| `team:deleted` | team room | `{ partyId, actor }` |
| `team:locked` | team room | `{ partyId, actor }` |
| `team:unlocked` | team room | `{ partyId, actor }` |
| `team:leaderChanged` | team room | `{ partyId, leaderId, previousLeaderId, members, actor }` |
| `team:memberJoined` | team room | `{ partyId, member, members, actor }` |
| `team:memberLeft` | team room | `{ partyId, userId, members, actor }` |
| `team:memberRemoved` | team room + removed user | `{ partyId, userId, members, actor }` |
| `team:joinRequestCreated` | team room | `{ partyId, request }` |
| `team:joinRequestResolved` | team room + requester | `{ partyId, requestId, status, actor }` |
| `registration:opened` | all clients | `{ at }` |
| `registration:closed` | all clients | `{ at }` |
| `notification:new` | user room | `{ notification, unreadCount }` |
| `presence:update` | team room | `{ partyId, onlineUserIds }` |

`actor` is `{ userId, username }` — the person who caused it, so a client can ignore
the echo of its own action.

### Scaling

Set `REDIS_URL` and the Redis adapter is used automatically, so a broadcast from one
instance reaches clients connected to the others. **Without it, run only one
instance** — `emitToParty` would otherwise reach only the sockets on that process,
delivering a team's events to some of its members and not others.

---

## Database

| Table | Purpose |
|---|---|
| `user_auth` | Google identity, username, role |
| `player_profiles` | the six registration fields; one row per user |
| `parties` | teams: name, password hash, leader, capacity, visibility, lock |
| `party_members` | membership (composite PK) |
| `party_join_requests` | approval workflow; resolved rows retained |
| `notifications` | durable inbox, `payload` as JSONB |
| `audit_logs` | append-only action trail; `actorId` nulled, not cascaded, on user delete |
| `event_settings` | single row (`CHECK (id)`) holding registration state |
| `schema_migrations` | which migrations have run |

Migrations are forward-only and additive, in `src/database/migrations/`:
`npm run migrate` (dev) · `npm run migrate:prod` (against `dist/`).

---

## Audit actions

`USER_SIGNED_IN` · `USER_ROLE_CHANGED` · `PROFILE_CREATED` · `PROFILE_UPDATED` ·
`PARTY_CREATED` · `PARTY_RENAMED` · `PARTY_DELETED` · `PARTY_PASSWORD_SET` ·
`PARTY_PASSWORD_REMOVED` · `PARTY_VISIBILITY_CHANGED` · `PARTY_LOCKED` ·
`PARTY_UNLOCKED` · `PARTY_LEADER_CHANGED` · `MEMBER_JOINED` · `MEMBER_LEFT` ·
`MEMBER_REMOVED` · `JOIN_REQUEST_CREATED` · `JOIN_REQUEST_ACCEPTED` ·
`JOIN_REQUEST_REJECTED` · `JOIN_REQUEST_CANCELLED` · `REGISTRATION_OPENED` ·
`REGISTRATION_CLOSED`
