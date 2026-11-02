import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Bookmark, Manifest } from '../types/manifest'
import { isUsable, loadManifest } from '../services/manifest'
import { buildStory } from '../data/story'
import { LeftPanel, type EvidenceView } from '../components/layout/LeftPanel'
import { MapView, type MapStatus } from '../components/map/MapView'
import { Legend } from '../components/legends/Legend'
import { Credits } from '../components/legends/Credits'
import { Inspector } from '../components/inspector/Inspector'
import { Interpretation } from '../components/explanations/Interpretation'
import { StoryPanel } from '../components/story/StoryPanel'

const TERRAIN = 'context:terrain'

// WebGL can be unavailable or lost. The panels stay readable if the map cannot run.
class MapBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    return this.state.error ? <p className="map-alert" role="alert">The map could not run: {this.state.error}</p> : this.props.children
  }
}

export function App() {
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    loadManifest().then((m) => { if (live) setManifest(m) }).catch((e: Error) => { if (live) setFailure(e.message) })
    return () => { live = false }
  }, [])
  if (failure) return <main className="splash"><h1>GAIA CascadeLens could not start</h1><p>{failure}</p><p>Run the processing scripts to generate the data manifest, then reload.</p></main>
  if (!manifest) return <main className="splash"><p>Initializing…</p></main>
  return <Explorer manifest={manifest} />
}

function Explorer({ manifest: m }: { manifest: Manifest }) {
  const primary = m.groups.find((g) => g.kind === 'pair')
  const firstLayer = m.layers.find((l) => (primary ? l.groupId === primary.id : l.category === 'gridded') && isUsable(l))
  const [groupId, setGroupId] = useState(primary?.id ?? '')
  const [step, setStep] = useState(0)
  const [view, setView] = useState<EvidenceView>('gunw')
  const [activeId, setActiveId] = useState(firstLayer?.id ?? TERRAIN)
  const [layerVisible, setLayerVisible] = useState(true)
  const [overlayId, setOverlayId] = useState('')
  const [showMask, setShowMask] = useState(false)
  const [showTerrain, setShowTerrain] = useState(true)
  const [opacity, setOpacity] = useState(0.85)
  const [referenceIds, setReferenceIds] = useState<string[]>(['ref:unosat-extent', 'ref:rivers', 'ref:places'])
  const [bookmarkId, setBookmarkId] = useState<string | null>(null)
  const [focus, setFocus] = useState<{ bounds: Bookmark['bounds']; nonce: number } | null>(null)
  const [point, setPoint] = useState<[number, number] | null>(null)
  const [storyStep, setStoryStep] = useState<number | null>(null)
  const [mapStatus, setMapStatus] = useState<MapStatus>({ state: 'loading' })
  const [covered, setCovered] = useState(true)
  const [panel, setPanel] = useState<'left' | 'right' | null>(null)
  const [tab, setTab] = useState<'inspect' | 'about'>('about')
  const [aboutId, setAboutId] = useState<string | null>(null)

  const byId = useCallback((id: string) => m.layers.find((l) => l.id === id), [m])
  const group = m.groups.find((g) => g.id === groupId)
  const active = useMemo(() => {
    const l = byId(activeId)
    return l?.timeSteps ? { ...l, sources: l.timeSteps[Math.min(step, l.timeSteps.length - 1)].sources } : l
  }, [byId, activeId, step])
  const terrain = byId(TERRAIN)
  const references = useMemo(() => referenceIds.map(byId).filter((l): l is NonNullable<typeof l> => Boolean(l && isUsable(l))), [referenceIds, byId])
  const overlay = overlayId ? byId(overlayId) : undefined
  const footprints = useMemo(() => {
    const seen = new Set<number>()
    return m.granules.filter((g) => g.group === groupId && !seen.has(g.frame) && Boolean(seen.add(g.frame)))
  }, [m, groupId])
  const story = useMemo(() => (m.groups.length ? buildStory(m) : []), [m])
  const shownLayer = layerVisible ? active : undefined
  const detail = (aboutId && byId(aboutId)) || active
  const bookmark = m.bookmarks.find((b) => b.id === bookmarkId)

  const selectLayer = (id: string) => { setActiveId(id); setOverlayId(''); setShowMask(false); setLayerVisible(true); setAboutId(null) }

  const goToBookmark = useCallback((b: Bookmark) => {
    setBookmarkId(b.id)
    setFocus({ bounds: b.bounds, nonce: Date.now() })
    if (b.anchor) setPoint([b.anchor.lng, b.anchor.lat])
  }, [])

  const selectGroup = (id: string) => {
    setGroupId(id)
    const same = byId(`${id}:${active?.measurementType}`)
    const next = same && isUsable(same) ? same : m.layers.find((l) => l.groupId === id && isUsable(l))
    selectLayer(next?.id ?? TERRAIN)
  }

  // Same point, same bookmark, different technique: that is the dual-evidence comparison.
  const selectView = (v: EvidenceView) => {
    setView(v)
    if (!group) return
    const target = (v === 'gcov') !== (group.kind === 'snapshot') ? m.groups.find((g) => g.kind === (v === 'gcov' ? 'snapshot' : 'pair'))! : group
    setGroupId(target.id)
    const next = m.layers.find((l) => l.groupId === target.id && (l.category === v || l.previewOf === v) && isUsable(l))
    selectLayer(next?.id ?? TERRAIN)
  }

  const goStory = (i: number) => {
    const s = story[i]
    setStoryStep(i)
    selectLayer(s.layerId)
    setReferenceIds(s.references)
    const b = m.bookmarks.find((x) => x.id === s.bookmarkId)
    if (b) goToBookmark(b)
  }

  const showAbout = (id: string) => { setAboutId(id); setTab('about'); setPanel('right') }

  return (
    <div className={`app ${panel ? `show-${panel}` : ''} ${storyStep !== null ? 'story-on' : ''}`}>
      <header className="topbar">
        <div className="brand"><strong>GAIA CascadeLens</strong><span>Following Earth's movement, one radar observation at a time.</span></div>
        <div className="top-actions">
          <button className="mobile-only" aria-expanded={panel === 'left'} onClick={() => setPanel(panel === 'left' ? null : 'left')}>{group?.label ?? 'Controls'}</button>
          <button className="mobile-only" aria-expanded={panel === 'right'} onClick={() => setPanel(panel === 'right' ? null : 'right')}>Details</button>
          <span className={`map-state map-${mapStatus.state}`} role="status">{mapStatus.state === 'error' ? 'Map source failed' : mapStatus.state === 'loading' ? 'Loading map data' : 'Map ready'}</span>
        </div>
      </header>
      {m.fixture && <p className="fixture-banner">{m.fixtureLabel ?? 'SYNTHETIC TEST FIXTURE. These values are invented for software testing and are not satellite data.'}</p>}

      <aside className="left" aria-label="Controls">
        <LeftPanel manifest={m} group={group} view={view} activeId={activeId} step={step} onStep={setStep} hasStory={story.length > 0} layerVisible={layerVisible} bookmarkId={bookmarkId} opacity={opacity} showTerrain={showTerrain} showMask={showMask} overlayId={overlayId}
          referenceIds={referenceIds} storyActive={storyStep !== null} onBookmark={goToBookmark} onGroup={selectGroup} onView={selectView} onLayer={selectLayer} onLayerVisible={setLayerVisible} onOpacity={setOpacity} onTerrain={setShowTerrain}
          onMask={setShowMask} onOverlay={setOverlayId} onReference={(id, on) => setReferenceIds((r) => (on ? [...r, id] : r.filter((x) => x !== id)))} onAbout={showAbout} onStory={() => goStory(0)} />
      </aside>

      <main className="center">
        <MapBoundary>
          <MapView envelope={m.caseStudy.searchEnvelope} terrain={terrain} showTerrain={showTerrain} active={shownLayer} overlay={overlay} showMask={showMask} opacity={opacity} references={references}
            footprints={footprints} point={point} focus={focus} onPoint={(p) => { setPoint(p); setTab('inspect'); setAboutId(null) }} onStatus={setMapStatus} onCoverage={setCovered} />
        </MapBoundary>
        {bookmark && <p className="place-chip">{bookmark.name}</p>}
        {mapStatus.state === 'error' && <p className="map-alert" role="alert">{mapStatus.message}</p>}
        {!covered && <p className="map-notice" role="status">No geographic coverage: {active?.name} has no data in this view.</p>}
        <Legend layer={shownLayer} references={references} />
        <Credits layers={[terrain, shownLayer, ...references]} />
      </main>

      <aside className="right" aria-label="Scientific interpretation">
        {storyStep !== null ? <StoryPanel steps={story} index={storyStep} onGo={goStory} onExit={() => setStoryStep(null)} /> : (
          <div className="panel-body">
            <p className="eyebrow">{detail?.mission} {detail?.productType}</p>
            <h2>{detail?.name}</h2>
            {aboutId ? <button className="link" onClick={() => setAboutId(null)}>Back to {active?.name}</button> : (
              <div className="tabs" role="tablist">
                <button role="tab" aria-selected={tab === 'about'} className={tab === 'about' ? 'on' : ''} onClick={() => setTab('about')}>Interpretation</button>
                <button role="tab" aria-selected={tab === 'inspect'} className={tab === 'inspect' ? 'on' : ''} onClick={() => setTab('inspect')}>Inspector</button>
              </div>
            )}
            {tab === 'inspect' && !aboutId ? <Inspector layer={active} layers={m.layers} point={point} bookmarks={m.bookmarks} /> : detail && <Interpretation layer={detail} />}
          </div>
        )}
      </aside>
    </div>
  )
}
