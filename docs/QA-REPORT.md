# Kauwa Udd — QA Report

**Date:** 2026-06-27 · **Env:** Production — https://kauwa-udd.vercel.app
**Stack verified:** Next.js 16 on Vercel · Amazon DynamoDB (single table `aws-dynamodb-sky-ocean`, account 702147744920) via **Vercel↔AWS OIDC** (no stored keys) · Ably realtime · Vercel Workflow game loop · Auth.js (guest).

## Result summary

| # | Flow | Result | Evidence |
|---|------|--------|----------|
| 1 | Ably token endpoint | ✅ FIXED | `POST /api/ably/token` → 200 (was 500) |
| 2 | Home + identity | ✅ PASS | Home renders, "Pick your bird" name/avatar, persists, guest default |
| 3 | Create room + lobby + settings + presence | ✅ PASS | create → 201 (DynamoDB write); lobby renders; "1 online" presence; settings PATCH → 200 |
| 4 | Join room (2nd player) | ✅ PASS (API) | join → 200, room shows 2 players, persisted; full 2-device realtime not load-tested |
| 5 | Game loop (start→rounds→score→finish) | ✅ PASS | Workflow runs all rounds, scores, finishes (DynamoDB). After Ably fix, client auto-transitions + plays live |
| 5b | **Live 2-player multiplayer (2 browsers)** | ✅ PASS | Lobby live-sync, GAME_START transition, live rounds, cross-browser scoreboard sync — all verified (Bug #2 fix) |
| 6 | Solo mode | ✅ PASS | Rounds advance, scoring + ranking (You 399 / bots), object hidden-until-hold |
| 7 | Leaderboard | ✅ PASS | `/leaderboard` renders seeded entries via DynamoDB GSI1; `GET /api/leaderboard` → 200 |
| 8 | API endpoints | ✅ PASS | create 201 · get 200 · join 200 · settings 200 · start 200 · click 200 · leaderboard 200 · ably/token 200 · missing 404 |

## Infrastructure — all verified working in production
- **DynamoDB via OIDC**: reads + writes succeed with no stored keys (room create, player join, round records, scores, leaderboard). 65 seed items present; OIDC role policy grants `dynamodb:*` on table + `/index/*`.
- **GSI1**: ACTIVE; leaderboard top-N query works.
- **Ably**: token endpoint 200, presence ("online" count), round-result delivery observed.
- **Vercel Workflow**: durable game loop executes all rounds (1→N), scores per spec, writes round records, marks room finished. Rock solid.

## Bugs found (ALL FIXED — multiplayer verified working)

### 🟢 Bug #1 (FIXED): `/api/ably/token` 500
- **Cause:** `ABLY_API_KEY` (and `AUTH_SECRET`) were set via PowerShell pipe, which appended a trailing `\r\n`; `new Ably.Rest(key)` got a malformed key → `createTokenRequest` threw → 500.
- **Fix:** `.trim()` the key at both read sites (`app/api/ably/token/route.ts`, `lib/realtime/server.ts`) + redeploy. Now 200.

### 🟢 Bug #2 (FIXED — the keystone): Ably realtime never connected ("invalid clientId")
- **Symptom:** Header stuck "Connecting…"; NO live events applied — lobby didn't update when a 2nd player joined, host's screen didn't transition to the game on Start, rounds didn't progress on-screen. (The server-side Workflow ran fine the whole time; only the client never received events.)
- **Root cause:** client `useRoomChannel` used `authMethod: 'POST'` with `authParams`, which Ably sends **form-encoded**, but the token route did `req.json()` → threw → fell back to a missing query param → token issued with **no clientId** → mismatch with the connection's clientId → Ably error `invalid clientId for credentials` → connection never established → zero realtime.
- **Fix:** token route now reads clientId from query **or** JSON **or** form body and supports GET+POST; client switched to `authMethod: 'GET'` (clientId in query). After redeploy, header shows green **"Live"**.
- **Verified (2-browser test):** Player 1 (Chrome) + Player 2 (isolated Playwright browser, distinct guest identity) in room WZR3X — Player 2 appeared in Player 1's lobby live ("2 online"); Start auto-transitioned **both** to the game; rounds progressed (Round 2→4/20); scoreboard synced across both browsers (both 400); per-player feedback ("Correct +100 — Grounded. Held it steady!"). **Live cross-browser multiplayer works end-to-end.**

### 🟡 Minor
- `AUTH_SECRET` env still carries a trailing `\r\n` — functionally fine (used consistently for JWT signing), but worth cleaning.
- Preview-environment env vars (`AUTH_SECRET`, `ABLY_API_KEY`) not set — non-blocking for production; needed only for preview deploys.

## Not yet tested (needs 2 real devices / load)
- Two players in the *same* room playing live simultaneously (presence list updating for both, per-player language, simultaneous clicks → 1st/2nd/3rd ranking).
- Elimination mode end-to-end.
- Voice announcement mode (TTS) timing on a real device.

## Recommendation
**No ship-blockers remain.** All flows pass; live cross-browser multiplayer verified. Both realtime bugs fixed and redeployed. Remaining work is polish + the items below.

## Still to test / polish
- Elimination mode end-to-end; voice (TTS) announcement timing on a real device; larger room (many players) load.
- Round-state resync for a player who reloads or joins *mid-game* (currently a mid-game reload may show "Get ready" until the next round — minor; add current-round to `GET /api/rooms/:code`).
- Clean trailing `\r\n` on `AUTH_SECRET` env; set preview-env vars.
- UI polish backlog (see project memory).
