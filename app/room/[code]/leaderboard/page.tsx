'use client'
// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC, read-only room leaderboard. No auth, no join — anyone with the link
// can see a room's cumulative standings. Visual style mirrors
// components/screens/leaderboard-screen.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Flame, Medal, Loader2, AlertTriangle, Share2, Check } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { SkyBackdrop } from '@/components/brand/sky-backdrop'
import { type LeaderEntry } from '@/lib/game-data'
import { buildLeaderboardUrl, shareOrCopy } from '@/lib/invite'
import { cn } from '@/lib/utils'

const MEDAL_COLORS = ['text-accent', 'text-muted-foreground', 'text-[oklch(0.62_0.12_45)]']

interface RoomLeaderboardResponse {
  entries: LeaderEntry[]
  you?: LeaderEntry
}

async function fetchRoomLeaderboard(code: string): Promise<RoomLeaderboardResponse> {
  const res = await fetch(`/api/leaderboard?period=all&scope=room&code=${encodeURIComponent(code)}`)
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return (await res.json()) as RoomLeaderboardResponse
}

function Row({ e, i }: { e: LeaderEntry; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className={cn(
        'flex items-center gap-3 rounded-2xl border p-3 shadow-sm',
        e.isYou ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card',
      )}
    >
      <div className="grid w-8 shrink-0 place-items-center">
        {e.rank <= 3 ? (
          <Medal className={cn('size-6', MEDAL_COLORS[e.rank - 1])} />
        ) : (
          <span className="font-mono text-sm font-bold text-muted-foreground">{e.rank}</span>
        )}
      </div>
      <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-2xl">
        {e.avatar}
      </span>
      <div className="flex-1">
        <p className="font-bold leading-tight">
          {e.name} {e.isYou && <span className="text-xs font-semibold text-primary">(you)</span>}
        </p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Flame className="size-3.5 text-accent" /> {e.streak} streak
        </p>
      </div>
      <span className="font-mono font-bold tabular-nums">{e.score.toLocaleString()}</span>
    </motion.div>
  )
}

export default function RoomLeaderboardPage() {
  const params = useParams<{ code: string }>()
  const code = (params?.code ?? '').toUpperCase()

  const [data, setData] = useState<LeaderEntry[]>([])
  const [you, setYou] = useState<LeaderEntry | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shareState, setShareState] = useState<'idle' | 'shared' | 'copied'>('idle')

  useEffect(() => {
    if (!code) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchRoomLeaderboard(code)
      .then((res) => {
        if (cancelled) return
        setData(res.entries ?? [])
        setYou(res.you ?? res.entries?.find((e) => e.isYou))
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Could not load leaderboard')
        setData([])
        setYou(undefined)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [code])

  async function onShare() {
    const result = await shareOrCopy({
      title: `Kauwa Udd — Room ${code}`,
      text: `🏆 Room ${code} standings on Kauwa Udd`,
      url: buildLeaderboardUrl(code),
    })
    if (result === 'shared' || result === 'copied') {
      setShareState(result)
      setTimeout(() => setShareState('idle'), 2000)
    }
  }

  return (
    <>
      <SkyBackdrop />
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-28 pt-6">
        <header className="flex items-center justify-between">
          <Logo size="sm" />
          <button
            onClick={onShare}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-border bg-card px-3 py-2 text-sm font-bold text-foreground shadow-sm"
            aria-label="Share this leaderboard"
          >
            {shareState === 'idle' ? (
              <>
                <Share2 className="size-4" /> Share
              </>
            ) : (
              <>
                <Check className="size-4 text-primary" />{' '}
                {shareState === 'copied' ? 'Copied' : 'Shared'}
              </>
            )}
          </button>
        </header>

        <h1 className="mt-4 font-heading text-3xl font-bold">
          Room <span className="font-mono text-primary">{code}</span>
        </h1>
        <p className="text-muted-foreground">Cumulative standings · all games in this room</p>

        {/* Note tab (single, this room) */}
        <div className="mt-4 flex rounded-2xl bg-secondary p-1">
          <span className="relative flex-1 rounded-xl bg-card px-3 py-2.5 text-center text-sm font-bold text-foreground shadow-sm">
            This room
          </span>
        </div>

        {/* List */}
        <section className="mt-4 min-h-40 space-y-2">
          {loading ? (
            <div className="grid place-items-center py-16 text-muted-foreground">
              <Loader2 className="size-7 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
              <AlertTriangle className="size-6 text-destructive" />
              <p className="font-semibold">{error}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
              <p className="font-semibold">No games finished yet</p>
              <p className="text-sm">Standings show up once a round wraps in this room.</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {data.map((e, i) => (
                  <Row key={`${e.rank}-${e.name}`} e={e} i={i} />
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </section>

        {/* Play your own */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/30"
          >
            Play your own 🐦
          </Link>
        </div>

        {/* Your rank (sticky) */}
        {you && (
          <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md px-5 pb-6 pt-8">
            <div className="rounded-3xl bg-primary p-1.5 shadow-xl shadow-primary/30">
              <div className="flex items-center gap-3 rounded-[1.4rem] bg-primary px-4 py-3 text-primary-foreground">
                <span className="font-heading text-2xl font-bold">#{you.rank}</span>
                <span className="grid size-10 place-items-center rounded-xl bg-primary-foreground/15 text-xl">
                  {you.avatar}
                </span>
                <div className="flex-1">
                  <p className="font-bold leading-tight">Your rank</p>
                  <p className="flex items-center gap-1 text-xs opacity-80">
                    <Flame className="size-3.5" /> {you.streak} streak · this room
                  </p>
                </div>
                <span className="font-mono text-lg font-bold tabular-nums">
                  {you.score.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
