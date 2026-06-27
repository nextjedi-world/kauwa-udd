'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, LogIn, Play, Sparkles, Trophy, ArrowRight } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { TactileButton, TactileLink } from '@/components/brand/tactile-button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function HomeScreen() {
  const router = useRouter()
  const [joinOpen, setJoinOpen] = useState(false)
  const [code, setCode] = useState('')
  const [guest, setGuest] = useState(true)

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
      </section>

      <section className="flex flex-col gap-3">
        <TactileLink href="/lobby" variant="primary" size="lg" icon={<Plus className="size-6" />}>
          Create Room
        </TactileLink>

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
              <label htmlFor="room-code" className="px-2 pt-1 text-sm font-semibold text-muted-foreground">
                Enter room code
              </label>
              <div className="flex gap-2">
                <Input
                  id="room-code"
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 5))}
                  placeholder="A1B2C"
                  className="h-14 flex-1 rounded-2xl text-center font-mono text-2xl font-bold uppercase tracking-[0.4em]"
                />
                <TactileButton
                  variant="primary"
                  size="md"
                  className="h-14 w-14 min-h-14 shrink-0 rounded-2xl px-0"
                  aria-label="Join room"
                  disabled={code.length < 4}
                  onClick={() => router.push('/lobby')}
                >
                  <ArrowRight className="size-6" />
                </TactileButton>
              </div>
            </motion.div>
          )}
        </div>

        <TactileLink href="/game" variant="accent" size="lg" icon={<Play className="size-6 fill-current" />}>
          Play Solo
        </TactileLink>
      </section>

      <footer className="mt-8 flex items-center justify-center gap-1 text-sm">
        <button
          onClick={() => setGuest(false)}
          className={cn(
            'rounded-full px-4 py-2 font-semibold transition-colors',
            !guest ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Sign in
        </button>
        <span className="text-muted-foreground/50">·</span>
        <button
          onClick={() => setGuest(true)}
          className={cn(
            'rounded-full px-4 py-2 font-semibold transition-colors',
            guest ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Continue as guest
        </button>
      </footer>
    </main>
  )
}
