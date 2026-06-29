// ─────────────────────────────────────────────────────────────────────────────
// Kauwa Udd — Ably realtime contract (channel names + event names + payloads)
// THE CONTRACT for Agent B (realtime) + Agent C (game engine) + Agent E (frontend).
// Transport: Ably. One channel per room. Presence used for join/leave/online.
// Clicks do NOT go over Ably — they POST to /api/rooms/[code]/click (DynamoDB buffer
// that the Workflow reads at the round boundary). Keeps scoring server-authoritative.
// ─────────────────────────────────────────────────────────────────────────────

import type { GameSettings, PlayerRoundResult, RoomPlayer, Standing } from '../types'

/** Ably channel for a room. Presence on this channel = lobby/online membership. */
export const roomChannel = (code: string) => `room:${code}`

export const EVENTS = {
  ROOM_UPDATE: 'room:update', // lobby state / settings / player list changed
  GAME_START: 'game:start', // host started the game
  READY_UPDATE: 'ready:update', // hold-to-ready gate progress before round 1
  ROUND_START: 'round:start', // a new round is live (react now)
  ROUND_RESULT: 'round:result', // round scored
  GAME_OVER: 'game:over', // final standings
} as const

export type EventName = (typeof EVENTS)[keyof typeof EVENTS]

// ── Payloads ────────────────────────────────────────────────────────────────
export interface RoomUpdatePayload {
  status: 'lobby' | 'playing' | 'finished'
  settings: GameSettings
  players: RoomPlayer[]
  hostId: string
}

export interface GameStartPayload {
  totalRounds: number
  mode: GameSettings['mode']
}

export interface ReadyUpdatePayload {
  readyIds: string[] // playerIds who have held-to-ready so far
  total: number // non-eliminated players expected to ready up
  endsAt: number // epoch ms — when the ready window closes (authoritative)
  started: boolean // true on the final event: gate cleared, round 1 begins now
}

export interface RoundStartPayload {
  round: number
  totalRounds: number
  objectId: string // client resolves emoji/word/flies from loaded content
  announce: GameSettings['announce'] // voice | visual (client controls reveal timing)
  endsAt: number // epoch ms — when the 3s window closes (authoritative)
  serverNow: number // epoch ms at send — client computes clock offset
}

export interface RoundResultPayload {
  round: number
  objectId: string
  flies: boolean
  results: PlayerRoundResult[]
  standings: Standing[] // sorted desc by score
  eliminatedPlayerIds: string[] // newly eliminated this round (elimination mode)
}

export interface GameOverPayload {
  standings: Standing[] // final, sorted desc
  winnerId: string | null
}

// Helper map type for type-safe publish/subscribe
export interface EventPayloads {
  [EVENTS.ROOM_UPDATE]: RoomUpdatePayload
  [EVENTS.GAME_START]: GameStartPayload
  [EVENTS.READY_UPDATE]: ReadyUpdatePayload
  [EVENTS.ROUND_START]: RoundStartPayload
  [EVENTS.ROUND_RESULT]: RoundResultPayload
  [EVENTS.GAME_OVER]: GameOverPayload
}
