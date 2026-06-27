# Kauwa Udd — HTTP API contract

Frontend calls these; backend implements them. Identity = `playerId`
(guest: client-generated nanoid persisted in localStorage; signed-in: auth user id),
sent in the JSON body unless noted. All responses JSON.

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/rooms` | `{ hostName, hostAvatar, visibility, settings? }` | `{ code, playerId, room }` |
| GET | `/api/rooms/:code` | — | `{ room, players }` |
| POST | `/api/rooms/:code/join` | `{ playerId, name, avatar, language }` | `{ room, players }` |
| PATCH | `/api/rooms/:code/settings` | `{ playerId, settings }` (host only) | `{ ok: true }` |
| POST | `/api/rooms/:code/start` | `{ playerId }` (host only → triggers Workflow) | `{ ok: true }` |
| POST | `/api/rooms/:code/click` | `{ playerId, round, released, clientTs }` | `{ ok: true }` |
| GET | `/api/leaderboard?period=daily\|weekly&scope=global` | — | `{ entries: LeaderEntry[], you?: LeaderEntry }` |
| POST | `/api/ably/token` | `{ clientId }` | Ably `TokenRequest` (for client SDK auth) |
| * | `/api/auth/*` | — | handled by Auth.js (next-auth v5) |

Notes:
- Types come from `lib/types.ts` (Room, RoomPlayer, GameSettings, LeaderEntry from game-data.ts).
- Realtime state changes (room/settings/players, round start/result, game over) are pushed
  over **Ably** per `lib/realtime/events.ts` — the frontend subscribes; these REST calls just mutate.
- `/start` triggers the durable game Workflow; the loop drives `round:start` / `round:result` / `game:over`.
- Guests need no auth. Signed-in users (Auth.js) get a stable `playerId` = user id; merge guest progress on sign-in.
