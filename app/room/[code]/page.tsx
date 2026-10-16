'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { Loader2, AlertTriangle } from 'lucide-react'
import { SkyBackdrop } from '@/components/brand/sky-backdrop'
import { TactileLink } from '@/components/brand/tactile-button'
import { LobbyScreen } from '@/components/screens/lobby-screen'
import { GameScreen } from '@/components/screens/game-screen'
import { ResultsScreen } from '@/components/screens/results-screen'
import { ReadyGate } from '@/components/game/ready-gate'
import { JoinRoomModal } from '@/components/game/join-room-modal'
import {
  getRoom,
  joinRoom,
  patchSettings,
  startGame,
  postClick,
  postReady,
  leaveRoom,
  restartRoom,
} from '@/lib/api'
import { getPlayerId, getPlayerName, getPlayerAvatar, setPlayerName } from '@/lib/identity'
import { useRoomChannel } from '@/lib/realtime/client'
import { EVENTS } from '@/lib/realtime/events'
import type {
  EventName,
  RoomUpdatePayload,
  ReadyUpdatePayload,
  RoundStartPayload,
  RoundResultPayload,
  GameOverPayload,
} from '@/lib/realtime/events'
import { DEFAULT_SETTINGS, type GameSettings, type RoomPlayer, type Standing } from '@/lib/types'
import { GAME_OBJECTS } from '@/lib/game-data'

type Status = 'lobby' | 'playing' | 'finished'

export default function RoomPage() {
  const router = useRouter()
  const params = useParams<{ code: string }>()
  const code = (params?.code ?? '').toUpperCase()

  const [playerId, setPlayerId] = useState('')
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('🦅')

  const [status, setStatus] = useState<Status>('lobby')
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)
  const [hostId, setHostId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  // join-on-invite flow
  const [needJoin, setNeedJoin] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  // pre-round hold-to-ready gate
  const [ready, setReady] = useState<ReadyUpdatePayload | null>(null)

  // live round flow
  const [round, setRound] = useState<RoundStartPayload | null>(null)
  const [result, setResult] = useState<RoundResultPayload | null>(null)
  const [standings, setStandings] = useState<Standing[]>([])
  const [winnerId, setWinnerId] = useState<string | null>(null)
  const clockOffsetRef = useRef(0)
  const [clockOffset, setClockOffset] = useState(0)

  // per-round breakdown for the local player (built from results)
  const breakdownRef = useRef<
    {
      round: number
      object: string
      emoji: string
      flies: boolean
      correct: boolean
      reactionMs: number
    }[]
  >([])
  const [breakdown, setBreakdown] = useState<typeof breakdownRef.current>([])

  // resolve identity on mount
  useEffect(() => {
    setPlayerId(getPlayerId())
    setName(getPlayerName() || 'Guest')
    setAvatar(getPlayerAvatar())
  }, [])

  // initial load + join
  useEffect(() => {
    if (!code || !playerId) return
    let cancelled = false
    ;(async () => {
      try {
        const bundle = await getRoom(code)
        if (cancelled) return
        applyBundle(bundle.players, bundle.room.settings, bundle.room.hostId, bundle.room.status)
        const alreadyIn = bundle.players.some((p) => p.id === playerId)
        // Hosts / returning members go straight in; fresh invitees confirm first.
        if (!alreadyIn) setNeedJoin(true)
        setLoading(false)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Room not found')
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, playerId])

  function applyBundle(ps: RoomPlayer[], s: GameSettings, host: string, st: Status) {
    setPlayers(ps)
    setSettings(s)
    setHostId(host)
    setStatus(st)
  }

  // realtime
  const onEvent = useCallback((event: EventName, payload: unknown) => {
    switch (event) {
      case EVENTS.ROOM_UPDATE: {
        const p = payload as RoomUpdatePayload
        setPlayers(p.players)
        setSettings(p.settings)
        setHostId(p.hostId)
        setStatus(p.status)
        // Back to the lobby (e.g. after a "New game" restart) -> wipe live state.
        if (p.status === 'lobby') {
          breakdownRef.current = []
          setBreakdown([])
          setRound(null)
          setResult(null)
          setWinnerId(null)
          setStandings([])
          setReady(null)
        }
        break
      }
      case EVENTS.GAME_START: {
        breakdownRef.current = []
        setBreakdown([])
        setRound(null)
        setResult(null)
        setWinnerId(null)
        setReady(null)
        setStatus('playing')
        break
      }
      case EVENTS.READY_UPDATE: {
        const p = payload as ReadyUpdatePayload
        setReady(p)
        setStatus('playing')
        break
      }
      case EVENTS.ROUND_START: {
        const p = payload as RoundStartPayload
        const offset = p.serverNow - Date.now()
        clockOffsetRef.current = offset
        setClockOffset(offset)
        setResult(null)
        setReady(null) // first round dismisses the ready gate
        setRound(p)
        setStatus('playing')
        break
      }
      case EVENTS.ROUND_RESULT: {
        const p = payload as RoundResultPayload
        setResult(p)
        setStandings(p.standings)
        // append local player's breakdown row
        const mine = p.results.find((r) => r.playerId === getPlayerId())
        if (mine) {
          const obj = resolveObject(p.objectId)
          breakdownRef.current = [
            ...breakdownRef.current.filter((b) => b.round !== p.round),
            {
              round: p.round,
              object: obj?.word ?? p.objectId,
              emoji: obj?.emoji ?? '❓',
              flies: p.flies,
              correct: mine.correct,
              reactionMs: mine.reactionMs ?? 0,
            },
          ].sort((a, b) => a.round - b.round)
          setBreakdown(breakdownRef.current)
        }
        break
      }
      case EVENTS.GAME_OVER: {
        const p = payload as GameOverPayload
        setStandings(p.standings)
        setWinnerId(p.winnerId)
        setStatus('finished')
        break
      }
    }
  }, [])

  const channel = useRoomChannel(code || null, playerId, onEvent)

  // presence-derived online set (falls back to server `online` flag)
  const onlineIds = new Set(channel.presence.map((m) => m.clientId))

  // ── host / player actions ──────────────────────────────────────────────────
  const patchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onChangeSettings = useCallback(
    (partial: Partial<GameSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...partial }
        if (patchTimer.current) clearTimeout(patchTimer.current)
        patchTimer.current = setTimeout(() => {
          patchSettings(code, getPlayerId(), next).catch(() => {})
        }, 250)
        return next
      })
    },
    [code],
  )

  const onChangeLanguage = useCallback(
    (lang: string) => {
      // Each player owns their language; re-join upserts it (contract-safe).
      setPlayers((prev) => prev.map((p) => (p.id === getPlayerId() ? { ...p, language: lang } : p)))
      joinRoom(code, {
        playerId: getPlayerId(),
        name: getPlayerName() || 'Guest',
        avatar: getPlayerAvatar(),
        language: lang,
      }).catch(() => {})
    },
    [code],
  )

  const onStart = useCallback(async () => {
    setStarting(true)
    try {
      await startGame(code, getPlayerId())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start game')
    } finally {
      setStarting(false)
    }
  }, [code])

  const onClick = useCallback(
    (r: number, released: boolean, clientTs: number) => {
      postClick(code, { playerId: getPlayerId(), round: r, released, clientTs }).catch(() => {})
    },
    [code],
  )

  // ── invite-join confirm ──────────────────────────────────────────────────────
  const onJoinConfirm = useCallback(
    async (joinName: string, joinAvatar: string) => {
      setJoining(true)
      setJoinError(null)
      // Persist the chosen identity so the rest of the app stays consistent.
      setPlayerName(joinName)
      if (typeof window !== 'undefined') localStorage.setItem('kauwa.playerAvatar', joinAvatar)
      setName(joinName)
      setAvatar(joinAvatar)
      try {
        const joined = await joinRoom(code, {
          playerId: getPlayerId(),
          name: joinName,
          avatar: joinAvatar,
          language: 'en',
        })
        applyBundle(joined.players, joined.room.settings, joined.room.hostId, joined.room.status)
        setNeedJoin(false)
      } catch (e) {
        setJoinError(e instanceof Error ? e.message : 'Could not join room')
      } finally {
        setJoining(false)
      }
    },
    [code],
  )

  // ── leave room ───────────────────────────────────────────────────────────────
  const onLeave = useCallback(() => {
    leaveRoom(code, getPlayerId()).catch(() => {})
    router.push('/')
  }, [code, router])

  // ── hold-to-ready ────────────────────────────────────────────────────────────
  const onReady = useCallback(() => {
    postReady(code, getPlayerId()).catch(() => {})
  }, [code])

  // ── new game in the same room ─────────────────────────────────────────────────
  const onRestart = useCallback(() => {
    restartRoom(code, getPlayerId()).catch(() => {})
    // ROOM_UPDATE(status='lobby') will drive everyone back to the lobby + reset state.
  }, [code])

  // ── render ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <>
        <SkyBackdrop />
        <main className="mx-auto grid min-h-dvh w-full max-w-md place-items-center px-5">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="grid size-16 place-items-center rounded-3xl bg-destructive/10 text-destructive">
              <AlertTriangle className="size-8" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold">Room unavailable</h1>
              <p className="mt-1 text-muted-foreground">{error}</p>
            </div>
            <TactileLink href="/" variant="primary" size="md" className="w-auto px-6">
              Back home
            </TactileLink>
          </div>
        </main>
      </>
    )
  }

  if (loading) {
    return (
      <>
        <SkyBackdrop />
        <main className="mx-auto grid min-h-dvh w-full max-w-md place-items-center px-5">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="font-semibold">Entering room {code}…</p>
          </div>
        </main>
      </>
    )
  }

  // Fresh invitee: confirm identity before joining (host/members skip this).
  if (needJoin) {
    return (
      <>
        <SkyBackdrop />
        <main className="mx-auto grid min-h-dvh w-full max-w-md place-items-center px-5">
          <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
            <p className="font-heading text-xl font-bold text-foreground">
              You&apos;re invited to room {code}
            </p>
            <p className="text-sm">
              {players.length} bird{players.length === 1 ? '' : 's'} waiting to play.
            </p>
          </div>
        </main>
        <AnimatePresence>
          <JoinRoomModal
            code={code}
            defaultName={name === 'Guest' ? '' : name}
            defaultAvatar={avatar}
            busy={joining}
            error={joinError}
            onConfirm={onJoinConfirm}
            onCancel={() => router.push('/')}
          />
        </AnimatePresence>
      </>
    )
  }

  if (status === 'finished') {
    return (
      <>
        <SkyBackdrop />
        <ResultsScreen
          standings={standings}
          playerId={playerId}
          winnerId={winnerId}
          breakdown={breakdown}
          code={code}
          onPlayAgain={onRestart}
          playAgainLabel="New Game"
        />
      </>
    )
  }

  if (status === 'playing') {
    // Hold-to-ready gate runs after Start, before round 1 is live.
    const gateActive = ready && !ready.started && !round
    if (gateActive) {
      return (
        <>
          <SkyBackdrop />
          <ReadyGate
            readyIds={ready.readyIds}
            total={ready.total}
            endsAt={ready.endsAt}
            clockOffset={clockOffset}
            playerId={playerId}
            onReady={onReady}
          />
        </>
      )
    }
    return (
      <>
        <SkyBackdrop />
        <GameScreen
          room={{
            code,
            playerId,
            name,
            avatar,
            announce: settings.announce,
            language: players.find((p) => p.id === playerId)?.language ?? 'en',
            totalRounds: settings.rounds,
            round,
            result,
            standings: standings.length ? standings : playersToStandings(players),
            clockOffset,
            onClick,
          }}
        />
      </>
    )
  }

  return (
    <>
      <SkyBackdrop />
      <LobbyScreen
        code={code}
        players={players}
        settings={settings}
        hostId={hostId}
        playerId={playerId}
        onlineIds={onlineIds}
        connected={channel.connected}
        starting={starting}
        onChangeSettings={onChangeSettings}
        onChangeLanguage={onChangeLanguage}
        onStart={onStart}
        onLeave={onLeave}
      />
    </>
  )
}

function playersToStandings(players: RoomPlayer[]): Standing[] {
  return [...players]
    .sort((a, b) => b.score - a.score)
    .map((p) => ({
      playerId: p.id,
      name: p.name,
      avatar: p.avatar,
      score: p.score,
      eliminated: p.eliminated,
    }))
}

function resolveObject(objectId: string) {
  const o = GAME_OBJECTS.find((g) => g.id === objectId)
  if (!o) return null
  return { emoji: o.emoji, word: o.words.en ?? objectId }
}
