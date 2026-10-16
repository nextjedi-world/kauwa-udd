// POST /api/rooms/:code/click — buffer a player's reaction for the current round.
import { log } from '@/lib/log'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { recordClick } from '@/lib/db/repositories'

const bodySchema = z.object({
  playerId: z.string().min(1).max(64),
  round: z.number().int().min(1).max(100),
  released: z.boolean(),
  clientTs: z.number().finite(),
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

  try {
    await recordClick(code, {
      playerId: parsed.data.playerId,
      round: parsed.data.round,
      released: parsed.data.released,
      clientTs: parsed.data.clientTs,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    // First reaction per round wins; a duplicate press is a no-op success.
    if ((e as { name?: string }).name === 'ConditionalCheckFailedException') {
      return NextResponse.json({ ok: true, duplicate: true })
    }
    log.error('rooms.click.failed', { error: e })
    return NextResponse.json({ error: 'Failed to record click' }, { status: 500 })
  }
}
