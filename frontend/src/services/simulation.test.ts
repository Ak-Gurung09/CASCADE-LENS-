import { describe, expect, it } from 'vitest'
import { coherence, count, elapsedMs, replayStep, type SimData, type SimProps } from './simulation'

const feature = (properties: SimProps) => ({ type: 'Feature' as const, properties, geometry: { type: 'Point' as const, coordinates: [0, 0] } })
const data = { features: { type: 'FeatureCollection', features: [
  feature({ k: 'c', km: 0, h: 0 }),
  feature({ k: 'b', km: 5, h: 10 }),
  feature({ k: 'b', km: 5, h: 40 }),
  feature({ k: 'b', km: 50, h: 10 }),
  feature({ k: 'a', km: 5, h: 90, len: 2 }),
  feature({ k: 'r', km: 5, h: 10, len: 3 }),
  feature({ k: 'p', km: 5, h: 10, name: 'Low' }),
  feature({ k: 'p', km: 5, h: 90, name: 'High' }),
] } } as unknown as SimData

describe('count', () => {
  it('the replay counts what was mapped as affected up to that point, at any height', () => {
    expect(count(data, 10)).toEqual({ buildings: 2, roadKm: 2, places: ['Low', 'High'] })
  })
  it('the what-if counts only what sits below the water and within reach', () => {
    expect(count(data, 10, 20)).toEqual({ buildings: 1, roadKm: 3, places: ['Low'] })
    expect(count(data, 60, 20).buildings).toBe(2)
  })
})

describe('replay step', () => {
  it('moves along the path with time and stops at its end', () => {
    expect(replayStep(0, 3000, 0, 198, 24)).toBeCloseTo(24.75)
    expect(replayStep(190, 5000, 0, 198, 24)).toBe(198)
  })
  it('never goes below zero when a frame is stamped earlier than the moment Play was pressed', () => {
    // Seen on a busy computer: the frame began 180 ms before the recorded start, and position -1 has no point on the path.
    expect(elapsedMs(1000, 1180)).toBe(0)
    expect(replayStep(0, 1000, 1180, 198, 24)).toBe(0)
    expect(Math.floor(replayStep(0, 1000, 1180, 198, 24))).toBeGreaterThanOrEqual(0)
  })
})

describe('coherence', () => {
  it('is 1 on unchanged ground and falls as the ground changes', () => {
    expect(coherence(0)).toBeCloseTo(1)
    expect(coherence(0.5)).toBeLessThan(coherence(0.2))
    expect(coherence(1)).toBeLessThan(0.15)
  })
})
