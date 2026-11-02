import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import type { Layer } from '../../types/manifest'
import { acquisitionLabel, posting, STATUS_LABEL, unitLabel } from '../../services/manifest'
import { explanationFor } from '../../data/explanations'

function Histogram({ layer }: { layer: Layer }) {
  const h = layer.stats?.histogram
  if (!h) return null
  const data = h.counts.map((count, i) => ({ value: Number(h.edges[i].toFixed(2)), count }))
  const unit = layer.displayDb ? 'dB' : `${unitLabel(layer.units)}${layer.displayRelative ? ', relative to frame median' : ''}`
  return (
    <figure className="histogram">
      <figcaption>Distribution of valid pixels{unit ? ` (${unit})` : ''}</figcaption>
      <ResponsiveContainer width="100%" height={84}>
        <BarChart data={data} margin={{ top: 4, right: 14, bottom: 0, left: 14 }} barCategoryGap={0}>
          <XAxis dataKey="value" tick={{ fontSize: 10, fill: '#9ba8a3' }} tickLine={false} axisLine={false} interval={12} />
          <Tooltip cursor={{ fill: 'rgba(255,255,255,.06)' }} contentStyle={{ background: '#182025', border: '1px solid #33404a', fontSize: 12 }} formatter={(v) => [Number(v).toLocaleString(), 'pixels']} labelFormatter={(v) => `from ${v}`} />
          <Bar dataKey="count" fill="#7fd1c7" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </figure>
  )
}

export function Interpretation({ layer }: { layer: Layer }) {
  const e = explanationFor(layer)
  const unit = layer.unitsNote ?? unitLabel(layer.units)
  const coverage = layer.sources.filter((s) => s.validFraction !== undefined)
  return (
    <>
      <dl className="facts">
        <div><dt>Product</dt><dd>{layer.mission} {layer.productType}</dd></div>
        <div><dt>Class</dt><dd>{layer.measurementClass}</dd></div>
        <div><dt>Observation</dt><dd>{acquisitionLabel(layer)}</dd></div>
        {layer.orbitDirection && <div><dt>Orbit</dt><dd>{layer.orbitDirection.toLowerCase()}, Track {layer.track}, frames {layer.frames.join('/')}</dd></div>}
        {unit && <div><dt>Units</dt><dd>{unit}</dd></div>}
        {layer.postingM && <div><dt>Native posting</dt><dd>{posting(layer)}</dd></div>}
        {layer.crs && <div><dt>CRS</dt><dd>{layer.crs}</dd></div>}
        <div><dt>Status</dt><dd>{STATUS_LABEL[layer.status]}</dd></div>
        <div><dt>Maturity</dt><dd>{layer.productMaturity}</dd></div>
        {coverage.map((s) => (
          <div key={s.granule}>
            <dt>Valid pixels{s.frame ? ` f${s.frame}` : ''}</dt>
            <dd>{Math.round(s.validFraction! * 100)}%{s.maskedFraction ? `, ${Math.round(s.maskedFraction * 100)}% masked` : ''}</dd>
          </div>
        ))}
      </dl>
      {layer.statusReason && <p className="notice">{layer.statusReason}</p>}
      <Histogram layer={layer} />
      <h3>What am I seeing?</h3><p>{e.what}</p>
      <h3>What does it measure?</h3><p>{e.measures}</p>
      <h3>What should I inspect?</h3><p>{e.inspect}</p>
      <h3>What does it establish?</h3><p>{e.establishes}</p>
      <h3>Limitations</h3>
      <ul className="limits">{layer.limitations.map((t) => <li key={t}>{t}</li>)}</ul>
      <h3>Source</h3>
      <p className="attribution">{layer.attribution}</p>
      {layer.page && <p className="attribution break">{layer.page}</p>}
      {layer.sourceGranules.length > 0 && (
        <details>
          <summary>Source granules ({layer.sourceGranules.length})</summary>
          <ul className="granules">{layer.sourceGranules.map((g) => <li key={g} className="break">{g}</li>)}</ul>
        </details>
      )}
      {layer.processingHistory && (
        <details>
          <summary>Processing history</summary>
          <pre className="break">{JSON.stringify(layer.processingHistory, null, 1)}</pre>
        </details>
      )}
    </>
  )
}
