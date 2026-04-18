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
    const role = body.role === 'host' || body.role === 'guest' ? body.role : null

    if (!roomId || !role) {
      return NextResponse.json({ success: false, error: 'missing roomId/role' }, { status: 400 })
    }

    const result = roomManager.removePlayer(roomId, role)
    return NextResponse.json({
      success: true,
      roomRemoved: result.roomRemoved,
      roomStatus: result.roomStatus,
    })
  } catch (error) {
    console.error('[API] leave-room failed:', error)
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 })
  }
}
