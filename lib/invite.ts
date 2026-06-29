'use client'
// ─────────────────────────────────────────────────────────────────────────────
// Invite / share helpers. Build room + leaderboard URLs and a friendly invite
// message, and share them via the Web Share API with a clipboard fallback.
// All helpers are SSR-safe (guard for `window`).
// ─────────────────────────────────────────────────────────────────────────────

function origin(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

/** Canonical join URL for a room, e.g. https://app/room/AB12C */
export function buildRoomUrl(code: string): string {
  return `${origin()}/room/${code.toUpperCase()}`
}

/** Public, read-only cumulative standings URL for a room. */
export function buildLeaderboardUrl(code: string): string {
  return `${origin()}/room/${code.toUpperCase()}/leaderboard`
}

/** Friendly multi-line invite message a host can paste anywhere. */
export function buildInviteMessage(code: string, hostName?: string): string {
  const who = hostName ? `${hostName} invited you to` : 'Join my'
  return [
    `🐦 ${who} Kauwa Udd game!`,
    'Hold, release, react — last bird wins the sky 🪶',
    `👉 ${buildRoomUrl(code)}`,
    `(Room code: ${code.toUpperCase()})`,
  ].join('\n')
}

export type ShareResult = 'shared' | 'copied' | 'failed'

/**
 * Try the native share sheet; fall back to copying text+url to the clipboard.
 * - 'shared' when the OS share sheet was used (or the user cancelled it).
 * - 'copied' when we fell back to the clipboard.
 * - 'failed' when neither path worked.
 */
export async function shareOrCopy(data: {
  title: string
  text: string
  url: string
}): Promise<ShareResult> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'failed'

  const nav = navigator as Navigator & {
    canShare?: (d?: ShareData) => boolean
  }

  // 1) Native share sheet
  if (typeof nav.share === 'function' && (nav.canShare?.(data) ?? true)) {
    try {
      await nav.share(data)
      return 'shared'
    } catch (err) {
      // User dismissed the sheet — treat as a (non-error) successful share.
      if (err instanceof DOMException && err.name === 'AbortError') return 'shared'
      // Otherwise fall through to the clipboard fallback.
    }
  }

  // 2) Clipboard fallback
  try {
    const payload = data.text ? `${data.text}\n${data.url}` : data.url
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload)
      return 'copied'
    }
  } catch {
    /* fall through */
  }

  return 'failed'
}
