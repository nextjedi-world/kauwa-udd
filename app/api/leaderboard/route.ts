// GET /api/leaderboard?period=daily|weekly&scope=global[&playerId=...]
//   …or room scope: ?scope=room&code=XYZ[&playerId=...] (cumulative per-room board)
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getDailyLeaders, getRoomLeaders, getWeeklyLeaders } from '@/lib/db/leaderboard'

const querySchema = z
  .object({
    period: z.enum(['daily', 'weekly', 'all']).default('daily'),
    scope: z.enum(['global', 'room']).default('global'),
    code: z.string().min(1).max(16).optional(),
    playerId: z.string().min(1).max(64).optional(),
    n: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((q) => q.scope !== 'room' || !!q.code, {
    message: 'code is required when scope=room',
    path: ['code'],
  })

export async function GET(req: Request) {
  const url = new URL(req.url)
  const parsed = querySchema.safeParse({
    period: url.searchParams.get('period') ?? undefined,
    scope: url.searchParams.get('scope') ?? undefined,
    code: url.searchParams.get('code') ?? undefined,
    playerId: url.searchParams.get('playerId') ?? undefined,
    n: url.searchParams.get('n') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', issues: parsed.error.issues }, { status: 400 })
  }

  const { period, scope, code, playerId, n } = parsed.data
  let entries
  if (scope === 'room') {
    entries = await getRoomLeaders(code!, n, playerId)
  } else if (period === 'weekly') {
    entries = await getWeeklyLeaders(n, playerId)
  } else {
    entries = await getDailyLeaders(n, playerId)
  }

  const you = playerId ? entries.find((e) => e.isYou) : undefined

  return NextResponse.json({ entries, ...(you ? { you } : {}) })
}
