/**
 * Web Worker：在后台线程运行 getAdvancedAiMove，避免主线程卡顿，保证界面流畅。
 */
import { getAdvancedAiMove } from '../lib/advancedGomokuAi'
import type { Board, Player, Difficulty } from '../types'

self.onmessage = (e: MessageEvent<{ board: Board; ai: Player; difficulty: Difficulty; timeLimit?: number }>) => {
  const { board, ai, difficulty, timeLimit } = e.data
  const move = getAdvancedAiMove(board, ai, difficulty, timeLimit || 1000)
  self.postMessage(move)
}
