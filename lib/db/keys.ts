// ─────────────────────────────────────────────────────────────────────────────
// Kauwa Udd — single-table key builders (see docs/SCHEMA.md).
// Every access to the `kauwa-udd` main table goes through these so the key
// shapes stay consistent in one place.
// ─────────────────────────────────────────────────────────────────────────────

export type LeaderboardPeriod = 'daily' | 'weekly' | 'all'
export type LeaderboardScope = 'global'

// ── Primary key (PK/SK) builders ───────────────────────────────────────────────
export const keys = {
  // Content catalogue object.
  object: (id: string) => ({ PK: `OBJ#${id}`, SK: 'META' }),
  objectPkPrefix: 'OBJ#',

  // Room (game session) meta item.
  room: (code: string) => ({ PK: `ROOM#${code}`, SK: 'META' }),

  // Player belonging to a room.
  player: (code: string, playerId: string) => ({
    PK: `ROOM#${code}`,
    SK: `PLAYER#${playerId}`,
  }),
  playerSkPrefix: 'PLAYER#',

  // Live round state for a room.
  round: (code: string, n: number) => ({ PK: `ROOM#${code}`, SK: `ROUND#${n}` }),

  // Buffered click for (room, round, player).
  click: (code: string, n: number, playerId: string) => ({
    PK: `ROOM#${code}`,
    SK: `CLICK#${n}#${playerId}`,
  }),
  clickSkPrefix: (n: number) => `CLICK#${n}#`,

  // Persisted game history.
  game: (id: string) => ({ PK: `GAME#${id}`, SK: 'META' }),

  // Per-user aggregate stats.
  userStats: (userId: string) => ({ PK: `USER#${userId}`, SK: 'STATS' }),

  // Leaderboard entry for a player within a period/scope bucket.
  leaderboardEntry: (periodKey: string, userId: string) => ({
    PK: periodKey,
    SK: `USER#${userId}`,
  }),
} as const

// ── Partition value for a room (handy for begins_with queries) ──────────────────
export const roomPk = (code: string) => `ROOM#${code}`

// ── Leaderboard period/scope key helpers ────────────────────────────────────────

/** YYYY-MM-DD (UTC) for daily buckets. */
export function dayStamp(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10)
}

/** ISO-8601 week: YYYY-Www (UTC) for weekly buckets. */
export function weekStamp(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  // Thursday in current week decides the year.
  const dayNum = (date.getUTCDay() + 6) % 7 // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3)
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000))
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** Build the LB partition key, e.g. `LB#DAILY#2026-06-27#GLOBAL`. */
export function leaderboardPk(
  period: LeaderboardPeriod,
  scope: LeaderboardScope = 'global',
  now: Date = new Date(),
): string {
  const scopeKey = scope.toUpperCase()
  switch (period) {
    case 'daily':
      return `LB#DAILY#${dayStamp(now)}#${scopeKey}`
    case 'weekly':
      return `LB#WEEKLY#${weekStamp(now)}#${scopeKey}`
    case 'all':
      return `LB#ALL#${scopeKey}`
  }
}

/** Zero-pad a score to 20 digits so string sort == numeric order (desc via ScanIndexForward:false). */
export function score20(score: number): string {
  return String(Math.max(0, Math.floor(score))).padStart(20, '0')
}

/** GSI1 sort key for a leaderboard entry: `<score20>#<userId>`. */
export function leaderboardSk(score: number, userId: string): string {
  return `${score20(score)}#${userId}`
}
