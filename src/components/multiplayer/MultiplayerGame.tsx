'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { useMultiplayer } from '@/hooks/useMultiplayer'
import { GameBoard } from '@/components/game/Board'
import { PlayerBadge } from '@/components/game/PlayerBadge'
import { useSoundContext } from '@/context/SoundContext'
import { useRank } from '@/context/RankContext'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'
import {
  Clock,
  MessageCircle,
  Smile,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'

interface MultiplayerGameProps {
  multiplayer: ReturnType<typeof useMultiplayer>
  onBack?: () => void
}

const TURN_SECONDS = 30

type MultiplayerResultType = 'victory' | 'defeat' | 'draw'
type HintTone = 'attack' | 'defense' | 'neutral'

const multiplayerResultStyles = {
  victory: {
    bgGradient:
      'linear-gradient(135deg, color-mix(in srgb, #10b981 18%, var(--card-bg)) 0%, color-mix(in srgb, #34d399 12%, var(--card-bg)) 100%)',
    iconColor: '#059669',
    borderColor: 'color-mix(in srgb, #10b981 42%, var(--card-border))',
    badgeBg: 'color-mix(in srgb, #10b981 22%, var(--card-bg))',
    badgeText: '#065f46',
    primaryBtnBg: 'var(--cta)',
    label: '胜利结算',
  },
  defeat: {
    bgGradient:
      'linear-gradient(135deg, color-mix(in srgb, #ef4444 16%, var(--card-bg)) 0%, color-mix(in srgb, #f87171 12%, var(--card-bg)) 100%)',
    iconColor: '#dc2626',
    borderColor: 'color-mix(in srgb, #ef4444 40%, var(--card-border))',
    badgeBg: 'color-mix(in srgb, #ef4444 20%, var(--card-bg))',
    badgeText: '#991b1b',
    primaryBtnBg: '#f97316',
    label: '失败结算',
  },
  draw: {
    bgGradient:
      'linear-gradient(135deg, color-mix(in srgb, #64748b 16%, var(--card-bg)) 0%, color-mix(in srgb, #94a3b8 12%, var(--card-bg)) 100%)',
    iconColor: '#475569',
    borderColor: 'color-mix(in srgb, #64748b 38%, var(--card-border))',
    badgeBg: 'color-mix(in srgb, #64748b 18%, var(--card-bg))',
    badgeText: '#334155',
    primaryBtnBg: 'var(--primary)',
    label: '平局结算',
  },
} as const

const hintToneLabel: Record<HintTone, string> = {
  attack: '杀棋',
  defense: '防守',
  neutral: '扩张',
}

function hintToneChipStyle(tone: HintTone): { bg: string; text: string; border: string } {
  if (tone === 'attack') return { bg: 'rgba(245,158,11,0.18)', text: '#b45309', border: 'rgba(245,158,11,0.38)' }
  if (tone === 'defense') return { bg: 'rgba(59,130,246,0.16)', text: '#1d4ed8', border: 'rgba(59,130,246,0.34)' }
  return { bg: 'rgba(16,185,129,0.16)', text: '#047857', border: 'rgba(16,185,129,0.34)' }
}

export default function MultiplayerGame({ multiplayer, onBack }: MultiplayerGameProps) {
  const { playClick, playPlace, playWin, playDefeat, playError, playNav, playBack, playClose, playConfirm, playAccept, playDangerConfirm, playSuccess, playWarning } = useSoundContext()
  const { equippedAvatarFrame } = useRank()
  const [showChat, setShowChat] = useState(false)
  const [showResignConfirm, setShowResignConfirm] = useState(false)
  const [showEmojiPanel, setShowEmojiPanel] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [turnRemainingSeconds, setTurnRemainingSeconds] = useState(TURN_SECONDS)
  const [boardCellSize, setBoardCellSize] = useState<number | undefined>(undefined)
  const boardWrapRef = useRef<HTMLDivElement | null>(null)
  const resultDialogRef = useRef<HTMLDivElement | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const chatInputRef = useRef<HTMLInputElement | null>(null)
  const previousChatCountRef = useRef(multiplayer.chatMessages.length)
  const previousOpponentMessageCountRef = useRef(
    multiplayer.chatMessages.filter((msg) => msg.senderName !== (multiplayer.network.getPlayerName() || '')).length
  )
  const previousConnectionErrorRef = useRef<string | null>(multiplayer.connectionError)
  const previousRestartNoticeRef = useRef<string | null>(multiplayer.restartNotice)
  const previousFocusedRef = useRef<HTMLElement | null>(null)
  const previousMoveNumberRef = useRef(multiplayer.moveNumber)
  const previousEndedRef = useRef(false)
  const turnStartedAtRef = useRef<number | null>(null)
  const turnTimeoutTriggeredRef = useRef(false)
  const turnCycleKeyRef = useRef<string>('')

  const myName = multiplayer.network.getPlayerName() || ''
  const opponentDisplayName =
    multiplayer.opponentName && multiplayer.opponentName !== myName ? multiplayer.opponentName : '对手'
  const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]'
  const inputFocusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]'
  const initialReadOpponentCount = multiplayer.chatMessages.filter((msg) => msg.senderName !== myName).length
  const [readOpponentCount, setReadOpponentCount] = useState(initialReadOpponentCount)
  const opponentMessageCount = useMemo(
    () => multiplayer.chatMessages.filter((msg) => msg.senderName !== myName).length,
    [multiplayer.chatMessages, myName]
  )
  const unreadCount = showChat ? 0 : Math.max(0, opponentMessageCount - readOpponentCount)
  const isGameEnded =
    multiplayer.status === 'black-wins' ||
    multiplayer.status === 'white-wins' ||
    multiplayer.status === 'draw'
  const resultType: MultiplayerResultType = useMemo(() => {
    if (multiplayer.status === 'draw') return 'draw'
    if (multiplayer.winner == null) return 'draw'
    return multiplayer.winner === multiplayer.myColor ? 'victory' : 'defeat'
  }, [multiplayer.myColor, multiplayer.status, multiplayer.winner])
  const resultTitle = useMemo(() => {
    if (multiplayer.status === 'draw') return '平局'
    if (multiplayer.winner === multiplayer.myColor) return '恭喜获胜'
    if (multiplayer.winner === 'black') return '黑方获胜'
    if (multiplayer.winner === 'white') return '白方获胜'
    return '对局结束'
  }, [multiplayer.myColor, multiplayer.status, multiplayer.winner])
  const resultSubtitle = useMemo(() => {
    if (multiplayer.status === 'draw') return '双方势均力敌'
    if (multiplayer.winner === multiplayer.myColor) return '你赢得了这一局'
    return `${multiplayer.winner === 'black' ? '黑方' : '白方'}取得胜利`
  }, [multiplayer.myColor, multiplayer.status, multiplayer.winner])
  const resultStyle = multiplayerResultStyles[resultType]
  const timeoutLose = multiplayer.timeoutLose
  const turnCycleKey = `${multiplayer.isGameStarted ? 1 : 0}-${multiplayer.currentPlayer}-${multiplayer.moveNumber}-${isGameEnded ? 1 : 0}`

  const scrollChatToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior, block: 'end' })
    })
  }, [])

  useEffect(() => {
    const previousCount = previousChatCountRef.current
    const currentCount = multiplayer.chatMessages.length

    if (currentCount > previousCount && showChat) {
      scrollChatToBottom(previousCount === 0 ? 'auto' : 'smooth')
    }

    previousChatCountRef.current = currentCount
  }, [multiplayer.chatMessages, scrollChatToBottom, showChat])

  useEffect(() => {
    const previousOpponentCount = previousOpponentMessageCountRef.current
    if (opponentMessageCount > previousOpponentCount) {
      playNav()
    }
    previousOpponentMessageCountRef.current = opponentMessageCount
  }, [opponentMessageCount, playNav])

  useEffect(() => {
    if (multiplayer.connectionError && multiplayer.connectionError !== previousConnectionErrorRef.current) {
      playWarning()
    }
    previousConnectionErrorRef.current = multiplayer.connectionError
  }, [multiplayer.connectionError, playWarning])

  useEffect(() => {
    if (multiplayer.restartNotice && multiplayer.restartNotice !== previousRestartNoticeRef.current) {
      playSuccess()
    }
    previousRestartNoticeRef.current = multiplayer.restartNotice
  }, [multiplayer.restartNotice, playSuccess])

  useEffect(() => {
    if (!showChat) return
    scrollChatToBottom('auto')
  }, [showChat, scrollChatToBottom])

  useEffect(() => {
    if (!showChat) return
    if (typeof window === 'undefined') return
    if (window.matchMedia('(min-width: 1024px)').matches) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [showChat])

  const toggleChat = () => {
    playClick()
    setReadOpponentCount(opponentMessageCount)
    setShowChat((prev) => !prev)
  }

  useEffect(() => {
    if (multiplayer.moveNumber > previousMoveNumberRef.current) {
      playPlace()
    }
    previousMoveNumberRef.current = multiplayer.moveNumber
  }, [multiplayer.moveNumber, playPlace])

  useEffect(() => {
    if (!isGameEnded) {
      previousEndedRef.current = false
      return
    }
    if (previousEndedRef.current) return
    previousEndedRef.current = true
    if (multiplayer.status === 'draw') {
      playError()
      return
    }
    if (multiplayer.winner === multiplayer.myColor) {
      playWin()
    } else {
      playDefeat()
    }
  }, [isGameEnded, multiplayer.myColor, multiplayer.status, multiplayer.winner, playDefeat, playError, playWin])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (multiplayer.isGameStarted && multiplayer.gameStartTime && multiplayer.status === 'playing') {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - multiplayer.gameStartTime!) / 1000))
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [multiplayer.isGameStarted, multiplayer.gameStartTime, multiplayer.status])

  useEffect(() => {
    turnCycleKeyRef.current = turnCycleKey
    turnStartedAtRef.current = multiplayer.isGameStarted && !isGameEnded ? Date.now() : null
    turnTimeoutTriggeredRef.current = false

    const rafId = requestAnimationFrame(() => {
      setTurnRemainingSeconds(TURN_SECONDS)
    })
    return () => cancelAnimationFrame(rafId)
  }, [turnCycleKey, multiplayer.isGameStarted, isGameEnded])

  useEffect(() => {
    if (!multiplayer.isGameStarted || isGameEnded || turnStartedAtRef.current == null) return
    if (multiplayer.moveNumber === 0) {
      setTurnRemainingSeconds(TURN_SECONDS)
      return
    }

    const syncTurnClock = () => {
      if (turnStartedAtRef.current == null) return
      const elapsed = Math.floor((Date.now() - turnStartedAtRef.current) / 1000)
      const next = Math.max(0, TURN_SECONDS - elapsed)

      if (next <= 0 && multiplayer.isMyTurn && !turnTimeoutTriggeredRef.current) {
        turnTimeoutTriggeredRef.current = true
        timeoutLose()
      }

      setTurnRemainingSeconds(next)
    }

    syncTurnClock()
    const timer = setInterval(syncTurnClock, 250)
    return () => clearInterval(timer)
  }, [isGameEnded, multiplayer.isGameStarted, multiplayer.isMyTurn, multiplayer.moveNumber, timeoutLose])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleSendChat = () => {
    if (!chatInput.trim()) return
    playConfirm()
    multiplayer.sendChat(chatInput.trim())
    setChatInput('')
    setShowEmojiPanel(false)
  }

  const handleInsertEmoji = (emoji: string) => {
    setChatInput((prev) => `${prev}${emoji}`)
    requestAnimationFrame(() => {
      chatInputRef.current?.focus()
    })
  }

  const handleEmojiSelect = (emoji: { native?: string }) => {
    if (!emoji?.native) return
    handleInsertEmoji(emoji.native)
  }

  const handleResign = () => {
    playClick()
    setShowResignConfirm(true)
  }

  const handleRestartRequest = () => {
    if (multiplayer.waitingRestartAccept) return
    playConfirm()
    multiplayer.requestRestart()
  }

  const handleUndoRequest = () => {
    if (multiplayer.waitingUndoAccept) return
    playConfirm()
    multiplayer.requestUndo()
  }

  const handleHintRequest = () => {
    playClick()
    multiplayer.requestHint()
  }

  useEffect(() => {
    const el = boardWrapRef.current
    if (!el) return

    const updateBoardSize = () => {
      const available = el.clientWidth
      if (!available) return
      // GameBoard total width is 16 * cellSize: 14 intervals + 2 outer margins.
      // Use the same geometry here to avoid pointer/visual mismatch on responsive layouts.
      const isCompact = typeof window !== 'undefined' && window.innerWidth < 768
      const verticalRoom =
        typeof window === 'undefined'
          ? 600
          : window.innerHeight - (isCompact ? 430 : 260)
      const boardPixels = Math.min(
        Math.max(available - (isCompact ? 20 : 8), 260),
        Math.max(verticalRoom, 260),
        isCompact ? 340 : 600
      )
      const next = Math.floor(boardPixels / 16)
      setBoardCellSize((prev) => {
        if (prev != null && Math.abs(prev - next) < 0.25) return prev
        return next
      })
    }

    updateBoardSize()

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => updateBoardSize())
      observer.observe(el)
      return () => observer.disconnect()
    }

    window.addEventListener('resize', updateBoardSize)
    return () => window.removeEventListener('resize', updateBoardSize)
  }, [])

  useEffect(() => {
    if (!isGameEnded) return

    previousFocusedRef.current = document.activeElement as HTMLElement | null

    const root = resultDialogRef.current
    const focusables = root?.querySelectorAll<HTMLElement>(
      'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
    )
    if (focusables && focusables.length > 0) {
      focusables[0].focus()
    } else {
      root?.focus()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const nodes = root?.querySelectorAll<HTMLElement>(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
      )
      if (!nodes || nodes.length === 0) return

      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
        return
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocusedRef.current?.focus()
    }
  }, [isGameEnded])

  return (
    <div
      className="min-h-screen rhythm-page pb-safe-bottom"
      style={{
        background: 'var(--background)',
        paddingTop: 'max(2.75rem, calc(env(safe-area-inset-top, 0px) + 1.35rem))',
      }}
    >
      <div className="game-shell">
        <div className="game-panel px-3 py-2.5 sm:px-4 sm:py-3 mb-5 sm:mb-5 flex items-center justify-between gap-3 md:sticky md:sticky-safe-top z-20">
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              联机对局
            </div>
            <div className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
              实时同步对弈
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className={`game-hud-pill status-chip flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm ${
                multiplayer.isConnected ? 'status-chip-success' : 'status-chip-danger'
              }`}
            >
              {multiplayer.isConnected ? (
                <>
                  <Wifi className="w-4 h-4" />
                  已连接
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4" />
                  断开
                </>
              )}
            </div>

            {multiplayer.isConnected && (
              <div className="game-hud-pill px-2 py-1 text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                {multiplayer.network.getStats().latency}ms
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 lg:gap-6 mobile-tight">
          <section className="flex-1 min-w-0">
            {!multiplayer.isGameStarted && multiplayer.connectionError && (
              <div className="mb-4 status-banner status-banner-warning px-4 py-3 text-center">
                {multiplayer.connectionError}。可等待对手重新连接或返回联机大厅重新建房。
              </div>
            )}

            {multiplayer.restartNotice && (
              <div className="mb-4 status-banner status-banner-info px-4 py-3 text-center">
                {multiplayer.restartNotice}
              </div>
            )}

            {multiplayer.hintMove && (
              <div className="mb-4 status-banner status-banner-info px-4 py-3 text-sm text-left">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <strong>主推荐</strong>
                  {multiplayer.hintTone && (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold border"
                      style={{
                        background: hintToneChipStyle(multiplayer.hintTone).bg,
                        color: hintToneChipStyle(multiplayer.hintTone).text,
                        borderColor: hintToneChipStyle(multiplayer.hintTone).border,
                      }}
                    >
                      {hintToneLabel[multiplayer.hintTone]}
                    </span>
                  )}
                  <span>{multiplayer.hintMove.row + 1} 行 {multiplayer.hintMove.col + 1} 列</span>
                </div>
                {multiplayer.hintReason && <div className="text-xs opacity-90">{multiplayer.hintReason}</div>}
                {multiplayer.hintAltMove && (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <strong className="text-xs">备选</strong>
                    {multiplayer.hintAltTone && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold border"
                        style={{
                          background: hintToneChipStyle(multiplayer.hintAltTone).bg,
                          color: hintToneChipStyle(multiplayer.hintAltTone).text,
                          borderColor: hintToneChipStyle(multiplayer.hintAltTone).border,
                        }}
                      >
                        {hintToneLabel[multiplayer.hintAltTone]}
                      </span>
                    )}
                    <span className="text-xs">{multiplayer.hintAltMove.row + 1} 行 {multiplayer.hintAltMove.col + 1} 列</span>
                    {multiplayer.hintAltReason && <span className="text-xs opacity-90">· {multiplayer.hintAltReason}</span>}
                  </div>
                )}
              </div>
            )}

            {isGameEnded && multiplayer.waitingRestartAccept && (
              <div className="mb-4 status-banner status-banner-success px-4 py-3 text-center">
                已向对手发出“再来一局”邀请，等待确认...
              </div>
            )}

            <div ref={boardWrapRef} className="flex justify-center mb-2 sm:mb-2 w-full overflow-x-auto">
              <GameBoard
                board={multiplayer.board}
                lastMove={multiplayer.lastMove}
                winningLine={multiplayer.winningLine}
                hintMove={multiplayer.hintMove}
                hintTone={multiplayer.hintTone}
                hintAltMove={multiplayer.hintAltMove}
                hintAltTone={multiplayer.hintAltTone}
                currentPlayer={multiplayer.currentPlayer}
                onCellClick={(row, col) => {
                  if (multiplayer.isMyTurn && multiplayer.isGameStarted) {
                    multiplayer.makeMove(row, col)
                  }
                }}
                disabled={!multiplayer.isMyTurn || !multiplayer.isGameStarted || isGameEnded}
                cellSizeOverride={boardCellSize}
              />
            </div>
          </section>

          <aside className="w-full lg:w-80 xl:w-96 flex flex-col gap-4 lg:sticky lg:top-4 self-start mobile-tight">
            <div className="game-panel p-3.5">
              <div className="flex items-center justify-between gap-2">
                <PlayerBadge
                  player="black"
                  name={multiplayer.myColor === 'black' ? multiplayer.network.getPlayerName() || '玩家 1' : opponentDisplayName}
                  isActive={multiplayer.currentPlayer === 'black' && !isGameEnded}
                  isMe={multiplayer.myColor === 'black'}
                  compact
                  avatarFrame={multiplayer.myColor === 'black' ? equippedAvatarFrame : 'none'}
                />
                {multiplayer.isGameStarted && !isGameEnded && (
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-base sm:text-lg font-mono font-bold tabular-nums"
                    style={{
                      background: 'var(--background)',
                      color: turnRemainingSeconds <= 5 ? '#ef4444' : 'var(--text-primary)',
                    }}
                  >
                    <Clock className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                    {formatTime(turnRemainingSeconds)}
                  </div>
                )}
                <PlayerBadge
                  player="white"
                  name={multiplayer.myColor === 'white' ? multiplayer.network.getPlayerName() || '玩家 2' : opponentDisplayName}
                  isActive={multiplayer.currentPlayer === 'white' && !isGameEnded}
                  isMe={multiplayer.myColor === 'white'}
                  compact
                  avatarFrame={multiplayer.myColor === 'white' ? equippedAvatarFrame : 'none'}
                />
              </div>
              {!isGameEnded && multiplayer.isGameStarted && (
                <p className="text-center mt-2 text-sm font-medium" style={{ color: multiplayer.isMyTurn ? '#1d4ed8' : 'var(--text-secondary)' }}>
                  {multiplayer.isMyTurn ? '轮到您落子' : '等待对手落子...'}
                </p>
              )}
            </div>

            <div className="game-panel p-4">
              <h2 className="rhythm-title-section font-bold text-center" style={{ color: 'var(--text-primary)' }}>
                {isGameEnded
                  ? '对局结束'
                  : multiplayer.currentPlayer === 'black'
                    ? '黑方回合'
                    : '白方回合'}
              </h2>
              <p className="text-sm text-center mt-1" style={{ color: 'var(--text-tertiary)' }}>游戏控制</p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    playDangerConfirm()
                    multiplayer.disconnect()
                    onBack?.()
                  }}
                  className={`game-btn game-btn-secondary h-12 font-semibold ${focusRing}`}
                >
                  返回联机大厅
                </button>

                {isGameEnded ? (
                  <button
                    onClick={handleRestartRequest}
                    disabled={multiplayer.waitingRestartAccept}
                    className={`game-btn game-btn-primary h-12 disabled:opacity-60 font-semibold ${focusRing}`}
                  >
                    {multiplayer.waitingRestartAccept ? '等待确认' : '再来一局'}
                  </button>
                ) : (
                  <button
                    onClick={handleResign}
                    className={`game-btn game-btn-danger h-12 font-semibold ${focusRing}`}
                  >
                    认输
                  </button>
                )}
              </div>

              {!isGameEnded && multiplayer.pendingUndoRequestFrom && (
                <div className="mt-3 rounded-2xl border p-3 status-banner status-banner-info">
                  <p className="font-semibold mb-1" style={{ color: 'var(--state-info-text)' }}>对手请求悔棋</p>
                  <p className="text-sm mb-2" style={{ color: 'var(--state-info-text)' }}>
                    {multiplayer.pendingUndoRequestFrom} 想回退自己上一步落子
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => {
                      playAccept()
                      multiplayer.acceptUndo()
                    }} className={`game-btn h-10 font-semibold text-white ${focusRing}`} style={{ background: 'var(--cta)' }}>
                      同意
                    </button>
                    <button onClick={() => multiplayer.dismissUndoRequest()} className={`game-btn h-10 font-semibold ${focusRing}`} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}>
                      拒绝
                    </button>
                  </div>
                </div>
              )}

              {!isGameEnded && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    onClick={handleUndoRequest}
                    disabled={multiplayer.waitingUndoAccept}
                    className={`game-btn game-btn-secondary h-11 font-semibold disabled:opacity-60 ${focusRing}`}
                  >
                    {multiplayer.waitingUndoAccept ? '等待同意悔棋' : '悔棋'}
                  </button>
                  <button
                    onClick={handleHintRequest}
                    className={`game-btn game-btn-primary h-11 font-semibold ${focusRing}`}
                  >
                    提示一手
                  </button>
                </div>
              )}

              <div className="mt-3">
                <button
                  onClick={toggleChat}
                  className={`game-btn w-full h-11 flex items-center justify-center gap-2 rounded-xl font-medium border ${focusRing}`}
                  style={{ background: showChat ? '#2563eb' : 'var(--card-bg)', borderColor: showChat ? '#2563eb' : 'var(--card-border)', color: showChat ? '#ffffff' : 'var(--text-primary)' }}
                >
                  <MessageCircle className="w-5 h-5" />
                  聊天
                  {!showChat && unreadCount > 0 && (
                    <span
                      className="w-5 h-5 rounded-full text-xs flex items-center justify-center"
                      style={{ background: 'var(--state-danger-text)', color: '#fff' }}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {showChat && (
              <>
                <div
                  className="fixed inset-0 z-30 bg-black/25 backdrop-blur-[1px] lg:hidden"
                  onClick={() => {
                    playClose()
                    setShowChat(false)
                  }}
                  aria-hidden="true"
                />
                <div className="game-panel p-3 sm:p-4 flex flex-col fixed z-40 inset-x-3 bottom-3 max-h-[76dvh] lg:static lg:z-auto lg:max-h-none">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <MessageCircle className="w-5 h-5" />
                      聊天室
                    </h3>
                    <button
                      onClick={() => {
                        playClose()
                        setShowChat(false)
                      }}
                      className={`game-btn h-9 w-9 rounded-lg border lg:hidden ${focusRing}`}
                      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                      aria-label="关闭聊天"
                    >
                      <X className="w-4 h-4 mx-auto" />
                    </button>
                  </div>

                  <div className="h-56 sm:h-64 max-h-[48vh] lg:max-h-[42vh] overflow-y-auto mb-3 space-y-2 pr-1">
                    {multiplayer.chatMessages.length === 0 ? (
                      <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>暂无消息</p>
                    ) : (
                      multiplayer.chatMessages.map((msg, idx) => {
                        const isMine = msg.senderName === myName
                        return (
                          <div
                            key={idx}
                            className={`rounded-xl px-3 py-2.5 border ${isMine ? 'ml-8 text-right' : 'mr-8'}`}
                            style={{
                              background: isMine
                                ? 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 16%, var(--card-bg)) 0%, color-mix(in srgb, var(--primary) 8%, var(--card-bg)) 100%)'
                                : 'var(--background)',
                              borderColor: isMine
                                ? 'color-mix(in srgb, var(--primary) 35%, var(--card-border))'
                                : 'var(--card-border)',
                            }}
                          >
                            <div className="text-xs mb-0.5" style={{ color: isMine ? '#1d4ed8' : 'var(--text-secondary)' }}>
                              {isMine ? '你' : msg.senderName}
                            </div>
                            <div style={{ color: 'var(--text-primary)' }}>{msg.message}</div>
                          </div>
                        )
                      })
                    )}
                    <div ref={chatEndRef} aria-hidden="true" />
                  </div>

                  <div className="flex gap-2 items-center sticky bottom-0 pt-2" style={{ background: 'var(--card-bg)' }}>
                    <input
                      ref={chatInputRef}
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                      placeholder="输入消息..."
                      maxLength={100}
                      className={`flex-1 px-4 py-2 border rounded-xl input-mobile-safe focus:border-blue-300 placeholder:text-[var(--text-tertiary)] ${inputFocusRing}`}
                      style={{ background: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                    />
                    <button
                      onClick={() => setShowEmojiPanel((prev) => !prev)}
                      className={`game-btn px-3 py-2 rounded-xl border ${focusRing}`}
                      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                      aria-label="选择表情"
                      title="选择表情"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleSendChat}
                      disabled={!chatInput.trim()}
                      className={`game-btn game-btn-primary px-4 py-2 disabled:opacity-50 ${focusRing}`}
                    >
                      发送
                    </button>
                  </div>

                  {showEmojiPanel && (
                    <div className="mt-3 rounded-xl border p-2" style={{ borderColor: 'var(--card-border)', background: 'var(--background)' }}>
                      <Picker
                        data={data}
                        onEmojiSelect={handleEmojiSelect}
                        theme="light"
                        locale="zh"
                        previewPosition="none"
                        skinTonePosition="none"
                        navPosition="top"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="game-hud-pill px-3 py-2 flex items-center justify-center gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Users className="w-4 h-4" />
              <span>房间码: {multiplayer.roomCode || '-'}</span>
              <span>|</span>
              <span>步数: {multiplayer.moveNumber}</span>
            </div>
          </aside>
        </div>

        {isGameEnded && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm">
            <div
              ref={resultDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="multiplayer-result-title"
              aria-describedby="multiplayer-result-desc"
              tabIndex={-1}
              className="rounded-3xl p-0 max-w-md w-full mx-4 text-center shadow-2xl border focus:outline-none overflow-hidden"
              style={{ background: 'var(--card-bg)', borderColor: resultStyle.borderColor }}
            >
              <div className="relative p-6 pb-4" style={{ background: resultStyle.bgGradient }}>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold mb-3" style={{ background: resultStyle.badgeBg, color: resultStyle.badgeText }}>
                  {resultStyle.label}
                </div>
                <h2 id="multiplayer-result-title" className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {resultTitle}
                </h2>
                <p id="multiplayer-result-desc" className="mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {resultSubtitle}
                </p>
              </div>

              <div className="p-6">
                {multiplayer.restartNotice && (
                  <div className="mb-4 status-banner status-banner-info px-4 py-3 text-sm">
                    {multiplayer.restartNotice}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                <div className="rounded-xl p-3 border" style={{ background: 'var(--background)', borderColor: 'var(--card-border)' }}>
                  <div>总步数</div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{multiplayer.moveNumber} 步</div>
                </div>
                <div className="rounded-xl p-3 border" style={{ background: 'var(--background)', borderColor: 'var(--card-border)' }}>
                  <div>用时</div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatTime(elapsedTime)}</div>
                </div>
              </div>

                {multiplayer.pendingRestartRequestFrom && (
                  <div className="mb-4 rounded-2xl border p-4 text-left status-banner status-banner-info">
                    <p className="font-semibold mb-1" style={{ color: 'var(--state-info-text)' }}>对手请求再来一局</p>
                    <p className="text-sm mb-3" style={{ color: 'var(--state-info-text)' }}>
                      {multiplayer.pendingRestartRequestFrom} 邀请你立即开始新对局
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          playAccept()
                          multiplayer.acceptRestart()
                        }}
                        className={`flex-1 py-2.5 text-white rounded-xl font-semibold transition-all ${focusRing}`}
                        style={{ background: 'var(--cta)' }}
                      >
                        接受
                      </button>
                      <button
                        onClick={() => {
                          playClose()
                          multiplayer.dismissRestartRequest()
                        }}
                        className={`flex-1 py-2.5 border rounded-xl font-semibold transition-all ${focusRing}`}
                        style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                      >
                        稍后
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {!multiplayer.pendingRestartRequestFrom && (
                    <button
                      onClick={handleRestartRequest}
                      disabled={multiplayer.waitingRestartAccept}
                      className={`w-full py-3 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all ${focusRing}`}
                      style={{ background: resultStyle.primaryBtnBg }}
                    >
                      {multiplayer.waitingRestartAccept ? '等待对手确认...' : '再来一局'}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      playDangerConfirm()
                      multiplayer.disconnect()
                      onBack?.()
                    }}
                    className={`w-full py-3 rounded-xl font-semibold transition-all border ${focusRing}`}
                    style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                  >
                    返回联机大厅
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showResignConfirm && !isGameEnded && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 backdrop-blur-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="resign-title"
              aria-describedby="resign-desc"
              className="rounded-3xl p-6 max-w-sm w-full mx-4 shadow-2xl border"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
            >
              <div className="text-center">
                <h3 id="resign-title" className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  确认认输？
                </h3>
                <p id="resign-desc" className="mb-5" style={{ color: 'var(--text-secondary)' }}>
                  认输后本局将立即结束，并判定对手获胜。
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      playClick()
                      setShowResignConfirm(false)
                    }}
                    className={`flex-1 py-2.5 rounded-xl font-semibold transition-all border ${focusRing}`}
                    style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      playDangerConfirm()
                      setShowResignConfirm(false)
                      multiplayer.resign()
                    }}
                    className={`flex-1 py-2.5 text-white rounded-xl font-semibold transition-all ${focusRing}`}
                    style={{ background: 'var(--color-warning)' }}
                  >
                    确认认输
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
