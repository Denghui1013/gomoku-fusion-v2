'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Player, StoneEffect } from '@/types'
import { scaleIn, springTransition } from '@/styles/animations'

interface StoneProps {
  player: Player
  isLastMove?: boolean
  isWinning?: boolean
  size?: number
  stoneEffect?: StoneEffect
}

export function Stone({ player, isLastMove = false, isWinning = false, size = 32, stoneEffect = 'none' }: StoneProps) {
  const shadowSize = Math.max(2, Math.floor(size * 0.08))
  const innerHighlight = Math.max(1, Math.floor(size * 0.04))
  const markerSize = Math.max(4, Math.floor(size * 0.18))
  const showRewardEffect = isLastMove && stoneEffect !== 'none'
  
  return (
    <motion.div
      data-testid="stone"
      variants={scaleIn}
      initial="initial"
      animate="animate"
      transition={springTransition}
      className={cn(
        'relative rounded-full pointer-events-none',
        'flex items-center justify-center',
        'shrink-0',
        'transition-shadow duration-300',
        player === 'black'
          ? 'bg-gradient-to-br from-gray-600 via-gray-800 to-black'
          : 'bg-gradient-to-br from-white via-gray-50 to-gray-200',
        isLastMove && 'ring-2 ring-yellow-400 ring-offset-1',
        isWinning && 'ring-2 ring-yellow-400 animate-pulse'
      )}
      style={{
        width: size,
        height: size,
        boxShadow: player === 'black'
          ? `inset ${innerHighlight}px ${innerHighlight}px ${shadowSize * 2}px rgba(255,255,255,0.15), inset -${innerHighlight}px -${innerHighlight}px ${shadowSize * 2}px rgba(0,0,0,0.6), 0 ${shadowSize}px ${shadowSize * 2}px rgba(0,0,0,0.3)`
          : `inset ${innerHighlight}px ${innerHighlight}px ${shadowSize * 2}px rgba(255,255,255,0.9), inset -${innerHighlight}px -${innerHighlight}px ${shadowSize * 2}px rgba(0,0,0,0.15), 0 ${shadowSize}px ${shadowSize * 2}px rgba(0,0,0,0.2)`,
      }}
    >
      {showRewardEffect && stoneEffect === 'master-glow' && (
        <motion.span
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size + 12,
            height: size + 12,
            border: '2px solid rgba(245,196,81,0.68)',
            boxShadow: '0 0 14px rgba(245,196,81,0.5), inset 0 0 12px rgba(245,196,81,0.18)',
          }}
          initial={{ scale: 0.72, opacity: 0 }}
          animate={{ scale: [0.86, 1.18, 1.04], opacity: [0, 0.9, 0] }}
          transition={{ duration: 0.86, ease: 'easeOut' }}
        />
      )}

      {showRewardEffect && stoneEffect === 'legend-trail' && (
        <>
          <motion.span
            className="absolute rounded-full pointer-events-none"
            style={{
              width: size + 14,
              height: size + 14,
              border: '2px solid rgba(137,185,255,0.72)',
              boxShadow: '0 0 16px rgba(137,185,255,0.54), 0 0 24px rgba(255,211,107,0.28)',
            }}
            initial={{ scale: 0.7, rotate: -18, opacity: 0 }}
            animate={{ scale: [0.82, 1.2, 1.06], rotate: 18, opacity: [0, 0.95, 0] }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: Math.max(3, Math.floor(size * 0.14)),
                height: Math.max(3, Math.floor(size * 0.14)),
                background: index === 1 ? '#ffd36b' : '#89b9ff',
              }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.6 }}
              animate={{
                x: [0, (index - 1) * size * 0.58],
                y: [0, index === 1 ? -size * 0.54 : size * 0.22],
                opacity: [0, 1, 0],
                scale: [0.6, 1, 0.2],
              }}
              transition={{ duration: 0.76, delay: index * 0.04, ease: 'easeOut' }}
            />
          ))}
        </>
      )}

      {isLastMove && (
        <motion.div
          data-testid="last-move-marker"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            'rounded-full',
            player === 'black' ? 'bg-red-500' : 'bg-red-600'
          )}
          style={{
            width: markerSize,
            height: markerSize,
          }}
        />
      )}
    </motion.div>
  )
}
