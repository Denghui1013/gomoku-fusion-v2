'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  RotateCcw,
  ShieldAlert,
  Star,
  Target,
  TimerOff,
  Trophy,
  XCircle,
} from 'lucide-react'
import type { GameMode, GameStatus, Player } from '@/types'
import { useSoundContext } from '@/context/SoundContext'
import { useRank } from '@/context/RankContext'
import { getTierConfig } from '@/lib/rankSystem'
import fusion from '@/app/fusion-ui-preview/FusionUIPreview.module.css'

type VictoryOverlayProps = {
  open: boolean
  status: GameStatus
  winner: Player | null
  timeoutLoser?: Player | null
  autoClose?: boolean
  extraContent?: ReactNode
  footerContent?: ReactNode
  resultInfoOverride?: ResultInfoOverride
  mode: GameMode
  playerSide: Player | null
  totalMoves: number
  totalTime: number
  starChange?: number
  onRestart: () => void
  onBack: () => void
  onClose: () => void
}

type ResultType = 'victory' | 'defeat' | 'draw'
type SettlementLayout = 'line' | 'timeout' | 'draw'

type ResultInfo = {
  title: string
  subtitle: string
  type: ResultType
  reasonLabel: string
  layout: SettlementLayout
  winner: Player | null
  playerResultLabel: string
  playerResultSide: Player | null
}

type ResultInfoOverride = Partial<Pick<ResultInfo, 'title' | 'subtitle' | 'reasonLabel' | 'playerResultLabel' | 'playerResultSide'>>

const AUTO_CLOSE_SECONDS = 10
const RANK_FROM_PVC_KEY = 'gomoku:rank-entry-from-pvc-settlement'

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function playerName(player: Player | null | undefined) {
  if (player === 'black') return '黑方'
  if (player === 'white') return '白方'
  return '未选择'
}

function opponentOf(player: Player): Player {
  return player === 'black' ? 'white' : 'black'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function StoneDot({ color, size = 18 }: { color: 'black' | 'white'; size?: number }) {
  return (
    <span
      className={`${fusion.stoneDot} ${color === 'black' ? fusion.blackDot : fusion.whiteDot}`}
      style={{ width: size, height: size, flex: '0 0 auto' }}
      aria-hidden="true"
    />
  )
}

function getResultInfo(
  status: GameStatus,
  winner: Player | null,
  timeoutLoser: Player | null | undefined,
  mode: GameMode,
  playerSide: Player | null
): ResultInfo {
  if (timeoutLoser) {
    const timeoutWinner = opponentOf(timeoutLoser)
    const playerLost = mode === 'pvc' && playerSide === timeoutLoser
    const title = mode === 'pvc'
      ? playerLost
        ? '你超时了'
        : '对手超时'
      : `${playerName(timeoutWinner)}胜出`

    return {
      title,
      subtitle: playerLost ? '读秒归零，对手赢得了本局。' : `${playerName(timeoutLoser)}超时，本局结束。`,
      type: playerLost ? 'defeat' : 'victory',
      reasonLabel: '超时',
      layout: 'timeout',
      winner: timeoutWinner,
      playerResultLabel: playerLost ? '时间耗尽' : '稳住节奏',
      playerResultSide: playerLost ? playerSide : timeoutWinner,
    }
  }

  if (status === 'draw') {
    return {
      title: '平局',
      subtitle: '双方都守住了关键点位，下一局再分胜负。',
      type: 'draw',
      reasonLabel: '和棋',
      layout: 'draw',
      winner: null,
      playerResultLabel: '势均力敌',
      playerResultSide: null,
    }
  }

  if (winner) {
    const hasPlayerPerspective = playerSide !== null
    const playerWon = hasPlayerPerspective && playerSide === winner
    const playerLost = hasPlayerPerspective && playerSide !== winner

    return {
      title: playerWon ? '你赢了' : playerLost ? '你输了' : `${playerName(winner)}胜出`,
      subtitle: playerWon
        ? '对局结束，已生成本局结算。'
        : playerLost
          ? '差一点就守住了，复盘后很快能追回来。'
          : '对局结束，已生成本局结算。',
      type: playerLost ? 'defeat' : 'victory',
      reasonLabel: '五子连线',
      layout: 'line',
      winner,
      playerResultLabel: playerLost ? `${playerName(playerSide)}落败` : `${playerName(winner)}胜出`,
      playerResultSide: playerLost ? playerSide : winner,
    }
  }

  return {
    title: '对局结束',
    subtitle: '已完成本局结算。',
    type: 'draw',
    reasonLabel: '结束',
    layout: 'draw',
    winner: null,
    playerResultLabel: '本局结束',
    playerResultSide: null,
  }
}

function ResultIcon({ type, layout }: { type: ResultType; layout: SettlementLayout }) {
  if (layout === 'timeout') return TimerOff
  if (type === 'victory') return Trophy
  if (type === 'defeat') return XCircle
  return Target
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: React.ReactNode
  icon: React.ReactNode
}) {
  return (
    <div
      style={{
        minHeight: 62,
        borderRadius: 14,
        border: '1px solid rgba(11,95,165,0.14)',
        background: 'rgba(237,244,251,0.82)',
        padding: '9px 11px',
        display: 'grid',
        gridTemplateColumns: '24px 1fr',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div style={{ color: '#0b5fa5', display: 'grid', placeItems: 'center' }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <span style={{ display: 'block', color: '#5d6f81', fontSize: 11, fontWeight: 800 }}>{label}</span>
        <strong
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: '#123b5b',
            fontSize: 19,
            lineHeight: 1.1,
            marginTop: 3,
          }}
        >
          {value}
        </strong>
      </div>
    </div>
  )
}

function StarGlyph({
  filled,
  highlighted,
  dimmed,
  delay = 0,
}: {
  filled: boolean
  highlighted?: boolean
  dimmed?: boolean
  delay?: number
}) {
  return (
    <motion.span
      style={{
        position: 'relative',
        width: 28,
        height: 28,
        borderRadius: 10,
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        background: filled ? 'rgba(255,240,190,0.72)' : 'rgba(239,244,251,0.96)',
        border: filled ? '1px solid rgba(240,179,63,0.34)' : '1px solid rgba(11,95,165,0.12)',
        boxShadow: highlighted ? '0 10px 24px rgba(240,179,63,0.28)' : 'none',
      }}
      initial={
        highlighted
          ? { scale: 0.56, rotate: -16, opacity: 0.3 }
          : dimmed
            ? { scale: 1, opacity: 1 }
            : false
      }
      animate={
        highlighted
          ? { scale: [0.56, 1.2, 1], rotate: [-16, 8, 0], opacity: [0.3, 1, 1] }
          : dimmed
            ? { scale: [1, 0.76, 0.6], opacity: [1, 0.4, 0.22] }
            : { scale: 1, rotate: 0, opacity: filled ? 1 : 0.82 }
      }
      transition={{ duration: dimmed ? 0.34 : 0.46, delay, ease: 'easeOut' }}
    >
      {highlighted && (
        <motion.span
          aria-hidden="true"
          initial={{ x: -32, opacity: 0 }}
          animate={{ x: 36, opacity: [0, 0.9, 0] }}
          transition={{ duration: 0.48, delay: delay + 0.05, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.92) 48%, transparent 76%)',
          }}
        />
      )}

      <Star
        size={16}
        strokeWidth={2.2}
        style={{
          color: filled ? '#e3a008' : '#94a3b8',
          fill: filled ? '#f6c453' : 'transparent',
        }}
      />

      {highlighted && (
        <motion.span
          aria-hidden="true"
          initial={{ scale: 0.2, opacity: 0.2 }}
          animate={{ scale: [0.2, 1.45, 1.8], opacity: [0.24, 0.36, 0] }}
          transition={{ duration: 0.5, delay: delay + 0.02, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            inset: 3,
            borderRadius: 999,
            border: '1px solid rgba(255,230,160,0.95)',
          }}
        />
      )}

      {dimmed && (
        <motion.span
          aria-hidden="true"
          initial={{ y: 0, opacity: 0.95, scale: 0.9 }}
          animate={{ y: 18, opacity: 0, scale: 0.32 }}
          transition={{ duration: 0.42, delay: delay + 0.04, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            width: 10,
            height: 10,
            borderRadius: 999,
            background: 'rgba(239,68,68,0.36)',
            filter: 'blur(1px)',
          }}
        />
      )}
    </motion.span>
  )
}

function StarChangeStrip({
  currentStars,
  maxStars,
  starChange,
}: {
  currentStars: number
  maxStars: number
  starChange: number
}) {
  const safeMaxStars = Math.max(1, maxStars)
  const clampedCurrent = clamp(currentStars, 0, safeMaxStars)
  const previousStars = clamp(clampedCurrent - starChange, 0, safeMaxStars)
  const gainIndex = starChange > 0 ? clampedCurrent - 1 : -1
  const lossIndex = starChange < 0 ? previousStars - 1 : -1
  const accent = starChange > 0 ? '#167247' : starChange < 0 ? '#dc2626' : '#0b5fa5'
  const panelBg =
    starChange > 0
      ? 'rgba(220,252,231,0.74)'
      : starChange < 0
        ? 'rgba(254,226,226,0.78)'
        : 'rgba(237,244,251,0.82)'
  const border =
    starChange > 0
      ? 'rgba(22,114,71,0.22)'
      : starChange < 0
        ? 'rgba(220,38,38,0.2)'
        : 'rgba(11,95,165,0.14)'
  const helperText =
    starChange > 0
      ? '本局进账一颗星'
      : starChange < 0
        ? '本局掉落一颗星'
        : '本局星级保持不变'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.2 }}
      style={{
        marginTop: 10,
        padding: '10px 12px',
        borderRadius: 16,
        border: `1px solid ${border}`,
        background: panelBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {starChange > 0 && (
        <motion.span
          aria-hidden="true"
          initial={{ x: -120, opacity: 0 }}
          animate={{ x: 280, opacity: [0, 0.35, 0] }}
          transition={{ duration: 0.9, delay: 0.1, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: 96,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
            transform: 'skewX(-18deg)',
          }}
        />
      )}

      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#123b5b', fontSize: 12, fontWeight: 900 }}>星级变化</div>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {Array.from({ length: safeMaxStars }).map((_, index) => {
            const filled = index < clampedCurrent
            const highlighted = starChange > 0 && index === gainIndex
            const dimmed = starChange < 0 && index === lossIndex

            return (
              <StarGlyph
                key={`settlement-star-${index}-${clampedCurrent}-${starChange}`}
                filled={filled}
                highlighted={highlighted}
                dimmed={dimmed}
                delay={highlighted || dimmed ? 0.08 : 0}
              />
            )
          })}
        </div>
        <div style={{ marginTop: 6, color: '#5d6f81', fontSize: 11, fontWeight: 800 }}>{helperText}</div>
      </div>

      <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
        <div style={{ color: accent, fontSize: 22, fontWeight: 900, lineHeight: 1 }}>
          {starChange > 0 ? `+${starChange}` : starChange < 0 ? `${starChange}` : '保星'}
        </div>
        <div style={{ marginTop: 4, color: '#5d6f81', fontSize: 12, fontWeight: 800 }}>
          {clampedCurrent}/{safeMaxStars}
        </div>
      </div>
    </motion.div>
  )
}

function TierShiftBanner({
  beforeTier,
  afterTier,
  isPromotion,
}: {
  beforeTier: string
  afterTier: string
  isPromotion: boolean
}) {
  const beforeConfig = getTierConfig(beforeTier as Parameters<typeof getTierConfig>[0])
  const afterConfig = getTierConfig(afterTier as Parameters<typeof getTierConfig>[0])
  const accent = isPromotion ? '#167247' : '#dc2626'
  const chipBg = isPromotion ? 'rgba(220,252,231,0.74)' : 'rgba(254,226,226,0.78)'
  const panelBg = isPromotion
    ? 'linear-gradient(135deg, rgba(255,248,220,0.94), rgba(240,253,244,0.96))'
    : 'linear-gradient(135deg, rgba(254,242,242,0.96), rgba(255,255,255,0.96))'

  return (
    <motion.section
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.08, duration: 0.28, ease: 'easeOut' }}
      style={{
        position: 'relative',
        marginTop: 10,
        padding: '12px 14px',
        borderRadius: 18,
        overflow: 'hidden',
        border: `1px solid ${isPromotion ? 'rgba(22,114,71,0.24)' : 'rgba(220,38,38,0.18)'}`,
        background: panelBg,
      }}
    >
      <motion.span
        aria-hidden="true"
        initial={{ opacity: 0.2, scale: 0.9 }}
        animate={{ opacity: [0.18, 0.34, 0.18], scale: [0.9, 1.08, 0.9] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          right: -18,
          top: -18,
          width: 92,
          height: 92,
          borderRadius: '50%',
          background: isPromotion ? 'rgba(255,224,130,0.45)' : 'rgba(252,165,165,0.24)',
        }}
      />

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              minHeight: 28,
              padding: '0 10px',
              borderRadius: 999,
              background: chipBg,
              color: accent,
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            {isPromotion ? '段位晋级' : '段位回落'}
          </div>
          <p style={{ margin: '8px 0 0', color: '#123b5b', fontSize: 13, fontWeight: 800 }}>
            {isPromotion ? '这局直接打穿晋级线。' : '这局暂时回落，下一局还能追回来。'}
          </p>
        </div>

        {isPromotion && (
          <motion.div
            aria-hidden="true"
            initial={{ scale: 0.8, rotate: -10, opacity: 0.4 }}
            animate={{ scale: [0.8, 1.08, 1], rotate: [-10, 6, 0], opacity: [0.4, 1, 1] }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ color: '#e3a008', fontSize: 26, lineHeight: 1 }}
          >
            ★
          </motion.div>
        )}
      </div>

      <div style={{ position: 'relative', marginTop: 12, display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center' }}>
        <div
          style={{
            minHeight: 74,
            borderRadius: 16,
            border: '1px solid rgba(11,95,165,0.12)',
            background: 'rgba(255,255,255,0.7)',
            display: 'grid',
            placeItems: 'center',
            padding: '10px 8px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, lineHeight: 1 }}>{beforeConfig.icon}</div>
            <div style={{ marginTop: 6, color: '#5d6f81', fontSize: 11, fontWeight: 800 }}>原段位</div>
            <div style={{ marginTop: 2, color: '#123b5b', fontSize: 16, fontWeight: 900 }}>{beforeConfig.name}</div>
          </div>
        </div>

        <motion.div
          animate={isPromotion ? { x: [0, 4, 0] } : { x: [0, -4, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ color: accent, fontSize: 22, fontWeight: 900 }}
        >
          {isPromotion ? '→' : '←'}
        </motion.div>

        <motion.div
          initial={isPromotion ? { scale: 0.9, opacity: 0.75 } : { scale: 1, opacity: 1 }}
          animate={isPromotion ? { scale: [0.9, 1.04, 1], opacity: [0.75, 1, 1] } : { scale: 1, opacity: 1 }}
          transition={{ duration: 0.42, ease: 'easeOut' }}
          style={{
            minHeight: 74,
            borderRadius: 16,
            border: `1px solid ${isPromotion ? 'rgba(240,179,63,0.28)' : 'rgba(220,38,38,0.14)'}`,
            background: isPromotion ? 'rgba(255,248,220,0.92)' : 'rgba(255,255,255,0.86)',
            display: 'grid',
            placeItems: 'center',
            padding: '10px 8px',
            boxShadow: isPromotion ? '0 12px 26px rgba(240,179,63,0.18)' : 'none',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, lineHeight: 1 }}>{afterConfig.icon}</div>
            <div style={{ marginTop: 6, color: accent, fontSize: 11, fontWeight: 800 }}>{isPromotion ? '新段位' : '当前段位'}</div>
            <div style={{ marginTop: 2, color: '#123b5b', fontSize: 16, fontWeight: 900 }}>{afterConfig.name}</div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  )
}

export function VictoryOverlay({
  open,
  status,
  winner,
  timeoutLoser = null,
  autoClose = true,
  extraContent,
  footerContent,
  resultInfoOverride,
  mode,
  playerSide,
  totalMoves,
  totalTime,
  starChange,
  onRestart,
  onBack,
  onClose,
}: VictoryOverlayProps) {
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const { playVictory, playDefeat, playClick, playNav, playBack, playCollapse } = useSoundContext()
  const { rankData, currentTierConfig } = useRank()
  const [closeIn, setCloseIn] = useState(AUTO_CLOSE_SECONDS)
  const [viewportWidth, setViewportWidth] = useState(430)
  const timerRef = useRef<number | null>(null)
  const focusedRef = useRef<HTMLButtonElement | null>(null)

  const info = useMemo(() => {
    const base = getResultInfo(status, winner, timeoutLoser, mode, playerSide)
    return { ...base, ...resultInfoOverride }
  }, [mode, playerSide, resultInfoOverride, status, timeoutLoser, winner])
  const latestRankMatch = useMemo(() => rankData.matchHistory?.at(-1) ?? null, [rankData.matchHistory])
  const tierShift = useMemo(() => {
    if (mode !== 'pvc' || !latestRankMatch) return null
    if (latestRankMatch.beforeTier === latestRankMatch.afterTier) return null
    return {
      beforeTier: latestRankMatch.beforeTier,
      afterTier: latestRankMatch.afterTier,
      isPromotion: latestRankMatch.afterTier !== latestRankMatch.beforeTier && latestRankMatch.starChange > 0,
    }
  }, [latestRankMatch, mode])

  const toneColor = info.type === 'victory' ? '#167247' : info.type === 'defeat' ? '#dc2626' : '#0b5fa5'
  const toneBg = info.type === 'victory' ? 'rgba(168,230,191,0.32)' : info.type === 'defeat' ? 'rgba(248,113,113,0.2)' : 'rgba(191,219,254,0.3)'
  const borderColor = info.type === 'victory' ? 'rgba(22,114,71,0.38)' : info.type === 'defeat' ? 'rgba(220,38,38,0.3)' : 'rgba(11,95,165,0.26)'
  const ResultMark = ResultIcon({ type: info.type, layout: info.layout })
  const progress = closeIn / AUTO_CLOSE_SECONDS
  const visibleStarRequirement = currentTierConfig.starRequirement === Infinity
    ? Math.max(5, Math.min(rankData.currentStars, 6))
    : Math.max(1, Math.min(currentTierConfig.starRequirement, 6))

  const isW360 = viewportWidth <= 360
  const isW390 = viewportWidth > 360 && viewportWidth <= 390
  const modalInset = isW360 ? 8 : isW390 ? 10 : 14
  const cardMaxWidth = Math.min(420, viewportWidth - modalInset * 2)

  useEffect(() => {
    if (!open) return
    focusedRef.current?.focus()
    setCloseIn(AUTO_CLOSE_SECONDS)
    if (info.type === 'victory') playVictory()
    if (info.type === 'defeat') playDefeat()
  }, [open, info.type, playDefeat, playVictory])

  useEffect(() => {
    const syncViewport = () => setViewportWidth(window.innerWidth)
    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => window.removeEventListener('resize', syncViewport)
  }, [])

  useEffect(() => {
    if (!open || !autoClose) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }

    timerRef.current = window.setInterval(() => {
      setCloseIn((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [autoClose, open])

  useEffect(() => {
    if (!open || !autoClose || closeIn > 0) return
    onClose()
  }, [autoClose, closeIn, onClose, open])

  const handleRestart = useCallback(() => {
    playClick()
    onRestart()
  }, [onRestart, playClick])

  const handleBack = useCallback(() => {
    playBack()
    onBack()
  }, [onBack, playBack])

  const handleViewRank = useCallback(() => {
    window.sessionStorage.setItem(RANK_FROM_PVC_KEY, '1')
    playNav()
    router.push('/rank')
  }, [playNav, router])

  const handleCollapse = useCallback(() => {
    playCollapse()
    onClose()
  }, [onClose, playCollapse])

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        key="victory-overlay-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[60] backdrop-blur-sm"
        style={{ background: 'rgba(7, 18, 32, 0.45)' }}
        aria-hidden="true"
      />

      <motion.div
        key="victory-overlay-content"
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 14 }}
        transition={{ type: 'spring', damping: 27, stiffness: 330, mass: 0.75 }}
        className="fixed inset-0 z-[61] flex items-center justify-center"
        style={{ padding: modalInset }}
        role="dialog"
        aria-modal="true"
        aria-label="对局结算"
      >
        <div
          className={fusion.panel}
          style={{
            width: '100%',
            maxWidth: cardMaxWidth,
            maxHeight: 'min(92dvh, 760px)',
            overflowY: 'auto',
            borderRadius: 24,
            borderColor,
            boxShadow: '0 22px 46px rgba(7, 18, 32, 0.32)',
            background: 'rgba(255,255,255,0.96)',
            padding: isW360 ? 12 : 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className={`${fusion.buttonSecondary} ${fusion.buttonLight}`}
              style={{ minHeight: 36, padding: '0 12px', borderRadius: 12, fontSize: 13 }}
              onClick={handleCollapse}
            >
              收起
            </button>
          </div>

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            style={{
              position: 'relative',
              marginTop: 10,
              padding: isW360 ? 13 : 15,
              overflow: 'hidden',
              borderRadius: 22,
              border: `1px solid ${borderColor}`,
              background: `linear-gradient(135deg, ${toneBg}, rgba(255,255,255,0.94))`,
            }}
          >
            {!reduceMotion && (
              <motion.span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  right: -22,
                  top: -22,
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  background: toneBg,
                  opacity: 0.7,
                }}
                animate={{ scale: [0.96, 1.08, 0.96], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}

            <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '70px 1fr', gap: 12, alignItems: 'center' }}>
              <motion.div
                initial={{ scale: 0.84, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 20,
                  display: 'grid',
                  placeItems: 'center',
                  background: '#ffffff',
                  color: toneColor,
                  boxShadow: '0 14px 26px rgba(18,59,91,0.14)',
                }}
              >
                <ResultMark size={34} />
              </motion.div>

              <div>
                <h3 style={{ margin: 0, fontSize: isW360 ? 34 : 38, lineHeight: 1, color: '#123b5b', letterSpacing: 0 }}>
                  {info.title}
                </h3>
                <p style={{ margin: '7px 0 0', color: '#3a5064', fontWeight: 800, lineHeight: 1.42 }}>
                  {info.subtitle}
                </p>
              </div>
            </div>

            <div
              style={{
                position: 'relative',
                marginTop: 12,
                minHeight: 46,
                padding: '0 12px',
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(255,255,255,0.74)',
                border: '1px solid rgba(11,95,165,0.1)',
                color: '#123b5b',
                fontWeight: 900,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {info.playerResultSide && <StoneDot color={info.playerResultSide} size={18} />}
                {info.playerResultLabel}
              </span>
            </div>
          </motion.section>

          {tierShift && (
            <TierShiftBanner
              beforeTier={tierShift.beforeTier}
              afterTier={tierShift.afterTier}
              isPromotion={tierShift.isPromotion}
            />
          )}

          {mode === 'pvc' && typeof starChange === 'number' && (
            <StarChangeStrip
              currentStars={rankData.currentStars}
              maxStars={visibleStarRequirement}
              starChange={starChange}
            />
          )}
          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <StatCard label="总步数" value={totalMoves} icon={<Target size={16} />} />
            <StatCard label="对局时长" value={formatDuration(totalTime)} icon={<Clock3 size={16} />} />
            <StatCard label="结束方式" value={info.reasonLabel} icon={<CheckCircle2 size={16} />} />
            <StatCard
              label={mode === 'pvp' ? '获胜方' : '你的执子'}
              value={
                <>
                  {mode === 'pvp' && info.winner && <StoneDot color={info.winner} size={15} />}
                  {mode === 'pvp' ? playerName(info.winner) : playerName(playerSide)}
                </>
              }
              icon={info.type === 'defeat' ? <ShieldAlert size={16} /> : <Trophy size={16} />}
            />
          </div>

          {autoClose ? (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, color: '#5d6f81', fontSize: 12, fontWeight: 800 }}>
              <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
                <circle cx="11" cy="11" r="9" fill="none" stroke="rgba(11,95,165,0.14)" strokeWidth="3" />
                <motion.circle
                  cx="11"
                  cy="11"
                  r="9"
                  fill="none"
                  stroke={toneColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  pathLength={progress}
                  style={{ rotate: -90, transformOrigin: '50% 50%' }}
                />
              </svg>
              {closeIn > 0 ? `${closeIn}s 后自动关闭` : '即将关闭'}
            </div>
          ) : null}

          {extraContent}

          {mode === 'pvc' && (
            <button
              type="button"
              className={`${fusion.buttonSecondary} ${fusion.buttonLight}`}
              style={{ marginTop: 10, minHeight: 42, width: '100%' }}
              onClick={handleViewRank}
            >
              查看排位
            </button>
          )}

          {footerContent ?? (
            <div className={fusion.buttonGrid} style={{ marginTop: 10 }}>
              <button
                ref={focusedRef}
                className={fusion.buttonPrimary}
                type="button"
                onClick={handleRestart}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <RotateCcw size={16} />
                  再来一局
                </span>
              </button>
              <button className={`${fusion.buttonSecondary} ${fusion.buttonLight}`} type="button" onClick={handleBack}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <ArrowLeft size={16} />
                  返回选择
                </span>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
