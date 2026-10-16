'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  Megaphone,
  Eye,
  Users,
  Rocket,
  Loader2,
  Hourglass,
  Share2,
  LogOut,
} from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { TactileButton } from '@/components/brand/tactile-button'
import { buildInviteMessage, buildRoomUrl, shareOrCopy } from '@/lib/invite'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LANGUAGES } from '@/lib/game-data'
import type {
  GameSettings,
  RoomPlayer,
  GameMode,
  AnnounceMode,
  EliminationInterval,
} from '@/lib/types'
import { cn } from '@/lib/utils'

function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string; icon?: React.ReactNode }[]
  value: T
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <div className={cn('flex rounded-2xl bg-secondary p-1', disabled && 'opacity-60')}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className="relative flex-1 rounded-xl px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed"
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

export interface LobbyScreenProps {
  code: string
  players: RoomPlayer[]
  settings: GameSettings
  hostId: string
  playerId: string
  onlineIds: Set<string>
  connected: boolean
  starting?: boolean
  onChangeSettings: (partial: Partial<GameSettings>) => void
  onChangeLanguage: (lang: string) => void
  onStart: () => void
  onLeave?: () => void
}

export function LobbyScreen({
  code,
  players,
  settings,
  hostId,
  playerId,
  onlineIds,
  connected,
  starting,
  onChangeSettings,
  onChangeLanguage,
  onStart,
  onLeave,
}: LobbyScreenProps) {
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const isHost = playerId === hostId
  const isOnline = (p: RoomPlayer) => onlineIds.has(p.id) || p.online
  const onlineCount = players.filter(isOnline).length

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 1800)
  }

  // Copy the rich invite (text + link), not just the bare code.
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(buildInviteMessage(code))
    } catch {
      /* ignore */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const shareInvite = async () => {
    const res = await shareOrCopy({
      title: 'Kauwa Udd',
      text: buildInviteMessage(code),
      url: buildRoomUrl(code),
    })
    if (res === 'shared') flash('Invite shared!')
    else if (res === 'copied') flash('Invite copied!')
    else flash('Could not share')
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-28 pt-6">
      <header className="flex items-center justify-between">
        {onLeave ? (
          <button
            onClick={onLeave}
            className="grid size-10 place-items-center rounded-2xl border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-secondary"
            aria-label="Leave room"
            title="Leave room"
          >
            <ArrowLeft className="size-5" />
          </button>
        ) : (
          <Link
            href="/"
            className="grid size-10 place-items-center rounded-2xl border border-border bg-card text-foreground shadow-sm"
            aria-label="Back to home"
          >
            <ArrowLeft className="size-5" />
          </Link>
        )}
        <Logo size="sm" />
        <div
          className={cn(
            'flex h-10 items-center gap-1.5 rounded-2xl px-3 text-xs font-bold',
            connected ? 'bg-success/15 text-success' : 'bg-secondary text-muted-foreground',
          )}
          title={connected ? 'Realtime connected' : 'Connecting…'}
        >
          <span
            className={cn(
              'size-2 rounded-full',
              connected ? 'bg-success' : 'bg-muted-foreground/50',
            )}
          />
          {connected ? 'Live' : '…'}
        </div>
      </header>

      {/* Room code */}
      <section className="mt-5 rounded-3xl bg-primary p-5 text-primary-foreground shadow-lg shadow-primary/30">
        <p className="text-sm font-semibold opacity-80">Room code · share to invite</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="font-mono text-4xl font-bold tracking-[0.3em]">{code}</span>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={copyCode}
              className="grid size-12 place-items-center rounded-2xl bg-primary-foreground/15 transition-colors hover:bg-primary-foreground/25"
              aria-label="Copy invite"
            >
              {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
            </button>
            <button
              onClick={shareInvite}
              className="grid size-12 place-items-center rounded-2xl bg-primary-foreground/15 transition-colors hover:bg-primary-foreground/25"
              aria-label="Share invite"
            >
              <Share2 className="size-5" />
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs font-medium opacity-75">
          {copied
            ? 'Invite copied to clipboard!'
            : (toast ?? 'Tap copy or share to invite friends.')}
        </p>
      </section>

      {/* Players */}
      <section className="mt-5">
        <div className="mb-3 flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <h2 className="font-heading text-lg font-semibold">Players</h2>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">
            {players.length} joined
          </span>
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-bold text-success">
            {onlineCount} online
          </span>
        </div>
        {players.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Waiting for players to join…
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {players.map((p, i) => {
              const online = isOnline(p)
              return (
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
                        p.id === playerId ? 'ring-primary' : 'ring-border',
                        !online && 'opacity-40 grayscale',
                      )}
                    >
                      {p.avatar}
                    </div>
                    {p.id === hostId && (
                      <span className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-accent text-accent-foreground shadow">
                        <Crown className="size-3.5" />
                      </span>
                    )}
                    {online && (
                      <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-card bg-success" />
                    )}
                  </div>
                  <span className="max-w-full truncate text-xs font-semibold">
                    {p.id === playerId ? 'You' : p.name}
                  </span>
                </motion.div>
              )
            })}
          </div>
        )}
      </section>

      {/* Settings */}
      <section className="mt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Crown className="size-4 text-accent" />
          <h2 className="font-heading text-lg font-semibold">
            {isHost ? 'Host settings' : 'Match settings'}
          </h2>
          {!isHost && <span className="text-xs text-muted-foreground">· set by host</span>}
        </div>

        {/* Rounds slider */}
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <label className="font-semibold">Rounds</label>
            <span className="rounded-full bg-primary px-3 py-1 font-mono text-sm font-bold text-primary-foreground">
              {settings.rounds}
            </span>
          </div>
          <Slider
            value={[settings.rounds]}
            min={5}
            max={100}
            step={5}
            disabled={!isHost}
            onValueChange={(v) => {
              const next = Array.isArray(v) ? v[0] : v
              if (typeof next === 'number') onChangeSettings({ rounds: next })
            }}
            className="mt-4"
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>5</span>
            <span>Up to 100</span>
          </div>
        </div>

        {/* Mode */}
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <label className="font-semibold">Mode</label>
          <div className="mt-3">
            <Segmented
              value={settings.mode}
              disabled={!isHost}
              onChange={(v) => onChangeSettings({ mode: v as GameMode })}
              options={[
                { value: 'classic', label: 'Classic' },
                { value: 'elimination', label: 'Elimination' },
              ]}
            />
          </div>
          {settings.mode === 'elimination' && (
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
                    disabled={!isHost}
                    onClick={() =>
                      onChangeSettings({ eliminationInterval: n as EliminationInterval })
                    }
                    className={cn(
                      'flex-1 rounded-2xl border py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed',
                      settings.eliminationInterval === n
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

        {/* Announcements (per-room) */}
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <label className="font-semibold">Announcements</label>
          <p className="mb-3 mt-0.5 text-sm text-muted-foreground">
            Voice speaks the word; the image stays hidden until the last moment. Visual shows it
            right away.
          </p>
          <Segmented
            value={settings.announce}
            disabled={!isHost}
            onChange={(v) => onChangeSettings({ announce: v as AnnounceMode })}
            options={[
              { value: 'voice', label: 'Voice', icon: <Megaphone className="size-4" /> },
              { value: 'visual', label: 'Visual', icon: <Eye className="size-4" /> },
            ]}
          />
        </div>

        {/* Per-player language (each player picks their own) */}
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <label className="font-semibold">Player languages</label>
          <p className="mb-3 mt-0.5 text-sm text-muted-foreground">
            Each player hears words in their own language.
          </p>
          <div className="space-y-2">
            {players.filter(isOnline).map((p) => {
              const self = p.id === playerId
              const lang = LANGUAGES.find((l) => l.code === p.language)
              return (
                <div key={p.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-9 place-items-center rounded-xl bg-secondary text-xl">
                      {p.avatar}
                    </span>
                    <span className="text-sm font-semibold">{self ? 'You' : p.name}</span>
                  </div>
                  {self ? (
                    <Select value={p.language} onValueChange={(v) => onChangeLanguage(v as string)}>
                      <SelectTrigger className="h-10 w-36 rounded-xl">
                        <SelectValue>
                          {(value: string) => {
                            const l = LANGUAGES.find((x) => x.code === value)
                            return l ? `${l.flag} ${l.label}` : value
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((l) => (
                          <SelectItem key={l.code} value={l.code}>
                            {l.flag} {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="rounded-xl bg-secondary px-3 py-2 text-sm font-semibold text-muted-foreground">
                      {lang ? `${lang.flag} ${lang.label}` : (p.language ?? 'en')}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Leave room */}
      {onLeave && (
        <button
          onClick={onLeave}
          className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-destructive"
        >
          <LogOut className="size-4" />
          Leave room
        </button>
      )}

      {/* Start button (sticky) */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md bg-gradient-to-t from-background via-background to-transparent px-5 pb-6 pt-8">
        {isHost ? (
          <TactileButton
            variant="primary"
            size="lg"
            disabled={starting || onlineCount < 1}
            onClick={onStart}
            icon={
              starting ? <Loader2 className="size-6 animate-spin" /> : <Rocket className="size-6" />
            }
          >
            {starting ? 'Starting…' : 'Start Game'}
          </TactileButton>
        ) : (
          <div className="flex h-16 items-center justify-center gap-2.5 rounded-3xl bg-secondary px-6 font-heading text-lg font-semibold text-muted-foreground">
            <Hourglass className="size-5 animate-pulse" />
            Waiting for host to start…
          </div>
        )}
      </div>
    </main>
  )
}
