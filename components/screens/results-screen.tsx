'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Crown, RotateCw, Share2, Check, X, Trophy, Home } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { TactileLink, TactileButton } from '@/components/brand/tactile-button'
import { MOCK_ROUND_BREAKDOWN } from '@/lib/game-data'
import type { Standing } from '@/lib/types'
import { cn } from '@/lib/utils'

type BreakdownRow = {
  round: number
  object: string
  emoji: string
  flies: boolean
  correct: boolean
  reactionMs: number
}

type PodiumRow = { place: number; name: string; avatar: string; score: number; isYou: boolean }

export interface ResultsScreenProps {
  standings?: Standing[]
  playerId?: string
  winnerId?: string | null
  breakdown?: BreakdownRow[]
  onPlayAgain?: () => void
}

const PLACE_META = [
  { height: 'h-32', color: 'bg-primary' },
  { height: 'h-24', color: 'bg-secondary' },
  { height: 'h-16', color: 'bg-accent' },
]
// podium render order: 2nd, 1st, 3rd
const PODIUM_ORDER = [1, 0, 2]

function buildPodium(rows: PodiumRow[]): PodiumRow[] {
  return PODIUM_ORDER.map((idx) => rows[idx]).filter(Boolean)
}

export function ResultsScreen(props: ResultsScreenProps) {
  const [shared, setShared] = useState(false)
  const [solo, setSolo] = useState<{ scores: PodiumRow[] } | null>(null)

  const hasRoom = !!props.standings && props.standings.length > 0

  // Solo fallback: pull the last solo game from sessionStorage.
  useEffect(() => {
    if (hasRoom) return
    try {
      const raw = sessionStorage.getItem('kauwa.soloResults')
      if (raw) {
        const parsed = JSON.parse(raw) as {
          scores: { id: string; name: string; avatar: string; score: number; isYou: boolean }[]
        }
        const ranked = [...parsed.scores]
          .sort((a, b) => b.score - a.score)
          .map((s, i) => ({ place: i + 1, name: s.name, avatar: s.avatar, score: s.score, isYou: s.isYou }))
        setSolo({ scores: ranked })
      }
    } catch {
      /* ignore */
    }
  }, [hasRoom])

  // Unified view model
  const { podium, breakdown, title, correctCount, total } = useMemo(() => {
    if (hasRoom) {
      const ranked: PodiumRow[] = props.standings!.map((s, i) => ({
        place: i + 1,
        name: s.playerId === props.playerId ? 'You' : s.name,
        avatar: s.avatar,
        score: s.score,
        isYou: s.playerId === props.playerId,
      }))
      const bd = props.breakdown ?? []
      const correct = bd.filter((r) => r.correct).length
      const youWon = props.winnerId ? props.winnerId === props.playerId : ranked[0]?.isYou
      const winnerName = ranked[0]?.name ?? 'The flock'
      return {
        podium: buildPodium(ranked),
        breakdown: bd,
        title: youWon ? 'You took the sky! 🏆' : `${winnerName} takes the sky! 🏆`,
        correctCount: correct,
        total: bd.length,
      }
    }
    // solo
    if (solo) {
      const bd = MOCK_ROUND_BREAKDOWN
      const youWon = solo.scores[0]?.isYou
      return {
        podium: buildPodium(solo.scores),
        breakdown: bd,
        title: youWon ? 'You took the sky! 🏆' : `${solo.scores[0]?.name ?? ''} takes the sky! 🏆`,
        correctCount: bd.filter((r) => r.correct).length,
        total: bd.length,
      }
    }
    // pure mock fallback
    const mockRanked: PodiumRow[] = [
      { place: 1, name: 'You', avatar: '🦅', score: 1340, isYou: true },
      { place: 2, name: 'Aisha', avatar: '🐤', score: 1180, isYou: false },
      { place: 3, name: 'Diego', avatar: '🦜', score: 990, isYou: false },
    ]
    return {
      podium: buildPodium(mockRanked),
      breakdown: MOCK_ROUND_BREAKDOWN,
      title: 'You took the sky! 🏆',
      correctCount: MOCK_ROUND_BREAKDOWN.filter((r) => r.correct).length,
      total: MOCK_ROUND_BREAKDOWN.length,
    }
  }, [hasRoom, solo, props.standings, props.breakdown, props.playerId, props.winnerId])

  const onShare = async () => {
    const text = 'I just played Kauwa Udd — Hold. Release. React. Can you beat my score?'
    try {
      if (navigator.share) await navigator.share({ title: 'Kauwa Udd', text })
      else await navigator.clipboard.writeText(text)
    } catch {
      /* ignore */
    }
    setShared(true)
    setTimeout(() => setShared(false), 1600)
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-28 pt-6">
      <header className="flex items-center justify-between">
        <Logo size="sm" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm font-bold text-accent-foreground">
          <Trophy className="size-4" /> Match over
        </span>
      </header>

      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 text-center font-heading text-3xl font-bold"
      >
        {title}
      </motion.h1>
      {total > 0 && (
        <p className="text-center text-muted-foreground">
          {correctCount}/{total} correct reactions
        </p>
      )}

      {/* Podium */}
      <section className="mt-6 flex items-end justify-center gap-2">
        {podium.map((p, renderIdx) => {
          const meta = PLACE_META[p.place - 1] ?? PLACE_META[2]
          return (
            <div key={`${p.name}-${p.place}`} className="flex w-1/3 flex-col items-center">
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: renderIdx * 0.1 + 0.1, type: 'spring', stiffness: 240, damping: 16 }}
                className="relative mb-2"
              >
                {p.place === 1 && (
                  <motion.span
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                    className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl"
                  >
                    <Crown className="size-7 fill-accent text-accent" />
                  </motion.span>
                )}
                <div
                  className={cn(
                    'grid place-items-center rounded-2xl bg-card text-3xl shadow-md ring-2',
                    p.place === 1 ? 'size-16 ring-accent' : 'size-14 ring-border',
                  )}
                >
                  {p.avatar}
                </div>
              </motion.div>
              <span className="text-sm font-bold">{p.name}</span>
              <span className="font-mono text-xs text-muted-foreground">{p.score}</span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                transition={{ delay: renderIdx * 0.1 + 0.2 }}
                className={cn('mt-2 w-full overflow-hidden rounded-t-2xl', meta.color)}
              >
                <div className={cn('grid w-full place-items-center', meta.height)}>
                  <span
                    className={cn(
                      'font-heading text-3xl font-bold',
                      p.place === 1 ? 'text-primary-foreground' : 'text-foreground/70',
                    )}
                  >
                    {p.place}
                  </span>
                </div>
              </motion.div>
            </div>
          )
        })}
      </section>

      {/* Round breakdown */}
      {breakdown.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 font-heading text-lg font-semibold">Round breakdown</h2>
          <div className="space-y-2">
            {breakdown.map((r, i) => (
              <motion.div
                key={r.round}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.04 }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary font-mono text-xs font-bold text-muted-foreground">
                  {r.round}
                </span>
                <span className="text-2xl">{r.emoji}</span>
                <div className="flex-1">
                  <p className="font-semibold leading-tight">{r.object}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.flies ? 'Flies — release' : 'Grounded — hold'}
                    {r.flies && r.reactionMs > 0 && r.correct ? ` · ${r.reactionMs}ms` : ''}
                  </p>
                </div>
                <span
                  className={cn(
                    'grid size-8 place-items-center rounded-full',
                    r.correct ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive',
                  )}
                >
                  {r.correct ? <Check className="size-5" /> : <X className="size-5" />}
                </span>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-md gap-3 bg-gradient-to-t from-background via-background to-transparent px-5 pb-6 pt-8">
        <TactileButton
          variant="surface"
          size="lg"
          className="flex-1"
          icon={shared ? <Check className="size-6 text-success" /> : <Share2 className="size-6 text-primary" />}
          onClick={onShare}
        >
          {shared ? 'Copied!' : 'Share'}
        </TactileButton>
        {props.onPlayAgain ? (
          <TactileButton
            variant="primary"
            size="lg"
            className="flex-1"
            icon={<Home className="size-6" />}
            onClick={props.onPlayAgain}
          >
            New Game
          </TactileButton>
        ) : (
          <TactileLink href="/game" variant="primary" size="lg" className="flex-1" icon={<RotateCw className="size-6" />}>
            Play Again
          </TactileLink>
        )}
      </div>

      <div className="mt-4 flex justify-center">
        <TactileLink
          href="/"
          variant="ghost"
          size="md"
          className="h-10 min-h-10 w-auto px-5 text-sm shadow-none"
          icon={<Home className="size-4" />}
        >
          Home
        </TactileLink>
      </div>
    </main>
  )
}
