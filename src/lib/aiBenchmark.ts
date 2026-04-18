import { getAiMove } from './gomokuAi'
import { getAdvancedAiMove } from './advancedGomokuAi'
import type { Board, Player, Position, Difficulty } from '@/types'

const BOARD_SIZE = 15

function createEmptyBoard(): Board {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice())
}

// 模拟对局
export function simulateGame(
  ai1Difficulty: Difficulty,
  ai2Difficulty: Difficulty,
  useAdvanced: boolean = true
): { winner: Player | 'draw'; moves: number; timeMs: number } {
  const board = createEmptyBoard()
  let currentPlayer: Player = 'black'
  let moveCount = 0
  const startTime = Date.now()
  
  while (moveCount < BOARD_SIZE * BOARD_SIZE) {
    const move = useAdvanced
      ? getAdvancedAiMove(board, currentPlayer, ai1Difficulty, 1000)
      : getAiMove(board, currentPlayer, ai1Difficulty)
    
    if (!move || board[move.row][move.col] !== null) {
      break
    }
    
    board[move.row][move.col] = currentPlayer
    moveCount++
    
    // 检查胜负
    if (checkWin(board, move.row, move.col, currentPlayer)) {
      return {
        winner: currentPlayer,
        moves: moveCount,
        timeMs: Date.now() - startTime
      }
    }
    
    currentPlayer = currentPlayer === 'black' ? 'white' : 'black'
  }
  
  return {
    winner: 'draw',
    moves: moveCount,
    timeMs: Date.now() - startTime
  }
}

// 检查胜负
function checkWin(board: Board, row: number, col: number, player: Player): boolean {
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]]
  
  for (const [dr, dc] of DIRS) {
    let count = 1
    
    for (let i = 1; i < 5; i++) {
      const r = row + dr * i
      const c = col + dc * i
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE || board[r][c] !== player) break
      count++
    }
    
    for (let i = 1; i < 5; i++) {
      const r = row - dr * i
      const c = col - dc * i
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE || board[r][c] !== player) break
      count++
    }
    
    if (count >= 5) return true
  }
  
  return false
}

// 性能对比测试
export function benchmarkAI(
  board: Board,
  player: Player,
  difficulty: Difficulty,
  iterations: number = 10
): {
  basic: { avgTime: number; avgDepth: number }
  advanced: { avgTime: number; avgDepth: number }
} {
  const basicTimes: number[] = []
  const advancedTimes: number[] = []
  
  for (let i = 0; i < iterations; i++) {
    // 测试基础 AI
    const basicStart = Date.now()
    getAiMove(board, player, difficulty)
    basicTimes.push(Date.now() - basicStart)
    
    // 测试高级 AI
    const advancedStart = Date.now()
    getAdvancedAiMove(board, player, difficulty, 2000)
    advancedTimes.push(Date.now() - advancedStart)
  }
  
  return {
    basic: {
      avgTime: basicTimes.reduce((a, b) => a + b, 0) / iterations,
      avgDepth: difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4
    },
    advanced: {
      avgTime: advancedTimes.reduce((a, b) => a + b, 0) / iterations,
      avgDepth: difficulty === 'easy' ? 2 : difficulty === 'medium' ? 4 : 6
    }
  }
}

// 创建测试局面
export function createTestScenarios(): Array<{
  name: string
  board: Board
  player: Player
  expectedMove: Position
}> {
  const scenarios: Array<{
    name: string
    board: Board
    player: Player
    expectedMove: Position
  }> = []
  
  // 场景 1：直接获胜
  const scenario1 = createEmptyBoard()
  scenario1[7][7] = 'black'
  scenario1[7][8] = 'black'
  scenario1[7][9] = 'black'
  scenario1[7][10] = 'black'
  scenarios.push({
    name: '直接获胜',
    board: scenario1,
    player: 'black',
    expectedMove: { row: 7, col: 11 }
  })
  
  // 场景 2：防守对手获胜
  const scenario2 = createEmptyBoard()
  scenario2[7][7] = 'white'
  scenario2[7][8] = 'white'
  scenario2[7][9] = 'white'
  scenario2[7][10] = 'white'
  scenarios.push({
    name: '防守对手',
    board: scenario2,
    player: 'black',
    expectedMove: { row: 7, col: 11 }
  })
  
  // 场景 3：活三
  const scenario3 = createEmptyBoard()
  scenario3[7][7] = 'black'
  scenario3[7][8] = 'black'
  scenario3[7][9] = 'black'
  scenarios.push({
    name: '活三局面',
    board: scenario3,
    player: 'black',
    expectedMove: { row: 7, col: 10 }
  })
  
  // 场景 4：双活二
  const scenario4 = createEmptyBoard()
  scenario4[7][7] = 'black'
  scenario4[7][8] = 'black'
  scenario4[8][7] = 'black'
  scenario4[8][8] = 'black'
  scenarios.push({
    name: '双活二',
    board: scenario4,
    player: 'black',
    expectedMove: { row: 7, col: 9 }
  })
  
  return scenarios
}

// 运行所有测试
export function runAllTests(): {
  scenarios: Array<{ name: string; passed: boolean; time: number }>
  benchmark: ReturnType<typeof benchmarkAI>
  simulation: Array<{ winner: string; moves: number; time: number }>
} {
  const testScenarios = createTestScenarios()
  const results: Array<{ name: string; passed: boolean; time: number }> = []
  
  console.log('=== AI 性能测试 ===\n')
  
  // 测试各个场景
  for (const scenario of testScenarios) {
    const startTime = Date.now()
    const move = getAdvancedAiMove(scenario.board, scenario.player, 'hard', 1000)
    const elapsed = Date.now() - startTime
    
    const passed = move.row === scenario.expectedMove.row && 
                   move.col === scenario.expectedMove.col
    
    results.push({
      name: scenario.name,
      passed,
      time: elapsed
    })
    
    console.log(`${scenario.name}: ${passed ? '✓' : '✗'} (${elapsed}ms)`)
    if (!passed) {
      console.log(`  预期：(${scenario.expectedMove.row}, ${scenario.expectedMove.col})`)
      console.log(`  实际：(${move.row}, ${move.col})`)
    }
  }
  
  console.log('\n=== 性能对比 ===\n')
  
  // 性能对比
  const emptyBoard = createEmptyBoard()
  const benchmark = benchmarkAI(emptyBoard, 'black', 'hard', 10)
  
  console.log('基础 AI:')
  console.log(`  平均时间：${benchmark.basic.avgTime.toFixed(2)}ms`)
  console.log(`  搜索深度：${benchmark.basic.avgDepth}层`)
  
  console.log('\n高级 AI:')
  console.log(`  平均时间：${benchmark.advanced.avgTime.toFixed(2)}ms`)
  console.log(`  搜索深度：${benchmark.advanced.avgDepth}层`)
  
  const improvement = ((benchmark.basic.avgTime - benchmark.advanced.avgTime) / benchmark.basic.avgTime * 100)
  console.log(`\n性能提升：${improvement > 0 ? '+' : ''}${improvement.toFixed(2)}%`)
  
  console.log('\n=== AI 对战模拟 ===\n')
  
  // AI 对战模拟
  const simulations: Array<{ winner: string; moves: number; time: number }> = []
  
  for (let i = 0; i < 5; i++) {
    const result = simulateGame('hard', 'medium', true)
    simulations.push({
      winner: result.winner,
      moves: result.moves,
      time: result.timeMs
    })
    console.log(`第${i + 1}局：${result.winner} 获胜，${result.moves}手，耗时${result.timeMs}ms`)
  }
  
  const hardWins = simulations.filter(s => s.winner === 'hard').length
  const mediumWins = simulations.filter(s => s.winner === 'medium').length
  const draws = simulations.filter(s => s.winner === 'draw').length
  
  console.log(`\n困难 AI 胜率：${hardWins / 5 * 100}%`)
  console.log(`中等 AI 胜率：${mediumWins / 5 * 100}%`)
  console.log(`和棋：${draws / 5 * 100}%`)
  
  return {
    scenarios: results,
    benchmark,
    simulation: simulations
  }
}

// 导出测试函数
export const __testing__ = {
  createEmptyBoard,
  createTestScenarios,
  simulateGame,
  benchmarkAI,
  runAllTests
}