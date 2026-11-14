import { describe, expect, it } from 'vitest'
import type { Manifest } from '../types/manifest'
import { classify, FLAG, observabilityCurrent, reasons } from './observability'

describe('observability classes', () => {
  it('keeps low coherence usable for change detection but not for movement', () => {
    const f = FLAG.lowCoherence | FLAG.noUnwrapped
    expect(classify(f, 'disturbance')).toBe(1)
    expect(classify(f, 'movement')).toBe(2)
  })
  it('never treats missing coverage as usable', () => {
    expect(classify(FLAG.outside, 'movement')).toBe(5)
    expect(classify(FLAG.noData, 'disturbance')).toBe(4)
  })
  it('puts terrain ahead of signal quality, and lists every reason', () => {
    const f = FLAG.shadow | FLAG.lowBaseline
    expect(classify(f, 'disturbance')).toBe(3)
    expect(reasons(f)).toHaveLength(2)
  })
  it('never treats the product mask, missing geometry or a missing baseline as usable', () => {
    expect(classify(FLAG.productMasked, 'disturbance')).toBe(4)
    expect(classify(FLAG.productMasked | FLAG.lowCoherence, 'movement')).toBe(4)
    expect(classify(FLAG.geometryNotAssessed, 'movement')).toBe(6)
    expect(classify(FLAG.baselineNoData, 'disturbance')).toBe(6)
    expect(classify(FLAG.baselineNoData, 'movement')).toBe(1)
    expect(reasons(FLAG.productMasked)[0]).toContain('quality mask')
  })
  it('holds back figures made before the masks were applied', () => {
    expect(observabilityCurrent({ observability: {} } as unknown as Manifest)).toBe(false)
    expect(observabilityCurrent({ observability: { methodVersion: 2 } } as unknown as Manifest)).toBe(true)
  })
})
