'use client'
// Stable per-browser player identity for guests. Signed-in users override with
// their auth user id (PLATFORM agent merges guest progress on sign-in).
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { nanoid } from 'nanoid'

const KEY = 'kauwa.playerId'
const NAME_KEY = 'kauwa.playerName'
const AVATAR_KEY = 'kauwa.playerAvatar'

const BIRD_AVATARS = ['🦅', '🦉', '🦜', '🕊️', '🐧', '🦚', '🐤', '🦆', '🦢', '🐦']

export function getPlayerId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = `guest_${nanoid(10)}`
    localStorage.setItem(KEY, id)
  }
  return id
}

export function getPlayerName(): string {
  if (typeof window === 'undefined') return 'Guest'
  return localStorage.getItem(NAME_KEY) ?? ''
}

export function setPlayerName(name: string) {
  if (typeof window !== 'undefined') localStorage.setItem(NAME_KEY, name)
}

export function getPlayerAvatar(): string {
  if (typeof window === 'undefined') return '🦅'
  let a = localStorage.getItem(AVATAR_KEY)
  if (!a) {
    a = BIRD_AVATARS[Math.floor(Math.random() * BIRD_AVATARS.length)]
    localStorage.setItem(AVATAR_KEY, a)
  }
  return a
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth integration (PLATFORM agent). The pieces above are the guest-only source
// of truth; the helpers below merge that with a next-auth session when present.
// ─────────────────────────────────────────────────────────────────────────────

/** Remembers the guest id a signed-in account was upgraded from (for progress merge). */
const MERGED_FROM_KEY = 'kauwa.mergedFromGuestId'

/**
 * Called when a guest signs in. Carries the guest's chosen name/avatar onto the
 * account profile and records which guest id this user came from, so the backend
 * can merge prior guest progress into the user. Safe to call repeatedly.
 */
export function mergeGuestIntoUser(userId: string): { from: string | null } {
  if (typeof window === 'undefined') return { from: null }
  const guestId = localStorage.getItem(KEY)
  // Only record a merge if there was a real, different guest identity before.
  if (guestId && guestId !== userId && guestId.startsWith('guest_')) {
    localStorage.setItem(MERGED_FROM_KEY, guestId)
  }
  // Keep name/avatar so the signed-in profile is seeded from the guest's choices.
  if (!localStorage.getItem(NAME_KEY)) localStorage.setItem(NAME_KEY, 'Guest')
  if (!localStorage.getItem(AVATAR_KEY)) getPlayerAvatar()
  return { from: localStorage.getItem(MERGED_FROM_KEY) }
}

export interface Identity {
  /** Effective player id: the auth user id when signed in, else the guest id. */
  playerId: string
  name: string
  avatar: string
  isGuest: boolean
  /** True once a next-auth session is loaded (vs anonymous guest). */
  signedIn: boolean
}

/**
 * Unified identity hook. Returns the signed-in user's id when a next-auth session
 * exists, otherwise the stable localStorage guest id. Also surfaces name + avatar
 * (session values take precedence, falling back to the local guest profile).
 * Reads localStorage in an effect to avoid SSR/hydration mismatches.
 */
export function useIdentity(): Identity {
  const { data: session, status } = useSession()
  const [guest, setGuest] = useState({ id: '', name: '', avatar: '🦅' })

  useEffect(() => {
    setGuest({ id: getPlayerId(), name: getPlayerName(), avatar: getPlayerAvatar() })
  }, [])

  const user = session?.user
  const signedIn = status === 'authenticated' && !!user
  const userIsGuest = (user as { isGuest?: boolean } | undefined)?.isGuest ?? false

  // When a non-guest account signs in, merge guest progress once it's known.
  useEffect(() => {
    if (signedIn && user?.id && !userIsGuest) mergeGuestIntoUser(user.id)
  }, [signedIn, user?.id, userIsGuest])

  return {
    playerId: (signedIn && user?.id) || guest.id,
    name: (signedIn && user?.name) || guest.name,
    avatar: (signedIn && user?.image) || guest.avatar,
    isGuest: !signedIn || userIsGuest,
    signedIn,
  }
}
