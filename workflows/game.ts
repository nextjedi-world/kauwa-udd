// ─────────────────────────────────────────────────────────────────────────────
// Kauwa Udd — durable game loop (Vercel Workflow). One run per room.
// The "use workflow" function only orchestrates; all I/O (DynamoDB + Ably publish)
// happens inside "use step" functions which have full Node.js access and are
// retried/persisted by the runtime.
// ─────────────────────────────────────────────────────────────────────────────

import { sleep } from 'workflow'

import { EVENTS } from '@/lib/realtime/events'
import { publish } from '@/lib/realtime/server'
import {
  buildStandings,
  computeEliminations,
  pickRoundObjects,
  pickWinner,
} from '@/lib/game/engine'
import { recordScores } from '@/lib/db/leaderboard'
import {
  applyRoundResults,
  eliminatePlayers,
  getAllObjects,
  getRoom,
  getRoundClicks,
  listPlayers,
  saveGameHistory,
  setRoundState,
  updateRoomStatus,
  updateUserStats,
} from '@/lib/db/repositories'
import { ROUND_MS, scoreRound, type GameMode, type EliminationInterval } from '@/lib/types'

// Live reaction window (matches ROUND_MS = 3000) and the post-result pause,
// expressed as Workflow sleep-duration labels.
const ROUND_WINDOW = '3s'
const RESULT_PAUSE = '3s'

interface PickedObject {
  id: string
  flies: boolean
}

interface LoadedGame {
  totalRounds: number
  mode: GameMode
  eliminationInterval: EliminationInterval
  announce: 'voice' | 'visual'
  objects: PickedObject[]
}

// ── Steps (full Node.js access, retried + persisted) ─────────────────────────────

async function loadGame(code: string): Promise<LoadedGame> {
  'use step'
  const room = await getRoom(code)
  if (!room) throw new Error(`Room ${code} not found`)

  await updateRoomStatus(code, 'playing')

  const catalogue = await getAllObjects()
  const picked = pickRoundObjects(room.settings.rounds, catalogue).map((o) => ({
    id: o.id,
    flies: o.flies,
  }))

  await publish(code, EVENTS.GAME_START, {
    totalRounds: room.settings.rounds,
    mode: room.settings.mode,
  })

  return {
    totalRounds: room.settings.rounds,
    mode: room.settings.mode,
    eliminationInterval: room.settings.eliminationInterval,
    announce: room.settings.announce,
    objects: picked,
  }
}

async function startRound(
  code: string,
  round: number,
  objectId: string,
  totalRounds: number,
  announce: 'voice' | 'visual',
): Promise<void> {
  'use step'
  const startedAt = Date.now()
  const endsAt = startedAt + ROUND_MS
  await setRoundState(code, { round, objectId, startedAt, endsAt })
  await publish(code, EVENTS.ROUND_START, {
    round,
    totalRounds,
    objectId,
    announce,
    endsAt,
    serverNow: Date.now(),
  })
}

/** Score the round, persist scores/eliminations, broadcast result. Returns active player count. */
async function scoreAndAdvance(
  code: string,
  round: number,
  objectId: string,
  flies: boolean,
  mode: GameMode,
  interval: EliminationInterval,
): Promise<{ activeCount: number }> {
  'use step'
  const clicks = await getRoundClicks(code, round)
  const players = await listPlayers(code)
  const results = scoreRound(flies, clicks, players)
  let updated = await applyRoundResults(code, results)

  let eliminatedPlayerIds: string[] = []
  if (mode === 'elimination') {
    eliminatedPlayerIds = computeEliminations(updated, round, interval)
    if (eliminatedPlayerIds.length) {
      await eliminatePlayers(code, eliminatedPlayerIds)
      updated = await listPlayers(code)
    }
  }

  await publish(code, EVENTS.ROUND_RESULT, {
    round,
    objectId,
    flies,
    results,
    standings: buildStandings(updated),
    eliminatedPlayerIds,
  })

  return { activeCount: updated.filter((p) => !p.eliminated).length }
}

async function finishGame(code: string): Promise<void> {
  'use step'
  const players = await listPlayers(code)
  const standings = buildStandings(players)
  const winnerId = pickWinner(players)

  await publish(code, EVENTS.GAME_OVER, { standings, winnerId })

  // Leaderboard: accumulate into daily / weekly / all-time global buckets.
  const lbPlayers = players.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    score: p.score,
  }))
  await recordScores(lbPlayers, 'daily', 'global')
  await recordScores(lbPlayers, 'weekly', 'global')
  await recordScores(lbPlayers, 'all', 'global')

  // Per-user aggregate stats (xp = points earned this game, +1 game, +win).
  await Promise.all(
    players.map((p) =>
      updateUserStats(p.id, {
        gamesPlayed: 1,
        wins: p.id === winnerId ? 1 : 0,
        xp: Math.max(0, p.score),
        score: p.score,
      }),
    ),
  )

  await saveGameHistory({
    roomCode: code,
    settings: (await getRoom(code))?.settings ?? {
      rounds: players.length,
      mode: 'classic',
      eliminationInterval: 5,
      announce: 'voice',
    },
    players,
    winnerId,
  })

  await updateRoomStatus(code, 'finished')
}

// ── Orchestrator ────────────────────────────────────────────────────────────────

export async function gameWorkflow(code: string): Promise<{ code: string; rounds: number }> {
  'use workflow'

  const game = await loadGame(code)

  for (let round = 1; round <= game.totalRounds; round++) {
    const obj = game.objects[round - 1]

    await startRound(code, round, obj.id, game.totalRounds, game.announce)
    await sleep(ROUND_WINDOW)

    const { activeCount } = await scoreAndAdvance(
      code,
      round,
      obj.id,
      obj.flies,
      game.mode,
      game.eliminationInterval,
    )

    // Elimination ended early — one player left standing.
    if (game.mode === 'elimination' && activeCount <= 1) break

    if (round < game.totalRounds) await sleep(RESULT_PAUSE)
  }

  await finishGame(code)
  return { code, rounds: game.totalRounds }
}
