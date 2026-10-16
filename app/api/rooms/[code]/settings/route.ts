// PATCH /api/rooms/:code/settings — host updates lobby settings, broadcast update.
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getRoom, listPlayers, updateRoomSettings } from '@/lib/db/repositories'
import { EVENTS } from '@/lib/realtime/events'
import { publish } from '@/lib/realtime/server'
import type { GameSettings } from '@/lib/types'

const settingsSchema = z
  .object({
    rounds: z.number().int().min(5).max(100),
    mode: z.enum(['classic', 'elimination']),
    eliminationInterval: z.union([z.literal(3), z.literal(5), z.literal(10)]),
    announce: z.enum(['voice', 'visual']),
  })
  .partial()

const bodySchema = z.object({
  playerId: z.string().min(1).max(64),
  settings: settingsSchema,
})

export async function PATCH(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params

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

  const room = await getRoom(code)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.hostId !== parsed.data.playerId) {
    return NextResponse.json({ error: 'Only the host can change settings' }, { status: 403 })
  }
  if (room.status !== 'lobby') {
    return NextResponse.json({ error: 'Settings are locked once the game starts' }, { status: 409 })
  }

  const merged: GameSettings = { ...room.settings, ...parsed.data.settings }
  await updateRoomSettings(code, merged)

  const players = await listPlayers(code)
  await publish(code, EVENTS.ROOM_UPDATE, {
    status: room.status,
    settings: merged,
    players,
    hostId: room.hostId,
  })

  return NextResponse.json({ ok: true })
}
