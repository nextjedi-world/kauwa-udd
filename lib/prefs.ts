'use client'
// ─────────────────────────────────────────────────────────────────────────────
// Solo-mode preferences, persisted in localStorage. SSR-safe (returns defaults
// when there's no window). Language codes match lib/game-data LANGUAGES.
// ─────────────────────────────────────────────────────────────────────────────

import type { AnnounceMode } from './types'

const KEY = 'kauwa.soloPrefs'

export interface SoloPrefs {
  rounds: number
  announce: AnnounceMode // 'voice' | 'visual'
  language: string
  sound: boolean
}

export const DEFAULT_SOLO_PREFS: SoloPrefs = {
  rounds: 8,
  announce: 'voice',
  language: 'en',
  sound: true,
}

export function getSoloPrefs(): SoloPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_SOLO_PREFS }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_SOLO_PREFS }
    const parsed = JSON.parse(raw) as Partial<SoloPrefs>
    // Merge over defaults so missing/legacy keys are always populated.
    return { ...DEFAULT_SOLO_PREFS, ...parsed }
  } catch {
    return { ...DEFAULT_SOLO_PREFS }
  }
}

export function setSoloPrefs(p: Partial<SoloPrefs>): SoloPrefs {
  const next = { ...getSoloPrefs(), ...p }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* ignore quota/availability errors */
    }
  }
  return next
}
