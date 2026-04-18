import { NextRequest, NextResponse } from 'next/server'
import { roomManager as roomManagerSingleton } from '@/network/RoomManager'
import type RoomManager from '@/network/RoomManager'

declare global {
  var sharedRoomManager: RoomManager | undefined
}

const roomManager = globalThis.sharedRoomManager ?? roomManagerSingleton

export async function POST(request: NextRequest) {
  try {
    if (!roomManager) {
      return NextResponse.json({ success: false, error: 'server not ready' }, { status: 500 })
    }

    const body = await request.json()
    const roomId = typeof body.roomId === 'string' ? body.roomId.trim() : ''

    if (!roomId) {
      return NextResponse.json({ success: false, error: 'missing roomId' }, { status: 400 })
    }

    const room = roomManager.getRoom(roomId)
    const requesterId = room?.pendingUndoRequesterId
    const cleared = roomManager.clearUndoRequester(roomId)
    const applied = roomManager.applyUndo(roomId, 1, requesterId)

    if (!cleared || !applied) {
      return NextResponse.json({ success: false, error: 'undo failed' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'undo accepted',
    })
  } catch (error) {
    console.error('[API] undo-accept failed:', error)
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 })
  }
}
