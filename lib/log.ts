// Minimal structured JSON logger (one line per event, easy to query in Vercel logs).
type Level = 'debug' | 'info' | 'warn' | 'error'

function serialize(value: unknown): unknown {
  if (value instanceof Error)
    return { name: value.name, message: value.message, stack: value.stack }
  return value
}

function emit(level: Level, event: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({
    level,
    event,
    time: new Date().toISOString(),
    ...Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, serialize(v)])),
  })
  if (level === 'error') process.stderr.write(line + '\n')
  else process.stdout.write(line + '\n')
}

export const log = {
  debug: (event: string, fields?: Record<string, unknown>) => emit('debug', event, fields),
  info: (event: string, fields?: Record<string, unknown>) => emit('info', event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => emit('warn', event, fields),
  error: (event: string, fields?: Record<string, unknown>) => emit('error', event, fields),
}
