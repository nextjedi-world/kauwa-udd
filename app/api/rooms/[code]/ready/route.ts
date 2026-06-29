// POST /api/rooms/:code/ready — mark a player ready for the synchronized start.
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { recordReady } from '@/lib/db/repositories'

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

  try {
    // The running Workflow's ready gate polls these markers and broadcasts
    // READY_UPDATE; the gate clears early once every active player is ready.
    await recordReady(code, parsed.data.playerId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[rooms:ready]', e)
    return NextResponse.json({ error: 'Failed to record ready' }, { status: 500 })
  }
}
