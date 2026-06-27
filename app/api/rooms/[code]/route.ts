// GET /api/rooms/:code — room + player list.
import { NextResponse } from 'next/server'

import { getRoom, listPlayers } from '@/lib/db/repositories'

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const room = await getRoom(code)
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }
  const players = await listPlayers(code)
  return NextResponse.json({ room, players })
}
