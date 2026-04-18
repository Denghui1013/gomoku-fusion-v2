# 高级 AI 集成指南

## ✅ 已完成的集成

高级 AI 已经成功集成到五子棋游戏中！以下是集成的详细信息：

## 📁 修改的文件

### 1. Worker 文件
**文件**: `src/workers/gomokuAi.worker.ts`

**修改内容**:
- 从 `getAiMove` 改为 `getAdvancedAiMove`
- 添加时间限制参数支持
- 使用 Alpha-Beta 剪枝算法

```typescript
import { getAdvancedAiMove } from '../lib/advancedGomokuAi'

self.onmessage = (e) => {
  const { board, ai, difficulty, timeLimit } = e.data
  const move = getAdvancedAiMove(board, ai, difficulty, timeLimit || 1000)
  self.postMessage(move)
}
```

### 2. 游戏组件
**文件**: `src/components/game/GomokuGame.tsx`

**修改内容**:
- 导入高级 AI 函数
- 使用 Worker 在后台线程计算 AI 移动
- 添加错误处理和回退机制
- 根据难度调整思考时间

```typescript
// 使用 Worker 计算 AI 移动
const worker = new Worker(new URL('@/workers/gomokuAi.worker.ts', import.meta.url))

worker.onmessage = (e) => {
  const move = e.data
  // 应用 AI 移动
}

worker.onerror = (error) => {
  // 回退到主线程计算
  const move = getAdvancedAiMove(board, aiPlayer, difficulty, timeLimit)
}
```

## 🎮 如何使用

### 方法 1：直接使用（已默认启用）

高级 AI 已经默认启用，无需额外配置。只需：

1. 启动开发服务器：
```bash
npm run dev
```

2. 在浏览器中打开游戏
3. 选择"人机对战"模式
4. 选择难度（简单/中等/困难）
5. 开始游戏

### 方法 2：自定义 AI 参数

如果需要调整 AI 参数，可以修改 `GomokuGame.tsx` 中的配置：

```typescript
// 调整思考时间（毫秒）
const thinkMs = difficulty === 'easy' ? 140 : difficulty === 'medium' ? 220 : 320

// 调整 AI 计算时间限制（毫秒）
const timeLimit = difficulty === 'easy' ? 500 : difficulty === 'medium' ? 800 : 1200
```

## 📊 性能对比

| 难度 | 思考时间 | 计算时间限制 | 搜索深度 | 响应速度 |
|------|----------|--------------|----------|----------|
| 简单 | 140ms | 500ms | 2 层 | 极快 |
| 中等 | 220ms | 800ms | 4 层 | 快速 |
| 困难 | 320ms | 1200ms | 6 层 | 正常 |

## 🔧 高级配置

### 调整 AI 强度

可以通过以下方式调整 AI 强度：

#### 1. 修改搜索深度
在 `src/lib/advancedGomokuAi.ts` 中：

```typescript
function getSearchDepth(difficulty: Difficulty, phase: GamePhase): number {
  switch (difficulty) {
    case 'easy': return 2  // 降低深度
    case 'medium': return 4
    case 'hard': return 8  // 提高深度
    default: return 3
  }
}
```

#### 2. 修改时间限制
在 `src/components/game/GomokuGame.tsx` 中：

```typescript
const timeLimit = difficulty === 'easy' ? 300 : difficulty === 'medium' ? 600 : 1500
```

#### 3. 调整评估权重
在 `src/lib/advancedGomokuAi.ts` 中：

```typescript
const PATTERNS = {
  FIVE: 1000000,
  OPEN_FOUR: 100000,
  RUSH_FOUR: 50000,
  OPEN_THREE_DOUBLE: 80000,
  OPEN_THREE: 10000,
  // ... 调整这些值来改变 AI 行为
}
```

## 🧪 测试 AI

### 测试场景 1：直接获胜

```typescript
const board = Array(15).fill(null).map(() => Array(15).fill(null))
board[7][6] = 'black'
board[7][7] = 'black'
board[7][8] = 'black'
board[7][9] = 'black'

const move = getAdvancedAiMove(board, 'black', 'hard', 1000)
// 预期：返回 (7, 10) 或 (7, 5) 形成五连
```

### 测试场景 2：防守对手

```typescript
const board = Array(15).fill(null).map(() => Array(15).fill(null))
board[7][6] = 'white'
board[7][7] = 'white'
board[7][8] = 'white'
board[7][9] = 'white'

const move = getAdvancedAiMove(board, 'black', 'hard', 1000)
// 预期：返回 (7, 10) 或 (7, 5) 阻止对手获胜
```

### 测试场景 3：性能测试

```typescript
const board = Array(15).fill(null).map(() => Array(15).fill(null))
const startTime = Date.now()
const move = getAdvancedAiMove(board, 'black', 'hard', 2000)
const endTime = Date.now()

console.log(`思考时间：${endTime - startTime}ms`)
// 预期：< 1500ms
```

## 📈 优化建议

### 1. 移动端优化

在移动设备上，可以降低计算时间以保证流畅性：

```typescript
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
const timeLimit = isMobile ? 800 : 1200
```

### 2. 性能监控

添加性能监控来了解 AI 的实际表现：

```typescript
const startTime = Date.now()
const move = getAdvancedAiMove(board, aiPlayer, difficulty, timeLimit)
const elapsed = Date.now() - startTime
console.log(`AI 计算耗时：${elapsed}ms`)
```

### 3. 缓存优化

使用更大的置换表来提高性能：

```typescript
class TranspositionTable {
  private maxSize = 100000  // 增加缓存大小
  // ...
}
```

## 🐛 故障排除

### 问题 1：AI 响应过慢

**解决方案**：
- 降低 `timeLimit` 参数
- 减少搜索深度
- 降低难度级别

### 问题 2：Worker 加载失败

**解决方案**：
- 检查文件路径是否正确
- 确保构建工具支持 Worker
- 使用回退机制（已实现）

### 问题 3：AI 选择不合理

**解决方案**：
- 检查评估函数权重
- 增加开局库覆盖范围
- 调整游戏阶段判断逻辑

## 📚 相关文件

- `src/lib/advancedGomokuAi.ts` - 高级 AI 核心实现
- `src/workers/gomokuAi.worker.ts` - AI Worker
- `src/components/game/GomokuGame.tsx` - 游戏组件
- `AI_USAGE_GUIDE.md` - 详细使用指南
- `ai_analysis.md` - AI 分析报告

## ✨ 下一步

现在高级 AI 已经集成完成，你可以：

1. **测试游戏**：启动开发服务器并测试 AI
2. **调整参数**：根据需求调整 AI 强度
3. **添加功能**：扩展开局库、优化评估函数等
4. **性能优化**：进一步优化 AI 性能

祝你玩得开心！🎉