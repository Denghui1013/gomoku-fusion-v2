import { v4 as uuidv4 } from 'uuid'
import type {
  ChatPayload,
  GameEndPayload,
  MovePayload,
  NetworkMessage,
  NetworkStats,
  RoomInfo,
} from './types'
import { getConfiguredMultiplayerServerUrl } from '@/lib/multiplayerConfig'

type MessageHandler<T = unknown> = (data: {
  payload: T
  type: string
  timestamp: number
  senderId: string
  senderRole?: string
}) => void

type ConnectionHandler = () => void
type DisconnectHandler = (reason: string) => void
type ErrorHandler = (error: Error) => void

class NetworkManager {
  private role: 'host' | 'guest' | null = null
  private playerId: string
  private playerName = ''
  private roomId: string | null = null
  private roomCode = ''

  private ws: WebSocket | null = null
  private wsUrl = ''

  private messageHandlers: Map<string, MessageHandler[]> = new Map()
  private onConnectCallback: ConnectionHandler | null = null
  private onDisconnectCallback: DisconnectHandler | null = null
  private onErrorCallback: ErrorHandler | null = null

  private stats: NetworkStats = {
    latency: 0,
    messagesSent: 0,
    messagesReceived: 0,
    connectionTime: 0,
    lastMessageTime: 0,
  }

  private baseUrl = ''
  private pingInterval: NodeJS.Timeout | null = null
  private lastPingTime = 0
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 5
  private readonly reconnectDelay = 2000
  private readonly requestTimeoutMs = 8000
  private readonly requestRetryCount = 2
  private shouldReconnect = true
  private readonly nonRetryableCloseCodes = new Set([1000, 4001, 4004, 4008])

  constructor() {
    this.playerId = uuidv4()
  }

  getPlayerId(): string {
    return this.playerId
  }

  getRole(): 'host' | 'guest' | null {
    return this.role
  }

  getRoomCode(): string {
    return this.roomCode
  }

  getRoomId(): string | null {
    return this.roomId
  }

  getPlayerName(): string {
    return this.playerName
  }

  isConnected(): boolean {
    return this.roomId !== null
  }

  getStats(): NetworkStats {
    return { ...this.stats }
  }

  recordLatency(latency: number): void {
    this.stats.latency = latency
    this.stats.lastMessageTime = Date.now()
  }

  private connectWebSocket(roomId: string): void {
    const protocol = this.baseUrl.startsWith('https://') ? 'wss:' : 'ws:'
    const host = this.baseUrl.replace(/^https?:\/\//, '')
    this.wsUrl = `${protocol}//${host}/api/network/ws?roomId=${roomId}&playerId=${this.playerId}&role=${this.role}&playerName=${encodeURIComponent(this.playerName)}`

    try {
      this.ws = new WebSocket(this.wsUrl)

      this.ws.onopen = () => {
        this.stats.connectionTime = Date.now()
        this.startPing()
        this.onConnectCallback?.()
      }

      this.ws.onmessage = (event) => {
        try {
          const message: NetworkMessage = JSON.parse(event.data)
          this.handleWsMessage(message)
          this.stats.messagesReceived += 1
          this.stats.lastMessageTime = Date.now()
        } catch (error) {
          console.error('[Network] failed to parse message:', error)
        }
      }

      this.ws.onclose = (event) => {
        this.stopPing()
        const closeReason = event.reason || `connection closed (code ${event.code})`
        const canRetry =
          this.shouldReconnect &&
          !this.nonRetryableCloseCodes.has(event.code) &&
          this.reconnectAttempts < this.maxReconnectAttempts

        if (canRetry) {
          this.reconnectAttempts += 1
          const delay = this.reconnectDelay * this.reconnectAttempts
          setTimeout(() => {
            if (this.roomId && this.role) {
              this.connectWebSocket(this.roomId)
            }
          }, delay)
          return
        }

        this.cleanup()
        this.onDisconnectCallback?.(closeReason)
      }

      this.ws.onerror = (error) => {
        console.error('[Network] websocket error:', error)
      }
    } catch (error) {
      console.error('[Network] websocket creation failed:', error)
      this.onErrorCallback?.(new Error('failed to create websocket'))
    }
  }

  private handleWsMessage(message: NetworkMessage): void {
    const { type, payload } = message

    switch (type) {
      case 'ping':
        this.ws?.send(
          JSON.stringify({
            type: 'pong',
            payload: {},
            timestamp: Date.now(),
            senderId: 'system',
          })
        )
        break

      case 'pong':
        this.stats.latency = Date.now() - this.lastPingTime
        break

      case 'player_joined':
        this.emit('player_joined', payload)
        break

      case 'game_start':
        this.emit('game_start', payload)
        break

      case 'move':
        this.emit('move', payload as MovePayload)
        break

      case 'game_end':
        this.emit('game_end', payload as GameEndPayload)
        break

      case 'chat':
        this.emit('chat', payload as ChatPayload)
        break

      case 'restart_decline':
        this.emit('restart_decline', payload)
        break

      case 'undo_request':
        this.emit('undo_request', payload)
        break

      case 'undo_accept':
        this.emit('undo_accept', payload)
        break

      case 'undo_decline':
        this.emit('undo_decline', payload)
        break

      case 'player_left':
        this.emit('player_left', payload)
        break

      case 'room_snapshot':
        this.emit('room_snapshot', payload)
        break

      default:
        this.emit(type, payload)
    }
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now()
        this.ws.send(
          JSON.stringify({
            type: 'ping',
            payload: {},
            timestamp: Date.now(),
            senderId: this.playerId,
          })
        )
      }
    }, 5000)
  }

  private stopPing(): void {
    if (!this.pingInterval) return
    clearInterval(this.pingInterval)
    this.pingInterval = null
  }

  private emit<T>(type: string, payload: T): void {
    const handlers = this.messageHandlers.get(type) as Array<MessageHandler<T>> | undefined
    if (!handlers) return

    const message = {
      type,
      payload,
      timestamp: Date.now(),
      senderId: this.playerId,
      senderRole: this.role || undefined,
    }

    handlers.forEach((handler) => handler(message))
  }

  private async requestJson<T>(path: string, init: RequestInit, retries = this.requestRetryCount): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await this.requestJsonOnce<T>(path, init)
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error))
        lastError = normalizedError

        const retryable =
          normalizedError.message.startsWith('联机服务器请求超时') ||
          normalizedError.message.startsWith('无法连接联机服务器')

        if (!retryable || attempt >= retries) {
          throw normalizedError
        }

        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)))
      }
    }

    throw lastError || new Error('联机服务器请求失败')
  }

  private async requestJsonOnce<T>(path: string, init: RequestInit): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs)
    const requestUrl = `${this.baseUrl}${path}`
    const startedAt = Date.now()

    const parseJsonText = (text: string): T => {
      try {
        return JSON.parse(text) as T
      } catch {
        throw new Error(`联机服务器返回了非 JSON 响应，请检查地址配置：${requestUrl}`)
      }
    }

    try {
      const response = await fetch(requestUrl, {
        ...init,
        mode: 'cors',
        signal: controller.signal,
      })

      if (!response.ok) {
        const canFallbackToCurrentOrigin =
          typeof window !== 'undefined' &&
          response.status === 404 &&
          path.startsWith('/api/network/undo-') &&
          this.baseUrl !== window.location.origin

        if (canFallbackToCurrentOrigin) {
          const fallbackResponse = await fetch(`${window.location.origin}${path}`, {
            ...init,
            mode: 'cors',
            signal: controller.signal,
          })

          if (fallbackResponse.ok) {
            const fallbackText = await fallbackResponse.text()
            const fallbackData = parseJsonText(fallbackText)
            this.stats.latency = Date.now() - startedAt
            this.stats.lastMessageTime = Date.now()
            this.stats.messagesReceived += 1
            return fallbackData
          }
        }

        let errorMessage = `request failed (${response.status})`
        try {
          const errorText = await response.text()
          const error = JSON.parse(errorText) as { error?: string }
          errorMessage = error.error || errorMessage
        } catch {
          // keep fallback message
        }
        throw new Error(errorMessage)
      }

      const responseText = await response.text()
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        throw new Error(`联机服务器返回了非 JSON 响应，请检查地址配置：${requestUrl}`)
      }
      const data = parseJsonText(responseText)
      this.stats.latency = Date.now() - startedAt
      this.stats.lastMessageTime = Date.now()
      this.stats.messagesReceived += 1
      return data
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`联机服务器请求超时：${requestUrl}`)
      }

      if (error instanceof TypeError) {
        throw new Error(`无法连接联机服务器：${requestUrl}`)
      }

      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async createRoom(playerName: string, serverUrl?: string): Promise<RoomInfo> {
    this.playerName = playerName
    this.role = 'host'
    this.shouldReconnect = true
    this.reconnectAttempts = 0
    this.baseUrl = serverUrl || getConfiguredMultiplayerServerUrl()

    const data = await this.requestJson<{ room: RoomInfo }>(
      '/api/network/create-room',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, playerId: this.playerId }),
      }
    )
    const room: RoomInfo = data.room

    this.roomId = room.id
    this.roomCode = room.code
    this.stats.connectionTime = Date.now()

    return room
  }

  async joinRoom(roomCode: string, playerName: string, serverUrl?: string): Promise<RoomInfo> {
    this.playerName = playerName
    this.role = 'guest'
    this.roomCode = roomCode.toUpperCase()
    this.shouldReconnect = true
    this.reconnectAttempts = 0
    this.baseUrl = serverUrl || getConfiguredMultiplayerServerUrl()

    const data = await this.requestJson<{ room: RoomInfo }>(
      '/api/network/join-room',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: this.roomCode,
          playerName,
          playerId: this.playerId,
        }),
      }
    )
    const room: RoomInfo = data.room

    this.roomId = room.id
    this.stats.connectionTime = Date.now()

    return room
  }

  sendMove(row: number, col: number, player: 'black' | 'white', moveNumber: number): void {
    const payload = {
      row,
      col,
      player,
      moveNumber,
    }

    if (!this.roomId) return
    this.stats.messagesSent += 1
    this.requestJson(
      '/api/network/move',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.roomId,
          ...payload,
        }),
      },
      1
    ).catch((error) => {
      console.error('[Network] http move fallback failed:', error)
    })
  }

  sendGameEnd(
    winner: 'black' | 'white' | 'draw',
    reason: 'win' | 'draw' | 'resign' | 'timeout',
    moveCount: number,
    duration: number
  ): void {
    if (!this.roomId) return
    this.stats.messagesSent += 1
    this.requestJson(
      '/api/network/game-end',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.roomId,
          winner,
          reason,
          moveCount,
          duration,
        }),
      },
      1
    ).catch((error) => {
      console.error('[Network] http game-end failed:', error)
    })
  }

  sendChat(message: string): void {
    if (!this.roomId) return
    this.stats.messagesSent += 1
    this.requestJson(
      '/api/network/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.roomId,
          message,
          senderName: this.playerName,
          senderId: this.playerId,
        }),
      },
      1
    ).catch((error) => {
      console.error('[Network] http chat failed:', error)
    })
  }

  sendReady(isReady: boolean): void {
    void isReady
  }

  sendRestartRequest(): void {
    if (!this.roomId) return
    this.stats.messagesSent += 1
    this.requestJson(
      '/api/network/restart-request',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.roomId,
          requesterName: this.playerName,
          requesterId: this.playerId,
        }),
      },
      1
    ).catch((error) => {
      console.error('[Network] http restart request failed:', error)
    })
  }

  sendRestartAccept(): void {
    if (!this.roomId) return
    this.stats.messagesSent += 1
    this.requestJson(
      '/api/network/restart-accept',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.roomId,
          acceptorName: this.playerName,
          acceptorId: this.playerId,
        }),
      },
      1
    ).catch((error) => {
      console.error('[Network] http restart accept failed:', error)
    })
  }

  sendRestartDecline(): void {
    if (!this.roomId) return
    this.stats.messagesSent += 1
    this.requestJson(
      '/api/network/restart-decline',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.roomId,
          declinerName: this.playerName,
          declinerId: this.playerId,
        }),
      },
      1
    ).catch((error) => {
      console.error('[Network] http restart decline failed:', error)
    })
  }

  cancelOpening(): void {
    if (!this.roomId) return
    this.stats.messagesSent += 1
    this.requestJson(
      '/api/network/cancel-opening',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.roomId,
          requesterName: this.playerName,
          requesterId: this.playerId,
        }),
      },
      1
    ).catch((error) => {
      console.error('[Network] http cancel opening failed:', error)
    })
  }

  sendUndoRequest(): void {
    if (!this.roomId) return
    this.stats.messagesSent += 1
    this.requestJson(
      '/api/network/undo-request',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.roomId,
          requesterName: this.playerName,
          requesterId: this.playerId,
        }),
      },
      1
    ).catch((error) => {
      console.error('[Network] http undo request failed:', error)
    })
  }

  sendUndoAccept(): void {
    if (!this.roomId) return
    this.stats.messagesSent += 1
    this.requestJson(
      '/api/network/undo-accept',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.roomId,
          acceptorName: this.playerName,
          acceptorId: this.playerId,
        }),
      },
      1
    ).catch((error) => {
      console.error('[Network] http undo accept failed:', error)
    })
  }

  sendUndoDecline(): void {
    if (!this.roomId) return
    this.stats.messagesSent += 1
    this.requestJson(
      '/api/network/undo-decline',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.roomId,
          declinerName: this.playerName,
          declinerId: this.playerId,
        }),
      },
      1
    ).catch((error) => {
      console.error('[Network] http undo decline failed:', error)
    })
  }

  onMessage<T = unknown>(type: string, handler: MessageHandler<T>): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, [])
    }

    this.messageHandlers.get(type)!.push(handler as MessageHandler)

    return () => {
      const handlers = this.messageHandlers.get(type)
      if (!handlers) return
      const index = handlers.indexOf(handler as MessageHandler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  onConnect(callback: ConnectionHandler): () => void {
    this.onConnectCallback = callback
    return () => {
      if (this.onConnectCallback === callback) {
        this.onConnectCallback = null
      }
    }
  }

  onDisconnect(callback: DisconnectHandler): () => void {
    this.onDisconnectCallback = callback
    return () => {
      if (this.onDisconnectCallback === callback) {
        this.onDisconnectCallback = null
      }
    }
  }

  onError(callback: ErrorHandler): () => void {
    this.onErrorCallback = callback
    return () => {
      if (this.onErrorCallback === callback) {
        this.onErrorCallback = null
      }
    }
  }

  private cleanup(clearHandlers = false): void {
    this.ws = null
    this.reconnectAttempts = 0
    this.shouldReconnect = false
    if (clearHandlers) {
      this.messageHandlers.clear()
    }
  }

  resetReconnectState(): void {
    this.reconnectAttempts = 0
    this.shouldReconnect = true
  }

  disconnect(code?: number, reason?: string): void {
    if (this.ws) {
      if (code) {
        this.ws.close(code, reason)
      } else {
        this.ws.close()
      }
      this.ws = null
    }

    if (this.roomId && this.role) {
      void this.requestJson(
        '/api/network/leave-room',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: this.roomId,
            role: this.role,
          }),
        },
        0
      ).catch((error) => {
        console.error('[Network] http leave-room failed:', error)
      })
    }

    this.cleanup()
    this.role = null
    this.roomId = null
    this.roomCode = ''
    this.playerName = ''
  }

  reset(): void {
    this.cleanup()
    this.role = null
    this.roomId = null
    this.roomCode = ''
    this.playerName = ''
    this.reconnectAttempts = 0
    this.shouldReconnect = false
  }

  destroy(): void {
    this.disconnect()
    this.messageHandlers.clear()
    this.onConnectCallback = null
    this.onDisconnectCallback = null
    this.onErrorCallback = null
  }
}

export default NetworkManager
export const networkManager = new NetworkManager()
