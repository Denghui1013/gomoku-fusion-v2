export type ExperimentVariant = 'A' | 'B'

type ABEventName =
  | 'shown'
  | 'primary'
  | 'share'
  | 'replay_open'
  | 'replay_close'
  | 'skip'
  | 'rating'

type ABEvent = {
  ts: number
  experiment: string
  variant: ExperimentVariant
  name: ABEventName
  data?: Record<string, unknown>
}

function safeParseJSON<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export function getExperimentVariant(experiment: string): ExperimentVariant {
  if (typeof window === 'undefined') return 'B'
  const key = `ab:${experiment}:variant`
  const existing = window.localStorage.getItem(key)
  if (existing === 'A' || existing === 'B') return existing
  const variant: ExperimentVariant = Math.random() < 0.5 ? 'A' : 'B'
  window.localStorage.setItem(key, variant)
  return variant
}

export function trackABEvent(
  experiment: string,
  variant: ExperimentVariant,
  name: ABEventName,
  data?: Record<string, unknown>
) {
  if (typeof window === 'undefined') return
  const key = `ab:${experiment}:events`
  const prev = safeParseJSON<ABEvent[]>(window.localStorage.getItem(key)) ?? []
  const next = [...prev, { ts: Date.now(), experiment, variant, name, data }].slice(-250)
  window.localStorage.setItem(key, JSON.stringify(next))
}

export function startDwellTimer(experiment: string, variant: ExperimentVariant) {
  if (typeof window === 'undefined') return () => {}
  const startedAt = performance.now()
  return (name: ABEventName, data?: Record<string, unknown>) => {
    const dwellMs = Math.max(0, Math.round(performance.now() - startedAt))
    trackABEvent(experiment, variant, name, { dwellMs, ...data })
  }
}

