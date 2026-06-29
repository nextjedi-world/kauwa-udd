// POST /api/rooms/:code/restart — reset the room to the lobby for a new game.
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { EVENTS } from '@/lib/realtime/events'
import { publish } from '@/lib/realtime/server'
import { getRoom, listPlayers, resetRoom } from '@/lib/db/repositories'

const bodySchema = z.object({
  playerId: z.string().min(1).max(64),
})

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 })
  }

  const room = await getRoom(code)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  // Any current member can start a new game (not just the host); block outsiders.
  const members = await listPlayers(code)
  if (!members.some((p) => p.id === parsed.data.playerId)) {
    return NextResponse.json({ error: 'Only players in the room can restart' }, { status: 403 })
  }

  // Clears scores/eliminations + ROUND#/CLICK#/READY# items, status -> lobby.
  const { room: reset, players } = await resetRoom(code)

  await publish(code, EVENTS.ROOM_UPDATE, {
    status: 'lobby',
    settings: reset?.settings ?? room.settings,
    players,
    hostId: reset?.hostId ?? room.hostId,
  })

  return NextResponse.json({ ok: true, players })
}
