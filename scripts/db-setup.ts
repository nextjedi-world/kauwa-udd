// Create both DynamoDB tables (idempotent). Works against DynamoDB Local
// (DYNAMODB_LOCAL_ENDPOINT set) or real AWS (temp keys / region in env).
//   pnpm db:setup
import {
  DynamoDBClient,
  CreateTableCommand,
  UpdateTimeToLiveCommand,
  DescribeTableCommand,
  ResourceInUseException,
} from '@aws-sdk/client-dynamodb'

// Load local env (tsx doesn't auto-load .env.local). For prod provisioning,
// export AWS_ACCESS_KEY_ID/SECRET/REGION in the shell instead.
try {
  ;(process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.('.env.local')
} catch {
  /* no .env.local (e.g. prod provisioning via exported keys) */
}

const LOCAL = process.env.DYNAMODB_LOCAL_ENDPOINT
const REGION = process.env.AWS_REGION ?? 'us-east-1'
const MAIN = process.env.DDB_TABLE ?? 'kauwa-udd'
const AUTH = process.env.DDB_AUTH_TABLE ?? 'kauwa-udd-auth'

const client = new DynamoDBClient(
  LOCAL
    ? {
        region: 'local',
        endpoint: LOCAL,
        credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
      }
    : { region: REGION },
)

const S = 'S' as const

async function ensureTable(input: ConstructorParameters<typeof CreateTableCommand>[0]) {
  try {
    await client.send(new CreateTableCommand(input))
    console.log(`[db-setup] created ${input.TableName}`)
  } catch (e) {
    if (e instanceof ResourceInUseException) console.log(`[db-setup] ${input.TableName} exists`)
    else throw e
  }
}

async function ensureTtl(table: string, attr: string) {
  try {
    await client.send(
      new UpdateTimeToLiveCommand({
        TableName: table,
        TimeToLiveSpecification: { Enabled: true, AttributeName: attr },
      }),
    )
    console.log(`[db-setup] TTL on ${table}.${attr}`)
  } catch {
    /* already enabled or local doesn't support — ignore */
  }
}

async function main() {
  // Table 1: game domain (PK/SK + GSI1 for leaderboard top-N)
  await ensureTable({
    TableName: MAIN,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: S },
      { AttributeName: 'SK', AttributeType: S },
      { AttributeName: 'GSI1PK', AttributeType: S },
      { AttributeName: 'GSI1SK', AttributeType: S },
    ],
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'GSI1',
        KeySchema: [
          { AttributeName: 'GSI1PK', KeyType: 'HASH' },
          { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  })

  // Table 2: Auth.js (@auth/dynamodb-adapter): pk/sk + GSI1, TTL on `expires`
  await ensureTable({
    TableName: AUTH,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'pk', AttributeType: S },
      { AttributeName: 'sk', AttributeType: S },
      { AttributeName: 'GSI1PK', AttributeType: S },
      { AttributeName: 'GSI1SK', AttributeType: S },
    ],
    KeySchema: [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'GSI1',
        KeySchema: [
          { AttributeName: 'GSI1PK', KeyType: 'HASH' },
          { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  })

  await new Promise((r) => setTimeout(r, 1500)) // let tables become ACTIVE
  await ensureTtl(MAIN, 'ttl')
  await ensureTtl(AUTH, 'expires')

  await client.send(new DescribeTableCommand({ TableName: MAIN }))
  console.log('[db-setup] done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
