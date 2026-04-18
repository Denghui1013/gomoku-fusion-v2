import { describe, it, expect } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'
import { useGomoku } from '@/hooks/useGomoku'

describe('五子棋游戏核心逻辑测试', () => {
  describe('游戏初始化', () => {
    it('应该正确初始化15x15的空棋盘', () => {
      const { result } = renderHook(() => useGomoku())
      
      expect(result.current.board).toHaveLength(15)
      expect(result.current.board[0]).toHaveLength(15)
      expect(result.current.board.every(row => row.every(cell => cell === null))).toBe(true)
    })
    
    it('黑方应该先手', () => {
      const { result } = renderHook(() => useGomoku())
      
      expect(result.current.currentPlayer).toBe('black')
    })
    
    it('游戏状态应该是playing', () => {
      const { result } = renderHook(() => useGomoku())
      
      expect(result.current.status).toBe('playing')
      expect(result.current.winner).toBe(null)
    })
  })
  
  describe('落子功能', () => {
    it('应该在指定位置正确落子', () => {
      const { result } = renderHook(() => useGomoku())
      
      act(() => {
        result.current.makeMove(7, 7)
      })
      
      expect(result.current.board[7][7]).toBe('black')
      expect(result.current.currentPlayer).toBe('white')
      expect(result.current.lastMove).toEqual({ row: 7, col: 7 })
    })
    
    it('不应该允许在已有棋子的位置落子', () => {
      const { result } = renderHook(() => useGomoku())
      
      act(() => {
        result.current.makeMove(7, 7)
      })
      
      const boardBefore = result.current.board.map(row => [...row])
      
      act(() => {
        result.current.makeMove(7, 7)
      })
      
      expect(result.current.board).toEqual(boardBefore)
      expect(result.current.currentPlayer).toBe('white')
    })
    
    it('游戏结束后不应该允许落子', () => {
      const { result } = renderHook(() => useGomoku())
      
      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.makeMove(7, i)
          if (i < 4) result.current.makeMove(6, i)
        }
      })
      
      const boardBefore = result.current.board.map(row => [...row])
      
      act(() => {
        result.current.makeMove(0, 0)
      })
      
      expect(result.current.board).toEqual(boardBefore)
    })
  })
  
  describe('胜利判定', () => {
    it('应该正确判定横向五连胜利', () => {
      const { result } = renderHook(() => useGomoku())
      
      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.makeMove(7, i)
          if (i < 4) result.current.makeMove(6, i)
        }
      })
      
      expect(result.current.status).toBe('black-wins')
      expect(result.current.winner).toBe('black')
      expect(result.current.winningLine).toHaveLength(5)
    })
    
    it('应该正确判定纵向五连胜利', () => {
      const { result } = renderHook(() => useGomoku())
      
      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.makeMove(i, 7)
          if (i < 4) result.current.makeMove(i, 6)
        }
      })
      
      expect(result.current.status).toBe('black-wins')
      expect(result.current.winner).toBe('black')
    })
    
    it('应该正确判定对角线五连胜利', () => {
      const { result } = renderHook(() => useGomoku())
      
      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.makeMove(i, i)
          if (i < 4) result.current.makeMove(i, i + 1)
        }
      })
      
      expect(result.current.status).toBe('black-wins')
      expect(result.current.winner).toBe('black')
    })
    
    it('应该正确判定反对角线五连胜利', () => {
      const { result } = renderHook(() => useGomoku())
      
      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.makeMove(i, 4 - i)
          if (i < 4) result.current.makeMove(i, 5 - i)
        }
      })
      
      expect(result.current.status).toBe('black-wins')
      expect(result.current.winner).toBe('black')
    })
    
    it('白方胜利应该正确判定', () => {
      const { result } = renderHook(() => useGomoku())
      
      act(() => {
        result.current.makeMove(0, 0)
        for (let i = 0; i < 5; i++) {
          result.current.makeMove(7, i)
          if (i < 4) result.current.makeMove(6, i)
        }
      })
      
      expect(result.current.status).toBe('white-wins')
      expect(result.current.winner).toBe('white')
    })
  })
  
  describe('重新开始功能', () => {
    it('应该正确重置游戏状态', () => {
      const { result } = renderHook(() => useGomoku())
      
      act(() => {
        result.current.makeMove(7, 7)
        result.current.makeMove(6, 6)
        result.current.makeMove(5, 5)
      })
      
      act(() => {
        result.current.resetGame()
      })
      
      expect(result.current.board.every(row => row.every(cell => cell === null))).toBe(true)
      expect(result.current.currentPlayer).toBe('black')
      expect(result.current.status).toBe('playing')
      expect(result.current.winner).toBe(null)
      expect(result.current.winningLine).toBe(null)
    })
  })
  
  describe('边界条件测试', () => {
    it('应该在棋盘边界正确落子', () => {
      const { result } = renderHook(() => useGomoku())
      
      act(() => {
        result.current.makeMove(0, 0)
        result.current.makeMove(0, 14)
        result.current.makeMove(14, 0)
        result.current.makeMove(14, 14)
      })
      
      expect(result.current.board[0][0]).toBe('black')
      expect(result.current.board[0][14]).toBe('white')
      expect(result.current.board[14][0]).toBe('black')
      expect(result.current.board[14][14]).toBe('white')
    })
    
    it('应该在棋盘边界正确判定胜利', () => {
      const { result } = renderHook(() => useGomoku())
      
      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.makeMove(0, i)
          if (i < 4) result.current.makeMove(1, i)
        }
      })
      
      expect(result.current.status).toBe('black-wins')
    })
    
    it('应该正确处理六子连珠（只判定前五子）', () => {
      const { result } = renderHook(() => useGomoku())
      
      act(() => {
        for (let i = 0; i < 6; i++) {
          result.current.makeMove(7, i)
          if (i < 5) result.current.makeMove(6, i)
        }
      })
      
      expect(result.current.status).toBe('black-wins')
      expect(result.current.winningLine).toHaveLength(5)
    })
  })
  
  describe('平局判定', () => {
    it('至少应能在非胜局下保持 playing 状态', () => {
      const { result } = renderHook(() => useGomoku())
      act(() => {
        result.current.makeMove(7, 7)
        result.current.makeMove(7, 8)
        result.current.makeMove(8, 7)
        result.current.makeMove(8, 8)
      })
      expect(result.current.status).toBe('playing')
    })
  })
})
