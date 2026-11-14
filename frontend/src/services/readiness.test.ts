import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { blockers, type Readiness } from './readiness'

const r = JSON.parse(readFileSync(resolve(__dirname, '../../public/data/readiness.json'), 'utf8')) as Readiness

describe('flood and landslide readiness', () => {
  it('uses only the defined states, and claims nothing beyond the evidence on disk', () => {
    for (const c of r.capabilities) {
      expect(r.states, c.capability).toContain(c.state)
      // No model, calibration or validation record exists in this repository, so nothing may sit above MODEL REQUIRED
      expect(['NOT AVAILABLE', 'DATA AVAILABLE, PROCESSING REQUIRED', 'MODEL REQUIRED', 'CONTEXT ONLY'], c.capability).toContain(c.state)
    }
  })

  it('says why a capability is not available, and what would unblock it', () => {
    for (const c of r.capabilities.filter((x) => x.state === 'NOT AVAILABLE')) {
      expect(blockers(c).length, c.capability).toBeGreaterThan(0)
      expect(c.next_requirement, c.capability).toBeTruthy()
    }
  })

  it('names nothing a forecast', () => {
    const text = JSON.stringify(r.capabilities.map((c) => [c.state, c.decision])).toLowerCase()
    expect(text).not.toMatch(/\bforecast (is )?(ready|available|issued)\b/)
    expect(r.capabilities.every((c) => !['EXPERIMENTAL', 'OPERATIONALLY EVALUATED'].includes(c.state))).toBe(true)
  })
})
