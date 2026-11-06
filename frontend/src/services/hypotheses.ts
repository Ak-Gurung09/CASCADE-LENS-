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

export type Standing = 'Best supported' | 'Possible' | 'Weak' | 'Cannot judge here'

export interface Hypothesis {
  id: string
  title: string
  standing: Standing
  for: string[]
  against: string[]
  missing: string[]
}

export const COH_LOW = 0.3
export const COH_HIGH = 0.6
export const STEEP_DEG = 25
export const HIGH_ICE_M = 4800

const f2 = (v: number) => v.toFixed(2)

function standing(forN: number, againstN: number): Standing {
  const s = forN - againstN
  return s >= 2 ? 'Best supported' : s >= 1 ? 'Possible' : 'Weak'
}

export function explain(c: Clues): Hypothesis[] {
  const fl = c.flags ?? 0
  const unseen = c.flags === null || Boolean(fl & (FLAG.outside | FLAG.noData))
  const hidden = Boolean(fl & (FLAG.layover | FLAG.shadow))
  const lowBase = Boolean(fl & FLAG.lowBaseline)
  const coh = c.coherence
  const dropped = coh !== null && coh < COH_LOW
  const stable = coh !== null && coh >= COH_HIGH
  const shifted = c.offset !== null && c.offsetUsual !== null && c.offset > c.offsetUsual && (c.snr === null || c.snrMedian === null || c.snr >= c.snrMedian)
  const steep = c.slopeDeg !== null && c.slopeDeg >= STEEP_DEG
  const field = 'A field report or a cloud-free before-and-after optical image of this spot.'

  if (unseen) {
    const why = c.flags === null ? 'This spot lies outside the area the radar check covers.' : fl & FLAG.outside ? 'This spot is outside the radar frame used here: it was not acquired.' : 'The radar product holds no value at this spot.'
    return [{ id: 'unseen', title: 'No NISAR explanation is possible here', standing: 'Cannot judge here', for: [why], against: [],
      missing: ['A radar pair that covers this spot (the next frame along the track, or the other track in the download list).', field] }]
  }

  const out: Hypothesis[] = []

  // 1. Real surface disturbance
  {
    const f: string[] = [], a: string[] = [], m: string[] = []
    if (dropped && !lowBase) f.push(`Coherence fell to ${f2(coh!)} in the ${c.cohPair} pair while the ground was stable before the event.`)
    if (dropped && lowBase) m.push('The spot was already noisy before the event, so this drop cannot be told apart from normal noise.')
    if (stable) a.push(`Coherence stayed high (${f2(coh!)}): the radar echo barely changed.`)
    if (c.inside.mapped.length) f.push(`Inside an independently mapped area: ${c.inside.mapped.join(', ')}.`)
    else a.push('Not inside any independently mapped damage or change area.')
    if (shifted) f.push(`The image features moved ${f2(c.offset!)} m from the scene's usual shift, more than its normal spread (${f2(c.offsetUsual!)} m), with a clear match.`)
    if (steep) f.push(`Steep ground (${Math.round(c.slopeDeg!)}°), where slides and debris flows start or run.`)
    if (coh === null) m.push('Coherence for the event pair at this spot.')
    if (!c.hasBaseline) m.push('A radar pair from before the event, to show the spot was stable beforehand.')
    if (c.control && c.inside.mapped.length) f.push(`Across the whole mapped mudflow, coherence was ${f2(c.control.inside)} inside against ${f2(c.control.outside)} on untouched ground nearby in the same pair (${c.control.pair}).`)
    m.push(field)
    out.push({ id: 'disturbance', title: 'The ground surface was disturbed (debris flow, landslide, erosion or new deposits)', standing: standing(f.length, a.length), for: f, against: a, missing: m })
  }

  // 2. Ordinary seasonal or natural change
  {
    const f: string[] = [], a: string[] = [], m: string[] = []
    if (lowBase) f.push('The spot was already incoherent in the pair before the event, as vegetation, snow or wet soil often make it.')
    else if (c.hasBaseline && c.flags !== undefined) a.push('The spot was coherent in the pair before the event, so it is not always noisy.')
    if (c.elevation !== null && c.elevation >= HIGH_ICE_M) f.push(`High ground (${Math.round(c.elevation)} m): snow and ice change between passes.`)
    if (c.control && dropped) a.push(`Untouched ground near the mudflow kept its coherence in the same pair (${f2(c.control.outside)}), so the season alone did not cause a general drop.`)
    if (stable) a.push('Coherence stayed high, so there was little change of any kind.')
    m.push('The same pair of dates from a previous year, to see the normal seasonal drop.')
    out.push({ id: 'seasonal', title: 'Ordinary seasonal change (vegetation, snow, ice or wet soil)', standing: standing(f.length, a.length), for: f, against: a, missing: m })
  }

  // 3. Water surface
  if (c.inside.water.length || (coh !== null && coh < 0.15)) {
    const f: string[] = [], a: string[] = []
    if (c.inside.water.length) f.push(`Inside a mapped water body: ${c.inside.water.join(', ')}.`)
    if (coh !== null && coh < 0.15) f.push(`Very low coherence (${f2(coh)}), typical of moving water.`)
    if (!c.inside.water.length) a.push('Not inside any mapped lake.')
    out.push({ id: 'water', title: 'Open water (river channel or lake), which never stays coherent', standing: standing(f.length, a.length), for: f, against: a,
      missing: ['A water mask from the same dates (for example a NISAR backscatter snapshot).'] })
  }

  // 4. Viewing artefact
  {
    const f: string[] = [], a: string[] = []
    if (fl & FLAG.layover) f.push('Layover here: echoes from different heights land on the same pixel.')
    if (fl & FLAG.shadow) f.push('Radar shadow here: the radar cannot reach this slope.')
    if (fl & FLAG.noUnwrapped) f.push('No unwrapped phase at this spot, so the processing dropped it.')
    if (!hidden && c.flags !== undefined) a.push('Not hidden by terrain from this viewing angle.')
    out.push({ id: 'artefact', title: 'A radar viewing artefact, not a real change', standing: hidden ? 'Best supported' : standing(f.length, a.length), for: f, against: a,
      missing: ['The same spot seen from the opposite direction (an ascending pass).'] })
  }

  // 5. No change
  {
    const f: string[] = [], a: string[] = []
    if (stable) f.push(`Coherence stayed high (${f2(coh!)}).`)
    if (dropped) a.push(`Coherence dropped to ${f2(coh!)}.`)
    if (c.offset !== null && c.offsetUsual !== null && !shifted) f.push('Image features did not shift beyond the scene\'s normal spread.')
    if (shifted) a.push('Image features shifted more than the scene\'s normal spread.')
    if (c.inside.mapped.length) a.push(`Inside an independently mapped area: ${c.inside.mapped.join(', ')}.`)
    out.push({ id: 'nochange', title: 'Nothing changed here', standing: standing(f.length, a.length), for: f, against: a, missing: [field] })
  }

  const order: Standing[] = ['Best supported', 'Possible', 'Weak', 'Cannot judge here']
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
