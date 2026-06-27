// ─────────────────────────────────────────────────────────────────────────────
// Server-side Ably publish (REST). Implemented by PLATFORM agent.
// BACKEND agent (workflow + API routes) imports `publish` to push room events.
// Keep this signature stable.
// ─────────────────────────────────────────────────────────────────────────────
import * as Ably from 'ably'
import type { EventName } from './events'
import { roomChannel } from './events'

// Lazily-created REST client. We do NOT instantiate at module load so that an
// empty/missing ABLY_API_KEY does not crash server start — we only throw when
// `publish` is actually called without a key configured.
let rest: Ably.Rest | null = null

function getRest(): Ably.Rest {
  const key = process.env.ABLY_API_KEY?.trim()
  if (!key) {
    throw new Error('ABLY_API_KEY is not set — cannot publish realtime events.')
  }
  if (!rest) {
    rest = new Ably.Rest(key)
  }
  return rest
}

/** Publish an event to a room channel via Ably REST (server-side, uses ABLY_API_KEY). */
export async function publish(code: string, event: EventName, payload: unknown): Promise<void> {
  await getRest().channels.get(roomChannel(code)).publish(event, payload)
}
