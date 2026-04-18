'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GomokuGame } from '@/components/game/GomokuGame'
import { useGameFlow } from '@/context/GameFlowContext'
import { useSoundContext } from '@/context/SoundContext'

export default function GameBackupPage() {
  const router = useRouter()
  const { mode, difficulty, playerSide } = useGameFlow()
  const { playBack } = useSoundContext()
  const [viewportWidth, setViewportWidth] = useState(390)
  const pagePadding = viewportWidth <= 360 ? 10 : viewportWidth <= 390 ? 11 : 12
  const canRenderGame = useMemo(
    () => mode != null && mode !== 'multiplayer' && (mode !== 'pvc' || playerSide != null),
    [mode, playerSide]
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const syncViewport = () => setViewportWidth(window.innerWidth)
    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => window.removeEventListener('resize', syncViewport)
  }, [])

  useEffect(() => {
    if (mode === 'multiplayer') {
      router.replace('/multiplayer')
      return
    }

    if (!mode || (mode === 'pvc' && playerSide == null)) {
      router.replace('/mode')
    }
  }, [mode, playerSide, router])

  if (!canRenderGame || !mode) {
    return null
  }

  return (
    <main
      className="pb-safe-bottom"
      style={{
        minHeight: '100dvh',
        background:
          'radial-gradient(circle at 12% 8%, rgba(29, 143, 225, 0.18), transparent 30%), radial-gradient(circle at 92% 18%, rgba(216, 168, 76, 0.12), transparent 28%), linear-gradient(180deg, #f8fbff 0%, #edf4fb 52%, #eef7f0 100%)',
        color: '#123b5b',
        paddingTop: 'max(2.65rem, calc(env(safe-area-inset-top, 0px) + 1.35rem))',
        paddingInline: pagePadding,
        paddingBottom: 'max(20px, calc(env(safe-area-inset-bottom, 0px) + 20px))',
      }}
    >
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto' }}>
        <section
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
            minHeight: 44,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.05, color: '#123b5b' }}>对局</h1>
          <button
            type="button"
            onClick={() => {
              playBack()
              router.push('/mode')
            }}
            style={{
              minHeight: 38,
              borderRadius: 999,
              border: '1px solid rgba(11,95,165,0.14)',
              background: 'rgba(255,255,255,0.86)',
              color: '#0b5fa5',
              fontWeight: 800,
              paddingInline: 14,
              boxShadow: '0 10px 22px rgba(11,95,165,0.08)',
            }}
          >
            返回
          </button>
        </section>

        <GomokuGame
          mode={mode}
          difficulty={difficulty}
          playerSide={mode === 'pvc' ? playerSide : null}
          onBack={() => {
            playBack()
            router.push('/mode')
          }}
        />
      </div>
    </main>
  )
}
