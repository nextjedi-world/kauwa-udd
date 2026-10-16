import { describe, expect, it } from 'vitest'

import { dayStamp, keys, leaderboardPk, leaderboardSk, score20, weekStamp } from './keys'

describe('keys', () => {
  it('builds room, player and click keys', () => {
    expect(keys.room('AB12C')).toEqual({ PK: 'ROOM#AB12C', SK: 'META' })
    expect(keys.player('AB12C', 'p1')).toEqual({ PK: 'ROOM#AB12C', SK: 'PLAYER#p1' })
    expect(keys.click('AB12C', 3, 'p1').SK).toBe('CLICK#3#p1')
    expect(keys.clickSkPrefix(3)).toBe('CLICK#3#')
  })
})

describe('time buckets', () => {
  it('formats the UTC day', () => {
    expect(dayStamp(new Date('2026-06-27T23:59:59Z'))).toBe('2026-06-27')
  })
  it('formats ISO weeks across a year boundary', () => {
    expect(weekStamp(new Date('2026-01-01T00:00:00Z'))).toBe('2026-W01')
    expect(weekStamp(new Date('2027-01-01T00:00:00Z'))).toBe('2026-W53')
  })
  it('builds leaderboard partition keys', () => {
    const now = new Date('2026-06-27T10:00:00Z')
    expect(leaderboardPk('daily', 'global', now)).toBe('LB#DAILY#2026-06-27#GLOBAL')
    expect(leaderboardPk('all')).toBe('LB#ALL#GLOBAL')
  })
})

describe('score sort keys', () => {
  it('pads so string order equals numeric order', () => {
    expect(score20(42)).toBe('00000000000000000042')
    expect(score20(-5)).toBe(score20(0))
    expect(score20(9) < score20(10)).toBe(true)
    expect(leaderboardSk(7, 'u1')).toBe('00000000000000000007#u1')
  })
})
