'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Bot, Trophy, UserRound, Users } from 'lucide-react'
import fusion from '@/app/fusion-ui-preview/FusionUIPreview.module.css'
import { useGameFlow } from '@/context/GameFlowContext'
import { useSoundContext } from '@/context/SoundContext'

type ModeOption = 'pvc' | 'pvp' | 'multiplayer'

function StoneDot({ color }: { color: 'black' | 'white' }) {
  return <span className={`${fusion.stoneDot} ${color === 'black' ? fusion.blackDot : fusion.whiteDot}`} aria-hidden="true" />
}

export default function ModeBackupPage() {
  const router = useRouter()
  const { mode, setMode, difficulty, setDifficulty, playerSide, setPlayerSide } = useGameFlow()
  const { playClick, playDifficultyPick, playSidePick, playError } = useSoundContext()

  const activeMode: ModeOption = (mode ?? 'pvc') as ModeOption

  const modeItems = useMemo(
    () => [
      { key: 'pvc' as const, title: '人机对战', copy: '与 AI 对弈，可选执子与难度', icon: Bot },
      { key: 'multiplayer' as const, title: '好友房', copy: '创建或加入房间，和朋友在线下棋', icon: Users },
      { key: 'pvp' as const, title: '本地对弈', copy: '同屏双人轮流落子', icon: UserRound },
    ],
    []
  )

  const difficultyItems = [
    { key: 'easy', label: '新手' },
    { key: 'medium', label: '进阶' },
    { key: 'hard', label: '大师' },
  ] as const

  const canStart = activeMode !== 'pvc' || playerSide !== null

  const handleStart = () => {
    if (!canStart) {
      playError()
      return
    }

    playClick()
    if (activeMode === 'multiplayer') {
      router.push('/multiplayer')
      return
    }

    router.push('/game')
  }

  return (
    <main className={`${fusion.page} pt-safe-top pb-safe-bottom`}>
      <div style={{ maxWidth: 430, margin: '0 auto', padding: '0 12px 20px' }}>
        <div className={fusion.content} style={{ display: 'grid', gap: 10, alignContent: 'start', paddingBottom: 20 }}>
          <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.05 }}>弈境</h1>
            <button className={fusion.chip} type="button" onClick={() => router.push('/rank')}>
              <Trophy size={14} style={{ marginRight: 6 }} />
              排位
            </button>
          </section>

          <section className={fusion.glassCard} style={{ paddingRight: 116, marginBottom: 0 }}>
            <h2 style={{ fontSize: 50, lineHeight: 0.9 }}>来局五子棋</h2>
            <p>先手争势，连五即胜。可选人机、好友房或排位挑战。</p>
            <div className={fusion.miniBoard} aria-hidden="true" />
          </section>

          <section className={fusion.modeList} aria-label="对局模式">
            {modeItems.map((item) => {
              const active = activeMode === item.key
              const Icon = item.icon

              return (
                <button
                  key={item.key}
                  className={`${fusion.modeCard} ${active ? fusion.modeCardActive : ''}`}
                  type="button"
                  onClick={() => {
                    setMode(item.key)
                    playClick()
                  }}
                >
                  <div className={fusion.modeIcon}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                  </div>
                  <span className={`${fusion.radio} ${active ? '' : fusion.radioOff}`} aria-hidden="true" />
                </button>
              )
            })}
          </section>

          {activeMode === 'pvc' && (
            <section className={fusion.panel} style={{ marginTop: 0 }}>
              <h3>对局设置</h3>

              <div style={{ marginTop: 10 }}>
                <div style={{ marginBottom: 8, color: '#123b5b', fontSize: 15, fontWeight: 900 }}>难度</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  {difficultyItems.map((item) => {
                    const active = difficulty === item.key

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setDifficulty(item.key)
                          playDifficultyPick()
                        }}
                        className={fusion.choice}
                        style={{
                          position: 'relative',
                          overflow: 'hidden',
                          minHeight: 56,
                          borderRadius: 12,
                          background: 'rgba(255,255,255,0.84)',
                          borderColor: active ? 'rgba(11,95,165,0.42)' : 'rgba(11,95,165,0.14)',
                          boxShadow: active ? '0 8px 16px rgba(11,95,165,0.16)' : 'none',
                          gap: 7,
                          padding: '0 8px',
                        }}
                        aria-pressed={active}
                      >
                        {active && (
                          <motion.span
                            layoutId="difficulty-active-pill"
                            transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.75 }}
                            style={{
                              position: 'absolute',
                              inset: 2,
                              borderRadius: 10,
                              background: 'linear-gradient(135deg, rgba(11,95,165,0.2), rgba(22,114,71,0.18))',
                              boxShadow: 'inset 0 0 0 1px rgba(11,95,165,0.24)',
                            }}
                            aria-hidden="true"
                          />
                        )}
                        <span
                          aria-hidden="true"
                          style={{
                            position: 'relative',
                            zIndex: 1,
                            width: 10,
                            height: 10,
                            borderRadius: 3,
                            background: active ? '#0b5fa5' : 'rgba(11,95,165,0.42)',
                            boxShadow: active ? '0 0 0 2px rgba(11,95,165,0.22)' : 'none',
                          }}
                        />
                        <span style={{ position: 'relative', zIndex: 1, fontSize: 14, fontWeight: 900, color: '#123b5b' }}>
                          {item.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className={fusion.choiceGrid}>
                <button
                  type="button"
                  className={`${fusion.choice} ${playerSide === 'black' ? fusion.choiceActive : ''}`}
                  onClick={() => {
                    setPlayerSide('black')
                    playSidePick()
                  }}
                >
                  <StoneDot color="black" />
                  执黑（先手）
                </button>
                <button
                  type="button"
                  className={`${fusion.choice} ${playerSide === 'white' ? fusion.choiceActive : ''}`}
                  onClick={() => {
                    setPlayerSide('white')
                    playSidePick()
                  }}
                >
                  <StoneDot color="white" />
                  执白（后手）
                </button>
              </div>
            </section>
          )}

          <div style={{ marginTop: 2, paddingBottom: 4 }}>
            <button
              className={canStart ? fusion.buttonPrimary : `${fusion.buttonSecondary} ${fusion.buttonLight}`}
              type="button"
              onClick={handleStart}
              disabled={!canStart}
              aria-disabled={!canStart}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                minHeight: 52,
                marginTop: 0,
                opacity: canStart ? 1 : 0.72,
                cursor: canStart ? 'pointer' : 'not-allowed',
              }}
            >
              {activeMode === 'multiplayer' ? '进入好友房' : '开始对局'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
