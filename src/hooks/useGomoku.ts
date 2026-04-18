import { useState, useCallback } from 'react'
import type { Board, Player, Position, GameState } from '@/types'

const BOARD_SIZE = 15
const WIN_COUNT = 5

function createEmptyBoard(): Board {
  return Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null))
}

function checkLine(
  board: Board,
  row: number,
  col: number,
  dRow: number,
  dCol: number,
  player: Player
): Position[] | null {
  const positions: Position[] = [{ row, col }]
  
  for (let i = 1; i < WIN_COUNT; i++) {
    const newRow = row + dRow * i
    const newCol = col + dCol * i
    if (
      newRow < 0 ||
      newRow >= BOARD_SIZE ||
      newCol < 0 ||
      newCol >= BOARD_SIZE ||
      board[newRow][newCol] !== player
    ) {
      break
    }
    positions.push({ row: newRow, col: newCol })
  }
  
  for (let i = 1; i < WIN_COUNT; i++) {
    const newRow = row - dRow * i
    const newCol = col - dCol * i
    if (
      newRow < 0 ||
      newRow >= BOARD_SIZE ||
      newCol < 0 ||
      newCol >= BOARD_SIZE ||
      board[newRow][newCol] !== player
    ) {
      break
    }
    positions.unshift({ row: newRow, col: newCol })
  }
  
  return positions.length >= WIN_COUNT ? positions : null
}

function checkWin(board: Board, row: number, col: number, player: Player): Position[] | null {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]
  
  for (const [dRow, dCol] of directions) {
    const winLine = checkLine(board, row, col, dRow, dCol, player)
    if (winLine) {
      return winLine
    }
  }
  
  return null
}

function checkDraw(board: Board): boolean {
  return board.every(row => row.every(cell => cell !== null))
}

export function useGomoku() {
  const [gameState, setGameState] = useState<GameState>({
    board: createEmptyBoard(),
    currentPlayer: 'black',
    status: 'playing',
    lastMove: null,
    winner: null,
  })
  
  const [moves, setMoves] = useState<Position[]>([])
  const [winningLine, setWinningLine] = useState<Position[] | null>(null)
  const [timeoutLoser, setTimeoutLoser] = useState<Player | null>(null)
  
  const makeMove = useCallback((row: number, col: number, forcedPlayer?: Player): boolean => {
    let moved = false

    setGameState(prev => {
      if (prev.status !== 'playing') return prev
      if (prev.board[row][col] !== null) return prev

      const playerToPlace = forcedPlayer ?? prev.currentPlayer
      const newBoard = prev.board.map(r => [...r])
      newBoard[row][col] = playerToPlace
      moved = true

      const newLastMove = { row, col }
      setMoves(m => [...m, newLastMove])

      const winLine = checkWin(newBoard, row, col, playerToPlace)
      if (winLine) {
        setWinningLine(winLine)
        setTimeoutLoser(null)
        return {
          board: newBoard,
          currentPlayer: playerToPlace,
          status: playerToPlace === 'black' ? 'black-wins' : 'white-wins',
          lastMove: newLastMove,
          winner: playerToPlace,
        }
      }

      if (checkDraw(newBoard)) {
        setTimeoutLoser(null)
        return {
          board: newBoard,
          currentPlayer: prev.currentPlayer,
          status: 'draw',
          lastMove: newLastMove,
          winner: null,
        }
      }
      
      setTimeoutLoser(null)
      return {
        board: newBoard,
        currentPlayer: playerToPlace === 'black' ? 'white' : 'black',
        status: 'playing',
        lastMove: newLastMove,
        winner: null,
      }
    })

    return moved
  }, [])
  
  const resetGame = useCallback(() => {
    setGameState({
      board: createEmptyBoard(),
      currentPlayer: 'black',
      status: 'playing',
      lastMove: null,
      winner: null,
    })
    setMoves([])
    setWinningLine(null)
    setTimeoutLoser(null)
  }, [])
  
  const timeout = useCallback((loser: Player) => {
    setGameState(prev => {
      if (prev.status !== 'playing') return prev
      const winner: Player = loser === 'black' ? 'white' : 'black'
      return {
        ...prev,
        status: winner === 'black' ? 'black-wins' : 'white-wins',
        winner,
      }
    })
    setWinningLine(null)
    setTimeoutLoser(loser)
  }, [])

  const finishGame = useCallback((winner: Player | 'draw', reason: 'win' | 'draw' | 'resign' | 'timeout' = 'win') => {
    setGameState((prev) => {
      if (winner === 'draw') {
        return {
          ...prev,
          status: 'draw',
          winner: null,
        }
      }

      return {
        ...prev,
        status: winner === 'black' ? 'black-wins' : 'white-wins',
        winner,
      }
    })

    if (reason === 'timeout' && winner !== 'draw') {
      const loser: Player = winner === 'black' ? 'white' : 'black'
      setTimeoutLoser(loser)
    } else {
      setTimeoutLoser(null)
    }
  }, [])
  
  return {
    ...gameState,
    moves,
    winningLine,
    timeoutLoser,
    makeMove,
    resetGame,
    timeout,
    finishGame,
    boardSize: BOARD_SIZE,
  }
}
