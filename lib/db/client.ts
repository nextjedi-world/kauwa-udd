// ─────────────────────────────────────────────────────────────────────────────
// Kauwa Udd — DynamoDB DocumentClient (shared by all server code).
// Local dev  -> DynamoDB Local (http://localhost:8000), dummy creds.
// Production -> Vercel OIDC assumes an AWS IAM role (NO stored keys).
// Provisioning/seeding scripts may use temp access keys via the env fallback.
// ─────────────────────────────────────────────────────────────────────────────

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { awsCredentialsProvider } from '@vercel/oidc-aws-credentials-provider'

const LOCAL_ENDPOINT = process.env.DYNAMODB_LOCAL_ENDPOINT // e.g. http://localhost:8000
const REGION = process.env.AWS_REGION ?? 'us-east-1'

// SINGLE-TABLE design: everything (rooms, players, content, games, leaderboards,
// stats, AND auth) lives in ONE table. In prod this is the Vercel↔AWS integration
// table (env DYNAMODB_TABLE_NAME, e.g. "aws-dynamodb-sky-ocean"); locally it's
// "kauwa-udd" in DynamoDB Local. The OIDC role is scoped to exactly this table.
const MAIN_TABLE =
  process.env.DYNAMODB_TABLE_NAME ?? process.env.DDB_TABLE ?? 'kauwa-udd'

export const TABLES = {
  /** Game + auth single-table. */
  main: MAIN_TABLE,
  /** Auth.js shares the same single table. */
  auth: MAIN_TABLE,
} as const

function makeClient(): DynamoDBClient {
  // ── Local dev: DynamoDB Local ──
  if (LOCAL_ENDPOINT) {
    return new DynamoDBClient({
      region: 'local',
      endpoint: LOCAL_ENDPOINT,
      credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
    })
  }
  // ── Production on Vercel: OIDC role assumption (no stored keys) ──
  if (process.env.AWS_ROLE_ARN) {
    return new DynamoDBClient({
      region: REGION,
      credentials: awsCredentialsProvider({ roleArn: process.env.AWS_ROLE_ARN }),
    })
  }
  // ── Fallback: standard AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY from env
  //    (used by provisioning/seed scripts run with temp keys). ──
  return new DynamoDBClient({ region: REGION })
}

export const ddb = DynamoDBDocumentClient.from(makeClient(), {
  marshallOptions: { removeUndefinedValues: true, convertEmptyValues: false },
})
