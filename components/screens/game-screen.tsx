'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Check, Zap, Hand } from 'lucide-react'
import { GAME_OBJECTS, MOCK_PLAYERS, type GameObject } from '@/lib/game-data'
import { cn } from '@/lib/utils'

const ROUND_MS = 3000
const TOTAL_ROUNDS = 8
const LANG = 'en'

type Phase = 'arm' | 'live' | 'feedback'
type Outcome = { correct: boolean; reason: string; points: number }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function GameScreen() {
  const router = useRouter()
  const [sequence, setSequence] = useState<GameObject[]>([])
  const [round, setRound] = useState(0)
  const [phase, setPhase] = useState<Phase>('arm')
  const [progress, setProgress] = useState(0) // 0 -> 1 over the round
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [scores, setScores] = useState(() =>
    MOCK_PLAYERS.filter((p) => p.online).map((p) => ({ ...p })),
  )

  const startRef = useRef(0)
  const rafRef = useRef(0)
  const holdingRef = useRef(false)

  // Build a randomized sequence after mount (avoids hydration mismatch).
  useEffect(() => {
    setSequence(shuffle(GAME_OBJECTS).slice(0, TOTAL_ROUNDS))
  }, [])

  const current = sequence[round]

  const stopRaf = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
  }

  const settle = useCallback(
    (released: boolean, elapsed: number) => {
      stopRaf()
      holdingRef.current = false
      if (!current) return

      const flies = current.flies
      let correct: boolean
      let reason: string
      if (released) {
        correct = flies
        reason = flies ? 'It flies — nice release!' : 'It cannot fly! You let it go.'
      } else {
        correct = !flies
        reason = flies ? 'Too slow — it flew away!' : 'Grounded. Held it steady!'
      }

      const speedBonus = released && flies ? Math.max(0, Math.round((ROUND_MS - elapsed) / 10)) : 0
      const points = correct ? 100 + speedBonus : -50

      setOutcome({ correct, reason, points })
      setPhase('feedback')

      setScores((prev) =>
        prev.map((p) => {
          if (p.isYou) return { ...p, score: Math.max(0, p.score + points) }
          // bots react with their own accuracy
          const botCorrect = Math.random() > 0.32
          return { ...p, score: p.score + (botCorrect ? 90 + Math.floor(Math.random() * 60) : 0) }
        }),
      )

      window.setTimeout(() => {
        if (round + 1 >= TOTAL_ROUNDS) {
          router.push('/results')
        } else {
          setRound((r) => r + 1)
          setProgress(0)
          setOutcome(null)
          setPhase('arm')
        }
      }, 1500)
    },
    [current, round, router],
  )

  const tick = useCallback(() => {
    const elapsed = performance.now() - startRef.current
    const p = Math.min(1, elapsed / ROUND_MS)
    setProgress(p)
    if (p >= 1) {
      settle(false, ROUND_MS) // held the whole time
      return
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [settle])

  const handlePress = () => {
    if (phase === 'arm') {
      holdingRef.current = true
      startRef.current = performance.now()
      setPhase('live')
      setProgress(0)
      rafRef.current = requestAnimationFrame(tick)
    }
  }

  const handleRelease = () => {
    if (phase === 'live' && holdingRef.current) {
      const elapsed = performance.now() - startRef.current
      settle(true, elapsed)
    }
  }

  useEffect(() => () => stopRaf(), [])

  const sorted = [...scores].sort((a, b) => b.score - a.score)
  const ring = 2 * Math.PI * 52
  const word = current?.words[LANG] ?? ''

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-8 pt-6">
      {/* Top bar: round counter + mini scoreboard */}
      <header className="flex items-start justify-between gap-3">
        <div className="rounded-2xl bg-card px-4 py-2 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground">Round</p>
          <p className="font-heading text-xl font-bold leading-none">
            {round + 1}
            <span className="text-sm text-muted-foreground">/{TOTAL_ROUNDS}</span>
          </p>
        </div>
        <div className="flex -space-x-2">
          {sorted.slice(0, 4).map((p, i) => (
            <div
              key={p.id}
              className={cn(
                'grid size-10 place-items-center rounded-full border-2 border-background bg-card text-lg shadow-sm',
                i === 0 && 'ring-2 ring-accent',
              )}
              title={`${p.name}: ${p.score}`}
            >
              {p.avatar}
            </div>
          ))}
        </div>
      </header>

      {/* Live mini scoreboard bar */}
      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
        {sorted.map((p, i) => (
          <div
            key={p.id}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold',
              p.isYou ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
            )}
          >
            <span className="text-xs opacity-70">{i + 1}.</span>
            <span>{p.avatar}</span>
            <span className="tabular-nums">{p.score}</span>
          </div>
        ))}
      </div>

      {/* Object stage */}
      <section className="relative flex flex-1 flex-col items-center justify-center">
        {/* Countdown ring */}
        <div className="relative grid place-items-center">
          <svg width="240" height="240" viewBox="0 0 120 120" className="-rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--secondary)" strokeWidth="8" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke={
                phase === 'feedback'
                  ? outcome?.correct
                    ? 'var(--success)'
                    : 'var(--destructive)'
                  : 'var(--primary)'
              }
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={ring}
              strokeDashoffset={phase === 'live' ? ring * progress : 0}
              style={{ transition: phase === 'live' ? 'none' : 'stroke-dashoffset 0.3s, stroke 0.2s' }}
            />
          </svg>

          {/* Object emoji + word */}
          <div className="absolute inset-0 grid place-items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={round + phase}
                initial={{ scale: 0.5, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                className="flex flex-col items-center"
              >
                <motion.span
                  className="text-7xl"
                  animate={
                    phase === 'feedback' && outcome?.correct && current?.flies
                      ? { y: -70, opacity: 0, rotate: 20 }
                      : phase === 'live'
                        ? { y: [0, -6, 0] }
                        : {}
                  }
                  transition={
                    phase === 'feedback'
                      ? { duration: 0.8, ease: 'easeOut' }
                      : { duration: 1.2, repeat: Number.POSITIVE_INFINITY }
                  }
                >
                  {current?.emoji ?? '⏳'}
                </motion.span>
                <span className="mt-1 font-heading text-2xl font-bold">{word}</span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Feedback banner */}
        <div className="mt-6 h-16">
          <AnimatePresence>
            {phase === 'feedback' && outcome && (
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-5 py-2.5 shadow-lg',
                  outcome.correct
                    ? 'bg-success text-success-foreground shadow-success/30'
                    : 'bg-destructive text-white shadow-destructive/30',
                )}
              >
                {outcome.correct ? <Check className="size-7" /> : <X className="size-7" />}
                <span className="flex flex-col leading-tight">
                  <span className="font-heading text-lg font-bold">
                    {outcome.correct ? `Correct +${outcome.points}` : `Penalty ${outcome.points}`}
                  </span>
                  <span className="text-sm font-medium opacity-90">{outcome.reason}</span>
                </span>
              </motion.div>
            )}
            {phase === 'live' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center font-semibold text-muted-foreground"
              >
                Release if it flies · keep holding if it can&apos;t
              </motion.p>
            )}
            {phase === 'arm' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center font-semibold text-muted-foreground"
              >
                Press &amp; hold the button, then react!
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Press & HOLD button */}
      <div className="select-none pb-2">
        <motion.button
          onPointerDown={(e) => {
            e.preventDefault()
            handlePress()
          }}
          onPointerUp={handleRelease}
          onPointerLeave={handleRelease}
          onPointerCancel={handleRelease}
          disabled={phase === 'feedback'}
          whileTap={{ scale: 0.97 }}
          animate={phase === 'live' ? { scale: [1, 1.02, 1] } : {}}
          transition={phase === 'live' ? { duration: 0.8, repeat: Number.POSITIVE_INFINITY } : {}}
          className={cn(
            'flex h-28 w-full touch-none items-center justify-center gap-3 rounded-[2rem] font-heading text-2xl font-bold shadow-xl transition-colors disabled:opacity-60',
            phase === 'live'
              ? 'bg-foreground text-background shadow-foreground/30'
              : 'bg-primary text-primary-foreground shadow-primary/40',
          )}
        >
          {phase === 'live' ? (
            <>
              <Hand className="size-8" />
              HOLDING…
            </>
          ) : (
            <>
              <Zap className="size-8" />
              HOLD
            </>
          )}
        </motion.button>
      </div>
    </main>
  )
}
