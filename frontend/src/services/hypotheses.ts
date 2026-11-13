import type { Layer, Manifest } from '../types/manifest'
import { assetUrl, isUsable } from './manifest'
import { samplePoint } from './sampler'
import { FLAG, isObservability } from './observability'

// "What could explain this?" A rule-based screen of a few explanations at one clicked spot.
// It counts which checks agree and lists what is missing. It is never a probability or a verdict.

export interface Clues {
  flags: number | null | undefined // observability reason flags; null = outside the assessed area, undefined = no observability layer
  hasBaseline: boolean
  coherence: number | null
  cohPair: string | null
  offset: number | null // largest departure of the pixel offsets from the scene median, metres
  offsetUsual: number | null // the scene's usual spread (p2 to p98 half-width), metres
  snr: number | null
  snrMedian: number | null
  elevation: number | null
  slopeDeg: number | null
  inside: { mapped: string[]; water: string[] }
  control: { inside: number; outside: number; pair: string } | null
}

// The standing describes how the counted checks fall. It is a count, not a probability or a verdict.
export type Standing = 'Fits the checks' | 'Partly fits' | 'Little support' | 'Cannot judge here'

export interface Hypothesis {
  id: string
  title: string
  standing: Standing
  for: string[] // counted: a radar value at this spot, or independent mapping of this spot
  against: string[] // counted
  context: string[] // not counted: what the place is like (slope, height, area-wide figures), which cannot show that anything happened here
  missing: string[]
}

export const COH_LOW = 0.3
export const COH_HIGH = 0.6
export const STEEP_DEG = 25
export const HIGH_ICE_M = 4800

const f2 = (v: number) => v.toFixed(2)
const NEEDS_VALUE = 'A valid radar value at this spot (coherence or pixel offset). Without one, the radar cannot speak for or against this.'

function standing(forN: number, againstN: number): Standing {
  const s = forN - againstN
  return s >= 2 ? 'Fits the checks' : s >= 1 ? 'Partly fits' : 'Little support'
}

export function explain(c: Clues): Hypothesis[] {
  const fl = c.flags ?? 0
  const unseen = c.flags === null || Boolean(fl & (FLAG.outside | FLAG.noData | FLAG.productMasked))
  const hidden = Boolean(fl & (FLAG.layover | FLAG.shadow))
  const geometryUnknown = Boolean(fl & FLAG.geometryNotAssessed)
  const lowBase = Boolean(fl & FLAG.lowBaseline)
  const baseKnown = c.hasBaseline && c.flags !== undefined && !(fl & FLAG.baselineNoData)
  const coh = c.coherence
  const dropped = coh !== null && coh < COH_LOW
  const stable = coh !== null && coh >= COH_HIGH
  const offsetKnown = c.offset !== null && c.offsetUsual !== null
  const shifted = offsetKnown && c.offset! > c.offsetUsual! && (c.snr === null || c.snrMedian === null || c.snr >= c.snrMedian)
  const measured = coh !== null || offsetKnown
  const steep = c.slopeDeg !== null && c.slopeDeg >= STEEP_DEG
  const field = 'A field report or a cloud-free before-and-after optical image of this spot.'

  if (unseen) {
    const why = c.flags === null ? 'This spot lies outside the area the radar check covers.'
      : fl & FLAG.outside ? 'This spot is outside the radar frames checked here. Another frame may cover it, but it is not assessed.'
        : fl & FLAG.productMasked ? 'The radar product’s own quality mask flags this spot (water, an invalid subswath or an image anomaly), so its values cannot be used.'
          : 'The radar product holds no value at this spot.'
    return [{ id: 'unseen', title: 'No NISAR explanation from the frame checked', standing: 'Cannot judge here', for: [why], against: [], context: [],
      missing: ['A radar pair that covers this spot with valid data (the next frame along the track, or the other track in the download list).', field] }]
  }

  const out: Hypothesis[] = []
  const judge = (f: string[], a: string[], needs: boolean): Standing => (needs ? standing(f.length, a.length) : 'Cannot judge here')

  // 1. Real surface disturbance
  {
    const f: string[] = [], a: string[] = [], x: string[] = [], m: string[] = []
    if (dropped && baseKnown && !lowBase) f.push(`Coherence fell to ${f2(coh!)} in the ${c.cohPair} pair while the ground was coherent before the event.`)
    if (dropped && lowBase) m.push('The spot was already noisy before the event, so this drop cannot be told apart from normal noise.')
    if (dropped && !baseKnown) m.push('A valid value from the pair before the event, to show the spot was coherent beforehand.')
    if (stable) a.push(`Coherence stayed high (${f2(coh!)}): the radar echo barely changed.`)
    if (c.inside.mapped.length) f.push(`Inside an independently mapped area: ${c.inside.mapped.join(', ')}.`)
    else x.push('Not inside any independently mapped change area. That is not evidence that nothing changed: mapping is incomplete.')
    if (shifted) f.push(`The image features moved ${f2(c.offset!)} m from the scene's usual shift, more than its normal spread (${f2(c.offsetUsual!)} m), with a clear match.`)
    if (steep) x.push(`Steep ground (${Math.round(c.slopeDeg!)}°). Slope makes failure more likely in general; it does not show that anything moved here.`)
    if (c.control && c.inside.mapped.length) x.push(`Across the whole mapped mudflow, median coherence was ${f2(c.control.inside)} against ${f2(c.control.outside)} on ground nearby in the same pair (${c.control.pair}). That is an area-wide figure, not a reading at this spot.`)
    if (coh === null) m.push('Coherence for the event pair at this spot.')
    if (!c.hasBaseline) m.push('A radar pair from before the event, to show the spot was stable beforehand.')
    if (!measured) m.unshift(NEEDS_VALUE)
    m.push(field)
    out.push({ id: 'disturbance', title: 'The ground surface was disturbed (debris flow, landslide, erosion or new deposits)', standing: judge(f, a, measured), for: f, against: a, context: x, missing: m })
  }

  // 2. Ordinary seasonal or natural change
  {
    const f: string[] = [], a: string[] = [], x: string[] = [], m: string[] = []
    if (lowBase) f.push('The spot was already incoherent in the pair before the event, as vegetation, snow or wet soil often make it.')
    else if (baseKnown) a.push('The spot was coherent in the pair before the event, so it is not always noisy.')
    if (stable) a.push('Coherence stayed high, so there was little change of any kind.')
    if (c.elevation !== null && c.elevation >= HIGH_ICE_M) x.push(`High ground (${Math.round(c.elevation)} m), where snow and ice often change between passes.`)
    if (c.control && dropped) x.push(`Ground near the mudflow kept its coherence in the same pair (median ${f2(c.control.outside)}), so the season did not lower coherence everywhere. That is an area-wide figure, not a reading at this spot.`)
    const judged = measured || baseKnown
    if (!judged) m.push(NEEDS_VALUE)
    m.push('The same pair of dates from a previous year, to see the normal seasonal drop.')
    out.push({ id: 'seasonal', title: 'Ordinary seasonal change (vegetation, snow, ice or wet soil)', standing: judge(f, a, judged), for: f, against: a, context: x, missing: m })
  }

  // 3. Water surface
  if (c.inside.water.length || (coh !== null && coh < 0.15)) {
    const f: string[] = [], x: string[] = []
    if (c.inside.water.length) f.push(`Inside a mapped water body: ${c.inside.water.join(', ')}.`)
    if (coh !== null && coh < 0.15) f.push(`Very low coherence (${f2(coh)}), typical of moving water.`)
    if (!c.inside.water.length) x.push('Not inside any mapped lake. Rivers and new ponds may be unmapped.')
    out.push({ id: 'water', title: 'Open water (river channel or lake), which never stays coherent', standing: standing(f.length, 0), for: f, against: [], context: x,
      missing: ['A water mask from the same dates (for example a NISAR backscatter snapshot).'] })
  }

  // 4. Viewing artefact
  {
    const f: string[] = [], a: string[] = [], m: string[] = []
    if (fl & FLAG.layover) f.push('Layover here: echoes from different heights land on the same pixel.')
    if (fl & FLAG.shadow) f.push('Radar shadow here: the radar cannot reach this slope.')
    if (fl & FLAG.noUnwrapped) f.push('No reliably unwrapped phase at this spot, so the processing dropped it.')
    if (!hidden && !geometryUnknown && c.flags !== undefined) a.push('Not hidden by terrain from this viewing angle.')
    if (geometryUnknown) m.push('Elevation and viewing angles at this spot, to check for layover and shadow.')
    m.push('The same spot seen from the opposite direction (an ascending pass).')
    out.push({ id: 'artefact', title: 'A radar viewing artefact, not a real change', standing: hidden ? 'Fits the checks' : geometryUnknown && !f.length ? 'Cannot judge here' : standing(f.length, a.length),
      for: f, against: a, context: [], missing: m })
  }

  // 5. No change
  {
    const f: string[] = [], a: string[] = []
    if (stable) f.push(`Coherence stayed high (${f2(coh!)}).`)
    if (dropped) a.push(`Coherence dropped to ${f2(coh!)}.`)
    if (offsetKnown && !shifted) f.push('Image features did not shift beyond the scene\'s normal spread.')
    if (shifted) a.push('Image features shifted more than the scene\'s normal spread.')
    if (c.inside.mapped.length) a.push(`Inside an independently mapped area: ${c.inside.mapped.join(', ')}.`)
    out.push({ id: 'nochange', title: 'Nothing changed here', standing: judge(f, a, measured), for: f, against: a, context: [], missing: measured ? [field] : [NEEDS_VALUE, field] })
  }

  const order: Standing[] = ['Fits the checks', 'Partly fits', 'Little support', 'Cannot judge here']
  return out.sort((x, y) => order.indexOf(x.standing) - order.indexOf(y.standing) || (y.for.length - y.against.length) - (x.for.length - x.against.length))
}

// ---- gathering the clues at one point ----

type Ring = number[][]
type Geom = { type: string; coordinates: unknown }
const shapes = new Map<string, Promise<Geom[]>>()

function inRing(p: [number, number], ring: Ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function inGeometry(p: [number, number], g: Geom): boolean {
  const poly = (rings: Ring[]) => inRing(p, rings[0]) && !rings.slice(1).some((h) => inRing(p, h))
  if (g.type === 'Polygon') return poly(g.coordinates as Ring[])
  if (g.type === 'MultiPolygon') return (g.coordinates as Ring[][]).some(poly)
  return false
}

async function inside(layer: Layer, p: [number, number]) {
  const v = layer.vector!
  const [w, s, e, n] = v.bounds
  if (p[0] < w || p[0] > e || p[1] < s || p[1] > n) return false
  if (!shapes.has(v.url)) shapes.set(v.url, fetch(assetUrl(v.url)).then((r) => r.json()).then((fc) => (fc.features ?? []).map((x: { geometry: Geom }) => x.geometry).filter(Boolean)).catch(() => []))
  return (await shapes.get(v.url)!).some((g) => inGeometry(p, g))
}

const valid = async (l: Layer | undefined, p: [number, number]) => {
  if (!l) return null
  const r = await samplePoint(l, p[0], p[1])
  return r.state === 'valid' && r.value !== undefined ? r.value : null
}

const WATER = /lake|water|river/i
const MAPPED = /extent|detachment|change|damage|affected|landslide/i

export async function gather(m: Manifest, p: [number, number]): Promise<Clues> {
  const usable = m.layers.filter(isUsable)
  const obs = usable.find((l) => isObservability(l))
  const coh = usable.find((l) => l.measurementType === 'gunw-coherence' && l.category !== 'preview')
  const rng = usable.find((l) => l.measurementType === 'goff-range' && l.groupId === coh?.groupId) ?? usable.find((l) => l.measurementType === 'goff-range')
  const az = usable.find((l) => l.measurementType === 'goff-azimuth' && l.groupId === rng?.groupId)
  const snr = usable.find((l) => l.measurementType === 'goff-snr' && l.groupId === rng?.groupId)
  const dem = usable.find((l) => l.measurementType === 'elevation')
  const polys = usable.filter((l) => l.category === 'reference' && l.vector?.type === 'fill' && !/analys|district|scenario|if a /i.test(`${l.id} ${l.name}`))

  const d = 45 // metres either side for the slope
  const dLng = d / (111320 * Math.cos((p[1] * Math.PI) / 180)), dLat = d / 110540
  const [flags, c, r, a, s, z, ze, zw, zn, zs, hits] = await Promise.all([
    obs ? valid(obs, p) : Promise.resolve(undefined),
    valid(coh, p), valid(rng, p), valid(az, p), valid(snr, p), valid(dem, p),
    valid(dem, [p[0] + dLng, p[1]]), valid(dem, [p[0] - dLng, p[1]]), valid(dem, [p[0], p[1] + dLat]), valid(dem, [p[0], p[1] - dLat]),
    Promise.all(polys.map((l) => inside(l, p))),
  ])
  const dev = (v: number | null, l: Layer | undefined) => (v === null || l?.stats?.median === undefined ? null : Math.abs(v - l.stats.median))
  const spread = (l: Layer | undefined) => { const st = l?.stats as { p2?: number; p98?: number } | undefined; return st?.p2 !== undefined && st?.p98 !== undefined ? (st.p98 - st.p2) / 2 : null }
  const devs = [[dev(r, rng), spread(rng)], [dev(a, az), spread(az)]].filter((x): x is [number, number] => x[0] !== null && x[1] !== null)
  const worst = devs.sort((x, y) => y[0] / y[1] - x[0] / x[1])[0]
  const slope = [z, ze, zw, zn, zs].every((v) => v !== null) ? (Math.atan(Math.hypot((ze! - zw!) / (2 * d), (zn! - zs!) / (2 * d))) * 180) / Math.PI : null
  const names = polys.filter((_, i) => hits[i]).map((l) => l.name.replace(/\s*\(.*\)$/, ''))
  const cs = m.controlSeries
  const co = cs?.pairs.find((x) => coh && x.pair[0] === coh.acquisition.reference && x.pair[1] === coh.acquisition.secondary)
  return {
    flags,
    hasBaseline: Boolean(m.observability?.baselinePair),
    coherence: c,
    cohPair: coh ? `${coh.acquisition.reference} to ${coh.acquisition.secondary}` : null,
    offset: worst ? worst[0] : null,
    offsetUsual: worst ? worst[1] : null,
    snr: s,
    snrMedian: snr?.stats?.median ?? null,
    elevation: z,
    slopeDeg: slope,
    inside: { mapped: names.filter((n) => MAPPED.test(n) && !WATER.test(n)), water: names.filter((n) => WATER.test(n)) },
    control: co ? { inside: co.inside, outside: co.outside, pair: `${co.pair[0]} to ${co.pair[1]}` } : null,
  }
}
