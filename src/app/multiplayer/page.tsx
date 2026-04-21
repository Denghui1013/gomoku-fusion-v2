'use client'

import { useCallback, useEffect, useState } from 'react'
import LobbyScreen from '@/components/multiplayer/LobbyScreen'
import MultiplayerGame from '@/components/multiplayer/MultiplayerGame'
import { useMultiplayer } from '@/hooks/useMultiplayer'

export default function MultiplayerPage() {
  const [showGame, setShowGame] = useState(false)
  const multiplayer = useMultiplayer()

  // 页面初始化时清理状态
  useEffect(() => {
    // 清除 sessionStorage 中的旧状态
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('gomoku:lobby-mode')
    }

    // 重置 NetworkManager 状态
    multiplayer.network.reset()
  }, [multiplayer.network])

  const handleGameStart = useCallback(() => {
    setShowGame(true)
  }, [])

  const handleBack = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('gomoku:lobby-mode', 'menu')
    }
    setShowGame(false)
  }, [])

  const shouldStayInGame =
    multiplayer.isGameStarted ||
    multiplayer.moveNumber > 0 ||
    multiplayer.waitingRestartAccept ||
    !!multiplayer.pendingRestartRequestFrom

  const effectiveShowGame = showGame || shouldStayInGame

  return (
    <main>
      {effectiveShowGame ? (
        <MultiplayerGame multiplayer={multiplayer} onBack={handleBack} />
      ) : (
        <LobbyScreen multiplayer={multiplayer} onGameStart={handleGameStart} onBack={handleBack} />
      )}
    </main>
  )
}
