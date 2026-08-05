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

Full request/response detail: [`express/API_ENDPOINTS.md`](express/API_ENDPOINTS.md).
