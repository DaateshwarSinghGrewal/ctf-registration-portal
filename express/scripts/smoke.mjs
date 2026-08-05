/**
 * End-to-end smoke test against a running API.
 *
 * Drives the real HTTP surface and a real Socket.IO client, because the things
 * most likely to be wrong here are the seams: cookie auth on the websocket
 * handshake, room membership derived from the database, and whether a REST
 * mutation actually reaches the other members' sockets. None of that is
 * observable from a unit test of a service.
 *
 * Usage:  node scripts/smoke.mjs
 * Requires the API running on $BASE (default http://localhost:3000) and a
 * reachable database. Creates and then deletes its own users and teams.
 */

import { randomUUID } from "node:crypto";
import * as dns from "node:dns";
import * as net from "node:net";
import jwt from "jsonwebtoken";
import { io as ioClient } from "socket.io-client";
import "dotenv/config";
import { Pool } from "pg";

// Same reason as src/database/pool.ts: Neon resolves to several addresses, and a
// network that drops IPv6 turns this into an ENETUNREACH/ETIMEDOUT
// AggregateError. This is a separate process, so it needs the setting too.
dns.setDefaultResultOrder("ipv4first");
net.setDefaultAutoSelectFamily?.(false);

const BASE = process.env.BASE ?? "http://localhost:3000";
const SECRET = process.env.JWT_SECRET;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

let pass = 0;
let fail = 0;
const failures = [];

function check(label, condition, detail = "") {
  if (condition) {
    pass += 1;
    console.log(`  PASS  ${label}`);
  } else {
    fail += 1;
    failures.push(label);
    console.log(`  FAIL  ${label} ${detail}`);
  }
}

function section(title) {
  console.log(`\n── ${title}`);
}

/** Creates a throwaway user directly in the database and signs a cookie for it. */
async function makeUser(tag) {
  const suffix = randomUUID().slice(0, 8);
  const email = `smoke_${tag}_${suffix}@example.test`;
  const result = await pool.query(
    `INSERT INTO user_auth (googleId, email, username, role, lastLogin)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING userId AS id, username, email, role`,
    [`smoke-${suffix}`, email, `smoke_${tag}_${suffix}`, tag === "admin" ? "ADMIN" : "PLAYER"]
  );
  const user = result.rows[0];
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    SECRET,
    { algorithm: "HS256", expiresIn: "1h" }
  );
  return { ...user, cookie: `token=${token}` };
}

async function api(user, method, path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(user ? { cookie: user.cookie } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  return { status: response.status, body: payload };
}

const PROFILE = {
  fullName: "Smoke Tester",
  phone: "+91 98765 43210",
  discordUsername: "smoketester",
  year: 2,
  branch: "COPC",
  rollNumber: "",
};

/** Connects a socket and records every event it receives. */
function connectSocket(user) {
  const socket = ioClient(BASE, {
    transports: ["websocket"],
    extraHeaders: { cookie: user.cookie },
  });
  const events = [];
  socket.onAny((name, payload) => events.push({ name, payload }));
  return new Promise((resolve, reject) => {
    socket.on("connect", () => resolve({ socket, events }));
    socket.on("connect_error", reject);
    setTimeout(() => reject(new Error("socket connect timeout")), 8000);
  });
}

const waitFor = (events, name, ms = 3000) =>
  new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const found = events.find((event) => event.name === name);
      if (found) return resolve(found);
      if (Date.now() - started > ms) return resolve(null);
      setTimeout(tick, 50);
    };
    tick();
  });

async function main() {
  if (!SECRET) throw new Error("JWT_SECRET must be set");

  const leader = await makeUser("leader");
  const member = await makeUser("member");
  const outsider = await makeUser("outsider");
  const admin = await makeUser("admin");
  const createdUserIds = [leader.id, member.id, outsider.id, admin.id];
  let partyId = null;

  try {
    section("Auth");
    check("GET /auth/me returns the signed-in user", true);
    const me = await api(leader, "GET", "/auth/me");
    check("/auth/me → 200", me.status === 200, `got ${me.status}`);
    check("/auth/me exposes user at top level (SPA contract)", me.body?.user?.userId === leader.id);
    check("/auth/me also nests under data (envelope)", me.body?.data?.user?.userId === leader.id);
    check("/auth/me reports hasProfile=false initially", me.body?.user?.hasProfile === false);

    section("Profile gating");
    const blocked = await api(leader, "POST", "/party/create", { name: `Smoke ${randomUUID().slice(0, 6)}` });
    check("create team without a profile → 403", blocked.status === 403, `got ${blocked.status}`);

    const badProfile = await api(leader, "PUT", "/profile", { ...PROFILE, year: 9, phone: "1" });
    check("invalid profile → 400", badProfile.status === 400, `got ${badProfile.status}`);
    check("validation lists offending fields", Array.isArray(badProfile.body?.error?.details));

    for (const user of [leader, member, outsider]) {
      const saved = await api(user, "PUT", "/profile", {
        ...PROFILE,
        rollNumber: `SMOKE${randomUUID().slice(0, 8).toUpperCase()}`,
      });
      check(`profile saved for ${user.username.slice(0, 18)}`, saved.status === 200, `got ${saved.status}`);
    }

    section("Team creation + realtime");
    const leaderSocket = await connectSocket(leader);
    check("socket authenticates with the session cookie", leaderSocket.socket.connected);

    const teamName = `Smoke ${randomUUID().slice(0, 6)}`;
    const createRes = await api(leader, "POST", "/party/create", {
      name: teamName,
      visibility: "PRIVATE",
    });
    check("POST /party/create → 201", createRes.status === 201, `got ${createRes.status}`);
    partyId = createRes.body?.data?.id;
    check("invite code is 6 hex chars", /^[0-9A-F]{6}$/.test(partyId ?? ""), partyId);
    check("visibility persisted", createRes.body?.data?.visibility === "PRIVATE");
    check("leader counted as a member", createRes.body?.data?.memberCount === 1);

    const notif = await waitFor(leaderSocket.events, "notification:new");
    check("notification:new delivered over socket", notif !== null);

    const mine = await api(leader, "GET", "/party/me");
    check("GET /party/me finds the team", mine.body?.data?.id === partyId);

    section("Private team requires approval");
    const directJoin = await api(outsider, "POST", "/party/join", { inviteCode: partyId });
    check("direct join of a PRIVATE team → 403", directJoin.status === 403, `got ${directJoin.status}`);

    const request = await api(member, "POST", `/party/${partyId}/requests`, {});
    check("join request created → 201", request.status === 201, `got ${request.status}`);
    const requestId = request.body?.data?.id;

    const dupe = await api(member, "POST", `/party/${partyId}/requests`, {});
    check("duplicate pending request → 409", dupe.status === 409, `got ${dupe.status}`);

    const requestEvent = await waitFor(leaderSocket.events, "team:joinRequestCreated");
    check("team:joinRequestCreated reached the leader", requestEvent !== null);

    const notLeader = await api(outsider, "POST", `/join-requests/${requestId}/accept`);
    check("non-leader cannot accept → 403", notLeader.status === 403, `got ${notLeader.status}`);

    const pending = await api(leader, "GET", `/party/${partyId}/requests`);
    check("leader sees 1 pending request", pending.body?.data?.length === 1);

    const outsiderPending = await api(outsider, "GET", `/party/${partyId}/requests`);
    check("non-leader cannot list requests → 403", outsiderPending.status === 403);

    section("Accept → membership + broadcast");
    const memberSocket = await connectSocket(member);
    const accepted = await api(leader, "POST", `/join-requests/${requestId}/accept`);
    check("accept → 200", accepted.status === 200, `got ${accepted.status}`);

    const joinedEvent = await waitFor(leaderSocket.events, "team:memberJoined");
    check("team:memberJoined broadcast to the team room", joinedEvent !== null);
    check("event carries the full roster", joinedEvent?.payload?.members?.length === 2);

    const resolvedForMember = await waitFor(memberSocket.events, "team:joinRequestResolved");
    check("requester notified of resolution", resolvedForMember !== null);

    const reAccept = await api(leader, "POST", `/join-requests/${requestId}/accept`);
    check("re-accepting a resolved request → 409", reAccept.status === 409, `got ${reAccept.status}`);

    section("Leader actions");
    const rename = await api(leader, "PATCH", `/party/${partyId}/name`, { name: `${teamName} R` });
    check("rename → 200", rename.status === 200, `got ${rename.status}`);
    check("team:renamed emitted", (await waitFor(leaderSocket.events, "team:renamed")) !== null);

    const memberRename = await api(member, "PATCH", `/party/${partyId}/name`, { name: "Hijack" });
    check("non-leader rename → 403", memberRename.status === 403, `got ${memberRename.status}`);

    const setPw = await api(leader, "PATCH", `/party/${partyId}/password`, { password: "hunter2" });
    check("set password → 200", setPw.status === 200);
    check("hasPassword reported true", setPw.body?.data?.hasPassword === true);

    const clearPw = await api(leader, "PATCH", `/party/${partyId}/password`, { password: null });
    check("remove password → 200", clearPw.status === 200);
    check("hasPassword reported false", clearPw.body?.data?.hasPassword === false);

    const lock = await api(leader, "PATCH", `/party/${partyId}/lock`, { isLocked: true });
    check("lock → 200", lock.status === 200);
    check("team:locked emitted", (await waitFor(leaderSocket.events, "team:locked")) !== null);

    await api(leader, "PATCH", `/party/${partyId}/visibility`, { visibility: "PUBLIC" });
    const lockedJoin = await api(outsider, "POST", "/party/join", { inviteCode: partyId });
    check("join a locked team → 409", lockedJoin.status === 409, `got ${lockedJoin.status}`);

    await api(leader, "PATCH", `/party/${partyId}/lock`, { isLocked: false });
    const publicJoin = await api(outsider, "POST", "/party/join", { inviteCode: partyId });
    check("join an unlocked PUBLIC team → 200", publicJoin.status === 200, `got ${publicJoin.status}`);

    const secondTeam = await api(outsider, "POST", "/party/create", { name: `Other ${randomUUID().slice(0, 6)}` });
    check("creating a team while in one → 409", secondTeam.status === 409, `got ${secondTeam.status}`);

    section("Leadership transfer");
    const badTransfer = await api(leader, "PATCH", `/party/${partyId}/leader`, { newLeaderId: admin.id });
    check("transfer to a non-member → 400", badTransfer.status === 400, `got ${badTransfer.status}`);

    const transfer = await api(leader, "PATCH", `/party/${partyId}/leader`, { newLeaderId: member.id });
    check("transfer to a member → 200", transfer.status === 200, `got ${transfer.status}`);
    const leaderEvent = await waitFor(leaderSocket.events, "team:leaderChanged");
    check("team:leaderChanged emitted", leaderEvent !== null);
    check("new leader flagged in roster", transfer.body?.data?.members?.find((m) => m.userId === member.id)?.isLeader === true);

    const oldLeaderAction = await api(leader, "PATCH", `/party/${partyId}/name`, { name: "Nope" });
    check("former leader loses leader rights → 403", oldLeaderAction.status === 403, `got ${oldLeaderAction.status}`);

    section("Notifications inbox");
    const inbox = await api(member, "GET", "/notifications?limit=10");
    check("inbox → 200", inbox.status === 200);
    check("notifications persisted, not just emitted", (inbox.body?.data?.notifications?.length ?? 0) > 0);
    check("unread count present", typeof inbox.body?.data?.unreadCount === "number");

    const firstId = inbox.body?.data?.notifications?.[0]?.id;
    const markRead = await api(member, "POST", `/notifications/${firstId}/read`);
    check("mark read → 200", markRead.status === 200);
    const crossUser = await api(outsider, "POST", `/notifications/${firstId}/read`);
    check("cannot read another user's notification → 404", crossUser.status === 404, `got ${crossUser.status}`);

    section("Admin + audit");
    const adminUsers = await api(admin, "GET", "/admin/users?limit=5");
    check("admin can list users", adminUsers.status === 200, `got ${adminUsers.status}`);
    const playerAdmin = await api(member, "GET", "/admin/users");
    check("player denied /admin → 403", playerAdmin.status === 403, `got ${playerAdmin.status}`);

    const audit = await api(admin, "GET", "/admin/audit?limit=20");
    check("audit log readable", audit.status === 200);
    const actions = (audit.body?.data ?? []).map((row) => row.action);
    check("PARTY_CREATED audited", actions.includes("PARTY_CREATED"));
    check("PARTY_LEADER_CHANGED audited", actions.includes("PARTY_LEADER_CHANGED"));
    check("JOIN_REQUEST_ACCEPTED audited", actions.includes("JOIN_REQUEST_ACCEPTED"));

    const selfDemote = await api(admin, "PATCH", `/admin/users/${admin.id}/role`, { role: "PLAYER" });
    check("admin cannot demote self → 400", selfDemote.status === 400, `got ${selfDemote.status}`);

    section("Registration gate");
    const closed = await api(admin, "PATCH", "/admin/registration", { registrationOpen: false });
    check("admin closes registration", closed.status === 200, `got ${closed.status}`);
    const closedEvent = await waitFor(leaderSocket.events, "registration:closed");
    check("registration:closed broadcast to all", closedEvent !== null);

    const blockedCreate = await api(admin, "POST", "/party/create", { name: "TooLate" });
    check("create while closed → 403", blockedCreate.status === 403, `got ${blockedCreate.status}`);

    await api(admin, "PATCH", "/admin/registration", { registrationOpen: true });
    check("registration:opened broadcast", (await waitFor(leaderSocket.events, "registration:opened")) !== null);

    section("Validation");
    const badCode = await api(outsider, "GET", "/party/zz");
    check("malformed invite code → 400", badCode.status === 400, `got ${badCode.status}`);
    const lowercase = await api(member, "GET", `/party/${partyId.toLowerCase()}`);
    check("lowercase invite code accepted", lowercase.status === 200, `got ${lowercase.status}`);
    const shortName = await api(admin, "POST", "/party/create", { name: "ab" });
    check("2-char team name → 400", shortName.status === 400, `got ${shortName.status}`);

    section("Teardown");
    const disband = await api(member, "DELETE", `/party/${partyId}`);
    check("leader disbands team → 200", disband.status === 200, `got ${disband.status}`);
    check("team:deleted emitted", (await waitFor(leaderSocket.events, "team:deleted")) !== null);
    const gone = await api(member, "GET", `/party/${partyId}`);
    check("team is gone → 404", gone.status === 404, `got ${gone.status}`);

    leaderSocket.socket.close();
    memberSocket.socket.close();
  } finally {
    // Cascades clean up profiles, memberships, requests, notifications.
    await pool.query(`DELETE FROM user_auth WHERE userId = ANY($1::uuid[])`, [createdUserIds]);
    await pool.end();
  }

  console.log(`\n${"═".repeat(52)}`);
  console.log(`  ${pass} passed, ${fail} failed`);
  if (failures.length > 0) console.log(`  failed: ${failures.join(" | ")}`);
  console.log("═".repeat(52));
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("Smoke run crashed:", error);
  process.exit(1);
});
