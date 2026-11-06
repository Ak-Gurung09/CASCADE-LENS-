import { describe, expect, it } from 'vitest'
import { classify, FLAG, reasons } from './observability'

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
})
