import { describe, it, expect } from '@jest/globals'
import { __testing__ as aiTesting } from '@/lib/gomokuAi'
import type { Board } from '@/types'

function emptyBoard(size = 15): Board {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null))
}

describe('gomokuAi openEnds 边界判定', () => {
  it('棋盘边界外不应算作开放端', () => {
    const board = emptyBoard()
    const res = aiTesting.countLineInDirection(board, 0, 0, 0, 1, 'black')
    // (0,0) 横向：右侧在界内且为空 -> 1 个开放端；左侧越界 -> 不算开放
    expect(res.openEnds).toBe(1)
    expect(res.count).toBe(1)
  })

  it('中间位置应有两端开放', () => {
    const board = emptyBoard()
    const res = aiTesting.countLineInDirection(board, 7, 7, 0, 1, 'black')
    expect(res.openEnds).toBe(2)
    expect(res.count).toBe(1)
  })
})

