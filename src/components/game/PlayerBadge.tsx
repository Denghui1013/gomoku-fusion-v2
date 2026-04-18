'use client'

import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import type { AvatarFrame, Player } from '@/types'

function getAvatarFrameStyle(frame: AvatarFrame): {
  shell: CSSProperties
  ring: CSSProperties
} {
  if (frame === 'diamond-flare') {
    return {
      shell: {
        background: 'linear-gradient(135deg, rgba(226,239,255,0.98), rgba(120,173,255,0.92) 52%, rgba(231,255,250,0.96))',
        boxShadow: '0 0 0 1px rgba(137,185,255,0.28), 0 8px 18px rgba(93,149,255,0.26)',
      },
      ring: {
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.78), 0 0 0 2px rgba(137,185,255,0.18)',
      },
    }
  }

  if (frame === 'silver-trim') {
    return {
      shell: {
        background: 'linear-gradient(135deg, rgba(252,254,255,0.98), rgba(210,220,232,0.98) 52%, rgba(244,248,252,0.98))',
        boxShadow: '0 0 0 1px rgba(176,190,206,0.24), 0 6px 14px rgba(148,163,184,0.18)',
      },
      ring: {
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.82), 0 0 0 2px rgba(215,221,230,0.24)',
      },
    }
  }

  return {
    shell: {
      background: 'transparent',
      boxShadow: 'none',
    },
    ring: {
      boxShadow: 'none',
    },
  }
}

export function AvatarStone({
  player,
  frame = 'none',
  compact = false,
}: {
  player: Player
  frame?: AvatarFrame
  compact?: boolean
}) {
  const shellSize = compact ? 28 : 36
  const stoneSize = compact ? 18 : 24
  const frameStyle = getAvatarFrameStyle(frame)

  return (
    <span
      aria-hidden="true"
      style={{
        width: shellSize,
        height: shellSize,
        borderRadius: 999,
        display: 'inline-grid',
        placeItems: 'center',
        flexShrink: 0,
        ...frameStyle.shell,
      }}
    >
      <span
        style={{
          width: stoneSize,
          height: stoneSize,
          borderRadius: 999,
          display: 'inline-block',
          background:
            player === 'black'
              ? 'radial-gradient(circle at 35% 30%, #5a6170, #111827 62%)'
              : 'radial-gradient(circle at 35% 30%, #ffffff, #d8dde7 68%)',
          border: player === 'white' ? '1px solid #cbd5e1' : 'none',
          boxShadow:
            player === 'black'
              ? 'inset 0 3px 5px rgba(255,255,255,0.08), 0 4px 8px rgba(15,23,42,0.22)'
              : 'inset 0 -3px 5px rgba(15,23,42,0.08), 0 4px 8px rgba(148,163,184,0.2)',
          ...frameStyle.ring,
        }}
      />
    </span>
  )
}

export function PlayerBadge({
  player,
  isActive,
  label,
  name,
  isMe = false,
  compact = false,
  avatarFrame = 'none',
}: {
  player: Player
  isActive: boolean
  label?: string
  name?: string
  isMe?: boolean
  compact?: boolean
  avatarFrame?: AvatarFrame
}) {
  const displayName = name || label || (player === 'black' ? '黑方' : '白方')

  return (
    <div
      className={cn(
        'flex items-center rounded-lg transition-all',
        compact ? 'gap-2 px-2 py-2' : 'gap-3 px-4 py-3',
        isActive ? 'bg-white shadow-lg ring-2 ring-yellow-400' : 'bg-white/50'
      )}
    >
      <AvatarStone player={player} frame={avatarFrame} compact={compact} />
      <div className="min-w-0">
        <div className={cn('font-semibold text-gray-800 truncate flex items-center gap-1', compact ? 'text-sm' : 'text-base')}>
          {displayName}
          {isMe && (
            <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">你</span>
          )}
        </div>
        {isActive && !compact && <div className="text-xs text-gray-500">当前回合</div>}
      </div>
    </div>
  )
}
