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
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const senderName = typeof body.senderName === 'string' ? body.senderName.trim() : ''
    const senderId = typeof body.senderId === 'string' ? body.senderId.trim() : undefined

    if (!roomId) {
      return NextResponse.json({ success: false, error: 'missing roomId' }, { status: 400 })
    }

    if (!message) {
      return NextResponse.json({ success: false, error: 'missing message' }, { status: 400 })
    }

    if (!senderName) {
      return NextResponse.json({ success: false, error: 'missing senderName' }, { status: 400 })
    }

    const ok = roomManager.addChatMessage(roomId, {
      message,
      senderName,
      senderId,
      timestamp: Date.now(),
    })

    if (!ok) {
      return NextResponse.json({ success: false, error: 'room not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'chat sent',
    })
  } catch (error) {
    console.error('[API] chat failed:', error)
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 })
  }
}
