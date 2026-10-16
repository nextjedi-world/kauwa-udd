// ─────────────────────────────────────────────────────────────────────────────
// Ably token endpoint. The browser SDK calls this (authUrl) to obtain a signed
// TokenRequest scoped to its clientId. Keeps ABLY_API_KEY server-side only.
// Supports GET (clientId in query) and POST (clientId in JSON or form body) so it
// works regardless of how the Ably SDK sends authParams.
// ─────────────────────────────────────────────────────────────────────────────
import * as Ably from 'ably'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
// Tokens are per-request and short-lived — never cache.
export const dynamic = 'force-dynamic'

async function extractClientId(req: Request): Promise<string | undefined> {
  // 1) query string (GET authMethod, or appended params)
  const fromQuery = new URL(req.url).searchParams.get('clientId')
  if (fromQuery) return fromQuery
  // 2) request body — JSON or form-urlencoded (POST authMethod)
  const ct = req.headers.get('content-type') ?? ''
  try {
    if (ct.includes('application/json')) {
      const body = await req.json()
      return typeof body?.clientId === 'string' ? body.clientId : undefined
    }
    const form = await req.formData()
    const v = form.get('clientId')
    return typeof v === 'string' ? v : undefined
  } catch {
    return undefined
  }
}

async function issueToken(req: Request) {
  const key = process.env.ABLY_API_KEY?.trim()
  if (!key) {
    return NextResponse.json(
      { error: 'ABLY_API_KEY is not configured on the server.' },
      { status: 500 },
    )
  }
  const clientId = await extractClientId(req)
  const rest = new Ably.Rest(key)
  const tokenRequest = await rest.auth.createTokenRequest(clientId ? { clientId } : undefined)
  return NextResponse.json(tokenRequest)
}

export const GET = issueToken
export const POST = issueToken
