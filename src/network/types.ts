export type ConnectionRole = 'host' | 'guest'
export type RoomStatus = 'waiting' | 'playing' | 'finished'

export interface RoomInfo {
  id: string
  code: string
  hostName: string
  guestName?: string
  status: RoomStatus
  createdAt: number
  hostId: string
  guestId?: string
}

export interface PlayerInfo {
  id: string
  name: string
  role: ConnectionRole
  playerColor: 'black' | 'white'
}

export type MessageType = 
  | 'move' 
  | 'game_start' 
  | 'game_end' 
  | 'chat' 
  | 'ready' 
  | 'restart_request'
  | 'restart_accept'
  | 'restart_decline'
  | 'undo_request'
  | 'undo_accept'
  | 'undo_decline'
  | 'player_joined'
  | 'player_left'
  | 'room_snapshot'
  | 'ping'
  | 'pong'

export interface NetworkMessage {
  type: MessageType
  payload: unknown
  timestamp: number
  senderId: string
  senderRole?: ConnectionRole
}

export interface MovePayload {
  row: number
  col: number
  player: 'black' | 'white'
  moveNumber: number
}

export interface GameStartPayload {
  hostPlayer: PlayerInfo
  guestPlayer: PlayerInfo
  boardSize: number
}

export interface GameEndPayload {
  winner: 'black' | 'white' | 'draw'
  reason: 'win' | 'draw' | 'resign' | 'timeout'
  moveCount: number
  duration: number
}

export interface ChatPayload {
  message: string
  senderName: string
}

export interface ReadyPayload {
  isReady: boolean
}

export interface RestartRequestPayload {
  requesterName: string
  requesterId?: string
}

export interface RestartDeclinePayload {
  declinerName?: string
}

export interface UndoRequestPayload {
  requesterName: string
  requesterId?: string
}

export interface UndoDeclinePayload {
  declinerName?: string
}

export interface NetworkStats {
  latency: number
  messagesSent: number
  messagesReceived: number
  connectionTime: number
  lastMessageTime: number
}

export interface GameSyncPayload {
  moves: Array<{
    row: number
    col: number
    player: 'black' | 'white'
    moveNumber: number
  }>
}

export type GameStartPayloadData = {
  gameReady: boolean
  yourRole: ConnectionRole
  opponentName?: string
  forceReset?: boolean
}

export type PlayerJoinedPayload = {
  playerInfo: {
    name: string
    id: string
  }
}

export type PlayerLeftPayload = {
  playerName: string
}

export interface RoomSnapshotPayload {
  roomId: string
  roomCode: string
  status: RoomStatus
  gameStarted: boolean
  hostName: string
  guestName?: string
  pendingRestartRequesterId?: string
  pendingRestartRequesterName?: string
  pendingUndoRequesterId?: string
  pendingUndoRequesterName?: string
  moveCount: number
  currentPlayer: 'black' | 'white'
}
