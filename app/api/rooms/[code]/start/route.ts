// POST /api/rooms/:code/start — host launches the durable game Workflow.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { start } from 'workflow/api'

import { getRoom, listPlayers } from '@/lib/db/repositories'
import { gameWorkflow } from '@/workflows/game'

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
  if (room.hostId !== parsed.data.playerId) {
    return NextResponse.json({ error: 'Only the host can start the game' }, { status: 403 })
  }
  if (room.status === 'playing') {
    return NextResponse.json({ error: 'Game already in progress' }, { status: 409 })
  }

  const players = await listPlayers(code)
  if (players.length < 1) {
    return NextResponse.json({ error: 'Need at least one player to start' }, { status: 409 })
  }

  // Trigger the durable workflow (returns immediately; the loop drives realtime events).
  await start(gameWorkflow, [code])

  return NextResponse.json({ ok: true })
}
