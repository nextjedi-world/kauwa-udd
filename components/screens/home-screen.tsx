'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, LogIn, Play, Sparkles, Trophy, ArrowRight, Loader2, Pencil } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { TactileButton, TactileLink } from '@/components/brand/tactile-button'
import { Input } from '@/components/ui/input'
import { createRoom } from '@/lib/api'
import { getPlayerId, getPlayerName, setPlayerName, getPlayerAvatar } from '@/lib/identity'
import { DEFAULT_SETTINGS } from '@/lib/types'
import { cn } from '@/lib/utils'

const AVATARS = ['🦅', '🦉', '🦜', '🕊️', '🐧', '🦚', '🐤', '🦆', '🦢', '🐦']
const PLAYER_KEY = 'kauwa.playerId'

type Pending = { kind: 'create' } | { kind: 'join'; code: string } | null

export function HomeScreen() {
  const router = useRouter()
  const [joinOpen, setJoinOpen] = useState(false)
  const [code, setCode] = useState('')

  // identity
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('🦅')
  const [profileOpen, setProfileOpen] = useState(false)
  const [pending, setPending] = useState<Pending>(null)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(getPlayerName())
    setAvatar(getPlayerAvatar())
  }, [])

  // Run the pending action once identity is ready.
  function runPending(p: Pending, playerName: string, playerAvatar: string) {
    if (!p) return
    if (p.kind === 'create') void doCreate(playerName, playerAvatar)
    else router.push(`/room/${p.code}`)
  }

  function gate(action: Pending) {
    setError(null)
    if (!getPlayerName().trim()) {
      setPending(action)
      setProfileOpen(true)
      return
    }
    runPending(action, getPlayerName(), getPlayerAvatar())
  }

  async function doCreate(hostName: string, hostAvatar: string) {
    setBusy(true)
    setError(null)
    try {
      const res = await createRoom({
        hostName,
        hostAvatar,
        visibility: 'private',
        settings: DEFAULT_SETTINGS,
        playerId: getPlayerId(),
      })
      // Adopt the server-assigned host id so every route resolves the same identity.
      if (res.playerId && typeof window !== 'undefined') {
        localStorage.setItem(PLAYER_KEY, res.playerId)
      }
      router.push(`/room/${res.code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create room')
      setBusy(false)
    }
  }

  function saveProfile() {
    const trimmed = name.trim()
    if (!trimmed) return
    setPlayerName(trimmed)
    if (typeof window !== 'undefined') localStorage.setItem('kauwa.playerAvatar', avatar)
    setProfileOpen(false)
    const p = pending
    setPending(null)
    runPending(p, trimmed, avatar)
  }

  function onCreate() {
    gate({ kind: 'create' })
  }

  function onJoin() {
    if (code.length < 4) return
    gate({ kind: 'join', code })
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-8">
      <header className="flex items-center justify-between">
        <Logo size="md" />
        <TactileLink
          href="/leaderboard"
          variant="surface"
          size="md"
          className="h-10 min-h-10 w-auto px-4 text-sm"
          icon={<Trophy className="size-4 text-accent" />}
        >
          Ranks
        </TactileLink>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center py-8 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -12 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          className="mb-6 grid size-28 place-items-center rounded-[2rem] bg-primary text-6xl shadow-xl shadow-primary/30 ring-4 ring-background"
        >
          <motion.span
            animate={{ y: [0, -10, 0], rotate: [-6, 8, -6] }}
            transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          >
            🐦
          </motion.span>
        </motion.div>

        <h1 className="font-heading text-5xl font-bold leading-none tracking-tight text-balance">
          Kauwa <span className="text-primary">Udd</span>
        </h1>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-sm font-semibold text-secondary-foreground">
          <Sparkles className="size-4 text-accent" />
          Hold. Release. React.
        </p>
        <p className="mt-4 max-w-xs text-pretty text-muted-foreground">
          If it flies, let go. If it can&apos;t, hold tight. Last bird standing wins the sky.
        </p>

        {/* Identity chip */}
        <button
          onClick={() => {
            setPending(null)
            setProfileOpen(true)
          }}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold shadow-sm transition-colors hover:bg-secondary"
        >
          <span className="text-lg">{avatar}</span>
          <span>{name || 'Pick your bird'}</span>
          <Pencil className="size-3.5 text-muted-foreground" />
        </button>
      </section>

      {error && (
        <p className="mb-3 rounded-2xl bg-destructive/10 px-4 py-2 text-center text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-3">
        <TactileButton
          variant="primary"
          size="lg"
          icon={busy ? <Loader2 className="size-6 animate-spin" /> : <Plus className="size-6" />}
          disabled={busy}
          onClick={onCreate}
        >
          {busy ? 'Creating…' : 'Create Room'}
        </TactileButton>

        <div className="rounded-3xl border border-border bg-card p-2 shadow-lg shadow-foreground/5">
          {!joinOpen ? (
            <TactileButton
              variant="surface"
              size="lg"
              className="border-0 shadow-none"
              icon={<LogIn className="size-6 text-primary" />}
              onClick={() => setJoinOpen(true)}
            >
              Join Room
            </TactileButton>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex flex-col gap-2 p-1"
            >
              <label
                htmlFor="room-code"
                className="px-2 pt-1 text-sm font-semibold text-muted-foreground"
              >
                Enter room code
              </label>
              <div className="flex gap-2">
                <Input
                  id="room-code"
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 5))}
                  onKeyDown={(e) => e.key === 'Enter' && onJoin()}
                  placeholder="A1B2C"
                  className="h-14 flex-1 rounded-2xl text-center font-mono text-2xl font-bold uppercase tracking-[0.4em]"
                />
                <TactileButton
                  variant="primary"
                  size="md"
                  className="h-14 w-14 min-h-14 shrink-0 rounded-2xl px-0"
                  aria-label="Join room"
                  disabled={code.length < 4}
                  onClick={onJoin}
                >
                  <ArrowRight className="size-6" />
                </TactileButton>
              </div>
            </motion.div>
          )}
        </div>

        <TactileLink
          href="/game"
          variant="accent"
          size="lg"
          icon={<Play className="size-6 fill-current" />}
        >
          Play Solo
        </TactileLink>
      </section>

      {/* Profile / identity picker */}
      <AnimatePresence>
        {profileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-end bg-foreground/40 backdrop-blur-sm sm:place-items-center"
            onClick={() => setProfileOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5 shadow-2xl sm:rounded-3xl"
            >
              <h2 className="font-heading text-xl font-bold">Pick your bird</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Choose a name & avatar to play.
              </p>

              <div className="mt-4 grid grid-cols-5 gap-2">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAvatar(a)}
                    className={cn(
                      'grid aspect-square place-items-center rounded-2xl text-2xl transition-colors',
                      a === avatar
                        ? 'bg-primary ring-2 ring-primary'
                        : 'bg-secondary hover:bg-secondary/70',
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>

              <Input
                value={name}
                autoFocus
                maxLength={16}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveProfile()}
                placeholder="Your name"
                className="mt-4 h-12 rounded-2xl text-center text-lg font-semibold"
              />

              <TactileButton
                variant="primary"
                size="lg"
                className="mt-4"
                disabled={!name.trim()}
                onClick={saveProfile}
              >
                Let&apos;s fly
              </TactileButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
