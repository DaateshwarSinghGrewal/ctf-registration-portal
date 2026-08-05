# Endpoints not wired to the UI

Backend is built and tested; the frontend does not call these yet.

**24 of 37 endpoints** and **6 of 16 socket events** are unused by the UI.

All require the session cookie unless marked otherwise.

---

## Teams — leader actions (7)

| Method | Path | Purpose | Body |
|---|---|---|---|
| `PATCH` | `/party/:partyId/name` | Rename team | `{ name }` |
| `PATCH` | `/party/:partyId/password` | Set password | `{ password: "str" }` |
| `PATCH` | `/party/:partyId/password` | Remove password | `{ password: null }` |
| `PATCH` | `/party/:partyId/visibility` | Public ↔ private | `{ visibility: "PUBLIC" \| "PRIVATE" }` |
| `PATCH` | `/party/:partyId/lock` | Lock / unlock | `{ isLocked: bool }` |
| `PATCH` | `/party/:partyId/leader` | Transfer leadership | `{ newLeaderId }` |
| `GET` | `/party/:partyId` | Look up any team by code | — |

- All leader-only except `GET /party/:partyId`.
- `visibility` is independent of `password`.
- Locked team = no new members, no new requests.
- New leader must already be a member.

## Join requests — private teams (6)

| Method | Path | Purpose | Who |
|---|---|---|---|
| `POST` | `/party/:partyId/requests` | Request to join | Any user |
| `GET` | `/party/:partyId/requests` | List pending | Leader |
| `GET` | `/party/requests/mine` | My own requests | Any user |
| `POST` | `/join-requests/:requestId/accept` | Accept → adds member | Leader |
| `POST` | `/join-requests/:requestId/reject` | Reject | Leader |
| `DELETE` | `/join-requests/:requestId` | Withdraw own request | Requester |

- Only reachable once a team is `PRIVATE`. Nothing in the UI sets that yet.
- `POST /party/join` returns **403** for a private team.
- Accept is the only path that adds a member to a private team.

## Notifications (3)

| Method | Path | Purpose | Query |
|---|---|---|---|
| `GET` | `/notifications` | Inbox + unread count | `limit` 1–100 (20), `offset`, `unreadOnly` |
| `POST` | `/notifications/:notificationId/read` | Mark one read | — |
| `POST` | `/notifications/read-all` | Mark all read | — |

- 16 notification types already written on every team action.
- Rows are being created now — nothing reads them.

## Admin (7)

| Method | Path | Purpose | Body / Query |
|---|---|---|---|
| `GET` | `/admin/users` | List users | `limit` 1–200 (50), `offset` |
| `GET` | `/admin/users/:userId` | One user | — |
| `PATCH` | `/admin/users/:userId/role` | Change role | `{ role: "PLAYER" \| "ADMIN" }` |
| `DELETE` | `/admin/parties/:partyId` | Force-delete team | — |
| `DELETE` | `/admin/parties/:partyId/members/:userId` | Force-remove member | — |
| `PATCH` | `/admin/registration` | Open / close registration | `{ registrationOpen: bool, registrationClosesAt?: ISO\|null }` |
| `GET` | `/admin/audit` | Audit log | `limit`, `offset`, `action`, `actorId` |

- Requires `role = ADMIN`.
- **`ADMIN_EMAILS` in `express/.env` is empty — no account can reach these.**
- No admin screen exists.

## Public (1)

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `GET` | `/event/status` | Is registration open | **None** |

- Returns `{ registrationOpen, registrationClosesAt, updatedAt }`.
- Landing page could gate "Register Now" on this.

## Legacy (1)

| Method | Path | Note |
|---|---|---|
| `POST` | `/party/kick` | Superseded by `DELETE /party/:partyId/members/:userId`, which the UI uses. Kept for compatibility; safe to drop once nothing external calls it. |

---

## Socket events not consumed (6)

Declared in `client/src/realtime/events.js`, emitted by the server, no listener.

| Event | Payload | Use |
|---|---|---|
| `notification:new` | `{ notification, unreadCount }` | Toast + unread badge |
| `team:joinRequestCreated` | `{ partyId, request }` | Live pending-request list |
| `team:joinRequestResolved` | `{ partyId, requestId, status, actor }` | Tell requester the outcome |
| `registration:opened` | `{ at }` | Re-enable registration UI live |
| `registration:closed` | `{ at }` | Disable it live |
| `team:created` | `{ party, actor }` | Redundant — creator already gets the API response |

---

## Already wired (for reference)

`GET /health` · `GET /auth/google` · `GET /auth/google/callback` · `GET /auth/me` ·
`POST /auth/logout` · `GET /profile` · `PUT /profile` · `GET /party/me` ·
`POST /party/create` · `POST /party/join` · `POST /party/leave/:partyId` ·
`DELETE /party/:partyId` · `DELETE /party/:partyId/members/:userId`

Socket events wired: `team:memberJoined` · `team:memberLeft` · `team:memberRemoved` ·
`team:leaderChanged` · `team:renamed` · `team:updated` · `team:locked` ·
`team:unlocked` · `team:deleted` · `presence:update`

---

## Blockers

1. **No UI control sets `visibility: PRIVATE`** → the whole join-request flow is unreachable in practice.
2. **`ADMIN_EMAILS` is empty** → all 7 admin endpoints return 403 to everyone.

---

## Not built yet

Backlog. Nothing below exists — these are gaps, not unwired endpoints.

### Will bite during the event

| # | Gap | Note |
|---|---|---|
| 1 | `GET /admin/parties` | `DELETE /admin/parties/:partyId` exists, but nothing lists teams — an admin can only delete a team whose code they already know. |
| 2 | Admin read of `player_profiles` | **Defect.** No endpoint exposes the six registration fields to an organiser. They are collectable but not retrievable except by direct SQL. |
| 3 | Registration export (CSV / JSON) | Needed for badges, Discord roles, seating. Currently raw SQL only. |
| 4 | Configurable team size | `MAX_PLAYERS = 4` in `party.service.ts` **and** `CHECK (maxPlayers BETWEEN 1 AND 4)` in migration 002. Changing it needs a code change *and* a migration. |
| 5 | `REGISTRATION_CLOSING_SOON` | **Defect.** Declared in `NotificationType`, never emitted — no scheduler. Either wire one or delete the member. |
| 6 | Registration stats | Live counts (teams, full, solo, by year/branch) for an organiser dashboard. |

### Scale and operations

| # | Gap | Note |
|---|---|---|
| 7 | Provision `REDIS_URL` | Already supported in code. Without it the API is capped at **one instance** — rate limits and socket fan-out are per-process. |
| 8 | Request IDs + structured logs | A user reporting "it failed" is currently unsearchable. |
| 9 | `/ready` separate from `/health` | `/health` returns 200 before the DB is confirmed on a cold start; a load balancer will route traffic too early. |
| 10 | Bulk admin actions | Disqualifying 20 teams is 20 HTTP calls. |

### Security

| # | Gap | Note |
|---|---|---|
| 11 | Logout does not revoke | It clears the cookie; the JWT stays valid for its full 5h. A stolen token survives sign-out. Needs a jti denylist or token version. |
| 12 | No rate limit on `PUT /profile` | Every other write is capped. |
| 13 | Account deletion / data export | The honest answer to "delete my data". |
| 14 | Duplicate-identity detection | Only `rollNumber` is unique — one person can register twice with two Google accounts. |

### Product

| # | Feature |
|---|---|
| 15 | Public team discovery (browse/search open teams instead of needing a code) |
| 16 | Email notification channel — `NotificationChannel` is already the seam |
| 17 | Web push channel — same seam |
| 18 | Tokenised invite links (`/join/<token>`) instead of typing a 6-char code |
| 19 | Admin announcements broadcast to all participants |
| 20 | Event-day team check-in |

### Out of scope

Challenges, flag submission and scoreboard. This backend is the registration
portal only; the CTF itself runs on a separate platform. The `/submit` stub that
returned `{ok:true}` was removed rather than left looking implemented.

---

Full request/response detail: [`express/API_ENDPOINTS.md`](express/API_ENDPOINTS.md).
