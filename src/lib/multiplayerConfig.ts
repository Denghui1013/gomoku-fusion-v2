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

export function getMultiplayerShareOrigin(): string {
  return getConfiguredMultiplayerServerUrl()
}
