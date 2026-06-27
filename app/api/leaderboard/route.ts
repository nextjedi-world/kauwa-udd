// GET /api/leaderboard?period=daily|weekly&scope=global[&playerId=...]
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getDailyLeaders, getWeeklyLeaders } from '@/lib/db/leaderboard'

const querySchema = z.object({
  period: z.enum(['daily', 'weekly']).default('daily'),
  scope: z.enum(['global']).default('global'),
  playerId: z.string().min(1).max(64).optional(),
  n: z.coerce.number().int().min(1).max(100).default(20),
})

export async function GET(req: Request) {
  const url = new URL(req.url)
  const parsed = querySchema.safeParse({
    period: url.searchParams.get('period') ?? undefined,
    scope: url.searchParams.get('scope') ?? undefined,
    playerId: url.searchParams.get('playerId') ?? undefined,
    n: url.searchParams.get('n') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', issues: parsed.error.issues }, { status: 400 })
  }

  const { period, playerId, n } = parsed.data
  const entries =
    period === 'weekly'
      ? await getWeeklyLeaders(n, playerId)
      : await getDailyLeaders(n, playerId)

  const you = playerId ? entries.find((e) => e.isYou) : undefined

  return NextResponse.json({ entries, ...(you ? { you } : {}) })
}
