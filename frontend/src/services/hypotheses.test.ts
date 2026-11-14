import { describe, expect, it } from 'vitest'
import { explain, inGeometry, type Clues } from './hypotheses'
import { FLAG } from './observability'

const base: Clues = { flags: 0, hasBaseline: true, coherence: 0.7, cohPair: '2026-08-16 to 2026-08-28', offset: 0.1, offsetUsual: 0.5, snr: 20, snrMedian: 11,
  elevation: 1500, slopeDeg: 10, inside: { mapped: [], water: [] }, control: null }

describe('hypotheses', () => {
  it('ranks "nothing changed" first where coherence stayed high and nothing is mapped', () => {
    expect(explain(base)[0].id).toBe('nochange')
  })

  it('ranks disturbance first for a coherence drop inside a mapped extent, counting only point values and mapping', () => {
    const h = explain({ ...base, coherence: 0.12, slopeDeg: 34, inside: { mapped: ['UNOSAT mudflow/rockflow extent'], water: [] }, control: { inside: 0.28, outside: 0.52, pair: 'x' } })
    expect(h[0].id).toBe('disturbance')
    expect(h[0].standing).toBe('Fits the checks')
    expect(h[0].for).toHaveLength(2)
    expect(h[0].context.join(' ')).toMatch(/Steep ground.*not show that anything moved/)
    expect(h[0].context.join(' ')).toContain('area-wide figure')
    expect(h.find((x) => x.id === 'nochange')!.standing).toBe('Little support')
  })

  it('cannot rise without a radar value at the spot, however suggestive the place', () => {
    const h = explain({ ...base, coherence: null, offset: null, offsetUsual: null, slopeDeg: 40, inside: { mapped: ['UNOSAT mudflow/rockflow extent'], water: [] }, control: { inside: 0.28, outside: 0.52, pair: 'x' } })
    const d = h.find((x) => x.id === 'disturbance')!
    expect(d.standing).toBe('Cannot judge here')
    expect(d.missing[0]).toContain('A valid radar value at this spot')
    expect(h.find((x) => x.id === 'nochange')!.standing).toBe('Cannot judge here')
  })

  it('does not count the absence of mapping as evidence against a change', () => {
    const d = explain({ ...base, coherence: 0.1 }).find((x) => x.id === 'disturbance')!
    expect(d.against).toHaveLength(0)
    expect(d.context.join(' ')).toContain('mapping is incomplete')
  })

  it('does not credit a drop where the ground was already noisy before', () => {
    const h = explain({ ...base, flags: FLAG.lowBaseline, coherence: 0.1 })
    const d = h.find((x) => x.id === 'disturbance')!
    expect(d.for.join(' ')).not.toContain('stable before')
    expect(d.missing.join(' ')).toContain('cannot be told apart')
    expect(h.find((x) => x.id === 'seasonal')!.for.length).toBeGreaterThan(0)
  })

  it('does not credit a drop when the pair before the event holds no value', () => {
    const d = explain({ ...base, flags: FLAG.baselineNoData, coherence: 0.1 }).find((x) => x.id === 'disturbance')!
    expect(d.for.join(' ')).not.toContain('coherent before')
    expect(d.missing.join(' ')).toContain('pair before the event')
  })

  it('puts the terrain artefact first under layover', () => {
    expect(explain({ ...base, flags: FLAG.layover, coherence: 0.2 })[0].id).toBe('artefact')
  })

  it('refuses to explain where the radar did not look', () => {
    for (const flags of [null, FLAG.outside, FLAG.noData, FLAG.productMasked]) {
      const h = explain({ ...base, flags })
      expect(h).toHaveLength(1)
      expect(h[0].standing).toBe('Cannot judge here')
    }
  })

  it('never states a probability', () => {
    const text = JSON.stringify(explain({ ...base, coherence: 0.1, inside: { mapped: ['x'], water: ['lake'] } }))
    expect(text).not.toMatch(/%|probab|likel/i)
  })

  it('tests points against polygons with holes', () => {
    const g = { type: 'Polygon', coordinates: [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]], [[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]] }
    expect(inGeometry([3, 3], g)).toBe(true)
    expect(inGeometry([1.5, 1.5], g)).toBe(false)
    expect(inGeometry([5, 5], g)).toBe(false)
  })
})
