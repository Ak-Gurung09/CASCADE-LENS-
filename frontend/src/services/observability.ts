import type { Layer, Manifest } from '../types/manifest'

// Mirrors processing/src/cascade_lens/observability.py. Reasons stay separate; classes are decided per task.
export const FLAG = { outside: 1, noData: 2, layover: 4, shadow: 8, lowCoherence: 16, noUnwrapped: 32, lowBaseline: 64 } as const
export type Task = 'disturbance' | 'movement'

const REASON: [number, string][] = [
  [FLAG.outside, 'Outside this radar frame: not acquired.'],
  [FLAG.noData, 'Inside the frame, but the product holds no value here.'],
  [FLAG.layover, 'Layover: the slope faces the radar more steeply than its viewing angle, so echoes from different heights pile up.'],
  [FLAG.shadow, 'Radar shadow: the slope faces away too steeply for the radar to reach it.'],
  [FLAG.lowCoherence, 'Low coherence in this pair (below 0.3): the signal changed or is noisy.'],
  [FLAG.noUnwrapped, 'No unwrapped phase here, so no movement value.'],
  [FLAG.lowBaseline, 'Already incoherent before the event (baseline pair below 0.3), so a drop cannot be told from noise.'],
]

export function reasons(flags: number): string[] {
  return REASON.filter(([bit]) => (flags & bit) !== 0).map(([, text]) => text)
}

export function classify(flags: number, task: Task): number {
  if (flags & FLAG.outside) return 5
  if (flags & FLAG.noData) return 4
  if (flags & (FLAG.layover | FLAG.shadow)) return 3
  const poor = task === 'disturbance' ? flags & FLAG.lowBaseline : flags & (FLAG.lowCoherence | FLAG.noUnwrapped)
  return poor ? 2 : 1
}

export const isObservability = (l: Layer) => l.measurementType.startsWith('observability-')
export const taskOf = (l: Layer) => l.measurementType.replace('observability-', '') as Task

export function classInfo(m: Manifest | undefined, task: Task, code: number) {
  return m?.observability?.classes[task]?.find((c) => c.code === code)
}
