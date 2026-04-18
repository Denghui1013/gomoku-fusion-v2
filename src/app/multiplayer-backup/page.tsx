'use client'

import { useCallback, useState } from 'react'
import LobbyScreenBackup from '@/components/multiplayer/LobbyScreenBackup'
import MultiplayerGameBackup from '@/components/multiplayer/MultiplayerGameBackup'
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
        <MultiplayerGameBackup multiplayer={multiplayer} onBack={handleBack} />
      ) : (
        <LobbyScreenBackup multiplayer={multiplayer} onGameStart={handleGameStart} />
      )}
    </main>
  )
}
