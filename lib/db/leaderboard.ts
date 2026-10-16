// ─────────────────────────────────────────────────────────────────────────────
// Kauwa Udd — leaderboard reads/writes via GSI1 (top-N by zero-padded score).
// Entry: PK=GSI1PK=`LB#<period>#<scope>`, SK=`USER#<id>`, GSI1SK=`<score20>#<id>`.
// ─────────────────────────────────────────────────────────────────────────────

import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

import { ddb, TABLES } from './client'
import {
  dayStamp,
  keys,
  leaderboardPk,
  leaderboardSk,
  weekStamp,
  type LeaderboardPeriod,
  type LeaderboardScope,
} from './keys'
import type { LeaderEntry } from '../game-data'
import type { RoomPlayer } from '../types'

const TABLE = TABLES.main

export interface LeaderboardRow {
  userId: string
  name: string
  avatar: string
  score: number
}

/**
 * Build the GSI1 partition key for a room-scoped leaderboard, mirroring the
 * GLOBAL key shape but with a `ROOM#<code>` scope segment. Room boards are
 * cumulative across every game played in the room (default period `all`),
 * e.g. `LB#ALL#ROOM#ABCDE`.
 */
export function roomLeaderboardPk(
  code: string,
  period: LeaderboardPeriod = 'all',
  now: Date = new Date(),
): string {
  switch (period) {
    case 'daily':
      return `LB#DAILY#${dayStamp(now)}#ROOM#${code}`
    case 'weekly':
      return `LB#WEEKLY#${weekStamp(now)}#ROOM#${code}`
    case 'all':
      return `LB#ALL#ROOM#${code}`
  }
}

/**
 * Top-N leaderboard rows for a period/scope, highest score first.
 * Queries GSI1 with ScanIndexForward:false so the zero-padded score sorts desc.
 */
export async function topN(
  period: LeaderboardPeriod,
  scope: LeaderboardScope,
  n: number,
  now: Date = new Date(),
): Promise<LeaderboardRow[]> {
  return topNByPk(leaderboardPk(period, scope, now), n)
}

/** Top-N rows for an already-built GSI1 partition key (global or room scoped). */
async function topNByPk(pk: string, n: number): Promise<LeaderboardRow[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': pk },
      ScanIndexForward: false,
      Limit: n,
    }),
  )
  return (res.Items ?? []).map((row) => ({
    userId: row.userId as string,
    name: row.name as string,
    avatar: row.avatar as string,
    score: (row.score as number) ?? 0,
  }))
}

/**
 * Accumulate each player's game score into a period/scope bucket. Scores ADD up
 * across games in the bucket; the GSI sort key is rewritten to the new total so
 * top-N stays correct. (Two writes per player: atomic ADD, then GSI key refresh.)
 */
export async function recordScores(
  players: Pick<RoomPlayer, 'id' | 'name' | 'avatar' | 'score'>[],
  period: LeaderboardPeriod,
  scope: LeaderboardScope,
  now: Date = new Date(),
): Promise<void> {
  return recordScoresToPk(players, leaderboardPk(period, scope, now), period, scope)
}

/** Accumulate scores into an already-built GSI1 partition key (global or room scoped). */
async function recordScoresToPk(
  players: Pick<RoomPlayer, 'id' | 'name' | 'avatar' | 'score'>[],
  pk: string,
  period: LeaderboardPeriod,
  scope: string,
): Promise<void> {
  await Promise.all(
    players
      .filter((p) => p.score > 0)
      .map(async (p) => {
        const res = await ddb.send(
          new UpdateCommand({
            TableName: TABLE,
            Key: keys.leaderboardEntry(pk, p.id),
            UpdateExpression:
              'ADD #sc :pts SET #n = :n, #a = :a, #uid = :uid, #p = :p, #scope = :scope, #gpk = :gpk',
            ExpressionAttributeNames: {
              '#sc': 'score',
              '#n': 'name',
              '#a': 'avatar',
              '#uid': 'userId',
              '#p': 'period',
              '#scope': 'scope',
              '#gpk': 'GSI1PK',
            },
            ExpressionAttributeValues: {
              ':pts': p.score,
              ':n': p.name,
              ':a': p.avatar,
              ':uid': p.id,
              ':p': period,
              ':scope': scope,
              ':gpk': pk,
            },
            ReturnValues: 'ALL_NEW',
          }),
        )
        const total = (res.Attributes?.score as number) ?? p.score
        await ddb.send(
          new UpdateCommand({
            TableName: TABLE,
            Key: keys.leaderboardEntry(pk, p.id),
            UpdateExpression: 'SET #gsk = :gsk',
            ExpressionAttributeNames: { '#gsk': 'GSI1SK' },
            ExpressionAttributeValues: { ':gsk': leaderboardSk(total, p.id) },
          }),
        )
      }),
  )
}

// ── LeaderEntry helpers (shape used by the leaderboard UI / API) ────────────────

function toLeaderEntries(rows: LeaderboardRow[], youId?: string): LeaderEntry[] {
  return rows.map((r, i) => ({
    rank: i + 1,
    name: r.name,
    avatar: r.avatar,
    score: r.score,
    streak: 0, // streaks not tracked in the DB model yet
    ...(youId && r.userId === youId ? { isYou: true } : {}),
  }))
}

export async function getDailyLeaders(n = 20, youId?: string): Promise<LeaderEntry[]> {
  return toLeaderEntries(await topN('daily', 'global', n), youId)
}

export async function getWeeklyLeaders(n = 20, youId?: string): Promise<LeaderEntry[]> {
  return toLeaderEntries(await topN('weekly', 'global', n), youId)
}

// ── Room-scoped leaderboard (cumulative across games in a single room) ──────────

/** Accumulate each player's game score into the room's cumulative leaderboard. */
export async function recordRoomScores(
  code: string,
  players: Pick<RoomPlayer, 'id' | 'name' | 'avatar' | 'score'>[],
  period: LeaderboardPeriod = 'all',
  now: Date = new Date(),
): Promise<void> {
  return recordScoresToPk(players, roomLeaderboardPk(code, period, now), period, 'room')
}

/** Top-N rows for a room's cumulative leaderboard, highest score first. */
export async function topNRoom(
  code: string,
  n: number,
  period: LeaderboardPeriod = 'all',
  now: Date = new Date(),
): Promise<LeaderboardRow[]> {
  return topNByPk(roomLeaderboardPk(code, period, now), n)
}

/** Room leaderboard in the LeaderEntry shape used by the UI / API. */
export async function getRoomLeaders(code: string, n = 20, youId?: string): Promise<LeaderEntry[]> {
  return toLeaderEntries(await topNRoom(code, n), youId)
}
