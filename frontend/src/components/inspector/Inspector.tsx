import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Bookmark, Layer } from '../../types/manifest'
import { acquisitionLabel, coordinates, isUsable, posting, STATUS_LABEL, unitLabel } from '../../services/manifest'
import { samplePoint, type SampleResult } from '../../services/sampler'

interface Sample { layer: Layer; result: SampleResult }

function inBounds(p: [number, number], b: Bookmark['bounds']) {
  return p[0] >= b[0] && p[0] <= b[2] && p[1] >= b[1] && p[1] <= b[3]
}

function number(v: number) {
  if (Number.isInteger(v)) return String(v)
  return Math.abs(v) >= 1000 ? v.toFixed(1) : v.toPrecision(5)
}

function Value({ layer, result }: Sample) {
  if (result.value === undefined) return null
  return (
    <p className="value">
      {number(result.value)} <small>{layer.displayDb ? 'linear' : unitLabel(layer.units)}</small>
      {layer.displayDb && result.value > 0 && <small> · {(10 * Math.log10(result.value)).toFixed(2)} dB</small>}
    </p>
  )
}

function placeOf(point: [number, number], bookmarks: Bookmark[]) {
  const anchored = bookmarks.find((b) => b.anchor?.lng === point[0] && b.anchor?.lat === point[1])
  if (anchored) return `${anchored.name}, at ${anchored.anchor!.label}`
  return bookmarks.find((b) => inBounds(point, b.bounds))?.name ?? 'Outside bookmarked areas'
}

// Every point is a stored value read at this location, not an estimate. Gaps stay gaps.
function DayChart({ layer, point }: { layer: Layer; point: [number, number] }) {
  const [data, setData] = useState<{ time: string; value: number | null }[] | null>(null)
  const id = layer.id
  const steps = layer.timeSteps
  useEffect(() => {
    if (!steps || steps.length < 2) return
    let stale = false
    setData(null)
    Promise.all(steps.map((s) => samplePoint({ ...layer, sources: s.sources }, point[0], point[1]))).then((rs) => {
      if (!stale) setData(rs.map((r, i) => ({ time: steps[i].label.slice(0, 2), value: r.state === 'valid' ? (r.value ?? null) : null })))
    })
    return () => { stale = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- layer changes object with each time step, and the chart covers every step
  }, [id, point])
  if (!data || !data.some((d) => d.value !== null)) return null
  return (
    <figure className="histogram day-chart">
      <figcaption>This location through the day (UTC){layer.units && layer.units !== '1' ? `, ${layer.units}` : ''}</figcaption>
      <ResponsiveContainer width="100%" height={110}>
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#2c383f" vertical={false} />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ba8a3' }} tickLine={false} axisLine={false} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#9ba8a3' }} tickLine={false} axisLine={false} width={46} />
          <Tooltip contentStyle={{ background: '#182025', border: '1px solid #33404a', fontSize: 12 }} formatter={(v) => [Number(v).toFixed(2), layer.name]} labelFormatter={(v) => `${v}:00 UTC`} />
          <Line type="monotone" dataKey="value" stroke="#7fd1c7" strokeWidth={2} dot={{ r: 2 }} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  )
}

export function Inspector({ layer, layers, point, bookmarks }: { layer: Layer | undefined; layers: Layer[]; point: [number, number] | null; bookmarks: Bookmark[] }) {
  const [main, setMain] = useState<SampleResult | null>(null)
  const [quality, setQuality] = useState<Sample[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setMain(null)
    setQuality([])
    if (!point || !layer) return
    let stale = false
    setBusy(true)
    const qs = layer.qualityLayerIds.map((id) => layers.find((l) => l.id === id)).filter((l): l is Layer => Boolean(l && isUsable(l)))
    Promise.all([samplePoint(layer, point[0], point[1]), Promise.all(qs.map((q) => samplePoint(q, point[0], point[1])))]).then(([m, q]) => {
      if (stale) return
      setMain(m)
      setQuality(q.map((result, i) => ({ layer: qs[i], result })))
      setBusy(false)
    })
    return () => { stale = true }
  }, [layer, layers, point])

  if (!point) return <p className="muted">No point selected. Click the map or choose a bookmark to inspect a location.</p>
  return (
    <div className="inspector" data-state={busy ? 'loading' : main?.state}>
      <dl className="facts">
        <div><dt>Location</dt><dd>{coordinates(point[0], point[1])}</dd></div>
        <div><dt>Context</dt><dd>{placeOf(point, bookmarks)}</dd></div>
      </dl>
      {!layer ? <p className="muted">Select a layer to read a value here.</p> : busy ? <p className="muted">Loading sample…</p> : main && (
        <>
          <p className={`sample sample-${main.state}`}>{main.message}</p>
          <Value layer={layer} result={main} />
          <DayChart layer={layer} point={point} />
          <dl className="facts">
            <div><dt>Measurement</dt><dd>{layer.name}</dd></div>
            <div><dt>Product</dt><dd>{layer.mission} {layer.productType}</dd></div>
            <div><dt>Observation</dt><dd>{acquisitionLabel(layer)}</dd></div>
            {layer.orbitDirection && <div><dt>Orbit</dt><dd>{layer.orbitDirection.toLowerCase()}, Track {layer.track}{main.frame ? `, frame ${main.frame}` : ''}</dd></div>}
            <div><dt>Native posting</dt><dd>{posting(layer)}</dd></div>
            {main.col !== undefined && <div><dt>Native pixel</dt><dd>row {main.row}, col {main.col} (nearest, no interpolation)</dd></div>}
            <div><dt>Processing</dt><dd>{STATUS_LABEL[layer.status]}</dd></div>
            <div><dt>Source</dt><dd className="break">{main.granule ?? layer.mission}</dd></div>
          </dl>
          {quality.map((q) => (
            <div className="quality-row" key={q.layer.id}>
              <span>{q.layer.name}</span>
              <strong>{q.result.value !== undefined ? number(q.result.value) : q.result.message}</strong>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
