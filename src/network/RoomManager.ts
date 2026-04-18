import { v4 as uuidv4 } from 'uuid'
import type { ConnectionRole, GameEndPayload, RoomInfo, RoomStatus } from './types'

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ROOM_CODE_LENGTH = 6
const ROOM_EXPIRY_MS = 24 * 60 * 60 * 1000

interface GameMove {
  row: number
  col: number
  player: 'black' | 'white'
  moveNumber: number
  timestamp: number
}

interface ChatMessage {
  message: string
  senderName: string
  senderId?: string
  timestamp: number
}

interface GameEndRecord extends GameEndPayload {
  timestamp: number
}

interface RestartDeclineRecord {
  declinerId?: string
  declinerName?: string
  requesterId?: string
  requesterName?: string
  timestamp: number
}

interface UndoDeclineRecord {
  declinerId?: string
  declinerName?: string
  requesterId?: string
  requesterName?: string
  timestamp: number
}

interface OpeningCancelRecord {
  requesterId?: string
  requesterName?: string
  timestamp: number
}

interface RoomData extends RoomInfo {
  hostSocketId?: string
  guestSocketId?: string
  moves: GameMove[]
  chatMessages: ChatMessage[]
  gameStarted: boolean
  pendingRestartRequesterId?: string
  pendingRestartRequesterName?: string
  pendingUndoRequesterId?: string
  pendingUndoRequesterName?: string
  lastGameEnd?: GameEndRecord
  lastRestartDecline?: RestartDeclineRecord
  lastUndoDecline?: UndoDeclineRecord
  lastOpeningCancel?: OpeningCancelRecord
}

class RoomManager {
  private rooms: Map<string, RoomData> = new Map()
  private codeToId: Map<string, string> = new Map()

  createRoom(hostName: string, hostId: string): RoomInfo {
    const existingRoom = this.findReusableHostRoom(hostId)
    if (existingRoom) {
      existingRoom.hostName = hostName
      return existingRoom
    }

    const id = uuidv4()
    const code = this.generateRoomCode()

    const room: RoomData = {
      id,
      code,
      hostName,
      status: 'waiting',
      createdAt: Date.now(),
      hostId,
      moves: [],
      chatMessages: [],
      gameStarted: false,
    }

    this.rooms.set(id, room)
    this.codeToId.set(code, id)
    return room
  }

  joinRoom(roomCode: string, guestName: string, guestId: string): { success: true; room: RoomInfo } | { success: false; error: string } {
    const roomId = this.codeToId.get(roomCode.toUpperCase())
    if (!roomId) {
      return { success: false, error: '房间不存在' }
    }

    const room = this.rooms.get(roomId)
    if (!room) {
      return { success: false, error: '房间不存在' }
    }

    if (room.hostId === guestId) {
      return { success: false, error: '不能使用同一个玩家ID加入自己的房间，请换一个浏览器窗口或设备重试' }
    }

    if (Date.now() - room.createdAt > ROOM_EXPIRY_MS) {
      this.removeRoom(roomId)
      return { success: false, error: '房间已过期' }
    }

    if (room.guestId === guestId) {
      room.guestName = guestName
      return { success: true, room }
    }

    if (room.status !== 'waiting') {
      return { success: false, error: '房间已满或游戏进行中' }
    }

    room.guestName = guestName
    room.guestId = guestId
    room.status = 'playing'
    room.gameStarted = true
    room.pendingRestartRequesterId = undefined
    room.pendingRestartRequesterName = undefined
    room.pendingUndoRequesterId = undefined
    room.pendingUndoRequesterName = undefined
    room.lastGameEnd = undefined
    room.lastRestartDecline = undefined
    room.lastUndoDecline = undefined
    room.lastOpeningCancel = undefined

    return { success: true, room }
  }

  getRoom(roomId: string): RoomData | undefined {
    return this.rooms.get(roomId)
  }

  getRoomByCode(code: string): RoomData | undefined {
    const roomId = this.codeToId.get(code.toUpperCase())
    return roomId ? this.rooms.get(roomId) : undefined
  }

  addMove(roomId: string, move: GameMove): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    const duplicatedMove = room.moves.some(
      (item) =>
        item.moveNumber === move.moveNumber ||
        (item.row === move.row && item.col === move.col)
    )
    if (duplicatedMove) return false
    room.moves.push(move)
    return true
  }

  addChatMessage(
    roomId: string,
    message: ChatMessage
  ): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    room.chatMessages.push(message)
    return true
  }

  getMoves(roomId: string): GameMove[] {
    const room = this.rooms.get(roomId)
    return room ? room.moves : []
  }

  getChatMessages(roomId: string): ChatMessage[] {
    const room = this.rooms.get(roomId)
    return room ? room.chatMessages : []
  }

  restartGame(roomId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    room.moves = []
    room.lastGameEnd = undefined
    room.gameStarted = true
    room.status = 'playing'
    room.pendingRestartRequesterId = undefined
    room.pendingRestartRequesterName = undefined
    room.pendingUndoRequesterId = undefined
    room.pendingUndoRequesterName = undefined
    room.lastRestartDecline = undefined
    room.lastUndoDecline = undefined
    room.lastOpeningCancel = undefined
    return true
  }

  cancelOpening(roomId: string, requesterId?: string, requesterName?: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    room.moves = []
    room.gameStarted = true
    room.status = 'playing'
    room.pendingRestartRequesterId = undefined
    room.pendingRestartRequesterName = undefined
    room.pendingUndoRequesterId = undefined
    room.pendingUndoRequesterName = undefined
    room.lastGameEnd = undefined
    room.lastRestartDecline = undefined
    room.lastUndoDecline = undefined
    room.lastOpeningCancel = {
      requesterId,
      requesterName,
      timestamp: Date.now(),
    }
    return true
  }

  setGameEnd(roomId: string, gameEnd: GameEndPayload): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    room.lastGameEnd = {
      ...gameEnd,
      timestamp: Date.now(),
    }
    room.status = 'finished'
    room.gameStarted = false
    room.pendingRestartRequesterId = undefined
    room.pendingRestartRequesterName = undefined
    room.pendingUndoRequesterId = undefined
    room.pendingUndoRequesterName = undefined
    return true
  }

  setRestartRequester(roomId: string, requesterId: string, requesterName: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    room.pendingRestartRequesterId = requesterId
    room.pendingRestartRequesterName = requesterName
    room.lastRestartDecline = undefined
    return true
  }

  declineRestart(roomId: string, declinerId?: string, declinerName?: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    const requesterId = room.pendingRestartRequesterId
    const requesterName = room.pendingRestartRequesterName
    room.pendingRestartRequesterId = undefined
    room.pendingRestartRequesterName = undefined
    room.lastRestartDecline = {
      declinerId,
      declinerName,
      requesterId,
      requesterName,
      timestamp: Date.now(),
    }
    return true
  }

  clearRestartRequester(roomId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    room.pendingRestartRequesterId = undefined
    room.pendingRestartRequesterName = undefined
    return true
  }

  setUndoRequester(roomId: string, requesterId: string, requesterName: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    room.pendingUndoRequesterId = requesterId
    room.pendingUndoRequesterName = requesterName
    room.lastUndoDecline = undefined
    return true
  }

  declineUndo(roomId: string, declinerId?: string, declinerName?: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    const requesterId = room.pendingUndoRequesterId
    const requesterName = room.pendingUndoRequesterName
    room.pendingUndoRequesterId = undefined
    room.pendingUndoRequesterName = undefined
    room.lastUndoDecline = {
      declinerId,
      declinerName,
      requesterId,
      requesterName,
      timestamp: Date.now(),
    }
    return true
  }

  clearUndoRequester(roomId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    room.pendingUndoRequesterId = undefined
    room.pendingUndoRequesterName = undefined
    return true
  }

  applyUndo(roomId: string, rollbackMoves = 1, requesterId?: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    if (requesterId) {
      const requesterColor: 'black' | 'white' | null =
        requesterId === room.hostId ? 'black' : requesterId === room.guestId ? 'white' : null

      if (requesterColor && room.moves.length > 0) {
        const lastMove = room.moves[room.moves.length - 1]
        if (lastMove.player === requesterColor) {
          rollbackMoves = 1
        } else if (room.moves.length >= 2) {
          const previousMove = room.moves[room.moves.length - 2]
          rollbackMoves = previousMove.player === requesterColor ? 2 : 1
        } else {
          rollbackMoves = 1
        }
      }
    }

    if (room.moves.length < rollbackMoves) return false

    room.moves = room.moves.slice(0, room.moves.length - rollbackMoves)
    room.pendingUndoRequesterId = undefined
    room.pendingUndoRequesterName = undefined
    room.lastUndoDecline = undefined
    room.lastGameEnd = undefined
    room.status = 'playing'
    room.gameStarted = true
    return true
  }

  getRoomState(roomId: string): {
    exists: boolean
    roomCode: string
    status: RoomStatus
    hostName: string
    guestJoined: boolean
    guestName?: string
    pendingRestartRequesterId?: string
    pendingRestartRequesterName?: string
    pendingUndoRequesterId?: string
    pendingUndoRequesterName?: string
    gameStarted: boolean
    currentPlayer: 'black' | 'white'
    moveCount: number
    moves: GameMove[]
    chatMessages: ChatMessage[]
    lastMove?: GameMove
    lastGameEnd?: GameEndRecord
    lastRestartDecline?: RestartDeclineRecord
    lastUndoDecline?: UndoDeclineRecord
  } | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    const moveCount = room.moves.length
    const currentPlayer: 'black' | 'white' = moveCount % 2 === 0 ? 'black' : 'white'

    return {
      exists: true,
      roomCode: room.code,
      status: room.status,
      hostName: room.hostName,
      guestJoined: !!room.guestName,
      guestName: room.guestName,
      pendingRestartRequesterId: room.pendingRestartRequesterId,
      pendingRestartRequesterName: room.pendingRestartRequesterName,
      pendingUndoRequesterId: room.pendingUndoRequesterId,
      pendingUndoRequesterName: room.pendingUndoRequesterName,
      gameStarted: room.gameStarted,
      currentPlayer,
      moveCount,
      moves: [...room.moves],
      chatMessages: [...room.chatMessages],
      lastMove: room.moves.length > 0 ? room.moves[room.moves.length - 1] : undefined,
      lastGameEnd: room.lastGameEnd,
      lastRestartDecline: room.lastRestartDecline,
      lastUndoDecline: room.lastUndoDecline,
      lastOpeningCancel: room.lastOpeningCancel,
    }
  }

  updateRoomStatus(roomId: string, status: RoomStatus): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    room.status = status
    return true
  }

  setHostSocketId(roomId: string, socketId: string): void {
    const room = this.rooms.get(roomId)
    if (room) room.hostSocketId = socketId
  }

  setGuestSocketId(roomId: string, socketId: string): void {
    const room = this.rooms.get(roomId)
    if (room) room.guestSocketId = socketId
  }

  removeRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    this.codeToId.delete(room.code)
    this.rooms.delete(roomId)
    return true
  }

  removePlayer(roomId: string, role: ConnectionRole): { roomRemoved: boolean; roomStatus: RoomStatus } {
    const room = this.rooms.get(roomId)
    if (!room) {
      return { roomRemoved: false, roomStatus: 'finished' }
    }

    if (role === 'host') {
      this.removeRoom(roomId)
      return { roomRemoved: true, roomStatus: 'finished' }
    }

    room.guestName = undefined
    room.guestId = undefined
    room.guestSocketId = undefined
    room.status = 'waiting'
    room.gameStarted = false
    room.moves = []
    room.chatMessages = []
    room.pendingRestartRequesterId = undefined
    room.pendingRestartRequesterName = undefined
    room.pendingUndoRequesterId = undefined
    room.pendingUndoRequesterName = undefined
    room.lastGameEnd = undefined
    room.lastRestartDecline = undefined
    room.lastUndoDecline = undefined
    room.lastOpeningCancel = undefined
    return { roomRemoved: false, roomStatus: 'waiting' }
  }

  cleanupExpiredRooms(): number {
    let cleaned = 0
    const now = Date.now()

    for (const [id, room] of this.rooms.entries()) {
      if (now - room.createdAt > ROOM_EXPIRY_MS) {
        this.codeToId.delete(room.code)
        this.rooms.delete(id)
        cleaned += 1
      }
    }

    return cleaned
  }

  getActiveRoomsCount(): number {
    return this.rooms.size
  }

  private generateRoomCode(): string {
    let code = ''
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += ROOM_CODE_CHARS.charAt(Math.floor(Math.random() * ROOM_CODE_CHARS.length))
    }
    return code
  }

  private findReusableHostRoom(hostId: string): RoomData | undefined {
    const now = Date.now()

    for (const [id, room] of this.rooms.entries()) {
      if (now - room.createdAt > ROOM_EXPIRY_MS) {
        this.removeRoom(id)
        continue
      }

      if (room.hostId === hostId && room.status === 'waiting') {
        return room
      }
    }

    return undefined
  }
}

export const roomManager = new RoomManager()
export default RoomManager
