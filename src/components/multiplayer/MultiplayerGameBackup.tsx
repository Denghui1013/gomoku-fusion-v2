'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import data from '@emoji-mart/data'
import { Clock3, Smile, Wifi } from 'lucide-react'
import type { useMultiplayer } from '@/hooks/useMultiplayer'
import { GameBoard } from '@/components/game/Board'
import { VictoryOverlay } from '@/components/game/VictoryOverlay'
import fusion from '@/app/fusion-ui-preview/FusionUIPreview.module.css'
import { useSoundContext } from '@/context/SoundContext'

interface MultiplayerGameBackupProps {
  multiplayer: ReturnType<typeof useMultiplayer>
  onBack?: () => void
}

type HintTone = 'attack' | 'defense' | 'neutral'

const TURN_SECONDS = 30
const SETTLEMENT_AUTO_CLOSE_SECONDS = 10
const MIN_BOARD_CELL = 18
const MAX_BOARD_CELL = 24
const EmojiPicker = dynamic(() => import('@emoji-mart/react'), { ssr: false })
const QUICK_EMOJIS = ['😀', '😄', '😂', '😍', '🥳', '😎', '🤔', '😭', '👍', '👎', '👏', '🙏', '🔥', '💯', '🎉', '❤️']

const hintToneLabel: Record<HintTone, string> = {
  attack: '进攻',
  defense: '防守',
  neutral: '稳健',
}

const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

function hintToneChipStyle(tone: HintTone): { bg: string; text: string; border: string } {
  if (tone === 'attack') return { bg: 'rgba(245,158,11,0.18)', text: '#b45309', border: 'rgba(245,158,11,0.38)' }
  if (tone === 'defense') return { bg: 'rgba(59,130,246,0.16)', text: '#1d4ed8', border: 'rgba(59,130,246,0.34)' }
  return { bg: 'rgba(16,185,129,0.16)', text: '#047857', border: 'rgba(16,185,129,0.34)' }
}

function StoneDot({ color }: { color: 'black' | 'white' }) {
  return <span className={`${fusion.stoneDot} ${color === 'black' ? fusion.blackDot : fusion.whiteDot}`} aria-hidden="true" />
}

function sideLabel(side: 'black' | 'white' | null | undefined) {
  if (side === 'black') return '黑方'
  if (side === 'white') return '白方'
  return '对手'
}

export default function MultiplayerGameBackup({ multiplayer, onBack }: MultiplayerGameBackupProps) {
  const { playBack, playClick, playDefeat, playPlace, playWin } = useSoundContext()
  const [chatInput, setChatInput] = useState('')
  const [showEmojiPanel, setShowEmojiPanel] = useState(false)
  const [turnRemaining, setTurnRemaining] = useState(TURN_SECONDS)
  const [viewportWidth, setViewportWidth] = useState(390)
  const [boardCellSize, setBoardCellSize] = useState(20)
  const [showSettlement, setShowSettlement] = useState(false)
  const [settlementSeconds, setSettlementSeconds] = useState(0)
  const [settlementCountdown, setSettlementCountdown] = useState(SETTLEMENT_AUTO_CLOSE_SECONDS)
  const turnStartedAtRef = useRef<number | null>(null)
  const moveRef = useRef(multiplayer.moveNumber)
  const endedRef = useRef(false)
  const boardWrapRef = useRef<HTMLDivElement | null>(null)
  const emojiPanelRef = useRef<HTMLDivElement | null>(null)
  const emojiToggleRef = useRef<HTMLButtonElement | null>(null)

  const isEnded = multiplayer.status === 'black-wins' || multiplayer.status === 'white-wins' || multiplayer.status === 'draw'
  const iWin = multiplayer.winner !== null && multiplayer.winner === multiplayer.myColor
  const myName = multiplayer.network.getPlayerName() || '我'
  const opponentName = multiplayer.opponentName || '对手'
  const amBlack = multiplayer.myColor === 'black'
  const latency = multiplayer.network.getStats().latency
  const horizontalPadding = viewportWidth <= 360 ? 10 : viewportWidth <= 390 ? 11 : 12
  const headingSize = viewportWidth <= 360 ? 27 : viewportWidth <= 390 ? 28 : 30
  const hasRestartPrompt = Boolean(multiplayer.pendingRestartRequestFrom)
  const isWaitingRestartResponse = isEnded && multiplayer.waitingRestartAccept

  useEffect(() => {
    if (typeof window === 'undefined') return
    const syncViewport = () => setViewportWidth(window.innerWidth)
    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => window.removeEventListener('resize', syncViewport)
  }, [])

  const recomputeBoardCell = useCallback(() => {
    const wrap = boardWrapRef.current
    if (!wrap) return
    const available = Math.floor(wrap.clientWidth)
    if (!available) return

    for (let cell = MAX_BOARD_CELL; cell >= MIN_BOARD_CELL; cell -= 1) {
      const framePadding = cell <= 20 ? 6 : cell <= 22 ? 7 : 8
      const totalWidth = cell * 16 + framePadding * 2
      if (totalWidth <= available) {
        setBoardCellSize(cell)
        return
      }
    }
    setBoardCellSize(MIN_BOARD_CELL)
  }, [])

  useEffect(() => {
    recomputeBoardCell()
    if (typeof ResizeObserver !== 'undefined' && boardWrapRef.current) {
      const observer = new ResizeObserver(() => recomputeBoardCell())
      observer.observe(boardWrapRef.current)
      return () => observer.disconnect()
    }
    window.addEventListener('resize', recomputeBoardCell)
    return () => window.removeEventListener('resize', recomputeBoardCell)
  }, [recomputeBoardCell])

  useEffect(() => {
    if (multiplayer.moveNumber > moveRef.current) playPlace()
    moveRef.current = multiplayer.moveNumber
  }, [multiplayer.moveNumber, playPlace])

  useEffect(() => {
    if (!isEnded) {
      endedRef.current = false
      setShowSettlement(false)
      return
    }
    if (endedRef.current) return
    endedRef.current = true
    const elapsed = multiplayer.gameStartTime ? Math.max(0, Math.floor((Date.now() - multiplayer.gameStartTime) / 1000)) : 0
    setSettlementSeconds(elapsed)
    setShowSettlement(true)
    if (iWin) playWin()
    if (!iWin && multiplayer.winner) playDefeat()
  }, [iWin, isEnded, multiplayer.gameStartTime, multiplayer.winner, playDefeat, playWin])

  useEffect(() => {
    turnStartedAtRef.current = multiplayer.isGameStarted && !isEnded ? Date.now() : null
    setTurnRemaining(TURN_SECONDS)
  }, [multiplayer.currentPlayer, multiplayer.moveNumber, multiplayer.isGameStarted, isEnded])

  useEffect(() => {
    if (!multiplayer.isGameStarted || isEnded || turnStartedAtRef.current == null) return
    if (multiplayer.moveNumber === 0) {
      setTurnRemaining(TURN_SECONDS)
      return
    }
    const timer = setInterval(() => {
      if (turnStartedAtRef.current == null) return
      const elapsed = Math.floor((Date.now() - turnStartedAtRef.current) / 1000)
      const next = Math.max(0, TURN_SECONDS - elapsed)
      setTurnRemaining(next)
      if (next <= 0 && multiplayer.isMyTurn) multiplayer.timeoutLose()
    }, 300)
    return () => clearInterval(timer)
  }, [isEnded, multiplayer])

  useEffect(() => {
    if (multiplayer.pendingRestartRequestFrom) {
      setShowSettlement(true)
      setSettlementCountdown(SETTLEMENT_AUTO_CLOSE_SECONDS)
    }
  }, [multiplayer.pendingRestartRequestFrom])

  useEffect(() => {
    if (!isEnded || !showSettlement || multiplayer.pendingRestartRequestFrom || multiplayer.waitingRestartAccept) return
    setSettlementCountdown(SETTLEMENT_AUTO_CLOSE_SECONDS)
    const timer = setInterval(() => {
      setSettlementCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setShowSettlement(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isEnded, showSettlement, multiplayer.pendingRestartRequestFrom, multiplayer.waitingRestartAccept])

  useEffect(() => {
    if (!showEmojiPanel) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (emojiPanelRef.current?.contains(target)) return
      if (emojiToggleRef.current?.contains(target)) return
      setShowEmojiPanel(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [showEmojiPanel])

  const sendChat = () => {
    const text = chatInput.trim()
    if (!text) return
    playClick()
    multiplayer.sendChat(text)
    setChatInput('')
    setShowEmojiPanel(false)
  }

  const leaveRoom = () => {
    playBack()
    multiplayer.disconnect()
    onBack?.()
  }

  const handleEmojiSelect = (emoji: { native?: string }) => {
    if (!emoji.native) return
    playClick()
    setChatInput((prev) => `${prev}${emoji.native}`)
  }

  const appendEmoji = (emoji: string) => {
    playClick()
    setChatInput((prev) => `${prev}${emoji}`)
  }

  const handleRestart = () => {
    playClick()
    multiplayer.requestRestart()
  }

  return (
    <main className={`${fusion.page} pt-safe-top pb-safe-bottom`}>
      <div style={{ maxWidth: 430, margin: '0 auto', padding: `0 ${horizontalPadding}px 20px` }}>
        <div className={fusion.content}>
          <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h1 style={{ margin: 0, fontSize: headingSize, lineHeight: 1.05, display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <Wifi size={22} />
              好友对局
            </h1>
            <button className={fusion.chip} type="button" onClick={leaveRoom}>
              返回房间
            </button>
          </section>

          <section className={fusion.panel}>
            <div className={fusion.friendBoardTop}>
              <span>连接{multiplayer.isConnected ? '稳定' : '中断'}</span>
              <strong className="tabular-nums">{latency}ms</strong>
            </div>
            <div className={fusion.friendPlayers}>
              <div className={fusion.friendPlayerActive}>
                <StoneDot color={amBlack ? 'black' : 'white'} />
                {myName}
              </div>
              <div>
                <StoneDot color={amBlack ? 'white' : 'black'} />
                {opponentName}
              </div>
            </div>

            <div ref={boardWrapRef} style={{ display: 'flex', justifyContent: 'center', marginTop: 10, width: '100%' }}>
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
                  if (multiplayer.isMyTurn && multiplayer.isGameStarted && !isEnded) multiplayer.makeMove(row, col)
                }}
                disabled={!multiplayer.isMyTurn || !multiplayer.isGameStarted || isEnded}
                cellSizeOverride={boardCellSize}
              />
            </div>
          </section>

          <section className={fusion.gameHud}>
            <div className={`${fusion.player} ${multiplayer.currentPlayer === 'black' && !isEnded ? fusion.playerActive : ''}`}>
              <StoneDot color="black" />
              <strong>黑方</strong>
            </div>
            <div className={fusion.timer}>
              <Clock3 size={16} />
              <span>{formatTime(turnRemaining)}</span>
            </div>
            <div className={`${fusion.player} ${multiplayer.currentPlayer === 'white' && !isEnded ? fusion.playerActive : ''}`}>
              <StoneDot color="white" />
              <strong>白方</strong>
            </div>
          </section>

          <section className={fusion.chatPanel}>
            {multiplayer.chatMessages.slice(-2).map((item, index) => {
              const isMine = item.senderName === myName
              return (
                <div key={`${item.senderName}-${index}-${item.message}`} className={`${fusion.chatBubble} ${isMine ? fusion.chatBubbleSelf : ''}`}>
                  {item.message}
                </div>
              )
            })}
            {multiplayer.chatMessages.length === 0 && <div className={fusion.chatBubble}>准备好了就开局吧。</div>}
            <div className={fusion.chatComposer}>
              <input
                type="text"
                maxLength={100}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="快速消息"
                aria-label="聊天输入"
                style={{ border: 0, outline: "none", background: "transparent", color: "inherit" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 8 }}>
                <button
                  ref={emojiToggleRef}
                  type="button"
                  onClick={() => setShowEmojiPanel((prev) => !prev)}
                  aria-label="选择表情"
                  title="选择表情"
                  style={{
                    width: 42,
                    height: 42,
                    minWidth: 42,
                    minHeight: 42,
                    padding: 0,
                    display: "grid",
                    placeItems: "center",
                    background: showEmojiPanel ? "rgba(11,95,165,0.12)" : "rgba(237,244,251,0.9)",
                    color: "#0b5fa5",
                    border: "1px solid rgba(11,95,165,0.12)",
                  }}
                >
                  <Smile size={18} />
                </button>
                <button
                  type="button"
                  onClick={sendChat}
                  style={{ minWidth: 64, minHeight: 42, padding: "0 16px" }}
                >
                  发送
                </button>
              </div>
            </div>
            {showEmojiPanel && (
              <div
                ref={emojiPanelRef}
                style={{
                  marginTop: 10,
                  borderRadius: 16,
                  border: "1px solid rgba(11,95,165,0.14)",
                  background: "#ffffff",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
                    gap: 8,
                    padding: 10,
                    borderBottom: "1px solid rgba(11,95,165,0.08)",
                  }}
                >
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => appendEmoji(emoji)}
                      aria-label={`插入表情 ${emoji}`}
                      style={{
                        minHeight: 34,
                        borderRadius: 6,
                        border: "1px solid rgba(11,95,165,0.12)",
                        background: "rgba(11,95,165,0.04)",
                        fontSize: 20,
                        lineHeight: 1,
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <EmojiPicker
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
          </section>

          {multiplayer.connectionError && <div className="status-banner status-banner-warning px-3 py-2 text-sm">{multiplayer.connectionError}</div>}
          {multiplayer.restartNotice && <div className="status-banner status-banner-info px-3 py-2 text-sm">{multiplayer.restartNotice}</div>}

          {multiplayer.hintMove && (
            <div className="status-banner status-banner-info px-3 py-2 text-sm">
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <strong>主推荐</strong>
                {multiplayer.hintTone && (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      border: `1px solid ${hintToneChipStyle(multiplayer.hintTone).border}`,
                      background: hintToneChipStyle(multiplayer.hintTone).bg,
                      color: hintToneChipStyle(multiplayer.hintTone).text,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {hintToneLabel[multiplayer.hintTone]}
                  </span>
                )}
                <span>
                  {multiplayer.hintMove.row + 1} 行 {multiplayer.hintMove.col + 1} 列
                </span>
              </div>
              {multiplayer.hintReason && <div style={{ fontSize: 12, opacity: 0.9 }}>{multiplayer.hintReason}</div>}
              {multiplayer.hintAltMove && (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12 }}>
                  <strong>备选</strong>
                  {multiplayer.hintAltTone && (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 999,
                        border: `1px solid ${hintToneChipStyle(multiplayer.hintAltTone).border}`,
                        background: hintToneChipStyle(multiplayer.hintAltTone).bg,
                        color: hintToneChipStyle(multiplayer.hintAltTone).text,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {hintToneLabel[multiplayer.hintAltTone]}
                    </span>
                  )}
                  <span>
                    {multiplayer.hintAltMove.row + 1} 行 {multiplayer.hintAltMove.col + 1} 列
                  </span>
                  {multiplayer.hintAltReason && <span style={{ opacity: 0.9 }}>路 {multiplayer.hintAltReason}</span>}
                </div>
              )}
            </div>
          )}

          {multiplayer.pendingUndoRequestFrom && (
            <div className={fusion.buttonGrid}>
              <button className={fusion.buttonPrimary} type="button" onClick={() => multiplayer.acceptUndo()}>
                同意悔棋
              </button>
              <button className={`${fusion.buttonSecondary} ${fusion.buttonLight}`} type="button" onClick={() => multiplayer.dismissUndoRequest()}>
                暂不
              </button>
            </div>
          )}

          {multiplayer.pendingRestartRequestFrom && (
            <div className={fusion.buttonGrid}>
              <button className={fusion.buttonPrimary} type="button" onClick={() => multiplayer.acceptRestart()}>
                接受再来一局
              </button>
              <button className={`${fusion.buttonSecondary} ${fusion.buttonLight}`} type="button" onClick={() => multiplayer.dismissRestartRequest()}>
                稍后
              </button>
            </div>
          )}

          {!isEnded ? (
            <>
              <div className={fusion.buttonGrid}>
                <button
                  className={`${fusion.buttonSecondary} ${fusion.buttonLight}`}
                  type="button"
                  disabled={multiplayer.waitingUndoAccept}
                  onClick={() => multiplayer.requestUndo()}
                >
                  {multiplayer.waitingUndoAccept ? '等待对手同意' : '悔棋'}
                </button>
                <button className={fusion.buttonDanger} type="button" onClick={() => multiplayer.resign()}>
                  {multiplayer.moveNumber === 0 ? '取消本局' : '认输'}
                </button>
              </div>
              <button className={fusion.buttonPrimary} type="button" onClick={() => multiplayer.requestHint()}>
                提示一手
              </button>
            </>
          ) : (
            <div className={fusion.buttonGrid}>
              <button className={fusion.buttonPrimary} type="button" disabled={multiplayer.waitingRestartAccept} onClick={handleRestart}>
                {multiplayer.waitingRestartAccept ? '等待对手确认' : '再来一局'}
              </button>
              <button className={`${fusion.buttonSecondary} ${fusion.buttonLight}`} type="button" onClick={leaveRoom}>
                返回
              </button>
            </div>
          )}
        </div>
      </div>

      <VictoryOverlay
        open={isEnded && showSettlement}
        status={multiplayer.status}
        winner={multiplayer.winner}
        timeoutLoser={multiplayer.timeoutLoser}
        autoClose={!hasRestartPrompt && !isWaitingRestartResponse}
        resultInfoOverride={
          multiplayer.gameEndReason === 'resign' && multiplayer.winner
            ? {
                title: multiplayer.winner === multiplayer.myColor ? '对手认输了' : '你认输了',
                subtitle: `${sideLabel(multiplayer.winner === 'black' ? 'white' : 'black')}认输，${sideLabel(multiplayer.winner)}赢得了本局。`,
                reasonLabel: '认输',
                playerResultLabel: `${sideLabel(multiplayer.winner)}胜出`,
                playerResultSide: multiplayer.winner,
              }
            : undefined
        }
        extraContent={
          hasRestartPrompt ? (
            <div
              style={{
                marginTop: 10,
                padding: '12px 14px',
                borderRadius: 16,
                border: '1px solid rgba(11,95,165,0.14)',
                background: 'rgba(237,244,251,0.82)',
                color: '#123b5b',
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              {multiplayer.pendingRestartRequestFrom} 想再来一局。
            </div>
          ) : isWaitingRestartResponse ? (
            <div
              style={{
                marginTop: 10,
                padding: '12px 14px',
                borderRadius: 16,
                border: '1px solid rgba(11,95,165,0.14)',
                background: 'rgba(237,244,251,0.82)',
                color: '#123b5b',
                fontSize: 13,
                fontWeight: 900,
                textAlign: 'center',
              }}
            >
              已邀请对方再来一局，等待确认。
            </div>
          ) : null
        }
        footerContent={
          hasRestartPrompt ? (
            <div className={fusion.buttonGrid} style={{ marginTop: 10 }}>
              <button className={fusion.buttonPrimary} type="button" onClick={() => multiplayer.acceptRestart()}>
                接受再来一局
              </button>
              <button className={`${fusion.buttonSecondary} ${fusion.buttonLight}`} type="button" onClick={() => multiplayer.dismissRestartRequest()}>
                稍后
              </button>
            </div>
          ) : isWaitingRestartResponse ? (
            <div className={fusion.buttonGrid} style={{ marginTop: 10 }}>
              <button className={fusion.buttonPrimary} type="button" disabled>
                等待对手确认
              </button>
              <button className={`${fusion.buttonSecondary} ${fusion.buttonLight}`} type="button" onClick={leaveRoom}>
                返回
              </button>
            </div>
          ) : undefined
        }
        mode={'pvp'}
        playerSide={multiplayer.myColor}
        totalMoves={multiplayer.moveNumber}
        totalTime={settlementSeconds}
        onRestart={handleRestart}
        onBack={leaveRoom}
        onClose={() => setShowSettlement(false)}
      />
    </main>
  )
}
