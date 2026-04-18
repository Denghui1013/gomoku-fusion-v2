'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { Bot, Swords, Volume2, VolumeX, Trophy, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Difficulty, GameMode } from '@/types'
import { useGameFlow } from '@/context/GameFlowContext'
import { useSoundContext } from '@/context/SoundContext'
import { toast } from '@/components/ui/Toast'
import { getBuildLabel } from '@/lib/buildInfo'

export function ModeScreen({
  onStart,
  onViewRank,
  onMultiplayer,
}: {
  onStart: () => void
  onViewRank?: () => void
  onMultiplayer?: () => void
}) {
  const { mode, setMode, difficulty, setDifficulty, playerSide, setPlayerSide } = useGameFlow()
  const { playClick, playNav, playDifficultyPick, playSidePick, playWarning, playConfirm, isEnabled, setIsEnabled } = useSoundContext()
  const buildLabel = getBuildLabel()

  const items = useMemo(
    () => [
      {
        key: 'pvc' as const,
        title: '人机对战',
        desc: '与 AI 对弈，可选择执子与难度',
        Icon: Bot,
      },
      {
        key: 'multiplayer' as const,
        title: '联机对战',
        desc: '局域网/热点联机，与好友远程对弈',
        Icon: Wifi,
      },
      {
        key: 'pvp' as const,
        title: '玩家对战',
        desc: '本地双人轮流落子，经典对弈体验',
        Icon: Swords,
      },
    ],
    []
  )

  useEffect(() => {
    if (mode == null) setMode('pvc')
  }, [mode, setMode])

  const canStart = useMemo(() => {
    if (mode === 'pvp') return true
    if (mode === 'pvc') return playerSide !== null && difficulty !== null
    if (mode === 'multiplayer') return true
    return false
  }, [mode, playerSide, difficulty])

  const startHint = useMemo(() => {
    if (mode !== 'pvc') return ''
    if (playerSide === null) return '请先选择执子'
    if (difficulty === null) return '请先选择难度'
    return ''
  }, [mode, playerSide, difficulty])

  const start = () => {
    if (!canStart) {
      playWarning()
      if (mode === 'pvc' && playerSide === null) {
        toast('warning', '请选择执子后再开始')
      } else if (mode === 'pvc' && difficulty === null) {
        toast('warning', '请选择难度后再开始')
      }
      return
    }

    if (mode === 'multiplayer') {
      playConfirm()
      onMultiplayer?.()
      return
    }

    playConfirm()
    onStart()
  }

  const handleModeChange = useCallback(
    (newMode: GameMode) => {
      setMode(newMode)
      playClick()
    },
    [setMode, playClick]
  )

  const toggleSound = () => {
    if (isEnabled) {
      setIsEnabled(false)
    } else {
      setIsEnabled(true)
      playClick()
    }
  }

  return (
    <main
      className="min-h-dvh flex flex-col overflow-hidden"
      style={{
        background:
          'radial-gradient(120% 120% at 50% -10%, color-mix(in srgb, var(--primary) 10%, transparent), transparent 55%), var(--background)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rhythm-page pb-8 sm:pb-10 md:pb-6">
        <div className="game-shell w-full max-w-3xl">
          <header className="mb-4 sm:mb-6">
            <div className="game-panel px-4 py-3.5 sm:px-5 sm:py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 pt-0.5">
                <h1 className="brand-title break-words">
                  彦彦的五子棋
                </h1>
                <p className="mt-1 brand-subtitle">
                  选择模式，马上开局
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onViewRank && (
                  <button
                    onClick={() => {
                      playNav()
                      onViewRank()
                    }}
                    className="game-hud-pill h-11 w-11 flex items-center justify-center"
                    aria-label="查看排位"
                  >
                    <Trophy className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                  </button>
                )}
                <button
                  onClick={toggleSound}
                  className="game-hud-pill h-11 w-11 flex items-center justify-center"
                  aria-label={isEnabled ? '关闭音效' : '开启音效'}
                >
                  {isEnabled ? (
                    <Volume2 className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                  ) : (
                    <VolumeX className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                  )}
                </button>
              </div>
            </div>
              <p className="mt-2 text-[11px] sm:text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                支持人机、联机与本地双人对战
              </p>
            </div>
          </header>

          <section className="rhythm-stack mobile-tight">
            {items.map(({ key, title, desc, Icon }) => {
              const active = (mode ?? 'pvc') === key
              return (
                <button
                  key={key}
                  onClick={() => handleModeChange(key)}
                  className={cn(
                    'game-panel w-full text-left p-3.5 sm:p-5 md:p-6 border transition-all duration-200',
                    active
                      ? 'border-[var(--primary)] -translate-y-0.5'
                      : 'border-[var(--card-border)] hover:-translate-y-0.5'
                  )}
                  style={{
                    borderColor: active ? 'var(--primary)' : 'var(--card-border)',
                    boxShadow: active ? '0 14px 28px rgba(59, 130, 246, 0.18)' : '0 6px 18px rgba(15, 23, 42, 0.06)',
                    background: active
                      ? 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 14%, var(--card-bg)) 0%, color-mix(in srgb, var(--primary) 4%, var(--card-bg)) 100%)'
                      : 'color-mix(in srgb, var(--card-bg) 92%, transparent)',
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
                        <span
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            background: active
                              ? 'color-mix(in srgb, var(--primary) 22%, #ffffff)'
                              : 'color-mix(in srgb, var(--primary) 10%, transparent)',
                          }}
                        >
                          <Icon className="w-5 h-5" style={{ color: 'var(--primary)' }} aria-hidden="true" />
                        </span>
                        <div className="text-[1.68rem] sm:text-2xl font-extrabold truncate">{title}</div>
                      </div>
                      <div className="mt-1.5 text-[14px] sm:text-[15px] leading-6" style={{ color: 'var(--text-secondary)' }}>
                        {desc}
                      </div>
                    </div>
                    <div
                      className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center border flex-shrink-0 rounded-full"
                      style={{
                        background: active ? 'var(--primary)' : 'color-mix(in srgb, var(--card-bg) 70%, transparent)',
                        borderColor: active ? 'var(--primary)' : 'var(--card-border)',
                      }}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: active ? '#ffffff' : 'var(--text-tertiary)' }}
                      />
                    </div>
                  </div>
                </button>
              )
            })}
          </section>

          {mode === 'pvc' && (
            <section
              className="game-panel mt-4 p-4 sm:p-5 md:p-6"
              style={{
                background:
                  'linear-gradient(180deg, color-mix(in srgb, var(--card-bg) 96%, #ffffff) 0%, color-mix(in srgb, var(--card-bg) 88%, transparent) 100%)',
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>
                    执子选择
                  </div>
                  <div className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    选择你要使用的棋子颜色
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="text-sm font-semibold shrink-0" style={{ color: 'var(--text-secondary)' }}>
                    难度
                  </div>
                  <select
                    value={difficulty}
                    onChange={(e) => {
                      setDifficulty(e.target.value as Difficulty)
                      playDifficultyPick()
                    }}
                    className="h-11 sm:h-12 w-full sm:w-auto sm:min-w-[112px] px-4 text-sm font-semibold border cursor-pointer rounded-xl"
                    style={{
                      background: 'color-mix(in srgb, var(--card-bg) 92%, transparent)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--card-border)',
                    }}
                    aria-label="选择 AI 难度"
                  >
                    <option value="easy">新手</option>
                    <option value="medium">进阶</option>
                    <option value="hard">大师</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setPlayerSide('black')
                    playSidePick()
                  }}
                  className="game-btn h-[3.75rem] sm:h-16 border-2 flex items-center justify-center gap-3"
                  style={{
                    background:
                      playerSide === 'black'
                        ? 'linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 78%, #1d4ed8) 100%)'
                        : 'var(--card-bg)',
                    borderColor: playerSide === 'black' ? 'color-mix(in srgb, var(--primary) 70%, #1d4ed8)' : 'var(--card-border)',
                  }}
                  aria-pressed={playerSide === 'black'}
                >
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 via-gray-900 to-black" />
                  <span className="text-base font-semibold" style={{ color: playerSide === 'black' ? '#ffffff' : 'var(--text-primary)' }}>
                    执黑（先手）
                  </span>
                </button>
                <button
                  onClick={() => {
                    setPlayerSide('white')
                    playSidePick()
                  }}
                  className="game-btn h-[3.75rem] sm:h-16 border-2 flex items-center justify-center gap-3"
                  style={{
                    background:
                      playerSide === 'white'
                        ? 'linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 78%, #1d4ed8) 100%)'
                        : 'var(--card-bg)',
                    borderColor: playerSide === 'white' ? 'color-mix(in srgb, var(--primary) 70%, #1d4ed8)' : 'var(--card-border)',
                  }}
                  aria-pressed={playerSide === 'white'}
                >
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-white via-gray-100 to-gray-300 border" style={{ borderColor: 'var(--card-border)' }} />
                  <span className="text-base font-semibold" style={{ color: playerSide === 'white' ? '#ffffff' : 'var(--text-primary)' }}>
                    执白（后手）
                  </span>
                </button>
              </div>
            </section>
          )}
        </div>
      </div>

      <div
        className="relative left-0 right-0 bottom-0 z-20 bottom-action-bar shrink-0"
        style={{
          background: 'color-mix(in srgb, var(--background) 92%, transparent)',
          paddingBottom: 'max(0.9rem, env(safe-area-inset-bottom, 0px))',
          boxShadow: '0 -8px 24px color-mix(in srgb, var(--primary) 8%, transparent)',
        }}
      >
        <div className="game-shell max-w-3xl px-4 md:px-6 py-3.5">
          <button
            onClick={start}
            disabled={!canStart}
            className={cn(
              'game-btn w-full h-14 font-extrabold tracking-wide',
              canStart ? 'game-btn-primary' : 'game-btn-secondary opacity-60 cursor-not-allowed'
            )}
            aria-describedby={!canStart && startHint ? 'start-game-hint' : undefined}
          >
            开始游戏
          </button>
          {!canStart && startHint && (
            <p
              id="start-game-hint"
              className="mt-2 text-xs text-center"
              style={{ color: 'var(--text-secondary)' }}
              aria-live="polite"
            >
              {startHint}
            </p>
          )}
          <p className="mt-2 text-center text-[11px] font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
            构建版本 {buildLabel}
          </p>
        </div>
      </div>
    </main>
  )
}
