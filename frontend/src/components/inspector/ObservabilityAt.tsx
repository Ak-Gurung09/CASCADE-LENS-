import { useEffect, useState } from 'react'
import type { Layer } from '../../types/manifest'
import { samplePoint } from '../../services/sampler'
import { classify, classLabel, isObservability, reasons, STALE_NOTE, taskOf } from '../../services/observability'
import { isUsable } from '../../services/manifest'

const QUESTION = { disturbance: 'See a surface change?', movement: 'Measure ground movement?' }

// "Can the radar see here?" for any clicked point, whichever layer is on the map.
export function ObservabilityAt({ layers, point, current = true }: { layers: Layer[]; point: [number, number]; current?: boolean }) {
  const obs = layers.filter((l) => isObservability(l) && isUsable(l))
  const [flags, setFlags] = useState<number | null | undefined>(undefined)
  const first = obs[0]
  useEffect(() => {
    if (!first) return
    let stale = false
    setFlags(undefined)
    samplePoint(first, point[0], point[1]).then((r) => { if (!stale) setFlags(r.state === 'valid' && r.value !== undefined ? r.value : null) })
    return () => { stale = true }
  }, [first, point])
  if (!first) return null
  return (
    <section className="obs-at" aria-label="Can the radar see here?">
      <h3>Can the radar see here?</h3>
      {flags === undefined ? <p className="muted small">Checking…</p> : flags === null ? (
        <p className="muted small">Not assessed at this spot: it lies outside the area checked. That is not the same as safe or unchanged.</p>
      ) : (
        <>
          {!current && <p className="notice small">{STALE_NOTE}</p>}
          <ul className="obs-tasks">
            {obs.map((l) => {
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
    </section>
  )
}
