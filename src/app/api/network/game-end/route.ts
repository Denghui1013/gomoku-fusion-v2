import { NextRequest, NextResponse } from 'next/server'
import { roomManager as roomManagerSingleton } from '@/network/RoomManager'
import type RoomManager from '@/network/RoomManager'
import type { GameEndPayload } from '@/network/types'

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
    const winner = body.winner as GameEndPayload['winner']
    const reason = body.reason as GameEndPayload['reason']
    const moveCount = Number(body.moveCount || 0)
    const duration = Number(body.duration || 0)

    if (!roomId) {
      return NextResponse.json({ success: false, error: 'missing roomId' }, { status: 400 })
    }

    if (!winner || !reason) {
      return NextResponse.json({ success: false, error: 'missing game end payload' }, { status: 400 })
    }

    const ok = roomManager.setGameEnd(roomId, {
      winner,
      reason,
      moveCount,
      duration,
    })

    if (!ok) {
      return NextResponse.json({ success: false, error: 'room not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'game end saved',
    })
  } catch (error) {
    console.error('[API] game-end failed:', error)
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 })
  }
}
