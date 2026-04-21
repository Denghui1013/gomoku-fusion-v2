'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Difficulty, GameMode, Player } from '@/types'

type GameFlowState = {
  mode: GameMode | null
  difficulty: Difficulty
  playerSide: Player | null
}

type GameFlowActions = {
  setMode: (mode: GameMode | null) => void
  setDifficulty: (difficulty: Difficulty) => void
  setPlayerSide: (side: Player | null) => void
  resetSelection: () => void
}

const GameFlowContext = createContext<(GameFlowState & GameFlowActions) | null>(null)
const FLOW_STORAGE_KEY = 'gomoku_fusion_game_flow'
const DEFAULT_FLOW: GameFlowState = { mode: 'pvc', difficulty: 'easy', playerSide: null }

function readSavedFlow(): GameFlowState {
  if (typeof window === 'undefined') {
    return DEFAULT_FLOW
  }

  try {
    const saved = window.sessionStorage.getItem(FLOW_STORAGE_KEY)
    if (!saved) return DEFAULT_FLOW
    const parsed = JSON.parse(saved) as Partial<GameFlowState>
    return {
      mode: parsed.mode ?? 'pvc',
      difficulty: parsed.difficulty ?? 'easy',
      playerSide: parsed.playerSide ?? null,
    }
  } catch {
    return DEFAULT_FLOW
  }
}

export function GameFlowProvider({ children }: { children: React.ReactNode }) {
  const [flow, setFlow] = useState<GameFlowState>(DEFAULT_FLOW)
  const [hasHydrated, setHasHydrated] = useState(false)

  const { mode, difficulty, playerSide } = flow

  useEffect(() => {
    setFlow(readSavedFlow())
    setHasHydrated(true)
  }, [])

  useEffect(() => {
    if (!hasHydrated) return
    window.sessionStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(flow))
  }, [flow, hasHydrated])

  const setMode = useCallback((next: GameMode | null) => {
    setFlow((prev) => ({ ...prev, mode: next, playerSide: null }))
  }, [])

  const setDifficulty = useCallback((next: Difficulty) => {
    setFlow((prev) => ({ ...prev, difficulty: next }))
  }, [])

  const setPlayerSide = useCallback((next: Player | null) => {
    setFlow((prev) => ({ ...prev, playerSide: next }))
  }, [])

  const resetSelection = useCallback(() => {
    setFlow(DEFAULT_FLOW)
  }, [])

  const value = useMemo(
    () => ({ mode, difficulty, playerSide, setMode, setDifficulty, setPlayerSide, resetSelection }),
    [mode, difficulty, playerSide, setMode, setDifficulty, setPlayerSide, resetSelection]
  )

  return <GameFlowContext.Provider value={value}>{children}</GameFlowContext.Provider>
}

export function useGameFlow() {
  const ctx = useContext(GameFlowContext)
  if (!ctx) throw new Error('useGameFlow must be used within GameFlowProvider')
  return ctx
}
