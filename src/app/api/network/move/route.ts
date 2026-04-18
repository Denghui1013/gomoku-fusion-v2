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
        { success: false, error: '\u670d\u52a1\u5668\u672a\u5c31\u7eea' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { roomId, row, col, player, moveNumber } = body

    if (!roomId || row === undefined || col === undefined || !player) {
      return NextResponse.json(
        { success: false, error: '\u7f3a\u5c11\u5fc5\u8981\u53c2\u6570' },
        { status: 400 }
      )
    }

    const room = roomManager.getRoom(roomId)

    if (!room) {
      return NextResponse.json(
        { success: false, error: '\u623f\u95f4\u4e0d\u5b58\u5728' },
        { status: 404 }
      )
    }

    if (room.status !== 'playing') {
      return NextResponse.json(
        { success: false, error: '\u6e38\u620f\u672a\u5f00\u59cb\u6216\u5df2\u7ed3\u675f' },
        { status: 400 }
      )
    }

    // \u8bb0\u5f55\u843d\u5b50
    roomManager.addMove(roomId, {
      row,
      col,
      player,
      moveNumber: moveNumber || room.moves.length + 1,
      timestamp: Date.now(),
    })

    console.log(`[API] \u843d\u5b50\u8bb0\u5f55: ${player} (${row}, ${col}) in room ${roomId}`)

    return NextResponse.json({
      success: true,
      message: '\u843d\u5b50\u6210\u529f',
    })
  } catch (error) {
    console.error('[API] \u843d\u5b50\u5931\u8d25:', error)
    return NextResponse.json(
      { success: false, error: '\u670d\u52a1\u5668\u5185\u90e8\u9519\u8bef' },
      { status: 500 }
    )
  }
}
