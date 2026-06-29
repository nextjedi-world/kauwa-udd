'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Check, Zap, Hand, Ear, Volume2, VolumeX, LogOut } from 'lucide-react'
import { GAME_OBJECTS, type GameObject } from '@/lib/game-data'
import { ROUND_MS, type AnnounceMode, type Standing } from '@/lib/types'
import type { RoundStartPayload, RoundResultPayload } from '@/lib/realtime/events'
import { speak, cancelSpeech, isTtsSupported } from '@/lib/tts'
import { playSfx, isMuted, setMuted } from '@/lib/sfx'
import { cn } from '@/lib/utils'

const TOTAL_ROUNDS = 8 // solo (fallback when no config passed)
const SOLO_ANNOUNCE: AnnounceMode = 'voice'
const REVEAL_LEAD_MS = 400 // voice mode: show the image this long before the deadline

type Phase = 'arm' | 'live' | 'waiting' | 'feedback'
type Outcome = { correct: boolean; reason: string; points: number }
type ScoreRow = { id: string; name: string; avatar: string; score: number; isYou: boolean }

/** Solo configuration sourced from getSoloPrefs() (see SoloSetup). */
export interface SoloConfig {
  rounds: number
  announce: AnnounceMode
  language: string
}

export interface RoomGameProps {
  code: string
  playerId: string
  name: string
  avatar: string
  announce: AnnounceMode
  language: string
  totalRounds: number
  round: RoundStartPayload | null
  result: RoundResultPayload | null
  standings: Standing[]
  clockOffset: number // serverNow - clientNow (ms)
  onClick: (round: number, released: boolean, clientTs: number) => void
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function reasonFor(flies: boolean, released: boolean, correct: boolean): string {
  if (released) return flies ? 'It flies — nice release!' : 'It cannot fly! You let it go.'
  return flies ? 'Too slow — it flew away!' : 'Grounded. Held it steady!'
}

export function GameScreen({ room, solo }: { room?: RoomGameProps; solo?: SoloConfig }) {
  const router = useRouter()
  const isRoom = !!room

  // solo configuration (falls back to legacy constants when not provided)
  const soloRounds = solo?.rounds ?? TOTAL_ROUNDS
  const soloAnnounce = solo?.announce ?? SOLO_ANNOUNCE
  const soloLang = solo?.language ?? 'en'

  // ── shared visual state ───────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('arm')
  const [progress, setProgress] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [holding, setHolding] = useState(false) // reflects the player's ACTUAL press
  const [muted, setMutedState] = useState(false)

  useEffect(() => setMutedState(isMuted()), [])
  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    setMutedState(next)
  }

  const holdingRef = useRef(false)
  const rafRef = useRef(0)
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tickSecRef = useRef<number>(99) // last countdown second a 'tick' fired for

  const stopRaf = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
  }
  const clearRevealTimer = () => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current)
    revealTimerRef.current = null
  }

  /** Reveal scheduling shared by both modes. clientEndMs is the deadline in the local clock. */
  const armReveal = useCallback(
    (announce: AnnounceMode, obj: GameObject | undefined, lang: string, clientEndMs: number) => {
      clearRevealTimer()
      const word = obj ? obj.words[lang] ?? obj.words.en ?? '' : ''
      const ttsOk = isTtsSupported()
      if (announce === 'voice' && ttsOk) {
        // Voice mode: TTS carries the cue, so we skip the 'reveal' SFX to avoid overlap.
        if (word) speak(word, lang)
        const lead = Math.max(0, clientEndMs - Date.now() - REVEAL_LEAD_MS)
        setRevealed(false)
        revealTimerRef.current = setTimeout(() => setRevealed(true), lead)
      } else {
        // visual mode (or no TTS): show immediately + a short reveal chime
        if (announce === 'voice' && word) speak(word, lang)
        playSfx('reveal')
        setRevealed(true)
      }
    },
    [],
  )

  // ════════════════════════════ SOLO MODE ════════════════════════════════════
  const [sequence, setSequence] = useState<GameObject[]>([])
  const [soloRound, setSoloRound] = useState(0)
  const [soloScores, setSoloScores] = useState<ScoreRow[]>([])
  const startRef = useRef(0)

  useEffect(() => {
    if (isRoom) return
    setSequence(shuffle(GAME_OBJECTS).slice(0, soloRounds))
    setSoloScores([
      { id: 'you', name: 'You', avatar: '🦅', score: 0, isYou: true },
      { id: 'b1', name: 'Aisha', avatar: '🐤', score: 0, isYou: false },
      { id: 'b2', name: 'Diego', avatar: '🦜', score: 0, isYou: false },
      { id: 'b3', name: 'Mira', avatar: '🕊️', score: 0, isYou: false },
      { id: 'b4', name: 'Kenji', avatar: '🦉', score: 0, isYou: false },
    ])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRoom, soloRounds])

  const soloCurrent = sequence[soloRound]

  const soloSettle = useCallback(
    (released: boolean, elapsed: number) => {
      stopRaf()
      clearRevealTimer()
      holdingRef.current = false
      setHolding(false)
      setRevealed(true)
      if (!soloCurrent) return
      const flies = soloCurrent.flies
      const correct = released ? flies : !flies
      const reason = reasonFor(flies, released, correct)
      const speedBonus = released && flies ? Math.max(0, Math.round((ROUND_MS - elapsed) / 10)) : 0
      const points = correct ? 100 + speedBonus : -50

      // outcome SFX: bonus for a fast correct release, otherwise correct / penalty
      if (!correct) playSfx('penalty')
      else if (released && flies) playSfx('bonus')
      else playSfx('correct')

      setOutcome({ correct, reason, points })
      setPhase('feedback')

      setSoloScores((prev) =>
        prev.map((p) => {
          if (p.isYou) return { ...p, score: Math.max(0, p.score + points) }
          const botCorrect = Math.random() > 0.32
          return { ...p, score: p.score + (botCorrect ? 90 + Math.floor(Math.random() * 60) : 0) }
        }),
      )

      window.setTimeout(() => {
        if (soloRound + 1 >= soloRounds) {
          try {
            sessionStorage.setItem(
              'kauwa.soloResults',
              JSON.stringify({ scores: soloScores, ts: Date.now() }),
            )
          } catch {
            /* ignore */
          }
          router.push('/results')
        } else {
          setSoloRound((r) => r + 1)
          setProgress(0)
          setOutcome(null)
          setRevealed(false)
          setPhase('arm')
        }
      }, 1500)
    },
    [soloCurrent, soloRound, soloScores, router, soloRounds],
  )

  const soloTick = useCallback(() => {
    const elapsed = performance.now() - startRef.current
    const p = Math.min(1, elapsed / ROUND_MS)
    setProgress(p)
    // last-3-seconds ticks
    const secsLeft = Math.ceil((ROUND_MS - elapsed) / 1000)
    if (secsLeft <= 3 && secsLeft >= 1 && secsLeft < tickSecRef.current) {
      tickSecRef.current = secsLeft
      playSfx('tick')
    }
    if (p >= 1) {
      soloSettle(false, ROUND_MS)
      return
    }
    rafRef.current = requestAnimationFrame(soloTick)
  }, [soloSettle])

  // ════════════════════════════ ROOM MODE ════════════════════════════════════
  const armedRoundRef = useRef<number>(-1)
  const postedRef = useRef(false)
  const shownResultRef = useRef<number>(-1)

  // new round arrives -> arm window + reveal logic
  useEffect(() => {
    if (!isRoom || !room?.round) return
    const r = room.round
    if (armedRoundRef.current === r.round) return
    armedRoundRef.current = r.round
    postedRef.current = false
    shownResultRef.current = -1
    tickSecRef.current = 99
    setOutcome(null)
    setProgress(0)
    setHolding(false) // each round starts not-held — player presses to hold
    setPhase('live')
    playSfx('roundStart')
    const obj = GAME_OBJECTS.find((o) => o.id === r.objectId)
    const clientEnd = r.endsAt - room.clockOffset
    armReveal(r.announce, obj, room.language, clientEnd)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRoom, room?.round?.round])

  // countdown ring driven by the authoritative deadline
  useEffect(() => {
    if (!isRoom || !room?.round || phase !== 'live') return
    const endsAt = room.round.endsAt
    const offset = room.clockOffset
    const start = endsAt - ROUND_MS
    let raf = 0
    const loop = () => {
      const serverNow = Date.now() + offset
      const p = Math.min(1, Math.max(0, (serverNow - start) / ROUND_MS))
      setProgress(p)
      const secsLeft = Math.ceil((endsAt - serverNow) / 1000)
      if (secsLeft <= 3 && secsLeft >= 1 && secsLeft < tickSecRef.current) {
        tickSecRef.current = secsLeft
        playSfx('tick')
      }
      if (serverNow >= endsAt) {
        if (!postedRef.current) {
          postedRef.current = true
          room.onClick(room.round!.round, false, performance.now())
        }
        setPhase('waiting')
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRoom, room?.round?.round, phase])

  // result arrives -> show feedback
  useEffect(() => {
    if (!isRoom || !room?.result) return
    const res = room.result
    if (res.round !== armedRoundRef.current) return
    if (shownResultRef.current === res.round) return
    shownResultRef.current = res.round
    clearRevealTimer()
    setRevealed(true)
    const mine = res.results.find((r) => r.playerId === room.playerId)
    if (mine) {
      setOutcome({ correct: mine.correct, points: mine.points, reason: reasonFor(res.flies, mine.released, mine.correct) })
      // outcome SFX (bonus for a top-3 ranked correct release)
      if (!mine.correct) playSfx('penalty')
      else if (mine.rank && mine.rank <= 3) playSfx('bonus')
      else playSfx('correct')
    }
    // elimination sting if this player was just knocked out
    if (res.eliminatedPlayerIds?.includes(room.playerId)) playSfx('eliminate')
    setPhase('feedback')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRoom, room?.result?.round])

  // ── input handlers ──────────────────────────────────────────────────────────
  const handlePress = () => {
    if (isRoom) {
      if (phase !== 'live') return // only meaningful during a live round
      holdingRef.current = true
      setHolding(true)
      return
    }
    if (phase === 'arm') {
      holdingRef.current = true
      setHolding(true)
      startRef.current = performance.now()
      tickSecRef.current = 99
      setPhase('live')
      setProgress(0)
      playSfx('roundStart')
      const clientEnd = Date.now() + ROUND_MS
      armReveal(soloAnnounce, soloCurrent, soloLang, clientEnd)
      rafRef.current = requestAnimationFrame(soloTick)
    }
  }

  const handleRelease = () => {
    setHolding(false)
    if (isRoom) {
      if (phase === 'live' && holdingRef.current && !postedRef.current && room?.round) {
        postedRef.current = true
        room.onClick(room.round.round, true, performance.now())
        setPhase('waiting')
      }
      holdingRef.current = false
      return
    }
    if (phase === 'live' && holdingRef.current) {
      const elapsed = performance.now() - startRef.current
      soloSettle(true, elapsed)
    }
  }

  useEffect(
    () => () => {
      stopRaf()
      clearRevealTimer()
      cancelSpeech()
    },
    [],
  )

  // ── view model ────────────────────────────────────────────────────────────
  const current: GameObject | undefined = isRoom
    ? room?.round
      ? GAME_OBJECTS.find((o) => o.id === room.round!.objectId)
      : undefined
    : soloCurrent

  const lang = isRoom ? room!.language : soloLang
  const announce = isRoom ? room!.announce : soloAnnounce
  const word = current?.words[lang] ?? current?.words.en ?? ''

  const roundNumber = isRoom ? room?.round?.round ?? 1 : soloRound + 1
  const totalRounds = isRoom ? room!.totalRounds : soloRounds

  const scoreList: ScoreRow[] = isRoom
    ? room!.standings.map((s) => ({
        id: s.playerId,
        name: s.name,
        avatar: s.avatar,
        score: s.score,
        isYou: s.playerId === room!.playerId,
      }))
    : soloScores
  const sorted = [...scoreList].sort((a, b) => b.score - a.score)

  const ring = 2 * Math.PI * 52
  const waitingForRound = isRoom && !room?.round

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-8 pt-6">
      {/* Top bar */}
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {!isRoom && (
            <button
              onClick={() => {
                cancelSpeech()
                router.push('/')
              }}
              className="grid size-10 place-items-center rounded-2xl border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-secondary"
              aria-label="Leave solo game"
            >
              <LogOut className="size-5" />
            </button>
          )}
          <div className="rounded-2xl bg-card px-4 py-2 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground">Round</p>
            <p className="font-heading text-xl font-bold leading-none">
              {roundNumber}
              <span className="text-sm text-muted-foreground">/{totalRounds}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            onClick={toggleMute}
            className="grid size-10 place-items-center rounded-2xl border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-secondary"
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="size-5 text-muted-foreground" /> : <Volume2 className="size-5 text-primary" />}
          </button>
        </div>
      </header>

      {/* Live mini scoreboard */}
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

          <div className="absolute inset-0 grid place-items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${roundNumber}-${phase}-${revealed}`}
                initial={{ scale: 0.5, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                className="flex flex-col items-center"
              >
                {waitingForRound ? (
                  <span className="text-center font-heading text-xl font-bold text-muted-foreground">
                    Get ready…
                  </span>
                ) : revealed && current ? (
                  <>
                    <motion.span
                      className="text-7xl"
                      animate={
                        phase === 'feedback' && outcome?.correct && current.flies
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
                      {current.emoji}
                    </motion.span>
                    <span className="mt-1 font-heading text-2xl font-bold">{word}</span>
                  </>
                ) : (
                  // armed but hidden — voice mode keeps the image secret
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <motion.span
                      animate={{ scale: [1, 1.12, 1] }}
                      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                      className="grid size-20 place-items-center rounded-full bg-secondary"
                    >
                      {announce === 'voice' ? <Ear className="size-9" /> : <span className="text-5xl">⏳</span>}
                    </motion.span>
                    <span className="font-heading text-lg font-bold">
                      {phase === 'arm' ? 'Hold to start' : 'Listen!'}
                    </span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* status line */}
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
                    {outcome.points >= 0 ? `Correct +${outcome.points}` : `Penalty ${outcome.points}`}
                  </span>
                  <span className="text-sm font-medium opacity-90">{outcome.reason}</span>
                </span>
              </motion.div>
            )}
            {phase === 'waiting' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center font-semibold text-muted-foreground"
              >
                Locked in · waiting for the round to score…
              </motion.p>
            )}
            {phase === 'live' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center font-semibold text-muted-foreground"
              >
                {holding
                  ? 'Release if it flies · keep holding if it can’t'
                  : 'Press & hold the button — then release if it flies'}
              </motion.p>
            )}
            {phase === 'arm' && !waitingForRound && (
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
          disabled={phase === 'feedback' || waitingForRound}
          whileTap={{ scale: 0.97 }}
          animate={phase === 'live' ? { scale: [1, 1.02, 1] } : {}}
          transition={phase === 'live' ? { duration: 0.8, repeat: Number.POSITIVE_INFINITY } : {}}
          className={cn(
            'flex h-28 w-full touch-none items-center justify-center gap-3 rounded-[2rem] font-heading text-2xl font-bold shadow-xl transition-colors disabled:opacity-60',
            holding
              ? 'bg-foreground text-background shadow-foreground/30'
              : 'bg-primary text-primary-foreground shadow-primary/40',
          )}
        >
          {holding ? (
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
