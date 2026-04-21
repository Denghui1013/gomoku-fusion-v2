'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DoorOpen, PlusCircle, Wifi } from 'lucide-react'
import type { useMultiplayer } from '@/hooks/useMultiplayer'
import fusion from '@/app/fusion-ui-preview/FusionUIPreview.module.css'

type LobbyMode = 'menu' | 'create' | 'join' | 'waiting'

interface LobbyScreenProps {
  multiplayer: ReturnType<typeof useMultiplayer>
  onGameStart?: () => void
}

function DotQR() {
  return (
    <div className={fusion.qrMock} aria-hidden="true">
      {Array.from({ length: 25 }).map((_, index) => (
        <span key={index} className={index % 4 === 0 || index % 7 === 0 ? fusion.qrDotActive : ''} />
      ))}
    </div>
  )
}

export default function LobbyScreen({ multiplayer, onGameStart }: LobbyScreenProps) {
  const router = useRouter()
  const [mode, setMode] = useState<LobbyMode>('menu')
  const [playerName, setPlayerName] = useState('')
  const [roomCodeInput, setRoomCodeInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const hasRoom = useMemo(
    () => multiplayer.isInRoom || !!multiplayer.roomCode || !!multiplayer.network.getRoomCode(),
    [multiplayer.isInRoom, multiplayer.roomCode, multiplayer.network]
  )
  const effectiveMode: LobbyMode = hasRoom ? 'waiting' : mode
  const roomCode = multiplayer.roomCode || multiplayer.network.getRoomCode() || ''
  const canEnterGame = multiplayer.isGameStarted || !!multiplayer.opponentName
  const latency = multiplayer.network.getStats().latency
  const myName = multiplayer.network.getPlayerName() || '你'
  const opponentName = multiplayer.opponentName || '等待加入'

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('请输入昵称')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await multiplayer.createRoom(playerName.trim())
      setMode('waiting')
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建房间失败')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setError('请输入昵称')
      return
    }
    if (!roomCodeInput.trim()) {
      setError('请输入房间号')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await multiplayer.joinRoom(roomCodeInput.trim(), playerName.trim())
      setMode('waiting')
    } catch (err) {
      setError(err instanceof Error ? err.message : '加入房间失败')
    } finally {
      setLoading(false)
    }
  }

  const copyRoomCode = async () => {
    if (!roomCode) return
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      // ignore
    }
  }

  const leaveRoom = () => {
    multiplayer.disconnect()
    setMode('menu')
    setError(null)
  }

  return (
    <main className={`${fusion.page} pt-safe-top pb-safe-bottom`}>
      <div style={{ maxWidth: 430, margin: '0 auto', padding: '0 12px 20px' }}>
        <div className={fusion.content}>
          <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.05, display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <Wifi size={22} />
              好友房
            </h1>
            <button className={fusion.chip} type="button" onClick={() => router.push('/mode')}>
              返回
            </button>
          </section>

          {effectiveMode === 'menu' && (
            <>
              <section className={fusion.roomHero}>
                <div>
                  <span className={fusion.roomState}>好友房等待中</span>
                  <h2>创建或加入</h2>
                  <p>实时同步落子，支持复制房号邀请好友。</p>
                </div>
                <DotQR />
              </section>

              <section className={fusion.modeList} style={{ marginTop: 10 }}>
                <button className={`${fusion.modeCard} ${fusion.modeCardActive}`} type="button" onClick={() => setMode('create')}>
                  <div className={fusion.modeIcon}><PlusCircle size={20} /></div>
                  <div>
                    <h3>创建房间</h3>
                    <p>生成房间号并邀请好友加入</p>
                  </div>
                  <span className={fusion.radio} aria-hidden="true" />
                </button>
                <button className={fusion.modeCard} type="button" onClick={() => setMode('join')}>
                  <div className={fusion.modeIcon}><DoorOpen size={20} /></div>
                  <div>
                    <h3>加入房间</h3>
                    <p>输入房间号后直接进入准备状态</p>
                  </div>
                  <span className={`${fusion.radio} ${fusion.radioOff}`} aria-hidden="true" />
                </button>
              </section>
            </>
          )}

          {(effectiveMode === 'create' || effectiveMode === 'join') && (
            <section className={fusion.panel}>
              <h3>{effectiveMode === 'create' ? '创建房间' : '加入房间'}</h3>
              <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                <input
                  type="text"
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  placeholder="请输入昵称"
                  maxLength={20}
                  style={{ width: '100%', height: 48, borderRadius: 12, border: '1px solid rgba(11,95,165,0.16)', padding: '0 12px', fontWeight: 700 }}
                />
                {effectiveMode === 'join' && (
                  <input
                    type="text"
                    value={roomCodeInput}
                    onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())}
                    placeholder="输入房间号"
                    maxLength={6}
                    style={{ width: '100%', height: 48, borderRadius: 12, border: '1px solid rgba(11,95,165,0.16)', padding: '0 12px', fontWeight: 800, letterSpacing: '0.08em' }}
                  />
                )}
              </div>

              {error && <div className="status-banner status-banner-danger px-3 py-2 text-sm" style={{ marginTop: 10 }}>{error}</div>}

              <div className={fusion.buttonGrid}>
                <button className={fusion.buttonPrimary} type="button" disabled={loading} onClick={effectiveMode === 'create' ? handleCreateRoom : handleJoinRoom}>
                  {loading ? '处理中...' : effectiveMode === 'create' ? '创建房间' : '加入房间'}
                </button>
                <button className={`${fusion.buttonSecondary} ${fusion.buttonLight}`} type="button" onClick={() => setMode('menu')}>
                  返回
                </button>
              </div>
            </section>
          )}

          {effectiveMode === 'waiting' && (
            <>
              {multiplayer.connectionError && (
                <div className={`${fusion.noticeInline} ${fusion.noticeInlineWarn}`}>
                  <span className={fusion.noticeInlineLabel}>连接提醒</span>
                  <span>{multiplayer.connectionError}</span>
                </div>
              )}
              <section className={fusion.roomHero}>
                <div>
                  <span className={fusion.roomState}>好友房等待中</span>
                  <h2>房间 {roomCode || '------'}</h2>
                  <p>复制房号发送好友，进入后直接同步落子。</p>
                </div>
                <DotQR />
              </section>

              <div className={fusion.roomActions}>
                <button type="button" onClick={copyRoomCode}>
                  {copied ? '已复制房号' : '复制房号'}
                </button>
                <button type="button" onClick={leaveRoom}>
                  离开房间
                </button>
              </div>

              <section className={fusion.friendBoard}>
                <div className={fusion.friendBoardTop}>
                  <span>连接{multiplayer.isConnected ? '稳定' : '中断'}</span>
                  <strong className="tabular-nums">{latency}ms</strong>
                </div>
                <div className={fusion.friendPlayers}>
                  <div className={fusion.friendPlayerActive}>{myName}</div>
                  <div>{opponentName}</div>
                </div>
                <div className={fusion.roomMetaGrid}>
                  <div className={fusion.roomMetaItem}>
                    <span>对局模式</span>
                    <strong>好友房</strong>
                  </div>
                  <div className={fusion.roomMetaItem}>
                    <span>当前执子</span>
                    <strong>你先手</strong>
                  </div>
                </div>
              </section>

              <button
                className={fusion.buttonPrimary}
                type="button"
                style={{ marginTop: 10, opacity: canEnterGame ? 1 : 0.65 }}
                disabled={!canEnterGame}
                onClick={() => onGameStart?.()}
              >
                {canEnterGame ? '进入对局' : '等待对手加入'}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
