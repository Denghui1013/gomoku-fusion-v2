export type Player = 'black' | 'white'

export type CellValue = Player | null

export type Board = CellValue[][]

export type Position = {
  row: number
  col: number
}

export type GameStatus = 'playing' | 'black-wins' | 'white-wins' | 'draw'

export type GameMode = 'pvp' | 'pvc'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface GameState {
  board: Board
  currentPlayer: Player
  status: GameStatus
  lastMove: Position | null
  winner: Player | null
}

export interface WinLine {
  positions: Position[]
  direction: 'horizontal' | 'vertical' | 'diagonal' | 'anti-diagonal'
}

// ==================== 排位系统类型 ====================

export type RankTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'grandmaster' | 'legend'

export type RewardType = 'title' | 'avatar' | 'theme' | 'effect' | 'special'

export type AvatarFrame = 'none' | 'silver-trim' | 'diamond-flare'

export type StoneEffect = 'none' | 'master-glow' | 'legend-trail'

export interface RankReward {
  type: RewardType
  name: string
  description: string
  icon: string
}

export interface RankTierConfig {
  id: RankTier
  name: string
  icon: string
  color: string
  gradient: string
  minScore: number
  maxScore: number
  starRequirement: number
  rewards: RankReward[]
}

export interface PlayerRankData {
  currentTier: RankTier
  currentStars: number
  totalScore: number
  totalWins: number
  totalGames: number
  winStreak: number
  lossStreak: number
  bestWinStreak: number
  tierHistory: {
    tier: RankTier
    achievedAt: string
    stars: number
  }[]
  unlockedRewards: string[]
  hasMasterMedal: boolean
  masterMedalDate?: string
  protectionMatches: number
  matchHistory?: RankMatchRecord[]
}

export interface MatchResult {
  isWin: boolean
  isTimeout: boolean
  difficulty: Difficulty
  moveCount: number
  duration: number
  timestamp: string
  playerSide?: Player
}

export interface RankMatchRecord extends MatchResult {
  id: string
  scoreChange: number
  starChange: number
  beforeTier: RankTier
  beforeStars: number
  afterTier: RankTier
  afterStars: number
  isProtected: boolean
  protectionMessage?: string
  winStreakAfter: number
}

export interface RankPromotionEvent {
  fromTier: RankTier
  toTier: RankTier
  newStars: number
  rewards: RankReward[]
  isMasterTier: boolean
}

// ==================== 棋盘主题类型 ====================

export type BoardTheme = 'default' | 'dark' | 'nature' | 'ocean' | 'gold' | 'diamond' | 'master' | 'grandmaster'

export interface BoardThemeConfig {
  id: BoardTheme
  name: string
  description: string
  unlockTier: RankTier
  boardBg: string
  backgroundGradient?: string
  lineColor: string
  starColor: string
  blackStone: string
  blackPiece?: string
  whiteStone: string
  whitePiece?: string
  textures?: {
    board?: string
    stones?: string
  }
}
