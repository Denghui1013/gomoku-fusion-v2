import { NextRequest, NextResponse } from 'next/server'
import { roomManager as roomManagerSingleton } from '@/network/RoomManager'
import type RoomManager from '@/network/RoomManager'

declare global {
  var sharedRoomManager: RoomManager | undefined
}

const roomManager = globalThis.sharedRoomManager ?? roomManagerSingleton

export async function GET(request: NextRequest) {
  try {
    if (!roomManager) {
      return NextResponse.json({ success: false, error: 'server not ready' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    const roomCode = searchParams.get('roomCode')

    let targetRoomId = roomId || ''
    if (!targetRoomId && roomCode) {
      const room = roomManager.getRoomByCode(roomCode)
      if (room) {
        targetRoomId = room.id
      }
    }

    if (!targetRoomId) {
      return NextResponse.json({ success: false, error: 'missing roomId/roomCode' }, { status: 400 })
    }

    const state = roomManager.getRoomState(targetRoomId)
    if (!state) {
      return NextResponse.json({ success: false, error: 'room not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      roomId: targetRoomId,
      ...state,
    })
  } catch (error) {
    console.error('[API] room-state failed:', error)
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 })
  }
}
