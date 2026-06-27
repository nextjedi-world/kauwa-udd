'use client'
// ─────────────────────────────────────────────────────────────────────────────
// Browser Ably client + room subscription hook. Implemented by PLATFORM agent.
// Frontend (FRONTEND agent) consumes this stable interface; do not change signatures.
// Auth: token-based via POST /api/ably/token (server holds ABLY_API_KEY).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import * as Ably from 'ably'
import type { EventName } from './events'
import { roomChannel } from './events'

export type RoomEventHandler = (event: EventName, payload: unknown) => void

export interface RoomChannel {
  /** Ably presence members currently in the room (online players). */
  presence: { clientId: string; data?: unknown }[]
  /** Connection state for UI affordances. */
  connected: boolean
}

/**
 * Subscribe to a room's realtime channel. Calls `onEvent` for every EVENTS.* message,
 * and tracks presence (join/leave). Returns presence + connection state.
 */
export function useRoomChannel(
  code: string | null,
  clientId: string,
  onEvent: RoomEventHandler,
): RoomChannel {
  const [presence, setPresence] = useState<{ clientId: string; data?: unknown }[]>([])
  const [connected, setConnected] = useState(false)
  const ref = useRef(onEvent)
  ref.current = onEvent

  useEffect(() => {
    if (!code || !clientId) return

    let cancelled = false
    // Token auth: the browser never sees ABLY_API_KEY. The auth endpoint signs a
    // TokenRequest scoped to this clientId. authMethod=GET so clientId is sent as a
    // query param the server reads reliably (POST form-encoding broke clientId).
    const realtime = new Ably.Realtime({
      authUrl: '/api/ably/token',
      authMethod: 'GET',
      authParams: { clientId },
      clientId,
    })

    const channel = realtime.channels.get(roomChannel(code))

    const onConnStateChange = (change: Ably.ConnectionStateChange) => {
      if (cancelled) return
      setConnected(change.current === 'connected')
    }
    realtime.connection.on(onConnStateChange)

    // Forward every game event to the consumer.
    const onMessage = (msg: Ably.Message) => {
      if (cancelled) return
      ref.current((msg.name ?? '') as EventName, msg.data)
    }
    void channel.subscribe(onMessage)

    // ── Presence ──
    const refreshPresence = async () => {
      try {
        const members = await channel.presence.get()
        if (cancelled) return
        setPresence(
          members.map((m) => ({ clientId: m.clientId, data: m.data })),
        )
      } catch {
        // presence read can fail transiently while (re)connecting — ignore
      }
    }

    const onPresenceChange = (_msg: Ably.PresenceMessage) => {
      // enter | leave | present | update — re-read the full set for a clean snapshot
      void refreshPresence()
    }
    void channel.presence.subscribe(onPresenceChange)

    // Enter presence once connected, then seed the initial member list.
    const enter = async () => {
      try {
        await channel.presence.enter({ clientId })
        await refreshPresence()
      } catch {
        // ignore — will be retried by presence subscription / reconnect
      }
    }

    const onceConnected = () => void enter()
    if (realtime.connection.state === 'connected') {
      onceConnected()
    } else {
      realtime.connection.once('connected', onceConnected)
    }

    return () => {
      cancelled = true
      realtime.connection.off(onConnStateChange)
      try {
        channel.presence.unsubscribe(onPresenceChange)
        channel.unsubscribe(onMessage)
        // Best-effort graceful leave; close() also clears presence server-side.
        void channel.presence.leave().catch(() => {})
      } catch {
        // ignore teardown errors
      }
      realtime.close()
    }
  }, [code, clientId])

  return { presence, connected }
}
