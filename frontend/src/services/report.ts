import type { Layer, Manifest } from '../types/manifest'
import { acquisitionLabel, coordinates, isUsable } from './manifest'
import { samplePoint } from './sampler'
import { evidenceOf, EVIDENCE } from './evidence'
import { classify, classLabel, isObservability, obsViews, observabilityCurrent, reasons, STALE_NOTE, taskOf } from './observability'
import { explain, gather, viewSummary, type Hypothesis } from './hypotheses'
import { isTerrainScreen, nearestRoad, terrainClass, terrainFactors, terrainLayer } from './hazards'
import { roadEvidence, type RoadEvidence } from './roadEvidence'
import { AVAILABILITY_TEXT, nextSteps, type ViewFlags } from './nextEvidence'

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
  maturity: string
  track: number | null
  frame: number | null
  direction: string | null
  method: string
  limitations: string[]
}

export interface ReportStep { view: string; question: string; step: string; availability: string; gap: string; detail: string; rule: string }

export interface ObsAnswer { pair: string; frame: string; methodVersion: number; current: boolean; answers: { question: string; answer: string }[]; reasons: string[] }

export interface Report {
  title: string
  // One ID per export, from the case, the spot and the time: the same in every format made from one click
  evidenceId: string
  generatedAt: string
  case: { id: string; name: string; eventDate: string }
  point: { lng: number; lat: number }
  observability: ObsAnswer | null
  // further viewing directions (another track), each judged from its own flags
  otherViews?: ObsAnswer[]
  readings: ReportRow[]
  explanations: Hypothesis[]
  // what each viewing direction could read at the spot, when there is more than one
  explanationViews?: string[]
  hazards?: { terrain: { class: string; factors: string[] } | null; road: RoadEvidence | null; maturity: string }
  // What to try next, from the fixed rule table (nextEvidence.ts), per viewing direction and question
  nextSteps?: ReportStep[]
  // What no reading here can establish, whatever the values
  cannotEstablish?: string[]
  processing?: { manifestGeneratedAt: string; schemaVersion: number; observabilityMethod: number | null; app: string }
  reproduce?: string[]
  notes: string[]
}

export const APP_VERSION = 'CascadeLens 0.1.0'

// The radar cannot establish these from any value in this report. Shown in every format so no export drops them.
export const CANNOT_ESTABLISH = [
  'Ground displacement: phase is not converted to movement anywhere in CascadeLens.',
  'The cause of a change: low coherence or a backscatter change fits debris, water, wet soil, snow or vegetation alike.',
  'Damage, closure or passability of a road: exposure and radar change are not damage.',
  'When the change happened within a pair: a pair only brackets it between its two dates.',
  'Anything where the reading is missing: no valid observation is not evidence of no change.',
]

export const evidenceId = (caseId: string, p: [number, number], at: Date) =>
  `CL-${caseId}-${Math.abs(p[1]).toFixed(5)}${p[1] < 0 ? 'S' : 'N'}${Math.abs(p[0]).toFixed(5)}${p[0] < 0 ? 'W' : 'E'}-${at.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`

const method = (l: Layer) => l.explanation?.measures ?? (l.processingHistory ? `Processed by ${String(l.processingHistory.parameters.script ?? 'the CascadeLens pipeline')}` : l.measurementType)

const QUESTION = { disturbance: 'Could a surface change be seen here?', movement: 'Could ground movement be measured here?' }

export async function buildReport(m: Manifest, p: [number, number], now = new Date()): Promise<Report> {
  const usable = m.layers.filter((l) => isUsable(l) && l.status !== 'renderable' && l.sources.some((s) => s.sampling))
  const obs = usable.filter(isObservability)
  const plain = usable.filter((l) => !isObservability(l) && !isTerrainScreen(l))
  const tl = terrainLayer(m)
  const views = obsViews(obs)
  const [samples, clues, flagSamples, tSample, road] = await Promise.all([
    Promise.all(plain.map((l) => samplePoint(l, p[0], p[1]))),
    gather(m, p),
    Promise.all(views.map((v) => samplePoint(v.layers[0], p[0], p[1]))),
    tl ? samplePoint(tl, p[0], p[1]) : Promise.resolve(null),
    m.hazards ? nearestRoad(m, p) : Promise.resolve(null),
  ])
  const tf = tSample?.state === 'valid' && tSample.value !== undefined ? tSample.value : null
  const o = obs[0]
  const answer = (i: number): ObsAnswer => {
    const s = flagSamples[i], ls = views[i].layers, first = ls[0]
    const flags = s.state === 'valid' && s.value !== undefined ? s.value : null
    return {
      pair: `${first.acquisition.reference} to ${first.acquisition.secondary}`,
      frame: views[i].label,
      methodVersion: m.observability?.methodVersion ?? 1,
      current: observabilityCurrent(m),
      answers: ls.map((l) => ({ question: QUESTION[taskOf(l)], answer: flags === null ? 'Not assessed here' : classLabel(l, classify(flags, taskOf(l))) })),
      reasons: flags === null ? ['Outside the area checked. That is not the same as safe or unchanged.'] : reasons(flags),
    }
  }
  const flagsAt = (i: number) => (flagSamples[i].state === 'valid' && flagSamples[i].value !== undefined ? flagSamples[i].value! : null)
  const viewFlags: ViewFlags[] = views.map((v, i) => ({ label: v.label, track: v.layers[0].track, flags: flagsAt(i) }))
  const steps: ReportStep[] = viewFlags.flatMap((vf) => (['disturbance', 'movement'] as const).flatMap((task) =>
    nextSteps(task, vf, viewFlags, m.layers).map((s) => ({ view: vf.label, question: QUESTION[task], step: s.step, availability: AVAILABILITY_TEXT[s.availability], gap: s.gap, detail: s.detail, rule: s.rule }))))
  const id = evidenceId(m.caseStudy.id, p, now)
  return {
    title: `CascadeLens evidence report: ${m.caseStudy.name}`,
    evidenceId: id,
    generatedAt: now.toISOString(),
    case: { id: m.caseStudy.id, name: m.caseStudy.name, eventDate: m.caseStudy.eventDate },
    point: { lng: +p[0].toFixed(6), lat: +p[1].toFixed(6) },
    observability: views.length ? answer(0) : null,
    ...(views.length > 1 ? { otherViews: views.slice(1).map((_, i) => answer(i + 1)) } : {}),
    readings: plain.map((l, i) => ({
      layer: l.name, layerId: l.id, evidence: EVIDENCE[evidenceOf(l)].label, state: samples[i].state,
      value: samples[i].state === 'valid' && samples[i].value !== undefined ? samples[i].value! : null,
      units: l.units, observation: acquisitionLabel(l), source: samples[i].granule ?? null,
      maturity: l.productMaturity, track: l.track, frame: samples[i].frame ?? null, direction: l.orbitDirection, method: method(l), limitations: l.limitations,
    })),
    explanations: explain(clues),
    ...(viewSummary(clues).length ? { explanationViews: viewSummary(clues) } : {}),
    hazards: m.hazards ? { terrain: tf === null ? null : { class: m.hazards.terrain.classes.find((c) => c.code === terrainClass(tf))?.label ?? '', factors: terrainFactors(tf) }, road: road ? roadEvidence(m, road) : null, maturity: 'Experimental screens, not forecasts' } : undefined,
    nextSteps: steps,
    cannotEstablish: CANNOT_ESTABLISH,
    processing: { manifestGeneratedAt: m.generatedAt, schemaVersion: m.schemaVersion, observabilityMethod: m.observability?.methodVersion ?? null, app: APP_VERSION },
    reproduce: [
      `Open CascadeLens (online or the offline package) at ?case=${m.caseStudy.id}&at=${p[1].toFixed(5)},${p[0].toFixed(5)} to reopen this spot.`,
      'Each value is the nearest stored pixel of the file named under its source; the shipped sampling files are in data/sampling, listed in data/manifests.',
      'To rebuild them from the raw NISAR files, follow docs/DATA_ACQUISITION.md and docs/RADAR_OBSERVABILITY.md (processing/scripts).',
    ],
    notes: [
      'Values are the nearest stored pixel, with no interpolation. A blank value means no valid observation, which is not the same as no change.',
      'Explanations are a rule-based screen: they count which checks agree, using radar values at this spot and independent mapping. Context such as slope is listed but not counted. They are hypotheses, not probabilities or verdicts.',
      ...(o && !observabilityCurrent(m) ? [`Radar observability: ${STALE_NOTE}`] : []),
      'NISAR products are provisional releases. This report is a retrospective research aid, not a warning.',
    ],
  }
}

const cell = (v: unknown) => { const s = v === null || v === undefined ? '' : String(v); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

export function toCsv(r: Report): string {
  // Every row has the same columns. Readings first, then the road stretch, the next steps and the limits, so a spreadsheet keeps them all.
  const head = ['evidence_id', 'case', 'lng', 'lat', 'row_type', 'layer', 'layer_id', 'evidence', 'state', 'value', 'units', 'observation', 'source', 'maturity', 'track', 'frame', 'direction', 'method', 'limitations', 'generated_at']
  const tail = (x: Partial<ReportRow>) => [x.maturity, x.track, x.frame, x.direction, x.method, (x.limitations ?? []).join('; '), r.generatedAt]
  const rows: unknown[][] = r.readings.map((x) => [r.evidenceId, r.case.id, r.point.lng, r.point.lat, 'reading', x.layer, x.layerId, x.evidence, x.state, x.value, x.units, x.observation, x.source, ...tail(x)])
  const road = r.hazards?.road
  // The nearest road stretch, as one row: its ID, its rating, and the share of it the event pair could use for change
  if (road) rows.push([r.evidenceId, r.case.id, r.point.lng, r.point.lat, 'road', `Road stretch ${road.id ?? ''} (${road.road}, ${road.distanceM} m away)`.replace('  ', ' '), road.id, 'Derived',
    `${road.exposure} exposure; ${road.radar.watch}${road.radar.otherView ? `; from either direction: ${road.radar.otherView.watch} (${road.radar.otherView.eitherPct}%)` : ''}`, road.radar.shares[0].pct, '% usable for change', road.radar.pair, road.radar.granule, ...tail({ maturity: 'Experimental screen', limitations: ['Exposure is not damage, closure or impassability.'] })])
  for (const v of [r.observability, ...(r.otherViews ?? [])].filter((x): x is ObsAnswer => Boolean(x)))
    for (const a of v.answers) rows.push([r.evidenceId, r.case.id, r.point.lng, r.point.lat, 'observability', a.question, v.frame, 'Derived', a.answer, null, null, v.pair, null, ...tail({ method: `Observability method version ${v.methodVersion}`, limitations: v.reasons })])
  for (const s of r.nextSteps ?? []) rows.push([r.evidenceId, r.case.id, r.point.lng, r.point.lat, 'next_step', `${s.view}: ${s.question}`, s.rule, 'Rule', s.availability, null, null, s.step, null, ...tail({ method: s.gap, limitations: [s.detail] })])
  for (const n of [...(r.cannotEstablish ?? []), ...r.notes]) rows.push([r.evidenceId, r.case.id, r.point.lng, r.point.lat, 'limitation', n, null, null, null, null, null, null, null, ...tail({})])
  return [head, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n'
}

export function toGeoJson(r: Report): string {
  const { point, readings, ...rest } = r
  return JSON.stringify({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [point.lng, point.lat] },
    properties: { ...rest, readings: readings.map((x) => ({ layerId: x.layerId, state: x.state, value: x.value, units: x.units, maturity: x.maturity, source: x.source })) } }] }, null, 1)
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

function roadHtml(ev: RoadEvidence, li: (xs: string[]) => string): string {
  const row = (k: string, v: unknown) => (v === null || v === undefined || v === '' ? '' : `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`)
  return `<h3>Road stretch ${esc(ev.id ?? '')}</h3><table>
${row('Road', `${ev.road}${ev.bridge ? ', bridge' : ''}, ${ev.lengthM} m long, ${ev.distanceM} m from the spot`)}${row('Name', ev.name)}${row('OpenStreetMap', ev.osmWay)}
${row('Rating', `${ev.exposure} exposure${ev.reasons.length ? `: ${ev.reasons.join('; ')}` : ': no factor found'}`)}
${row('Radar pair', ev.radar.pair ? `${ev.radar.pair}${ev.radar.trackFrame ? `, ${ev.radar.trackFrame}` : ''}` : null)}${row('Before pair', ev.radar.baseline)}${row('Source file', ev.radar.granule)}
${row('Observability', `Method version ${ev.radar.methodVersion}${ev.radar.current ? '' : ' (withdrawn; awaiting the rebuild)'}. ${ev.radar.watch}.`)}
${ev.radar.shares.map((s) => row(s.label, s.pct === null ? 'not in this build' : `${s.pct}%`)).join('')}
${ev.radar.otherView ? row('Opposite direction', `${ev.radar.otherView.label}${ev.radar.otherView.pair ? `, ${ev.radar.otherView.pair}` : ''}: ${ev.radar.otherView.usablePct}% usable for change; ${ev.radar.otherView.eitherPct}% from either direction (${ev.radar.otherView.watch})`) : ''}</table>
<p><b>Context</b></p><ul>${li(ev.context)}</ul><p><b>What to verify</b></p><ul>${li(ev.verify)}</ul>`
}

// The investigation summary at the top of the printable report: what was looked at, what the radar saw, and what is missing.
function summaryHtml(r: Report): string {
  const radar = r.readings.filter((x) => x.track !== null && x.track !== undefined)
  const valid = radar.filter((x) => x.value !== null)
  const dates = [...new Set(radar.map((x) => x.observation))]
  const tracks = [...new Set(radar.filter((x) => x.track).map((x) => `Track ${x.track} ${x.direction ? x.direction.toLowerCase() : ''}${x.frame ? `, frame ${x.frame}` : ''}`.trim()))]
  const maturity = [...new Set(radar.map((x) => x.maturity))]
  const missing = radar.filter((x) => x.value === null).map((x) => `${x.layer}: ${x.state}`)
  const fits = r.explanations.filter((h) => h.standing === 'Fits the checks' || h.standing === 'Partly fits')
  const row = (k: string, v: string) => `<tr><th>${esc(k)}</th><td>${v}</td></tr>`
  return `<h2>Investigation summary</h2><table>
${row('Evidence ID', esc(r.evidenceId))}${row('Case study', esc(r.case.name))}
${row('Observations read', dates.length ? esc(dates.join('; ')) : 'No radar observation holds this spot')}
${row('Track and frame', tracks.length ? esc(tracks.join('; ')) : '<span class="muted">None</span>')}
${row('Product maturity', maturity.length ? esc(maturity.join('; ')) : '<span class="muted">None</span>')}
${row('Valid data', `${valid.length} of ${radar.length} radar readings hold a valid value here${missing.length ? `; missing: ${esc(missing.join('; '))}` : ''}`)}
${row('Can the radar see here?', [r.observability, ...(r.otherViews ?? [])].filter((v): v is ObsAnswer => Boolean(v)).map((v) => `${esc(v.frame)}: ${v.answers.map((a) => esc(a.answer)).join(' / ')}`).join('<br>') || '<span class="muted">Not assessed for this case</span>')}
${row('Explanations that fit the checks (hypotheses)', fits.length ? fits.map((h) => `${esc(h.title)} (${esc(h.standing)})`).join('; ') : 'None fits the checks here')}
${row('First next step', r.nextSteps?.length ? `${esc(r.nextSteps[0].step)} (${esc(r.nextSteps[0].availability)})` : 'None from the rule table')}
</table><p class="muted">Evidence is what was read from the files; explanations are hypotheses built from it. Neither is a verdict.</p>`
}

// The app's offline policy forbids scripts written into a page, and a window the app opens inherits that policy.
// So the print button carries no script by default: the app wires it up from outside (see ReportButtons).
// `selfPrinting` is for the saved-file fallback, which opens from disk under no policy and has nobody to wire it.
export function toHtml(r: Report, selfPrinting = false): string {
  const li = (xs: string[]) => xs.map((x) => `<li>${esc(x)}</li>`).join('')
  const num = (v: number | null) => (v === null ? '' : Math.abs(v) >= 1000 ? v.toFixed(1) : v.toPrecision(5))
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(r.title)}</title><style>
body{font:14px/1.45 system-ui,sans-serif;color:#111;max-width:820px;margin:24px auto;padding:0 16px}h1{font-size:20px}h2{font-size:15px;margin-top:22px;border-bottom:1px solid #ccc}
table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #ddd;padding:4px 6px;text-align:left;vertical-align:top}.muted{color:#555}.tag{font-size:11px;border:1px solid #999;border-radius:8px;padding:0 6px}
@media print{button{display:none}}</style></head><body>
<button id="print"${selfPrinting ? ' onclick="print()"' : ''}>Print or save as PDF</button>
<h1>${esc(r.title)}</h1>
<p class="muted">Spot ${coordinates(r.point.lng, r.point.lat)} · event ${esc(r.case.eventDate)} · generated ${esc(r.generatedAt.slice(0, 16).replace('T', ' '))} UTC</p>
${summaryHtml(r)}
${r.observability ? `<h2>Can the radar see here? <span class="tag">Derived</span></h2>
${[r.observability, ...(r.otherViews ?? [])].map((v) => `<p class="muted">Pair ${esc(v.pair)}, ${esc(v.frame)}, method version ${v.methodVersion}</p>
${v.current ? '' : `<p><b>${esc(STALE_NOTE)}</b></p>`}
<table>${v.answers.map((a) => `<tr><th>${esc(a.question)}</th><td>${esc(a.answer)}</td></tr>`).join('')}</table>
${v.reasons.length ? `<ul>${li(v.reasons)}</ul>` : '<p>No problems found at this spot.</p>'}`).join('')}${r.otherViews?.length ? '<p class="muted">Each viewing direction is judged on its own flags.</p>' : ''}` : ''}
<h2>What could explain this? <span class="tag">Hypothesis</span></h2>
${r.explanationViews?.length ? `<ul>${li(r.explanationViews)}</ul>` : ''}
${r.explanations.map((h) => `<h3>${esc(h.title)} <span class="tag">${esc(h.standing)}</span></h3>
${h.for.length ? `<p><b>For</b></p><ul>${li(h.for)}</ul>` : ''}${h.against.length ? `<p><b>Against</b></p><ul>${li(h.against)}</ul>` : ''}
${h.context.length ? `<p><b>Context, not counted</b></p><ul>${li(h.context)}</ul>` : ''}
${h.missing.length ? `<p><b>Would settle it</b></p><ul>${li(h.missing)}</ul>` : ''}`).join('')}
${r.hazards ? `<h2>Hazard screens <span class="tag">Experimental</span></h2>
${r.hazards.terrain ? `<p><b>Landslide-prone terrain:</b> ${esc(r.hazards.terrain.class)}</p><ul>${li(r.hazards.terrain.factors)}</ul>` : ''}
${r.hazards.road ? roadHtml(r.hazards.road, li) : ''}
<p class="muted">${esc(r.hazards.maturity)}. Terrain and position only: geology, soil and rainfall are not included.</p>` : ''}
<h2>Every value at this spot</h2>
<table><tr><th>Layer</th><th>Evidence</th><th>Value</th><th>Observation</th><th>Maturity</th><th>Source file</th></tr>
${r.readings.map((x) => `<tr><td>${esc(x.layer)}</td><td>${esc(x.evidence)}</td><td>${x.value === null ? `<span class="muted">${esc(x.state)}</span>` : `${num(x.value)} ${esc(x.units === '1' ? '' : x.units ?? '')}`}</td><td>${esc(x.observation)}${x.track ? `<br><span class="muted">Track ${x.track}${x.frame ? `, frame ${x.frame}` : ''}</span>` : ''}</td><td>${esc(x.maturity)}</td><td style="word-break:break-all">${esc(x.source)}</td></tr>`).join('')}</table>
${r.nextSteps?.length ? `<h2>What to try next <span class="tag">Rule-based</span></h2><table><tr><th>Direction and question</th><th>Next step</th><th>Status</th></tr>${r.nextSteps.map((s) => `<tr><td>${esc(s.view)}: ${esc(s.question)}</td><td><b>${esc(s.step)}</b><br><span class="muted">${esc(s.gap)}. ${esc(s.detail)} [${esc(s.rule)}]</span></td><td>${esc(s.availability)}</td></tr>`).join('')}</table>` : ''}
${r.cannotEstablish?.length ? `<h2>What the radar cannot establish here</h2><ul>${li(r.cannotEstablish)}</ul>` : ''}
<h2>Read this first</h2><ul>${li(r.notes)}</ul>
${r.processing || r.reproduce ? `<h2>Provenance and reproduction</h2><table>
<tr><th>Evidence ID</th><td>${esc(r.evidenceId)}</td></tr>${r.processing ? `<tr><th>Data build</th><td>Manifest generated ${esc(r.processing.manifestGeneratedAt)}, schema ${r.processing.schemaVersion}${r.processing.observabilityMethod ? `, observability method version ${r.processing.observabilityMethod}` : ''}</td></tr><tr><th>Software</th><td>${esc(r.processing.app)}</td></tr>` : ''}
</table>${r.reproduce ? `<ol>${li(r.reproduce)}</ol>` : ''}` : ''}
</body></html>`
}

export function save(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
