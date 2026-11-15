import { describe, expect, it } from 'vitest'
import { evidenceId, toCsv, toGeoJson, toHtml, type Report } from './report'

const r: Report = {
  title: 'T <x>', evidenceId: 'CL-rasuwa-2026-28.10000N85.30000E-20261106T020000Z', generatedAt: '2026-11-06T02:00:00.000Z', case: { id: 'rasuwa-2026', name: 'Rasuwa', eventDate: '2026-08-26' }, point: { lng: 85.3, lat: 28.1 },
  observability: { pair: 'a to b', frame: 'Track 48, frame 74', methodVersion: 2, current: true, answers: [{ question: 'Q?', answer: 'Usable' }], reasons: [] },
  readings: [{ layer: 'Coherence, "HH"', layerId: 'pair-a:gunw-coherence', evidence: 'Observed', state: 'valid', value: 0.21, units: '1', observation: 'x', source: 'G', maturity: 'Provisional (P05023)', track: 48, frame: 74, direction: 'DESCENDING', method: 'm', limitations: ['Provisional data.', 'Line two, with a comma'] },
    { layer: 'Phase', layerId: 'p', evidence: 'Observed', state: 'nodata', value: null, units: 'radians', observation: 'x', source: null, maturity: 'Provisional (P05023)', track: 48, frame: null, direction: 'DESCENDING', method: 'm', limitations: [] }],
  nextSteps: [{ view: 'Track 48', question: 'Q?', step: 'Check independent imagery', availability: 'Needs a person to collect it', gap: 'g', detail: 'd', rule: 'R-INDEPENDENT' }],
  cannotEstablish: ['Ground displacement.'],
  processing: { manifestGeneratedAt: '2026-11-13', schemaVersion: 1, observabilityMethod: 2, app: 'CascadeLens 0.1.0' },
  reproduce: ['Open ?case=rasuwa-2026&at=28.10000,85.30000'],
  explanations: [{ id: 'd', title: 'Disturbed', standing: 'Partly fits', for: ['a'], against: [], context: ['steep'], missing: ['m'] }],
  notes: ['n'],
}

describe('evidence report', () => {
  it('writes CSV rows with the same columns, quoting commas and quotes, with blanks for no value', () => {
    const lines = toCsv(r).trim().split('\r\n')
    const width = lines[0].split(',').length
    expect(lines[0]).toMatch(/^evidence_id,case,lng,lat,row_type,/)
    expect(lines[1]).toContain('"Coherence, ""HH"""')
    expect(lines[2]).toContain(',nodata,,radians,')
    // Every line splits to the header's width once quoted cells are set aside
    for (const l of lines) expect(l.replace(/"(?:[^"]|"")*"/g, 'q').split(',').length, l).toBe(width)
    expect(lines.slice(1).every((l) => l.startsWith(r.evidenceId))).toBe(true)
  })
  it('keeps the next step and every limit in the CSV, so no export drops what the app shows', () => {
    const csv = toCsv(r)
    expect(csv).toContain('next_step')
    expect(csv).toContain('Check independent imagery')
    expect(csv).toContain('limitation,Ground displacement.')
    expect(csv).toContain(',limitation,n,')
    expect(csv).toContain('"Provisional data.; Line two, with a comma"')
  })
  it('writes a valid point feature that keeps missing readings as missing, never as values', () => {
    const g = JSON.parse(toGeoJson(r))
    expect(g.type).toBe('FeatureCollection')
    expect(g.features[0].geometry).toEqual({ type: 'Point', coordinates: [85.3, 28.1] })
    expect(g.features[0].properties.evidenceId).toBe(r.evidenceId)
    expect(g.features[0].properties.readings).toEqual([
      { layerId: 'pair-a:gunw-coherence', state: 'valid', value: 0.21, units: '1', maturity: 'Provisional (P05023)', source: 'G' },
      { layerId: 'p', state: 'nodata', value: null, units: 'radians', maturity: 'Provisional (P05023)', source: null }])
    expect(g.features[0].properties.explanations[0].standing).toBe('Partly fits')
    expect(g.features[0].properties.cannotEstablish).toEqual(r.cannotEstablish)
  })
  it('gives every format the same evidence ID, spot and limits', () => {
    const h = toHtml(r), c = toCsv(r), g = JSON.parse(toGeoJson(r)).features[0].properties
    for (const text of [h, c, JSON.stringify(g)]) {
      expect(text).toContain(r.evidenceId)
      expect(text).toContain('Ground displacement.')
    }
    expect(h).toContain('Investigation summary')
    expect(h).toContain('1 of 2 radar readings hold a valid value here')
    expect(h).toContain('Provenance and reproduction')
    expect(h).toContain('What the radar cannot establish here')
  })
  it('builds a unique, readable evidence ID with the hemisphere spelled out', () => {
    expect(evidenceId('rasuwa-2026', [85.3, 28.1], new Date('2026-11-06T02:00:00Z'))).toBe('CL-rasuwa-2026-28.10000N85.30000E-20261106T020000Z')
    expect(evidenceId('x', [-70.5, -33.4], new Date('2026-11-06T02:00:00Z'))).toBe('CL-x-33.40000S70.50000W-20261106T020000Z')
  })
  it('escapes text in the printable page and labels the hypotheses', () => {
    const h = toHtml(r)
    expect(h).toContain('T &lt;x&gt;')
    expect(h).toContain('Hypothesis')
    expect(h).not.toContain('<x>')
    expect(h).toContain('Context, not counted')
    expect(h).not.toContain('withheld')
  })
  it('says when the observability figures come from the withdrawn method', () => {
    const h = toHtml({ ...r, observability: { ...r.observability!, methodVersion: 1, current: false } })
    expect(h).toContain('method version 1')
    expect(h).toContain('withheld until the corrected run')
  })
  it('carries no script unless it is the saved file, so the print button survives the offline policy', () => {
    expect(toHtml(r)).not.toMatch(/onclick|<script/i)
    expect(toHtml(r)).toContain('<button id="print">')
    expect(toHtml(r, true)).toContain('onclick="print()"')
  })
  it('names the hemisphere from the sign of the coordinates', () => {
    expect(toHtml(r)).toContain('28.10000°N, 85.30000°E')
    expect(toHtml({ ...r, point: { lng: -70.5, lat: -33.4 } })).toContain('33.40000°S, 70.50000°W')
  })
})
