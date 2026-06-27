'use client'
// ─────────────────────────────────────────────────────────────────────────────
// Tiny Text-to-Speech wrapper (TTS-first, swappable).
// Uses the browser Web Speech API (window.speechSynthesis). The public surface is
// deliberately small — `speak`/`cancelSpeech`/`isTtsSupported` — so the engine can
// later be swapped for a server/AI TTS without touching callers.
// ─────────────────────────────────────────────────────────────────────────────

/** Map our app language codes (lib/game-data LANGUAGES) -> BCP-47 voice locales. */
const BCP47: Record<string, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  es: 'es-ES',
  fr: 'fr-FR',
  pt: 'pt-BR',
  ja: 'ja-JP',
}

export function toBcp47(langCode: string): string {
  return BCP47[langCode] ?? langCode ?? 'en-US'
}

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function pickVoice(locale: string): SpeechSynthesisVoice | undefined {
  if (!isTtsSupported()) return undefined
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return undefined
  const lower = locale.toLowerCase()
  return (
    voices.find((v) => v.lang.toLowerCase() === lower) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(lower.slice(0, 2)))
  )
}

/**
 * Speak `text` in the given app language code. No-ops gracefully when TTS is
 * unavailable. Cancels any in-flight utterance first so announcements never overlap.
 */
export function speak(text: string, langCode = 'en'): void {
  if (!isTtsSupported() || !text) return
  try {
    const synth = window.speechSynthesis
    synth.cancel()
    const locale = toBcp47(langCode)
    const u = new SpeechSynthesisUtterance(text)
    u.lang = locale
    u.rate = 1.05
    u.pitch = 1.05
    const v = pickVoice(locale)
    if (v) u.voice = v
    synth.speak(u)
  } catch {
    /* TTS is best-effort; never let it break the game loop */
  }
}

export function cancelSpeech(): void {
  if (!isTtsSupported()) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* ignore */
  }
}
