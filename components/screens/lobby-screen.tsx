'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, Copy, Crown, Megaphone, Eye, Users, Rocket } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { TactileLink } from '@/components/brand/tactile-button'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LANGUAGES, MOCK_PLAYERS, generateRoomCode } from '@/lib/game-data'
import { cn } from '@/lib/utils'

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: React.ReactNode }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-2xl bg-secondary p-1">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="relative flex-1 rounded-xl px-3 py-2 text-sm font-semibold"
          >
            {active && (
              <motion.span
                layoutId="seg-active"
                className="absolute inset-0 rounded-xl bg-card shadow-sm shadow-foreground/10"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span
              className={cn(
                'relative z-10 flex items-center justify-center gap-1.5',
                active ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {opt.icon}
              {opt.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function LobbyScreen() {
  const [roomCode, setRoomCode] = useState('•••••')
  useEffect(() => setRoomCode(generateRoomCode()), [])
  const [copied, setCopied] = useState(false)
  const [rounds, setRounds] = useState(20)
  const [mode, setMode] = useState<'classic' | 'elimination'>('classic')
  const [interval, setIntervalRounds] = useState<3 | 5 | 10>(5)
  const [announce, setAnnounce] = useState<'voice' | 'visual'>('voice')
  const [langs, setLangs] = useState<Record<string, string>>(
    Object.fromEntries(MOCK_PLAYERS.map((p) => [p.id, 'en'])),
  )

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode)
    } catch {
      /* ignore */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const onlineCount = MOCK_PLAYERS.filter((p) => p.online).length

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

      {/* Room code */}
      <section className="mt-5 rounded-3xl bg-primary p-5 text-primary-foreground shadow-lg shadow-primary/30">
        <p className="text-sm font-semibold opacity-80">Room code · share to invite</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="font-mono text-4xl font-bold tracking-[0.3em]">{roomCode}</span>
          <button
            onClick={copyCode}
            className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-foreground/15 transition-colors hover:bg-primary-foreground/25"
            aria-label="Copy room code"
          >
            {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
          </button>
        </div>
        <p className="mt-2 text-xs font-medium opacity-75">
          {copied ? 'Copied to clipboard!' : 'Friends enter this code on the Join screen.'}
        </p>
      </section>

      {/* Players */}
      <section className="mt-5">
        <div className="mb-3 flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <h2 className="font-heading text-lg font-semibold">Players</h2>
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-bold text-success">
            {onlineCount} online
          </span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {MOCK_PLAYERS.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 18 }}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="relative">
                <div
                  className={cn(
                    'grid size-14 place-items-center rounded-2xl bg-card text-3xl shadow-sm ring-2',
                    p.isYou ? 'ring-primary' : 'ring-border',
                    !p.online && 'opacity-40 grayscale',
                  )}
                >
                  {p.avatar}
                </div>
                {p.isHost && (
                  <span className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-accent text-accent-foreground shadow">
                    <Crown className="size-3.5" />
                  </span>
                )}
                {p.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-card bg-success" />
                )}
              </div>
              <span className="max-w-full truncate text-xs font-semibold">{p.name}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Host settings */}
      <section className="mt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Crown className="size-4 text-accent" />
          <h2 className="font-heading text-lg font-semibold">Host settings</h2>
        </div>

        {/* Rounds slider */}
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <label className="font-semibold">Rounds</label>
            <span className="rounded-full bg-primary px-3 py-1 font-mono text-sm font-bold text-primary-foreground">
              {rounds}
            </span>
          </div>
          <Slider
            value={[rounds]}
            min={5}
            max={100}
            step={5}
            onValueChange={(v) => setRounds(v[0])}
            className="mt-4"
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>5</span>
            <span>Up to 100</span>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <label className="font-semibold">Mode</label>
          <div className="mt-3">
            <Segmented
              value={mode}
              onChange={(v) => setMode(v as 'classic' | 'elimination')}
              options={[
                { value: 'classic', label: 'Classic' },
                { value: 'elimination', label: 'Elimination' },
              ]}
            />
          </div>
          {mode === 'elimination' && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3"
            >
              <p className="mb-2 text-sm text-muted-foreground">Eliminate lowest every</p>
              <div className="flex gap-2">
                {([3, 5, 10] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => setIntervalRounds(n)}
                    className={cn(
                      'flex-1 rounded-2xl border py-2.5 text-sm font-bold transition-colors',
                      interval === n
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-secondary text-muted-foreground',
                    )}
                  >
                    {n} rounds
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Announcement mode */}
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <label className="font-semibold">Announcements</label>
          <div className="mt-3">
            <Segmented
              value={announce}
              onChange={(v) => setAnnounce(v as 'voice' | 'visual')}
              options={[
                { value: 'voice', label: 'Voice', icon: <Megaphone className="size-4" /> },
                { value: 'visual', label: 'Visual', icon: <Eye className="size-4" /> },
              ]}
            />
          </div>
        </div>

        {/* Per-player language */}
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <label className="font-semibold">Player languages</label>
          <p className="mb-3 mt-0.5 text-sm text-muted-foreground">Each player hears words in their own language.</p>
          <div className="space-y-2">
            {MOCK_PLAYERS.filter((p) => p.online).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-xl bg-secondary text-xl">{p.avatar}</span>
                  <span className="text-sm font-semibold">{p.name}</span>
                </div>
                <Select
                  value={langs[p.id]}
                  onValueChange={(v) => setLangs((s) => ({ ...s, [p.id]: v }))}
                >
                  <SelectTrigger className="h-10 w-36 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.flag} {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Start button (sticky) */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md bg-gradient-to-t from-background via-background to-transparent px-5 pb-6 pt-8">
        <TactileLink href="/game" variant="primary" size="lg" icon={<Rocket className="size-6" />}>
          Start Game
        </TactileLink>
      </div>
    </main>
  )
}
