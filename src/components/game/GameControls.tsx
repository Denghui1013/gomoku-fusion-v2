'use client'

import { useState } from 'react'
import { RotateCcw, ArrowLeft, Loader2 } from 'lucide-react'
import type { Player, GameStatus, GameMode } from '@/types'
import { Dialog, Button } from '@/components/ui/Dialog'
import { useSoundContext } from '@/context/SoundContext'

interface GameControlsProps {
  currentPlayer: Player
  status: GameStatus
  winner: Player | null
  mode: GameMode
  playerSide: Player | null
  onReset: () => void
  onBack: () => void
  isAiThinking?: boolean
}

function getStatusText(
  status: GameStatus,
  currentPlayer: Player,
  _winner: Player | null,
  mode: GameMode,
  playerSide: Player | null
): string {
  switch (status) {
    case 'black-wins':
      return '黑方获胜！'
    case 'white-wins':
      return '白方获胜！'
    case 'draw':
      return '平局！'
    default:
      if (mode === 'pvp') return currentPlayer === 'black' ? '黑方回合' : '白方回合'
      if (!playerSide) return currentPlayer === 'black' ? 'AI 回合' : '玩家回合'
      return currentPlayer === playerSide ? '玩家回合' : 'AI 回合'
  }
}

export function GameControls({
  currentPlayer,
  status,
  winner,
  mode,
  playerSide,
  onReset,
  onBack,
  isAiThinking = false,
}: GameControlsProps) {
  const { playClick, playNav } = useSoundContext()
  const isGameOver = status !== 'playing'
  const [showResetDialog, setShowResetDialog] = useState(false)

  const handleReset = () => {
    playClick()
    if (!isGameOver) {
      setShowResetDialog(true)
    } else {
      onReset()
    }
  }

  const confirmReset = () => {
    playClick()
    onReset()
    setShowResetDialog(false)
  }

  const handleBack = () => {
    playNav()
    onBack()
  }

  return (
    <>
      <div className="game-panel flex flex-col gap-2.5 sm:gap-4 p-3 sm:p-5" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2 flex items-center justify-center gap-2" style={{ color: 'var(--text-primary)' }}>
            {getStatusText(status, currentPlayer, winner, mode, playerSide)}
            {isAiThinking && (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-1 text-xs sm:text-sm font-medium"
                style={{
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--primary)',
                  color: '#ffffff',
                }}
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                思考中
              </span>
            )}
          </h2>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--text-tertiary)' }}>游戏控制</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Button
            variant="primary"
            onClick={handleReset}
            className="game-btn w-full"
            style={{
              background: 'linear-gradient(135deg, #1d77b9 0%, #167247 100%)',
              color: '#ffffff',
              border: '1px solid rgba(22,114,71,0.18)',
              boxShadow: '0 12px 22px rgba(22,114,71,0.18)',
            }}
          >
            <RotateCcw className="w-4 h-4" />
            重新开始
          </Button>

          <Button
            onClick={handleBack}
            className="game-btn w-full"
            style={{
              background: 'rgba(255,255,255,0.92)',
              color: '#0b5fa5',
              border: '1px solid rgba(11,95,165,0.14)',
              boxShadow: '0 10px 18px rgba(11,95,165,0.08)',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            返回选择
          </Button>
        </div>
      </div>

      <Dialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        title="确认重新开始？"
        description="当前对局将会被重置。"
      >
        <div className="flex gap-3 justify-end">
          <Button
            variant="secondary"
            onClick={() => {
              playClick()
              setShowResetDialog(false)
            }}
          >
            取消
          </Button>
          <Button variant="danger" onClick={confirmReset}>
            确认
          </Button>
        </div>
      </Dialog>
    </>
  )
}
