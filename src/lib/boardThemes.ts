/**
 * 棋盘主题配置
 * 根据段位解锁不同主题
 */

import type { BoardThemeConfig, BoardTheme } from '@/types'

/** 默认主题 - 木质棋盘 */
export const defaultTheme: BoardThemeConfig = {
  id: 'default',
  name: '经典木纹',
  description: '经典木质棋盘',
  unlockTier: 'bronze',
  boardBg: '#E8C89A',
  lineColor: '#8B4513',
  starColor: '#5D3A1A',
  blackStone: '#1a1a1a',
  blackPiece: '#1a1a1a',
  whiteStone: '#f5f5f5',
  whitePiece: '#f5f5f5',
}

/** 暗黑主题 - 白银段位解锁 */
export const darkTheme: BoardThemeConfig = {
  id: 'dark',
  name: '暗黑模式',
  description: '深色主题棋盘',
  unlockTier: 'silver',
  boardBg: '#2D2D2D',
  lineColor: '#666666',
  starColor: '#888888',
  blackStone: '#000000',
  blackPiece: '#000000',
  whiteStone: '#E0E0E0',
  whitePiece: '#E0E0E0',
}

/** 自然主题 - 黄金段位解锁 */
export const natureTheme: BoardThemeConfig = {
  id: 'nature',
  name: '自然清新',
  description: '绿色自然主题',
  unlockTier: 'gold',
  boardBg: '#90EE90',
  lineColor: '#228B22',
  starColor: '#006400',
  blackStone: '#1a1a1a',
  blackPiece: '#1a1a1a',
  whiteStone: '#f5f5f5',
  whitePiece: '#f5f5f5',
}

/** 海洋主题 - 铂金段位解锁 */
export const oceanTheme: BoardThemeConfig = {
  id: 'ocean',
  name: '海洋深蓝',
  description: '蓝色海洋主题',
  unlockTier: 'platinum',
  boardBg: '#87CEEB',
  lineColor: '#4682B4',
  starColor: '#1E90FF',
  blackStone: '#1a1a1a',
  blackPiece: '#1a1a1a',
  whiteStone: '#f5f5f5',
  whitePiece: '#f5f5f5',
}

/** 黄金主题 - 黄金段位解锁 */
export const goldTheme: BoardThemeConfig = {
  id: 'gold',
  name: '黄金棋盘',
  description: '奢华黄金主题',
  unlockTier: 'gold',
  boardBg: '#FFF8DC',
  backgroundGradient: 'linear-gradient(135deg, #FFF8DC 0%, #F0E68C 50%, #FFD700 100%)',
  lineColor: '#DAA520',
  starColor: '#B8860B',
  blackStone: '#2C2C2C',
  blackPiece: '#2C2C2C',
  whiteStone: '#FFFEF0',
  whitePiece: '#FFFEF0',
}

/** 钻石主题 - 钻石段位解锁 */
export const diamondTheme: BoardThemeConfig = {
  id: 'diamond',
  name: '钻石棋盘',
  description: '璀璨钻石主题',
  unlockTier: 'diamond',
  boardBg: '#F0F8FF',
  backgroundGradient: 'linear-gradient(135deg, #F0F8FF 0%, #E6E6FA 50%, #B0C4DE 100%)',
  lineColor: '#4169E1',
  starColor: '#1E90FF',
  blackStone: '#1a1a2e',
  blackPiece: '#1a1a2e',
  whiteStone: '#ffffff',
  whitePiece: '#ffffff',
}

/** 大师主题 - 大师段位解锁 */
export const masterTheme: BoardThemeConfig = {
  id: 'master',
  name: '大师棋盘',
  description: '尊贵大师主题',
  unlockTier: 'master',
  boardBg: '#4B0082',
  backgroundGradient: 'linear-gradient(135deg, #4B0082 0%, #8B008B 50%, #9400D3 100%)',
  lineColor: '#FFD700',
  starColor: '#FFA500',
  blackStone: '#0a0a0a',
  blackPiece: '#0a0a0a',
  whiteStone: '#FFF8DC',
  whitePiece: '#FFF8DC',
}

/** 宗师主题 - 宗师段位解锁 */
export const grandmasterTheme: BoardThemeConfig = {
  id: 'grandmaster',
  name: '宗师棋盘',
  description: '至尊宗师主题',
  unlockTier: 'grandmaster',
  boardBg: '#2D1B4E',
  backgroundGradient: 'linear-gradient(135deg, #2D1B4E 0%, #4A1C6F 50%, #1a1a2e 100%)',
  lineColor: '#FFD700',
  starColor: '#FFA500',
  blackStone: '#0a0a0a',
  blackPiece: '#0a0a0a',
  whiteStone: '#FFF8DC',
  whitePiece: '#FFF8DC',
}

/** 所有主题配置 */
export const BOARD_THEMES: Record<BoardTheme, BoardThemeConfig> = {
  default: defaultTheme,
  dark: darkTheme,
  nature: natureTheme,
  ocean: oceanTheme,
  gold: goldTheme,
  diamond: diamondTheme,
  master: masterTheme,
  grandmaster: grandmasterTheme,
}

/** 根据段位获取解锁的主题 */
export function getUnlockedThemes(rankTier: string): BoardTheme[] {
  const themes: BoardTheme[] = ['default']
  
  if (['silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'legend'].includes(rankTier)) {
    themes.push('dark')
  }
  if (['gold', 'platinum', 'diamond', 'master', 'grandmaster', 'legend'].includes(rankTier)) {
    themes.push('nature', 'gold')
  }
  if (['platinum', 'diamond', 'master', 'grandmaster', 'legend'].includes(rankTier)) {
    themes.push('ocean')
  }
  if (['diamond', 'master', 'grandmaster', 'legend'].includes(rankTier)) {
    themes.push('diamond')
  }
  if (['master', 'grandmaster', 'legend'].includes(rankTier)) {
    themes.push('master')
  }
  if (['grandmaster', 'legend'].includes(rankTier)) {
    themes.push('grandmaster')
  }
  
  return themes
}

/** 获取主题配置 */
export function getBoardTheme(themeId: BoardTheme): BoardThemeConfig {
  return BOARD_THEMES[themeId] || defaultTheme
}
