/**
 * 排位系统核心逻辑
 * 类似英雄联盟手游的排位升级机制
 */

import type {
  RankTier,
  RankTierConfig,
  RankReward,
  PlayerRankData,
  MatchResult,
  RankMatchRecord,
  RankPromotionEvent,
  Difficulty,
} from '@/types'

// 重新导出类型
export type { MatchResult }

// ==================== 段位配置 ====================

export const RANK_TIERS: RankTierConfig[] = [
  {
    id: 'bronze',
    name: '青铜',
    icon: '🥉',
    color: '#CD7F32',
    gradient: 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)',
    minScore: 0,
    maxScore: 299,
    starRequirement: 3,
    rewards: [
      { type: 'title', name: '初出茅庐', description: '完成首次排位对局', icon: '🌱' },
    ],
  },
  {
    id: 'silver',
    name: '白银',
    icon: '🥈',
    color: '#C0C0C0',
    gradient: 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)',
    minScore: 300,
    maxScore: 599,
    starRequirement: 3,
    rewards: [
      { type: 'avatar', name: '白银头像框', description: '专属白银段位头像框', icon: '✨' },
    ],
  },
  {
    id: 'gold',
    name: '黄金',
    icon: '🥇',
    color: '#FFD700',
    gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    minScore: 600,
    maxScore: 999,
    starRequirement: 4,
    rewards: [
      { type: 'theme', name: '黄金棋盘', description: '专属黄金段位棋盘皮肤', icon: '🎨' },
    ],
  },
  {
    id: 'platinum',
    name: '铂金',
    icon: '💎',
    color: '#00CED1',
    gradient: 'linear-gradient(135deg, #00CED1 0%, #20B2AA 100%)',
    minScore: 1000,
    maxScore: 1499,
    starRequirement: 4,
    rewards: [
      { type: 'title', name: '棋艺精湛', description: '达到铂金段位', icon: '💠' },
    ],
  },
  {
    id: 'diamond',
    name: '钻石',
    icon: '💠',
    color: '#4169E1',
    gradient: 'linear-gradient(135deg, #4169E1 0%, #0000CD 100%)',
    minScore: 1500,
    maxScore: 2199,
    starRequirement: 5,
    rewards: [
      { type: 'avatar', name: '钻石头像框', description: '专属钻石段位头像框', icon: '💎' },
      { type: 'theme', name: '钻石棋盘', description: '专属钻石段位棋盘皮肤', icon: '🎨' },
    ],
  },
  {
    id: 'master',
    name: '大师',
    icon: '👑',
    color: '#9370DB',
    gradient: 'linear-gradient(135deg, #9370DB 0%, #8A2BE2 100%)',
    minScore: 2200,
    maxScore: 3199,
    starRequirement: 5,
    rewards: [
      { type: 'title', name: '一代宗师', description: '达到大师段位', icon: '🏆' },
      { type: 'special', name: '大师勋章', description: '永久展示的大师勋章', icon: '🎖️' },
    ],
  },
  {
    id: 'grandmaster',
    name: '宗师',
    icon: '🏆',
    color: '#FF6347',
    gradient: 'linear-gradient(135deg, #FF6347 0%, #DC143C 100%)',
    minScore: 3200,
    maxScore: 4999,
    starRequirement: 6,
    rewards: [
      { type: 'title', name: '举世无双', description: '达到宗师段位', icon: '👑' },
      { type: 'theme', name: '宗师棋盘', description: '专属宗师段位棋盘皮肤', icon: '🎨' },
    ],
  },
  {
    id: 'legend',
    name: '传说',
    icon: '🌟',
    color: '#FFD700',
    gradient: 'linear-gradient(135deg, #FFD700 0%, #FF1493 50%, #00CED1 100%)',
    minScore: 5000,
    maxScore: Infinity,
    starRequirement: Infinity,
    rewards: [
      { type: 'title', name: '五子棋传说', description: '达到最高段位传说', icon: '🌟' },
      { type: 'special', name: '传说勋章', description: '至高无上的传说勋章', icon: '👑' },
    ],
  },
]

// ==================== 分数计算配置 ====================

/** 难度系数 */
const DIFFICULTY_MULTIPLIERS: Record<Difficulty, number> = {
  easy: 1.0,    // 新手难度
  medium: 1.5,  // 业余难度
  hard: 2.0,    // 专业难度
}

/** 基础分数 */
const BASE_SCORES = {
  win: 20,      // 胜利基础分
  loss: -10,    // 失败扣分
  timeout: -15, // 超时扣分更多
}

/** 连胜奖励 */
const WIN_STREAK_BONUSES: Record<number, number> = {
  1: 0,   // 1连胜：无加成
  2: 2,   // 2连胜：+2
  3: 5,   // 3连胜：+5
  4: 8,   // 4连胜：+8
  5: 12,  // 5连胜：+12
}

/** 快速胜利奖励（15步以内获胜） */
const QUICK_WIN_BONUS = 5

/** 完美胜利奖励（没有给对手造成威胁） */
const PERFECT_WIN_BONUS = 3

/** 段位保护配置 */
const PROTECTION_CONFIG = {
  // 首次达到新段位时的保护场次
  initialProtection: 3,
  // 连败触发保护的门限
  lossStreakThreshold: 3,
  // 连败保护提供的保护场次
  lossStreakProtection: 1,
  // 降级保护：0星时额外提供的保护
  demotionProtection: 1,
}

// ==================== 核心函数 ====================

/**
 * 获取段位配置
 */
export function getTierConfig(tier: RankTier): RankTierConfig {
  const config = RANK_TIERS.find((t) => t.id === tier)
  if (!config) throw new Error(`Unknown tier: ${tier}`)
  return config
}

/**
 * 获取下一个段位
 */
export function getNextTier(tier: RankTier): RankTier | null {
  const currentIndex = RANK_TIERS.findIndex((t) => t.id === tier)
  if (currentIndex === -1 || currentIndex === RANK_TIERS.length - 1) return null
  return RANK_TIERS[currentIndex + 1].id
}

/**
 * 获取上一个段位
 */
export function getPreviousTier(tier: RankTier): RankTier | null {
  const currentIndex = RANK_TIERS.findIndex((t) => t.id === tier)
  if (currentIndex <= 0) return null
  return RANK_TIERS[currentIndex - 1].id
}

/**
 * 计算对局得分
 */
export function calculateMatchScore(
  result: MatchResult,
  currentWinStreak: number
): { scoreChange: number; breakdown: string[] } {
  const breakdown: string[] = []
  let scoreChange = 0

  if (result.isWin) {
    // 基础胜利分
    const baseScore = BASE_SCORES.win
    scoreChange += baseScore
    breakdown.push(`胜利基础分 +${baseScore}`)

    // 难度加成
    const difficultyMultiplier = DIFFICULTY_MULTIPLIERS[result.difficulty]
    const difficultyBonus = Math.round(baseScore * (difficultyMultiplier - 1))
    scoreChange += difficultyBonus
    if (difficultyBonus > 0) {
      breakdown.push(`${getDifficultyName(result.difficulty)}难度加成 +${difficultyBonus}`)
    }

    // 连胜奖励
    const streakBonus = WIN_STREAK_BONUSES[Math.min(currentWinStreak, 5)]
    if (streakBonus > 0) {
      scoreChange += streakBonus
      breakdown.push(`${currentWinStreak}连胜奖励 +${streakBonus}`)
    }

    // 快速胜利奖励
    if (result.moveCount <= 15) {
      scoreChange += QUICK_WIN_BONUS
      breakdown.push(`快速胜利奖励 +${QUICK_WIN_BONUS}`)
    }
  } else {
    // 失败扣分
    const lossPenalty = result.isTimeout ? BASE_SCORES.timeout : BASE_SCORES.loss
    scoreChange += lossPenalty
    breakdown.push(result.isTimeout ? `超时判负 ${lossPenalty}` : `失败 ${lossPenalty}`)
  }

  return { scoreChange, breakdown }
}

/**
 * 获取难度名称
 */
function getDifficultyName(difficulty: Difficulty): string {
  const names: Record<Difficulty, string> = {
    easy: '新手',
    medium: '业余',
    hard: '专业',
  }
  return names[difficulty]
}

/**
 * 计算星星变化
 * 胜利+1星，失败-1星（青铜段位不掉星）
 * 支持段位保护机制
 */
export function calculateStarChange(
  isWin: boolean,
  currentTier: RankTier,
  currentStars: number,
  protectionMatches: number = 0,
  lossStreak: number = 0
): { starChange: number; shouldDemote: boolean; isProtected: boolean; protectionMessage?: string } {
  // 胜利直接+1星
  if (isWin) {
    return { starChange: 1, shouldDemote: false, isProtected: false }
  }

  // 青铜段位不掉星
  if (currentTier === 'bronze') {
    return { starChange: 0, shouldDemote: false, isProtected: true, protectionMessage: '青铜段位保护' }
  }

  // 检查是否有段位保护
  if (protectionMatches > 0) {
    return {
      starChange: 0,
      shouldDemote: false,
      isProtected: true,
      protectionMessage: `段位保护中（剩余${protectionMatches}场）`,
    }
  }

  // 连败保护：连败3场后获得1场保护
  if (lossStreak >= PROTECTION_CONFIG.lossStreakThreshold) {
    return {
      starChange: 0,
      shouldDemote: false,
      isProtected: true,
      protectionMessage: '连败保护已触发',
    }
  }

  // 0星时的降级保护
  if (currentStars === 0) {
    return {
      starChange: 0,
      shouldDemote: false,
      isProtected: true,
      protectionMessage: '0星保护（再输一场将降级）',
    }
  }

  // 正常扣星
  const shouldDemote = currentStars <= 1
  return { starChange: -1, shouldDemote, isProtected: false }
}

/**
 * 计算保护场次
 * 首次达到新段位时获得保护
 */
export function calculateProtectionMatches(
  isNewTier: boolean,
  currentProtection: number,
  isWin: boolean
): number {
  if (isNewTier) {
    return PROTECTION_CONFIG.initialProtection
  }

  // 消耗保护场次
  if (currentProtection > 0 && !isWin) {
    return currentProtection - 1
  }

  return currentProtection
}

/**
 * 检查是否升段
 */
export function checkPromotion(
  currentTier: RankTier,
  currentStars: number,
  starChange: number
): { shouldPromote: boolean; newTier: RankTier; newStars: number } {
  const tierConfig = getTierConfig(currentTier)
  const newStars = currentStars + starChange

  // 检查是否达到升段条件
  if (newStars >= tierConfig.starRequirement) {
    const nextTier = getNextTier(currentTier)
    if (nextTier) {
      return {
        shouldPromote: true,
        newTier: nextTier,
        newStars: newStars - tierConfig.starRequirement,
      }
    }
  }

  return {
    shouldPromote: false,
    newTier: currentTier,
    newStars: Math.max(0, newStars),
  }
}

/**
 * 检查是否降级
 */
export function checkDemotion(
  currentTier: RankTier,
  currentStars: number,
  starChange: number
): { shouldDemote: boolean; newTier: RankTier; newStars: number } {
  const newStars = currentStars + starChange

  // 如果星星数小于0，降级
  if (newStars < 0) {
    const previousTier = getPreviousTier(currentTier)
    if (previousTier) {
      const prevConfig = getTierConfig(previousTier)
      return {
        shouldDemote: true,
        newTier: previousTier,
        newStars: prevConfig.starRequirement - 1, // 降级后保留上一段位的最高星数-1
      }
    }
  }

  return {
    shouldDemote: false,
    newTier: currentTier,
    newStars: Math.max(0, newStars),
  }
}

/**
 * 处理对局结果，更新排位数据
 * 支持段位保护机制
 */
export function processMatchResult(
  currentData: PlayerRankData,
  result: MatchResult
): {
  newData: PlayerRankData
  scoreChange: number
  starChange: number
  promotionEvent: RankPromotionEvent | null
  isTierChanged: boolean
  isProtected: boolean
  protectionMessage?: string
} {
  // 计算分数变化
  const { scoreChange } = calculateMatchScore(result, currentData.winStreak)

  // 更新连胜/连败
  const newWinStreak = result.isWin ? currentData.winStreak + 1 : 0
  const newLossStreak = result.isWin ? 0 : currentData.lossStreak + 1
  const newBestWinStreak = Math.max(currentData.bestWinStreak, newWinStreak)

  // 计算星星变化（考虑保护机制）
  const {
    starChange,
    shouldDemote,
    isProtected,
    protectionMessage,
  } = calculateStarChange(
    result.isWin,
    currentData.currentTier,
    currentData.currentStars,
    currentData.protectionMatches,
    newLossStreak
  )

  // 检查升段或降级
  let promotionEvent: RankPromotionEvent | null = null
  let newTier = currentData.currentTier
  let newStars = currentData.currentStars + starChange
  let isTierChanged = false

  if (result.isWin) {
    const promotion = checkPromotion(currentData.currentTier, currentData.currentStars, starChange)
    if (promotion.shouldPromote) {
      newTier = promotion.newTier
      newStars = promotion.newStars
      isTierChanged = true

      const newTierConfig = getTierConfig(newTier)
      promotionEvent = {
        fromTier: currentData.currentTier,
        toTier: newTier,
        newStars,
        rewards: newTierConfig.rewards,
        isMasterTier: newTier === 'master' || newTier === 'grandmaster' || newTier === 'legend',
      }
    }
  } else if (shouldDemote) {
    const demotion = checkDemotion(currentData.currentTier, currentData.currentStars, starChange)
    if (demotion.shouldDemote) {
      newTier = demotion.newTier
      newStars = demotion.newStars
      isTierChanged = true
    }
  }

  // 确保星星数不为负
  newStars = Math.max(0, newStars)

  // 检查是否获得大师勋章
  const hasMasterMedal = currentData.hasMasterMedal || newTier === 'master' || newTier === 'grandmaster' || newTier === 'legend'

  // 计算新的保护场次
  const newProtectionMatches = calculateProtectionMatches(
    isTierChanged && result.isWin,
    currentData.protectionMatches,
    result.isWin
  )

  // 构建新的排位数据
  const matchRecord: RankMatchRecord = {
    ...result,
    id: `${result.timestamp}-${currentData.totalGames + 1}`,
    scoreChange,
    starChange,
    beforeTier: currentData.currentTier,
    beforeStars: currentData.currentStars,
    afterTier: newTier,
    afterStars: newStars,
    isProtected,
    protectionMessage,
    winStreakAfter: newWinStreak,
  }

  const newData: PlayerRankData = {
    ...currentData,
    currentTier: newTier,
    currentStars: newStars,
    totalScore: currentData.totalScore + scoreChange,
    totalWins: result.isWin ? currentData.totalWins + 1 : currentData.totalWins,
    totalGames: currentData.totalGames + 1,
    winStreak: newWinStreak,
    lossStreak: newLossStreak,
    bestWinStreak: newBestWinStreak,
    hasMasterMedal,
    masterMedalDate: currentData.masterMedalDate || (hasMasterMedal && !currentData.hasMasterMedal ? result.timestamp : undefined),
    protectionMatches: newProtectionMatches,
    matchHistory: [...(currentData.matchHistory ?? []), matchRecord].slice(-50),
  }

  // 如果是升段，记录历史
  if (promotionEvent) {
    newData.tierHistory = [
      ...currentData.tierHistory,
      {
        tier: newTier,
        achievedAt: result.timestamp,
        stars: newStars,
      },
    ]

    // 解锁奖励
    const newTierConfig = getTierConfig(newTier)
    newData.unlockedRewards = [
      ...currentData.unlockedRewards,
      ...newTierConfig.rewards.map((r) => r.name),
    ]
  }

  return {
    newData,
    scoreChange,
    starChange,
    promotionEvent,
    isTierChanged,
    isProtected,
    protectionMessage,
  }
}

/**
 * 获取初始排位数据
 */
export function getInitialRankData(): PlayerRankData {
  return {
    currentTier: 'bronze',
    currentStars: 0,
    totalScore: 0,
    totalWins: 0,
    totalGames: 0,
    winStreak: 0,
    lossStreak: 0,
    bestWinStreak: 0,
    tierHistory: [
      {
        tier: 'bronze',
        achievedAt: new Date().toISOString(),
        stars: 0,
      },
    ],
    unlockedRewards: [],
    hasMasterMedal: false,
    protectionMatches: 0,
    matchHistory: [],
  }
}

/**
 * 计算胜率
 */
export function calculateWinRate(totalWins: number, totalGames: number): number {
  if (totalGames === 0) return 0
  return Math.round((totalWins / totalGames) * 100)
}

/**
 * 获取段位进度百分比
 */
export function getTierProgress(currentStars: number, tier: RankTier): number {
  const config = getTierConfig(tier)
  // 传说段位没有上限，显示为100%
  if (config.starRequirement === Infinity) {
    return 100
  }
  return Math.min(100, (currentStars / config.starRequirement) * 100)
}

/**
 * 获取段位图标和颜色
 */
export function getTierVisuals(tier: RankTier): { icon: string; color: string; gradient: string } {
  const config = getTierConfig(tier)
  return {
    icon: config.icon,
    color: config.color,
    gradient: config.gradient,
  }
}
