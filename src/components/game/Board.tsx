'use client'

import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Board, BoardThemeConfig, Player, Position } from '@/types'
import { useRank } from '@/context/RankContext'
import { getBoardTheme } from '@/lib/boardThemes'
import Intersection from './Intersection'

interface BoardProps {
  board: Board
  lastMove: Position | null
  winningLine: Position[] | null
  hintMove?: Position | null
  hintTone?: 'attack' | 'defense' | 'neutral' | null
  hintAltMove?: Position | null
  hintAltTone?: 'attack' | 'defense' | 'neutral' | null
  currentPlayer: Player
  onCellClick: (row: number, col: number) => void
  disabled?: boolean
  cellSizeOverride?: number
  themeConfig?: BoardThemeConfig
}

const BOARD_SIZE = 15
const DESKTOP_CELL_SIZE = 40
const MOBILE_CELL_SIZE = 24
const MIN_CELL_SIZE = 18

function calcResponsiveCellSize() {
  if (typeof window === 'undefined') return DESKTOP_CELL_SIZE

  const isMobile = window.innerWidth < 1024
  const base = isMobile ? MOBILE_CELL_SIZE : DESKTOP_CELL_SIZE
  const units = BOARD_SIZE + 1
  const viewportWidth = window.innerWidth
  const isW360 = viewportWidth <= 360
  const isW390 = viewportWidth > 360 && viewportWidth <= 390
  const isW412 = viewportWidth > 390 && viewportWidth <= 412

  let safeHorizontal = isMobile ? 44 : 96
  if (isMobile) {
    if (isW360) safeHorizontal = 40
    else if (isW390) safeHorizontal = 42
    else if (isW412) safeHorizontal = 44
    else safeHorizontal = 52
  }

  const safeVertical = isMobile
    ? (isW360 ? 390 : isW390 ? 380 : isW412 ? 370 : 340)
    : 260
  const maxBoardByWidth = Math.floor((viewportWidth - safeHorizontal) / units)
  const maxBoardByHeight = Math.floor((window.innerHeight - safeVertical) / units)

  const next = Math.min(base, maxBoardByWidth, maxBoardByHeight)
  return Math.max(MIN_CELL_SIZE, next)
}

export function GameBoard({
  board,
  lastMove,
  winningLine,
  hintMove = null,
  hintTone = null,
  hintAltMove = null,
  hintAltTone = null,
  currentPlayer,
  onCellClick,
  disabled = false,
  cellSizeOverride,
  themeConfig: externalThemeConfig,
}: BoardProps) {
  const { currentBoardTheme, equippedStoneEffect } = useRank()
  const themeConfig = externalThemeConfig || getBoardTheme(currentBoardTheme)

  const [cellSize, setCellSize] = useState(() => calcResponsiveCellSize())
  const [cursor, setCursor] = useState<Position>({ row: 7, col: 7 })
  const gridRef = useRef<HTMLDivElement>(null)

  const resolvedCellSize = Math.max(MIN_CELL_SIZE, Math.floor(cellSizeOverride ?? cellSize))
  const margin = resolvedCellSize

  useEffect(() => {
    if (cellSizeOverride != null) return
    const handleResize = () => setCellSize(calcResponsiveCellSize())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [cellSizeOverride])

  const isWinningIntersection = useCallback(
    (row: number, col: number) => winningLine?.some((pos) => pos.row === row && pos.col === col) ?? false,
    [winningLine]
  )
  const isLastMoveIntersection = useCallback(
    (row: number, col: number) => lastMove?.row === row && lastMove?.col === col,
    [lastMove]
  )

  const canShowHint =
    !!hintMove &&
    hintMove.row >= 0 &&
    hintMove.row < BOARD_SIZE &&
    hintMove.col >= 0 &&
    hintMove.col < BOARD_SIZE &&
    board[hintMove.row][hintMove.col] === null

  const canShowHintAlt =
    !!hintAltMove &&
    hintAltMove.row >= 0 &&
    hintAltMove.row < BOARD_SIZE &&
    hintAltMove.col >= 0 &&
    hintAltMove.col < BOARD_SIZE &&
    board[hintAltMove.row][hintAltMove.col] === null &&
    (!hintMove || hintAltMove.row !== hintMove.row || hintAltMove.col !== hintMove.col)

  const focusCell = useCallback((pos: Position) => {
    const el = gridRef.current?.querySelector<HTMLElement>(`[data-row="${pos.row}"][data-col="${pos.col}"]`)
    el?.focus()
  }, [])

  const handleCellClick = useCallback((row: number, col: number) => {
    setCursor({ row, col })
    onCellClick(row, col)
  }, [onCellClick])

  const handleCellFocus = useCallback((row: number, col: number) => {
    setCursor({ row, col })
  }, [])

  const handleGridKeyDownCapture = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
      e.preventDefault()
    }

    if (e.key === 'Enter' || e.key === ' ') {
      const active = document.activeElement as HTMLElement | null
      const rowAttr = active?.getAttribute('data-row')
      const colAttr = active?.getAttribute('data-col')
      const row = rowAttr != null ? Number(rowAttr) : cursor.row
      const col = colAttr != null ? Number(colAttr) : cursor.col
      if (!board[row][col]) onCellClick(row, col)
      return
    }

    const next: Position = { ...cursor }
    if (e.key === 'ArrowUp') next.row = Math.max(0, next.row - 1)
    if (e.key === 'ArrowDown') next.row = Math.min(BOARD_SIZE - 1, next.row + 1)
    if (e.key === 'ArrowLeft') next.col = Math.max(0, next.col - 1)
    if (e.key === 'ArrowRight') next.col = Math.min(BOARD_SIZE - 1, next.col + 1)
    if (next.row !== cursor.row || next.col !== cursor.col) {
      setCursor(next)
      requestAnimationFrame(() => focusCell(next))
    }
  }, [board, cursor, disabled, focusCell, onCellClick])

  useEffect(() => {
    if (disabled) return
    requestAnimationFrame(() => focusCell(cursor))
  }, [cursor, disabled, focusCell])

  const boardPixelSize = (BOARD_SIZE - 1) * resolvedCellSize + margin * 2
  const framePadding = resolvedCellSize <= 20 ? 6 : resolvedCellSize <= 22 ? 7 : 8
  const useGreenBoard = !externalThemeConfig && currentBoardTheme === 'default'

  const frameStyle = {
    background: useGreenBoard
      ? 'linear-gradient(165deg, #1f945c 0%, #17764a 100%)'
      : (themeConfig.backgroundGradient || themeConfig.boardBg),
    border: useGreenBoard ? '1px solid rgba(164, 231, 200, 0.28)' : '1px solid rgba(11, 95, 165, 0.12)',
    boxShadow: useGreenBoard
      ? '0 18px 40px rgba(4, 34, 22, 0.38), inset 0 1px 0 rgba(255,255,255,0.08)'
      : '0 18px 36px rgba(18, 59, 91, 0.16), inset 0 1px 0 rgba(255,255,255,0.18)',
  } as CSSProperties

  const innerStyle = {
    background: useGreenBoard ? 'linear-gradient(180deg, #1b8f58 0%, #197f4e 100%)' : 'rgba(255,255,255,0.08)',
    border: useGreenBoard ? '1px solid rgba(174, 236, 206, 0.3)' : '1px solid rgba(255,255,255,0.16)',
    borderRadius: 16,
    boxShadow: useGreenBoard ? 'inset 0 0 0 1px rgba(255,255,255,0.05)' : 'inset 0 0 0 1px rgba(0,0,0,0.04)',
  } as CSSProperties

  const lineColor = useGreenBoard ? 'rgba(229, 255, 242, 0.58)' : themeConfig.lineColor
  const starColor = useGreenBoard ? 'rgba(205, 243, 222, 0.78)' : themeConfig.starColor

  return (
    <div className="relative overflow-visible w-full" style={{ ...frameStyle, padding: framePadding, borderRadius: 24 }}>
      <div
        ref={gridRef}
        className="relative mx-auto"
        style={{ width: boardPixelSize, height: boardPixelSize, ...innerStyle }}
        role="grid"
        aria-label="五子棋棋盘"
        tabIndex={disabled ? -1 : 0}
        onKeyDownCapture={handleGridKeyDownCapture}
      >
        <svg className="absolute inset-0 pointer-events-none" width={boardPixelSize} height={boardPixelSize} aria-hidden="true">
          {Array.from({ length: BOARD_SIZE }).map((_, i) => (
            <g key={i}>
              <line
                x1={margin}
                y1={margin + i * resolvedCellSize}
                x2={boardPixelSize - margin}
                y2={margin + i * resolvedCellSize}
                stroke={lineColor}
                strokeWidth={resolvedCellSize < 30 ? 1 : 1.5}
              />
              <line
                x1={margin + i * resolvedCellSize}
                y1={margin}
                x2={margin + i * resolvedCellSize}
                y2={boardPixelSize - margin}
                stroke={lineColor}
                strokeWidth={resolvedCellSize < 30 ? 1 : 1.5}
              />
            </g>
          ))}

          {[
            [3, 3], [3, 7], [3, 11],
            [7, 3], [7, 7], [7, 11],
            [11, 3], [11, 7], [11, 11],
          ].map(([row, col], idx) => (
            <circle
              key={idx}
              cx={margin + col * resolvedCellSize}
              cy={margin + row * resolvedCellSize}
              r={resolvedCellSize < 30 ? 3.5 : 4.5}
              fill={starColor}
              opacity={0.9}
            />
          ))}
        </svg>

        <AnimatePresence>
          {winningLine && winningLine.length >= 2 && (
            <svg className="absolute inset-0 pointer-events-none" width={boardPixelSize} height={boardPixelSize} aria-hidden="true">
              <motion.line
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                x1={margin + winningLine[0].col * resolvedCellSize}
                y1={margin + winningLine[0].row * resolvedCellSize}
                x2={margin + winningLine[winningLine.length - 1].col * resolvedCellSize}
                y2={margin + winningLine[winningLine.length - 1].row * resolvedCellSize}
                stroke="#f5c451"
                strokeWidth={resolvedCellSize < 30 ? 4 : 6}
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 6px rgba(245, 196, 81, 0.74))' }}
              />
            </svg>
          )}
        </AnimatePresence>

        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <Intersection
              key={`${rowIndex}-${colIndex}`}
              row={rowIndex}
              col={colIndex}
              cell={cell}
              isLastMove={isLastMoveIntersection(rowIndex, colIndex)}
              isWinning={isWinningIntersection(rowIndex, colIndex)}
              isHint={Boolean(canShowHint && hintMove && hintMove.row === rowIndex && hintMove.col === colIndex)}
              hintTone={hintTone}
              isHintSecondary={Boolean(canShowHintAlt && hintAltMove && hintAltMove.row === rowIndex && hintAltMove.col === colIndex)}
              hintSecondaryTone={hintAltTone}
              stoneEffect={equippedStoneEffect}
              currentPlayer={currentPlayer}
              disabled={disabled}
              cellSize={resolvedCellSize}
              margin={margin}
              tabIndex={disabled ? -1 : rowIndex === cursor.row && colIndex === cursor.col ? 0 : -1}
              onIntersectionClick={handleCellClick}
              onIntersectionFocus={handleCellFocus}
            />
          ))
        )}
      </div>
    </div>
  )
}
