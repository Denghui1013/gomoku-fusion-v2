'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  Crown,
  Lock,
  Palette,
  Sparkles,
  Swords,
  Trophy,
  UserCircle2,
  Wand2,
  X,
} from 'lucide-react'
import fusion from '@/app/fusion-ui-preview/FusionUIPreview.module.css'
import { useRank } from '@/context/RankContext'
import { useSoundContext } from '@/context/SoundContext'
import { RANK_TIERS } from '@/lib/rankSystem'
import { TIER_LABELS, type RewardCatalogEntry } from '@/lib/rewardCatalog'
import type { BoardTheme, Difficulty, RankMatchRecord, RankTier } from '@/types'

const RANK_FROM_PVC_KEY = 'gomoku:rank-entry-from-pvc-settlement'

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '新手',
  medium: '进阶',
  hard: '大师',
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, seconds)
  const minutes = Math.floor(safeSeconds / 60)
  const rest = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

function MatchHistoryCard({ match }: { match: RankMatchRecord }) {
  const resultColor = match.isWin ? '#167247' : match.isProtected ? '#b7791f' : '#d94835'
  const resultBg = match.isWin ? 'rgba(22,114,71,0.1)' : match.isProtected ? 'rgba(216,168,76,0.16)' : 'rgba(233,95,70,0.12)'
  const sideLabel = match.playerSide ? (match.playerSide === 'black' ? '执黑' : '执白') : '未记录'
  const starText = match.isProtected ? '保星' : `${match.starChange > 0 ? '+' : ''}${match.starChange} 星`
  const scoreText = `${match.scoreChange > 0 ? '+' : ''}${match.scoreChange} 分`
  const resultText = match.isWin ? '胜利' : match.isProtected ? '失利 · 段位保护' : '失利'
  const summaryText = `${new Date(match.timestamp).toLocaleDateString('zh-CN')} · ${DIFFICULTY_LABELS[match.difficulty]} · ${sideLabel}`
  const tierFlow = `段位：${TIER_LABELS[match.beforeTier]} ${match.beforeStars} 星 → ${TIER_LABELS[match.afterTier]} ${match.afterStars} 星${
    match.protectionMessage ? ` · ${match.protectionMessage}` : ''
  }`

  return (
    <details
      style={{
        borderRadius: 18,
        border: '1px solid rgba(11,95,165,0.12)',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.94), rgba(237,244,251,0.76))',
        overflow: 'hidden',
      }}
    >
      <summary
        style={{
          minHeight: 64,
          padding: '10px 12px',
          display: 'grid',
          gridTemplateColumns: '40px 1fr auto',
          gap: 10,
          alignItems: 'center',
          listStyle: 'none',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            display: 'grid',
            placeItems: 'center',
            background: resultBg,
            color: resultColor,
          }}
        >
          <Swords size={18} />
        </span>
        <span style={{ minWidth: 0 }}>
          <strong style={{ display: 'block', color: '#123b5b', fontSize: 15 }}>{resultText}</strong>
          <span style={{ display: 'block', marginTop: 3, color: '#5d6f81', fontSize: 12, fontWeight: 800 }}>
            {summaryText}
          </span>
        </span>
        <span style={{ color: resultColor, fontSize: 13, fontWeight: 900, whiteSpace: 'nowrap' }}>{starText}</span>
      </summary>

      <div
        style={{
          padding: '0 12px 12px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 8,
        }}
      >
        {[
          ['分数变化', scoreText],
          ['对局时长', formatDuration(match.duration)],
          ['总手数', `${match.moveCount} 手`],
          ['连胜', `${match.winStreakAfter} 场`],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              minHeight: 52,
              padding: '9px 10px',
              borderRadius: 14,
              border: '1px solid rgba(11,95,165,0.1)',
              background: 'rgba(255,255,255,0.76)',
            }}
          >
            <span style={{ display: 'block', color: '#5d6f81', fontSize: 11, fontWeight: 800 }}>{label}</span>
            <strong style={{ display: 'block', marginTop: 3, color: '#123b5b', fontSize: 15 }}>{value}</strong>
          </div>
        ))}

        <div
          style={{
            gridColumn: '1 / -1',
            minHeight: 48,
            padding: '9px 10px',
            borderRadius: 14,
            background: 'rgba(237,244,251,0.8)',
            color: '#3a5064',
            fontSize: 12,
            fontWeight: 800,
            lineHeight: 1.45,
          }}
        >
          {tierFlow}
        </div>
      </div>
    </details>
  )
}

type TierVisual = {
  name: string
  level: number
  kind: 'medal' | 'gem' | 'crown' | 'legend'
  shell: string
  rim: string
  core: string
  text: string
  subtitle: string
}

const TIER_VISUALS: Record<RankTier, TierVisual> = {
  bronze: { name: '青铜', level: 1, kind: 'medal', shell: '#d6b08b', rim: '#a86e47', core: '#f5dfc0', text: '#72452b', subtitle: '入门棋手' },
  silver: { name: '白银', level: 2, kind: 'medal', shell: '#d7dde6', rim: '#98a4b4', core: '#f8fbff', text: '#5c6776', subtitle: '稳定防守' },
  gold: { name: '黄金', level: 3, kind: 'medal', shell: '#f4c148', rim: '#d08a00', core: '#fff0bf', text: '#7c5700', subtitle: '攻守平衡' },
  platinum: { name: '铂金', level: 4, kind: 'gem', shell: '#88d4d7', rim: '#3b9da5', core: '#dff8f9', text: '#266c73', subtitle: '连续压迫' },
  diamond: { name: '钻石', level: 5, kind: 'gem', shell: '#89b9ff', rim: '#4774d8', core: '#e7f0ff', text: '#3257ab', subtitle: '布局大师' },
  master: { name: '大师', level: 6, kind: 'crown', shell: '#ffb48a', rim: '#e4673a', core: '#fff1e8', text: '#a64327', subtitle: '强攻节奏' },
  grandmaster: { name: '宗师', level: 7, kind: 'crown', shell: '#ffa67b', rim: '#de5b2e', core: '#ffe8d9', text: '#9f3f22', subtitle: '运营统治' },
  legend: { name: '传奇', level: 8, kind: 'legend', shell: '#ffd36b', rim: '#d8a84c', core: '#fff5d0', text: '#8a5b00', subtitle: '最高段位' },
}

function TierBadgeIcon({ tierId, size = 34 }: { tierId: RankTier; size?: number }) {
  const visual = TIER_VISUALS[tierId]

  if (visual.kind === 'gem') {
    return (
      <svg viewBox="0 0 72 72" width={size} height={size} aria-hidden="true">
        <path d="M36 8 56 28 36 62 16 28 36 8Z" fill={visual.shell} />
        <path d="M36 16 48 28 36 52 24 28 36 16Z" fill={visual.core} />
        <path d="M24 28h24" stroke={visual.rim} strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }

  if (visual.kind === 'crown') {
    return (
      <svg viewBox="0 0 72 72" width={size} height={size} aria-hidden="true">
        <path d="M14 52h44l-3 9H17l-3-9Z" fill={visual.rim} />
        <path d="M18 24 28 34l8-16 8 16 10-10-4 24H22l-4-24Z" fill={visual.shell} />
      </svg>
    )
  }

  if (visual.kind === 'legend') {
    return (
      <svg viewBox="0 0 72 72" width={size} height={size} aria-hidden="true">
        <circle cx="36" cy="36" r="24" fill={visual.shell} />
        <path d="M36 14l5.8 11.7 12.9 1.9-9.3 9 2.2 12.8L36 43l-11.6 6.4 2.2-12.8-9.3-9 12.9-1.9L36 14Z" fill={visual.core} />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 72 84" width={size} height={size} aria-hidden="true">
      <path d="M22 8h10l4 10h-8L22 8Z" fill="#6ca6ff" />
      <path d="M50 8H40l-4 10h8l6-10Z" fill="#4e8df2" />
      <circle cx="36" cy="35" r="18" fill={visual.shell} />
      <text x="36" y="40" textAnchor="middle" fontSize="19" fontWeight="900" fill={visual.text} fontFamily="Inter, system-ui, sans-serif">
        {visual.level}
      </text>
    </svg>
  )
}

function getRewardTone(reward: RewardCatalogEntry) {
  switch (reward.slot) {
    case 'title':
      return { bg: 'rgba(11,95,165,0.1)', fg: '#0b5fa5', Icon: Trophy, label: '称号奖励' }
    case 'avatarFrame':
      return { bg: 'rgba(90,103,216,0.1)', fg: '#4f46e5', Icon: UserCircle2, label: '头像框' }
    case 'boardTheme':
      return { bg: 'rgba(22,114,71,0.12)', fg: '#167247', Icon: Palette, label: '棋盘皮肤' }
    case 'stoneEffect':
      return { bg: 'rgba(216,168,76,0.16)', fg: '#b7791f', Icon: Wand2, label: '落子特效' }
    case 'badge':
      return { bg: 'rgba(216,168,76,0.16)', fg: '#b7791f', Icon: Crown, label: '荣誉徽章' }
    default:
      return { bg: 'rgba(11,95,165,0.1)', fg: '#0b5fa5', Icon: Sparkles, label: '奖励' }
  }
}

function RewardIcon({ reward, locked }: { reward: RewardCatalogEntry; locked?: boolean }) {
  const tone = getRewardTone(reward)
  const Icon = locked ? Lock : tone.Icon

  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 15,
        display: 'grid',
        placeItems: 'center',
        background: locked ? 'rgba(93,111,129,0.12)' : tone.bg,
        color: locked ? '#5d6f81' : tone.fg,
      }}
    >
      <Icon size={20} />
    </div>
  )
}

function RewardCard({
  reward,
  locked = false,
  equipped = false,
  onEquip,
}: {
  reward: RewardCatalogEntry
  locked?: boolean
  equipped?: boolean
  onEquip?: () => void
}) {
  const tone = getRewardTone(reward)
  const ToneIcon = tone.Icon
  const canEquip = !locked && !!onEquip && reward.slot !== 'badge'

  return (
    <article
      style={{
        display: 'grid',
        gridTemplateColumns: '48px 1fr',
        gap: 12,
        alignItems: 'start',
        padding: 12,
        borderRadius: 18,
        border: equipped ? '1px solid rgba(22,114,71,0.42)' : '1px solid rgba(11,95,165,0.12)',
        background: locked
          ? 'rgba(237,244,251,0.72)'
          : equipped
            ? 'linear-gradient(135deg, rgba(168,230,191,0.24), rgba(255,255,255,0.96))'
            : 'rgba(255,255,255,0.9)',
      }}
    >
      <RewardIcon reward={reward} locked={locked} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{ color: '#123b5b', fontSize: 15 }}>{reward.name}</strong>
          <span
            style={{
              minHeight: 24,
              padding: '0 8px',
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: locked ? 'rgba(93,111,129,0.12)' : tone.bg,
              color: locked ? '#5d6f81' : tone.fg,
              fontSize: 11,
              fontWeight: 900,
            }}
          >
            <ToneIcon size={13} />
            {tone.label}
          </span>
          <span
            style={{
              minHeight: 24,
              padding: '0 8px',
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              background: 'rgba(237,244,251,0.9)',
              color: '#0b5fa5',
              fontSize: 11,
              fontWeight: 900,
            }}
          >
            {reward.tierName}
          </span>
        </div>
        <p style={{ margin: '6px 0 0', color: '#5d6f81', fontSize: 13, fontWeight: 800, lineHeight: 1.45 }}>
          {reward.description}
        </p>
        {!locked && (
          <button
            type="button"
            disabled={!canEquip || equipped}
            onClick={onEquip}
            style={{
              minHeight: 34,
              marginTop: 10,
              padding: '0 12px',
              borderRadius: 8,
              border: equipped ? '1px solid rgba(22,114,71,0.22)' : '1px solid rgba(11,95,165,0.14)',
              background: equipped ? 'rgba(22,114,71,0.12)' : canEquip ? '#ffffff' : 'rgba(237,244,251,0.72)',
              color: equipped ? '#167247' : canEquip ? '#0b5fa5' : '#5d6f81',
              fontSize: 12,
              fontWeight: 900,
              cursor: canEquip && !equipped ? 'pointer' : 'default',
            }}
          >
            {reward.slot === 'badge' ? '徽章自动生效' : equipped ? '已装备' : '装备'}
          </button>
        )}
      </div>
    </article>
  )
}

export default function RankBackupPage() {
  const router = useRouter()
  const { playNav, playBack, playClose } = useSoundContext()
  const {
    rankData,
    winRate,
    tierProgress,
    currentBoardTheme,
    equippedTitle,
    equippedAvatarFrame,
    equippedStoneEffect,
    unlockedRewardEntries,
    upcomingRewardEntries,
    setBoardTheme,
    setEquippedTitle,
    setEquippedAvatarFrame,
    setEquippedStoneEffect,
  } = useRank()

  const currentTier = TIER_VISUALS[rankData.currentTier]
  const history = useMemo(() => [...rankData.tierHistory].reverse().slice(0, 5), [rankData.tierHistory])
  const matchHistory = useMemo(() => [...(rankData.matchHistory ?? [])].reverse().slice(0, 8), [rankData.matchHistory])
  const recentUnlockedRewards = useMemo(() => unlockedRewardEntries.slice(-3).reverse(), [unlockedRewardEntries])
  const equippedRewardSummary = useMemo(
    () =>
      [
        equippedTitle ? `称号 · ${equippedTitle}` : null,
        equippedAvatarFrame ? `头像框 · ${equippedAvatarFrame === 'diamond' ? '钻石框' : '白银框'}` : null,
        currentBoardTheme && currentBoardTheme !== 'default'
          ? `棋盘 · ${currentBoardTheme === 'forest' ? '森林棋盘' : currentBoardTheme === 'ocean' ? '海盐棋盘' : currentBoardTheme}`
          : null,
        equippedStoneEffect && equippedStoneEffect !== 'none'
          ? `特效 · ${equippedStoneEffect === 'spark' ? '星火' : equippedStoneEffect === 'ripple' ? '涟漪' : equippedStoneEffect}`
          : null,
      ].filter(Boolean) as string[],
    [currentBoardTheme, equippedAvatarFrame, equippedStoneEffect, equippedTitle]
  )

  const [canEnterMatch, setCanEnterMatch] = useState(false)
  const [entryChecked, setEntryChecked] = useState(false)
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false)

  const nextRewardTierName = upcomingRewardEntries[0]?.tierName ?? '更高段位'

  useEffect(() => {
    const fromSettlement = window.sessionStorage.getItem(RANK_FROM_PVC_KEY) === '1'
    setCanEnterMatch(fromSettlement)
    if (fromSettlement) {
      window.sessionStorage.removeItem(RANK_FROM_PVC_KEY)
    }
    setEntryChecked(true)
  }, [])

  const isRewardEquipped = (reward: RewardCatalogEntry) => {
    if (reward.slot === 'title') return equippedTitle === (reward.titleText || reward.name)
    if (reward.slot === 'avatarFrame') return equippedAvatarFrame === reward.avatarFrame
    if (reward.slot === 'stoneEffect') return equippedStoneEffect === reward.stoneEffect
    if (reward.slot === 'boardTheme') return currentBoardTheme === reward.themeId
    return false
  }

  const equipReward = (reward: RewardCatalogEntry) => {
    if (reward.slot === 'title') setEquippedTitle(reward.titleText || reward.name)
    if (reward.slot === 'avatarFrame' && reward.avatarFrame) setEquippedAvatarFrame(reward.avatarFrame)
    if (reward.slot === 'stoneEffect' && reward.stoneEffect) setEquippedStoneEffect(reward.stoneEffect)
    if (reward.slot === 'boardTheme' && reward.themeId) setBoardTheme(reward.themeId as BoardTheme)
  }

  return (
    <main className={`${fusion.page} pt-safe-top pb-safe-bottom`}>
      <div style={{ maxWidth: 430, margin: '0 auto', padding: '0 12px 20px' }}>
        <div className={fusion.content}>
          <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.05, display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <Trophy size={24} />
              排位
            </h1>
            <button
              className={fusion.chip}
              type="button"
              onClick={() => {
                playBack()
                router.push('/mode')
              }}
            >
              返回
            </button>
          </section>

          <section className={fusion.rankHero}>
            <div className={fusion.rankHeroCard}>
              <div className={fusion.rankHeroTop}>
                <div className={fusion.rankMedal} style={{ width: 92, height: 92, borderRadius: 24 }}>
                  <TierBadgeIcon tierId={rankData.currentTier} size={48} />
                </div>
                <div>
                  <h2 className={fusion.rankName}>{currentTier.name}</h2>
                  <p className={fusion.rankMeta}>
                    总积分 {rankData.totalScore} · 当前星数 {rankData.currentStars}
                  </p>
                  {equippedTitle && (
                    <span
                      style={{
                        minHeight: 28,
                        marginTop: 8,
                        padding: '0 10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        borderRadius: 999,
                        background: 'rgba(216,168,76,0.18)',
                        color: '#8a5b00',
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      <BadgeCheck size={13} />
                      {equippedTitle}
                    </span>
                  )}
                </div>
              </div>
              <div className={fusion.progressTrack}>
                <span className={fusion.progressFill} style={{ width: `${Math.max(8, tierProgress)}%` }} />
              </div>
              <div
                style={{
                  marginTop: 12,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    minHeight: 28,
                    padding: '0 10px',
                    borderRadius: 999,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(11,95,165,0.08)',
                    color: '#0b5fa5',
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  <Sparkles size={13} />
                  已解锁 {unlockedRewardEntries.length} 项奖励
                </span>
                {equippedRewardSummary.length > 0 && (
                  <span
                    style={{
                      minHeight: 28,
                      padding: '0 10px',
                      borderRadius: 999,
                      display: 'inline-flex',
                      alignItems: 'center',
                      background: 'rgba(22,114,71,0.1)',
                      color: '#167247',
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    当前已装备 {equippedRewardSummary.length} 项
                  </span>
                )}
              </div>
            </div>

            <div className={fusion.rankStats}>
              <div className={fusion.rankStat}><span>胜率<strong>{winRate}%</strong></span></div>
              <div className={fusion.rankStat}><span>总对局<strong>{rankData.totalGames}</strong></span></div>
              <div className={fusion.rankStat}><span>总胜局<strong>{rankData.totalWins}</strong></span></div>
              <div className={fusion.rankStat}><span>最佳连胜<strong>{rankData.bestWinStreak}</strong></span></div>
            </div>
          </section>

          <div className={fusion.buttonGrid} style={{ marginTop: 10 }}>
            <button
              className={fusion.buttonPrimary}
              type="button"
              disabled={!canEnterMatch}
              aria-disabled={!canEnterMatch}
              onClick={() => {
                if (!canEnterMatch) return
                playNav()
                router.push('/game')
              }}
              style={!canEnterMatch ? { opacity: 0.46, cursor: 'not-allowed', filter: 'grayscale(0.12)' } : undefined}
            >
              进入对局
            </button>
            <button
              className={`${fusion.buttonSecondary} ${fusion.buttonLight}`}
              type="button"
              onClick={() => {
                playBack()
                router.push('/mode')
              }}
            >
              返回模式
            </button>
          </div>

          {entryChecked && !canEnterMatch && (
            <div style={{ marginTop: 8, fontSize: 12, fontWeight: 800, color: '#5d6f81' }}>
              只有在人机排位结算页点击“查看排位”后，才可以从这里直接续进下一局。
            </div>
          )}

          <details className={fusion.tierPanel} style={{ marginTop: 10 }}>
            <summary style={{ listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div className={fusion.tierHeader} style={{ marginBottom: 0, width: '100%' }}>
                <h3>段位体系</h3>
                <span className={fusion.seasonPill}>S1 赛季</span>
              </div>
              <ChevronDown size={16} />
            </summary>
            <div className={fusion.tierMatrix} style={{ marginTop: 10 }}>
              {RANK_TIERS.map((tier) => {
                const tierId = tier.id as RankTier
                const visual = TIER_VISUALS[tierId]
                const active = rankData.currentTier === tierId
                const scoreLabel = tier.starRequirement === Infinity ? '最高段位' : `${tier.minScore} 分`

                return (
                  <article key={tier.id} className={`${fusion.tierMatrixCard} ${active ? fusion.tierMatrixCardActive : ''}`}>
                    <div className={fusion.tierMatrixIcon}>
                      <TierBadgeIcon tierId={tierId} size={30} />
                    </div>
                    <div className={fusion.tierMatrixCopy}>
                      <strong>{visual.name}</strong>
                      <span>{visual.subtitle}</span>
                    </div>
                    <em className={fusion.tierMatrixHint}>{scoreLabel}</em>
                  </article>
                )
              })}
            </div>
          </details>

          <details className={fusion.tierPanel} style={{ marginTop: 10 }}>
            <summary style={{ listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 900 }}>
              段位历程
              <ChevronDown size={16} />
            </summary>
            <div className={fusion.tierList} style={{ marginTop: 10 }}>
              {history.length === 0 && <div style={{ color: '#5d6f81', fontWeight: 800 }}>还没有晋级记录。</div>}
              {history.map((entry) => {
                const tierId = entry.tier as RankTier
                const tierConfig = RANK_TIERS.find((tier) => tier.id === tierId)
                const isCurrentTier = tierId === rankData.currentTier
                const subtitleParts = [
                  new Date(entry.achievedAt).toLocaleDateString('zh-CN'),
                  isCurrentTier ? (rankData.currentStars > 0 ? `当前 ${rankData.currentStars} 星` : '当前段位') : '晋级达成',
                ]

                if (tierConfig && Number.isFinite(tierConfig.minScore) && tierConfig.minScore > 0) {
                  subtitleParts.push(`${tierConfig.minScore} 分段`)
                }

                return (
                  <div key={`${entry.tier}-${entry.achievedAt}`} className={fusion.tierItem}>
                    <div className={fusion.tierIcon}>
                      <TierBadgeIcon tierId={tierId} size={24} />
                    </div>
                    <div className={fusion.tierCopy}>
                      <strong>{TIER_LABELS[tierId]}</strong>
                      <span>{subtitleParts.join(' · ')}</span>
                    </div>
                    <span className={fusion.tierScore}><ChevronRight size={15} /></span>
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <strong style={{ color: '#123b5b', fontSize: 15 }}>最近对局</strong>
                <span style={{ color: '#5d6f81', fontSize: 12, fontWeight: 800 }}>
                  当前展示 {matchHistory.length} / 8，最多保留近 50 场排位记录
                </span>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {matchHistory.length === 0 ? (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      border: '1px solid rgba(11,95,165,0.12)',
                      background: 'rgba(237,244,251,0.76)',
                      color: '#5d6f81',
                      fontSize: 13,
                      fontWeight: 800,
                      lineHeight: 1.5,
                    }}
                  >
                    还没有排位对局记录。打一局人机排位后，这里会开始展示每场胜负、分数变化和段位推进。
                  </div>
                ) : (
                  matchHistory.map((match) => <MatchHistoryCard key={match.id} match={match} />)
                )}
              </div>
            </div>
          </details>

          <section
            className={fusion.rewardStrip}
            style={{ cursor: 'pointer' }}
            onClick={() => setRewardDialogOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setRewardDialogOpen(true)
              }
            }}
          >
            <div className={fusion.rewardIcon}><Sparkles size={18} /></div>
            <div style={{ minWidth: 0 }}>
              <strong>已解锁奖励 {unlockedRewardEntries.length} 项</strong>
              <span>
                {unlockedRewardEntries.length > 0
                  ? '点击查看奖励，并装备称号、棋盘皮肤、头像框与落子特效。'
                  : `继续提升段位，下一批奖励会在 ${nextRewardTierName} 开始解锁。`}
              </span>
              {equippedRewardSummary.length > 0 && (
                <div
                  style={{
                    marginTop: 8,
                    padding: '10px 12px',
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.54)',
                    border: '1px solid rgba(11,95,165,0.08)',
                  }}
                >
                  <div style={{ color: '#123b5b', fontSize: 12, fontWeight: 900 }}>当前装备</div>
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {equippedRewardSummary.map((item) => (
                      <span
                        key={item}
                        style={{
                          minHeight: 26,
                          padding: '0 9px',
                          borderRadius: 999,
                          display: 'inline-flex',
                          alignItems: 'center',
                          background: 'rgba(22,114,71,0.1)',
                          color: '#167247',
                          fontSize: 11,
                          fontWeight: 900,
                        }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {recentUnlockedRewards.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {recentUnlockedRewards.map((reward) => {
                    const tone = getRewardTone(reward)
                    return (
                      <span
                        key={reward.id}
                        style={{
                          minHeight: 28,
                          maxWidth: '100%',
                          padding: '0 10px',
                          borderRadius: 999,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: tone.bg,
                          color: tone.fg,
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        <tone.Icon size={13} />
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reward.name}</span>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <AnimatePresence>
        {rewardDialogOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => {
                playClose()
                setRewardDialogOpen(false)
              }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 70,
                background: 'rgba(7, 18, 32, 0.38)',
                backdropFilter: 'blur(10px)',
              }}
            />

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.8 }}
              style={{
                position: 'fixed',
                left: 12,
                right: 12,
                bottom: 'max(14px, env(safe-area-inset-bottom))',
                zIndex: 71,
                width: 'auto',
                maxWidth: 392,
                margin: '0 auto',
                maxHeight: 'min(78dvh, 620px)',
                overflow: 'hidden',
                borderRadius: 24,
                border: '1px solid rgba(11,95,165,0.14)',
                background: 'rgba(255,255,255,0.96)',
                boxShadow: '0 24px 56px rgba(7, 18, 32, 0.22)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '16px 16px 12px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#123b5b', fontSize: 24, lineHeight: 1.08 }}>奖励中心</h3>
                  <p style={{ margin: '4px 0 0', color: '#5d6f81', fontSize: 12, fontWeight: 800 }}>
                    已解锁 {unlockedRewardEntries.length} 项奖励，未解锁的内容会随段位继续开放。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playClose()
                    setRewardDialogOpen(false)
                  }}
                  className={`${fusion.buttonSecondary} ${fusion.buttonLight}`}
                  style={{ width: 40, minHeight: 40, padding: 0, borderRadius: 12 }}
                  aria-label="关闭奖励中心"
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: '0 16px 16px', overflowY: 'auto', maxHeight: 'calc(min(78dvh, 620px) - 72px)' }}>
                <section>
                  <div style={{ marginBottom: 8, color: '#123b5b', fontSize: 14, fontWeight: 900 }}>已解锁奖励</div>
                  {unlockedRewardEntries.length === 0 ? (
                    <div
                      style={{
                        padding: 16,
                        borderRadius: 18,
                        background: 'rgba(237,244,251,0.76)',
                        border: '1px solid rgba(11,95,165,0.12)',
                      }}
                    >
                      <strong style={{ display: 'block', color: '#123b5b', fontSize: 15 }}>奖励还没开始解锁</strong>
                      <p style={{ margin: '6px 0 0', color: '#5d6f81', fontSize: 13, fontWeight: 800 }}>
                        继续推进排位，你会依次拿到称号、头像框、棋盘皮肤和落子特效。
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {unlockedRewardEntries.map((reward) => (
                        <RewardCard
                          key={reward.id}
                          reward={reward}
                          equipped={isRewardEquipped(reward)}
                          onEquip={() => equipReward(reward)}
                        />
                      ))}
                    </div>
                  )}
                </section>

                <section style={{ marginTop: 16 }}>
                  <div style={{ marginBottom: 8, color: '#123b5b', fontSize: 14, fontWeight: 900 }}>即将解锁</div>
                  {upcomingRewardEntries.length === 0 ? (
                    <div
                      style={{
                        padding: 16,
                        borderRadius: 18,
                        background: 'rgba(255,248,220,0.76)',
                        border: '1px solid rgba(216,168,76,0.24)',
                      }}
                    >
                      <strong style={{ display: 'block', color: '#123b5b', fontSize: 15 }}>当前赛季奖励已全部解锁</strong>
                      <p style={{ margin: '6px 0 0', color: '#5d6f81', fontSize: 13, fontWeight: 800 }}>
                        现在可以把已解锁的奖励逐一装备上，后续再补更高阶的特效和视觉内容。
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {upcomingRewardEntries.map((reward) => (
                        <RewardCard key={reward.id} reward={reward} locked />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  )
}
