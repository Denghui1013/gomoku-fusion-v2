import { createServer } from 'http'
import next from 'next'
import { parse } from 'url'
import { Server as WebSocketServer, WebSocket } from 'ws'
import { roomManager } from './src/network/RoomManager'
import type { ConnectionRole, NetworkMessage, RoomSnapshotPayload } from './src/network/types'

(globalThis as unknown as { sharedRoomManager: typeof roomManager }).sharedRoomManager = roomManager

const dev = process.env.NODE_ENV !== 'production'
const currentPort = parseInt(process.env.PORT || '3000', 10)
const hostname = '0.0.0.0'

interface ConnectedClient {
  ws: WebSocket
  playerId: string
  playerName: string
  role: ConnectionRole
  roomId: string
  isAlive: boolean
  missedHeartbeats: number
  lastPingSentAt: number
}

const clients: Map<string, ConnectedClient> = new Map()
const pendingDisconnectCleanup: Map<string, NodeJS.Timeout> = new Map()
const DISCONNECT_GRACE_MS = 90_000

async function startServer() {
  try {
    const nextApp = next({ dev, hostname, port: currentPort })
    await nextApp.prepare()
    const handle = nextApp.getRequestHandler()

    const server = createServer((req, res) => {
      if (req.url?.startsWith('/api/network/')) {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        res.setHeader('Access-Control-Max-Age', '86400')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }
      }

      const parsedUrl = parse(req.url || '/', true)
      handle(req, res, parsedUrl)
    })

    const nextUpgradeHandler =
      typeof (nextApp as unknown as { getUpgradeHandler?: () => (req: unknown, socket: unknown, head: unknown) => void }).getUpgradeHandler === 'function'
        ? (nextApp as unknown as { getUpgradeHandler: () => (req: unknown, socket: unknown, head: unknown) => void }).getUpgradeHandler()
        : null

    const wss = new WebSocketServer({
      noServer: true,
      clientTracking: true,
      perMessageDeflate: {
        zlibDeflateOptions: { level: 3 },
        threshold: 1024,
      },
    })

    const heartbeatInterval = setInterval(() => {
      wss.clients.forEach((ws) => {
        const client = Array.from(clients.values()).find((c) => c.ws === ws)
        if (!client) return

        if (!client.isAlive) {
          client.missedHeartbeats += 1
          if (client.missedHeartbeats >= 3) {
            console.log(`[WebSocket] heartbeat timeout, terminate ${client.playerName}`)
            ws.terminate()
            return
          }
        } else {
          client.missedHeartbeats = 0
        }

        if (ws.readyState === WebSocket.OPEN) {
          client.isAlive = false
          client.lastPingSentAt = Date.now()
          ws.ping()
        } else {
          return
        }
      })
    }, 30_000)

    wss.on('close', () => clearInterval(heartbeatInterval))

    server.on('upgrade', (request, socket, head) => {
      const hostHeader = request.headers.host || `127.0.0.1:${currentPort}`
      const upgradeUrl = new URL(request.url || '/', `http://${hostHeader}`)
      const remoteAddress = request.socket.remoteAddress || 'unknown'
      const userAgent = request.headers['user-agent'] || 'unknown'

      if (upgradeUrl.pathname === '/api/network/ws') {
        console.log(
          `[WebSocket] upgrade request from ${remoteAddress} -> ${upgradeUrl.pathname}${upgradeUrl.search} ua=${userAgent}`
        )
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request)
        })
        return
      }

      if (nextUpgradeHandler) {
        nextUpgradeHandler(request, socket, head)
        return
      }

      socket.destroy()
    })

    wss.on('connection', (ws, req) => {
      const hostHeader = req.headers.host || `127.0.0.1:${currentPort}`
      const url = new URL(req.url || '/', `http://${hostHeader}`)
      const roomId = url.searchParams.get('roomId')
      const playerId = url.searchParams.get('playerId')
      const role = url.searchParams.get('role') as ConnectionRole | null
      const playerName = url.searchParams.get('playerName') || 'anonymous'

      if (!roomId || !playerId || !role) {
        ws.close(4001, 'missing required params')
        return
      }

      console.log(
        `[WebSocket] connected player=${playerName} role=${role} room=${roomId} ip=${req.socket.remoteAddress || 'unknown'}`
      )

      const pendingCleanup = pendingDisconnectCleanup.get(playerId)
      if (pendingCleanup) {
        clearTimeout(pendingCleanup)
        pendingDisconnectCleanup.delete(playerId)
      }

      const room = roomManager.getRoom(roomId)
      if (!room) {
        ws.close(4004, 'room not found')
        return
      }

      const client: ConnectedClient = {
        ws,
        playerId,
        playerName,
        role,
        roomId,
        isAlive: true,
        missedHeartbeats: 0,
        lastPingSentAt: 0,
      }
      clients.set(playerId, client)

      let disconnected = false
      const safeDisconnect = () => {
        if (disconnected) return
        disconnected = true
        handleDisconnect(client)
      }

      if (role === 'host') {
        roomManager.setHostSocketId(roomId, playerId)
      } else {
        roomManager.setGuestSocketId(roomId, playerId)
        const hostTargetId = room.hostSocketId || room.hostId
        if (hostTargetId) {
          broadcastToPlayer(hostTargetId, {
            type: 'player_joined',
            payload: {
              playerInfo: {
                id: playerId,
                name: playerName,
                role: 'guest',
                playerColor: 'white',
              },
            },
            timestamp: Date.now(),
            senderId: 'system',
          })
        }
      }

      sendRoomSnapshotToRoom(roomId)

      let sentReadyToCurrent = false

      // Race-condition fallback:
      // if both players are already in the room when this socket connects,
      // proactively push game_ready so no side gets stuck in waiting UI.
      if (room.status === 'playing' && room.guestName) {
        if (role === 'host') {
          ws.send(
            JSON.stringify({
              type: 'game_start',
              payload: {
                message: `${room.guestName} joined room`,
                yourRole: 'host',
                yourColor: 'black',
                opponentName: room.guestName,
                gameReady: true,
              },
              timestamp: Date.now(),
              senderId: 'system',
            })
          )
          sentReadyToCurrent = true
        } else {
          ws.send(
            JSON.stringify({
              type: 'game_start',
              payload: {
                message: `joined ${room.hostName}'s room`,
                yourRole: 'guest',
                yourColor: 'white',
                opponentName: room.hostName,
                gameReady: true,
              },
              timestamp: Date.now(),
              senderId: 'system',
            })
          )
          sentReadyToCurrent = true
        }
      }

      ws.on('message', (data) => {
        try {
          client.isAlive = true
          client.missedHeartbeats = 0
          const message = JSON.parse(data.toString()) as NetworkMessage
          handleMessage(client, message)
        } catch (error) {
          console.error('[WebSocket] invalid message:', error)
        }
      })

      ws.on('pong', () => {
        client.isAlive = true
        client.missedHeartbeats = 0
        if (client.lastPingSentAt > 0) {
          const rtt = Date.now() - client.lastPingSentAt
          console.log(
            `[WebSocket] pong player=${client.playerName} role=${client.role} room=${client.roomId} rtt=${rtt}ms`
          )
        }
      })

      ws.on('close', (code, reason) => {
        console.log(`[WebSocket] ${playerName} disconnected (${code}, ${reason.toString()})`)
        safeDisconnect()
      })

      ws.on('error', (error) => {
        console.error(`[WebSocket] ${playerName} error:`, error)
        safeDisconnect()
      })

      ws.send(
        JSON.stringify({
          type: 'game_start',
          payload: {
            message: `welcome ${playerName}`,
            yourRole: role,
            yourColor: role === 'host' ? 'black' : 'white',
            waitingForOpponent: role === 'host',
          },
          timestamp: Date.now(),
          senderId: 'system',
        })
      )

      if (role === 'guest') {
        const hostTargetId = room.hostSocketId || room.hostId
        const hostClient = hostTargetId ? clients.get(hostTargetId) : undefined

        if (hostClient && hostClient.ws.readyState === WebSocket.OPEN) {
          hostClient.ws.send(
            JSON.stringify({
              type: 'game_start',
              payload: {
                message: `${playerName} joined room`,
                yourRole: 'host',
                yourColor: 'black',
                opponentName: playerName,
                gameReady: true,
              },
              timestamp: Date.now(),
              senderId: 'system',
            })
          )
        }

        if (!sentReadyToCurrent) {
          ws.send(
            JSON.stringify({
              type: 'game_start',
              payload: {
                message: `joined ${room.hostName}'s room`,
                yourRole: 'guest',
                yourColor: 'white',
                opponentName: room.hostName,
                gameReady: true,
              },
              timestamp: Date.now(),
              senderId: 'system',
            })
          )
        }

        const existingMoves = roomManager.getMoves(roomId)
        if (existingMoves.length > 0) {
          ws.send(
            JSON.stringify({
              type: 'game_sync',
              payload: { moves: existingMoves },
              timestamp: Date.now(),
              senderId: 'system',
            })
          )
        }
      }

      console.log(
        `[WebSocket] ready player=${playerName} role=${role} room=${roomId} status=${room.status}`
      )

      sendRoomSnapshotToRoom(roomId)
    })

    server.listen(currentPort, hostname, () => {
      console.log(`> server ready at http://${hostname}:${currentPort}`)
      console.log(`> websocket ready at ws://${hostname}:${currentPort}/api/network/ws`)
    })
  } catch (error) {
    console.error('server start failed:', error)
    process.exit(1)
  }
}

function handleMessage(client: ConnectedClient, message: NetworkMessage): void {
  const { type, senderId, payload } = message

  switch (type) {
    case 'move': {
      const room = roomManager.getRoom(client.roomId)
      if (!room || !payload) return

      const moveData = payload as {
        row: number
        col: number
        player: 'black' | 'white'
        moveNumber: number
      }

      const inBounds =
        Number.isInteger(moveData.row) &&
        Number.isInteger(moveData.col) &&
        moveData.row >= 0 &&
        moveData.row < 15 &&
        moveData.col >= 0 &&
        moveData.col < 15
      if (!inBounds) {
        sendRoomSnapshotToRoom(client.roomId)
        return
      }

      const moves = roomManager.getMoves(client.roomId)
      const occupied = moves.some((m) => m.row === moveData.row && m.col === moveData.col)
      if (occupied) {
        sendRoomSnapshotToRoom(client.roomId)
        return
      }

      const expectedPlayer: 'black' | 'white' = moves.length % 2 === 0 ? 'black' : 'white'
      const expectedRole: ConnectionRole = expectedPlayer === 'black' ? 'host' : 'guest'
      if (moveData.player !== expectedPlayer || client.role !== expectedRole) {
        sendRoomSnapshotToRoom(client.roomId)
        return
      }

      const canonicalMove = {
        row: moveData.row,
        col: moveData.col,
        player: expectedPlayer,
        moveNumber: moves.length + 1,
      }

      roomManager.addMove(client.roomId, {
        ...canonicalMove,
        timestamp: Date.now(),
      })

      const serverMoveMessage: NetworkMessage = {
        type: 'move',
        payload: canonicalMove,
        timestamp: Date.now(),
        senderId,
        senderRole: client.role,
      }

      broadcastToRoom(client.roomId, serverMoveMessage, senderId)
      sendRoomSnapshotToRoom(client.roomId)
      return
    }

    case 'chat':
    case 'ready':
      broadcastToRoom(client.roomId, message, senderId)
      return

    case 'restart_request': {
      roomManager.setRestartRequester(client.roomId, client.playerId, client.playerName)
      // deliver to opponent and keep sender in waiting state on client side
      broadcastToRoom(client.roomId, message, senderId)
      sendRoomSnapshotToRoom(client.roomId)
      return
    }

    case 'restart_accept': {
      const room = roomManager.getRoom(client.roomId)
      if (!room) return

      roomManager.clearRestartRequester(client.roomId)
      roomManager.restartGame(client.roomId)

      const hostStart: NetworkMessage = {
        type: 'game_start',
        payload: {
          message: 'restart accepted',
          yourRole: 'host',
          yourColor: 'black',
          opponentName: room.guestName || 'guest',
          gameReady: true,
          forceReset: true,
        },
        timestamp: Date.now(),
        senderId: 'system',
      }

      const guestStart: NetworkMessage = {
        type: 'game_start',
        payload: {
          message: 'restart accepted',
          yourRole: 'guest',
          yourColor: 'white',
          opponentName: room.hostName,
          gameReady: true,
          forceReset: true,
        },
        timestamp: Date.now(),
        senderId: 'system',
      }

      const hostTargetId = room.hostSocketId || room.hostId
      const guestTargetId = room.guestSocketId || room.guestId

      if (hostTargetId) {
        broadcastToPlayer(hostTargetId, hostStart)
      }
      if (guestTargetId) {
        broadcastToPlayer(guestTargetId, guestStart)
      }

      sendRoomSnapshotToRoom(client.roomId)
      return
    }

    case 'restart_decline': {
      roomManager.clearRestartRequester(client.roomId)
      broadcastToRoom(client.roomId, message, senderId)
      sendRoomSnapshotToRoom(client.roomId)
      return
    }

    case 'undo_request': {
      roomManager.setUndoRequester(client.roomId, client.playerId, client.playerName)
      broadcastToRoom(client.roomId, message, senderId)
      sendRoomSnapshotToRoom(client.roomId)
      return
    }

    case 'undo_accept': {
      const room = roomManager.getRoom(client.roomId)
      const requesterId = room?.pendingUndoRequesterId
      roomManager.clearUndoRequester(client.roomId)
      roomManager.applyUndo(client.roomId, 1, requesterId)
      broadcastToRoom(client.roomId, message, senderId)
      sendRoomSnapshotToRoom(client.roomId)
      return
    }

    case 'undo_decline': {
      roomManager.declineUndo(client.roomId, client.playerId, client.playerName)
      broadcastToRoom(client.roomId, message, senderId)
      sendRoomSnapshotToRoom(client.roomId)
      return
    }

    case 'ping':
      client.ws.send(
        JSON.stringify({
          type: 'pong',
          payload: {},
          timestamp: Date.now(),
          senderId: 'system',
        })
      )
      return

    default:
      broadcastToRoom(client.roomId, message, senderId)
  }
}

function getRoomSnapshot(roomId: string): RoomSnapshotPayload | null {
  const room = roomManager.getRoom(roomId)
  if (!room) return null

  const moveCount = room.moves.length
  return {
    roomId: room.id,
    roomCode: room.code,
    status: room.status,
    gameStarted: room.gameStarted,
    hostName: room.hostName,
    guestName: room.guestName,
    pendingRestartRequesterId: room.pendingRestartRequesterId,
    pendingRestartRequesterName: room.pendingRestartRequesterName,
    pendingUndoRequesterId: room.pendingUndoRequesterId,
    pendingUndoRequesterName: room.pendingUndoRequesterName,
    moveCount,
    currentPlayer: moveCount % 2 === 0 ? 'black' : 'white',
  }
}

function sendRoomSnapshotToRoom(roomId: string): void {
  const snapshot = getRoomSnapshot(roomId)
  if (!snapshot) return

  const message: NetworkMessage = {
    type: 'room_snapshot',
    payload: snapshot,
    timestamp: Date.now(),
    senderId: 'system',
  }

  broadcastToRoom(roomId, message)
}

function broadcastToRoom(roomId: string, message: NetworkMessage, excludeSenderId?: string): void {
  for (const [targetId, client] of clients.entries()) {
    if (client.roomId !== roomId) continue
    if (excludeSenderId && targetId === excludeSenderId) continue
    if (client.ws.readyState !== WebSocket.OPEN) continue
    try {
      client.ws.send(JSON.stringify(message))
    } catch (error) {
      console.error(`[WebSocket] send failed to ${targetId}:`, error)
    }
  }
}

function broadcastToPlayer(playerId: string, message: NetworkMessage): boolean {
  const client = clients.get(playerId)
  if (!client || client.ws.readyState !== WebSocket.OPEN) return false

  try {
    client.ws.send(JSON.stringify(message))
    return true
  } catch (error) {
    console.error(`[WebSocket] send failed to ${playerId}:`, error)
    return false
  }
}

function handleDisconnect(client: ConnectedClient): void {
  const { playerId, roomId, role, playerName } = client
  const currentClient = clients.get(playerId)
  if (currentClient && currentClient !== client) {
    // stale socket close for an older connection; ignore
    return
  }

  clients.delete(playerId)

  const existingCleanup = pendingDisconnectCleanup.get(playerId)
  if (existingCleanup) {
    clearTimeout(existingCleanup)
  }

  const timer = setTimeout(() => {
    pendingDisconnectCleanup.delete(playerId)

    // player has reconnected during grace period
    if (clients.has(playerId)) return

    if (role === 'host') {
      for (const [targetId, targetClient] of clients.entries()) {
        if (targetId === playerId) continue
        if (targetClient.roomId !== roomId) continue
        if (targetClient.ws.readyState !== WebSocket.OPEN) continue
        try {
          targetClient.ws.close(4008, 'host disconnected')
        } catch (error) {
          console.error(`[WebSocket] failed to close guest ${targetId}:`, error)
        }
      }
    }

    const result = roomManager.removePlayer(roomId, role)
    if (result.roomRemoved) return

    const room = roomManager.getRoom(roomId)
    const hostTargetId = room?.hostSocketId || room?.hostId
    if (!room || room.status !== 'waiting' || !hostTargetId) return

    const hostClient = clients.get(hostTargetId)
    if (!hostClient || hostClient.ws.readyState !== WebSocket.OPEN) return

    hostClient.ws.send(
      JSON.stringify({
        type: 'player_left',
        payload: { playerName, reason: 'disconnected' },
        timestamp: Date.now(),
        senderId: 'system',
      })
    )

    sendRoomSnapshotToRoom(roomId)
  }, DISCONNECT_GRACE_MS)

  pendingDisconnectCleanup.set(playerId, timer)
}

setInterval(() => {
  const cleaned = roomManager.cleanupExpiredRooms()
  if (cleaned > 0) {
    console.log(`[RoomManager] cleaned expired rooms: ${cleaned}`)
  }
}, 60 * 60 * 1000)

startServer()
