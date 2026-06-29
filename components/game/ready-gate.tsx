'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Hand, Zap, Users, Check } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { playSfx } from '@/lib/sfx'
import { cn } from '@/lib/utils'

export interface ReadyGateProps {
  readyIds: string[]
  total: number
  /** epoch ms (server clock) when the ready window closes */
  endsAt: number
  /** serverNow - clientNow (ms) — same offset the round countdown uses */
  clockOffset: number
  playerId: string
  /** POST postReady — called on hold start and refreshed while holding */
  onReady: () => void
}

export function ReadyGate({
  readyIds,
  total,
  endsAt,
  clockOffset,
  playerId,
  onReady,
}: ReadyGateProps) {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, endsAt - (Date.now() + clockOffset)),
  )
  const [holding, setHolding] = useState(false)
  const holdRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wasReadyRef = useRef(false)

  const youReady = readyIds.includes(playerId)
  const count = readyIds.length

  // Authoritative countdown to endsAt (server clock).
  useEffect(() => {
    let raf = 0
    const loop = () => {
      const serverNow = Date.now() + clockOffset
      const ms = Math.max(0, endsAt - serverNow)
      setRemainingMs(ms)
      if (ms > 0) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [endsAt, clockOffset])

  // Confirmation chirp the moment the server registers you as ready.
  useEffect(() => {
    if (youReady && !wasReadyRef.current) {
      wasReadyRef.current = true
      playSfx('ready')
    }
  }, [youReady])

  const stopHold = () => {
    holdRef.current = false
    setHolding(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const startHold = () => {
    if (holdRef.current) return
    holdRef.current = true
    setHolding(true)
    playSfx('hold')
    onReady()
    // Refresh readiness while held so transient server state stays "ready".
    intervalRef.current = setInterval(() => {
      if (holdRef.current) onReady()
    }, 700)
  }

  useEffect(() => () => stopHold(), [])

  const seconds = Math.ceil(remainingMs / 1000)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <Logo size="sm" />
        <div className="flex h-10 items-center gap-1.5 rounded-2xl bg-accent px-3 text-sm font-bold text-accent-foreground">
          <Users className="size-4" />
          {count}/{total} ready
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 18 }}
          className="relative grid place-items-center"
        >
          {/* countdown ring */}
          <svg width="220" height="220" viewBox="0 0 120 120" className="-rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--secondary)" strokeWidth="8" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke={youReady ? 'var(--success)' : 'var(--primary)'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 52}
              strokeDashoffset={2 * Math.PI * 52 * (1 - Math.min(1, remainingMs / 10000))}
              style={{ transition: 'stroke 0.2s' }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-heading text-6xl font-bold tabular-nums">{seconds}</span>
          </div>
        </motion.div>

        <h1 className="mt-8 font-heading text-3xl font-bold">
          {youReady ? 'Locked in!' : 'Get ready!'}
        </h1>
        <p className="mt-1 max-w-xs text-muted-foreground">
          {youReady
            ? 'Keep holding — the round begins when everyone is set.'
            : 'Press & hold to lock in. Round 1 starts the moment the flock is ready.'}
        </p>

        {/* live ready avatars / count */}
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 shadow-sm">
          <span className="text-sm font-bold text-success">{count}</span>
          <span className="text-sm font-semibold text-muted-foreground">of {total} holding</span>
        </div>
      </section>

      {/* HOLD button */}
      <div className="select-none pb-2">
        <motion.button
          onPointerDown={(e) => {
            e.preventDefault()
            startHold()
          }}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          whileTap={{ scale: 0.97 }}
          animate={holding ? { scale: [1, 1.02, 1] } : {}}
          transition={holding ? { duration: 0.8, repeat: Number.POSITIVE_INFINITY } : {}}
          className={cn(
            'flex h-28 w-full touch-none items-center justify-center gap-3 rounded-[2rem] font-heading text-2xl font-bold shadow-xl transition-colors',
            youReady
              ? 'bg-success text-success-foreground shadow-success/30'
              : holding
                ? 'bg-foreground text-background shadow-foreground/30'
                : 'bg-primary text-primary-foreground shadow-primary/40',
          )}
        >
          {youReady ? (
            <>
              <Check className="size-8" />
              READY
            </>
          ) : holding ? (
            <>
              <Hand className="size-8" />
              HOLDING…
            </>
          ) : (
            <>
              <Zap className="size-8" />
              HOLD to get ready
            </>
          )}
        </motion.button>
      </div>
    </main>
  )
}
