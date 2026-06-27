'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Flame, Medal, Loader2, AlertTriangle } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { getLeaderboard } from '@/lib/api'
import { type LeaderEntry } from '@/lib/game-data'
import { cn } from '@/lib/utils'

const MEDAL_COLORS = ['text-accent', 'text-muted-foreground', 'text-[oklch(0.62_0.12_45)]']

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
      <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-2xl">{e.avatar}</span>
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

export function LeaderboardScreen() {
  const [tab, setTab] = useState<'daily' | 'weekly'>('daily')
  const [data, setData] = useState<LeaderEntry[]>([])
  const [you, setYou] = useState<LeaderEntry | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getLeaderboard(tab)
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
  }, [tab])

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-28 pt-6">
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="grid size-10 place-items-center rounded-2xl border border-border bg-card text-foreground shadow-sm"
          aria-label="Back to home"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <Logo size="sm" />
        <div className="size-10" />
      </header>

      <h1 className="mt-4 font-heading text-3xl font-bold">Leaderboard</h1>
      <p className="text-muted-foreground">Top birds ruling the sky</p>

      {/* Tabs */}
      <div className="mt-4 flex rounded-2xl bg-secondary p-1">
        {(['daily', 'weekly'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="relative flex-1 rounded-xl px-3 py-2.5 text-sm font-bold capitalize"
          >
            {tab === t && (
              <motion.span
                layoutId="lb-tab"
                className="absolute inset-0 rounded-xl bg-card shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className={cn('relative z-10', tab === t ? 'text-foreground' : 'text-muted-foreground')}>
              {t}
            </span>
          </button>
        ))}
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
            <p className="font-semibold">No scores yet</p>
            <p className="text-sm">Be the first bird to take the sky!</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {data.map((e, i) => (
                <Row key={`${tab}-${e.rank}-${e.name}`} e={e} i={i} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </section>

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
                  <Flame className="size-3.5" /> {you.streak} streak · {tab}
                </p>
              </div>
              <span className="font-mono text-lg font-bold tabular-nums">{you.score.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
