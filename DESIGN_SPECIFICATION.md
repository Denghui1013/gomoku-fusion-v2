# 五子棋游戏 UI/UX 设计规范文档

> 版本：v1.0  
> 日期：2026-02-28  
> 基于开源项目研究与设计趋势分析

---

## 目录

1. [设计概述](#1-设计概述)
2. [视觉设计规范](#2-视觉设计规范)
3. [图标设计规范](#3-图标设计规范)
4. [音效设计规范](#4-音效设计规范)
5. [动画与交互规范](#5-动画与交互规范)
6. [布局规范](#6-布局规范)
7. [实现优先级](#7-实现优先级)
8. [参考资源](#8-参考资源)

---

## 1. 设计概述

### 1.1 设计目标

打造一款具有**传统韵味**与**现代美感**相结合的五子棋游戏，注重：
- 视觉舒适度与美感
- 流畅的交互体验
- 沉浸式的音效反馈
- 跨设备一致性

### 1.2 设计原则

| 原则 | 说明 |
|-----|------|
| **传统与现代结合** | 木纹棋盘质感 + 现代UI组件 |
| **视觉层次清晰** | 通过阴影、渐变区分元素层级 |
| **反馈即时** | 每个操作都有视觉/音效反馈 |
| **简洁优雅** | 避免过度装饰，保持界面清爽 |

### 1.3 参考项目

| 项目名称 | 亮点 |
|---------|------|
| ligomoku/gomoku | 现代化在线平台设计 |
| lihongxun945/gobang | Canvas实现与AI算法 |
| 五子棋小程序开源版 | 木纹风格与立体棋子 |
| HTML5 Canvas五子棋 | 渐变与阴影效果 |

---

## 2. 视觉设计规范

### 2.1 色彩系统

#### 主色调

| 名称 | 色值 | 用途 |
|-----|------|------|
| `--board-primary` | `#d4a574` | 棋盘主色（暖木色） |
| `--board-secondary` | `#c49a6c` | 棋盘渐变中间色 |
| `--board-dark` | `#b8905f` | 棋盘深色区域 |
| `--grid-line` | `#8b6914` | 网格线颜色 |
| `--piece-black` | `#1a1a1a` | 黑棋主色 |
| `--piece-white` | `#f5f5f5` | 白棋主色 |
| `--win-gold` | `#ffd700` | 胜利高亮（金色） |
| `--last-move` | `#e74c3c` | 最后一手标记（红色） |

#### 辅助色

| 名称 | 色值 | 用途 |
|-----|------|------|
| `--bg-primary` | `#f5f0e8` | 页面背景（米白色） |
| `--bg-secondary` | `#faf8f3` | 卡片背景 |
| `--text-primary` | `#2c3e50` | 主文字（深蓝灰） |
| `--text-secondary` | `#5d6d7e` | 次要文字 |
| `--btn-primary` | `#3498db` | 按钮主色（科技蓝） |
| `--btn-hover` | `#2980b9` | 按钮悬停色 |
| `--btn-danger` | `#e74c3c` | 危险操作按钮 |

#### 中性色

| 名称 | 色值 | 用途 |
|-----|------|------|
| `--shadow-light` | `rgba(0,0,0,0.1)` | 轻微阴影 |
| `--shadow-medium` | `rgba(0,0,0,0.2)` | 中等阴影 |
| `--shadow-heavy` | `rgba(0,0,0,0.3)` | 重阴影 |
| `--border-light` | `rgba(0,0,0,0.08)` | 边框颜色 |

### 2.2 棋盘设计

#### 棋盘样式

```css
/* 棋盘容器 */
.board-container {
  /* 尺寸 */
  width: 600px;
  height: 600px;
  
  /* 背景 - 木纹渐变 */
  background: linear-gradient(
    135deg,
    var(--board-primary) 0%,
    var(--board-secondary) 50%,
    var(--board-dark) 100%
  );
  
  /* 阴影 - 增加立体感 */
  box-shadow: 
    /* 内阴影 - 凹陷效果 */
    inset 0 0 60px rgba(0,0,0,0.1),
    /* 外阴影 - 悬浮效果 */
    0 10px 40px rgba(0,0,0,0.3),
    0 2px 8px rgba(0,0,0,0.2);
  
  /* 圆角 */
  border-radius: 8px;
  
  /* 内边距 - 为边缘棋子留出空间 */
  padding: 20px;
}

/* 棋盘网格 */
.board-grid {
  width: 100%;
  height: 100%;
  
  /* 网格线 */
  background-image: 
    linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
  background-size: 40px 40px;
  
  /* 网格线阴影 - 增加深度 */
  filter: drop-shadow(0.5px 0.5px 0.5px rgba(0,0,0,0.2));
}
```

#### 棋盘星位（天元及四星）

```css
.star-point {
  width: 8px;
  height: 8px;
  background-color: var(--grid-line);
  border-radius: 50%;
  
  /* 位置：3-3、3-11、11-3、11-11、7-7（天元） */
  position: absolute;
}
```

### 2.3 棋子设计

#### 黑棋样式

```css
.piece-black {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  
  /* 径向渐变 - 模拟光照（光源在左上方） */
  background: radial-gradient(
    circle at 30% 30%,
    #4a4a4a 0%,    /* 高光区域 */
    #2a2a2a 30%,   /* 中间色调 */
    #1a1a1a 70%,   /* 主色 */
    #0a0a0a 100%   /* 边缘深色 */
  );
  
  /* 多层阴影 */
  box-shadow: 
    /* 投影 - 悬浮感 */
    2px 3px 6px rgba(0,0,0,0.4),
    /* 内阴影 - 立体感 */
    inset -2px -2px 4px rgba(255,255,255,0.05),
    inset 1px 1px 2px rgba(255,255,255,0.1);
  
  /* 边框 - 定义边缘 */
  border: 1px solid rgba(0,0,0,0.3);
}
```

#### 白棋样式

```css
.piece-white {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  
  /* 径向渐变 - 珍珠质感 */
  background: radial-gradient(
    circle at 30% 30%,
    #ffffff 0%,    /* 高光 */
    #f0f0f0 25%,   /* 亮部 */
    #e8e8e8 50%,   /* 中间色 */
    #d8d8d8 100%   /* 暗部 */
  );
  
  /* 阴影 */
  box-shadow: 
    2px 3px 6px rgba(0,0,0,0.3),
    inset -1px -1px 2px rgba(0,0,0,0.1),
    inset 1px 1px 2px rgba(255,255,255,0.8);
  
  /* 边框 */
  border: 1px solid rgba(0,0,0,0.15);
}
```

#### 最后一手标记

```css
.last-move-indicator {
  position: absolute;
  width: 12px;
  height: 12px;
  background-color: var(--last-move);
  border-radius: 50%;
  
  /* 居中于棋子 */
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  
  /* 发光效果 */
  box-shadow: 0 0 8px var(--last-move);
  
  /* 脉冲动画 */
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.1); }
}
```

#### 胜利连线高亮

```css
.winning-piece {
  /* 金色边框 */
  border: 3px solid var(--win-gold);
  
  /* 发光效果 */
  box-shadow: 
    0 0 10px var(--win-gold),
    0 0 20px var(--win-gold),
    inset 0 0 10px rgba(255,215,0,0.3);
  
  /* 脉冲动画 */
  animation: winPulse 1s ease-in-out infinite;
}

@keyframes winPulse {
  0%, 100% { 
    box-shadow: 
      0 0 10px var(--win-gold),
      0 0 20px var(--win-gold);
  }
  50% { 
    box-shadow: 
      0 0 20px var(--win-gold),
      0 0 40px var(--win-gold),
      0 0 60px var(--win-gold);
  }
}
```

### 2.4 组件样式

#### 按钮样式

```css
/* 主按钮 */
.btn-primary {
  padding: 12px 24px;
  background: linear-gradient(135deg, var(--btn-primary), var(--btn-hover));
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  
  /* 阴影 */
  box-shadow: 
    0 4px 6px rgba(52,152,219,0.3),
    0 1px 3px rgba(0,0,0,0.1);
  
  /* 过渡 */
  transition: all 0.2s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 6px 12px rgba(52,152,219,0.4),
    0 2px 4px rgba(0,0,0,0.1);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(52,152,219,0.3);
}

/* 次要按钮 */
.btn-secondary {
  padding: 10px 20px;
  background: transparent;
  color: var(--text-primary);
  border: 2px solid var(--border-light);
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: rgba(0,0,0,0.05);
  border-color: var(--text-secondary);
}
```

#### 卡片样式

```css
.card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px;
  
  /* 轻微阴影 */
  box-shadow: 
    0 2px 8px rgba(0,0,0,0.08),
    0 1px 2px rgba(0,0,0,0.05);
  
  /* 边框 */
  border: 1px solid var(--border-light);
}
```

#### 弹窗样式

```css
.modal {
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 32px;
  
  /* 阴影 */
  box-shadow: 
    0 20px 60px rgba(0,0,0,0.3),
    0 0 0 1px rgba(0,0,0,0.05);
  
  /* 动画 */
  animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
```

---

## 3. 图标设计规范

### 3.1 图标库选择

推荐使用 **Lucide React** 或 **Heroicons**，特点：
- 线性设计风格
- 线条粗细统一（2px）
- 圆角设计
- 开源免费

### 3.2 功能图标映射

| 功能 | 图标 | 备选 | 说明 |
|-----|------|------|------|
| 重新开始 | `RotateCcw` | `RefreshCw` | 逆时针箭头 |
| 悔棋 | `Undo2` | `CornerUpLeft` | 回退箭头 |
| 设置 | `Settings` | `Cog` | 齿轮图标 |
| 音效开 | `Volume2` | - | 喇叭（有声） |
| 音效关 | `VolumeX` | - | 喇叭（静音） |
| 全屏 | `Maximize2` | `Expand` | 四角箭头 |
| 退出全屏 | `Minimize2` | `Shrink` | 内收箭头 |
| 人机对战 | `Cpu` | `Bot` | 机器人图标 |
| 双人对战 | `Users` | `UserPlus` | 双人图标 |
| 排行榜 | `Trophy` | `Medal` | 奖杯图标 |
| 返回 | `ChevronLeft` | `ArrowLeft` | 左箭头 |
| 关闭 | `X` | `Close` | 叉号 |
| 确认 | `Check` | `CheckCircle` | 对勾 |

### 3.3 图标使用规范

```tsx
// 图标组件示例
import { RotateCcw, Undo2, Volume2, Settings } from 'lucide-react';

// 工具栏按钮
<ToolbarButton>
  <RotateCcw size={20} strokeWidth={2} />
  <span>重新开始</span>
</ToolbarButton>

// 图标按钮（纯图标）
<IconButton>
  <Volume2 size={24} strokeWidth={2} />
</IconButton>
```

#### 图标尺寸规范

| 场景 | 尺寸 | 说明 |
|-----|------|------|
| 工具栏图标 | 20px | 配合文字使用 |
| 按钮图标 | 24px | 独立图标按钮 |
| 导航图标 | 24px | 底部/侧边导航 |
| 状态图标 | 16px | 内联状态指示 |
| 大图标 | 32-48px | 空状态/提示 |

### 3.4 图标交互状态

```css
.icon-button {
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
  color: var(--text-secondary);
}

.icon-button:hover {
  background: rgba(0,0,0,0.05);
  color: var(--text-primary);
  transform: scale(1.1);
}

.icon-button:active {
  transform: scale(0.95);
}

/* 激活状态（如音效开启） */
.icon-button.active {
  color: var(--btn-primary);
  background: rgba(52,152,219,0.1);
}
```

---

## 4. 音效设计规范

### 4.1 音效分类

| 触发时机 | 音效类型 | 描述 | 时长 |
|---------|---------|------|------|
| 落子 | `place` | 石头碰撞声 | 100-200ms |
| 胜利 | `win` | 欢快庆祝音效 | 2-3s |
| 平局 | `draw` | 中性提示音 | 1s |
| 悔棋 | `undo` | 撤销音效 | 200ms |
| 按钮点击 | `click` | UI反馈音 | 50-100ms |
| 游戏开始 | `start` | 开场音效 | 1-2s |
| 警告 | `warning` | 错误提示 | 300ms |

### 4.2 音效技术要求

#### 格式选择

| 格式 | 用途 | 说明 |
|-----|------|------|
| MP3 | 主要格式 | 兼容性好，压缩率高 |
| OGG | 备选格式 | 开源，质量优 |
| WAV | 短音效 | 无压缩，低延迟 |

#### 音量规范

```typescript
// 音量配置
const VOLUME_LEVELS = {
  master: 0.8,      // 主音量 80%
  place: 0.6,       // 落子 60%
  win: 0.9,         // 胜利 90%
  draw: 0.5,        // 平局 50%
  click: 0.3,       // 点击 30%
  undo: 0.4,        // 悔棋 40%
  start: 0.7,       // 开始 70%
};
```

### 4.3 音效管理器实现

```typescript
// SoundManager.ts
class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volumes: Record<string, number> = {};

  constructor() {
    this.initSounds();
  }

  private initSounds() {
    const soundFiles = {
      place: '/sounds/place-stone.mp3',
      win: '/sounds/victory.mp3',
      draw: '/sounds/draw.mp3',
      undo: '/sounds/undo.mp3',
      click: '/sounds/click.mp3',
      start: '/sounds/game-start.mp3',
    };

    Object.entries(soundFiles).forEach(([name, src]) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      this.sounds.set(name, audio);
    });
  }

  play(type: string): void {
    if (!this.enabled) return;
    
    const sound = this.sounds.get(type);
    if (sound) {
      sound.currentTime = 0;
      sound.volume = this.volumes[type] || 0.5;
      sound.play().catch(e => console.warn('Audio play failed:', e));
    }
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  setVolume(type: string, volume: number): void {
    this.volumes[type] = Math.max(0, Math.min(1, volume));
  }
}

export const soundManager = new SoundManager();
```

### 4.4 音效资源获取

**免费音效网站：**
- [Freesound.org](https://freesound.org) - 社区音效库
- [Zapsplat.com](https://zapsplat.com) - 专业游戏音效
- [Mixkit.co](https://mixkit.co) - 免费商用音效

**推荐搜索关键词：**
- 落子：`stone drop`, `wooden click`, `chess piece place`
- 胜利：`success`, `winning`, `achievement`, `fanfare`
- 点击：`ui click`, `button pop`, `interface tap`

---

## 5. 动画与交互规范

### 5.1 落子动画

```css
/* 棋子落下动画 */
@keyframes pieceDrop {
  0% {
    transform: scale(1.5) translateY(-50px);
    opacity: 0;
  }
  60% {
    transform: scale(0.9) translateY(5px);
  }
  80% {
    transform: scale(1.05) translateY(-2px);
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.piece-enter {
  animation: pieceDrop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

**设计要点：**
- 从上方落下，带弹性效果
- 使用 `cubic-bezier(0.34, 1.56, 0.64, 1)` 弹性缓动
- 动画时长 400ms

### 5.2 页面过渡动画

```css
/* 页面进入 */
@keyframes pageEnter {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-transition {
  animation: pageEnter 0.3s ease-out;
}

/* 页面退出 */
@keyframes pageExit {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-20px);
  }
}
```

### 5.3 按钮交互动画

```css
/* 按钮点击波纹效果 */
.btn-ripple {
  position: relative;
  overflow: hidden;
}

.btn-ripple::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255,255,255,0.3);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.3s, height 0.3s;
}

.btn-ripple:active::after {
  width: 200%;
  height: 200%;
}
```

### 5.4 胜利庆祝动画

```typescript
// 粒子效果实现
function createConfetti(x: number, y: number): void {
  const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'];
  const particleCount = 50;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    particle.style.cssText = `
      position: fixed;
      width: ${8 + Math.random() * 8}px;
      height: ${8 + Math.random() * 8}px;
      background: ${color};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      left: ${x}px;
      top: ${y}px;
      pointer-events: none;
      z-index: 9999;
    `;
    
    document.body.appendChild(particle);
    
    // 爆炸动画
    const angle = (Math.PI * 2 * i) / particleCount;
    const velocity = 100 + Math.random() * 150;
    const tx = Math.cos(angle) * velocity;
    const ty = Math.sin(angle) * velocity;
    const rotation = Math.random() * 720;
    
    particle.animate([
      { 
        transform: 'translate(0,0) rotate(0deg) scale(1)', 
        opacity: 1 
      },
      { 
        transform: `translate(${tx}px, ${ty}px) rotate(${rotation}deg) scale(0)`, 
        opacity: 0 
      }
    ], {
      duration: 1000 + Math.random() * 500,
      easing: 'cubic-bezier(0, .9, .57, 1)'
    }).onfinish = () => particle.remove();
  }
}
```

### 5.5 悬停效果

```css
/* 可落子位置悬停提示 */
.cell-hover {
  position: relative;
}

.cell-hover::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.3;
  transition: all 0.2s ease;
}

.cell-hover:hover::before {
  width: 28px;
  height: 28px;
  opacity: 0.5;
}
```

### 5.6 动画时长规范

| 动画类型 | 时长 | 缓动函数 |
|---------|------|---------|
| 按钮悬停 | 200ms | ease |
| 落子动画 | 400ms | cubic-bezier(0.34, 1.56, 0.64, 1) |
| 页面过渡 | 300ms | ease-out |
| 弹窗出现 | 300ms | cubic-bezier(0.34, 1.56, 0.64, 1) |
| 胜利脉冲 | 1000ms | ease-in-out |
| 粒子效果 | 1000-1500ms | cubic-bezier(0, .9, .57, 1) |

---

## 6. 布局规范

### 6.1 整体布局结构

```
┌─────────────────────────────────────────────────────────┐
│  🎮 五子棋                    [🔊] [⚙] [⛶]            │  Header (60px)
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────────────────────────┐  │
│  │             │  │                                 │  │
│  │  玩家信息    │  │                                 │  │
│  │  ┌───────┐  │  │                                 │  │
│  │  │ 头像  │  │  │         棋 盘 区 域              │  │
│  │  │ 黑方  │  │  │        (600×600px)              │  │
│  │  │ 步数  │  │  │                                 │  │
│  │  └───────┘  │  │                                 │  │
│  │             │  │                                 │  │
│  │  ┌───────┐  │  │                                 │  │
│  │  │ 头像  │  │  │                                 │  │
│  │  │ 白方  │  │  │                                 │  │
│  │  │ 步数  │  │  │                                 │  │
│  │  └───────┘  │  │                                 │  │
│  │             │  │                                 │  │
│  │  [悔棋]     │  └─────────────────────────────────┘  │
│  │  [重开]     │                                       │
│  │             │                                       │
│  └─────────────┘                                       │
│        240px                   600px                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
              总宽度：~900px (含间距)
```

### 6.2 响应式断点

```typescript
// breakpoints.ts
export const breakpoints = {
  mobile: '768px',      // 手机端
  tablet: '1024px',     // 平板端
  desktop: '1280px',    // 桌面端
  wide: '1536px',       // 宽屏
};

// 响应式布局规则
const responsiveRules = {
  // 手机端 (< 768px)
  mobile: {
    layout: 'vertical',     // 垂直堆叠
    boardSize: '100vw',     // 棋盘全宽
    panelPosition: 'top',   // 信息面板在上方
    showText: false,        // 图标按钮隐藏文字
  },
  
  // 平板端 (768px - 1024px)
  tablet: {
    layout: 'horizontal',
    boardSize: '500px',
    panelPosition: 'left',
    showText: true,
  },
  
  // 桌面端 (> 1024px)
  desktop: {
    layout: 'horizontal',
    boardSize: '600px',
    panelPosition: 'left',
    showText: true,
  },
};
```

### 6.3 间距系统

```css
:root {
  /* 间距变量 */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}
```

### 6.4 字体规范

```css
:root {
  /* 字体族 */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  
  /* 字号 */
  --text-xs: 12px;    /* 辅助文字 */
  --text-sm: 14px;    /* 次要文字 */
  --text-base: 16px;  /* 正文 */
  --text-lg: 18px;    /* 小标题 */
  --text-xl: 20px;    /* 标题 */
  --text-2xl: 24px;   /* 大标题 */
  --text-3xl: 30px;   /* 页面标题 */
  
  /* 字重 */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

---

## 7. 实现优先级

### 7.1 P0 - 必须实现（核心体验）

- [ ] 木纹质感棋盘 + 网格线
- [ ] 立体渐变棋子（黑/白）
- [ ] 落子音效（石头碰撞声）
- [ ] 落子动画（弹性效果）
- [ ] 胜利连线高亮
- [ ] 最后一手标记
- [ ] 悔棋/重新开始功能
- [ ] 响应式布局

### 7.2 P1 - 重要优化（体验提升）

- [ ] 胜利粒子庆祝效果
- [ ] 音效开关控制
- [ ] 按钮悬停/点击反馈
- [ ] 页面过渡动画
- [ ] 可落子位置悬停提示
- [ ] 玩家信息面板

### 7.3 P2 - 锦上添花（差异化）

- [ ] 玻璃态弹窗设计
- [ ] 主题切换（深色模式）
- [ ] 战绩统计面板
- [ ] 排行榜界面
- [ ] 开局动画
- [ ] 连珠提示音效

---

## 8. 参考资源

### 8.1 开源项目

| 项目 | 链接 | 学习点 |
|-----|------|--------|
| ligomoku/gomoku | GitHub | 现代化平台架构 |
| lihongxun945/gobang | GitHub | Canvas绘制技巧 |
| gobang-web | 开源中国 | UI布局参考 |

### 8.2 设计资源

| 资源 | 链接 | 用途 |
|-----|------|------|
| Lucide Icons | lucide.dev | 图标库 |
| Tailwind CSS | tailwindcss.com | 样式框架 |
| Freesound | freesound.org | 音效资源 |

### 8.3 技术文档

- [Canvas API - MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API)
- [Web Audio API - MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Audio_API)
- [CSS Animations - MDN](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Animations)

---

## 附录：CSS 变量完整定义

```css
:root {
  /* 颜色系统 */
  --board-primary: #d4a574;
  --board-secondary: #c49a6c;
  --board-dark: #b8905f;
  --grid-line: #8b6914;
  --piece-black: #1a1a1a;
  --piece-white: #f5f5f5;
  --win-gold: #ffd700;
  --last-move: #e74c3c;
  
  --bg-primary: #f5f0e8;
  --bg-secondary: #faf8f3;
  --text-primary: #2c3e50;
  --text-secondary: #5d6d7e;
  --btn-primary: #3498db;
  --btn-hover: #2980b9;
  --btn-danger: #e74c3c;
  
  --shadow-light: rgba(0,0,0,0.1);
  --shadow-medium: rgba(0,0,0,0.2);
  --shadow-heavy: rgba(0,0,0,0.3);
  --border-light: rgba(0,0,0,0.08);
  
  /* 间距 */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  
  /* 字体 */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 20px;
  
  /* 动画 */
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 200ms;
  --duration-normal: 300ms;
  --duration-slow: 400ms;
}
```

---

*文档结束*
