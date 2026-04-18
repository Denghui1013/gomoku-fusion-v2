'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { CellValue, Player, StoneEffect } from '@/types'
import { Stone } from './Stone'

interface IntersectionProps {
  row: number
  col: number
  cell: CellValue
  isLastMove: boolean
  isWinning: boolean
  isHint: boolean
  hintTone: 'attack' | 'defense' | 'neutral' | null
  isHintSecondary: boolean
  hintSecondaryTone: 'attack' | 'defense' | 'neutral' | null
  stoneEffect: StoneEffect
  currentPlayer: Player
  disabled: boolean
  cellSize: number
  margin: number
  tabIndex: number
  onIntersectionClick: (row: number, col: number) => void
  onIntersectionFocus: (row: number, col: number) => void
}

const Intersection = memo(function Intersection({
  row,
  col,
  cell,
  isLastMove,
  isWinning,
  isHint,
  hintTone,
  isHintSecondary,
  hintSecondaryTone,
  stoneEffect,
  currentPlayer,
  disabled,
  cellSize,
  margin,
  tabIndex,
  onIntersectionClick,
  onIntersectionFocus,
}: IntersectionProps) {
  const clickRadius = cellSize
  const stoneSize = Math.floor(cellSize * 0.82)

  const hintColor =
    hintTone === 'attack'
      ? 'rgba(245, 158, 11, 0.96)'
      : hintTone === 'defense'
        ? 'rgba(59, 130, 246, 0.95)'
        : 'rgba(52, 211, 153, 0.95)'
  const hintShadow =
    hintTone === 'attack'
      ? '0 0 0 2px rgba(245, 158, 11, 0.2), 0 0 14px rgba(245, 158, 11, 0.42)'
      : hintTone === 'defense'
        ? '0 0 0 2px rgba(59, 130, 246, 0.2), 0 0 14px rgba(59, 130, 246, 0.44)'
        : '0 0 0 2px rgba(52, 211, 153, 0.2), 0 0 14px rgba(52, 211, 153, 0.42)'

  const hintSecondaryColor =
    hintSecondaryTone === 'attack'
      ? 'rgba(245, 158, 11, 0.58)'
      : hintSecondaryTone === 'defense'
        ? 'rgba(59, 130, 246, 0.58)'
        : 'rgba(52, 211, 153, 0.58)'

  return (
    <motion.button
      className={cn(
        'absolute rounded-full transition-all',
        'flex items-center justify-center',
        'p-0 border-0 bg-transparent appearance-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
        !disabled && !cell && 'cursor-pointer hover:bg-white/12',
        disabled && 'cursor-not-allowed',
        !disabled && !cell && 'ring-1 ring-transparent hover:ring-white/20'
      )}
      style={{
        width: clickRadius,
        height: clickRadius,
        left: margin + col * cellSize - clickRadius / 2,
        top: margin + row * cellSize - clickRadius / 2,
      }}
      onClick={() => !disabled && !cell && onIntersectionClick(row, col)}
      onFocus={() => onIntersectionFocus(row, col)}
      whileHover={!disabled && !cell ? { scale: 1.08 } : {}}
      whileTap={!disabled && !cell ? { scale: 0.92 } : {}}
      disabled={disabled}
      tabIndex={tabIndex}
      data-row={row}
      data-col={col}
      aria-label={`第${row + 1}行第${col + 1}列交叉点${cell ? `，${cell === 'black' ? '黑子' : '白子'}` : '，空'}`}
      aria-disabled={disabled || !!cell}
      role="gridcell"
    >
      {cell && (
        <Stone
          player={cell}
          isLastMove={isLastMove}
          isWinning={isWinning}
          size={stoneSize}
          stoneEffect={stoneEffect}
        />
      )}

      {!cell && !disabled && (
        <motion.div
          className={cn(
            'rounded-full opacity-0 pointer-events-none',
            currentPlayer === 'black' ? 'bg-gray-800' : 'bg-gray-200 border border-gray-400'
          )}
          style={{ width: stoneSize - 4, height: stoneSize - 4 }}
          whileHover={{ opacity: 0.4 }}
        />
      )}

      {!cell && isHint && (
        <>
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: stoneSize + 4,
              height: stoneSize + 4,
              border: `2px solid ${hintColor}`,
              boxShadow: hintShadow,
            }}
            animate={{ scale: [0.9, 1.04, 0.9], opacity: [0.78, 1, 0.78] }}
            transition={{ duration: 1.35, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className={cn(
              'absolute rounded-full pointer-events-none',
              currentPlayer === 'black' ? 'bg-gray-800/50' : 'bg-gray-100/75 border border-gray-300/80'
            )}
            style={{ width: stoneSize - 6, height: stoneSize - 6 }}
            animate={{ opacity: [0.35, 0.62, 0.35] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}

      {!cell && !isHint && isHintSecondary && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: stoneSize + 2,
            height: stoneSize + 2,
            border: `1px dashed ${hintSecondaryColor}`,
            boxShadow: `0 0 0 1px ${hintSecondaryColor.replace('0.58', '0.22')}`,
          }}
          animate={{ scale: [0.94, 1, 0.94], opacity: [0.44, 0.7, 0.44] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
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
    prevProps.isHint === nextProps.isHint &&
    prevProps.hintTone === nextProps.hintTone &&
    prevProps.isHintSecondary === nextProps.isHintSecondary &&
    prevProps.hintSecondaryTone === nextProps.hintSecondaryTone &&
    prevProps.stoneEffect === nextProps.stoneEffect &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.currentPlayer === nextProps.currentPlayer &&
    prevProps.cellSize === nextProps.cellSize &&
    prevProps.margin === nextProps.margin &&
    prevProps.tabIndex === nextProps.tabIndex
  )
})

export default Intersection
