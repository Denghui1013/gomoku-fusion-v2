'use client'

import { useCallback, useState } from 'react'
import LobbyScreen from '@/components/multiplayer/LobbyScreen'
import MultiplayerGame from '@/components/multiplayer/MultiplayerGame'
import { useMultiplayer } from '@/hooks/useMultiplayer'

export default function MultiplayerBackupPage() {
  const [showGame, setShowGame] = useState(false)
  const multiplayer = useMultiplayer()

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
        <LobbyScreen multiplayer={multiplayer} onGameStart={handleGameStart} />
      )}
    </main>
  )
}
