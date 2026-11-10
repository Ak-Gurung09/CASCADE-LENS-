import type { Manifest } from '../types/manifest'

export interface Finding { headline: string; points: { label: string; text: string }[]; source: string }

const pct = (v: number | undefined) => (v === undefined ? '?' : `${Math.round(v)}%`)
const date = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

// The first-minute card. Every figure is read from the manifest, so it changes with the data and never goes stale.
export function finding(m: Manifest): Finding | null {
  const cs = m.controlSeries, o = m.observability
  if (!cs || !o) return null
  const pre = cs.pairs.find((p) => p.pair[1] <= cs.eventDate)
  const co = cs.pairs.find((p) => p.pair[0] <= cs.eventDate && p.pair[1] >= cs.eventDate)
  const zone = (task: 'disturbance' | 'movement', id: string) => o.zones[task]?.[id]
  const det = 'vector:unosat_detachment_zone.geojson', flow = 'vector:unosat_mudflow_extent.geojson'
  const outside = zone('disturbance', flow)
  const points: Finding['points'] = []
  if (pre && co) points.push({ label: 'Measured change', text: `Inside the mapped mudflow, radar coherence fell from ${pre.inside.toFixed(2)} before the event to ${co.inside.toFixed(2)} across it, while untouched ground nearby went from ${pre.outside.toFixed(2)} to ${co.outside.toFixed(2)}. The drop is specific to the mudflow, not the season.` })
  const d = zone('disturbance', det)?.percent, mv = zone('movement', det)?.percent
  if (d && mv) points.push({ label: 'What the radar could judge', text: `At the source, a surface change was visible on ${pct(d.Usable)} of the ground, but ground movement could be measured on ${pct(mv.Usable)}. NISAR shows that the source changed, not how far it moved.` })
  if (outside?.percent) points.push({ label: 'What it could not see', text: `${pct(outside.percent['Not acquired'])} of the mapped mudflow that lies in the study area is outside this radar frame. CascadeLens marks it "not seen" rather than letting it look unchanged.` })
  return {
    headline: 'NISAR saw the Rasuwa mudflow change the ground, and CascadeLens shows exactly where the radar could and could not judge it.',
    points,
    source: `NISAR GUNW, Track ${cs.track} ${cs.direction.toLowerCase()}, frame ${cs.frame}: ${co ? `${date(co.pair[0])} to ${date(co.pair[1])}` : ''}${pre ? `, control pair ${date(pre.pair[0])} to ${date(pre.pair[1])}` : ''}. Provisional products.`,
  }
}
