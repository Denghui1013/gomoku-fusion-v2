'use client'

import type { Board, Player, Position, Difficulty } from '@/types'

const BOARD_SIZE = 15
const WIN_COUNT = 5
const CENTER: Position = { row: 7, col: 7 }
const DIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
]

// 邻域候选缓存，同一轮 getAiMove 内重复 board+radius 可复用，减少重复遍历
let _neighborhoodCache: { key: string; value: Position[] } | null = null

function boardCacheKey(board: Board, radius: number): string {
  let s = radius + ':'
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const v = board[r][c]
      s += v === null ? '.' : v === 'black' ? 'b' : 'w'
    }
  }
  return s
}

// 模式评分权重：己方进攻（进一步提高，让 AI 更主动施压、玩家更有压迫感）
const SCORE_OPEN_4 = 18000
const SCORE_BLOCKED_4 = 9000
const SCORE_OPEN_3 = 5000
const SCORE_BLOCKED_3 = 1200
const SCORE_OPEN_2 = 700
const SCORE_BLOCKED_2 = 180
const SCORE_OPEN_1 = 40

// 对方威胁（防守权重）- 提高以确保 60/100/120 步内不轻易被破防
const SCORE_OPP_OPEN_3 = 14000
const SCORE_OPP_BLOCKED_3 = 1600
const SCORE_OPP_OPEN_2 = 1000
const SCORE_OPP_BLOCKED_2 = 150
const HARD_OPP_OPEN_3 = 30000
const HARD_OPP_OPEN_2 = 2800

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice())
}

function isWin(board: Board, row: number, col: number, player: Player): boolean {
  for (const [dr, dc] of DIRS) {
    let count = 1
    for (let i = 1; i < WIN_COUNT; i++) {
      const r = row + dr * i
      const c = col + dc * i
      if (!inBounds(r, c) || board[r][c] !== player) break
      count++
    }
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

function isWinningMove(board: Board, move: Position, player: Player): boolean {
  if (board[move.row][move.col] !== null) return false
  const next = cloneBoard(board)
  next[move.row][move.col] = player
  return isWin(next, move.row, move.col, player)
}

/** 对方若下在 move 会形成四连（下一步可成五），返回 true。用于困难模式必堵。 */
function wouldGiveFourInARow(board: Board, move: Position, player: Player): boolean {
  const { row: r, col: c } = move
  if (board[r][c] !== null) return false
  for (const [dr, dc] of DIRS) {
    const { count } = countLineInDirection(board, r, c, dr, dc, player)
    if (count === 4) return true
  }
  return false
}

/** 对方存在活三（两端开放的三连）时，返回所有可堵住该活三的空位（即活三两端）。用于简单/中等难度必堵。 */
function getMovesThatBlockOpponentOpen3(board: Board, opponent: Player): Position[] {
  const set = new Set<string>()
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) continue
      for (const [dr, dc] of DIRS) {
        const { count, openEnds, countPlus, countMinus } = countLineInDirection(
          board,
          r,
          c,
          dr,
          dc,
          opponent
        )
        if (count !== 3 || openEnds < 2) continue
        set.add(`${r},${c}`)
        const endR = r + dr * (countPlus + 1)
        const endC = c + dc * (countPlus + 1)
        if (inBounds(endR, endC) && board[endR][endC] === null) set.add(`${endR},${endC}`)
        const endR2 = r - dr * (countMinus + 1)
        const endC2 = c - dc * (countMinus + 1)
        if (inBounds(endR2, endC2) && board[endR2][endC2] === null) set.add(`${endR2},${endC2}`)
      }
    }
  }
  return Array.from(set).map((k) => {
    const [row, col] = k.split(',').map(Number)
    return { row, col }
  })
}

/** 困难模式：对方存在“再下一手成四”的点时，必须堵其中之一。返回这些必堵点。 */
function getMustBlockFourMoves(board: Board, human: Player): Position[] {
  const blocks: Position[] = []
  const empties = getAllEmptyMoves(board)
  for (const m of empties) {
    if (wouldGiveFourInARow(board, m, human)) blocks.push(m)
  }
  return blocks
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

function getNeighborhoodMoves(board: Board, radius: number): Position[] {
  const key = boardCacheKey(board, radius)
  if (_neighborhoodCache && _neighborhoodCache.key === key) return _neighborhoodCache.value
  const set = new Set<string>()
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === null) continue
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
  const result =
    set.size === 0
      ? getAllEmptyMoves(board)
      : Array.from(set).map((k) => {
          const [row, col] = k.split(',').map(Number)
          return { row, col }
        })
  _neighborhoodCache = { key, value: result }
  return result
}

/** 沿某方向统计以 (r,c) 为空的连子数，以及两端是否可延伸（开放） */
function countLineInDirection(
  board: Board,
  r: number,
  c: number,
  dr: number,
  dc: number,
  player: Player
): { count: number; openEnds: number; countPlus: number; countMinus: number } {
  let countPlus = 0
  for (let i = 1; i < WIN_COUNT; i++) {
    const rr = r + dr * i
    const cc = c + dc * i
    if (!inBounds(rr, cc) || board[rr][cc] !== player) break
    countPlus++
  }
  let countMinus = 0
  for (let i = 1; i < WIN_COUNT; i++) {
    const rr = r - dr * i
    const cc = c - dc * i
    if (!inBounds(rr, cc) || board[rr][cc] !== player) break
    countMinus++
  }
  const count = 1 + countPlus + countMinus
  const endPlus = r + dr * (countPlus + 1)
  const endPlusC = c + dc * (countPlus + 1)
  const endMinus = r - dr * (countMinus + 1)
  const endMinusC = c - dc * (countMinus + 1)
  let openEnds = 0
  if (inBounds(endPlus, endPlusC) && board[endPlus][endPlusC] === null) openEnds++
  if (inBounds(endMinus, endMinusC) && board[endMinus][endMinusC] === null) openEnds++
  return { count, openEnds, countPlus, countMinus }
}

/** 若在 (r,c) 下 player 子，有几个方向形成活三（两端开放的三连） */
function countOpenThrees(board: Board, move: Position, player: Player): number {
  const { row: r, col: c } = move
  if (board[r][c] !== null) return 0
  let count = 0
  for (const [dr, dc] of DIRS) {
    const { count: lineCount, openEnds } = countLineInDirection(board, r, c, dr, dc, player)
    if (lineCount === 3 && openEnds >= 2) count++
  }
  return count
}

function scoreLineForPlayer(
  board: Board,
  r: number,
  c: number,
  dr: number,
  dc: number,
  player: Player
): number {
  const { count, openEnds } = countLineInDirection(board, r, c, dr, dc, player)
  if (count >= WIN_COUNT) return 100000
  if (count === 4) return openEnds >= 1 ? SCORE_OPEN_4 : SCORE_BLOCKED_4
  if (count === 3) return openEnds >= 2 ? SCORE_OPEN_3 : SCORE_BLOCKED_3
  if (count === 2) return openEnds >= 2 ? SCORE_OPEN_2 : SCORE_BLOCKED_2
  if (count === 1) return openEnds >= 1 ? SCORE_OPEN_1 : 0
  return 0
}

function scoreLineForOpponent(
  board: Board,
  r: number,
  c: number,
  dr: number,
  dc: number,
  opponent: Player
): number {
  const { count, openEnds } = countLineInDirection(board, r, c, dr, dc, opponent)
  if (count >= WIN_COUNT) return 100000
  if (count === 4) return 96000
  if (count === 3) return openEnds >= 2 ? SCORE_OPP_OPEN_3 : SCORE_OPP_BLOCKED_3
  if (count === 2) return openEnds >= 2 ? SCORE_OPP_OPEN_2 : SCORE_OPP_BLOCKED_2
  return 0
}

function evaluatePoint(
  board: Board,
  move: Position,
  ai: Player,
  human: Player,
  forHard: boolean = false
): number {
  const { row: r, col: c } = move
  if (board[r][c] !== null) return -Infinity
  let score = 0
  for (const [dr, dc] of DIRS) {
    score += scoreLineForPlayer(board, r, c, dr, dc, ai)
    if (forHard) {
      const { count, openEnds } = countLineInDirection(board, r, c, dr, dc, human)
      if (count === 3 && openEnds >= 2) score += HARD_OPP_OPEN_3
      else if (count === 3) score += SCORE_OPP_BLOCKED_3
      else if (count === 2 && openEnds >= 2) score += HARD_OPP_OPEN_2
      else if (count === 2) score += SCORE_OPP_BLOCKED_2
      else if (count === 4) score += 96000
    } else {
      score += scoreLineForOpponent(board, r, c, dr, dc, human)
    }
  }
  const openThrees = countOpenThrees(board, move, ai)
  if (openThrees >= 2) score += 25000
  // 攻防兼顾：堵对方的同时若己方有发展则加分，避免一味只堵不攻
  let ourOpen2 = 0
  for (const [dr, dc] of DIRS) {
    const { count, openEnds } = countLineInDirection(board, r, c, dr, dc, ai)
    if (count === 2 && openEnds >= 2) ourOpen2++
  }
  if (ourOpen2 > 0 && forHard) score += ourOpen2 * 400
  const centerDist = Math.abs(r - CENTER.row) + Math.abs(c - CENTER.col)
  score += Math.max(0, 40 - centerDist * 2)
  let adjacent = 0
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const rr = r + dr
      const cc = c + dc
      if (inBounds(rr, cc) && board[rr][cc] !== null) adjacent++
    }
  }
  score += adjacent * 22
  return score
}

function scoreMoveSimple(
  board: Board,
  move: Position,
  ai: Player,
  human: Player,
  blockOpen3Set?: Set<string>
): number {
  const centerDist = Math.abs(move.row - CENTER.row) + Math.abs(move.col - CENTER.col)
  let score = 100 - centerDist * 2
  let adjacent = 0
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const r = move.row + dr
      const c = move.col + dc
      if (!inBounds(r, c)) continue
      if (board[r][c] !== null) adjacent++
    }
  }
  score += adjacent * 5
  if (isWinningMove(board, move, ai)) score += 100000
  if (isWinningMove(board, move, human)) score += 95000
  // 己方形成活二、活三的邻位略加分，提高进攻倾向
  for (const [dr, dc] of DIRS) {
    const { count, openEnds } = countLineInDirection(board, move.row, move.col, dr, dc, ai)
    if (count === 2 && openEnds >= 2) score += 350
    if (count === 3 && openEnds >= 2) score += 2000
  }
  // 堵住对方活三的选点给予高权重，避免简单难度被活三套路轻易击败
  if (blockOpen3Set && blockOpen3Set.has(`${move.row},${move.col}`)) score += 7000
  return score
}

function pickBest(
  board: Board,
  candidates: Position[],
  ai: Player,
  human: Player,
  scorer: (b: Board, m: Position, ai: Player, human: Player) => number
): Position {
  let bestScore = -Infinity
  const best: Position[] = []
  for (const m of candidates) {
    const s = scorer(board, m, ai, human)
    if (s > bestScore) {
      bestScore = s
      best.length = 0
      best.push(m)
    } else if (s === bestScore) {
      best.push(m)
    }
  }
  return best[Math.floor(Math.random() * best.length)]
}

function pickAmongTop(
  board: Board,
  candidates: Position[],
  ai: Player,
  human: Player,
  topK: number,
  blockOpen3Set?: Set<string>
): Position {
  const scorer = (m: Position) =>
    scoreMoveSimple(board, m, ai, human, blockOpen3Set)
  const scored = candidates.map((m) => ({ move: m, score: scorer(m) }))
  scored.sort((a, b) => b.score - a.score)
  const top = scored.slice(0, Math.max(1, topK))
  return top[Math.floor(Math.random() * top.length)].move
}

function evaluateBoard(
  board: Board,
  ai: Player,
  human: Player,
  forHard: boolean = false
): number {
  const relevantEmpties = getNeighborhoodMoves(board, forHard ? 3 : 2)
  if (relevantEmpties.length === 0) return 0
  let total = 0
  for (const m of relevantEmpties) {
    total += evaluatePoint(board, m, ai, human, forHard)
    total -= evaluatePoint(board, m, human, ai, forHard)
  }
  return total
}

function getBestReply(
  board: Board,
  player: Player,
  opponent: Player,
  radius: number = 2,
  forHard: boolean = false
): { move: Position; score: number } {
  for (const m of getAllEmptyMoves(board)) {
    if (isWinningMove(board, m, player)) return { move: m, score: 100000 }
  }
  for (const m of getAllEmptyMoves(board)) {
    if (isWinningMove(board, m, opponent)) return { move: m, score: 95000 }
  }
  let list = getNeighborhoodMoves(board, radius)
  const maxCandidates = forHard ? 34 : 24
  if (list.length > maxCandidates) {
    const scored = list.map((m) => ({
      move: m,
      score: evaluatePoint(board, m, player, opponent, forHard),
    }))
    scored.sort((a, b) => b.score - a.score)
    list = scored.slice(0, maxCandidates).map((x) => x.move)
  }
  if (list.length === 0) return { move: CENTER, score: 0 }
  let bestScore = -Infinity
  let bestMove = list[0]
  for (const m of list) {
    if (board[m.row][m.col] !== null) continue
    const next = cloneBoard(board)
    next[m.row][m.col] = player
    const s = evaluateBoard(next, player, opponent, forHard)
    if (s > bestScore) {
      bestScore = s
      bestMove = m
    }
  }
  return { move: bestMove, score: bestScore }
}

export function getAiMove(
  board: Board,
  ai: Player,
  difficulty: Difficulty,
  options?: { lowLatency?: boolean }
): Position {
  const lowLatency = options?.lowLatency === true
  _neighborhoodCache = null
  const human: Player = ai === 'black' ? 'white' : 'black'
  const empties = getAllEmptyMoves(board)
  if (empties.length === 0) return CENTER
  if (board[CENTER.row][CENTER.col] === null && difficulty === 'easy') return CENTER

  for (const m of empties) if (isWinningMove(board, m, ai)) return m
  for (const m of empties) if (isWinningMove(board, m, human)) return m

  const mustBlockFour = getMustBlockFourMoves(board, human)
  if (mustBlockFour.length > 0) {
    const useHardEval = difficulty === 'hard' || difficulty === 'medium'
    const best = pickBest(
      board,
      mustBlockFour,
      ai,
      human,
      (b, m, a, h) => evaluatePoint(b, m, a, h, useHardEval)
    )
    return best
  }

  const blockOpen3 = getMovesThatBlockOpponentOpen3(board, human)
  const blockOpen3Set =
    blockOpen3.length > 0 ? new Set(blockOpen3.map((p) => `${p.row},${p.col}`)) : undefined

  const candidates = getNeighborhoodMoves(board, 2)
  if (candidates.length === 0) return empties[Math.floor(Math.random() * empties.length)]

  switch (difficulty) {
    case 'easy': {
      if (blockOpen3Set && blockOpen3.length > 0) {
        const inCandidates = blockOpen3.filter((p) =>
          candidates.some((c) => c.row === p.row && c.col === p.col)
        )
        if (inCandidates.length > 0) {
          return pickBest(board, inCandidates, ai, human, (b, m, a, h) =>
            evaluatePoint(b, m, a, h, true)
          )
        }
      }
      const maxEasyCandidates = lowLatency ? 14 : 18
      let easyList = getNeighborhoodMoves(board, 2)
      if (easyList.length > maxEasyCandidates) {
        const scored = easyList.map((m) => ({
          move: m,
          score: evaluatePoint(board, m, ai, human, true),
        }))
        scored.sort((a, b) => b.score - a.score)
        easyList = scored.slice(0, maxEasyCandidates).map((x) => x.move)
      }
      let bestScore = -Infinity
      const bestMoves: Position[] = []
      for (const m of easyList) {
        if (board[m.row][m.col] !== null) continue
        const next = cloneBoard(board)
        next[m.row][m.col] = ai
        if (isWin(next, m.row, m.col, ai)) return m
        const oppReply = getBestReply(next, human, ai, 2, true)
        const afterOpp = cloneBoard(next)
        afterOpp[oppReply.move.row][oppReply.move.col] = human
        const score = evaluateBoard(afterOpp, ai, human, true)
        if (score > bestScore) {
          bestScore = score
          bestMoves.length = 0
          bestMoves.push(m)
        } else if (score === bestScore) {
          bestMoves.push(m)
        }
      }
      if (bestMoves.length > 0) return bestMoves[Math.floor(Math.random() * bestMoves.length)]
      const scored = candidates.map((m) => ({
        move: m,
        score: evaluatePoint(board, m, ai, human, true),
      }))
      scored.sort((a, b) => b.score - a.score)
      return scored[0].move
    }
    case 'medium': {
      if (blockOpen3Set && blockOpen3.length > 0) {
        const inCandidates = candidates.filter((c) => blockOpen3Set!.has(`${c.row},${c.col}`))
        if (inCandidates.length > 0) {
          return pickBest(board, inCandidates, ai, human, (b, m, a, h) =>
            evaluatePoint(b, m, a, h, true)
          )
        }
      }
      // 3 步推演（目标 100 步内不输）；lowLatency 时改为 2 步 + 少候选以保手机端流畅
      const maxMediumCandidates = lowLatency ? 22 : 28
      let mediumList = getNeighborhoodMoves(board, 2)
      if (mediumList.length > maxMediumCandidates) {
        const scored = mediumList.map((m) => ({
          move: m,
          score: evaluatePoint(board, m, ai, human, true),
        }))
        scored.sort((a, b) => b.score - a.score)
        mediumList = scored.slice(0, maxMediumCandidates).map((x) => x.move)
      }
      let bestScore = -Infinity
      const bestMoves: Position[] = []
      for (const m of mediumList) {
        if (board[m.row][m.col] !== null) continue
        const next = cloneBoard(board)
        next[m.row][m.col] = ai
        if (isWin(next, m.row, m.col, ai)) return m
        const oppReply = getBestReply(next, human, ai, 2, true)
        const afterOpp = cloneBoard(next)
        afterOpp[oppReply.move.row][oppReply.move.col] = human
        let score: number
        if (lowLatency) {
          score = evaluateBoard(afterOpp, ai, human, true)
        } else {
          const ourReply = getBestReply(afterOpp, ai, human, 2, true)
          const afterOur = cloneBoard(afterOpp)
          afterOur[ourReply.move.row][ourReply.move.col] = ai
          const oppReply2 = getBestReply(afterOur, human, ai, 2, true)
          const afterOpp2 = cloneBoard(afterOur)
          afterOpp2[oppReply2.move.row][oppReply2.move.col] = human
          score = evaluateBoard(afterOpp2, ai, human, true)
        }
        if (score > bestScore) {
          bestScore = score
          bestMoves.length = 0
          bestMoves.push(m)
        } else if (score === bestScore) {
          bestMoves.push(m)
        }
      }
      return bestMoves.length > 0
        ? bestMoves[Math.floor(Math.random() * bestMoves.length)]
        : pickBest(board, candidates, ai, human, (b, m, a, h) => evaluatePoint(b, m, a, h, true))
    }
    case 'hard': {
      const radius = 3
      let hardCandidates = getNeighborhoodMoves(board, radius)
      if (blockOpen3Set && blockOpen3Set.size > 0) {
        const blocking = hardCandidates.filter((c) => blockOpen3Set!.has(`${c.row},${c.col}`))
        if (blocking.length > 0) hardCandidates = blocking
      }
      if (hardCandidates.length === 0) return pickBest(board, candidates, ai, human, (b, m, a, h) => evaluatePoint(b, m, a, h, true))
      const maxPlyCandidates = lowLatency ? 32 : 40
      if (hardCandidates.length > maxPlyCandidates) {
        const scored = hardCandidates.map((m) => ({
          move: m,
          score: evaluatePoint(board, m, ai, human, true),
        }))
        scored.sort((a, b) => b.score - a.score)
        hardCandidates = scored.slice(0, maxPlyCandidates).map((x) => x.move)
      }
      let bestScore = -Infinity
      const bestMoves: Position[] = []
      for (const m of hardCandidates) {
        if (board[m.row][m.col] !== null) continue
        const next = cloneBoard(board)
        next[m.row][m.col] = ai
        if (isWin(next, m.row, m.col, ai)) return m
        const oppReply = getBestReply(next, human, ai, radius, true)
        const afterOpp = cloneBoard(next)
        afterOpp[oppReply.move.row][oppReply.move.col] = human
        const ourReply = getBestReply(afterOpp, ai, human, radius, true)
        const afterOur = cloneBoard(afterOpp)
        afterOur[ourReply.move.row][ourReply.move.col] = ai
        const oppReply2 = getBestReply(afterOur, human, ai, radius, true)
        const afterOpp2 = cloneBoard(afterOur)
        afterOpp2[oppReply2.move.row][oppReply2.move.col] = human
        const ourReply2 = getBestReply(afterOpp2, ai, human, radius, true)
        const afterOur2 = cloneBoard(afterOpp2)
        afterOur2[ourReply2.move.row][ourReply2.move.col] = ai
        let score: number
        if (lowLatency) {
          score = evaluateBoard(afterOur2, ai, human, true)
        } else {
          const oppReply3 = getBestReply(afterOur2, human, ai, radius, true)
          const afterOpp3 = cloneBoard(afterOur2)
          afterOpp3[oppReply3.move.row][oppReply3.move.col] = human
          score = evaluateBoard(afterOpp3, ai, human, true)
        }
        if (score > bestScore) {
          bestScore = score
          bestMoves.length = 0
          bestMoves.push(m)
        } else if (score === bestScore) {
          bestMoves.push(m)
        }
      }
      return bestMoves.length > 0
        ? bestMoves[Math.floor(Math.random() * bestMoves.length)]
        : pickBest(board, candidates, ai, human, (b, m, a, h) => evaluatePoint(b, m, a, h, true))
    }
    default:
      return pickBest(board, candidates, ai, human, (b, m, a, h) =>
        scoreMoveSimple(b, m, a, h, blockOpen3Set)
      )
  }
}

export const __testing__ = {
  countLineInDirection,
}
