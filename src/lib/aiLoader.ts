/**
 * AI 模块动态加载器
 * 使用动态导入实现代码分割，减少首屏加载时间
 */

import type { Board, Player, Position, Difficulty } from '@/types'

// AI 模块类型定义
type AiModule = {
  getAdvancedAiMove: (
    board: Board,
    player: Player,
    difficulty: Difficulty,
    timeLimit?: number
  ) => Position
}

// 模块缓存
let aiModuleCache: AiModule | null = null
let aiModulePromise: Promise<AiModule> | null = null

/**
 * 动态加载 AI 模块
 * 使用单例模式确保模块只被加载一次
 */
export async function loadAiModule(): Promise<AiModule> {
  // 如果已有缓存，直接返回
  if (aiModuleCache) {
    return aiModuleCache
  }

  // 如果正在加载中，返回进行中的 Promise
  if (aiModulePromise) {
    return aiModulePromise
  }

  // 开始加载模块
  aiModulePromise = import('./advancedGomokuAi').then((module): AiModule => {
    aiModuleCache = {
      getAdvancedAiMove: module.getAdvancedAiMove,
    }
    return aiModuleCache
  })

  return aiModulePromise
}

/**
 * 获取 AI 移动（异步版本）
 * 自动处理模块加载
 */
export async function getAiMoveAsync(
  board: Board,
  player: Player,
  difficulty: Difficulty,
  timeLimit?: number
): Promise<Position> {
  const aiMod = await loadAiModule()
  return aiMod.getAdvancedAiMove(board, player, difficulty, timeLimit)
}

/**
 * 预加载 AI 模块
 * 在空闲时间提前加载，提升用户体验
 */
export function preloadAiModule(): void {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    requestIdleCallback(() => {
      loadAiModule().catch(console.error)
    })
  } else {
    // 降级方案：使用 setTimeout
    setTimeout(() => {
      loadAiModule().catch(console.error)
    }, 1000)
  }
}

/**
 * 清除 AI 模块缓存
 * 用于开发环境热更新或内存管理
 */
export function clearAiModuleCache(): void {
  aiModuleCache = null
  aiModulePromise = null
}
