# Bundle 优化指南

## 📊 当前优化措施

### 1. 代码分割 (Code Splitting)

#### AI 模块动态导入
- **文件**: `src/lib/aiLoader.ts`
- **作用**: AI 算法模块按需加载，减少首屏 bundle 大小
- **使用方式**:
  ```typescript
  import { getAiMoveAsync, preloadAiModule } from '@/lib/aiLoader'
  
  // 异步获取 AI 移动
  const move = await getAiMoveAsync(board, player, difficulty, timeLimit)
  
  // 预加载（在空闲时）
  preloadAiModule()
  ```

#### Webpack Split Chunks 配置
在 `next.config.ts` 中配置了以下代码分割策略：

| Chunk 名称 | 包含内容 | 优先级 |
|-----------|---------|--------|
| `ai-algorithms` | AI 算法模块 | 10 |
| `animations` | Framer Motion | 10 |
| `vendors` | 其他第三方库 | 5 |

### 2. 包导入优化

```typescript
// next.config.ts
experimental: {
  optimizePackageImports: [
    'framer-motion',
    'lucide-react',
  ],
}
```

这会自动优化这些库的导入，只包含实际使用的代码。

### 3. Tree Shaking

- 使用 ES Modules 导入（`import { X } from 'Y'` 而非 `import * as Y`）
- Lucide 图标单独导入
- 死代码消除已启用

## 🔍 Bundle 分析方法

### 运行 Bundle Analyzer

```bash
npm run analyze
```

这将生成可视化报告，显示：
- 各模块大小
- 依赖关系图
- 重复依赖检测

### 分析结果解读

1. **打开生成的 HTML 文件**（通常在 `.next/analyze/` 目录）
2. **关注大体积模块**：
   - 单个模块 > 100KB 需要关注
   - 第三方库占总体积 > 50% 需要优化
3. **检查重复依赖**：同一库多个版本

## 📦 优化建议清单

### 高优先级

- [x] AI 模块动态导入
- [x] Webpack 代码分割配置
- [x] 包导入优化
- [ ] 图片资源优化（WebP/AVIF）
- [ ] 字体子集化

### 中优先级

- [ ] 服务端组件迁移（减少客户端 bundle）
- [ ] 依赖库替换（评估更轻量替代方案）
- [ ] 延迟加载非关键组件

### 低优先级

- [ ] Service Worker 缓存策略
- [ ] Brotli/Gzip 压缩优化
- [ ] CDN 部署

## 📈 性能指标目标

| 指标 | 当前 | 目标 | 优化后 |
|------|------|------|--------|
| First Load JS | - | < 200KB | - |
| AI Module Size | - | 按需加载 | - |
| Total Bundle | - | < 500KB | - |
| Lighthouse Performance | - | > 90 | - |

## 🛠️ 开发工具

### 测试覆盖

```bash
# 运行测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### 代码检查

```bash
# ESLint
npm run lint

# TypeScript 类型检查
npx tsc --noEmit
```

## 📝 最佳实践

1. **动态导入优先**: 对于非关键功能使用 `import()`
2. **预加载策略**: 使用 `requestIdleCallback` 预加载可能需要的模块
3. **监控 Bundle 大小**: 每次 major 更新后运行 `npm run analyze`
4. **定期清理依赖**: 移除未使用的依赖包

## 🔗 相关文件

- `next.config.ts` - Bundle 优化配置
- `src/lib/aiLoader.ts` - AI 模块动态加载器
- `src/components/game/GomokuGame.tsx` - 使用动态导入的示例
