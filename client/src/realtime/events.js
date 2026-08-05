/**
 * Server → client socket event names.
 *
 * Mirrors express/src/realtime/socket.events.ts. Declared as constants rather
 * than typed inline at each listener so a rename on the server surfaces as one
 * failing import instead of a listener that silently never fires.
 */
export const SOCKET_EVENTS = {
  TEAM_CREATED: 'team:created',
  TEAM_RENAMED: 'team:renamed',
  TEAM_UPDATED: 'team:updated',
  TEAM_DELETED: 'team:deleted',
  TEAM_LOCKED: 'team:locked',
  TEAM_UNLOCKED: 'team:unlocked',
  TEAM_LEADER_CHANGED: 'team:leaderChanged',
  TEAM_MEMBER_JOINED: 'team:memberJoined',
  TEAM_MEMBER_LEFT: 'team:memberLeft',
  TEAM_MEMBER_REMOVED: 'team:memberRemoved',
  TEAM_JOIN_REQUEST_CREATED: 'team:joinRequestCreated',
  TEAM_JOIN_REQUEST_RESOLVED: 'team:joinRequestResolved',
  REGISTRATION_OPENED: 'registration:opened',
  REGISTRATION_CLOSED: 'registration:closed',
  NOTIFICATION_NEW: 'notification:new',
  PRESENCE_UPDATE: 'presence:update'
}
