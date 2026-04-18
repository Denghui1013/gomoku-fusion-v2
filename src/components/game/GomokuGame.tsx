'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { useGomoku } from '@/hooks/useGomoku'
import { useTimer } from '@/hooks/useTimer'
import { getAiMoveAsync, preloadAiModule } from '@/lib/aiLoader'
import { useRank } from '@/context/RankContext'
import type { GameMode, Difficulty, Player } from '@/types'
import type { MatchResult } from '@/lib/rankSystem'
import { GameBoard } from './Board'
import { GameControls } from './GameControls'
import { VictoryOverlay } from './VictoryOverlay'
import { AvatarStone } from './PlayerBadge'
import { RankPromotionModal } from '@/components/rank/RankPromotionModal'
import { MasterMedal } from '@/components/rank/MasterMedal'
import { useSoundContext } from '@/context/SoundContext'

const TURN_SECONDS = 30

export function GomokuGame({
  mode,
  difficulty,
  playerSide,
  onBack,
}: {
  mode: GameMode
  difficulty: Difficulty
  playerSide: Player | null
  onBack: () => void
}) {
  const {
    board,
    currentPlayer,
    status,
    lastMove,
    winner,
    winningLine,
    moves,
    makeMove,
    resetGame,
    timeoutLoser,
    timeout,
  } = useGomoku()

  const { playPlace, playClick, playError } = useSoundContext()
  const {
    recordMatch,
    promotionEvent,
    clearPromotionEvent,
    showMasterEasterEgg,
    clearMasterEasterEgg,
    equippedTitle,
    equippedAvatarFrame,
  } = useRank()

  const aiRequestRef = useRef(0)
  const aiTimeoutRef = useRef<number | null>(null)
  const aiPlayer: Player = mode === 'pvc' ? (playerSide === 'black' ? 'white' : 'black') : 'white'
  const [dismissedSettlementId, setDismissedSettlementId] = useState<string | null>(null)
  const [totalTime, setTotalTime] = useState(0)
  const [viewportWidth, setViewportWidth] = useState(430)
  const [lastMatchResult, setLastMatchResult] = useState<{
    starChange: number
    isProtected: boolean
    protectionMessage?: string
  } | null>(null)
  const lastMatchResultRef = useRef<{
    starChange: number
    isProtected: boolean
    protectionMessage?: string
  } | null>(null)
  const gameStartTimeRef = useRef<number | null>(null)
  const hasRecordedMatchRef = useRef(false)
  
  const handleTimeout = useCallback(() => {
    timeout(currentPlayer)
  }, [timeout, currentPlayer])
  
  const { formattedTime, start, pause, resetTo } = useTimer({
    direction: 'down',
    initialSeconds: TURN_SECONDS,
    onExpire: handleTimeout,
  })
  
  const isGameOver = status !== 'playing'
  const isAiTurn = mode === 'pvc' && playerSide !== null && currentPlayer === aiPlayer && !isGameOver
  const settlementId = `${status}:${winner ?? 'none'}:${timeoutLoser ?? 'none'}:${lastMove ? `${lastMove.row},${lastMove.col}` : 'none'}`
  const shouldShowSettlement = isGameOver && dismissedSettlementId !== settlementId
  const isW360 = viewportWidth <= 360
  const isW390 = viewportWidth > 360 && viewportWidth <= 390
  const isW412 = viewportWidth > 390 && viewportWidth <= 412
  const sidePanelGap = isW360 ? 8 : isW390 ? 9 : 10
  const hudChipPadding = isW360 ? '0 10px' : '0 12px'
  const timerFontSize = isW360 ? '1.45rem' : isW390 ? '1.6rem' : isW412 ? '1.72rem' : '1.9rem'
  const timeParts = formattedTime.split(':').map((part) => Number(part))
  const remainingSeconds = timeParts.length === 2 ? timeParts[0] * 60 + timeParts[1] : Number(formattedTime)
  const isTimeCritical = remainingSeconds <= 5

  useEffect(() => {
    if (typeof window === 'undefined') return
    const syncViewport = () => setViewportWidth(window.innerWidth)
    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => window.removeEventListener('resize', syncViewport)
  }, [])

  useEffect(() => {
    if (status === 'playing' && gameStartTimeRef.current === null) {
      gameStartTimeRef.current = Date.now()
    }
    
    if (isGameOver && gameStartTimeRef.current !== null) {
      const elapsed = Math.floor((Date.now() - gameStartTimeRef.current) / 1000)
      setTotalTime(elapsed)
    }
  }, [status, isGameOver])

  const handleMakeMove = useCallback((row: number, col: number) => {
    if (!isGameOver && !isAiTurn) {
      makeMove(row, col)
      playPlace()
    } else if (isGameOver || isAiTurn) {
      playError()
    }
  }, [isGameOver, isAiTurn, makeMove, playPlace, playError])

  // 棰勫姞杞?AI 妯″潡锛堝湪浜烘満瀵规垬妯″紡涓嬶級
  useEffect(() => {
    if (mode === 'pvc' && playerSide !== null) {
      preloadAiModule()
    }
  }, [mode, playerSide])

  useEffect(() => {
    if (!isAiTurn) {
      aiRequestRef.current += 1
      if (aiTimeoutRef.current != null) {
        window.clearTimeout(aiTimeoutRef.current)
        aiTimeoutRef.current = null
      }
      return
    }
    
    aiRequestRef.current += 1
    const requestId = aiRequestRef.current
    
    // 根据难度设置 AI 思考延迟与计算时限
    const thinkMs = difficulty === 'easy' ? 100 : difficulty === 'medium' ? 300 : 500
    const timeLimit = difficulty === 'easy' ? 400 : difficulty === 'medium' ? 2000 : 4000
    
    const applyMove = (move: { row: number; col: number }) => {
      if (aiRequestRef.current !== requestId) return
      makeMove(move.row, move.col)
      playPlace()
    }
    
    // 浣跨敤 Worker 鍦ㄥ悗鍙扮嚎绋嬭绠?AI 绉诲姩
    const worker = new Worker(new URL('@/workers/gomokuAi.worker.ts', import.meta.url))
    
    // 璁剧疆瓒呮椂淇濇姢
    const workerTimeout = setTimeout(async () => {
      console.warn('AI Worker timeout, terminating...')
      worker.terminate()
      // 浣跨敤蹇€熷洖閫€鏂规锛堝姩鎬佸鍏ワ級
      try {
        const quickMove = await getAiMoveAsync(board, aiPlayer, difficulty, 200)
        if (aiRequestRef.current !== requestId) return
        applyMove(quickMove)
      } catch (error) {
        console.error('AI fallback error:', error)
      }
    }, timeLimit + 100)
    
    worker.onmessage = (e) => {
      const move = e.data
      if (aiRequestRef.current !== requestId) {
        worker.terminate()
        clearTimeout(workerTimeout)
        return
      }
      clearTimeout(workerTimeout)
      aiTimeoutRef.current = window.setTimeout(() => {
        applyMove(move)
        aiTimeoutRef.current = null
        worker.terminate()
      }, thinkMs)
    }
    
    worker.onerror = async (error) => {
      console.error('AI Worker error:', error)
      clearTimeout(workerTimeout)
      worker.terminate()
      // 鍥為€€鍒颁富绾跨▼璁＄畻锛堝揩閫熸ā寮忥紝鍔ㄦ€佸鍏ワ級
      if (aiRequestRef.current !== requestId) return
      try {
        const move = await getAiMoveAsync(board, aiPlayer, difficulty, Math.min(timeLimit, 300))
        if (aiRequestRef.current !== requestId) return
        aiTimeoutRef.current = window.setTimeout(() => {
          applyMove(move)
          aiTimeoutRef.current = null
        }, thinkMs)
      } catch (err) {
        console.error('AI fallback error:', err)
      }
    }
    
    // 鍙戦€佽绠楄姹傚埌 Worker
    worker.postMessage({
      board,
      ai: aiPlayer,
      difficulty,
      timeLimit
    })
    
    return () => {
      if (aiTimeoutRef.current != null) {
        window.clearTimeout(aiTimeoutRef.current)
        aiTimeoutRef.current = null
      }
      clearTimeout(workerTimeout)
      worker.terminate()
    }
  }, [isAiTurn, board, aiPlayer, difficulty, makeMove])

  useEffect(() => {
    if (isGameOver) {
      pause()
      return
    }
    if (mode === 'pvc' && playerSide === null) {
      pause()
      resetTo(TURN_SECONDS)
      return
    }
    resetTo(TURN_SECONDS)
    start()
  }, [currentPlayer, isGameOver, mode, playerSide, resetTo, start, pause])
  
  const handleReset = () => {
    aiRequestRef.current += 1
    resetGame()
    setDismissedSettlementId(null)
    setTotalTime(0)
    gameStartTimeRef.current = null
    hasRecordedMatchRef.current = false
  }

  useEffect(() => {
    if (isGameOver && mode === 'pvc' && playerSide !== null && !hasRecordedMatchRef.current) {
      hasRecordedMatchRef.current = true
      const isWin = winner === playerSide
      const matchResult: MatchResult = {
        difficulty,
        isWin,
        isTimeout: !!timeoutLoser,
        moveCount: moves.length,
        duration: totalTime,
        timestamp: new Date().toISOString(),
        playerSide,
      }
      const result = recordMatch(matchResult)
      setLastMatchResult({
        starChange: result.starChange,
        isProtected: result.isProtected,
        protectionMessage: result.protectionMessage,
      })
    }
  }, [difficulty, isGameOver, mode, moves.length, playerSide, recordMatch, timeoutLoser, totalTime, winner])

  const getStatusAnnouncement = () => {
    if (timeoutLoser) {
      const winnerSide = timeoutLoser === 'black' ? '白方' : '黑方'
      const loserSide = timeoutLoser === 'black' ? '黑方' : '白方'
      return `${loserSide}超时，${winnerSide}获胜，游戏结束`
    }
    if (status === 'black-wins') return '黑方获胜，游戏结束'
    if (status === 'white-wins') return '白方获胜，游戏结束'
    if (status === 'draw') return '平局，游戏结束'
    if (status === 'playing') {
      const side =
        mode === 'pvc'
          ? playerSide
            ? currentPlayer === playerSide
              ? `玩家(${playerSide === 'black' ? '黑' : '白'})`
              : `AI(${aiPlayer === 'black' ? '黑' : '白'})`
            : currentPlayer === 'black'
              ? '黑方'
              : '白方'
          : currentPlayer === 'black'
            ? '黑方'
            : '白方'
      return `${side}回合，剩余时间 ${formattedTime}，请落子`
    }
    return ''
  }
  return (
    <>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {getStatusAnnouncement()}
      </div>
      
      <div className="flex flex-col lg:flex-row items-center justify-center gap-2 lg:gap-6 p-0 game-shell w-full">
        <div
          className="w-full lg:w-auto flex-shrink-0 flex justify-center"
        >
          <GameBoard
            board={board}
            lastMove={lastMove}
            winningLine={winningLine}
            currentPlayer={currentPlayer}
            onCellClick={handleMakeMove}
            disabled={isGameOver || isAiTurn || (mode === 'pvc' && playerSide === null)}
          />
        </div>
        
        <div
          className="w-full lg:w-80 xl:w-96 flex flex-col lg:gap-4 lg:sticky lg:top-4"
          style={{
            gap: sidePanelGap,
            boxSizing: 'border-box',
            padding: isW360 ? 8 : 10,
            borderRadius: 24,
            border: '1px solid rgba(11,95,165,0.08)',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.58), rgba(238,247,240,0.78))',
            boxShadow: '0 18px 38px rgba(11,95,165,0.08)',
          }}
        >
          <div
            className="p-2.5 sm:p-3 rounded-3xl border"
            style={{
              borderColor: 'rgba(11,95,165,0.14)',
              background: 'rgba(255,255,255,0.9)',
              color: '#123b5b',
              boxShadow: '0 14px 34px rgba(11,95,165,0.12)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div
                className="min-h-[44px] rounded-2xl border inline-flex items-center gap-2 font-bold"
                style={{
                  padding: hudChipPadding,
                  borderColor: currentPlayer === 'black' && !isGameOver ? 'rgba(22,114,71,0.46)' : 'rgba(11,95,165,0.12)',
                  background: currentPlayer === 'black' && !isGameOver ? 'rgba(168,230,191,0.22)' : 'rgba(237,244,251,0.86)',
                }}
              >
                <AvatarStone
                  player="black"
                  compact
                  frame={mode === 'pvc' && playerSide === 'black' ? equippedAvatarFrame : 'none'}
                />
                黑方
              </div>

              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-xl" style={{ background: 'rgba(237,244,251,0.9)' }}>
                <Clock className="w-4 h-4 flex-shrink-0" style={{ color: isTimeCritical ? '#d8a84c' : '#167247' }} />
                <span
                  className={`font-mono font-bold tabular-nums ${isTimeCritical ? 'animate-pulse' : ''}`}
                  style={{ color: isTimeCritical ? '#d8a84c' : '#167247', fontSize: timerFontSize, lineHeight: 1 }}
                >
                  {formattedTime}
                </span>
              </div>

              <div
                className="min-h-[44px] rounded-2xl border inline-flex items-center gap-2 font-bold"
                style={{
                  padding: hudChipPadding,
                  borderColor: currentPlayer === 'white' && !isGameOver ? 'rgba(22,114,71,0.46)' : 'rgba(11,95,165,0.12)',
                  background: currentPlayer === 'white' && !isGameOver ? 'rgba(168,230,191,0.22)' : 'rgba(237,244,251,0.86)',
                }}
              >
                <AvatarStone
                  player="white"
                  compact
                  frame={mode === 'pvc' && playerSide === 'white' ? equippedAvatarFrame : 'none'}
                />
                白方
              </div>
            </div>

            <div className="text-center mt-2 text-sm font-semibold" style={{ color: '#3a5064' }}>
              {isGameOver
                ? '对局结束'
                : mode === 'pvc'
                  ? playerSide
                    ? currentPlayer === playerSide
                      ? '你的回合'
                      : 'AI 思考中...'
                    : '请选择执子'
                  : `${currentPlayer === 'black' ? '黑方' : '白方'}回合`}
            </div>
            {equippedTitle && (
              <div
                className="mx-auto mt-2 inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold"
                style={{
                  color: '#8a5b00',
                  background: 'rgba(216,168,76,0.2)',
                  border: '1px solid rgba(216,168,76,0.34)',
                }}
              >
                {equippedTitle}
              </div>
            )}
          </div>

          <GameControls
            currentPlayer={currentPlayer}
            status={status}
            winner={winner}
            onReset={handleReset}
            mode={mode}
            playerSide={playerSide}
            onBack={onBack}
            isAiThinking={isAiTurn}
          />
        </div>
      </div>

      <VictoryOverlay
        key={settlementId}
        open={shouldShowSettlement}
        status={status}
        winner={winner}
        timeoutLoser={timeoutLoser}
        mode={mode}
        playerSide={playerSide}
        totalMoves={moves.length}
        totalTime={totalTime}
        starChange={lastMatchResult?.starChange}
        onRestart={handleReset}
        onBack={onBack}
        onClose={() => setDismissedSettlementId(settlementId)}
      />

      {/* 娈典綅鎻愬崌寮圭獥 */}
      <RankPromotionModal
        isOpen={!!promotionEvent}
        promotionEvent={promotionEvent}
        onClose={clearPromotionEvent}
        autoCloseDelay={10000}
      />

      {/* 澶у笀褰╄泲 */}
      {showMasterEasterEgg && (
        <MasterMedal
          showEasterEgg={true}
          onEasterEggComplete={clearMasterEasterEgg}
        />
      )}
    </>
  )
}


