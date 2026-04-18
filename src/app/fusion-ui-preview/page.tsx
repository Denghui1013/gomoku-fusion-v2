'use client'

import { useCallback, useRef, useState } from 'react'
import styles from './FusionUIPreview.module.css'

type PreviewSound = 'nav' | 'place' | 'win' | 'defeat' | 'room' | 'secret'

type PlayPreviewSound = (sound: PreviewSound) => void

const boardStars = [
  ['26%', '26%'],
  ['50%', '26%'],
  ['74%', '26%'],
  ['26%', '50%'],
  ['50%', '50%'],
  ['74%', '50%'],
  ['26%', '74%'],
  ['50%', '74%'],
  ['74%', '74%'],
]

const stones = [
  { color: 'black', left: '50%', top: '50%', delay: '0ms' },
  { color: 'white', left: '57%', top: '43%', delay: '120ms' },
  { color: 'black', left: '43%', top: '50%', delay: '220ms' },
  { color: 'white', left: '57%', top: '50%', delay: '320ms' },
  { color: 'black', left: '36%', top: '50%', delay: '420ms' },
  { color: 'white', left: '64%', top: '57%', delay: '520ms' },
  { color: 'black', left: '29%', top: '50%', delay: '620ms', last: true },
]

const settlementCards = [
  {
    title: '漂亮一局',
    copy: '黑方连成五子，用 23 手结束战斗。',
    kind: 'victory',
    character: 'black',
    ring: '',
    stats: [
      ['总用时', '01:42'],
      ['连胜', '4'],
      ['段位分', '+18'],
      ['评级', 'A+'],
    ],
    primary: '再来一局',
    secondary: '回到首页',
  },
  {
    title: '差一点点',
    copy: '白方斜线成五，下次优先封住右上活口。',
    kind: 'defeat',
    character: 'black',
    ring: styles.ringDanger,
    dark: true,
    sad: true,
    stats: [
      ['总步数', '31'],
      ['防守点', '2'],
      ['段位分', '-8'],
      ['复盘', '3 手'],
    ],
    primary: '复盘关键手',
    secondary: '再来一局',
  },
  {
    title: '平分秋色',
    copy: '棋盘填满仍未分胜负，这是一场稳健的防守局。',
    kind: 'draw',
    character: 'white',
    ring: styles.ringInfo,
    stats: [
      ['总步数', '225'],
      ['总用时', '08:14'],
      ['段位分', '+2'],
      ['评级', 'B'],
    ],
    primary: '换先再战',
    secondary: '保存棋谱',
  },
  {
    title: '升至黄金',
    copy: '连续胜利让你跨过新段位，下一站是铂金。',
    kind: 'rank',
    character: 'medal',
    ring: styles.ringGold,
    stats: [
      ['当前段位', '黄金'],
      ['星数', '1 / 5'],
      ['连胜奖励', '+6'],
      ['新棋盘', '已解锁'],
    ],
    primary: '继续挑战',
    secondary: '查看段位',
    rank: true,
  },
]

type TierKey = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master'

const tierThemes: Record<
  TierKey,
  {
    shell: string
    rim: string
    core: string
    ribbon: string
    gem: string
    text: string
  }
> = {
  bronze: {
    shell: '#d6b08b',
    rim: '#a86e47',
    core: '#f5dfc0',
    ribbon: '#7fb1ff',
    gem: '#94bfff',
    text: '#72452b',
  },
  silver: {
    shell: '#d7dde6',
    rim: '#98a4b4',
    core: '#f8fbff',
    ribbon: '#78abff',
    gem: '#bdd5ff',
    text: '#5c6776',
  },
  gold: {
    shell: '#f4c148',
    rim: '#d08a00',
    core: '#fff0bf',
    ribbon: '#6ca6ff',
    gem: '#ffe07f',
    text: '#7c5700',
  },
  platinum: {
    shell: '#88d4d7',
    rim: '#3b9da5',
    core: '#dff8f9',
    ribbon: '#77a9ff',
    gem: '#94eef2',
    text: '#266c73',
  },
  diamond: {
    shell: '#89b9ff',
    rim: '#4774d8',
    core: '#e7f0ff',
    ribbon: '#8fb9ff',
    gem: '#9be7ff',
    text: '#3257ab',
  },
  master: {
    shell: '#ffb48a',
    rim: '#e4673a',
    core: '#fff1e8',
    ribbon: '#ffd36b',
    gem: '#ff8d67',
    text: '#a64327',
  },
}

const tiers = [
  { key: 'bronze' as TierKey, name: '青铜', copy: '入门棋手', score: '0', level: 1, stage: '3 星升段' },
  { key: 'silver' as TierKey, name: '白银', copy: '稳定防守', score: '300', level: 2, stage: '3 星升段' },
  { key: 'gold' as TierKey, name: '黄金', copy: '当前段位', score: '620', level: 3, stage: '4 星升段' },
  { key: 'platinum' as TierKey, name: '铂金', copy: '连续压迫', score: '900', level: 4, stage: '4 星升段' },
  { key: 'diamond' as TierKey, name: '钻石', copy: '布局大师', score: '1280', level: 5, stage: '5 星升段' },
  { key: 'master' as TierKey, name: '大师', copy: '高阶对局', score: '1600', level: 6, stage: '5 星升段' },
]

const soundSamples: Array<[PreviewSound, string, string]> = [
  ['place', '落子', '短促木质触感'],
  ['room', '好友加入', '轻提示，不抢戏'],
  ['win', '胜利', '奖励感更完整'],
  ['defeat', '失败', '低频下行收束'],
  ['secret', '彩蛋', '徽章闪光尾音'],
]

function usePreviewAudio(enabled: boolean) {
  const audioRef = useRef<AudioContext | null>(null)
  const htmlAudioRef = useRef<Partial<Record<PreviewSound, HTMLAudioElement>>>({})
  const placeVariantRef = useRef(0)

  const assetMap: Record<PreviewSound, string> = {
    nav: '/audio/gomoku/ui-tap.ogg',
    place: '',
    room: '/audio/gomoku/friend-join.ogg',
    win: '/audio/gomoku/rank-up.ogg',
    defeat: '/audio/gomoku/defeat.ogg',
    secret: '/audio/gomoku/rank-up.ogg',
  }

  const placeAssets = ['/audio/gomoku/place-stone-primary.ogg', '/audio/gomoku/place-stone-soft.ogg']

  const playAudioFile = useCallback(
    async (sound: PreviewSound, options?: { volume?: number; playbackRate?: number }) => {
      if (typeof window === 'undefined') return false

      const src =
        sound === 'place'
          ? placeAssets[placeVariantRef.current % placeAssets.length]
          : assetMap[sound]
      if (!src) return false

      if (sound === 'place') {
        placeVariantRef.current += 1
      }

      let baseAudio = htmlAudioRef.current[sound]
      if (!baseAudio || baseAudio.src !== new URL(src, window.location.origin).href) {
        baseAudio = new Audio(src)
        baseAudio.preload = 'auto'
        htmlAudioRef.current[sound] = baseAudio
      }

      const player = baseAudio.cloneNode() as HTMLAudioElement
      player.volume = options?.volume ?? 0.84
      player.playbackRate = options?.playbackRate ?? 1

      try {
        await player.play()
        return true
      } catch {
        return false
      }
    },
    [],
  )

  const getAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null
    if (!audioRef.current) {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtor) return null
      audioRef.current = new AudioCtor()
    }
    if (audioRef.current.state === 'suspended') {
      void audioRef.current.resume()
    }
    return audioRef.current
  }, [])

  const playTone = useCallback(
    (
      ctx: AudioContext,
      frequency: number,
      delay = 0,
      duration = 0.16,
      type: OscillatorType = 'sine',
      volume = 0.12,
    ) => {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = ctx.currentTime + delay
      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, start)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start(start)
      oscillator.stop(start + duration + 0.02)
    },
    [],
  )

  const playNoise = useCallback((ctx: AudioContext, delay = 0, duration = 0.06, volume = 0.08) => {
    const samples = Math.max(1, Math.floor(ctx.sampleRate * duration))
    const buffer = ctx.createBuffer(1, samples, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < samples; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / samples)
    }

    const source = ctx.createBufferSource()
    const filter = ctx.createBiquadFilter()
    const gain = ctx.createGain()
    const start = ctx.currentTime + delay
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(520, start)
    filter.Q.setValueAtTime(6, start)
    gain.gain.setValueAtTime(volume, start)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    source.buffer = buffer
    source.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    source.start(start)
  }, [])

  return useCallback(
    async (sound: PreviewSound) => {
      if (!enabled) return

      if (sound === 'place') {
        const played = await playAudioFile('place', { volume: 0.92 })
        if (played) return
      } else if (sound === 'nav') {
        const played = await playAudioFile('nav', { volume: 0.78 })
        if (played) return
      } else if (sound === 'room') {
        const played = await playAudioFile('room', { volume: 0.78 })
        if (played) return
      } else if (sound === 'win') {
        const played = await playAudioFile('win', { volume: 0.78, playbackRate: 1.04 })
        if (played) return
      } else if (sound === 'defeat') {
        const played = await playAudioFile('defeat', { volume: 0.72 })
        if (played) return
      } else if (sound === 'secret') {
        const played = await playAudioFile('secret', { volume: 0.8, playbackRate: 1.08 })
        if (played) return
      }

      const ctx = getAudioContext()
      if (!ctx) return

      if (sound === 'place') {
        playNoise(ctx, 0, 0.055, 0.09)
        playTone(ctx, 216, 0.015, 0.09, 'triangle', 0.08)
        return
      }

      if (sound === 'room') {
        playTone(ctx, 620, 0, 0.11, 'sine', 0.08)
        playTone(ctx, 930, 0.08, 0.16, 'sine', 0.06)
        return
      }

      if (sound === 'win') {
        ;[523, 659, 784, 1047].forEach((note, index) => {
          playTone(ctx, note, index * 0.09, 0.18, 'triangle', 0.1)
        })
        return
      }

      if (sound === 'defeat') {
        ;[392, 330, 262].forEach((note, index) => {
          playTone(ctx, note, index * 0.14, 0.26, 'triangle', 0.09)
        })
        return
      }

      if (sound === 'secret') {
        ;[784, 988, 1175, 1568].forEach((note, index) => {
          playTone(ctx, note, index * 0.075, 0.2, 'sine', 0.09)
        })
        return
      }

      playTone(ctx, 740, 0, 0.08, 'sine', 0.06)
    },
    [enabled, getAudioContext, playAudioFile, playNoise, playTone],
  )
}

function StatusBar() {
  return (
    <div className={styles.status}>
      <span>9:41</span>
      <span className={styles.statusIcons}>
        <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
          <path
            d="M1 11h2V8H1v3Zm5 0h2V6H6v5Zm5 0h2V4h-2v7Zm5 0h2V1h-2v10Z"
            fill="currentColor"
          />
        </svg>
        <span className={styles.battery} aria-hidden="true">
          <span className={styles.batteryFill} />
        </span>
      </span>
    </div>
  )
}

function BoardIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
      <rect x="4" y="4" width="22" height="22" rx="6" fill="#fff" />
      <path
        d="M10 8v14M15 8v14M20 8v14M8 10h14M8 15h14M8 20h14"
        stroke="#0b5fa5"
        strokeWidth="1.4"
      />
      <circle cx="15" cy="15" r="3.2" fill="#167247" />
    </svg>
  )
}

function ModeIcon({ type }: { type: 'ai' | 'local' | 'friend' }) {
  if (type === 'ai') {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <rect x="6" y="8" width="16" height="13" rx="4" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M14 5v3M10 21v2M18 21v2" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
        <circle cx="11" cy="14" r="1.7" fill="currentColor" />
        <circle cx="17" cy="14" r="1.7" fill="currentColor" />
        <path d="M11 18h6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      </svg>
    )
  }

  if (type === 'local') {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <circle cx="10" cy="10" r="5" fill="currentColor" opacity=".9" />
        <circle cx="18" cy="18" r="5" fill="none" stroke="currentColor" strokeWidth="2.2" />
      </svg>
    )
  }

  if (type === 'friend') {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <path
          d="M6 20c2.2-4 5-6.1 8-6.1S19.8 16 22 20"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
        <circle cx="14" cy="9" r="4.2" fill="currentColor" opacity=".9" />
      </svg>
    )
  }

  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="10" cy="10" r="5" fill="currentColor" opacity=".9" />
      <circle cx="18" cy="18" r="5" fill="none" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  )
}

function StoneDot({ color }: { color: 'black' | 'white' }) {
  return (
    <span
      className={`${styles.stoneDot} ${color === 'black' ? styles.blackDot : styles.whiteDot}`}
      aria-hidden="true"
    />
  )
}

function ModePreview({ playSound }: { playSound: PlayPreviewSound }) {
  const modes = [
    {
      title: '人机对战',
      copy: '与 AI 对弈，可选择执子与难度。',
      icon: 'ai' as const,
      active: true,
    },
    {
      title: '好友房',
      copy: '创建房间，分享房号给朋友。',
      icon: 'friend' as const,
      active: false,
    },
    {
      title: '本地对弈',
      copy: '同一台设备上轮流落子。',
      icon: 'local' as const,
      active: false,
    },
  ]

  return (
    <article className={styles.phone} aria-label="融合版模式选择预览">
      <div className={styles.screen}>
        <div className={styles.content}>
          <StatusBar />

          <section className={styles.glassCard}>
            <h2>今天开一局</h2>
            <p>保留软萌氛围，但把棋局入口做得更直接。</p>
            <span className={styles.miniBoard} aria-hidden="true" />
          </section>

          <section className={styles.modeList} aria-label="对局模式">
            {modes.map((mode) => (
              <button
                key={mode.title}
                className={`${styles.modeCard} ${mode.active ? styles.modeCardActive : ''}`}
                type="button"
                onClick={() => playSound(mode.active ? 'place' : 'nav')}
              >
                <div className={styles.modeIcon}>
                  <ModeIcon type={mode.icon} />
                </div>
                <div>
                  <h3>{mode.title}</h3>
                  <p>{mode.copy}</p>
                </div>
                <span className={`${styles.radio} ${mode.active ? '' : styles.radioOff}`} aria-hidden="true" />
              </button>
            ))}
          </section>

          <section className={styles.panel}>
            <h3>棋局设置</h3>
            <p>首屏收紧，开始按钮更早可见。</p>
            <div className={styles.settingRow}>
              <span>难度</span>
              <strong>新手</strong>
            </div>
            <div className={styles.settingRow}>
              <span>棋盘</span>
              <strong>15 × 15</strong>
            </div>
            <div className={styles.choiceGrid}>
              <div className={`${styles.choice} ${styles.choiceActive}`}>
                <StoneDot color="black" />
                执黑
              </div>
              <div className={styles.choice}>
                <StoneDot color="white" />
                执白
              </div>
            </div>
            <button className={styles.buttonPrimary} type="button" onClick={() => playSound('place')}>
              开始对局
            </button>
          </section>
        </div>
      </div>
    </article>
  )
}

function GamePreview({ playSound }: { playSound: PlayPreviewSound }) {
  return (
    <article className={styles.phone} aria-label="融合版对局页预览">
      <div className={`${styles.screen} ${styles.gameScreen}`}>
        <div className={styles.content}>
          <StatusBar />

          <section className={styles.gameHud} aria-label="对局状态">
            <div className={`${styles.player} ${styles.playerActive}`}>
              <StoneDot color="black" />
              黑方
            </div>
            <div className={styles.timer}>00:27</div>
            <div className={styles.player}>
              <StoneDot color="white" />
              白方
            </div>
          </section>

          <section className={styles.boardShell}>
            <div className={styles.board} aria-label="15乘15五子棋棋盘">
              {boardStars.map(([left, top], index) => (
                <span key={`${left}-${top}`} className={styles.star} style={{ left, top }} />
              ))}
              {stones.map((stone) => (
                <span
                  key={`${stone.left}-${stone.top}`}
                  className={`${styles.stone} ${
                    stone.color === 'black' ? styles.blackStone : styles.whiteStone
                  } ${stone.last ? styles.lastStone : ''}`}
                  style={{ left: stone.left, top: stone.top, animationDelay: stone.delay }}
                />
              ))}
              <span className={styles.winLine} aria-hidden="true" />
            </div>
          </section>

          <section className={styles.gameCard}>
            <h2>黑方形成四连</h2>
            <p>对局页切到策略层，棋盘更大，装饰退后。</p>
            <div className={styles.buttonGrid}>
              <button className={styles.buttonSecondary} type="button" onClick={() => playSound('nav')}>
                悔棋
              </button>
              <button className={styles.buttonDanger} type="button" onClick={() => playSound('defeat')}>
                认输
              </button>
            </div>
            <button className={styles.buttonPrimary} type="button" onClick={() => playSound('room')}>
              提示一手
            </button>
          </section>
        </div>
      </div>
    </article>
  )
}

function SettlementArt({
  kind,
  confetti,
}: {
  kind: string
  confetti?: boolean
}) {
  const isRank = kind === 'rank'
  const glowClass =
    kind === 'defeat'
      ? styles.settlementGlowDanger
      : kind === 'draw'
        ? styles.settlementGlowInfo
        : kind === 'rank'
          ? styles.settlementGlowGold
          : ''
  const lineClass =
    kind === 'defeat'
      ? styles.settlementLineDanger
      : kind === 'draw'
        ? styles.settlementLineInfo
        : ''
  const label =
    kind === 'defeat'
      ? '关键一手'
      : kind === 'draw'
        ? '稳健防守'
        : kind === 'rank'
          ? '段位提升'
          : '五子连线'

  const boardPositions =
    kind === 'defeat'
      ? [
          { color: 'white', left: '24%', top: '68%' },
          { color: 'white', left: '36%', top: '56%' },
          { color: 'white', left: '48%', top: '44%' },
          { color: 'white', left: '60%', top: '32%' },
          { color: 'white', left: '72%', top: '20%' },
          { color: 'black', left: '48%', top: '68%' },
        ]
      : kind === 'draw'
        ? [
            { color: 'black', left: '36%', top: '36%' },
            { color: 'white', left: '48%', top: '36%' },
            { color: 'black', left: '60%', top: '36%' },
            { color: 'white', left: '36%', top: '48%' },
            { color: 'black', left: '48%', top: '48%' },
            { color: 'white', left: '60%', top: '48%' },
          ]
        : [
            { color: 'black', left: '24%', top: '52%' },
            { color: 'black', left: '36%', top: '52%' },
            { color: 'black', left: '48%', top: '52%' },
            { color: 'black', left: '60%', top: '52%' },
            { color: 'black', left: '72%', top: '52%' },
            { color: 'white', left: '60%', top: '40%' },
          ]

  const lineStyle =
    kind === 'defeat'
      ? { left: '23.5%', top: '68%', width: '72%', transform: 'rotate(-45deg)' }
      : kind === 'draw'
        ? null
        : { left: '23.5%', top: '52%', width: '50.5%', transform: 'rotate(0deg)' }

  return (
    <div className={`${styles.resultArt} ${styles.compactArt}`}>
      {confetti && (
        <>
          <span className={`${styles.confetti} ${styles.c1}`} />
          <span className={`${styles.confetti} ${styles.c2}`} />
          <span className={`${styles.confetti} ${styles.c3}`} />
        </>
      )}
      <div className={styles.settlementScene}>
        {isRank ? (
          <div className={styles.rankStage}>
            <span className={`${styles.rankSpark} ${styles.rankSparkOne}`} />
            <span className={`${styles.rankSpark} ${styles.rankSparkTwo}`} />
            <span className={`${styles.rankSpark} ${styles.rankSparkThree}`} />
          </div>
        ) : (
          <div className={styles.settlementBoard}>
            <span className={`${styles.settlementBoardStar} ${styles.settlementBoardStarA}`} />
            <span className={`${styles.settlementBoardStar} ${styles.settlementBoardStarB}`} />
            <span className={`${styles.settlementBoardStar} ${styles.settlementBoardStarC}`} />
            <span className={`${styles.settlementBoardStar} ${styles.settlementBoardStarD}`} />
            {boardPositions.map((stone, index) => (
              <span
                key={`${stone.left}-${stone.top}-${stone.color}-${index}`}
                className={`${styles.settlementMiniStone} ${
                  stone.color === 'black' ? styles.settlementMiniStoneBlack : styles.settlementMiniStoneWhite
                }`}
                style={{ left: stone.left, top: stone.top }}
              />
            ))}
            {lineStyle && (
              <span
                className={`${styles.settlementGridLine} ${lineClass}`}
                style={lineStyle}
                aria-hidden="true"
              />
            )}
          </div>
        )}
        <div className={`${styles.settlementGlow} ${glowClass}`} />
        {isRank ? (
          <div className={styles.rankUpgradeCard}>
            <div className={styles.rankUpgradeSide}>
              <span className={styles.rankUpgradeLabel}>原段位</span>
              <div className={styles.rankUpgradeBadge}>
                <MedalIcon tier="silver" level={2} />
              </div>
              <strong>白银</strong>
            </div>
            <div className={styles.rankUpgradeArrow} aria-hidden="true">
              <svg viewBox="0 0 32 20">
                <path
                  d="M2 10h21m0 0-6-6m6 6-6 6"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.4"
                />
              </svg>
            </div>
            <div className={styles.rankUpgradeSide}>
              <span className={`${styles.rankUpgradeLabel} ${styles.rankUpgradeLabelHot}`}>新段位</span>
              <div className={`${styles.rankUpgradeBadge} ${styles.rankUpgradeBadgeHot}`}>
                <MedalIcon tier="gold" level={3} />
              </div>
              <strong>黄金</strong>
            </div>
            <span className={styles.rankUpgradeRail} aria-hidden="true">
              <span className={styles.rankUpgradeRailFill} />
            </span>
          </div>
        ) : null}
        <span className={`${styles.outcomeTag} ${isRank ? styles.outcomeTagRank : ''}`}>{label}</span>
      </div>
    </div>
  )
}

function SettlementCard({ card }: { card: (typeof settlementCards)[number] }) {
  return (
    <article className={`${styles.phone} ${styles.compactPhone}`} aria-label={`${card.title}结算预览`}>
      <div
        className={`${styles.screen} ${styles.compactScreen} ${card.dark ? styles.darkScreen : ''}`}
      >
        <div className={`${styles.content} ${styles.compactContent}`}>
          <StatusBar />
          <SettlementArt
            kind={card.kind}
            confetti={card.kind === 'victory' || card.kind === 'rank'}
          />
          <section className={`${styles.resultCard} ${card.rank ? styles.rankResultCard : ''}`}>
            <h2>{card.title}</h2>
            <p>{card.copy}</p>
            {card.rank ? (
              <>
                <div className={styles.rankRewardGrid}>
                  <div className={`${styles.rankRewardCard} ${styles.rankRewardCardPrimary}`}>
                    <div className={styles.rankRewardIconWrap}>
                      <MedalIcon tier="gold" level={3} compact />
                    </div>
                    <span>
                      当前段位
                      <strong>黄金</strong>
                    </span>
                  </div>
                  <div className={`${styles.rankRewardCard} ${styles.rankRewardCardStar}`}>
                    <div className={styles.rankStarBurst} aria-hidden="true">
                      <StarIcon />
                      <span className={styles.rankStarPlus}>+1</span>
                    </div>
                    <span>
                      星数
                      <strong>1 / 5</strong>
                    </span>
                  </div>
                </div>
                <div className={styles.stats}>
                  <div className={`${styles.statCard} ${styles.rewardStatCard}`}>
                    <div className={styles.rewardStatIcon} aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path
                          d="M12 2.8l2.5 5.1 5.7.8-4.1 4 .9 5.6-5-2.7-5 2.7.9-5.6-4.1-4 5.7-.8L12 2.8z"
                          fill="currentColor"
                        />
                      </svg>
                    </div>
                    <span>
                      连胜奖励
                      <strong>+6</strong>
                    </span>
                  </div>
                  <div className={`${styles.statCard} ${styles.rewardStatCard}`}>
                    <div className={styles.unlockPreview} aria-hidden="true">
                      <span className={styles.unlockPreviewStone} />
                    </div>
                    <span>
                      新棋盘
                      <strong>已解锁</strong>
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.stats}>
                {card.stats.map(([label, value]) => (
                  <div key={label} className={styles.statCard}>
                    <span>
                      {label}
                      <strong>{value}</strong>
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className={styles.buttonGrid}>
              <button
                className={`${styles.buttonPrimary} ${card.rank ? styles.buttonRank : ''}`}
                type="button"
              >
                {card.primary}
              </button>
              <button className={`${styles.buttonSecondary} ${styles.buttonLight}`} type="button">
                {card.secondary}
              </button>
            </div>
          </section>
        </div>
      </div>
    </article>
  )
}

function MainSettlementPreview() {
  return (
    <article className={styles.phone} aria-label="融合版胜利结算主预览">
      <div className={styles.screen}>
        <div className={styles.content}>
          <StatusBar />
          <SettlementArt kind="victory" confetti />

          <section className={styles.resultCard}>
            <h2>漂亮一局</h2>
            <p>结算保留软萌奖励感，同时加入棋盘片段和胜负数据。</p>
            <div className={styles.stats}>
              <div className={styles.statCard}>
                <span>
                  总用时
                  <strong>01:42</strong>
                </span>
              </div>
              <div className={styles.statCard}>
                <span>
                  连胜
                  <strong>4</strong>
                </span>
              </div>
              <div className={styles.statCard}>
                <span>
                  段位分
                  <strong>+18</strong>
                </span>
              </div>
              <div className={styles.statCard}>
                <span>
                  评级
                  <strong>A+</strong>
                </span>
              </div>
            </div>
            <div className={styles.buttonGrid}>
              <button className={styles.buttonPrimary} type="button">
                再来一局
              </button>
              <button className={`${styles.buttonSecondary} ${styles.buttonLight}`} type="button">
                回到首页
              </button>
            </div>
          </section>
        </div>
      </div>
    </article>
  )
}

function MultiplayerPreview({ playSound }: { playSound: PlayPreviewSound }) {
  return (
    <article className={styles.phone} aria-label="融合版好友房预览">
      <div className={styles.screen}>
        <div className={styles.content}>
          <StatusBar />

          <section className={styles.roomHero}>
            <div>
              <span className={styles.roomState}>好友房等待中</span>
              <h2>房间 8K2M</h2>
              <p>复制房号发给朋友，进入后直接同步落子。</p>
            </div>
            <div className={styles.qrMock} aria-hidden="true">
              {Array.from({ length: 25 }).map((_, index) => (
                <span key={index} className={index % 3 === 0 || index === 12 ? styles.qrDotActive : ''} />
              ))}
            </div>
          </section>

          <section className={styles.roomActions}>
            <button type="button" onClick={() => playSound('room')}>
              复制房号
            </button>
            <button type="button" onClick={() => playSound('nav')}>
              邀请好友
            </button>
          </section>

          <section className={styles.friendBoard}>
            <div className={styles.friendBoardTop}>
              <span>连接稳定</span>
              <strong>32ms</strong>
            </div>
            <div className={styles.friendPlayers}>
              <div className={styles.friendPlayerActive}>
                <StoneDot color="black" />
                你
              </div>
              <div>
                <StoneDot color="white" />
                阿棋
              </div>
            </div>
            <div className={styles.roomMetaGrid}>
              <div className={styles.roomMetaItem}>
                <span>对局模式</span>
                <strong>好友房</strong>
              </div>
              <div className={styles.roomMetaItem}>
                <span>棋盘规格</span>
                <strong>15 × 15</strong>
              </div>
              <div className={styles.roomMetaItem}>
                <span>当前执子</span>
                <strong>你先手</strong>
              </div>
            </div>
          </section>

          <section className={styles.chatPanel}>
            <div className={styles.chatBubble}>这手有点凶。</div>
            <div className={`${styles.chatBubble} ${styles.chatBubbleSelf}`}>我先守右上。</div>
            <div className={styles.chatComposer}>
              <span>快速消息</span>
              <button type="button" onClick={() => playSound('nav')}>
                发送
              </button>
            </div>
          </section>
        </div>
      </div>
    </article>
  )
}

function SoundLab({
  enabled,
  secretUnlocked,
  onToggle,
  playSound,
}: {
  enabled: boolean
  secretUnlocked: boolean
  onToggle: () => void
  playSound: PlayPreviewSound
}) {
  return (
    <section className={styles.soundLab} aria-label="音效与彩蛋预览">
      <div className={styles.soundHeader}>
        <div>
          <h2>音效方案</h2>
          <p>落子、好友加入、胜负结算已经接入真实音频素材，这里只保留必要试听，不再做实验展示。</p>
        </div>
        <div className={styles.soundControls}>
          <button
            className={`${styles.toggleSound} ${enabled ? styles.toggleSoundOn : ''}`}
            type="button"
            onClick={onToggle}
          >
            {enabled ? '声音开启' : '声音关闭'}
          </button>
        </div>
      </div>
      <div className={styles.soundGrid}>
        {soundSamples.map(([sound, label, copy]) => (
          <button key={sound} className={styles.soundButton} type="button" onClick={() => playSound(sound)}>
            <strong>{label}</strong>
            <span>{copy}</span>
          </button>
        ))}
      </div>
      {secretUnlocked && (
        <div className={styles.secretBanner}>
          <span className={styles.secretBadge}>大师彩蛋</span>
          连点棋盘标识已点亮隐藏徽章，结算页可追加金色连线和专属提示音。
          <span className={`${styles.secretSpark} ${styles.secretSparkOne}`} />
          <span className={`${styles.secretSpark} ${styles.secretSparkTwo}`} />
        </div>
      )}
    </section>
  )
}

function StarIcon({ filled = true }: { filled?: boolean }) {
  return (
    <svg className={filled ? styles.starFilled : styles.starEmpty} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.4L12 17.4l-5.7 3 1.1-6.4-4.6-4.5 6.4-.9L12 2.8z"
        fill="currentColor"
      />
    </svg>
  )
}

function MedalIcon({
  level = 3,
  tier = 'gold',
  compact = false,
}: {
  level?: number
  tier?: TierKey
  compact?: boolean
}) {
  if (tier === 'platinum') {
    return (
      <span className={`${styles.rankBadgeIcon} ${compact ? styles.rankBadgeCompact : ''}`} aria-hidden="true">
        <svg viewBox="0 0 72 72" className={styles.rankBadgeSvg}>
          <path d="M36 8 56 28 36 62 16 28 36 8Z" fill="#45c7ee" />
          <path d="M36 16 48 28 36 52 24 28 36 16Z" fill="#8be7ff" />
          <path d="M24 28h24" stroke="#2a8fcd" strokeWidth="3" strokeLinecap="round" />
          <path d="M36 8v54" stroke="#c9f9ff" strokeWidth="2.4" strokeLinecap="round" opacity=".7" />
        </svg>
      </span>
    )
  }

  if (tier === 'diamond') {
    return (
      <span className={`${styles.rankBadgeIcon} ${compact ? styles.rankBadgeCompact : ''}`} aria-hidden="true">
        <svg viewBox="0 0 72 72" className={styles.rankBadgeSvg}>
          <path d="M36 10 50 22 36 36 22 22 36 10Z" fill="#62a6ff" />
          <path d="M50 22 58 34 46 46 36 36 50 22Z" fill="#4f8af2" />
          <path d="M22 22 14 34 26 46 36 36 22 22Z" fill="#79bcff" />
          <path d="M26 46 36 58 46 46 36 36 26 46Z" fill="#8fd5ff" />
          <path d="M36 14 45 22 36 31 27 22 36 14Z" fill="#d9efff" opacity=".9" />
        </svg>
      </span>
    )
  }

  if (tier === 'master') {
    return (
      <span className={`${styles.rankBadgeIcon} ${compact ? styles.rankBadgeCompact : ''}`} aria-hidden="true">
        <svg viewBox="0 0 72 72" className={styles.rankBadgeSvg}>
          <path d="M16 51h40l-3 10H19l-3-10Z" fill="#ff8d67" />
          <path d="M18 23 28 33l8-16 8 16 10-10-4 24H22l-4-24Z" fill="#ffb48a" />
          <circle cx="18" cy="23" r="4" fill="#ffd36b" />
          <circle cx="36" cy="17" r="4" fill="#ffd36b" />
          <circle cx="54" cy="23" r="4" fill="#ffd36b" />
        </svg>
      </span>
    )
  }

  const medalFill =
    tier === 'bronze' ? '#d99e67' : tier === 'silver' ? '#dfe4ef' : '#ffb322'
  const medalInner =
    tier === 'bronze' ? '#b97a47' : tier === 'silver' ? '#b2bccd' : '#d98d0a'
  const medalText = tier === 'silver' ? '#6b7486' : tier === 'gold' ? '#8a5b00' : '#73462c'

  return (
    <span className={`${styles.rankBadgeIcon} ${compact ? styles.rankBadgeCompact : ''}`} aria-hidden="true">
      <svg viewBox="0 0 72 84" className={styles.rankBadgeSvg}>
        <path d="M22 8h10l4 10h-8L22 8Z" fill="#6ca6ff" />
        <path d="M50 8H40l-4 10h8l6-10Z" fill="#4e8df2" />
        <circle cx="36" cy="35" r="18" fill={medalFill} />
        <circle cx="36" cy="35" r="12" fill={medalInner} opacity=".34" />
        <text
          x="36"
          y="40"
          textAnchor="middle"
          fontSize={compact ? '18' : '20'}
          fontWeight="900"
          fill={medalText}
          fontFamily="Inter, system-ui, sans-serif"
        >
          {level}
        </text>
      </svg>
    </span>
  )
}

function RankPreview() {
  return (
    <article className={`${styles.phone} ${styles.singlePreview}`} aria-label="融合版排位页预览">
      <div className={styles.screen}>
        <div className={styles.content}>
          <StatusBar />

          <section className={styles.rankHero}>
            <div className={styles.rankHeroCard}>
              <div className={styles.rankHeroTop}>
                <div className={styles.rankMedal}>
                  <MedalIcon tier="gold" level={3} />
                </div>
                <div>
                  <h2 className={styles.rankName}>黄金</h2>
                  <p className={styles.rankMeta}>620 分 · 距离铂金还差 280 分</p>
                  <div className={styles.stars} aria-label="当前星数 3 颗">
                    <StarIcon />
                    <StarIcon />
                    <StarIcon />
                    <StarIcon filled={false} />
                    <StarIcon filled={false} />
                  </div>
                </div>
              </div>
              <div className={styles.progressTrack} aria-hidden="true">
                <span className={styles.progressFill} />
              </div>
            </div>

            <div className={styles.rankStats}>
              <div className={styles.rankStat}>
                <span>
                  本季胜率
                  <strong>67%</strong>
                </span>
              </div>
              <div className={styles.rankStat}>
                <span>
                  连胜
                  <strong>4</strong>
                </span>
              </div>
              <div className={styles.rankStat}>
                <span>
                  总对局
                  <strong>128</strong>
                </span>
              </div>
              <div className={styles.rankStat}>
                <span>
                  最佳评级
                  <strong>A+</strong>
                </span>
              </div>
            </div>
          </section>

          <section className={styles.tierPanel}>
            <div className={styles.tierHeader}>
              <h3>段位路线</h3>
              <span className={styles.seasonPill}>S1 春季赛</span>
            </div>
            <div className={styles.tierMatrix}>
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`${styles.tierMatrixCard} ${tier.name === '黄金' ? styles.tierMatrixCardActive : ''}`}
                >
                  <div className={styles.tierMatrixIcon}>
                    <MedalIcon tier={tier.key} level={tier.level} compact />
                  </div>
                  <div className={styles.tierMatrixCopy}>
                    <strong>{tier.name}</strong>
                    <span>{tier.stage}</span>
                  </div>
                  <em className={styles.tierMatrixHint}>{tier.copy}</em>
                </div>
              ))}
            </div>

            <div className={styles.rewardStrip}>
              <div className={styles.rewardIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M7 4h10v4a5 5 0 0 1-3.5 4.8V16H17v3H7v-3h3.5v-3.2A5 5 0 0 1 7 8V4z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div>
                <strong>黄金奖励已解锁</strong>
                <span>获得金色胜利连线与排位徽章边框。</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </article>
  )
}

export default function FusionUIPreviewPage() {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const brandClicksRef = useRef(0)
  const [secretUnlocked, setSecretUnlocked] = useState(false)
  const playSound = usePreviewAudio(soundEnabled)

  const handleBrandClick = () => {
    const nextClicks = brandClicksRef.current + 1
    brandClicksRef.current = nextClicks
    playSound(nextClicks >= 5 ? 'secret' : 'nav')
    if (nextClicks >= 5) {
      setSecretUnlocked(true)
      brandClicksRef.current = 0
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <button className={styles.brandMark} type="button" onClick={handleBrandClick} aria-label="点亮隐藏彩蛋">
              <BoardIcon />
            </button>
            <div>
              <h1 className={styles.title}>
                弈境 <span className={styles.titleLatin}>Gomoku</span>
              </h1>
              <p className={styles.subtitle}>独立前端预览，不替换当前正式 UI</p>
            </div>
          </div>
          <div className={styles.chips} aria-label="设计方向">
            <span className={styles.chip}>Soft Party</span>
            <span className={styles.chip}>Soft Strategy</span>
            <span className={styles.chip}>15 × 15 棋盘</span>
          </div>
        </header>

        <h2 className={styles.sectionTitle}>核心三屏</h2>
        <section className={styles.phoneGrid}>
          <ModePreview playSound={playSound} />
          <GamePreview playSound={playSound} />
          <MainSettlementPreview />
        </section>

        <h2 className={styles.sectionTitle}>好友房与排位</h2>
        <section className={styles.phoneGridCompact}>
          <MultiplayerPreview playSound={playSound} />
          <RankPreview />
        </section>

        <SoundLab
          enabled={soundEnabled}
          secretUnlocked={secretUnlocked}
          onToggle={() => setSoundEnabled((value) => !value)}
          playSound={playSound}
        />

        <h2 className={styles.sectionTitle}>结算四态</h2>
        <section className={styles.settlementGrid}>
          {settlementCards.map((card) => (
            <SettlementCard key={card.title} card={card} />
          ))}
        </section>
      </div>
    </main>
  )
}
