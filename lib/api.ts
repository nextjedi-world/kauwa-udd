// ─────────────────────────────────────────────────────────────────────────────
// Frontend HTTP client for the Kauwa Udd REST API (see docs/API.md).
// Thin typed wrappers around fetch — realtime state arrives over Ably separately.
// ─────────────────────────────────────────────────────────────────────────────
import type { GameSettings, Room, RoomPlayer } from './types'
import type { LeaderEntry } from './game-data'

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = (await res.json()) as { error?: string; message?: string }
      message = body.error ?? body.message ?? message
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}

export interface RoomBundle {
  room: Room
  players: RoomPlayer[]
}

export interface CreateRoomInput {
  hostName: string
  hostAvatar: string
  visibility?: Room['visibility']
  settings?: GameSettings
  /** Sent so the server can adopt the client's stable guest id as the host id. */
  playerId?: string
}

export interface CreateRoomResponse {
  code: string
  playerId: string
  room: Room
}

export function createRoom(input: CreateRoomInput) {
  return jsonFetch<CreateRoomResponse>('/api/rooms', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function getRoom(code: string) {
  return jsonFetch<RoomBundle>(`/api/rooms/${code}`)
}

export interface JoinRoomInput {
  playerId: string
  name: string
  avatar: string
  language: string
}

export function joinRoom(code: string, input: JoinRoomInput) {
  return jsonFetch<RoomBundle>(`/api/rooms/${code}/join`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function patchSettings(code: string, playerId: string, settings: GameSettings) {
  return jsonFetch<{ ok: true }>(`/api/rooms/${code}/settings`, {
    method: 'PATCH',
    body: JSON.stringify({ playerId, settings }),
  })
}

export function startGame(code: string, playerId: string) {
  return jsonFetch<{ ok: true }>(`/api/rooms/${code}/start`, {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  })
}

export interface ClickInput {
  playerId: string
  round: number
  released: boolean
  clientTs: number
}

export function postClick(code: string, input: ClickInput) {
  return jsonFetch<{ ok: true }>(`/api/rooms/${code}/click`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** Hold-to-ready: mark this player ready during the pre-round gate. */
export function postReady(code: string, playerId: string) {
  return jsonFetch<{ ok: true }>(`/api/rooms/${code}/ready`, {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  })
}

/** Leave the room (lobby presence). */
export function leaveRoom(code: string, playerId: string) {
  return jsonFetch<{ ok: true }>(`/api/rooms/${code}/leave`, {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  })
}

/** Restart a finished room back to the lobby for a fresh match (host action). */
export function restartRoom(code: string, playerId: string) {
  return jsonFetch<{ ok: true }>(`/api/rooms/${code}/restart`, {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  })
}

export interface LeaderboardResponse {
  entries: LeaderEntry[]
  you?: LeaderEntry
}

export type LeaderboardPeriod = 'daily' | 'weekly' | 'all'

/**
 * Fetch a leaderboard. Defaults to the global board; pass scope:'room' + code for
 * a room-scoped cumulative board (used by the room results "Share" link).
 */
export function getLeaderboard(
  period: LeaderboardPeriod,
  opts?: { scope?: 'global' | 'room'; code?: string },
) {
  const params = new URLSearchParams({ period, scope: opts?.scope ?? 'global' })
  if (opts?.code) params.set('code', opts.code)
  return jsonFetch<LeaderboardResponse>(`/api/leaderboard?${params.toString()}`)
}
