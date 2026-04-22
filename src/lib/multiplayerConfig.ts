const DEFAULT_LOCAL_SERVER_URL = 'http://localhost:3010'

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

export function getConfiguredMultiplayerServerUrl(): string {
  const configured = process.env.NEXT_PUBLIC_MULTIPLAYER_SERVER_URL?.trim()
  if (configured) {
    return trimTrailingSlash(configured)
  }

  if (typeof window !== 'undefined' && /^https?:/i.test(window.location.origin)) {
    const { hostname } = window.location
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return trimTrailingSlash(window.location.origin)
    }
  }

  return DEFAULT_LOCAL_SERVER_URL
}

export function getMultiplayerServerCandidates(preferredUrl?: string): string[] {
  const candidates: string[] = []
  const push = (value?: string | null) => {
    if (!value) return
    const normalized = trimTrailingSlash(value.trim())
    if (!/^https?:\/\//i.test(normalized)) return
    if (!candidates.includes(normalized)) candidates.push(normalized)
  }

  push(preferredUrl)
  push(process.env.NEXT_PUBLIC_MULTIPLAYER_SERVER_URL)

  const backupList = process.env.NEXT_PUBLIC_MULTIPLAYER_BACKUP_SERVER_URLS
  if (backupList) {
    backupList
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => push(item))
  }

  if (typeof window !== 'undefined' && /^https?:/i.test(window.location.origin)) {
    push(window.location.origin)
  }

  push(DEFAULT_LOCAL_SERVER_URL)
  return candidates
}

export function getMultiplayerShareOrigin(): string {
  return getConfiguredMultiplayerServerUrl()
}
