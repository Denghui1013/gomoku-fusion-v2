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

// 五子棋专业模式评分（增强版）
const PATTERNS = {
  // 必胜棋形
  FIVE: 10000000,          // 五连（胜利）
  OPEN_FOUR: 1000000,      // 活四（必胜）
  RUSH_FOUR: 500000,       // 冲四（眠四）
  
  // 杀棋棋形
  OPEN_THREE_DOUBLE: 800000, // 双活三（必胜）
  FOUR_THREE: 600000,      // 四三杀（冲四 + 活三）
  THREE_THREE: 500000,     // 三三杀（双冲四）
  
  // 进攻棋形
  OPEN_THREE: 50000,       // 活三
  RUSH_THREE: 20000,       // 冲三
  OPEN_TWO_DOUBLE: 30000,  // 双活二（潜在威胁）
  OPEN_TWO: 5000,          // 活二
  RUSH_TWO: 2000,          // 冲二
  DANGEROUS_ONE: 500,      // 危险单子
  
  // 位置价值
  CENTER_BONUS: 200,       // 中心位置奖励
  CONNECT_BONUS: 300,      // 连接奖励
  SPACE_CONTROL: 150,      // 空间控制
}

// 开局定式库（简化版）
const OPENING_BOOK: Record<string, Position[]> = {
  // 中心开局
  '7,7': [{ row: 7, col: 6 }, { row: 6, col: 7 }, { row: 8, col: 7 }, { row: 7, col: 8 }],
  // 角落开局
  '3,3': [{ row: 3, col: 4 }, { row: 4, col: 3 }, { row: 4, col: 4 }],
  // 边缘开局
  '0,7': [{ row: 1, col: 7 }, { row: 0, col: 6 }, { row: 0, col: 8 }],
}

// 游戏阶段定义
enum GamePhase {
  OPENING,   // 开局（0-10手）
  MIDGAME,   // 中局（11-40手）
  ENDGAME    // 终局（41手以后）
}

// Zobrist 哈希表（简化版）
class TranspositionTable {
  private table: Map<string, { score: number; depth: number; move: Position }> = new Map()
  
  get(key: string) {
    return this.table.get(key)
  }
  
  set(key: string, value: { score: number; depth: number; move: Position }) {
    this.table.set(key, value)
  }
  
  clear() {
    this.table.clear()
  }
}

const transpositionTable = new TranspositionTable()

// 计算 Zobrist 哈希键
function computeHash(board: Board): string {
  let hash = ''
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      hash += board[r][c] === null ? '0' : board[r][c] === 'black' ? 'B' : 'W'
    }
  }
  return hash
}

// 获取游戏阶段
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

// 检测是否存在双活三
function hasDoubleOpenThree(board: Board, move: Position, player: Player): boolean {
  const { row: r, col: c } = move
  if (board[r][c] !== null) return false
  
  let openThreeCount = 0
  const tempBoard = cloneBoard(board)
  tempBoard[r][c] = player
  
  for (const [dr, dc] of DIRS) {
    const pattern = analyzePattern(tempBoard, r, c, dr, dc, player)
    if (pattern.count === 3 && pattern.totalOpen >= 2) {
      openThreeCount++
    }
  }
  
  return openThreeCount >= 2
}

// 检测四三杀（冲四 + 活三）
function hasFourThreeThreat(board: Board, move: Position, player: Player): boolean {
  const { row: r, col: c } = move
  if (board[r][c] !== null) return false
  
  const tempBoard = cloneBoard(board)
  tempBoard[r][c] = player
  
  let hasFour = false
  let hasOpenThree = false
  
  for (const [dr, dc] of DIRS) {
    const pattern = analyzePattern(tempBoard, r, c, dr, dc, player)
    if (pattern.count >= 4 && pattern.totalOpen >= 1) {
      hasFour = true
    }
    if (pattern.count === 3 && pattern.totalOpen >= 2) {
      hasOpenThree = true
    }
  }
  
  return hasFour && hasOpenThree
}

// 检测三三杀（双冲四）
function hasThreeThreeThreat(board: Board, move: Position, player: Player): boolean {
  const { row: r, col: c } = move
  if (board[r][c] !== null) return false
  
  const tempBoard = cloneBoard(board)
  tempBoard[r][c] = player
  
  let rushFourCount = 0
  
  for (const [dr, dc] of DIRS) {
    const pattern = analyzePattern(tempBoard, r, c, dr, dc, player)
    if (pattern.count === 4 && pattern.totalOpen === 1) {
      rushFourCount++
    }
  }
  
  return rushFourCount >= 2
}

// 检测是否存在双活二
function hasDoubleOpenTwo(board: Board, move: Position, player: Player): boolean {
  const { row: r, col: c } = move
  if (board[r][c] !== null) return false
  
  let openTwoCount = 0
  const tempBoard = cloneBoard(board)
  tempBoard[r][c] = player
  
  for (const [dr, dc] of DIRS) {
    const pattern = analyzePattern(tempBoard, r, c, dr, dc, player)
    if (pattern.count === 2 && pattern.totalOpen >= 2) {
      openTwoCount++
    }
  }
  
  return openTwoCount >= 2
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
        score += PATTERNS.RUSH_THREE
      }
    } else if (aiPattern.count === 2) {
      if (aiPattern.totalOpen >= 2) {
        score += PATTERNS.OPEN_TWO
      } else {
        score += PATTERNS.RUSH_TWO
      }
    } else if (aiPattern.count === 1) {
      score += PATTERNS.DANGEROUS_ONE
    }
    
    // 人类威胁防守评分
    if (humanPattern.count >= 4) {
      if (humanPattern.totalOpen >= 1) {
        score += PATTERNS.OPEN_FOUR * 0.95  // 优先防守
      } else {
        score += PATTERNS.RUSH_FOUR * 0.9
      }
    } else if (humanPattern.count === 3) {
      if (humanPattern.totalOpen >= 2) {
        score += PATTERNS.OPEN_THREE * 0.8
      } else {
        score += PATTERNS.RUSH_THREE * 0.6
      }
    } else if (humanPattern.count === 2) {
      if (humanPattern.totalOpen >= 2) {
        score += PATTERNS.OPEN_TWO * 0.4
      } else {
        score += PATTERNS.RUSH_TWO * 0.2
      }
    }
  }
  
  // 特殊模式检测（增强版）
  if (hasDoubleOpenThree(board, move, ai)) {
    score += PATTERNS.OPEN_THREE_DOUBLE
  }
  
  if (hasFourThreeThreat(board, move, ai)) {
    score += PATTERNS.FOUR_THREE
  }
  
  if (hasThreeThreeThreat(board, move, ai)) {
    score += PATTERNS.THREE_THREE
  }
  
  if (hasDoubleOpenTwo(board, move, ai)) {
    score += PATTERNS.OPEN_TWO_DOUBLE
  }
  
  // 中心和连接奖励
  const centerDist = Math.sqrt(Math.pow(r - 7, 2) + Math.pow(c - 7, 2))
  if (centerDist <= 3) {
    score += PATTERNS.CENTER_BONUS
  }
  
  // 检查周围是否有友军
  let friendlyAdjacent = 0
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const rr = r + dr
      const cc = c + dc
      if (inBounds(rr, cc) && board[rr][cc] === ai) friendlyAdjacent++
    }
  }
  score += friendlyAdjacent * PATTERNS.CONNECT_BONUS
  
  // 根据游戏阶段调整权重
  switch (phase) {
    case GamePhase.OPENING:
      // 开局阶段重视中心控制和平衡发展
      const centerDist = Math.sqrt(Math.pow(r - 7, 2) + Math.pow(c - 7, 2))
      score += Math.max(0, 300 - centerDist * 25)
      break
    case GamePhase.MIDGAME:
      // 中局阶段重视攻防转换和威胁
      break
    case GamePhase.ENDGAME:
      // 终局阶段重视精确计算和获胜路径
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
  score += adjacent * 20
  
  return score
}

// 评估整个局面
function evaluateBoard(
  board: Board,
  ai: Player,
  human: Player,
  phase: GamePhase
): number {
  let score = 0
  
  // 计算所有可能位置的总分
  const candidates = getNeighborhoodMoves(board, 2)
  for (const move of candidates) {
    score += evaluatePosition(board, move, ai, human, phase)
  }
  
  return score
}

// 启发式移动排序
function sortMoves(board: Board, moves: Position[], ai: Player, human: Player, phase: GamePhase): Position[] {
  return moves
    .map(move => ({
      move,
      score: evaluatePosition(board, move, ai, human, phase)
    }))
    .sort((a, b) => b.score - a.score)
    .map(item => item.move)
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
  phase: GamePhase,
  maxTime: number = 1000,
  startTime: number = Date.now(),  // 传入初始时间戳，确保在整个搜索过程中保持一致
  difficulty: Difficulty = 'medium'  // 难度参数，用于限制候选移动数量
): { score: number; move: Position | null } {
  
  // 检查时间限制（使用传入的初始时间戳）
  if (Date.now() - startTime > maxTime * 0.8) {
    return { score: evaluateBoard(board, ai, human, phase), move: null }
  }
  
  // 检查置换表
  const hash = computeHash(board)
  const cached = transpositionTable.get(hash)
  if (cached && cached.depth >= depth) {
    return { score: cached.score, move: cached.move }
  }
  
  if (depth === 0) {
    const score = evaluateBoard(board, ai, human, phase)
    return { score, move: null }
  }
  
  // 限制候选移动数量（专业版）
  // 新手：10 个，业余：30 个，专业：60 个
  const allMoves = getNeighborhoodMoves(board, phase === GamePhase.OPENING ? 3 : 2)
  const sortedMoves = sortMoves(board, allMoves, ai, human, phase)
  const maxCandidates = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 30 : 60
  const moves = sortedMoves.slice(0, maxCandidates)
  
  if (maximizing) {
    let maxScore = -Infinity
    let bestMove: Position | null = null
    
    for (const move of moves) {
      if (board[move.row][move.col] !== null) continue
      
      const newBoard = cloneBoard(board)
      newBoard[move.row][move.col] = ai
      
      // 如果这步棋直接获胜，立即返回
      if (isWin(newBoard, move.row, move.col, ai)) {
        transpositionTable.set(hash, { score: Infinity, depth, move })
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
        phase,
        maxTime,
        startTime,
        difficulty
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
    
    if (bestMove) {
      transpositionTable.set(hash, { score: maxScore, depth, move: bestMove })
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
        transpositionTable.set(hash, { score: -Infinity, depth, move: move })
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
        phase,
        maxTime,
        startTime,
        difficulty
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
    
    if (bestMove) {
      transpositionTable.set(hash, { score: minScore, depth, move: bestMove })
    }
    
    return { score: minScore, move: bestMove }
  }
}

// 根据难度选择搜索深度（专业版）
// 新手 (Easy): 1-2 层，适合完全新手
// 业余 (Medium): 4-6 层，适合有一定经验的玩家
// 专业 (Hard): 8-10 层，适合高手和专业玩家
function getSearchDepth(difficulty: Difficulty, phase: GamePhase): number {
  switch (difficulty) {
    case 'easy': 
      // 新手级别：1-2 层，快速响应，会犯明显错误
      return phase === GamePhase.OPENING ? 2 : 1
    case 'medium': 
      // 业余级别：4-6 层，有一定挑战性
      return phase === GamePhase.OPENING ? 6 : 4
    case 'hard': 
      // 专业级别：8-10 层，深度计算，极少犯错
      return phase === GamePhase.OPENING ? 10 : 8
    default: 
      return 4
  }
}

// 获取开局推荐走法
function getOpeningMove(board: Board, ai: Player, human: Player): Position | null {
  const moves = getAllEmptyMoves(board)
  if (moves.length === BOARD_SIZE * BOARD_SIZE) {
    // 第一手，下在中心
    return CENTER
  } else if (moves.length === BOARD_SIZE * BOARD_SIZE - 1) {
    // 第二手，根据第一手的位置决定
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] !== null) {
          // 第一手的位置
          const key = `${r},${c}`
          const recommendations = OPENING_BOOK[key]
          if (recommendations && recommendations.length > 0) {
            return recommendations[0] // 返回第一个推荐位置
          }
        }
      }
    }
  }
  return null
}

// 优化后的 AI 移动函数
export function getAdvancedAiMove(
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
  
  // 检查开局推荐
  const openingMove = getOpeningMove(board, ai, human)
  if (openingMove) {
    return openingMove
  }
  
  // 根据难度和游戏阶段进行 Alpha-Beta 搜索
  const depth = getSearchDepth(difficulty, phase)
  
  // 清空置换表
  transpositionTable.clear()
  
  const result = alphaBetaSearch(
    board,
    depth,
    -Infinity,
    Infinity,
    true, // AI 是最大化玩家
    ai,
    human,
    phase,
    timeLimit,
    startTime,
    difficulty
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