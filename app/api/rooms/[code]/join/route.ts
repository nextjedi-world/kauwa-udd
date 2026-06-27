// POST /api/rooms/:code/join — add (or re-activate) a player, broadcast lobby update.
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { joinRoom, RoomNotFoundError } from '@/lib/db/repositories'
import { EVENTS } from '@/lib/realtime/events'
import { publish } from '@/lib/realtime/server'

const bodySchema = z.object({
  playerId: z.string().min(1).max(64),
  name: z.string().min(1).max(40),
  avatar: z.string().min(1).max(16),
  language: z.string().min(2).max(8),
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

  try {
    const { room, players } = await joinRoom(code, {
      id: parsed.data.playerId,
      name: parsed.data.name,
      avatar: parsed.data.avatar,
      language: parsed.data.language,
    })

    await publish(code, EVENTS.ROOM_UPDATE, {
      status: room.status,
      settings: room.settings,
      players,
      hostId: room.hostId,
    })

    return NextResponse.json({ room, players })
  } catch (e) {
    if (e instanceof RoomNotFoundError) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    console.error('[rooms:join]', e)
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 })
  }
}
