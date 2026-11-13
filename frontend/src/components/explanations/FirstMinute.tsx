import { useEffect, useState } from 'react'
import type { Manifest } from '../../types/manifest'
import { finding } from '../../services/finding'
import { assetUrl } from '../../services/manifest'

const KEY = 'cascadelens.finding.seen'

// `exploring` turns true once the reader picks a place, a layer or a spot: the card then steps aside instead of covering the map they asked for.
export function FindingCard({ manifest, exploring = false, onStory, onStatus }: { manifest: Manifest; exploring?: boolean; onStory: () => void; onStatus: () => void }) {
  const f = finding(manifest)
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(KEY) !== '1' } catch { return true } })
  const close = () => { setOpen(false); try { localStorage.setItem(KEY, '1') } catch { /* private window */ } }
  useEffect(() => { if (exploring) close() }, [exploring])
  if (!f || !open) return null
  return (
    <section className="finding" role="dialog" aria-label="The key finding">
      <p className="eyebrow">The finding</p>
      <h2>{f.headline}</h2>
      <ol>{f.points.map((p) => <li key={p.label}><strong>{p.label}.</strong> {p.text}</li>)}</ol>
      <p className="muted small">{f.source}</p>
      <div className="finding-actions">
        <button className="primary" onClick={() => { close(); onStory() }}>Walk through the evidence</button>
        <button onClick={close}>Explore the map</button>
        <button className="link" onClick={onStatus}>What is real here?</button>
      </div>
    </section>
  )
}

interface Capability { id: string; name: string; priority: string; maturity: string; evidence: string }

export function StatusPanel({ onClose }: { onClose: () => void }) {
  const [caps, setCaps] = useState<Capability[] | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    fetch(assetUrl('data/status.json')).then((r) => r.json()).then((s) => setCaps(s.capabilities)).catch(() => setError(true))
  }, [])
  return (
    <section className="status-panel" role="dialog" aria-label="What is real here?">
      <header><h2>What is real here?</h2><button onClick={onClose} aria-label="Close">×</button></header>
      <p className="muted small">Every capability with its honest status. A feature is only "complete and tested" when its processing, display and tests all work on real data.</p>
      {error && <p className="muted">The status list could not be loaded.</p>}
      {caps && <ul>{caps.map((c) => (
        <li key={c.id}><span className={`maturity m-${c.maturity.split(/[ ,]/)[0].toLowerCase()}`}>{c.maturity.toLowerCase()}</span><strong>{c.name}</strong><small>{c.evidence}</small></li>
      ))}</ul>}
    </section>
  )
}
