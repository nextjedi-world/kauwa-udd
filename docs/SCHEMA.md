# Kauwa Udd — DynamoDB Schema (the data-model contract)

Two DynamoDB tables. Local dev runs them in **DynamoDB Local** (`pnpm db:local` + `pnpm db:setup`); prod via Vercel OIDC.

---

## Table 1: `kauwa-udd` (game domain — single-table design)

Keys: `PK` (S, HASH), `SK` (S, RANGE).
GSI **`GSI1`**: `GSI1PK` (S, HASH), `GSI1SK` (S, RANGE) — used for leaderboard top-N.

| Entity | PK | SK | GSI1PK | GSI1SK | Attributes |
|---|---|---|---|---|---|
| Content object | `OBJ#<id>` | `META` | — | — | emoji, flies (bool), words (map lang→str), category, difficulty |
| Room (session) | `ROOM#<code>` | `META` | — | — | hostId, status, visibility, settings (map), createdAt, ttl |
| Room player | `ROOM#<code>` | `PLAYER#<playerId>` | — | — | name, avatar, isHost, online, language, score, eliminated, joinedAt |
| Live round | `ROOM#<code>` | `ROUND#<n>` | — | — | objectId, startedAt, endsAt |
| Click (buffer) | `ROOM#<code>` | `CLICK#<n>#<playerId>` | — | — | released (bool), clientTs, serverTs, ttl |
| Game history | `GAME#<id>` | `META` | — | — | roomCode, settings, players, finishedAt |
| User stats | `USER#<id>` | `STATS` | — | — | gamesPlayed, wins, xp, bestScore |
| Leaderboard entry | `LB#<period>#<scope>` | `USER#<id>` | `LB#<period>#<scope>` | `<score20>#<userId>` | name, avatar, score, period, scope |

Notes:
- `<period>` ∈ `DAILY#<YYYY-MM-DD>` \| `WEEKLY#<YYYY-Www>` \| `ALL`. `<scope>` ∈ `GLOBAL` (room scope later).
- `<score20>` = score zero-padded to 20 digits (string sort = numeric desc via `ScanIndexForward:false`).
- **Top-N leaderboard:** Query `GSI1` where `GSI1PK = LB#<period>#<scope>`, `ScanIndexForward:false`, `Limit:N`.
- Clicks + rooms carry a `ttl` (epoch seconds) for auto-cleanup of ephemeral game data.
- Content can be loaded in bulk at game start (BatchGet / Scan of `OBJ#`), cached in the Workflow.

## Access patterns
- Create/get room → `ROOM#<code>` / `META`.
- List room players → Query `PK=ROOM#<code>`, `begins_with(SK,'PLAYER#')`.
- Record click → Put `ROOM#<code>` / `CLICK#<n>#<playerId>`.
- Read round clicks (Workflow, at boundary) → Query `PK=ROOM#<code>`, `begins_with(SK,'CLICK#<n>#')`.
- Update score → UpdateItem on the PLAYER item.
- Leaderboard top-N → GSI1 query (above). Write/update entry on game over.
- User stats → `USER#<id>` / `STATS`.

---

## Table 2: `kauwa-udd-auth` (Auth.js)

Standard `@auth/dynamodb-adapter` schema. Keys `pk` (S, HASH), `sk` (S, RANGE), GSI **`GSI1`** (`GSI1PK`,`GSI1SK`), with `expires` as TTL attribute. Configure the adapter with `{ tableName: 'kauwa-udd-auth', partitionKey:'pk', sortKey:'sk', indexName:'GSI1', indexPartitionKey:'GSI1PK', indexSortKey:'GSI1SK' }`. Owned by Agent D — do not hand-model auth entities.
