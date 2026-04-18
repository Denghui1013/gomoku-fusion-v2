'use client'

import { motion } from 'framer-motion'
import { Star, TrendingUp, Trophy, Target, Zap, Award, Crown } from 'lucide-react'
import { useRank } from '@/context/RankContext'
import { MasterMedal, MasterBadgeSmall } from './MasterMedal'
import { RANK_TIERS } from '@/lib/rankSystem'

export function RankDisplay({ compact = false }: { compact?: boolean }) {
  const { rankData, winRate, tierProgress, currentTierConfig } = useRank()
  const currentTierMeta = getTierMeta(currentTierConfig.id)

  if (compact) return <CompactRankDisplay />

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center gap-3 sm:gap-4">
        <motion.div
          className="relative w-[4.5rem] h-[4.5rem] sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl shrink-0"
          style={{
            background: currentTierConfig.gradient,
            boxShadow: `0 10px 30px ${currentTierConfig.color}40`,
          }}
          whileHover={{ scale: 1.03 }}
          transition={{ type: 'spring', stiffness: 320 }}
        >
          {currentTierMeta.icon}
          <div
            className="absolute inset-0 rounded-2xl opacity-50"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.28) 0%, transparent 52%)',
            }}
          />
        </motion.div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl sm:text-2xl font-black truncate" style={{ color: currentTierConfig.color }}>
              {currentTierMeta.name}
            </h3>
            {rankData.hasMasterMedal && <MasterBadgeSmall />}
          </div>

          <div className="flex items-center gap-1 mb-2 min-h-6">
            {currentTierConfig.starRequirement === Infinity ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold shadow-lg">
                  <Crown className="w-4 h-4" />
                  <span>{rankData.currentStars}</span>
                  <span className="text-xs opacity-80">星</span>
                </div>
                <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  传奇段位无上限
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 flex-wrap">
                {[...Array(Math.min(currentTierConfig.starRequirement, 6))].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${i < rankData.currentStars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
                {currentTierConfig.starRequirement > 6 && (
                  <span className="ml-1 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {rankData.currentStars}/{currentTierConfig.starRequirement}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, var(--primary) 12%, #94a3b8)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: currentTierConfig.gradient }}
              initial={{ width: 0 }}
              animate={{ width: `${tierProgress}%` }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            />
          </div>
        </div>

        {rankData.hasMasterMedal && (
          <div className="hidden sm:block">
            <MasterMedal showEasterEgg={false} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Trophy} label="总对局" value={rankData.totalGames} color="text-blue-500" />
        <StatCard icon={Target} label="总胜利" value={rankData.totalWins} color="text-green-500" />
        <StatCard icon={TrendingUp} label="胜率" value={`${winRate}%`} color="text-purple-500" />
        <StatCard icon={Zap} label="最高连胜" value={rankData.bestWinStreak} color="text-orange-500" />
      </div>

      {rankData.winStreak > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center gap-2 p-3 rounded-xl border"
          style={{
            background: 'color-mix(in srgb, #f97316 10%, var(--card-bg))',
            borderColor: 'color-mix(in srgb, #f97316 35%, var(--card-border))',
          }}
        >
          <Zap className="w-5 h-5 text-orange-500" />
          <span className="text-orange-600 font-medium">{rankData.winStreak} 连胜进行中</span>
          <Zap className="w-5 h-5 text-orange-500" />
        </motion.div>
      )}
    </motion.div>
  )
}

function CompactRankDisplay() {
  const { rankData, currentTierConfig } = useRank()
  const currentTierMeta = getTierMeta(currentTierConfig.id)

  return (
    <div className="game-panel flex items-center gap-3 rounded-xl p-3">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
        style={{
          background: currentTierConfig.gradient,
          boxShadow: `0 4px 16px ${currentTierConfig.color}30`,
        }}
      >
        {currentTierMeta.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>
            {currentTierMeta.name}
          </span>
          {rankData.hasMasterMedal && <MasterBadgeSmall />}
        </div>
        <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span>
            {rankData.currentStars}
            {currentTierConfig.starRequirement !== Infinity ? `/${currentTierConfig.starRequirement}` : ''}
          </span>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Trophy
  label: string
  value: string | number
  color: string
}) {
  return (
    <div
      className="flex flex-col items-center p-3 rounded-xl border"
      style={{ background: 'var(--background)', borderColor: 'var(--card-border)' }}
    >
      <Icon className={`w-5 h-5 ${color} mb-1`} />
      <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
        {value}
      </span>
      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </span>
    </div>
  )
}

export function RankHistoryTimeline() {
  const { rankData } = useRank()

  if (rankData.tierHistory.length <= 1) {
    return (
      <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
        <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>还没有段位历史记录</p>
        <p className="text-sm">开始对局，逐步提升你的段位吧</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>
        段位历程
      </h4>
      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-yellow-400 to-gray-300" />

        <div className="space-y-4">
          {[...rankData.tierHistory].reverse().map((entry, index) => {
            const config = getTierConfig(entry.tier)
            const meta = getTierMeta(config.id)
            const date = new Date(entry.achievedAt)
            const isCurrentTier = entry.tier === rankData.currentTier
            const displayStars = isCurrentTier ? rankData.currentStars : entry.stars

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06 }}
                className="flex items-center gap-4"
              >
                <div
                  className="relative z-10 w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                  style={{
                    background: config.gradient,
                    boxShadow: `0 4px 16px ${config.color}30`,
                  }}
                >
                  {meta.icon}
                </div>

                <div className="flex-1 rounded-xl p-3 border" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold" style={{ color: config.color }}>
                      {meta.name}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {date.toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span>{displayStars} 星</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function getTierConfig(tier: string) {
  return RANK_TIERS.find((t) => t.id === tier) || RANK_TIERS[0]
}

function getTierMeta(tierId: string): { name: string; icon: string } {
  const map: Record<string, { name: string; icon: string }> = {
    bronze: { name: '青铜', icon: '🥉' },
    silver: { name: '白银', icon: '🥈' },
    gold: { name: '黄金', icon: '🥇' },
    platinum: { name: '铂金', icon: '💎' },
    diamond: { name: '钻石', icon: '💠' },
    master: { name: '大师', icon: '👑' },
    grandmaster: { name: '宗师', icon: '🏆' },
    legend: { name: '传奇', icon: '🌟' },
  }

  return map[tierId] || { name: tierId, icon: '🏅' }
}
