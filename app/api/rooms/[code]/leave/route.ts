// POST /api/rooms/:code/leave — a player leaves the room; broadcast the new roster.
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { EVENTS } from '@/lib/realtime/events'
import { publish } from '@/lib/realtime/server'
import { getRoom, leaveRoom } from '@/lib/db/repositories'

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
    return NextResponse.json(
      { error: 'Invalid body', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const room = await getRoom(code)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const players = await leaveRoom(code, parsed.data.playerId)

  await publish(code, EVENTS.ROOM_UPDATE, {
    status: room.status,
    settings: room.settings,
    players,
    hostId: room.hostId,
  })

  return NextResponse.json({ ok: true, players })
}
