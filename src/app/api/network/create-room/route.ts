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
      return NextResponse.json(
        { success: false, error: '\u670d\u52a1\u5668\u672a\u5c31\u7eea\uff0c\u8bf7\u5237\u65b0\u9875\u9762\u540e\u91cd\u8bd5' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { playerName, playerId } = body

    if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '\u8bf7\u8f93\u5165\u6709\u6548\u7684\u73a9\u5bb6\u540d\u79f0' },
        { status: 400 }
      )
    }

    if (playerName.trim().length > 20) {
      return NextResponse.json(
        { success: false, error: '\u73a9\u5bb6\u540d\u79f0\u4e0d\u80fd\u8d85\u8fc7 20 \u4e2a\u5b57\u7b26' },
        { status: 400 }
      )
    }

    const room = roomManager.createRoom(playerName.trim(), playerId || `host_${Date.now()}`)

    console.log(`[API] \u623f\u95f4\u5df2\u521b\u5efa: ${room.code} by ${playerName}`)

    return NextResponse.json({
      success: true,
      room,
      message: '\u623f\u95f4\u521b\u5efa\u6210\u529f',
    })
  } catch (error) {
    console.error('[API] \u521b\u5efa\u623f\u95f4\u5931\u8d25:', error)
    return NextResponse.json(
      { success: false, error: '\u670d\u52a1\u5668\u5185\u90e8\u9519\u8bef' },
      { status: 500 }
    )
  }
}

export async function GET() {
  if (!roomManager) {
    return NextResponse.json({ success: false, error: '\u670d\u52a1\u5668\u672a\u5c31\u7eea' }, { status: 500 })
  }

  try {
    const activeRooms = roomManager.getActiveRoomsCount()

    return NextResponse.json({
      success: true,
      activeRooms,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '\u83b7\u53d6\u623f\u95f4\u4fe1\u606f\u5931\u8d25' },
      { status: 500 }
    )
  }
}
