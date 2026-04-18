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
    const requesterId = typeof body.requesterId === 'string' ? body.requesterId.trim() : undefined
    const requesterName = typeof body.requesterName === 'string' ? body.requesterName.trim() : undefined

    if (!roomId) {
      return NextResponse.json({ success: false, error: 'missing roomId' }, { status: 400 })
    }

    const ok = roomManager.cancelOpening(roomId, requesterId, requesterName)

    if (!ok) {
      return NextResponse.json({ success: false, error: 'room not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'opening canceled',
    })
  } catch (error) {
    console.error('[API] cancel-opening failed:', error)
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 })
  }
}
