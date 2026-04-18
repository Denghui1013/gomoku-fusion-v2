import type {
  AvatarFrame,
  BoardTheme,
  PlayerRankData,
  RankReward,
  RankTier,
  StoneEffect,
} from '@/types'

export type RewardSlot = 'title' | 'avatarFrame' | 'boardTheme' | 'stoneEffect' | 'badge'

export interface RewardCatalogEntry extends RankReward {
  id: string
  tierId: RankTier
  tierName: string
  slot: RewardSlot
  themeId?: BoardTheme
  titleText?: string
  avatarFrame?: AvatarFrame
  stoneEffect?: StoneEffect
}

const TIER_ORDER: RankTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'legend']

export const TIER_LABELS: Record<RankTier, string> = {
  bronze: '青铜',
  silver: '白银',
  gold: '黄金',
  platinum: '铂金',
  diamond: '钻石',
  master: '大师',
  grandmaster: '宗师',
  legend: '传奇',
}

export const REWARD_CATALOG: RewardCatalogEntry[] = [
  {
    id: 'bronze-title',
    tierId: 'bronze',
    tierName: '青铜',
    type: 'title',
    slot: 'title',
    name: '初入棋境',
    titleText: '初入棋境',
    description: '完成第一段旅程后解锁，适合作为入门称号。',
    icon: 'sprout',
  },
  {
    id: 'silver-avatar',
    tierId: 'silver',
    tierName: '白银',
    type: 'avatar',
    slot: 'avatarFrame',
    name: '白银头像框',
    avatarFrame: 'silver-trim',
    description: '清亮银边头像框，让对局身份更清晰。',
    icon: 'ring',
  },
  {
    id: 'gold-theme',
    tierId: 'gold',
    tierName: '黄金',
    type: 'theme',
    slot: 'boardTheme',
    name: '黄金棋盘',
    themeId: 'gold',
    description: '暖金色棋盘皮肤，胜利后可在棋盘页使用。',
    icon: 'board',
  },
  {
    id: 'platinum-title',
    tierId: 'platinum',
    tierName: '铂金',
    type: 'title',
    slot: 'title',
    name: '棋路精研',
    titleText: '棋路精研',
    description: '铂金段位称号，强调稳定防守与连续压迫。',
    icon: 'spark',
  },
  {
    id: 'diamond-avatar',
    tierId: 'diamond',
    tierName: '钻石',
    type: 'avatar',
    slot: 'avatarFrame',
    name: '钻石头像框',
    avatarFrame: 'diamond-flare',
    description: '带有冷光切面的头像框，适合高段位展示。',
    icon: 'diamond',
  },
  {
    id: 'diamond-theme',
    tierId: 'diamond',
    tierName: '钻石',
    type: 'theme',
    slot: 'boardTheme',
    name: '钻石棋盘',
    themeId: 'diamond',
    description: '清冷钻面棋盘主题，线条更锐利。',
    icon: 'board',
  },
  {
    id: 'master-title',
    tierId: 'master',
    tierName: '大师',
    type: 'title',
    slot: 'title',
    name: '一代宗师',
    titleText: '一代宗师',
    description: '大师段位专属称号，强化关键胜局的成就感。',
    icon: 'crown',
  },
  {
    id: 'master-medal',
    tierId: 'master',
    tierName: '大师',
    type: 'special',
    slot: 'badge',
    name: '大师勋章',
    description: '永久展示的段位勋章，记录第一次到达大师。',
    icon: 'medal',
  },
  {
    id: 'master-effect',
    tierId: 'master',
    tierName: '大师',
    type: 'effect',
    slot: 'stoneEffect',
    name: '金辉落子',
    stoneEffect: 'master-glow',
    description: '最后一手出现柔和金色脉冲，突出关键落点。',
    icon: 'glow',
  },
  {
    id: 'grandmaster-title',
    tierId: 'grandmaster',
    tierName: '宗师',
    type: 'title',
    slot: 'title',
    name: '举世无双',
    titleText: '举世无双',
    description: '宗师称号，适合更强的身份表达。',
    icon: 'crown',
  },
  {
    id: 'grandmaster-theme',
    tierId: 'grandmaster',
    tierName: '宗师',
    type: 'theme',
    slot: 'boardTheme',
    name: '宗师棋盘',
    themeId: 'grandmaster',
    description: '深色金线棋盘主题，观感更沉稳。',
    icon: 'board',
  },
  {
    id: 'legend-title',
    tierId: 'legend',
    tierName: '传奇',
    type: 'title',
    slot: 'title',
    name: '五子棋传说',
    titleText: '五子棋传说',
    description: '传奇段位最终称号。',
    icon: 'star',
  },
  {
    id: 'legend-medal',
    tierId: 'legend',
    tierName: '传奇',
    type: 'special',
    slot: 'badge',
    name: '传说勋章',
    description: '最高段位勋章，代表完整赛季巅峰。',
    icon: 'legend',
  },
  {
    id: 'legend-effect',
    tierId: 'legend',
    tierName: '传奇',
    type: 'effect',
    slot: 'stoneEffect',
    name: '星耀落子',
    stoneEffect: 'legend-trail',
    description: '最后一手带有星彩尾迹和高光脉冲。',
    icon: 'trail',
  },
]

function getReachedTierIds(rankData: PlayerRankData): Set<RankTier> {
  const reached = new Set<RankTier>([rankData.currentTier])
  rankData.tierHistory.forEach((entry) => reached.add(entry.tier))
  return reached
}

export function getUnlockedRewardEntries(rankData: PlayerRankData): RewardCatalogEntry[] {
  const reachedTiers = getReachedTierIds(rankData)
  const unlockedNames = new Set(rankData.unlockedRewards)
  return REWARD_CATALOG.filter((reward) => unlockedNames.has(reward.name) || reachedTiers.has(reward.tierId))
}

export function getUpcomingRewardEntries(rankData: PlayerRankData, limit = 4): RewardCatalogEntry[] {
  const unlockedIds = new Set(getUnlockedRewardEntries(rankData).map((reward) => reward.id))
  return REWARD_CATALOG.filter((reward) => !unlockedIds.has(reward.id)).slice(0, limit)
}

export function getBestUnlockedTitle(rankData: PlayerRankData): string | null {
  const unlocked = getUnlockedRewardEntries(rankData).filter((reward) => reward.slot === 'title')
  if (unlocked.length === 0) return null

  const sorted = [...unlocked].sort(
    (a, b) => TIER_ORDER.indexOf(b.tierId) - TIER_ORDER.indexOf(a.tierId)
  )
  return sorted[0].titleText || sorted[0].name
}

export function hasUnlockedAvatarFrame(rankData: PlayerRankData, frame: AvatarFrame): boolean {
  if (frame === 'none') return true
  return getUnlockedRewardEntries(rankData).some((reward) => reward.avatarFrame === frame)
}

export function hasUnlockedStoneEffect(rankData: PlayerRankData, effect: StoneEffect): boolean {
  if (effect === 'none') return true
  return getUnlockedRewardEntries(rankData).some((reward) => reward.stoneEffect === effect)
}
