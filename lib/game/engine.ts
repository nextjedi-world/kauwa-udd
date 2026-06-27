// ─────────────────────────────────────────────────────────────────────────────
// Kauwa Udd — pure game-engine helpers (no I/O, fully deterministic given inputs).
// Object selection / elimination math / standings construction. Scoring itself
// lives in lib/types.ts (scoreRound) — this layer arranges the inputs/outputs.
// ─────────────────────────────────────────────────────────────────────────────

import { GAME_OBJECTS, type GameObject } from '../game-data'
import type { EliminationInterval, RoomPlayer, Standing } from '../types'

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(input: readonly T[]): T[] {
  const arr = [...input]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Pick the object for every round of a game. Shuffles the catalogue and cycles
 * through it (re-shuffling each lap) so a game can have more rounds than objects
 * without long repeats. Returns exactly `rounds` objects.
 */
export function pickRoundObjects(
  rounds: number,
  catalogue: readonly GameObject[] = GAME_OBJECTS,
): GameObject[] {
  const out: GameObject[] = []
  if (catalogue.length === 0) return out
  let bag = shuffle(catalogue)
  for (let i = 0; i < rounds; i++) {
    if (bag.length === 0) bag = shuffle(catalogue)
    out.push(bag.pop() as GameObject)
  }
  return out
}

/**
 * Decide who gets eliminated at the boundary of `round`. In elimination mode the
 * single lowest-scoring active player is dropped every `interval` rounds (never
 * the last remaining player). Returns the playerIds to eliminate (possibly []).
 */
export function computeEliminations(
  players: readonly RoomPlayer[],
  round: number,
  interval: EliminationInterval,
): string[] {
  if (round <= 0 || interval <= 0 || round % interval !== 0) return []
  const active = players.filter((p) => !p.eliminated)
  if (active.length <= 1) return []
  // Lowest score loses; ties broken by latest joiner (higher joinedAt) to keep it stable.
  const sorted = [...active].sort((a, b) => a.score - b.score || b.joinedAt - a.joinedAt)
  return [sorted[0].id]
}

/** Build standings (desc by score, eliminated players sink below active ones). */
export function buildStandings(players: readonly RoomPlayer[]): Standing[] {
  return [...players]
    .sort((a, b) => {
      if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1
      return b.score - a.score
    })
    .map((p) => ({
      playerId: p.id,
      name: p.name,
      avatar: p.avatar,
      score: p.score,
      eliminated: p.eliminated,
    }))
}

/** Winner = highest-scoring non-eliminated player; falls back to top score overall. */
export function pickWinner(players: readonly RoomPlayer[]): string | null {
  const standings = buildStandings(players)
  return standings[0]?.playerId ?? null
}
