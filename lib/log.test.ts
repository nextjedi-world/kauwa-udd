import { afterEach, describe, expect, it, vi } from 'vitest'

import { log } from './log'

describe('log', () => {
  afterEach(() => vi.restoreAllMocks())

  it('writes one JSON line with level, event and serialized errors', () => {
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    log.error('rooms.create.failed', { error: new Error('boom') })
    const line = JSON.parse(String(write.mock.calls[0][0]))
    expect(line).toMatchObject({ level: 'error', event: 'rooms.create.failed' })
    expect(line.error.message).toBe('boom')
  })
})
