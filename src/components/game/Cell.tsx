'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { CellValue, Player } from '@/types'
import { Stone } from './Stone'

interface CellProps {
  row: number
  col: number
  cell: CellValue
  isLastMove: boolean
  isWinning: boolean
  currentPlayer: Player
  disabled: boolean
  cellSize: number
  onCellClick: (row: number, col: number) => void
}

const Cell = memo(function Cell({
  row,
  col,
  cell,
  isLastMove,
  isWinning,
  currentPlayer,
  disabled,
  cellSize,
  onCellClick,
}: CellProps) {
  const stoneSize = Math.floor(cellSize * 0.82)
  
  return (
    <motion.button
      className={cn(
        'absolute rounded-full transition-colors',
        !disabled && !cell && 'hover:bg-amber-300/50 cursor-pointer',
        disabled && 'cursor-not-allowed'
      )}
      style={{
        width: cellSize,
        height: cellSize,
        left: col * cellSize,
        top: row * cellSize,
        transform: 'translate(-50%, -50%)',
        marginLeft: cellSize / 2,
        marginTop: cellSize / 2,
      }}
      onClick={() => !disabled && !cell && onCellClick(row, col)}
      whileHover={!disabled && !cell ? { scale: 1.1 } : {}}
      whileTap={!disabled && !cell ? { scale: 0.95 } : {}}
      disabled={disabled}
      aria-label={`第${row + 1}行第${col + 1}列${cell ? `，${cell === 'black' ? '黑子' : '白子'}` : '，空'}`}
      aria-disabled={disabled || !!cell}
      role="gridcell"
    >
      {cell && (
        <Stone
          player={cell}
          isLastMove={isLastMove}
          isWinning={isWinning}
          size={stoneSize}
        />
      )}
      {!cell && !disabled && (
        <motion.div
          className={cn(
            'absolute rounded-full opacity-0',
            currentPlayer === 'black' ? 'bg-gray-800' : 'bg-gray-200'
          )}
          style={{
            width: stoneSize - 4,
            height: stoneSize - 4,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          whileHover={{ opacity: 0.3 }}
        />
      )}
    </motion.button>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.row === nextProps.row &&
    prevProps.col === nextProps.col &&
    prevProps.cell === nextProps.cell &&
    prevProps.isLastMove === nextProps.isLastMove &&
    prevProps.isWinning === nextProps.isWinning &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.currentPlayer === nextProps.currentPlayer &&
    prevProps.cellSize === nextProps.cellSize
  )
})

export default Cell
