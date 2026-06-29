'use client'
// ─────────────────────────────────────────────────────────────────────────────
// Synthesized sound effects (Web Audio API). NO audio files — every sound is
// generated from oscillators, so it's 100% license-safe and zero-asset.
// A single AudioContext is created lazily on first play (must follow a user
// gesture, which the game guarantees since play starts on a tap).
// ─────────────────────────────────────────────────────────────────────────────

export type SfxName =
  | 'roundStart'
  | 'reveal'
  | 'correct'
  | 'bonus'
  | 'penalty'
  | 'hold'
  | 'tick'
  | 'eliminate'
  | 'win'
  | 'lose'
  | 'ready'

const MUTE_KEY = 'kauwa.muted'

let ctx: AudioContext | null = null
let muted = false
let muteLoaded = false

function loadMute(): void {
  if (muteLoaded || typeof window === 'undefined') return
  try {
    muted = localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    /* ignore */
  }
  muteLoaded = true
}

export function isMuted(): boolean {
  loadMute()
  return muted
}

export function setMuted(b: boolean): void {
  muted = b
  muteLoaded = true
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(MUTE_KEY, b ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (ctx) return ctx
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  try {
    ctx = new AC()
  } catch {
    return null
  }
  return ctx
}

type WaveType = OscillatorType

/** Play a single tone with a short ADSR-ish gain envelope. */
function tone(
  ac: AudioContext,
  freq: number,
  start: number,
  dur: number,
  opts: { type?: WaveType; gain?: number } = {},
): void {
  const { type = 'sine', gain = 0.18 } = opts
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  // Quick attack, smooth exponential release — keeps it pleasant, no clicks.
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(gain, start + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(g)
  g.connect(ac.destination)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

/** Play a sequence of notes [freq, offsetSec, durSec]. */
function seq(
  ac: AudioContext,
  notes: Array<[number, number, number]>,
  opts: { type?: WaveType; gain?: number } = {},
): void {
  const t0 = ac.currentTime
  for (const [freq, off, dur] of notes) tone(ac, freq, t0 + off, dur, opts)
}

// Note frequencies (equal temperament).
const N = {
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880.0,
  C6: 1046.5,
  E6: 1318.51,
  G6: 1567.98,
  C4: 261.63,
  E4: 329.63,
  G4: 392.0,
  A3: 220.0,
  D4: 293.66,
}

export function playSfx(name: SfxName): void {
  if (isMuted()) return
  const ac = getCtx()
  if (!ac) return
  // Browsers may suspend the context until a gesture — resume best-effort.
  if (ac.state === 'suspended') ac.resume().catch(() => {})

  switch (name) {
    case 'roundStart':
      seq(ac, [[N.G4, 0, 0.1], [N.C5, 0.09, 0.16]], { type: 'triangle' })
      break
    case 'reveal':
      seq(ac, [[N.E5, 0, 0.08], [N.A5, 0.07, 0.14]], { type: 'sine' })
      break
    case 'correct':
      // rising two-note
      seq(ac, [[N.E5, 0, 0.1], [N.A5, 0.09, 0.16]], { type: 'sine' })
      break
    case 'bonus':
      // bright triad
      seq(ac, [[N.C6, 0, 0.12], [N.E6, 0.06, 0.12], [N.G6, 0.12, 0.18]], {
        type: 'triangle',
        gain: 0.16,
      })
      break
    case 'penalty':
      // low buzzer
      seq(ac, [[N.A3, 0, 0.22]], { type: 'sawtooth', gain: 0.14 })
      seq(ac, [[110, 0, 0.22]], { type: 'square', gain: 0.06 })
      break
    case 'hold':
      seq(ac, [[N.C5, 0, 0.12]], { type: 'sine', gain: 0.12 })
      break
    case 'tick':
      // short blip
      seq(ac, [[N.A5, 0, 0.05]], { type: 'square', gain: 0.1 })
      break
    case 'eliminate':
      // descending two-note thud
      seq(ac, [[N.D5, 0, 0.12], [N.A3, 0.1, 0.22]], { type: 'sawtooth', gain: 0.13 })
      break
    case 'win':
      // ascending fanfare
      seq(
        ac,
        [
          [N.C5, 0, 0.12],
          [N.E5, 0.1, 0.12],
          [N.G5, 0.2, 0.12],
          [N.C6, 0.3, 0.24],
        ],
        { type: 'triangle', gain: 0.18 },
      )
      break
    case 'lose':
      // descending sigh
      seq(
        ac,
        [
          [N.G4, 0, 0.14],
          [N.E4, 0.12, 0.14],
          [N.C4, 0.24, 0.26],
        ],
        { type: 'sine', gain: 0.14 },
      )
      break
    case 'ready':
      seq(ac, [[N.C5, 0, 0.1], [N.G5, 0.1, 0.16]], { type: 'triangle' })
      break
  }
}
