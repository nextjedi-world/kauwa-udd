// ─────────────────────────────────────────────────────────────────────────────
// Kauwa Udd — shared domain types & constants (THE CONTRACT all agents build on)
// Keep this file the single source of truth. Content/mock data lives in game-data.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type { GameObject, Language } from './game-data'
export type { GameObject, Language }

// ── Game settings (host-configurable, set in lobby, persisted on room) ──────────
export type GameMode = 'classic' | 'elimination'
export type EliminationInterval = 3 | 5 | 10
export type AnnounceMode = 'voice' | 'visual'

export interface GameSettings {
  rounds: number // 5..100, step 5
  mode: GameMode
  eliminationInterval: EliminationInterval // only used when mode === 'elimination'
  announce: AnnounceMode // PER-ROOM (everyone gets same stimulus, fair ranking)
}

export const DEFAULT_SETTINGS: GameSettings = {
  rounds: 20,
  mode: 'classic',
  eliminationInterval: 5,
  announce: 'voice',
}

// ── Room & players ──────────────────────────────────────────────────────────
export type RoomStatus = 'lobby' | 'playing' | 'finished'
export type RoomVisibility = 'private' | 'public'

export interface Room {
  code: string // 5-char join code (see generateRoomCode in game-data)
  hostId: string // playerId of host
  status: RoomStatus
  visibility: RoomVisibility
  settings: GameSettings
  createdAt: number // epoch ms
}

export interface RoomPlayer {
  id: string // player/session id (guest or auth user id)
  name: string
  avatar: string // emoji
  isHost: boolean
  online: boolean
  language: string // per-PLAYER display/audio language code (lib/game-data LANGUAGES)
  score: number
  eliminated: boolean
  joinedAt: number
}

// ── Live round flow ───────────────────────────────────────────────────────────
export interface RoundState {
  round: number // 1-based
  objectId: string // -> GAME_OBJECTS / content table
  startedAt: number // epoch ms (server)
  endsAt: number // startedAt + ROUND_MS
}

/** Client -> server: a player's reaction for a round. released=true means "it flies". */
export interface ClickRecord {
  round: number
  playerId: string
  released: boolean
  clientTs: number // client performance/epoch ts (advisory)
  serverTs: number // authoritative arrival ts (set server-side)
}

export interface PlayerRoundResult {
  playerId: string
  released: boolean
  correct: boolean
  points: number // can be negative (penalty)
  rank: number | null // 1|2|3 for fastest correct releases on a flier round, else null
  reactionMs: number | null // for fliers: ms from round start to release
}

export interface Standing {
  playerId: string
  name: string
  avatar: string
  score: number
  eliminated: boolean
}

// ── Scoring spec (FINAL — see hackathon-h0-our-project memory) ──────────────────
// Flier round (correct = release within window):
//   1st/2nd/3rd fastest correct release -> tiered bonus; other correct -> flat; fail -> penalty
// Non-flier round (correct = keep holding):
//   hold -> flat; release -> penalty
export const ROUND_MS = 3000
export const SCORING = {
  ROUND_MS,
  FLY_RANK_BONUS: [300, 200, 100] as const, // 1st, 2nd, 3rd fastest correct release
  FLY_FLAT: 100, // correct release outside top-3
  HOLD_FLAT: 100, // correct hold on a non-flier
  PENALTY: -50, // any wrong action
} as const

export function scoreRound(
  flies: boolean,
  clicks: ClickRecord[],
  players: RoomPlayer[],
): PlayerRoundResult[] {
  // Correct releases on a flier, ordered by serverTs (fastest first) -> ranks 1..3.
  const releasers = clicks.filter((c) => c.released).sort((a, b) => a.serverTs - b.serverTs)
  const rankOf = new Map<string, number>()
  if (flies) releasers.forEach((c, i) => rankOf.set(c.playerId, i + 1))

  const clickByPlayer = new Map(clicks.map((c) => [c.playerId, c]))

  return players
    .filter((p) => !p.eliminated)
    .map((p) => {
      const click = clickByPlayer.get(p.id)
      const released = click?.released ?? false // no click = held through
      const correct = flies ? released : !released
      let points: number
      let rank: number | null = null
      let reactionMs: number | null = null

      if (flies) {
        if (released) {
          reactionMs = click
            ? Math.max(0, click.serverTs - (click.serverTs - click.clientTs))
            : null
          const r = rankOf.get(p.id) ?? 99
          rank = r <= 3 ? r : null
          points = r <= 3 ? SCORING.FLY_RANK_BONUS[r - 1] : SCORING.FLY_FLAT
        } else {
          points = SCORING.PENALTY // too slow / held a flier
        }
      } else {
        points = released ? SCORING.PENALTY : SCORING.HOLD_FLAT
      }

      return { playerId: p.id, released, correct, points, rank, reactionMs }
    })
}
