'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Megaphone, Eye, Play, Volume2, VolumeX } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { TactileButton } from '@/components/brand/tactile-button'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LANGUAGES } from '@/lib/game-data'
import { getSoloPrefs, setSoloPrefs, type SoloPrefs } from '@/lib/prefs'
import { setMuted } from '@/lib/sfx'
import type { AnnounceMode } from '@/lib/types'
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
                layoutId="solo-seg-active"
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

export interface SoloSetupProps {
  onStart: (prefs: SoloPrefs) => void
}

export function SoloSetup({ onStart }: SoloSetupProps) {
  const [prefs, setPrefs] = useState<SoloPrefs | null>(null)

  useEffect(() => {
    setPrefs(getSoloPrefs())
  }, [])

  if (!prefs) {
    return <main className="mx-auto min-h-dvh w-full max-w-md px-5" />
  }

  const update = (partial: Partial<SoloPrefs>) => {
    setPrefs((prev) => {
      const next = { ...(prev as SoloPrefs), ...partial }
      setSoloPrefs(partial)
      return next
    })
  }

  const start = () => {
    setMuted(!prefs.sound) // bridge prefs.sound -> global SFX mute
    onStart(prefs)
  }

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
        <span className="inline-flex h-10 items-center rounded-2xl bg-accent px-3 text-sm font-bold text-accent-foreground">
          Solo
        </span>
      </header>

      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 font-heading text-3xl font-bold"
      >
        Solo practice
      </motion.h1>
      <p className="mt-1 text-muted-foreground">Tune your run, then take on the bots.</p>

      <section className="mt-6 space-y-4">
        {/* Rounds */}
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <label className="font-semibold">Rounds</label>
            <span className="rounded-full bg-primary px-3 py-1 font-mono text-sm font-bold text-primary-foreground">
              {prefs.rounds}
            </span>
          </div>
          <Slider
            value={[prefs.rounds]}
            min={5}
            max={30}
            step={1}
            onValueChange={(v) => {
              const next = Array.isArray(v) ? v[0] : v
              if (typeof next === 'number') update({ rounds: next })
            }}
            className="mt-4"
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>5</span>
            <span>30</span>
          </div>
        </div>

        {/* Announce */}
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <label className="font-semibold">Announcements</label>
          <p className="mb-3 mt-0.5 text-sm text-muted-foreground">
            Voice speaks the word and hides the image until the last moment. Visual shows it right
            away.
          </p>
          <Segmented
            value={prefs.announce}
            onChange={(v) => update({ announce: v as AnnounceMode })}
            options={[
              { value: 'voice', label: 'Voice', icon: <Megaphone className="size-4" /> },
              { value: 'visual', label: 'Visual', icon: <Eye className="size-4" /> },
            ]}
          />
        </div>

        {/* Language */}
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <label className="font-semibold">Language</label>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Words are shown &amp; spoken in this language.
              </p>
            </div>
            <Select value={prefs.language} onValueChange={(v) => update({ language: v as string })}>
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
          </div>
        </div>

        {/* Sound */}
        <button
          onClick={() => update({ sound: !prefs.sound })}
          className="flex w-full items-center justify-between rounded-3xl border border-border bg-card p-4 text-left shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'grid size-10 place-items-center rounded-2xl',
                prefs.sound ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground',
              )}
            >
              {prefs.sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
            </span>
            <div>
              <p className="font-semibold">Sound effects</p>
              <p className="text-sm text-muted-foreground">{prefs.sound ? 'On' : 'Off'}</p>
            </div>
          </div>
          <span
            className={cn(
              'relative h-7 w-12 rounded-full transition-colors',
              prefs.sound ? 'bg-primary' : 'bg-secondary',
            )}
          >
            <span
              className={cn(
                'absolute top-1 size-5 rounded-full bg-card shadow transition-all',
                prefs.sound ? 'left-6' : 'left-1',
              )}
            />
          </span>
        </button>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md bg-gradient-to-t from-background via-background to-transparent px-5 pb-6 pt-8">
        <TactileButton
          variant="primary"
          size="lg"
          onClick={start}
          icon={<Play className="size-6 fill-current" />}
        >
          Start Solo
        </TactileButton>
      </div>
    </main>
  )
}
