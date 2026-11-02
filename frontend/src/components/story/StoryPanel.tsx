import type { StoryStep } from '../../data/story'

interface Props {
  steps: StoryStep[]
  index: number
  onGo: (i: number) => void
  onExit: () => void
}

export function StoryPanel({ steps, index, onGo, onExit }: Props) {
  const step = steps[index]
  const last = index === steps.length - 1
  return (
    <section className="story" aria-label="Rasuwa story" aria-live="polite">
      <header>
        <p className="eyebrow">Rasuwa 2026 — The Mountain-to-River Story</p>
        <button className="link" onClick={onExit}>Exit story</button>
      </header>
      <h2>{index + 1}. {step.title}</h2>
      {step.paragraphs.map((p) => <p key={p}>{p}</p>)}
      <footer>
        <button onClick={() => onGo(index - 1)} disabled={index === 0}>Back</button>
        <span>{index + 1} of {steps.length}</span>
        {last ? <button className="primary" onClick={onExit}>Explore the map</button> : <button className="primary" onClick={() => onGo(index + 1)}>Next</button>}
      </footer>
    </section>
  )
}
