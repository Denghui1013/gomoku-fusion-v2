import type { Metadata, Viewport } from 'next'
import './globals.css'
import { GameFlowProvider } from '@/context/GameFlowContext'
import { SoundProvider } from '@/context/SoundContext'
import { RankProvider } from '@/context/RankContext'
import { ToastContainer } from '@/components/ui/Toast'
import { initPerformanceMonitoring } from '@/lib/vitals'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import ChunkRecovery from '@/components/system/ChunkRecovery'

export const metadata: Metadata = {
  title: "彦彦的五子棋",
  description: "一个精美的Web版五子棋游戏",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

// 初始化性能监控（仅在客户端）
if (typeof window !== 'undefined') {
  initPerformanceMonitoring()
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <ChunkRecovery />
        <ErrorBoundary componentName="RootLayout">
          <SoundProvider>
            <GameFlowProvider>
              <RankProvider>
                <ErrorBoundary componentName="PageContent">
                  {children}
                </ErrorBoundary>
              </RankProvider>
            </GameFlowProvider>
          </SoundProvider>
        </ErrorBoundary>
        <ToastContainer />
      </body>
    </html>
  )
}
