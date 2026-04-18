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
    const { roomCode, playerName, playerId } = body

    if (!roomCode || typeof roomCode !== 'string' || roomCode.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '\u8bf7\u8f93\u5165\u623f\u95f4\u7801' },
        { status: 400 }
      )
    }

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

    const result = roomManager.joinRoom(
      roomCode.trim().toUpperCase(),
      playerName.trim(),
      playerId || `guest_${Date.now()}`
    )

    if (!result.success) {
      console.log(`[API] \u52a0\u5165\u623f\u95f4\u5931\u8d25: ${result.error}`)
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      )
    }

    console.log(`[API] \u73a9\u5bb6 ${playerName} \u52a0\u5165\u623f\u95f4 ${roomCode}`)

    return NextResponse.json({
      success: true,
      room: result.room,
      message: '\u6210\u529f\u52a0\u5165\u623f\u95f4',
    })
  } catch (error) {
    console.error('[API] \u52a0\u5165\u623f\u95f4\u5931\u8d25:', error)
    return NextResponse.json(
      { success: false, error: '\u670d\u52a1\u5668\u5185\u90e8\u9519\u8bef' },
      { status: 500 }
    )
  }
}
