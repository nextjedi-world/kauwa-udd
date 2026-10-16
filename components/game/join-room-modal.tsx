'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, LogIn } from 'lucide-react'
import { TactileButton } from '@/components/brand/tactile-button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const AVATARS = ['🦅', '🦉', '🦜', '🕊️', '🐧', '🦚', '🐤', '🦆', '🦢', '🐦']

export interface JoinRoomModalProps {
  code: string
  defaultName: string
  defaultAvatar: string
  busy?: boolean
  error?: string | null
  onConfirm: (name: string, avatar: string) => void
  onCancel: () => void
}

export function JoinRoomModal({
  code,
  defaultName,
  defaultAvatar,
  busy,
  error,
  onConfirm,
  onCancel,
}: JoinRoomModalProps) {
  const [name, setName] = useState(defaultName)
  const [avatar, setAvatar] = useState(defaultAvatar || AVATARS[0])

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed || busy) return
    onConfirm(trimmed, avatar)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-end bg-foreground/40 backdrop-blur-sm sm:place-items-center"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5 shadow-2xl sm:rounded-3xl"
      >
        <h2 className="font-heading text-xl font-bold">
          Join room <span className="font-mono tracking-[0.2em] text-primary">{code}</span>?
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Pick your bird &amp; name, then jump into the flock.
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
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Your name"
          className="mt-4 h-12 rounded-2xl text-center text-lg font-semibold"
        />

        {error && (
          <p className="mt-3 rounded-2xl bg-destructive/10 px-4 py-2 text-center text-sm font-semibold text-destructive">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-3">
          <TactileButton
            variant="ghost"
            size="lg"
            className="flex-1"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </TactileButton>
          <TactileButton
            variant="primary"
            size="lg"
            className="flex-[1.4]"
            disabled={!name.trim() || busy}
            onClick={submit}
            icon={busy ? <Loader2 className="size-6 animate-spin" /> : <LogIn className="size-6" />}
          >
            {busy ? 'Joining…' : 'Join'}
          </TactileButton>
        </div>
      </motion.div>
    </motion.div>
  )
}
