'use client'

import { useEffect } from 'react'

const RELOAD_KEY = 'gomoku:chunk-reload-once'

function shouldRecoverFromMessage(message: string): boolean {
  const text = message.toLowerCase()
  return (
    text.includes('chunkloaderror') ||
    text.includes('loading chunk') ||
    text.includes('/_next/static/chunks/') ||
    text.includes('failed to fetch dynamically imported module')
  )
}

export default function ChunkRecovery() {
  useEffect(() => {
    const tryReloadOnce = () => {
      const reloaded = window.sessionStorage.getItem(RELOAD_KEY)
      if (reloaded === '1') return
      window.sessionStorage.setItem(RELOAD_KEY, '1')
      window.location.reload()
    }

    const onError = (event: ErrorEvent) => {
      const message = String(event.message || '')
      const target = event.target as HTMLScriptElement | null
      const targetSrc = target?.src || ''
      if (shouldRecoverFromMessage(message) || targetSrc.includes('/_next/static/chunks/')) {
        tryReloadOnce()
      }
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reasonMessage =
        typeof event.reason === 'string'
          ? event.reason
          : String(event.reason?.message || event.reason || '')
      if (shouldRecoverFromMessage(reasonMessage)) {
        tryReloadOnce()
      }
    }

    window.addEventListener('error', onError, true)
    window.addEventListener('unhandledrejection', onUnhandledRejection)

    return () => {
      window.removeEventListener('error', onError, true)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [])

  return null
}

