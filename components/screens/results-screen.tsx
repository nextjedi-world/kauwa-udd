'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Crown, RotateCw, Share2, Check, X, Trophy, Home } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { TactileLink, TactileButton } from '@/components/brand/tactile-button'
import { MOCK_ROUND_BREAKDOWN } from '@/lib/game-data'
import { cn } from '@/lib/utils'

const PODIUM = [
  { place: 2, name: 'Aisha', avatar: '🐤', score: 1180, height: 'h-24', color: 'bg-secondary', delay: 0.1 },
  { place: 1, name: 'You', avatar: '🦅', score: 1340, height: 'h-32', color: 'bg-primary', delay: 0, isYou: true },
  { place: 3, name: 'Diego', avatar: '🦜', score: 990, height: 'h-16', color: 'bg-accent', delay: 0.2 },
]

export function ResultsScreen() {
  const [shared, setShared] = useState(false)

  const onShare = async () => {
    const text = 'I just played Kauwa Udd — Hold. Release. React. Can you beat my score?'
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Kauwa Udd', text })
      } else {
        await navigator.clipboard.writeText(text)
      }
    } catch {
      /* ignore */
    }
    setShared(true)
    setTimeout(() => setShared(false), 1600)
  }

  const correctCount = MOCK_ROUND_BREAKDOWN.filter((r) => r.correct).length

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
        You took the sky! 🏆
      </motion.h1>
      <p className="text-center text-muted-foreground">
        {correctCount}/{MOCK_ROUND_BREAKDOWN.length} correct reactions
      </p>

      {/* Podium */}
      <section className="mt-6 flex items-end justify-center gap-2">
        {PODIUM.map((p) => (
          <div key={p.place} className="flex w-1/3 flex-col items-center">
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: p.delay + 0.1, type: 'spring', stiffness: 240, damping: 16 }}
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
              transition={{ delay: p.delay + 0.2 }}
              className={cn('mt-2 w-full overflow-hidden rounded-t-2xl', p.color)}
            >
              <div className={cn('grid w-full place-items-center', p.height)}>
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
        ))}
      </section>

      {/* Round breakdown */}
      <section className="mt-6">
        <h2 className="mb-3 font-heading text-lg font-semibold">Round breakdown</h2>
        <div className="space-y-2">
          {MOCK_ROUND_BREAKDOWN.map((r, i) => (
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
        <TactileLink href="/game" variant="primary" size="lg" className="flex-1" icon={<RotateCw className="size-6" />}>
          Play Again
        </TactileLink>
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
