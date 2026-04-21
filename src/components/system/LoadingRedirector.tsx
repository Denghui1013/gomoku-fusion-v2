'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

type LoadingRedirectorProps = {
  to: string
  delayMs?: number
}

export default function LoadingRedirector({ to, delayMs = 1200 }: LoadingRedirectorProps) {
  const router = useRouter()

  useEffect(() => {
    router.prefetch(to)
    const id = window.setTimeout(() => {
      const doc = document as Document & {
        startViewTransition?: (callback: () => void) => void
      }
      if (typeof doc.startViewTransition === 'function') {
        doc.startViewTransition(() => router.replace(to))
      } else {
        router.replace(to)
      }
    }, delayMs)
    return () => window.clearTimeout(id)
  }, [delayMs, router, to])

  return null
}
