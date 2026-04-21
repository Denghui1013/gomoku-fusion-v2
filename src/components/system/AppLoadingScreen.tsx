import { Loader2 } from 'lucide-react'
import LoadingRedirector from '@/components/system/LoadingRedirector'

type AppLoadingScreenProps = {
  autoRedirect?: boolean
}

export default function AppLoadingScreen({ autoRedirect = false }: AppLoadingScreenProps) {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 md:p-6"
      style={{ background: 'linear-gradient(135deg, #dbe8f3 0%, #eaf3ef 48%, #d7e8de 100%)' }}
    >
      {autoRedirect ? <LoadingRedirector to="/mode" delayMs={800} /> : null}
      <div className="game-shell w-full max-w-md">
        <section className="game-panel p-6 md:p-8">
          <header className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black leading-none" style={{ color: 'var(--text-primary)' }}>
                弈境
              </h1>
              <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                正在进入对局，请稍候
              </p>
            </div>
            <div style={{ color: 'var(--primary)' }} aria-hidden="true">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </header>

          <div className="mt-6">
            <div className="flex items-center justify-between text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              <span>正在加载棋盘资源与对局状态</span>
              <span className="tabular-nums">...</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full border" style={{ background: 'var(--card-border)', borderColor: 'var(--card-border)' }}>
              <div className="h-full w-2/3 animate-pulse rounded-full" style={{ background: 'var(--primary)' }} />
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
