// Start DynamoDB Local on :8000 (sharedDb). Requires Java (we have 21).
// Downloads the jar on first run. Keep this running in its own terminal.
import DynamoDbLocal from 'dynamodb-local'

const PORT = 8000
console.log(`[db-local] launching DynamoDB Local on :${PORT} …`)
await DynamoDbLocal.launch(PORT, null, ['-sharedDb'], false, true)
console.log(`[db-local] ready at http://localhost:${PORT} — run "pnpm db:setup" next. Ctrl+C to stop.`)

process.on('SIGINT', async () => {
  await DynamoDbLocal.stopChild()
  process.exit(0)
})
// keep alive
setInterval(() => {}, 1 << 30)
