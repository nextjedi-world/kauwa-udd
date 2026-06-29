// ─────────────────────────────────────────────────────────────────────────────
// Kauwa Udd — DynamoDB access layer (single-table). All reads/writes to the main
// table go through these functions. Uses the shared `ddb` DocumentClient.
// Key shapes live in ./keys; domain types in ../types.
// ─────────────────────────────────────────────────────────────────────────────

import {
  BatchWriteCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb'
import { nanoid } from 'nanoid'

import { ddb, TABLES } from './client'
import { keys, roomPk } from './keys'
import {
  DEFAULT_SETTINGS,
  type ClickRecord,
  type GameSettings,
  type PlayerRoundResult,
  type Room,
  type RoomPlayer,
  type RoomStatus,
  type RoomVisibility,
  type RoundState,
} from '../types'
import { GAME_OBJECTS, type GameObject } from '../game-data'

const TABLE = TABLES.main

// Ephemeral cleanup horizons (epoch seconds).
const ROOM_TTL_SECONDS = 60 * 60 * 6 // 6h
const CLICK_TTL_SECONDS = 60 * 60 // 1h
const READY_TTL_SECONDS = 60 * 60 // 1h
const ttlIn = (seconds: number) => Math.floor(Date.now() / 1000) + seconds

// Sort-key prefix for hold-to-ready markers (ROOM#<code> / READY#<playerId>).
const readySkPrefix = 'READY#'
const readyKey = (code: string, playerId: string) => ({
  PK: roomPk(code),
  SK: `${readySkPrefix}${playerId}`,
})

// ── Row <-> domain mappers ──────────────────────────────────────────────────────
type Row = Record<string, unknown>

function rowToRoom(row: Row): Room {
  return {
    code: row.code as string,
    hostId: row.hostId as string,
    status: row.status as RoomStatus,
    visibility: row.visibility as RoomVisibility,
    settings: (row.settings as GameSettings) ?? DEFAULT_SETTINGS,
    createdAt: row.createdAt as number,
  }
}

function rowToPlayer(row: Row): RoomPlayer {
  return {
    id: row.id as string,
    name: row.name as string,
    avatar: row.avatar as string,
    isHost: Boolean(row.isHost),
    online: Boolean(row.online),
    language: (row.language as string) ?? 'en',
    score: (row.score as number) ?? 0,
    eliminated: Boolean(row.eliminated),
    joinedAt: (row.joinedAt as number) ?? 0,
  }
}

// ── Rooms ───────────────────────────────────────────────────────────────────────

export interface CreateRoomInput {
  code: string
  hostId: string
  hostName: string
  hostAvatar: string
  visibility: RoomVisibility
  settings?: Partial<GameSettings>
  language?: string
}

export async function createRoom(
  input: CreateRoomInput,
): Promise<{ room: Room; player: RoomPlayer }> {
  const now = Date.now()
  const settings: GameSettings = { ...DEFAULT_SETTINGS, ...input.settings }
  const room: Room = {
    code: input.code,
    hostId: input.hostId,
    status: 'lobby',
    visibility: input.visibility,
    settings,
    createdAt: now,
  }
  const host: RoomPlayer = {
    id: input.hostId,
    name: input.hostName,
    avatar: input.hostAvatar,
    isHost: true,
    online: true,
    language: input.language ?? 'en',
    score: 0,
    eliminated: false,
    joinedAt: now,
  }

  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: { ...keys.room(input.code), ...room, ttl: ttlIn(ROOM_TTL_SECONDS) },
      ConditionExpression: 'attribute_not_exists(PK)',
    }),
  )
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: { ...keys.player(input.code, host.id), ...host },
    }),
  )
  return { room, player: host }
}

export async function getRoom(code: string): Promise<Room | null> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: keys.room(code) }))
  return res.Item ? rowToRoom(res.Item) : null
}

export async function updateRoomSettings(code: string, settings: GameSettings): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: keys.room(code),
      UpdateExpression: 'SET #s = :s',
      ConditionExpression: 'attribute_exists(PK)',
      ExpressionAttributeNames: { '#s': 'settings' },
      ExpressionAttributeValues: { ':s': settings },
    }),
  )
}

export async function updateRoomStatus(code: string, status: RoomStatus): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: keys.room(code),
      UpdateExpression: 'SET #st = :st',
      ConditionExpression: 'attribute_exists(PK)',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':st': status },
    }),
  )
}

// ── Players ───────────────────────────────────────────────────────────────────────

export async function listPlayers(code: string): Promise<RoomPlayer[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': roomPk(code), ':sk': keys.playerSkPrefix },
    }),
  )
  return (res.Items ?? []).map(rowToPlayer).sort((a, b) => a.joinedAt - b.joinedAt)
}

export interface JoinRoomInput {
  id: string
  name: string
  avatar: string
  language: string
}

/** Idempotent join: creates the player if new, otherwise marks them online. */
export async function joinRoom(
  code: string,
  player: JoinRoomInput,
): Promise<{ room: Room; players: RoomPlayer[] }> {
  const room = await getRoom(code)
  if (!room) throw new RoomNotFoundError(code)

  const existing = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: keys.player(code, player.id) }),
  )

  if (existing.Item) {
    await setPlayerOnline(code, player.id, true)
  } else {
    const row: RoomPlayer = {
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      isHost: room.hostId === player.id,
      online: true,
      language: player.language || 'en',
      score: 0,
      eliminated: false,
      joinedAt: Date.now(),
    }
    await ddb.send(
      new PutCommand({
        TableName: TABLE,
        Item: { ...keys.player(code, player.id), ...row },
      }),
    )
  }

  const players = await listPlayers(code)
  return { room, players }
}

export async function setPlayerOnline(
  code: string,
  playerId: string,
  online: boolean,
): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: keys.player(code, playerId),
      UpdateExpression: 'SET #o = :o',
      ExpressionAttributeNames: { '#o': 'online' },
      ExpressionAttributeValues: { ':o': online },
    }),
  )
}

// ── Round state + clicks ───────────────────────────────────────────────────────

export async function setRoundState(code: string, state: RoundState): Promise<void> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        ...keys.round(code, state.round),
        objectId: state.objectId,
        round: state.round,
        startedAt: state.startedAt,
        endsAt: state.endsAt,
        ttl: ttlIn(ROOM_TTL_SECONDS),
      },
    }),
  )
}

export interface RecordClickInput {
  round: number
  playerId: string
  released: boolean
  clientTs: number
}

/** Buffer a player's reaction for the round. serverTs is the authoritative arrival time. */
export async function recordClick(code: string, click: RecordClickInput): Promise<ClickRecord> {
  const record: ClickRecord = {
    round: click.round,
    playerId: click.playerId,
    released: click.released,
    clientTs: click.clientTs,
    serverTs: Date.now(),
  }
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        ...keys.click(code, click.round, click.playerId),
        ...record,
        ttl: ttlIn(CLICK_TTL_SECONDS),
      },
      // First reaction wins — ignore late re-presses for the same round.
      ConditionExpression: 'attribute_not_exists(SK)',
    }),
  )
  return record
}

export async function getRoundClicks(code: string, round: number): Promise<ClickRecord[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': roomPk(code), ':sk': keys.clickSkPrefix(round) },
    }),
  )
  return (res.Items ?? []).map((row) => ({
    round: row.round as number,
    playerId: row.playerId as string,
    released: Boolean(row.released),
    clientTs: (row.clientTs as number) ?? 0,
    serverTs: (row.serverTs as number) ?? 0,
  }))
}

// ── Ready gate (hold-to-ready synchronized start) ───────────────────────────────

/** Mark a player as ready for the synchronized start (idempotent). */
export async function recordReady(code: string, playerId: string): Promise<void> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        ...readyKey(code, playerId),
        playerId,
        readyAt: Date.now(),
        ttl: ttlIn(READY_TTL_SECONDS),
      },
    }),
  )
}

/** Player ids who have held-to-ready for the current game. */
export async function getReadyPlayers(code: string): Promise<string[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': roomPk(code), ':sk': readySkPrefix },
    }),
  )
  return (res.Items ?? []).map((row) => row.playerId as string)
}

/** Remove all ready markers for a room. */
export async function clearReady(code: string): Promise<void> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ProjectionExpression: 'PK, SK',
      ExpressionAttributeValues: { ':pk': roomPk(code), ':sk': readySkPrefix },
    }),
  )
  await batchDelete((res.Items ?? []) as { PK: string; SK: string }[])
}

// ── Room lifecycle (leave / reset) ──────────────────────────────────────────────

/** A player leaves the room — delete their PLAYER# item, return remaining players. */
export async function leaveRoom(code: string, playerId: string): Promise<RoomPlayer[]> {
  await ddb.send(
    new DeleteCommand({ TableName: TABLE, Key: keys.player(code, playerId) }),
  )
  return listPlayers(code)
}

/**
 * Reset a room back to the lobby for a new game in the same room:
 * status -> 'lobby', every player score=0 & eliminated=false, and all ephemeral
 * round/click/ready items deleted. Returns the room + fresh player list.
 */
export async function resetRoom(code: string): Promise<{ room: Room | null; players: RoomPlayer[] }> {
  // Pull the whole room partition once so we can split players (update) from
  // ephemeral round/click/ready items (delete).
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ProjectionExpression: 'PK, SK',
      ExpressionAttributeValues: { ':pk': roomPk(code) },
    }),
  )
  const items = (res.Items ?? []) as { PK: string; SK: string }[]

  const playerIds = items
    .filter((i) => i.SK.startsWith(keys.playerSkPrefix))
    .map((i) => i.SK.slice(keys.playerSkPrefix.length))
  const toDelete = items.filter(
    (i) => i.SK.startsWith('ROUND#') || i.SK.startsWith('CLICK#') || i.SK.startsWith(readySkPrefix),
  )

  await Promise.all([
    updateRoomStatus(code, 'lobby'),
    batchDelete(toDelete),
    ...playerIds.map((id) =>
      ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: keys.player(code, id),
          UpdateExpression: 'SET #sc = :z, #e = :f',
          ExpressionAttributeNames: { '#sc': 'score', '#e': 'eliminated' },
          ExpressionAttributeValues: { ':z': 0, ':f': false },
        }),
      ),
    ),
  ])

  const room = await getRoom(code)
  const players = await listPlayers(code)
  return { room, players }
}

/** Delete a batch of items by PK/SK (chunked to BatchWrite's 25-item limit). */
async function batchDelete(keysToDelete: { PK: string; SK: string }[]): Promise<void> {
  for (let i = 0; i < keysToDelete.length; i += 25) {
    const chunk = keysToDelete.slice(i, i + 25)
    if (!chunk.length) continue
    await ddb.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE]: chunk.map((k) => ({
            DeleteRequest: { Key: { PK: k.PK, SK: k.SK } },
          })),
        },
      }),
    )
  }
}

// ── Scoring + elimination writes ───────────────────────────────────────────────

/** Add each round's points to the player's running score, then return all players. */
export async function applyRoundResults(
  code: string,
  results: PlayerRoundResult[],
): Promise<RoomPlayer[]> {
  await Promise.all(
    results.map((r) =>
      ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: keys.player(code, r.playerId),
          UpdateExpression: 'ADD #sc :pts',
          ExpressionAttributeNames: { '#sc': 'score' },
          ExpressionAttributeValues: { ':pts': r.points },
        }),
      ),
    ),
  )
  return listPlayers(code)
}

export async function eliminatePlayers(code: string, playerIds: string[]): Promise<void> {
  await Promise.all(
    playerIds.map((id) =>
      ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: keys.player(code, id),
          UpdateExpression: 'SET #e = :e',
          ExpressionAttributeNames: { '#e': 'eliminated' },
          ExpressionAttributeValues: { ':e': true },
        }),
      ),
    ),
  )
}

// ── Game history ───────────────────────────────────────────────────────────────

export interface SaveGameHistoryInput {
  roomCode: string
  settings: GameSettings
  players: RoomPlayer[]
  winnerId: string | null
}

export async function saveGameHistory(input: SaveGameHistoryInput): Promise<string> {
  const id = nanoid(12)
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        ...keys.game(id),
        id,
        roomCode: input.roomCode,
        settings: input.settings,
        players: input.players,
        winnerId: input.winnerId,
        finishedAt: Date.now(),
      },
    }),
  )
  return id
}

// ── User stats ───────────────────────────────────────────────────────────────────

export interface UserStats {
  gamesPlayed: number
  wins: number
  xp: number
  bestScore: number
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: keys.userStats(userId) }))
  const row = res.Item
  return {
    gamesPlayed: (row?.gamesPlayed as number) ?? 0,
    wins: (row?.wins as number) ?? 0,
    xp: (row?.xp as number) ?? 0,
    bestScore: (row?.bestScore as number) ?? 0,
  }
}

export interface UserStatsDelta {
  gamesPlayed?: number
  wins?: number
  xp?: number
  /** If provided, bestScore is raised to max(existing, score). */
  score?: number
}

export async function updateUserStats(userId: string, delta: UserStatsDelta): Promise<void> {
  const adds: string[] = []
  const names: Record<string, string> = {}
  const values: Record<string, number> = {}

  if (delta.gamesPlayed) {
    adds.push('#g :g')
    names['#g'] = 'gamesPlayed'
    values[':g'] = delta.gamesPlayed
  }
  if (delta.wins) {
    adds.push('#w :w')
    names['#w'] = 'wins'
    values[':w'] = delta.wins
  }
  if (delta.xp) {
    adds.push('#x :x')
    names['#x'] = 'xp'
    values[':x'] = delta.xp
  }

  // ADD is atomic for counters; bestScore handled with a conditional max below.
  if (adds.length) {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: keys.userStats(userId),
        UpdateExpression: `ADD ${adds.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }),
    )
  }

  if (typeof delta.score === 'number') {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: keys.userStats(userId),
        UpdateExpression: 'SET #b = :s',
        ConditionExpression: 'attribute_not_exists(#b) OR #b < :s',
        ExpressionAttributeNames: { '#b': 'bestScore' },
        ExpressionAttributeValues: { ':s': delta.score },
      }),
    ).catch((e: unknown) => {
      // Conditional check failed just means the existing best is higher — ignore.
      if ((e as { name?: string }).name !== 'ConditionalCheckFailedException') throw e
    })
  }
}

// ── Content catalogue (used by seed + workflow object loading) ──────────────────

/**
 * Load the content catalogue from DynamoDB (Scan filtered to OBJ# items). Falls
 * back to the in-code GAME_OBJECTS if the table hasn't been seeded yet.
 */
export async function getAllObjects(): Promise<GameObject[]> {
  const out: GameObject[] = []
  let lastKey: Record<string, unknown> | undefined
  do {
    const res = await ddb.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: 'begins_with(PK, :p) AND SK = :m',
        ExpressionAttributeValues: { ':p': keys.objectPkPrefix, ':m': 'META' },
        ExclusiveStartKey: lastKey,
      }),
    )
    for (const row of res.Items ?? []) {
      out.push({
        id: row.id as string,
        emoji: row.emoji as string,
        flies: Boolean(row.flies),
        words: (row.words as Record<string, string>) ?? {},
      })
    }
    lastKey = res.LastEvaluatedKey
  } while (lastKey)

  return out.length ? out : [...GAME_OBJECTS]
}

/** Bulk-write the content catalogue (OBJ# items). Used by the seed script. */
export async function putObjects(objects: GameObject[]): Promise<void> {
  // BatchWrite handles 25 items per request.
  for (let i = 0; i < objects.length; i += 25) {
    const chunk = objects.slice(i, i + 25)
    await ddb.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE]: chunk.map((o) => ({
            PutRequest: {
              Item: {
                ...keys.object(o.id),
                id: o.id,
                emoji: o.emoji,
                flies: o.flies,
                words: o.words,
              },
            },
          })),
        },
      }),
    )
  }
}

// ── Errors ───────────────────────────────────────────────────────────────────────

export class RoomNotFoundError extends Error {
  constructor(code: string) {
    super(`Room ${code} not found`)
    this.name = 'RoomNotFoundError'
  }
}
