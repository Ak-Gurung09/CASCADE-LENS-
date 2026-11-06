import type { Manifest } from '../types/manifest'
import { acquisitionLabel, isUsable } from './manifest'
import { samplePoint } from './sampler'
import { evidenceOf, EVIDENCE } from './evidence'
import { classify, isObservability, reasons, taskOf } from './observability'
import { explain, gather, type Hypothesis } from './hypotheses'

// One evidence report for one clicked spot: every value read there, where it came from, and what it can and cannot say.

export interface ReportRow {
  layer: string
  layerId: string
  evidence: string
  state: string
  value: number | null
  units: string | null
  observation: string
  source: string | null
}

export interface Report {
  title: string
  generatedAt: string
  case: { id: string; name: string; eventDate: string }
  point: { lng: number; lat: number }
  observability: { pair: string; frame: string; answers: { question: string; answer: string }[]; reasons: string[] } | null
  readings: ReportRow[]
  explanations: Hypothesis[]
  notes: string[]
}

const QUESTION = { disturbance: 'Could a surface change be seen here?', movement: 'Could ground movement be measured here?' }

export async function buildReport(m: Manifest, p: [number, number], now = new Date()): Promise<Report> {
  const usable = m.layers.filter((l) => isUsable(l) && l.status !== 'renderable' && l.sources.some((s) => s.sampling))
  const obs = usable.filter(isObservability)
  const plain = usable.filter((l) => !isObservability(l))
  const [samples, clues, flagSample] = await Promise.all([
    Promise.all(plain.map((l) => samplePoint(l, p[0], p[1]))),
    gather(m, p),
    obs[0] ? samplePoint(obs[0], p[0], p[1]) : Promise.resolve(null),
  ])
  const flags = flagSample?.state === 'valid' && flagSample.value !== undefined ? flagSample.value : null
  const o = obs[0]
  return {
    title: `CascadeLens evidence report: ${m.caseStudy.name}`,
    generatedAt: now.toISOString(),
    case: { id: m.caseStudy.id, name: m.caseStudy.name, eventDate: m.caseStudy.eventDate },
    point: { lng: +p[0].toFixed(6), lat: +p[1].toFixed(6) },
    observability: o ? {
      pair: `${o.acquisition.reference} to ${o.acquisition.secondary}`,
      frame: `Track ${o.track}, frame ${o.frames.join(', ')}`,
      answers: obs.map((l) => ({ question: QUESTION[taskOf(l)], answer: flags === null ? 'Not assessed here' : l.legend?.keys?.[classify(flags, taskOf(l)) - 1]?.label ?? '' })),
      reasons: flags === null ? ['Outside the area checked. That is not the same as safe or unchanged.'] : reasons(flags),
    } : null,
    readings: plain.map((l, i) => ({
      layer: l.name, layerId: l.id, evidence: EVIDENCE[evidenceOf(l)].label, state: samples[i].state,
      value: samples[i].state === 'valid' && samples[i].value !== undefined ? samples[i].value! : null,
      units: l.units, observation: acquisitionLabel(l), source: samples[i].granule ?? null,
    })),
    explanations: explain(clues),
    notes: [
      'Values are the nearest stored pixel, with no interpolation. A blank value means no valid observation, which is not the same as no change.',
      'Explanations are a rule-based screen: they count which checks agree. They are hypotheses, not probabilities or verdicts.',
      'NISAR products are provisional releases. This report is a retrospective research aid, not a warning.',
    ],
  }
}

const cell = (v: unknown) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

export function toCsv(r: Report): string {
  const head = ['case', 'lng', 'lat', 'layer', 'layer_id', 'evidence', 'state', 'value', 'units', 'observation', 'source']
  const rows = r.readings.map((x) => [r.case.id, r.point.lng, r.point.lat, x.layer, x.layerId, x.evidence, x.state, x.value, x.units, x.observation, x.source])
  return [head, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n'
}

export function toGeoJson(r: Report): string {
  const { point, readings, ...rest } = r
  return JSON.stringify({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [point.lng, point.lat] },
    properties: { ...rest, readings: readings.filter((x) => x.value !== null).map((x) => ({ layerId: x.layerId, value: x.value, units: x.units })) } }] }, null, 1)
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

export function toHtml(r: Report): string {
  const li = (xs: string[]) => xs.map((x) => `<li>${esc(x)}</li>`).join('')
  const num = (v: number | null) => (v === null ? '' : Math.abs(v) >= 1000 ? v.toFixed(1) : v.toPrecision(5))
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(r.title)}</title><style>
body{font:14px/1.45 system-ui,sans-serif;color:#111;max-width:820px;margin:24px auto;padding:0 16px}h1{font-size:20px}h2{font-size:15px;margin-top:22px;border-bottom:1px solid #ccc}
table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #ddd;padding:4px 6px;text-align:left;vertical-align:top}.muted{color:#555}.tag{font-size:11px;border:1px solid #999;border-radius:8px;padding:0 6px}
@media print{button{display:none}}</style></head><body>
<button onclick="print()">Print or save as PDF</button>
<h1>${esc(r.title)}</h1>
<p class="muted">Spot ${r.point.lat.toFixed(5)}° N, ${r.point.lng.toFixed(5)}° E · event ${esc(r.case.eventDate)} · generated ${esc(r.generatedAt.slice(0, 16).replace('T', ' '))} UTC</p>
${r.observability ? `<h2>Can the radar see here? <span class="tag">Derived</span></h2><p class="muted">Pair ${esc(r.observability.pair)}, ${esc(r.observability.frame)}</p>
<table>${r.observability.answers.map((a) => `<tr><th>${esc(a.question)}</th><td>${esc(a.answer)}</td></tr>`).join('')}</table>
${r.observability.reasons.length ? `<ul>${li(r.observability.reasons)}</ul>` : '<p>No problems found at this spot.</p>'}` : ''}
<h2>What could explain this? <span class="tag">Hypothesis</span></h2>
${r.explanations.map((h) => `<h3>${esc(h.title)} <span class="tag">${esc(h.standing)}</span></h3>
${h.for.length ? `<p><b>For</b></p><ul>${li(h.for)}</ul>` : ''}${h.against.length ? `<p><b>Against</b></p><ul>${li(h.against)}</ul>` : ''}
${h.missing.length ? `<p><b>Would settle it</b></p><ul>${li(h.missing)}</ul>` : ''}`).join('')}
<h2>Every value at this spot</h2>
<table><tr><th>Layer</th><th>Evidence</th><th>Value</th><th>Observation</th><th>Source file</th></tr>
${r.readings.map((x) => `<tr><td>${esc(x.layer)}</td><td>${esc(x.evidence)}</td><td>${x.value === null ? `<span class="muted">${esc(x.state)}</span>` : `${num(x.value)} ${esc(x.units === '1' ? '' : x.units ?? '')}`}</td><td>${esc(x.observation)}</td><td style="word-break:break-all">${esc(x.source)}</td></tr>`).join('')}</table>
<h2>Read this first</h2><ul>${li(r.notes)}</ul>
</body></html>`
}

export function save(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
