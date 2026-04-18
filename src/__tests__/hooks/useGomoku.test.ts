import { describe, it, expect } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'
import { useGomoku } from '@/hooks/useGomoku'

describe('useGomoku Hook', () => {
  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useGomoku())

    expect(result.current.currentPlayer).toBe('black')
    expect(result.current.status).toBe('playing')
    expect(result.current.winner).toBeNull()
    expect(result.current.lastMove).toBeNull()
    expect(result.current.winningLine).toBeNull()
    expect(result.current.moves).toEqual([])
    expect(result.current.timeoutLoser).toBeNull()

    // Board should be 15x15 and empty
    expect(result.current.board).toHaveLength(15)
    expect(result.current.board[0]).toHaveLength(15)
    expect(result.current.board[7][7]).toBeNull()
  })

  it('allows black to make the first move', () => {
    const { result } = renderHook(() => useGomoku())

    act(() => {
      result.current.makeMove(7, 7)
    })

    expect(result.current.board[7][7]).toBe('black')
    expect(result.current.currentPlayer).toBe('white')
    expect(result.current.lastMove).toEqual({ row: 7, col: 7 })
    expect(result.current.moves).toHaveLength(1)
  })

  it('alternates between black and white', () => {
    const { result } = renderHook(() => useGomoku())

    act(() => {
      result.current.makeMove(7, 7)
    })
    expect(result.current.currentPlayer).toBe('white')

    act(() => {
      result.current.makeMove(7, 8)
    })
    expect(result.current.currentPlayer).toBe('black')
  })

  it('does not allow move on occupied cell', () => {
    const { result } = renderHook(() => useGomoku())

    act(() => {
      result.current.makeMove(7, 7)
    })

    act(() => {
      result.current.makeMove(7, 7)
    })

    expect(result.current.board[7][7]).toBe('black')
    expect(result.current.currentPlayer).toBe('white')
  })

  it('does not allow moves when game is over', () => {
    const { result } = renderHook(() => useGomoku())

    // Create a winning condition for black (5 in a row horizontally)
    act(() => result.current.makeMove(7, 7)) // black
    act(() => result.current.makeMove(0, 0)) // white
    act(() => result.current.makeMove(7, 8)) // black
    act(() => result.current.makeMove(0, 1)) // white
    act(() => result.current.makeMove(7, 9)) // black
    act(() => result.current.makeMove(0, 2)) // white
    act(() => result.current.makeMove(7, 10)) // black
    act(() => result.current.makeMove(0, 3)) // white
    act(() => result.current.makeMove(7, 11)) // black - wins

    expect(result.current.status).toBe('black-wins')
    expect(result.current.winner).toBe('black')

    // Try to make another move
    const movesCount = result.current.moves.length
    act(() => {
      result.current.makeMove(0, 4)
    })

    expect(result.current.moves).toHaveLength(movesCount)
  })

  it('resets game correctly', () => {
    const { result } = renderHook(() => useGomoku())

    act(() => {
      result.current.makeMove(7, 7)
    })

    act(() => {
      result.current.resetGame()
    })

    expect(result.current.currentPlayer).toBe('black')
    expect(result.current.status).toBe('playing')
    expect(result.current.winner).toBeNull()
    expect(result.current.lastMove).toBeNull()
    expect(result.current.winningLine).toBeNull()
    expect(result.current.moves).toEqual([])
    expect(result.current.board[7][7]).toBeNull()
  })

  it('handles timeout correctly', () => {
    const { result } = renderHook(() => useGomoku())

    act(() => {
      result.current.timeout('black')
    })

    expect(result.current.status).toBe('white-wins')
    expect(result.current.winner).toBe('white')
    expect(result.current.timeoutLoser).toBe('black')
  })

  it('detects horizontal win', () => {
    const { result } = renderHook(() => useGomoku())

    act(() => result.current.makeMove(7, 7)) // black
    act(() => result.current.makeMove(0, 0)) // white
    act(() => result.current.makeMove(7, 8)) // black
    act(() => result.current.makeMove(0, 1)) // white
    act(() => result.current.makeMove(7, 9)) // black
    act(() => result.current.makeMove(0, 2)) // white
    act(() => result.current.makeMove(7, 10)) // black
    act(() => result.current.makeMove(0, 3)) // white
    act(() => result.current.makeMove(7, 11)) // black - wins

    expect(result.current.status).toBe('black-wins')
    expect(result.current.winner).toBe('black')
    expect(result.current.winningLine).toHaveLength(5)
  })

  it('detects vertical win', () => {
    const { result } = renderHook(() => useGomoku())

    act(() => result.current.makeMove(7, 7)) // black
    act(() => result.current.makeMove(0, 0)) // white
    act(() => result.current.makeMove(8, 7)) // black
    act(() => result.current.makeMove(0, 1)) // white
    act(() => result.current.makeMove(9, 7)) // black
    act(() => result.current.makeMove(0, 2)) // white
    act(() => result.current.makeMove(10, 7)) // black
    act(() => result.current.makeMove(0, 3)) // white
    act(() => result.current.makeMove(11, 7)) // black - wins

    expect(result.current.status).toBe('black-wins')
    expect(result.current.winner).toBe('black')
  })

  it('detects diagonal win', () => {
    const { result } = renderHook(() => useGomoku())

    act(() => result.current.makeMove(7, 7)) // black
    act(() => result.current.makeMove(0, 0)) // white
    act(() => result.current.makeMove(8, 8)) // black
    act(() => result.current.makeMove(0, 1)) // white
    act(() => result.current.makeMove(9, 9)) // black
    act(() => result.current.makeMove(0, 2)) // white
    act(() => result.current.makeMove(10, 10)) // black
    act(() => result.current.makeMove(0, 3)) // white
    act(() => result.current.makeMove(11, 11)) // black - wins

    expect(result.current.status).toBe('black-wins')
    expect(result.current.winner).toBe('black')
  })
})
