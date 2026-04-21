import type { Metadata, Viewport } from 'next'
import './globals.css'
import { GameFlowProvider } from '@/context/GameFlowContext'
import { SoundProvider } from '@/context/SoundContext'
import { RankProvider } from '@/context/RankContext'
import { ToastContainer } from '@/components/ui/Toast'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import ChunkRecovery from '@/components/system/ChunkRecovery'
import ClientVitalsInit from '@/components/system/ClientVitalsInit'

export const metadata: Metadata = {
  title: '彦彦的五子棋',
  description: '一个精美的 Web 版五子棋游戏',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <ClientVitalsInit />
        <ChunkRecovery />
        <ErrorBoundary componentName="RootLayout">
          <SoundProvider>
            <GameFlowProvider>
              <RankProvider>
                <ErrorBoundary componentName="PageContent">{children}</ErrorBoundary>
              </RankProvider>
            </GameFlowProvider>
          </SoundProvider>
        </ErrorBoundary>
        <ToastContainer />
      </body>
    </html>
  )
}

