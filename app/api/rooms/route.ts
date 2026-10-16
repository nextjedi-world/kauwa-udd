// POST /api/rooms — create a room (host becomes first player).
import { log } from '@/lib/log'
import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { z } from 'zod'

import { createRoom } from '@/lib/db/repositories'
import { generateRoomCode } from '@/lib/game-data'
import { DEFAULT_SETTINGS } from '@/lib/types'

const settingsSchema = z
  .object({
    rounds: z.number().int().min(5).max(100),
    mode: z.enum(['classic', 'elimination']),
    eliminationInterval: z.union([z.literal(3), z.literal(5), z.literal(10)]),
    announce: z.enum(['voice', 'visual']),
  })
  .partial()

const bodySchema = z.object({
  hostName: z.string().min(1).max(40),
  hostAvatar: z.string().min(1).max(16),
  visibility: z.enum(['private', 'public']),
  settings: settingsSchema.optional(),
  playerId: z.string().min(1).max(64).optional(),
  language: z.string().min(2).max(8).optional(),
})

export async function POST(req: Request) {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const { hostName, hostAvatar, visibility, settings, language } = parsed.data
  const hostId = parsed.data.playerId ?? `guest_${nanoid(10)}`

  // Generate a unique room code (retry on the rare collision).
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateRoomCode()
    try {
      const { room } = await createRoom({
        code,
        hostId,
        hostName,
        hostAvatar,
        visibility,
        settings: { ...DEFAULT_SETTINGS, ...settings },
        language,
      })
      return NextResponse.json({ code, playerId: hostId, room }, { status: 201 })
    } catch (e) {
      if ((e as { name?: string }).name === 'ConditionalCheckFailedException') continue
      log.error('rooms.create.failed', { error: e })
      return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Could not allocate room code' }, { status: 503 })
}
