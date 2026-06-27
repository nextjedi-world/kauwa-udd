// ─────────────────────────────────────────────────────────────────────────────
// Kauwa Udd — Auth.js v5 (next-auth@beta) configuration.
// Providers:
//   • guest  — Credentials-based anonymous sign-in (name + avatar). No password.
//   • google — OAuth, left commented (no real creds required for the hackathon).
// Persistence: @auth/dynamodb-adapter on table `kauwa-udd-auth` (single-table,
//   pk/sk + GSI1). Honors DYNAMODB_LOCAL_ENDPOINT for local DynamoDB.
// Session: JWT strategy (required — the Credentials provider cannot use the
//   database session strategy). The adapter still persists users/accounts so a
//   future Google OAuth login links cleanly.
// ─────────────────────────────────────────────────────────────────────────────
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import type { JWT } from 'next-auth/jwt'

// Carry a guest flag through User / Session / JWT (avoids `any` casts below).
declare module 'next-auth' {
  interface User {
    isGuest?: boolean
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    isGuest?: boolean
  }
}
// Reference the imported type so the module is loaded for augmentation.
export type { JWT }
import { DynamoDBAdapter } from '@auth/dynamodb-adapter'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb'
import { awsCredentialsProvider } from '@vercel/oidc-aws-credentials-provider'
import { nanoid } from 'nanoid'

// ── DynamoDBDocument for the adapter ──────────────────────────────────────────
// The adapter requires a DynamoDBDocument (aggregated client), which differs from
// the DynamoDBDocumentClient exported by lib/db/client.ts — so we build one here.
// SINGLE-TABLE: auth shares the main table (uppercase PK/SK + GSI1).
const LOCAL_ENDPOINT = process.env.DYNAMODB_LOCAL_ENDPOINT // e.g. http://localhost:8000
const REGION = process.env.AWS_REGION ?? 'us-east-1'
const AUTH_TABLE =
  process.env.DYNAMODB_TABLE_NAME ?? process.env.DDB_TABLE ?? 'kauwa-udd'

function makeAuthClient(): DynamoDBClient {
  if (LOCAL_ENDPOINT) {
    // Local dev: DynamoDB Local with dummy credentials.
    return new DynamoDBClient({
      region: 'local',
      endpoint: LOCAL_ENDPOINT,
      credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
    })
  }
  // Production on Vercel: OIDC role assumption (no stored keys).
  if (process.env.AWS_ROLE_ARN) {
    return new DynamoDBClient({
      region: REGION,
      credentials: awsCredentialsProvider({ roleArn: process.env.AWS_ROLE_ARN }),
    })
  }
  // Fallback: default credential chain (provisioning/seed scripts).
  return new DynamoDBClient({ region: REGION })
}

const authDoc = DynamoDBDocument.from(makeAuthClient(), {
  marshallOptions: { convertEmptyValues: true, removeUndefinedValues: true, convertClassInstanceToMap: true },
})

// Keys match the shared single table (uppercase PK/SK + GSI1). Auth item key
// VALUES (USER#, ACCOUNT#, VT#) don't collide with game items (OBJ#/ROOM#/LB#…).
const adapter = DynamoDBAdapter(authDoc, {
  tableName: AUTH_TABLE,
  partitionKey: 'PK',
  sortKey: 'SK',
  indexName: 'GSI1',
  indexPartitionKey: 'GSI1PK',
  indexSortKey: 'GSI1SK',
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  // Credentials provider mandates JWT sessions (no DB session rows).
  session: { strategy: 'jwt' },
  trustHost: true,
  providers: [
    // ── Guest (anonymous) ──────────────────────────────────────────────────
    // Accepts an optional pre-existing guest id (the localStorage playerId), a
    // display name, and an emoji avatar. Always "succeeds" — there is no secret.
    Credentials({
      id: 'guest',
      name: 'Guest',
      credentials: {
        id: { label: 'Player Id', type: 'text' },
        name: { label: 'Name', type: 'text' },
        avatar: { label: 'Avatar', type: 'text' },
      },
      authorize(credentials) {
        const id =
          (typeof credentials?.id === 'string' && credentials.id) || `guest_${nanoid(10)}`
        const name =
          (typeof credentials?.name === 'string' && credentials.name) || 'Guest'
        const avatar =
          (typeof credentials?.avatar === 'string' && credentials.avatar) || '🦅'
        // The returned object becomes the session user. We carry the emoji avatar
        // through `image` so the standard session shape exposes it.
        return { id, name, image: avatar, isGuest: true }
      },
    }),

    // ── Google OAuth (disabled for now) ─────────────────────────────────────
    // To enable: `import Google from 'next-auth/providers/google'`, add it here,
    // and set AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET in the environment. With the
    // DynamoDB adapter configured above, Google users persist automatically.
    //
    // Google({
    //   clientId: process.env.AUTH_GOOGLE_ID,
    //   clientSecret: process.env.AUTH_GOOGLE_SECRET,
    // }),
  ],
  callbacks: {
    // Persist id + avatar (+ guest flag) onto the JWT at sign-in.
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id ?? token.sub
        // image holds the emoji avatar for guests; OAuth users get a URL.
        if (user.image) token.picture = user.image
        token.isGuest = user.isGuest ?? false
      }
      return token
    },
    // Expose the stable id (used as playerId) + avatar on the client session.
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? session.user.id
        if (token.picture) session.user.image = token.picture
        session.user.isGuest = token.isGuest ?? false
      }
      return session
    },
  },
})
