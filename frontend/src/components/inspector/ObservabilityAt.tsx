import { useEffect, useState } from 'react'
import type { Layer } from '../../types/manifest'
import { samplePoint } from '../../services/sampler'
import { classify, classLabel, obsViews, reasons, STALE_NOTE, taskOf, type ObsView } from '../../services/observability'
import { isUsable } from '../../services/manifest'

const QUESTION = { disturbance: 'See a surface change?', movement: 'Measure ground movement?' }

// One viewing direction at the clicked point. Its own reason-flag raster is sampled, never another view's.
function ViewAt({ view, point, titled, current }: { view: ObsView; point: [number, number]; titled: boolean; current: boolean }) {
  const first = view.layers[0]
  const [flags, setFlags] = useState<number | null | undefined>(undefined)
  useEffect(() => {
    let stale = false
    setFlags(undefined)
    samplePoint(first, point[0], point[1]).then((r) => { if (!stale) setFlags(r.state === 'valid' && r.value !== undefined ? r.value : null) })
    return () => { stale = true }
  }, [first, point])
  return (
    <div className="obs-view">
      {titled && <h4>{view.label}</h4>}
      {flags === undefined ? <p className="muted small">Checking…</p> : flags === null ? (
        <p className="muted small">Not assessed at this spot: it lies outside the area checked. That is not the same as safe or unchanged.</p>
      ) : (
        <>
          {!current && <p className="notice small">{STALE_NOTE}</p>}
          <ul className="obs-tasks">
            {view.layers.map((l) => {
              const task = taskOf(l)
              const code = classify(flags, task)
              const key = l.legend?.keys?.[code - 1]
              return <li key={l.id}><span>{QUESTION[task]}</span><b style={{ color: key?.color }}><i style={{ background: key?.color }} />{classLabel(l, code)}</b></li>
            })}
          </ul>
          {reasons(flags).length > 0
            ? <ul className="obs-reasons">{reasons(flags).map((r) => <li key={r}>{r}</li>)}</ul>
            : <p className="muted small">No problems found: inside the frame, data present and not flagged by the product, not hidden by terrain, and a clear signal.</p>}
          <p className="muted small">Pair {first.acquisition.reference} to {first.acquisition.secondary}, Track {first.track}, frame {first.frames.join(', ')}. Derived by CascadeLens; method in the layer's notes.</p>
        </>
      )}
    </div>
  )
}

// "Can the radar see here?" for any clicked point, whichever layer is on the map: once per viewing direction.
export function ObservabilityAt({ layers, point, current = true }: { layers: Layer[]; point: [number, number]; current?: boolean }) {
  const views = obsViews(layers.filter(isUsable))
  if (!views.length) return null
  return (
    <section className="obs-at" aria-label="Can the radar see here?">
      <h3>Can the radar see here?</h3>
      {views.map((v) => <ViewAt key={v.key} view={v} point={point} titled={views.length > 1} current={current} />)}
      {views.length > 1 && <p className="muted small">Each viewing direction is judged on its own. A spot one cannot judge may still be usable from the other.</p>}
    </section>
  )
}
