'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Star, Sparkles, Trophy, X } from 'lucide-react'
import { useSoundContext } from '@/context/SoundContext'
import { createPortal } from 'react-dom'

interface MasterMedalProps {
  showEasterEgg?: boolean
  onEasterEggComplete?: () => void
}

/**
 * 大师勋章组件
 * 展示玩家获得的大师勋章，支持点击触发动画
 */
export function MasterMedal({ showEasterEgg = false, onEasterEggComplete }: MasterMedalProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [mounted, setMounted] = useState(true)
  const { playWin } = useSoundContext()

  const handleClick = () => {
    if (isAnimating) return
    setIsAnimating(true)
    playWin()
    setTimeout(() => setIsAnimating(false), 2000)
  }

  // 使用 Portal 渲染彩蛋弹窗，确保在最顶层
  const easterEggPortal = mounted && showEasterEgg ? (
    createPortal(
      <MasterEasterEgg onComplete={onEasterEggComplete} />,
      document.body
    )
  ) : null

  return (
    <motion.div
      className="relative inline-block cursor-pointer"
      onClick={handleClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* 勋章主体 */}
      <motion.div
        className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF6347 100%)',
          boxShadow: '0 8px 32px rgba(255, 215, 0, 0.4)',
        }}
        animate={isAnimating ? {
          rotate: [0, -10, 10, -10, 10, 0],
          scale: [1, 1.1, 1],
        } : {}}
        transition={{ duration: 0.5 }}
      >
        {/* 外圈光环 */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(135deg, transparent 40%, rgba(255, 255, 255, 0.3) 50%, transparent 60%)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />

        {/* 内圈 */}
        <div
          className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          }}
        >
          <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400" />
        </div>

        {/* 星星装饰 */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              top: `${50 - 50 * Math.cos((i * 72 * Math.PI) / 180)}%`,
              left: `${50 + 50 * Math.sin((i * 72 * Math.PI) / 180)}%`,
              transform: 'translate(-50%, -50%)',
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          >
            <Star className="w-3 h-3 text-yellow-300 fill-yellow-300" />
          </motion.div>
        ))}
      </motion.div>

      {/* 标签 */}
      <motion.div
        className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <span className="text-xs sm:text-sm font-bold text-yellow-400">大师</span>
      </motion.div>

      {/* 点击特效 */}
      <AnimatePresence>
        {isAnimating && <ClickEffect />}
      </AnimatePresence>

      {/* 彩蛋弹窗 - 使用 Portal 渲染到 body */}
      {easterEggPortal}
    </motion.div>
  )
}

// 点击特效
function ClickEffect() {
  return (
    <>
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            top: '50%',
            left: '50%',
          }}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={{
            x: Math.cos((i * 45 * Math.PI) / 180) * 60,
            y: Math.sin((i * 45 * Math.PI) / 180) * 60,
            scale: 0,
            opacity: 0,
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      ))}
    </>
  )
}

// 大师彩蛋弹窗
function MasterEasterEgg({ onComplete }: { onComplete?: () => void }) {
  const { playWin } = useSoundContext()

  // 播放胜利音效
  useEffect(() => {
    playWin()
  }, [])

  // 处理关闭 - 支持点击背景和按钮
  const handleClose = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    e?.preventDefault()
    
    if (onComplete) {
      onComplete()
    }
  }

  // 处理内容区域点击 - 阻止冒泡但不关闭
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/95 touch-manipulation"
      onClick={handleClose}
      style={{ pointerEvents: 'auto' }}
    >
      {/* 简化背景动画 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <SimpleEasterEggBackground />
      </div>

      {/* 关闭按钮 - 放在左上角，增大点击区域 */}
      <button
        onClick={handleClose}
        className="absolute top-4 left-4 p-4 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 transition-colors z-[100] min-w-[48px] min-h-[48px] flex items-center justify-center cursor-pointer"
        aria-label="关闭"
        type="button"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="relative z-10 text-center px-6 py-8 max-w-lg w-full"
        onClick={handleContentClick}
      >
        {/* 主勋章 - 简化动画 */}
        <div className="relative w-28 h-28 sm:w-36 sm:h-36 mx-auto mb-6">
          {/* 发光圈 - CSS动画替代 */}
          <div
            className="absolute inset-[-15px] rounded-full animate-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)',
            }}
          />

          <div
            className="absolute inset-0 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF6347 100%)',
              boxShadow: '0 0 40px rgba(255, 215, 0, 0.6)',
            }}
          >
            <Crown className="w-14 h-14 sm:w-16 sm:h-16 text-white drop-shadow-lg" />
          </div>

          {/* 环绕星星 - 减少到4个 */}
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="absolute w-4 h-4 sm:w-5 sm:h-5 animate-pulse"
              style={{
                top: `${50 - 58 * Math.cos((i * 90 * Math.PI) / 180)}%`,
                left: `${50 + 58 * Math.sin((i * 90 * Math.PI) / 180)}%`,
                transform: 'translate(-50%, -50%)',
                animationDelay: `${i * 0.2}s`,
              }}
            >
              <Star className="w-full h-full text-yellow-300 fill-yellow-300" />
            </div>
          ))}
        </div>

        {/* 标题 */}
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl sm:text-3xl md:text-4xl font-black mb-3"
          style={{
            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF6347 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          大师段位达成!
        </motion.h2>

        {/* 描述 */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-white/80 text-base sm:text-lg mb-6 max-w-sm mx-auto px-4"
        >
          你已经站在了五子棋的巅峰，成为真正的大师！
        </motion.p>

        {/* 成就列表 */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex flex-wrap justify-center gap-3 mb-6"
        >
          {[
            { icon: Trophy, text: '大师勋章' },
            { icon: Crown, text: '专属称号' },
            { icon: Sparkles, text: '特殊特效' },
          ].map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10"
            >
              <item.icon className="w-4 h-4 text-yellow-400" />
              <span className="text-white text-xs sm:text-sm">{item.text}</span>
            </div>
          ))}
        </motion.div>

        {/* 领取奖励按钮 - 增大点击区域 */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
          onClick={handleClose}
          className="px-10 py-4 rounded-full font-bold text-white text-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 active:from-yellow-600 active:to-orange-600 transition-all min-w-[160px] min-h-[56px] cursor-pointer"
          type="button"
        >
          领取奖励
        </motion.button>

        {/* 提示文字 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-4 text-white/40 text-sm"
        >
          点击任意位置关闭
        </motion.p>
      </motion.div>
    </motion.div>
  )
}

// 简化的彩蛋背景动画 - 性能优化版
function SimpleEasterEggBackground() {
  return (
    <>
      {/* 静态渐变背景 */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at center, rgba(255,215,0,0.1) 0%, transparent 50%)',
        }}
      />

      {/* 少量粒子 - 仅10个 */}
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full animate-ping"
          style={{
            background: ['#FFD700', '#FFA500'][i % 2],
            left: `${20 + (i * 8)}%`,
            top: `${30 + (i * 6)}%`,
            animationDelay: `${i * 0.3}s`,
            animationDuration: '2s',
          }}
        />
      ))}

      {/* 单个扩散光环 - CSS动画 */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow-500/30 animate-ping"
        style={{
          width: 300,
          height: 300,
          animationDuration: '3s',
        }}
      />
    </>
  )
}

// 小型大师徽章（用于列表展示）
export function MasterBadgeSmall() {
  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
      style={{
        background: 'linear-gradient(135deg, #FFD70020 0%, #FFA50020 100%)',
        border: '1px solid rgba(255, 215, 0, 0.3)',
        color: '#FFD700',
      }}
    >
      <Crown className="w-3 h-3" />
      <span>大师</span>
    </div>
  )
}
