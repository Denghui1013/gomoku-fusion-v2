import type { Board, Player, Position, Difficulty } from '@/types'

const BOARD_SIZE = 15
const WIN_COUNT = 5
const CENTER: Position = { row: 7, col: 7 }
const DIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],   // 水平
  [1, 0],   // 垂直
  [1, 1],   // 主对角线
  [1, -1],  // 副对角线
]

// 模式评分权重
const PATTERNS = {
  FIVE: 1000000,      // 五连
  OPEN_FOUR: 100000,  // 活四
  RUSH_FOUR: 50000,   // 冲四（眠四）
  OPEN_THREE: 10000,  // 活三
  SLEEP_THREE: 1000,  // 眠三
  OPEN_TWO: 1000,     // 活二
  SLEEP_TWO: 100,     // 眠二
  DANGEROUS_ONE: 50,  // 危险单子
}

// 游戏阶段定义
enum GamePhase {
  OPENING,   // 开局
  MIDGAME,   // 中局
  ENDGAME    // 终局
}

function getGamePhase(board: Board): GamePhase {
  let stoneCount = 0
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) stoneCount++
    }
  }
  
  if (stoneCount < 10) return GamePhase.OPENING
  if (stoneCount < 40) return GamePhase.MIDGAME
  return GamePhase.ENDGAME
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice())
}

function isWin(board: Board, row: number, col: number, player: Player): boolean {
  for (const [dr, dc] of DIRS) {
    let count = 1
    // 向一个方向延伸
    for (let i = 1; i < WIN_COUNT; i++) {
      const r = row + dr * i
      const c = col + dc * i
      if (!inBounds(r, c) || board[r][c] !== player) break
      count++
    }
    // 向相反方向延伸
    for (let i = 1; i < WIN_COUNT; i++) {
      const r = row - dr * i
      const c = col - dc * i
      if (!inBounds(r, c) || board[r][c] !== player) break
      count++
    }
    if (count >= WIN_COUNT) return true
  }
  return false
}

function getAllEmptyMoves(board: Board): Position[] {
  const moves: Position[] = []
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === null) moves.push({ row: r, col: c })
    }
  }
  return moves
}

// 获取邻近可下子位置（性能优化）
function getNeighborhoodMoves(board: Board, radius: number = 2): Position[] {
  const set = new Set<string>()
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === null) continue
      // 检查周围的空位
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          if (dr === 0 && dc === 0) continue
          const rr = r + dr
          const cc = c + dc
          if (!inBounds(rr, cc)) continue
          if (board[rr][cc] !== null) continue
          set.add(`${rr},${cc}`)
        }
      }
    }
  }
  
  if (set.size === 0) return getAllEmptyMoves(board)
  
  return Array.from(set).map((k) => {
    const [row, col] = k.split(',').map(Number)
    return { row, col }
  })
}

// 检查某个方向上的棋形模式
function analyzePattern(
  board: Board,
  r: number,
  c: number,
  dr: number,
  dc: number,
  player: Player
): { count: number; openStart: boolean; openEnd: boolean; totalOpen: number } {
  // 计算从当前位置沿指定方向的连续棋子数
  let count = 0
  let openStart = false
  let openEnd = false
  
  // 向正方向延伸
  let posR = r + dr
  let posC = c + dc
  while (inBounds(posR, posC) && board[posR][posC] === player) {
    count++
    posR += dr
    posC += dc
  }
  openEnd = inBounds(posR, posC) && board[posR][posC] === null
  
  // 向负方向延伸
  let negR = r - dr
  let negC = c - dc
  while (inBounds(negR, negC) && board[negR][negC] === player) {
    count++
    negR -= dr
    negC -= dc
  }
  openStart = inBounds(negR, negC) && board[negR][negC] === null
  
  const totalOpen = (openStart ? 1 : 0) + (openEnd ? 1 : 0)
  return { count, openStart, openEnd, totalOpen }
}

// 评估单个位置的价值
function evaluatePosition(
  board: Board,
  move: Position,
  ai: Player,
  human: Player,
  phase: GamePhase
): number {
  const { row: r, col: c } = move
  if (board[r][c] !== null) return -Infinity
  
  let score = 0
  
  // 检查四个方向
  for (const [dr, dc] of DIRS) {
    // 评估 AI 的得分
    const aiPattern = analyzePattern(board, r, c, dr, dc, ai)
    // 评估对手的威胁
    const humanPattern = analyzePattern(board, r, c, dr, dc, human)
    
    // AI 模式评分
    if (aiPattern.count >= 4) {
      if (aiPattern.totalOpen >= 1) {
        score += PATTERNS.OPEN_FOUR
      } else {
        score += PATTERNS.RUSH_FOUR
      }
    } else if (aiPattern.count === 3) {
      if (aiPattern.totalOpen >= 2) {
        score += PATTERNS.OPEN_THREE
      } else {
        score += PATTERNS.SLEEP_THREE
      }
    } else if (aiPattern.count === 2) {
      if (aiPattern.totalOpen >= 2) {
        score += PATTERNS.OPEN_TWO
      } else {
        score += PATTERNS.SLEEP_TWO
      }
    } else if (aiPattern.count === 1) {
      score += PATTERNS.DANGEROUS_ONE
    }
    
    // 人类威胁防守评分
    if (humanPattern.count >= 4) {
      if (humanPattern.totalOpen >= 1) {
        score += PATTERNS.OPEN_FOUR * 0.9  // 优先防守
      } else {
        score += PATTERNS.RUSH_FOUR * 0.8
      }
    } else if (humanPattern.count === 3) {
      if (humanPattern.totalOpen >= 2) {
        score += PATTERNS.OPEN_THREE * 0.7
      } else {
        score += PATTERNS.SLEEP_THREE * 0.5
      }
    } else if (humanPattern.count === 2) {
      if (humanPattern.totalOpen >= 2) {
        score += PATTERNS.OPEN_TWO * 0.3
      } else {
        score += PATTERNS.SLEEP_TWO * 0.2
      }
    }
  }
  
  // 根据游戏阶段调整权重
  switch (phase) {
    case GamePhase.OPENING:
      // 开局阶段重视中心控制和平衡发展
      const centerDist = Math.sqrt(Math.pow(r - 7, 2) + Math.pow(c - 7, 2))
      score += Math.max(0, 200 - centerDist * 20)
      break
    case GamePhase.MIDGAME:
      // 中局阶段重视攻防转换
      break
    case GamePhase.ENDGAME:
      // 终局阶段重视精确计算
      break
  }
  
  // 周围棋子加成
  let adjacent = 0
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const rr = r + dr
      const cc = c + dc
      if (inBounds(rr, cc) && board[rr][cc] !== null) adjacent++
    }
  }
  score += adjacent * 15
  
  return score
}

// Alpha-Beta 剪枝搜索算法
function alphaBetaSearch(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  ai: Player,
  human: Player,
  phase: GamePhase
): { score: number; move: Position | null } {
  if (depth === 0) {
    // 评估当前局面
    const moves = getNeighborhoodMoves(board, 2)
    let totalScore = 0
    for (const move of moves) {
      totalScore += evaluatePosition(board, move, ai, human, phase)
    }
    return { score: totalScore, move: null }
  }
  
  const moves = getNeighborhoodMoves(board, 3)
  
  if (maximizing) {
    let maxScore = -Infinity
    let bestMove: Position | null = null
    
    for (const move of moves) {
      if (board[move.row][move.col] !== null) continue
      
      const newBoard = cloneBoard(board)
      newBoard[move.row][move.col] = ai
      
      // 如果这步棋直接获胜，立即返回
      if (isWin(newBoard, move.row, move.col, ai)) {
        return { score: Infinity, move }
      }
      
      const result = alphaBetaSearch(
        newBoard,
        depth - 1,
        alpha,
        beta,
        false,
        ai,
        human,
        phase
      )
      
      if (result.score > maxScore) {
        maxScore = result.score
        bestMove = move
      }
      
      alpha = Math.max(alpha, result.score)
      if (beta <= alpha) {
        break // Alpha-Beta 剪枝
      }
    }
    
    return { score: maxScore, move: bestMove }
  } else {
    let minScore = Infinity
    let bestMove: Position | null = null
    
    for (const move of moves) {
      if (board[move.row][move.col] !== null) continue
      
      const newBoard = cloneBoard(board)
      newBoard[move.row][move.col] = human
      
      // 如果对手这步棋直接获胜，避免此步
      if (isWin(newBoard, move.row, move.col, human)) {
        return { score: -Infinity, move: null }
      }
      
      const result = alphaBetaSearch(
        newBoard,
        depth - 1,
        alpha,
        beta,
        true,
        ai,
        human,
        phase
      )
      
      if (result.score < minScore) {
        minScore = result.score
        bestMove = move
      }
      
      beta = Math.min(beta, result.score)
      if (beta <= alpha) {
        break // Alpha-Beta 剪枝
      }
    }
    
    return { score: minScore, move: bestMove }
  }
}

// 根据难度选择搜索深度
function getSearchDepth(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 2
    case 'medium': return 4
    case 'hard': return 6
    default: return 3
  }
}

// 优化后的 AI 移动函数
export function getOptimizedAiMove(
  board: Board,
  ai: Player,
  difficulty: Difficulty,
  timeLimit: number = 1000 // 时间限制（毫秒）
): Position {
  const startTime = Date.now()
  
  const human: Player = ai === 'black' ? 'white' : 'black'
  const phase = getGamePhase(board)
  
  // 首先检查是否有直接获胜的走法
  const allMoves = getAllEmptyMoves(board)
  for (const move of allMoves) {
    const testBoard = cloneBoard(board)
    testBoard[move.row][move.col] = ai
    if (isWin(testBoard, move.row, move.col, ai)) {
      return move
    }
  }
  
  // 检查是否需要防守对手获胜
  for (const move of allMoves) {
    const testBoard = cloneBoard(board)
    testBoard[move.row][move.col] = human
    if (isWin(testBoard, move.row, move.col, human)) {
      return move
    }
  }
  
  // 根据难度进行 Alpha-Beta 搜索
  const depth = getSearchDepth(difficulty)
  
  // 设置时间限制
  const result = alphaBetaSearch(
    board,
    depth,
    -Infinity,
    Infinity,
    true, // AI 是最大化玩家
    ai,
    human,
    phase
  )
  
  // 如果没有找到最佳移动，或者搜索超时，使用启发式方法
  if (!result.move || Date.now() - startTime > timeLimit * 0.8) {
    // 回退到启发式方法
    const candidates = getNeighborhoodMoves(board, 2)
    if (candidates.length === 0) return { row: 7, col: 7 }
    
    let bestScore = -Infinity
    let bestMove = candidates[0]
    
    for (const move of candidates) {
      const score = evaluatePosition(board, move, ai, human, phase)
      if (score > bestScore) {
        bestScore = score
        bestMove = move
      }
    }
    
    return bestMove
  }
  
  return result.move || { row: 7, col: 7 }
}