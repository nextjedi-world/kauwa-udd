// Seed the content catalogue (OBJ# items) and some demo leaderboard entries.
//   pnpm db:seed
//
// NOTE: lib/db/client.ts reads env (DYNAMODB_LOCAL_ENDPOINT etc.) at *import*
// time, so we must load .env.local BEFORE importing anything that pulls it in.
// Hence the dynamic import()s inside main().

// Load local env (tsx doesn't auto-load .env.local). For prod seeding, export
// AWS_ACCESS_KEY_ID/SECRET/REGION in the shell instead.
try {
  ;(process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.('.env.local')
} catch {
  /* no .env.local (e.g. prod seeding via exported keys) */
}

async function main() {
  const { GAME_OBJECTS } = await import('../lib/game-data')
  const { putObjects } = await import('../lib/db/repositories')
  const { recordScores } = await import('../lib/db/leaderboard')

  // 1) Content catalogue.
  await putObjects(GAME_OBJECTS)
  console.log(`[db-seed] wrote ${GAME_OBJECTS.length} content objects (OBJ#)`)

  // 2) Demo leaderboard entries (daily + weekly + all-time, GLOBAL scope).
  const demoPlayers = [
    { id: 'demo_priya', name: 'Priya', avatar: '🦚', score: 9820 },
    { id: 'demo_marco', name: 'Marco', avatar: '🦅', score: 9410 },
    { id: 'demo_sora', name: 'Sora', avatar: '🦉', score: 9180 },
    { id: 'demo_tariq', name: 'Tariq', avatar: '🦜', score: 8740 },
    { id: 'demo_nina', name: 'Nina', avatar: '🕊️', score: 8520 },
    { id: 'demo_bao', name: 'Bao', avatar: '🐤', score: 7990 },
    { id: 'demo_eva', name: 'Eva', avatar: '🐧', score: 7610 },
    { id: 'demo_kenji', name: 'Kenji', avatar: '🦆', score: 7320 },
  ]

  await recordScores(demoPlayers, 'daily', 'global')
  await recordScores(demoPlayers, 'weekly', 'global')
  await recordScores(demoPlayers, 'all', 'global')
  console.log(
    `[db-seed] wrote ${demoPlayers.length} demo leaderboard entries (daily/weekly/all)`,
  )
  console.log('[db-seed] done. (re-running adds to demo scores — wipe table to reset)')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
