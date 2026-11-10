import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Manifest } from '../types/manifest'
import { finding } from './finding'

const root = resolve(__dirname, '../../..')
const shipped = () => JSON.parse(readFileSync(resolve(__dirname, '../../public/data/manifests/manifest.json'), 'utf8')) as Manifest

describe('first-minute finding', () => {
  it('quotes the shipped figures', () => {
    const m = shipped()
    const f = finding(m)!
    const text = f.points.map((p) => p.text).join(' ')
    const co = m.controlSeries!.pairs.find((p) => p.pair[0] === '2026-08-16')!
    expect(text).toContain(co.inside.toFixed(2))
    expect(text).toContain(co.outside.toFixed(2))
    expect(f.points).toHaveLength(3)
    expect(text).toMatch(/outside this radar frame/)
  })
  it('follows the data rather than fixed numbers', () => {
    const m = shipped()
    m.controlSeries!.pairs.forEach((p) => { p.inside = 0.111 })
    expect(finding(m)!.points[0].text).toContain('0.11')
  })
  it('stays away when the case has no control comparison', () => {
    const m = shipped()
    m.controlSeries = undefined
    expect(finding(m)).toBeNull()
  })
})

describe('status registry', () => {
  const s = JSON.parse(readFileSync(resolve(__dirname, '../../public/data/status.json'), 'utf8'))
  it('uses only the defined maturity levels', () => {
    for (const c of s.capabilities) expect(s.levels).toContain(c.maturity)
  })
  it('backs every "complete and tested" claim with a test that exists', () => {
    for (const c of s.capabilities.filter((x: { maturity: string }) => x.maturity === 'COMPLETE AND TESTED')) {
      expect(c.tests.length, c.id).toBeGreaterThan(0)
      for (const t of c.tests) expect(existsSync(resolve(root, t)), t).toBe(true)
    }
  })
})
