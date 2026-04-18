// 测试高级 AI 的简单脚本
import { getAdvancedAiMove } from './src/lib/advancedGomokuAi';

// 创建一个测试棋盘
const testBoard = Array(15).fill(null).map(() => Array(15).fill(null));

// 在棋盘上放置一些棋子
testBoard[7][6] = 'black';
testBoard[7][7] = 'black';
testBoard[7][8] = 'black';
testBoard[7][9] = 'black';

// 模拟 AI 黑棋，难度为 hard
console.log('测试高级 AI...');

const startTime = Date.now();
const move = getAdvancedAiMove(testBoard, 'black', 'hard', 1000);
const endTime = Date.now();

console.log(`AI 建议走法: (${move.row}, ${move.col})`);
console.log(`思考时间: ${endTime - startTime}ms`);

// 验证返回的走法是否有效
if (testBoard[move.row][move.col] === null) {
  console.log('✓ 返回了一个有效的走法');
} else {
  console.log('✗ 返回了一个无效的走法');
}

// 测试防守场景
const defenseBoard = Array(15).fill(null).map(() => Array(15).fill(null));
defenseBoard[7][6] = 'white';
defenseBoard[7][7] = 'white';
defenseBoard[7][8] = 'white';
defenseBoard[7][9] = 'white';

console.log('\n测试防守场景...');
const defenseMove = getAdvancedAiMove(defenseBoard, 'black', 'hard', 1000);
console.log(`防守走法: (${defenseMove.row}, ${defenseMove.col})`);