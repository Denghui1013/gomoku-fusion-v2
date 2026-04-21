import { useCallback, useEffect, useRef, useState } from 'react'
import { networkManager } from '@/network/NetworkManager'
import { useGomoku } from './useGomoku'
import { getConfiguredMultiplayerServerUrl } from '@/lib/multiplayerConfig'
import type {
  ChatPayload,
  GameEndPayload,
  GameStartPayloadData,
  MovePayload,
  PlayerJoinedPayload,
  PlayerLeftPayload,
  RestartDeclinePayload,
  RestartRequestPayload,
  RoomInfo,
  RoomSnapshotPayload,
  UndoDeclinePayload,
  UndoRequestPayload,
} from '@/network/types'

type HintTone = 'attack' | 'defense' | 'neutral'

interface HintPoint {
  row: number
  col: number
  tone: HintTone
  reason: string
}

interface MultiplayerState {
  isConnected: boolean
  isInRoom: boolean
  isGameStarted: boolean
  isMyTurn: boolean
  currentPlayer: 'black' | 'white'
  opponentName: string | null
  roomCode: string | null
  myColor: 'black' | 'white' | null
  moveNumber: number
  gameStartTime: number | null
  chatMessages: ChatPayload[]
  connectionError: string | null
  pendingRestartRequestFrom: string | null
  waitingRestartAccept: boolean
  pendingUndoRequestFrom: string | null
  waitingUndoAccept: boolean
  restartNotice: string | null
  hintMove: { row: number; col: number } | null
  hintTone: HintTone | null
  hintReason: string | null
  hintAltMove: { row: number; col: number } | null
  hintAltTone: HintTone | null
  hintAltReason: string | null
  gameEndReason: 'win' | 'draw' | 'resign' | 'timeout' | null
}

interface ForceStartHint {
  hostName?: string
  guestName?: string
}

interface SyncedMove {
  row: number
  col: number
  player: 'black' | 'white'
  moveNumber: number
}

interface DeclineState {
  declinerId?: string
  declinerName?: string
  requesterId?: string
  requesterName?: string
  timestamp: number
}

interface OpeningCancelState {
  requesterId?: string
  requesterName?: string
  timestamp: number
}

interface RoomStateResponse {
  success: boolean
  roomCode?: string
  hostName?: string
  guestName?: string
  gameStarted?: boolean
  moveCount?: number
  currentPlayer?: 'black' | 'white'
  moves?: SyncedMove[]
  chatMessages?: ChatPayload[]
  lastGameEnd?: GameEndPayload
  pendingRestartRequesterId?: string
  pendingRestartRequesterName?: string
  pendingUndoRequesterId?: string
  pendingUndoRequesterName?: string
  lastRestartDecline?: DeclineState | null
  lastUndoDecline?: DeclineState | null
  lastOpeningCancel?: OpeningCancelState | null
}

const BOARD_SIZE = 15
const WIN_LENGTH = 5
const ROOM_STATE_POLL_MS_IDLE = 1200
const ROOM_STATE_POLL_MS_PLAYING = 700
const ROOM_STATE_POLL_MS_INTERACTIVE = 450

const initialState: MultiplayerState = {
  isConnected: false,
  isInRoom: false,
  isGameStarted: false,
  isMyTurn: false,
  currentPlayer: 'black',
  opponentName: null,
  roomCode: null,
  myColor: null,
  moveNumber: 0,
  gameStartTime: null,
  chatMessages: [],
  connectionError: null,
  pendingRestartRequestFrom: null,
  waitingRestartAccept: false,
  pendingUndoRequestFrom: null,
  waitingUndoAccept: false,
  restartNotice: null,
  hintMove: null,
  hintTone: null,
  hintReason: null,
  hintAltMove: null,
  hintAltTone: null,
  hintAltReason: null,
  gameEndReason: null,
}

const inBounds = (row: number, col: number) => row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE

function wouldWinAt(board: Array<Array<'black' | 'white' | null>>, row: number, col: number, player: 'black' | 'white'): boolean {
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]] as const
  for (const [dr, dc] of directions) {
    let count = 1
    for (const sign of [-1, 1] as const) {
      let step = 1
      while (true) {
        const nr = row + dr * step * sign
        const nc = col + dc * step * sign
        if (!inBounds(nr, nc) || board[nr][nc] !== player) break
        count += 1
        step += 1
      }
    }
    if (count >= WIN_LENGTH) return true
  }
  return false
}

function rankHintMoves(board: Array<Array<'black' | 'white' | null>>, player: 'black' | 'white'): { primary: HintPoint | null; secondary: HintPoint | null } {
  const opponent: 'black' | 'white' = player === 'black' ? 'white' : 'black'
  const seen = new Set<string>()
  const candidates: Array<HintPoint & { score: number }> = []

  const push = (row: number, col: number, score: number, tone: HintTone, reason: string) => {
    const key = `${row}-${col}`
    if (seen.has(key)) return
    seen.add(key)
    candidates.push({ row, col, score, tone, reason })
  }

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (board[row][col] !== null) continue
      if (wouldWinAt(board, row, col, player)) push(row, col, 100000, 'attack', '可直接形成五连，优先终结对局')
    }
  }

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (board[row][col] !== null) continue
      if (wouldWinAt(board, row, col, opponent)) push(row, col, 90000, 'defense', '可阻断对手连五，先保住局面')
      const centerDist = Math.abs(row - 7) + Math.abs(col - 7)
      let nearby = 0
      for (let r = row - 2; r <= row + 2; r += 1) {
        for (let c = col - 2; c <= col + 2; c += 1) {
          if (!inBounds(r, c) || (r === row && c === col)) continue
          if (board[r][c] !== null) nearby += 1
        }
      }
      const score = nearby * 10 - centerDist
      const reason =
        nearby >= 6
          ? '可联动周边子力，延展后续攻防'
          : centerDist <= 2
            ? '控制中腹，便于向四向扩张'
            : '局面稳健过渡，保持手型弹性'
      push(row, col, score, 'neutral', reason)
    }
  }

  candidates.sort((a, b) => b.score - a.score)
  return {
    primary: candidates[0] ? { row: candidates[0].row, col: candidates[0].col, tone: candidates[0].tone, reason: candidates[0].reason } : null,
    secondary: candidates[1] ? { row: candidates[1].row, col: candidates[1].col, tone: candidates[1].tone, reason: candidates[1].reason } : null,
  }
}

export function useMultiplayer() {
  const network = networkManager
  const gomoku = useGomoku()

  const [state, setState] = useState<MultiplayerState>(() => {
    const roomId = network.getRoomId()
    if (!roomId) return initialState
    const role = network.getRole()
    return {
      ...initialState,
      isConnected: network.isConnected(),
      isInRoom: true,
      roomCode: network.getRoomCode() || null,
      myColor: role === 'host' ? 'black' : role === 'guest' ? 'white' : null,
    }
  })

  const roleRef = useRef<'host' | 'guest' | null>(null)
  const manualDisconnectRef = useRef(false)
  const stateRef = useRef(state)
  const gomokuRef = useRef(gomoku)
  const moveCountRef = useRef(0)
  const restartNoticeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastGameEndSignatureRef = useRef<string | null>(null)
  const lastRestartDeclineTimestampRef = useRef<number | null>(null)
  const lastUndoDeclineTimestampRef = useRef<number | null>(null)
  const lastOpeningCancelTimestampRef = useRef<number | null>(null)
  const lastLocalMoveSentAtRef = useRef(0)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    gomokuRef.current = gomoku
  }, [gomoku])

  const getMyColorByRole = useCallback((): 'black' | 'white' | null => {
    if (roleRef.current === 'host') return 'black'
    if (roleRef.current === 'guest') return 'white'
    return null
  }, [])

  const getOpponentNameFromHint = useCallback((hint?: ForceStartHint): string | null => {
    if (!hint) return null
    if (roleRef.current === 'host') return hint.guestName || null
    if (roleRef.current === 'guest') return hint.hostName || null
    return null
  }, [])

  const clearRestartNotice = useCallback(() => {
    if (restartNoticeTimerRef.current) clearTimeout(restartNoticeTimerRef.current)
    restartNoticeTimerRef.current = null
    setState((prev) => ({ ...prev, restartNotice: null }))
  }, [])

  const showRestartNotice = useCallback((message: string) => {
    if (restartNoticeTimerRef.current) clearTimeout(restartNoticeTimerRef.current)
    setState((prev) => ({ ...prev, restartNotice: message }))
    restartNoticeTimerRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, restartNotice: null }))
      restartNoticeTimerRef.current = null
    }, 10000)
  }, [])

  const clearHint = useCallback(
    () => ({ hintMove: null, hintTone: null, hintReason: null, hintAltMove: null, hintAltTone: null, hintAltReason: null }),
    []
  )

  const forceStartFromRoomState = useCallback((hint?: ForceStartHint) => {
    gomokuRef.current.resetGame()
    moveCountRef.current = 0
    lastLocalMoveSentAtRef.current = 0
    lastGameEndSignatureRef.current = null
    lastRestartDeclineTimestampRef.current = null
    lastUndoDeclineTimestampRef.current = null
    lastOpeningCancelTimestampRef.current = null

    setState((prev) => ({
      ...prev,
      isGameStarted: true,
      isInRoom: true,
      myColor: getMyColorByRole() || prev.myColor,
      currentPlayer: 'black',
      opponentName: getOpponentNameFromHint(hint) || prev.opponentName,
      moveNumber: 0,
      gameStartTime: Date.now(),
      connectionError: null,
      waitingRestartAccept: false,
      pendingRestartRequestFrom: null,
      waitingUndoAccept: false,
      pendingUndoRequestFrom: null,
      restartNotice: null,
      gameEndReason: null,
      ...clearHint(),
    }))
  }, [clearHint, getMyColorByRole, getOpponentNameFromHint])

  const syncMovesFromServer = useCallback((moves: SyncedMove[]) => {
    if (!Array.isArray(moves)) return
    const orderedMoves = [...moves].sort((a, b) => a.moveNumber - b.moveNumber)
    const hasRollback = orderedMoves.length < moveCountRef.current
    if (hasRollback && Date.now() - lastLocalMoveSentAtRef.current < 1200) return

    const hasMismatch = orderedMoves.some((m) => gomokuRef.current.board[m.row]?.[m.col] !== m.player)
    if (hasRollback || hasMismatch) {
      gomokuRef.current.resetGame()
      for (const m of orderedMoves) gomokuRef.current.makeMove(m.row, m.col, m.player)
      moveCountRef.current = orderedMoves.length
      setState((prev) => ({
        ...prev,
        moveNumber: orderedMoves.length,
        currentPlayer: orderedMoves.length % 2 === 0 ? 'black' : 'white',
        gameEndReason: null,
        ...clearHint(),
      }))
      return
    }

    let latest = moveCountRef.current
    let latestPlayer: 'black' | 'white' | null = null
    for (const m of orderedMoves) {
      if (m.moveNumber <= moveCountRef.current) continue
      if (gomokuRef.current.board[m.row]?.[m.col] !== null) continue
      gomokuRef.current.makeMove(m.row, m.col, m.player)
      latest = Math.max(latest, m.moveNumber)
      latestPlayer = m.player
    }
    if (latest > moveCountRef.current) {
      moveCountRef.current = latest
      setState((prev) => ({
        ...prev,
        moveNumber: latest,
        currentPlayer: latestPlayer === 'black' ? 'white' : 'black',
        gameEndReason: null,
        ...clearHint(),
      }))
    }
  }, [clearHint])

  useEffect(() => {
    return () => {
      if (restartNoticeTimerRef.current) clearTimeout(restartNoticeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const unregisterConnect = network.onConnect(() => {
      manualDisconnectRef.current = false
      setState((prev) => ({ ...prev, isConnected: true, isInRoom: true, connectionError: null }))
    })

    const unregisterDisconnect = network.onDisconnect((reason) => {
      if (manualDisconnectRef.current) {
        manualDisconnectRef.current = false
        return
      }
      setState((prev) => ({
        ...prev,
        isConnected: false,
        isInRoom: prev.isInRoom || !!prev.roomCode,
        isGameStarted: false,
        gameEndReason: null,
        connectionError: reason || '连接已断开',
        waitingRestartAccept: false,
        pendingRestartRequestFrom: null,
        waitingUndoAccept: false,
        pendingUndoRequestFrom: null,
        restartNotice: null,
        ...clearHint(),
      }))
    })

    const unregisterError = network.onError((error) => {
      setState((prev) => ({ ...prev, connectionError: error.message }))
    })

    const unregisterMove = network.onMessage<MovePayload>('move', ({ payload }) => {
      if (gomokuRef.current.status !== 'playing') return
      if (gomokuRef.current.board[payload.row]?.[payload.col] !== null) return
      gomokuRef.current.makeMove(payload.row, payload.col, payload.player)
      moveCountRef.current += 1
      setState((prev) => ({
        ...prev,
        moveNumber: moveCountRef.current,
        currentPlayer: payload.player === 'black' ? 'white' : 'black',
        gameEndReason: null,
        ...clearHint(),
      }))
    })

    const unregisterGameStart = network.onMessage<GameStartPayloadData>('game_start', ({ payload }) => {
      const myColor = getMyColorByRole() || (payload.yourRole === 'host' ? 'black' : 'white')
      if (!payload.gameReady) {
        setState((prev) => ({ ...prev, myColor }))
        return
      }
      if (moveCountRef.current > 0 && !payload.forceReset) {
        setState((prev) => ({
          ...prev,
          isGameStarted: true,
          myColor,
          opponentName: payload.opponentName || prev.opponentName,
          gameEndReason: null,
          connectionError: null,
        }))
        return
      }
      network.resetReconnectState()
      forceStartFromRoomState()
      setState((prev) => ({ ...prev, myColor, opponentName: payload.opponentName || prev.opponentName }))
    })

    const unregisterPlayerJoined = network.onMessage<PlayerJoinedPayload>('player_joined', ({ payload }) => {
      if (roleRef.current !== 'host') return
      const joinedName = payload.playerInfo?.name || null
      const myName = network.getPlayerName()
      setState((prev) => ({ ...prev, opponentName: joinedName && joinedName !== myName ? joinedName : prev.opponentName, isInRoom: true }))
    })

    const unregisterPlayerLeft = network.onMessage<PlayerLeftPayload>('player_left', ({ payload }) => {
      setState((prev) => ({
        ...prev,
        connectionError: `${payload.playerName} 已离开房间，请重新创建房间或加入其他房间。`,
        isInRoom: true,
        isGameStarted: false,
        gameEndReason: null,
        opponentName: null,
        waitingRestartAccept: false,
        pendingRestartRequestFrom: null,
        waitingUndoAccept: false,
        pendingUndoRequestFrom: null,
        ...clearHint(),
      }))
    })

    const unregisterGameEnd = network.onMessage<GameEndPayload>('game_end', ({ payload }) => {
      gomokuRef.current.finishGame(payload.winner, payload.reason)
      const myColor = getMyColorByRole() || stateRef.current.myColor
      if (payload.reason === 'resign' && myColor) {
        showRestartNotice(payload.winner === myColor ? '对手已认输，你赢得了本局。' : '你已认输，本局结束。')
      }
      setState((prev) => ({ ...prev, isGameStarted: false, gameEndReason: payload.reason }))
    })

    const unregisterRestartRequest = network.onMessage<RestartRequestPayload>('restart_request', ({ payload }) => {
      const myId = network.getPlayerId()
      const name = payload.requesterName || 'opponent'
      const isRequesterMe = payload.requesterId ? payload.requesterId === myId : name === network.getPlayerName()
      setState((prev) => ({
        ...prev,
        pendingRestartRequestFrom: isRequesterMe ? null : name,
        waitingRestartAccept: isRequesterMe,
        pendingUndoRequestFrom: null,
        waitingUndoAccept: false,
        restartNotice: null,
      }))
    })

    const unregisterRestartAccept = network.onMessage('restart_accept', () => {
      forceStartFromRoomState()
    })

    const unregisterRestartDecline = network.onMessage<RestartDeclinePayload>('restart_decline', () => {
      const opponentName = stateRef.current.opponentName || '对手'
      setState((prev) => ({ ...prev, waitingRestartAccept: false, pendingRestartRequestFrom: null, waitingUndoAccept: false, pendingUndoRequestFrom: null }))
      showRestartNotice(`${opponentName} 暂时不想继续，本局先到这里。你可以稍后再次邀请。`)
    })

    const unregisterUndoRequest = network.onMessage<UndoRequestPayload>('undo_request', ({ payload }) => {
      const myId = network.getPlayerId()
      const name = payload.requesterName || 'opponent'
      const isRequesterMe = payload.requesterId ? payload.requesterId === myId : name === network.getPlayerName()
      setState((prev) => ({ ...prev, pendingUndoRequestFrom: isRequesterMe ? null : name, waitingUndoAccept: isRequesterMe, restartNotice: null }))
    })

    const unregisterUndoAccept = network.onMessage('undo_accept', () => {
      setState((prev) => ({ ...prev, waitingUndoAccept: false, pendingUndoRequestFrom: null, ...clearHint() }))
      showRestartNotice('悔棋已通过，已回退到请求方上一步之前。')
    })

    const unregisterUndoDecline = network.onMessage<UndoDeclinePayload>('undo_decline', () => {
      const opponentName = stateRef.current.opponentName || '对手'
      setState((prev) => ({ ...prev, waitingUndoAccept: false, pendingUndoRequestFrom: null }))
      showRestartNotice(`${opponentName} 暂未同意悔棋。`)
    })

    const unregisterChat = network.onMessage<ChatPayload>('chat', ({ payload }) => {
      setState((prev) => ({ ...prev, chatMessages: [...prev.chatMessages, payload] }))
    })

    const unregisterRoomSnapshot = network.onMessage<RoomSnapshotPayload>('room_snapshot', ({ payload }) => {
      const myColor = getMyColorByRole()
      const myName = network.getPlayerName()
      const myId = network.getPlayerId()
      const rrId = payload.pendingRestartRequesterId || null
      const rrName = payload.pendingRestartRequesterName || null
      const urId = payload.pendingUndoRequesterId || null
      const urName = payload.pendingUndoRequesterName || null
      const isRequesterMe = rrId ? rrId === myId : rrName !== null && rrName === myName
      const isUndoRequesterMe = urId ? urId === myId : urName !== null && urName === myName
      const opponentName =
        roleRef.current === 'host'
          ? payload.guestName || null
          : roleRef.current === 'guest'
            ? payload.hostName || null
            : stateRef.current.opponentName

      setState((prev) => {
        const resolvedOpponentName = opponentName && opponentName !== myName ? opponentName : null
        const opponentLeftNow = Boolean(prev.opponentName) && !resolvedOpponentName

        return {
          ...prev,
          isInRoom: true,
          isGameStarted: opponentLeftNow ? false : payload.gameStarted,
          roomCode: payload.roomCode || prev.roomCode,
          myColor: myColor || prev.myColor,
          opponentName: resolvedOpponentName,
          moveNumber: payload.moveCount,
          currentPlayer: payload.currentPlayer,
          gameStartTime: opponentLeftNow ? null : payload.gameStarted ? prev.gameStartTime || Date.now() : null,
          connectionError: opponentLeftNow
            ? `${prev.opponentName} 已离开房间，请重新创建房间或加入其他房间。`
            : resolvedOpponentName
              ? null
              : prev.connectionError,
          waitingRestartAccept: opponentLeftNow ? false : rrName ? isRequesterMe : false,
          pendingRestartRequestFrom: opponentLeftNow ? null : rrName && !isRequesterMe ? rrName : null,
          waitingUndoAccept: opponentLeftNow ? false : urName ? isUndoRequesterMe : false,
          pendingUndoRequestFrom: opponentLeftNow ? null : urName && !isUndoRequesterMe ? urName : null,
        }
      })
    })

    const unregisterGameSync = network.onMessage<{ moves: SyncedMove[] }>('game_sync', ({ payload }) => {
      syncMovesFromServer(payload.moves || [])
    })

    return () => {
      unregisterConnect()
      unregisterDisconnect()
      unregisterError()
      unregisterMove()
      unregisterGameStart()
      unregisterPlayerJoined()
      unregisterPlayerLeft()
      unregisterGameEnd()
      unregisterRestartRequest()
      unregisterRestartAccept()
      unregisterRestartDecline()
      unregisterUndoRequest()
      unregisterUndoAccept()
      unregisterUndoDecline()
      unregisterChat()
      unregisterRoomSnapshot()
      unregisterGameSync()
    }
  }, [clearHint, forceStartFromRoomState, getMyColorByRole, network, showRestartNotice, syncMovesFromServer])

  useEffect(() => {
    const roomId = network.getRoomId()
    if (!state.isInRoom || !roomId) return

    let cancelled = false
    let timer: NodeJS.Timeout | null = null

    const applyGameEndFromState = (gameEnd: GameEndPayload) => {
      const withTimestamp = gameEnd as GameEndPayload & { timestamp?: number }
      const endTimestamp = typeof withTimestamp.timestamp === 'number' ? withTimestamp.timestamp : 0
      const signature = `${gameEnd.winner}:${gameEnd.reason}:${gameEnd.moveCount}:${gameEnd.duration}:${endTimestamp}`
      if (lastGameEndSignatureRef.current === signature) return
      lastGameEndSignatureRef.current = signature
      gomokuRef.current.finishGame(gameEnd.winner, gameEnd.reason)
      const myColor = getMyColorByRole() || stateRef.current.myColor
      if (gameEnd.reason === 'resign' && myColor) {
        showRestartNotice(gameEnd.winner === myColor ? '对手已认输，你赢得了本局。' : '你已认输，本局结束。')
      }
      setState((prev) => ({ ...prev, isGameStarted: false, gameEndReason: gameEnd.reason }))
    }

    const poll = async () => {
      try {
        const liveRoomId = network.getRoomId()
        if (!liveRoomId) {
          cancelled = true
          if (timer) clearInterval(timer)
          return
        }
        const base = getConfiguredMultiplayerServerUrl()
        const t0 = Date.now()
        const res = await fetch(
          `${base}/api/network/room-state?roomId=${encodeURIComponent(liveRoomId)}&t=${Date.now()}`,
          { cache: 'no-store' }
        )
        if (cancelled) return

        if (!res.ok) {
          if (res.status === 404) {
            // Room has been removed on server side. Clear local network room context
            // to stop follow-up polling against a stale roomId.
            cancelled = true
            if (timer) clearInterval(timer)
            manualDisconnectRef.current = true
            network.disconnect()
            setState((prev) => ({
              ...prev,
              isConnected: false,
              isInRoom: true,
              isGameStarted: false,
              gameEndReason: null,
              roomCode: null,
              opponentName: null,
              moveNumber: 0,
              waitingRestartAccept: false,
              pendingRestartRequestFrom: null,
              waitingUndoAccept: false,
              pendingUndoRequestFrom: null,
              connectionError: prev.opponentName
                ? '对手已离开房间，请重新创建房间或加入其他房间。'
                : '房间已不存在，请重新创建或加入。',
            }))
          }
          return
        }

        const data = (await res.json()) as RoomStateResponse
        if (!data.success || cancelled) return
        network.recordLatency(Date.now() - t0)

        const myId = network.getPlayerId()
        const myName = network.getPlayerName()
        const rrId = data.pendingRestartRequesterId || null
        const rrName = data.pendingRestartRequesterName || null
        const rrDecline = data.lastRestartDecline || null
        const urId = data.pendingUndoRequesterId || null
        const urName = data.pendingUndoRequesterName || null
        const urDecline = data.lastUndoDecline || null
        const openingCancel = data.lastOpeningCancel || null
        const isRequesterMe = rrId ? rrId === myId : rrName !== null && rrName === myName
        const isUndoRequesterMe = urId ? urId === myId : urName !== null && urName === myName
        const opponentName =
          roleRef.current === 'host'
            ? data.guestName || null
            : roleRef.current === 'guest'
              ? data.hostName || null
              : stateRef.current.opponentName

        const declineTargetsMe =
          Boolean(rrDecline?.timestamp) &&
          (
            stateRef.current.waitingRestartAccept ||
            (rrDecline?.requesterId
              ? rrDecline.requesterId === myId
              : rrDecline?.requesterName
                ? rrDecline.requesterName === myName
                : rrDecline?.declinerId !== myId)
          )
        const isNewDecline = Boolean(rrDecline?.timestamp) && declineTargetsMe && rrDecline!.timestamp !== lastRestartDeclineTimestampRef.current
        if (isNewDecline && rrDecline?.timestamp) {
          lastRestartDeclineTimestampRef.current = rrDecline.timestamp
          showRestartNotice(`${rrDecline.declinerName || opponentName || '对手'} 暂时不想继续，本局先到这里。`)
        }

        const undoDeclineTargetsMe = Boolean(urDecline?.timestamp) && (urDecline?.requesterId ? urDecline.requesterId === myId : urDecline?.declinerId !== myId)
        const isNewUndoDecline = Boolean(urDecline?.timestamp) && undoDeclineTargetsMe && urDecline!.timestamp !== lastUndoDeclineTimestampRef.current
        if (isNewUndoDecline && urDecline?.timestamp) {
          lastUndoDeclineTimestampRef.current = urDecline.timestamp
          showRestartNotice(`${urDecline.declinerName || opponentName || '对手'} 暂未同意悔棋。`)
        }

        const hasNewOpeningCancel = Boolean(openingCancel?.timestamp) && openingCancel!.timestamp !== lastOpeningCancelTimestampRef.current
        if (hasNewOpeningCancel && openingCancel?.timestamp) {
          lastOpeningCancelTimestampRef.current = openingCancel.timestamp
          gomokuRef.current.resetGame()
          moveCountRef.current = 0
          lastGameEndSignatureRef.current = null
          const actorName = openingCancel.requesterId === myId ? '你' : openingCancel.requesterName || opponentName || '对手'
          showRestartNotice(`${actorName}取消了本局，棋盘已重置，可直接重新开始。`)
        }

        setState((prev) => {
          const resolvedOpponentName = opponentName && opponentName !== myName ? opponentName : null
          const opponentLeftNow = Boolean(prev.opponentName) && !resolvedOpponentName

          return {
            ...prev,
            isConnected: true,
            isInRoom: true,
            roomCode: data.roomCode || prev.roomCode,
            isGameStarted: opponentLeftNow ? false : Boolean(data.gameStarted || prev.isGameStarted),
            myColor: roleRef.current === 'host' ? 'black' : roleRef.current === 'guest' ? 'white' : prev.myColor,
            opponentName: resolvedOpponentName,
            moveNumber: Number(data.moveCount || data.moves?.length || moveCountRef.current),
            currentPlayer: data.currentPlayer || prev.currentPlayer,
            gameEndReason: opponentLeftNow || hasNewOpeningCancel ? null : prev.gameEndReason,
            connectionError: opponentLeftNow
              ? `${prev.opponentName} 已离开房间，请重新创建房间或加入其他房间。`
              : resolvedOpponentName
                ? null
                : prev.connectionError,
            waitingRestartAccept: opponentLeftNow ? false : declineTargetsMe ? false : rrName ? isRequesterMe : false,
            pendingRestartRequestFrom: opponentLeftNow ? null : rrName && !isRequesterMe ? rrName : null,
            waitingUndoAccept: opponentLeftNow ? false : undoDeclineTargetsMe ? false : urName ? isUndoRequesterMe : false,
            pendingUndoRequestFrom: opponentLeftNow ? null : urName && !isUndoRequesterMe ? urName : null,
            chatMessages: Array.isArray(data.chatMessages) ? data.chatMessages : prev.chatMessages,
            restartNotice: opponentLeftNow
              ? prev.restartNotice
              : rrName && !isRequesterMe
                ? null
                : prev.restartNotice,
          }
        })

        if (data.lastGameEnd) applyGameEndFromState(data.lastGameEnd)
        else lastGameEndSignatureRef.current = null

        const shouldAutoResumeFromPoll =
          data.gameStarted &&
          !stateRef.current.isGameStarted &&
          stateRef.current.gameEndReason == null &&
          gomokuRef.current.status === 'playing'

        if (shouldAutoResumeFromPoll) {
          forceStartFromRoomState({ hostName: data.hostName, guestName: data.guestName })
        }
        syncMovesFromServer(data.moves || [])
      } catch {
        if (!cancelled) {
          setState((prev) => ({ ...prev, connectionError: prev.connectionError || '无法连接联机服务。' }))
      }
    }
    }

    const pollIntervalMs =
      state.waitingRestartAccept ||
      Boolean(state.pendingRestartRequestFrom) ||
      state.waitingUndoAccept ||
      Boolean(state.pendingUndoRequestFrom)
        ? ROOM_STATE_POLL_MS_INTERACTIVE
        : state.isGameStarted
          ? ROOM_STATE_POLL_MS_PLAYING
          : ROOM_STATE_POLL_MS_IDLE

    timer = setInterval(poll, pollIntervalMs)
    poll()
    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [
    forceStartFromRoomState,
    getMyColorByRole,
    network,
    showRestartNotice,
    state.isInRoom,
    state.isGameStarted,
    state.pendingRestartRequestFrom,
    state.pendingUndoRequestFrom,
    state.waitingRestartAccept,
    state.waitingUndoAccept,
    syncMovesFromServer,
  ])

  const createRoom = useCallback(async (playerName: string): Promise<RoomInfo> => {
    manualDisconnectRef.current = false
    roleRef.current = 'host'
    lastGameEndSignatureRef.current = null
    lastRestartDeclineTimestampRef.current = null
    lastUndoDeclineTimestampRef.current = null
    lastOpeningCancelTimestampRef.current = null
    try {
      const room = await network.createRoom(playerName)
      setState((prev) => ({
        ...prev,
        isConnected: true,
        isInRoom: true,
        roomCode: room.code,
        myColor: 'black',
        currentPlayer: 'black',
        connectionError: null,
        gameEndReason: null,
      }))
      return room
    } catch (e) {
      roleRef.current = null
      const msg = e instanceof Error ? e.message : 'create room failed'
      setState((prev) => ({ ...prev, connectionError: msg }))
      throw e
    }
  }, [network])

  const joinRoom = useCallback(async (roomCode: string, playerName: string): Promise<RoomInfo> => {
    manualDisconnectRef.current = false
    roleRef.current = 'guest'
    lastGameEndSignatureRef.current = null
    lastRestartDeclineTimestampRef.current = null
    lastUndoDeclineTimestampRef.current = null
    lastOpeningCancelTimestampRef.current = null
    try {
      const room = await network.joinRoom(roomCode, playerName)
      const roomWithGameState = room as RoomInfo & { gameStarted?: boolean }
      setState((prev) => ({
        ...prev,
        isConnected: true,
        isInRoom: true,
        roomCode: room.code.toUpperCase(),
        myColor: 'white',
        currentPlayer: 'black',
        opponentName: room.hostName || prev.opponentName,
        gameStartTime: roomWithGameState.gameStarted ? Date.now() : prev.gameStartTime,
        connectionError: null,
        gameEndReason: null,
      }))
      if (roomWithGameState.gameStarted) forceStartFromRoomState({ hostName: room.hostName, guestName: room.guestName })
      return room
    } catch (e) {
      roleRef.current = null
      const msg = e instanceof Error ? e.message : 'join room failed'
      setState((prev) => ({ ...prev, connectionError: msg }))
      throw e
    }
  }, [forceStartFromRoomState, network])

  const makeNetworkMove = useCallback((row: number, col: number) => {
    const canMove =
      stateRef.current.isGameStarted &&
      stateRef.current.myColor !== null &&
      gomokuRef.current.status === 'playing' &&
      stateRef.current.currentPlayer === stateRef.current.myColor
    if (!canMove) return
    if (gomokuRef.current.board[row][col] !== null) return
    const player = stateRef.current.currentPlayer
    gomokuRef.current.makeMove(row, col, player)
    moveCountRef.current += 1
    lastLocalMoveSentAtRef.current = Date.now()
    network.sendMove(row, col, player, moveCountRef.current)
    setState((prev) => ({
      ...prev,
      moveNumber: moveCountRef.current,
      currentPlayer: player === 'black' ? 'white' : 'black',
      gameEndReason: null,
      ...clearHint(),
    }))
  }, [clearHint, network])

  useEffect(() => {
    if (!state.isGameStarted) return
    if (state.gameEndReason) return
    if (gomoku.status === 'playing') return

    const inferredReason: 'win' | 'draw' = gomoku.status === 'draw' ? 'draw' : 'win'
    setState((prev) => ({
      ...prev,
      isGameStarted: false,
      gameEndReason: inferredReason,
    }))
  }, [gomoku.status, state.gameEndReason, state.isGameStarted])

  const sendChat = useCallback((message: string) => {
    const text = message.trim()
    if (!text) return
    setState((prev) => ({ ...prev, chatMessages: [...prev.chatMessages, { message: text, senderName: network.getPlayerName() || '我' }] }))
    network.sendChat(text)
  }, [network])

  const sendReady = useCallback(() => network.sendReady(true), [network])

  const requestRestart = useCallback(() => {
    network.sendRestartRequest()
    setState((prev) => ({ ...prev, waitingRestartAccept: true, pendingUndoRequestFrom: null, waitingUndoAccept: false, restartNotice: null }))
  }, [network])

  const acceptRestart = useCallback(() => {
    network.sendRestartAccept()
    forceStartFromRoomState()
  }, [forceStartFromRoomState, network])

  const dismissRestartRequest = useCallback(() => {
    network.sendRestartDecline()
    setState((prev) => ({ ...prev, pendingRestartRequestFrom: null, waitingRestartAccept: false, restartNotice: null }))
  }, [network])

  const requestUndo = useCallback(() => {
    if (!stateRef.current.isGameStarted) return
    if (moveCountRef.current < 2) {
      showRestartNotice('当前步数不足，无法悔棋。')
      return
    }
    network.sendUndoRequest()
    setState((prev) => ({ ...prev, waitingUndoAccept: true, pendingRestartRequestFrom: null, waitingRestartAccept: false, restartNotice: null }))
  }, [network, showRestartNotice])

  const acceptUndo = useCallback(() => {
    network.sendUndoAccept()
    setState((prev) => ({ ...prev, pendingUndoRequestFrom: null, waitingUndoAccept: false, ...clearHint() }))
    showRestartNotice('已同意悔棋，正在回退到请求方上一步之前。')
  }, [clearHint, network, showRestartNotice])

  const dismissUndoRequest = useCallback(() => {
    network.sendUndoDecline()
    setState((prev) => ({ ...prev, pendingUndoRequestFrom: null, waitingUndoAccept: false }))
    showRestartNotice('已拒绝本次悔棋请求。')
  }, [network, showRestartNotice])

  const requestHint = useCallback(() => {
    if (!stateRef.current.isGameStarted || !stateRef.current.myColor) return
    if (stateRef.current.currentPlayer !== stateRef.current.myColor) {
      showRestartNotice('当前不是你的回合，暂不提供提示。')
      return
    }

    const hints = rankHintMoves(gomokuRef.current.board, stateRef.current.myColor)
    if (!hints.primary) {
      showRestartNotice('当前局面暂无有效提示。')
      return
    }

    setState((prev) => ({
      ...prev,
      hintMove: { row: hints.primary!.row, col: hints.primary!.col },
      hintTone: hints.primary!.tone,
      hintReason: hints.primary!.reason,
      hintAltMove: hints.secondary ? { row: hints.secondary.row, col: hints.secondary.col } : null,
      hintAltTone: hints.secondary?.tone || null,
      hintAltReason: hints.secondary?.reason || null,
    }))

    const title = hints.primary.tone === 'attack' ? '进攻提示' : hints.primary.tone === 'defense' ? '防守提示' : '稳健提示'
    showRestartNotice(`${title}：${hints.primary.row + 1} 行 ${hints.primary.col + 1} 列${hints.secondary ? `；备选 ${hints.secondary.row + 1} 行 ${hints.secondary.col + 1} 列` : ''}`)
  }, [showRestartNotice])

  const resign = useCallback(() => {
    if (!stateRef.current.isGameStarted || !stateRef.current.myColor) return

    if (moveCountRef.current === 0) {
      gomokuRef.current.resetGame()
      moveCountRef.current = 0
      lastGameEndSignatureRef.current = null
      network.cancelOpening()
      showRestartNotice('本局尚未落子，已取消当前对局。')
      setState((prev) => ({
        ...prev,
        isGameStarted: true,
        gameEndReason: null,
        currentPlayer: 'black',
        moveNumber: 0,
        waitingRestartAccept: false,
        pendingRestartRequestFrom: null,
        waitingUndoAccept: false,
        pendingUndoRequestFrom: null,
        ...clearHint(),
      }))
      return
    }

    const loser = stateRef.current.myColor
    const winner = loser === 'black' ? 'white' : 'black'
    gomokuRef.current.finishGame(winner, 'resign')
    showRestartNotice('你已认输，本局结束。')
    network.sendGameEnd(winner, 'resign', moveCountRef.current, stateRef.current.gameStartTime ? Date.now() - stateRef.current.gameStartTime : 0)
    setState((prev) => ({ ...prev, isGameStarted: false, gameEndReason: 'resign', ...clearHint() }))
  }, [clearHint, network, showRestartNotice])

  const timeoutLose = useCallback(() => {
    if (!stateRef.current.isGameStarted || !stateRef.current.myColor) return
    if (stateRef.current.currentPlayer !== stateRef.current.myColor) return
    if (moveCountRef.current === 0) return
    const loser = stateRef.current.myColor
    const winner = loser === 'black' ? 'white' : 'black'
    gomokuRef.current.finishGame(winner, 'timeout')
    showRestartNotice('你已超时，本局结束。')
    network.sendGameEnd(winner, 'timeout', moveCountRef.current, stateRef.current.gameStartTime ? Date.now() - stateRef.current.gameStartTime : 0)
    setState((prev) => ({ ...prev, isGameStarted: false, gameEndReason: 'timeout', ...clearHint() }))
  }, [clearHint, network, showRestartNotice])

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true
    clearRestartNotice()
    lastGameEndSignatureRef.current = null
    lastRestartDeclineTimestampRef.current = null
    lastUndoDeclineTimestampRef.current = null
    network.disconnect()
    roleRef.current = null
    moveCountRef.current = 0
    lastLocalMoveSentAtRef.current = 0
    setState(initialState)
    gomokuRef.current.resetGame()
  }, [clearRestartNotice, network])

  const computedIsMyTurn = state.isGameStarted && state.myColor !== null && state.currentPlayer === state.myColor

  return {
    ...gomoku,
    ...state,
    isMyTurn: computedIsMyTurn,
    network,
    createRoom,
    joinRoom,
    makeMove: makeNetworkMove,
    sendChat,
    sendReady,
    requestRestart,
    acceptRestart,
    dismissRestartRequest,
    requestUndo,
    acceptUndo,
    dismissUndoRequest,
    requestHint,
    resign,
    timeoutLose,
    disconnect,
    forceStartFromRoomState,
  }
}
