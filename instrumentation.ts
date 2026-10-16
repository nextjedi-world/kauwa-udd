// Next.js instrumentation hook. Error reporting is opt-in: with SENTRY_DSN unset this is a no-op
// and @sentry/nextjs is never loaded.
export async function register() {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    const Sentry = await import('@sentry/nextjs')
    Sentry.init({
      dsn,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      tracesSampleRate: 0,
    })
  }
}
