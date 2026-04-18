'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

const STEPS = [
  '正在加载棋盘资源…',
  '正在初始化对局系统…',
  '正在准备动画与音效…',
  '即将进入模式选择…',
]

export default function LoadingPage() {
  const router = useRouter()
  const [progress, setProgress] = useState(0)
  const step = useMemo(() => {
    const idx = Math.min(STEPS.length - 1, Math.floor((progress / 100) * STEPS.length))
    return STEPS[idx]
  }, [progress])

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const duration = 1200
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setProgress(Math.round(eased * 100))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (progress < 100) return
    const id = window.setTimeout(() => router.replace('/mode'), 180)
    return () => window.clearTimeout(id)
  }, [progress, router])

  return (
    <main className="min-h-screen flex items-center justify-center p-4 md:p-6" style={{ background: 'var(--background)' }}>
      <div className="game-shell max-w-lg w-full">
        <div className="game-panel p-6 md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                五子棋
              </div>
              <div className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                载入中 · 请稍候
              </div>
            </div>
            <div style={{ color: 'var(--primary)' }} aria-hidden="true">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              <div>{step}</div>
              <div className="tabular-nums">{progress}%</div>
            </div>
            <div className="mt-2 h-3 rounded-full overflow-hidden border" style={{ background: 'var(--card-border)', borderColor: 'var(--card-border)' }}>
              <div
                className="h-full transition-[width] duration-200 ease-out"
                style={{ width: `${progress}%`, background: 'var(--primary)' }}
              />
            </div>
          </div>

          <div className="mt-6 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            提示：载入完成后将自动跳转到模式选择
          </div>
        </div>
      </div>
    </main>
  )
}
