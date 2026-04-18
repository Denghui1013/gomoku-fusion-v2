'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  AvatarFrame,
  BoardTheme,
  MatchResult,
  PlayerRankData,
  RankPromotionEvent,
  StoneEffect,
} from '@/types'
import {
  calculateWinRate,
  getInitialRankData,
  getTierConfig,
  getTierProgress,
  processMatchResult,
} from '@/lib/rankSystem'
import { getUnlockedThemes } from '@/lib/boardThemes'
import {
  getBestUnlockedTitle,
  getUpcomingRewardEntries,
  getUnlockedRewardEntries,
  hasUnlockedAvatarFrame,
  hasUnlockedStoneEffect,
  type RewardCatalogEntry,
} from '@/lib/rewardCatalog'

export interface MatchRecordResult {
  promotionEvent: RankPromotionEvent | null
  starChange: number
  isProtected: boolean
  protectionMessage?: string
}

interface RankContextValue {
  rankData: PlayerRankData
  winRate: number
  tierProgress: number
  currentTierConfig: ReturnType<typeof getTierConfig>

  currentBoardTheme: BoardTheme
  unlockedBoardThemes: BoardTheme[]
  setBoardTheme: (theme: BoardTheme) => void

  equippedTitle: string | null
  equippedAvatarFrame: AvatarFrame
  equippedStoneEffect: StoneEffect
  unlockedRewardEntries: RewardCatalogEntry[]
  upcomingRewardEntries: RewardCatalogEntry[]
  setEquippedTitle: (title: string | null) => void
  setEquippedAvatarFrame: (frame: AvatarFrame) => void
  setEquippedStoneEffect: (effect: StoneEffect) => void

  recordMatch: (result: MatchResult) => MatchRecordResult
  resetRankData: () => void
  exportData: () => string
  importData: (data: string) => boolean

  promotionEvent: RankPromotionEvent | null
  clearPromotionEvent: () => void

  showMasterEasterEgg: boolean
  clearMasterEasterEgg: () => void
  isLoading: boolean
}

const RankContext = createContext<RankContextValue | null>(null)

const STORAGE_KEY = 'gomoku_rank_data'
const BACKUP_KEY_PREFIX = 'gomoku_rank_backup_'
const BOARD_THEME_KEY = 'gomoku_board_theme'
const REWARD_LOADOUT_KEY = 'gomoku_reward_loadout'

type RewardLoadout = {
  title?: string | null
  avatarFrame?: AvatarFrame
  stoneEffect?: StoneEffect
}

export function RankProvider({ children }: { children: ReactNode }) {
  const [rankData, setRankData] = useState<PlayerRankData>(getInitialRankData())
  const [promotionEvent, setPromotionEvent] = useState<RankPromotionEvent | null>(null)
  const [showMasterEasterEgg, setShowMasterEasterEgg] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentBoardTheme, setCurrentBoardTheme] = useState<BoardTheme>('default')
  const [equippedTitle, setEquippedTitleState] = useState<string | null>(null)
  const [equippedAvatarFrame, setEquippedAvatarFrameState] = useState<AvatarFrame>('none')
  const [equippedStoneEffect, setEquippedStoneEffectState] = useState<StoneEffect>('none')

  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY)
      if (savedData) {
        const parsed = JSON.parse(savedData) as PlayerRankData
        setRankData(isValidRankData(parsed) ? parsed : getInitialRankData())
      }

      const savedTheme = localStorage.getItem(BOARD_THEME_KEY) as BoardTheme | null
      if (savedTheme) {
        setCurrentBoardTheme(savedTheme)
      }

      const savedLoadout = localStorage.getItem(REWARD_LOADOUT_KEY)
      if (savedLoadout) {
        const loadout = JSON.parse(savedLoadout) as RewardLoadout
        setEquippedTitleState(loadout.title ?? null)
        setEquippedAvatarFrameState(loadout.avatarFrame ?? 'none')
        setEquippedStoneEffectState(loadout.stoneEffect ?? 'none')
      }
    } catch (error) {
      console.error('Failed to load rank data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const winRate = calculateWinRate(rankData.totalWins, rankData.totalGames)
  const tierProgress = getTierProgress(rankData.currentStars, rankData.currentTier)
  const currentTierConfig = getTierConfig(rankData.currentTier)
  const unlockedBoardThemes = useMemo(() => getUnlockedThemes(rankData.currentTier), [rankData.currentTier])
  const unlockedRewardEntries = useMemo(() => getUnlockedRewardEntries(rankData), [rankData])
  const upcomingRewardEntries = useMemo(() => getUpcomingRewardEntries(rankData), [rankData])

  const createBackup = useCallback((data: PlayerRankData) => {
    try {
      const backupKey = `${BACKUP_KEY_PREFIX}${Date.now()}`
      localStorage.setItem(backupKey, JSON.stringify(data))

      const backupKeys = Object.keys(localStorage)
        .filter((key) => key.startsWith(BACKUP_KEY_PREFIX))
        .sort()

      if (backupKeys.length > 10) {
        backupKeys.slice(0, backupKeys.length - 10).forEach((key) => {
          localStorage.removeItem(key)
        })
      }
    } catch (error) {
      console.error('Failed to create rank backup:', error)
    }
  }, [])

  useEffect(() => {
    if (isLoading) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rankData))
      createBackup(rankData)
    } catch (error) {
      console.error('Failed to save rank data:', error)
    }
  }, [createBackup, isLoading, rankData])

  useEffect(() => {
    if (isLoading) return

    const unlockedTitles = unlockedRewardEntries
      .filter((reward) => reward.slot === 'title')
      .map((reward) => reward.titleText || reward.name)
    const bestTitle = getBestUnlockedTitle(rankData)

    if (equippedTitle && !unlockedTitles.includes(equippedTitle)) {
      setEquippedTitleState(bestTitle)
    } else if (!equippedTitle && bestTitle) {
      setEquippedTitleState(bestTitle)
    }

    if (!hasUnlockedAvatarFrame(rankData, equippedAvatarFrame)) {
      if (hasUnlockedAvatarFrame(rankData, 'diamond-flare')) {
        setEquippedAvatarFrameState('diamond-flare')
      } else if (hasUnlockedAvatarFrame(rankData, 'silver-trim')) {
        setEquippedAvatarFrameState('silver-trim')
      } else {
        setEquippedAvatarFrameState('none')
      }
    }

    if (!hasUnlockedStoneEffect(rankData, equippedStoneEffect)) {
      if (hasUnlockedStoneEffect(rankData, 'legend-trail')) {
        setEquippedStoneEffectState('legend-trail')
      } else if (hasUnlockedStoneEffect(rankData, 'master-glow')) {
        setEquippedStoneEffectState('master-glow')
      } else {
        setEquippedStoneEffectState('none')
      }
    }
  }, [equippedAvatarFrame, equippedStoneEffect, equippedTitle, isLoading, rankData, unlockedRewardEntries])

  useEffect(() => {
    if (isLoading) return
    try {
      localStorage.setItem(
        REWARD_LOADOUT_KEY,
        JSON.stringify({
          title: equippedTitle,
          avatarFrame: equippedAvatarFrame,
          stoneEffect: equippedStoneEffect,
        })
      )
    } catch (error) {
      console.error('Failed to save reward loadout:', error)
    }
  }, [equippedAvatarFrame, equippedStoneEffect, equippedTitle, isLoading])

  const setBoardTheme = useCallback((theme: BoardTheme) => {
    if (!unlockedBoardThemes.includes(theme)) return
    setCurrentBoardTheme(theme)
    localStorage.setItem(BOARD_THEME_KEY, theme)
  }, [unlockedBoardThemes])

  const setEquippedTitle = useCallback((title: string | null) => {
    const unlockedTitles = getUnlockedRewardEntries(rankData)
      .filter((reward) => reward.slot === 'title')
      .map((reward) => reward.titleText || reward.name)
    if (title === null || unlockedTitles.includes(title)) {
      setEquippedTitleState(title)
    }
  }, [rankData])

  const setEquippedAvatarFrame = useCallback((frame: AvatarFrame) => {
    if (hasUnlockedAvatarFrame(rankData, frame)) {
      setEquippedAvatarFrameState(frame)
    }
  }, [rankData])

  const setEquippedStoneEffect = useCallback((effect: StoneEffect) => {
    if (hasUnlockedStoneEffect(rankData, effect)) {
      setEquippedStoneEffectState(effect)
    }
  }, [rankData])

  const recordMatch = useCallback((result: MatchResult): MatchRecordResult => {
    const {
      newData,
      promotionEvent: event,
      starChange,
      isProtected,
      protectionMessage,
    } = processMatchResult(rankData, result)

    setRankData(newData)

    if (event) {
      setPromotionEvent(event)
      if (event.isMasterTier && !rankData.hasMasterMedal) {
        setShowMasterEasterEgg(true)
      }
    }

    return {
      promotionEvent: event,
      starChange,
      isProtected,
      protectionMessage,
    }
  }, [rankData])

  const resetRankData = useCallback(() => {
    const confirmed = window.confirm('确定要重置所有排位数据吗？此操作不可恢复。')
    if (!confirmed) return
    const initialData = getInitialRankData()
    setRankData(initialData)
    setPromotionEvent(null)
    setCurrentBoardTheme('default')
    setEquippedTitleState(null)
    setEquippedAvatarFrameState('none')
    setEquippedStoneEffectState('none')
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(BOARD_THEME_KEY)
    localStorage.removeItem(REWARD_LOADOUT_KEY)
  }, [])

  const exportData = useCallback((): string => {
    return JSON.stringify({
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: rankData,
    }, null, 2)
  }, [rankData])

  const importData = useCallback((jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString)
      if (parsed.version && parsed.data && isValidRankData(parsed.data)) {
        setRankData(parsed.data)
        return true
      }
      if (isValidRankData(parsed)) {
        setRankData(parsed)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to import rank data:', error)
      return false
    }
  }, [])

  const clearPromotionEvent = useCallback(() => {
    setPromotionEvent(null)
  }, [])

  const clearMasterEasterEgg = useCallback(() => {
    setShowMasterEasterEgg(false)
  }, [])

  const value: RankContextValue = {
    rankData,
    winRate,
    tierProgress,
    currentTierConfig,
    currentBoardTheme,
    unlockedBoardThemes,
    setBoardTheme,
    equippedTitle,
    equippedAvatarFrame,
    equippedStoneEffect,
    unlockedRewardEntries,
    upcomingRewardEntries,
    setEquippedTitle,
    setEquippedAvatarFrame,
    setEquippedStoneEffect,
    recordMatch,
    resetRankData,
    exportData,
    importData,
    promotionEvent,
    clearPromotionEvent,
    showMasterEasterEgg,
    clearMasterEasterEgg,
    isLoading,
  }

  return <RankContext.Provider value={value}>{children}</RankContext.Provider>
}

export function useRank() {
  const context = useContext(RankContext)
  if (!context) {
    throw new Error('useRank must be used within a RankProvider')
  }
  return context
}

function isValidRankData(data: unknown): data is PlayerRankData {
  if (!data || typeof data !== 'object') return false

  const d = data as Partial<PlayerRankData>
  return (
    typeof d.currentTier === 'string' &&
    typeof d.currentStars === 'number' &&
    typeof d.totalScore === 'number' &&
    typeof d.totalWins === 'number' &&
    typeof d.totalGames === 'number' &&
    typeof d.winStreak === 'number' &&
    typeof d.lossStreak === 'number' &&
    typeof d.bestWinStreak === 'number' &&
    Array.isArray(d.tierHistory) &&
    Array.isArray(d.unlockedRewards) &&
    typeof d.hasMasterMedal === 'boolean' &&
    typeof d.protectionMatches === 'number'
  )
}

export function migrateRankData(oldData: unknown): PlayerRankData | null {
  return isValidRankData(oldData) ? oldData : null
}

export function getAllBackups(): { key: string; date: Date; data: PlayerRankData }[] {
  if (typeof window === 'undefined') return []

  const backups: { key: string; date: Date; data: PlayerRankData }[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key?.startsWith(BACKUP_KEY_PREFIX)) continue

    try {
      const data = JSON.parse(localStorage.getItem(key) || '')
      if (isValidRankData(data)) {
        backups.push({
          key,
          date: new Date(Number(key.replace(BACKUP_KEY_PREFIX, ''))),
          data,
        })
      }
    } catch {
      // Ignore invalid backup records.
    }
  }

  return backups.sort((a, b) => b.date.getTime() - a.date.getTime())
}

export function restoreBackup(key: string): boolean {
  try {
    const data = localStorage.getItem(key)
    if (!data) return false
    const parsed = JSON.parse(data)
    if (!isValidRankData(parsed)) return false
    localStorage.setItem(STORAGE_KEY, data)
    return true
  } catch {
    return false
  }
}
