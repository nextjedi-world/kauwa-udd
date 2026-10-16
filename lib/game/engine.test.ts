import { describe, expect, it } from 'vitest'

import type { RoomPlayer } from '../types'
import {
  buildStandings,
  computeEliminations,
  pickRoundObjects,
  pickWinner,
  shuffle,
} from './engine'

const player = (id: string, score: number, extra: Partial<RoomPlayer> = {}): RoomPlayer => ({
  id,
  name: id,
  avatar: 'x',
  isHost: false,
  online: true,
  language: 'en',
  score,
  eliminated: false,
  joinedAt: 1,
  ...extra,
})

describe('shuffle', () => {
  it('keeps all items and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5]
    const out = shuffle(input)
    expect([...out].sort()).toEqual(input)
    expect(input).toEqual([1, 2, 3, 4, 5])
  })
})

describe('pickRoundObjects', () => {
  it('returns exactly the requested number of rounds, even past the catalogue size', () => {
    expect(pickRoundObjects(100)).toHaveLength(100)
    expect(pickRoundObjects(5, [])).toEqual([])
  })
})

describe('computeEliminations', () => {
  const players = [player('a', 10), player('b', 3), player('c', 7)]
  it('drops the lowest scorer on the interval boundary', () => {
    expect(computeEliminations(players, 3, 3)).toEqual(['b'])
  })
  it('does nothing off the boundary or at round 0', () => {
    expect(computeEliminations(players, 2, 3)).toEqual([])
    expect(computeEliminations(players, 0, 3)).toEqual([])
  })
  it('never eliminates the last active player', () => {
    expect(computeEliminations([player('a', 1)], 3, 3)).toEqual([])
  })
  it('breaks ties by dropping the latest joiner', () => {
    const tied = [player('a', 5, { joinedAt: 1 }), player('b', 5, { joinedAt: 9 })]
    expect(computeEliminations(tied, 5, 5)).toEqual(['b'])
  })
})

describe('standings and winner', () => {
  const players = [player('a', 10, { eliminated: true }), player('b', 3), player('c', 7)]
  it('sorts by score with eliminated players last', () => {
    expect(buildStandings(players).map((s) => s.playerId)).toEqual(['c', 'b', 'a'])
  })
  it('picks the best active player as winner', () => {
    expect(pickWinner(players)).toBe('c')
    expect(pickWinner([])).toBeNull()
  })
})
