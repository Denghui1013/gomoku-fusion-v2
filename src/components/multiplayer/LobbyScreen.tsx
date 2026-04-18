'use client'

import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useRouter } from 'next/navigation'
import type { useMultiplayer } from '@/hooks/useMultiplayer'
import { useSoundContext } from '@/context/SoundContext'
import { ArrowLeft, Check, Copy, Gamepad2, Loader2, RadioTower, Users, Wifi, WifiOff } from 'lucide-react'
import { getConfiguredMultiplayerServerUrl, getMultiplayerShareOrigin } from '@/lib/multiplayerConfig'

type LobbyMode = 'menu' | 'create' | 'join' | 'waiting'
const LOBBY_MODE_STORAGE_KEY = 'gomoku:lobby-mode'

interface LobbyScreenProps {
  multiplayer: ReturnType<typeof useMultiplayer>
  onGameStart?: () => void
  onBack?: () => void
}

export default function LobbyScreen({ multiplayer, onGameStart, onBack }: LobbyScreenProps) {
  const router = useRouter()
  const { playBack, playConfirm, playDangerConfirm, playSuccess, playWarning } = useSoundContext()
  const [mode, setMode] = useState<LobbyMode>(() => {
    const hasActiveRoomContext =
      !!multiplayer.network.getRoomId() ||
      !!multiplayer.network.getRoomCode() ||
      multiplayer.isInRoom ||
      !!multiplayer.roomCode
    if (!hasActiveRoomContext) return 'menu'
    if (typeof window === 'undefined') return 'waiting'
    return window.sessionStorage.getItem(LOBBY_MODE_STORAGE_KEY) === 'waiting' ? 'waiting' : 'waiting'
  })
  const [playerName, setPlayerName] = useState('')
  const [roomCodeInput, setRoomCodeInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pollGuestJoined, setPollGuestJoined] = useState(false)
  const [lastRoomHint, setLastRoomHint] = useState<{ hostName?: string; guestName?: string }>({})
  const [origin, setOrigin] = useState('')
  const switchedToGameRef = useRef(false)
  const previousErrorRef = useRef<string | null>(null)

  const network = multiplayer.network
  const roomCode = multiplayer.roomCode
  const forceStartFromRoomState = multiplayer.forceStartFromRoomState
  const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]'
  const inputFocusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]'

  useEffect(() => {
    setOrigin(getMultiplayerShareOrigin())
  }, [])

  useEffect(() => {
    if (mode !== 'waiting' || switchedToGameRef.current) return
    if (multiplayer.isGameStarted || !!multiplayer.opponentName) {
      switchedToGameRef.current = true
      onGameStart?.()
    }
  }, [mode, multiplayer.isGameStarted, multiplayer.opponentName, onGameStart])

  useEffect(() => {
    if (mode !== 'waiting' || switchedToGameRef.current) return

    const roomId = network.getRoomId()
    if (!roomId && !roomCode) return

    let cancelled = false
    const timer = setInterval(async () => {
      if (cancelled || switchedToGameRef.current) return
      try {
        const query = roomId
          ? `roomId=${encodeURIComponent(roomId)}`
          : `roomCode=${encodeURIComponent(roomCode || '')}`
        const serverUrl = getConfiguredMultiplayerServerUrl()
        const response = await fetch(`${serverUrl}/api/network/room-state?${query}`)
        if (!response.ok) return
        const data = await response.json()
        const joined = Boolean(data?.guestJoined || data?.gameStarted)
        setPollGuestJoined(joined)

        if (data?.success && joined) {
          setLastRoomHint({ hostName: data?.hostName, guestName: data?.guestName })
          forceStartFromRoomState({ hostName: data?.hostName, guestName: data?.guestName })
          switchedToGameRef.current = true
          onGameStart?.()
        }
      } catch {
        // ignore
      }
    }, 1200)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [forceStartFromRoomState, mode, network, onGameStart, roomCode])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(LOBBY_MODE_STORAGE_KEY, mode)
  }, [mode])

  useEffect(() => {
    const activeRoomId = network.getRoomId()
    const activeRoomCode = network.getRoomCode()
    const hasActiveWaitingRoom =
      mode === 'menu' &&
      (multiplayer.isInRoom || !!activeRoomId || !!activeRoomCode) &&
      (multiplayer.roomCode || activeRoomCode) &&
      !multiplayer.isGameStarted

    if (hasActiveWaitingRoom) setMode('waiting')
  }, [mode, multiplayer.isGameStarted, multiplayer.isInRoom, multiplayer.roomCode, network])

  useEffect(() => {
    const activeRoomId = network.getRoomId()
    const activeRoomCode = network.getRoomCode()
    const hasActiveRoomContext =
      multiplayer.isInRoom || !!multiplayer.roomCode || !!activeRoomId || !!activeRoomCode
    if (mode === 'waiting' && !hasActiveRoomContext) setMode('menu')
  }, [mode, multiplayer.isInRoom, multiplayer.roomCode, network])

  useEffect(() => {
    if (multiplayer.connectionError && multiplayer.connectionError !== previousErrorRef.current) {
      playWarning()
    }
    previousErrorRef.current = multiplayer.connectionError
  }, [multiplayer.connectionError, playWarning])

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('请输入昵称')
      return
    }
    setError(null)
    setLoading(true)
    try {
      playConfirm()
      switchedToGameRef.current = false
      setPollGuestJoined(false)
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
      setError('请输入房间码')
      return
    }
    setError(null)
    setLoading(true)
    try {
      playConfirm()
      switchedToGameRef.current = false
      setPollGuestJoined(false)
      await multiplayer.joinRoom(roomCodeInput.trim(), playerName.trim())
      setMode('waiting')
    } catch (err) {
      setError(err instanceof Error ? err.message : '加入房间失败')
    } finally {
      setLoading(false)
    }
  }

  const copyRoomCode = () => {
    if (!multiplayer.roomCode) return
    navigator.clipboard.writeText(multiplayer.roomCode)
    playSuccess()
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const renderMenu = () => (
    <div className="space-y-5 mobile-tight">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center game-panel">
          <Wifi className="w-8 h-8" style={{ color: 'var(--primary)' }} />
        </div>
        <h2 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
          联机对战
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          创建或加入房间，与好友实时对弈
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => {
            setError(null)
            setMode('create')
          }}
          className={`game-btn game-btn-primary w-full py-3.5 flex items-center justify-center gap-2 ${focusRing}`}
        >
          <Users className="w-5 h-5" />
          创建房间
        </button>
        <button
          onClick={() => {
            setError(null)
            setMode('join')
          }}
          className={`game-btn game-btn-secondary w-full py-3.5 flex items-center justify-center gap-2 ${focusRing}`}
        >
          <Gamepad2 className="w-5 h-5" />
          加入房间
        </button>
      </div>
    </div>
  )

  const renderCreateRoom = () => (
    <div className="space-y-5 mobile-tight">
      <button onClick={() => {
        playBack()
        setMode('menu')
      }} className={`game-hud-pill inline-flex items-center gap-2 px-3 py-2 ${focusRing}`}>
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>

      <h2 className="text-2xl font-bold text-center" style={{ color: 'var(--text-primary)' }}>
        创建房间
      </h2>

      <label htmlFor="create-player-name" className="sr-only">昵称</label>
      <input
        id="create-player-name"
        type="text"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        placeholder="输入昵称"
        maxLength={20}
        className={`w-full px-4 py-3 rounded-xl border input-mobile-safe ${inputFocusRing}`}
        style={{ background: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
      />

      {error && <div className="status-banner status-banner-danger p-3 text-sm">{error}</div>}

      <button
        onClick={handleCreateRoom}
        disabled={loading || !playerName.trim()}
        className={`game-btn game-btn-primary w-full py-3.5 disabled:opacity-50 flex items-center justify-center gap-2 ${focusRing}`}
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users className="w-5 h-5" />}
        {loading ? '创建中...' : '创建房间'}
      </button>
    </div>
  )

  const renderJoinRoom = () => (
    <div className="space-y-5 mobile-tight">
      <button onClick={() => {
        playBack()
        setMode('menu')
      }} className={`game-hud-pill inline-flex items-center gap-2 px-3 py-2 ${focusRing}`}>
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>

      <h2 className="text-2xl font-bold text-center" style={{ color: 'var(--text-primary)' }}>
        加入房间
      </h2>

      <label htmlFor="join-player-name" className="sr-only">昵称</label>
      <input
        id="join-player-name"
        type="text"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        placeholder="输入昵称"
        maxLength={20}
        className={`w-full px-4 py-3 rounded-xl border input-mobile-safe ${inputFocusRing}`}
        style={{ background: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
      />

      <label htmlFor="join-room-code" className="sr-only">房间码</label>
      <input
        id="join-room-code"
        type="text"
        value={roomCodeInput}
        onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
        placeholder="输入 6 位房间码"
        maxLength={6}
        className={`w-full px-4 py-3 rounded-xl border text-center text-2xl tracking-widest font-mono uppercase input-mobile-safe ${inputFocusRing}`}
        style={{ background: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
      />

      {error && <div className="status-banner status-banner-danger p-3 text-sm">{error}</div>}

      <button
        onClick={handleJoinRoom}
        disabled={loading || !playerName.trim() || !roomCodeInput.trim()}
        className={`game-btn game-btn-primary w-full py-3.5 disabled:opacity-50 flex items-center justify-center gap-2 ${focusRing}`}
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Gamepad2 className="w-5 h-5" />}
        {loading ? '加入中...' : '加入房间'}
      </button>
    </div>
  )

  const renderWaitingRoom = () => (
    <div className="space-y-5 mobile-tight">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 game-hud-pill px-3 py-1.5 text-sm mb-3">
          {multiplayer.isConnected ? (
            <>
              <Wifi className="w-4 h-4" style={{ color: 'var(--state-success-text)' }} />
              <span style={{ color: 'var(--state-success-text)' }}>已连接</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" style={{ color: 'var(--state-warning-text)' }} />
              <span style={{ color: 'var(--state-warning-text)' }}>等待重连</span>
            </>
          )}
        </div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {multiplayer.opponentName ? '对手已就绪' : '等待对手加入...'}
        </h2>
        {multiplayer.connectionError && (
          <p className="mt-2 text-sm" style={{ color: 'var(--state-warning-text)' }}>
            {multiplayer.connectionError}
          </p>
        )}
      </div>

      {multiplayer.roomCode && (
        <div className="game-panel p-4 space-y-4">
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>房间码</p>
            <div className="inline-flex items-center gap-3 game-hud-pill px-5 py-2">
              <span className="text-3xl font-mono font-bold tracking-widest" style={{ color: 'var(--text-primary)' }}>
                {multiplayer.roomCode}
              </span>
              <button onClick={copyRoomCode} className={`p-2 rounded-lg border ${focusRing}`} style={{ borderColor: 'var(--card-border)' }}>
                {copied ? (
                  <Check className="w-5 h-5" style={{ color: 'var(--state-success-text)' }} />
                ) : (
                  <Copy className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                )}
              </button>
            </div>
          </div>

          {origin && (
            <div className="flex justify-center">
              <QRCodeSVG
                value={`${origin}?room=${multiplayer.roomCode}`}
                size={180}
                level="M"
                bgColor="#ffffff"
                fgColor="#000000"
                includeMargin
                className="rounded-xl p-2 bg-white border"
              />
            </div>
          )}
        </div>
      )}

      {(pollGuestJoined || multiplayer.isGameStarted || !!multiplayer.opponentName) && (
        <button
          onClick={() => {
            forceStartFromRoomState(lastRoomHint)
            switchedToGameRef.current = true
            onGameStart?.()
          }}
          className={`game-btn game-btn-primary w-full py-3.5 ${focusRing}`}
        >
          对手已加入，进入对局
        </button>
      )}

      <button
        onClick={() => {
          playDangerConfirm()
          multiplayer.disconnect()
          setPollGuestJoined(false)
          switchedToGameRef.current = false
          setMode('menu')
          onBack?.()
        }}
        className={`game-btn game-btn-secondary w-full py-3.5 ${focusRing}`}
      >
        离开房间
      </button>
    </div>
  )

  const isMenu = mode === 'menu'

  return (
    <div className="min-h-dvh rhythm-page pt-safe-top pb-safe-bottom" style={{ background: 'var(--background)' }}>
      <div className="game-shell max-w-2xl pt-6 sm:pt-4 md:pt-0">
        <header className="mb-5 sm:mb-5">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => {
                playBack()
                onBack?.()
                router.push('/mode')
              }}
              className={`game-hud-pill inline-flex items-center gap-2 px-3 py-2 ${focusRing}`}
            >
              <ArrowLeft className="w-4 h-4" />
              返回主菜单
            </button>
            <div
              className="game-hud-pill inline-flex items-center gap-2 px-3 py-1.5"
              style={{ color: 'var(--text-primary)' }}
              aria-label="联机大厅"
            >
              <RadioTower className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              <span className="text-xs font-bold tracking-wide">联机大厅</span>
            </div>
          </div>
        </header>

        <div className={`${isMenu ? 'min-h-[58dvh] sm:min-h-0 flex flex-col justify-start sm:justify-center pt-[9vh] sm:pt-0' : ''}`}>
          <div className="game-panel p-4 sm:p-5 md:p-7">
            {mode === 'menu' && renderMenu()}
            {mode === 'create' && renderCreateRoom()}
            {mode === 'join' && renderJoinRoom()}
            {mode === 'waiting' && renderWaitingRoom()}
          </div>

          {isMenu && (
            <p className="mt-3 text-center text-xs sm:text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              建议先创建房间，再将房间码分享给好友
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
