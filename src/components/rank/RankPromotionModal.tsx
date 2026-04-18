'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star, Trophy, Sparkles, Crown, Gem } from 'lucide-react'
import type { RankPromotionEvent, RankReward } from '@/types'
import { getTierConfig } from '@/lib/rankSystem'
import { useSoundContext } from '@/context/SoundContext'

interface RankPromotionModalProps {
  isOpen: boolean
  promotionEvent: RankPromotionEvent | null
  onClose: () => void
  autoCloseDelay?: number
}

export function RankPromotionModal({
  isOpen,
  promotionEvent,
  onClose,
  autoCloseDelay = 8000,
}: RankPromotionModalProps) {
  const { playWin } = useSoundContext()
  const [closeIn, setCloseIn] = useState(Math.ceil(autoCloseDelay / 1000))
  const closeTimerRef = useRef<number | null>(null)
  const countdownTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isOpen || !promotionEvent) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
      if (countdownTimerRef.current) {
        window.clearInterval(countdownTimerRef.current)
        countdownTimerRef.current = null
      }
      return
    }

    playWin()
    setCloseIn(Math.ceil(autoCloseDelay / 1000))

    closeTimerRef.current = window.setTimeout(() => {
      onClose()
    }, autoCloseDelay)

    countdownTimerRef.current = window.setInterval(() => {
      setCloseIn((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
      if (countdownTimerRef.current) {
        window.clearInterval(countdownTimerRef.current)
        countdownTimerRef.current = null
      }
    }
  }, [autoCloseDelay, isOpen, onClose, playWin, promotionEvent])

  if (!promotionEvent) return null

  const fromConfig = getTierConfig(promotionEvent.fromTier)
  const toConfig = getTierConfig(promotionEvent.toTier)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <SparklesBackground />
          </div>

          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
              style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                boxShadow: `0 0 60px ${toConfig.color}40, 0 25px 50px -12px rgba(0, 0, 0, 0.5)`,
              }}
            >
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  background: `linear-gradient(135deg, ${toConfig.color}20 0%, transparent 50%, ${toConfig.color}20 100%)`,
                  padding: '2px',
                  mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  maskComposite: 'xor',
                  WebkitMaskComposite: 'xor',
                }}
              />

              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
                aria-label="关闭段位提升弹窗"
              >
                <X className="w-5 h-5 text-white/70" />
              </button>

              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-6"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                  <span className="text-yellow-400 font-bold text-lg">段位提升!</span>
                  <Trophy className="w-6 h-6 text-yellow-400" />
                </div>
                <p className="text-white/60 text-sm">恭喜你达到了新的高度</p>
              </motion.div>

              <div className="flex items-center justify-center gap-4 mb-8">
                <motion.div
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 0.5 }}
                  transition={{ delay: 0.3 }}
                  className="text-center"
                >
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-2"
                    style={{
                      background: fromConfig.gradient,
                      boxShadow: `0 8px 32px ${fromConfig.color}30`,
                      filter: 'grayscale(0.5)',
                    }}
                  >
                    {fromConfig.icon}
                  </div>
                  <p className="text-white/50 text-sm font-medium">{fromConfig.name}</p>
                </motion.div>

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ x: 30, opacity: 0, scale: 0.8 }}
                  animate={{ x: 0, opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring' }}
                  className="text-center"
                >
                  <motion.div
                    animate={{
                      boxShadow: [
                        `0 8px 32px ${toConfig.color}40`,
                        `0 8px 48px ${toConfig.color}60`,
                        `0 8px 32px ${toConfig.color}40`,
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl mb-2"
                    style={{ background: toConfig.gradient }}
                  >
                    {toConfig.icon}
                  </motion.div>
                  <p className="text-white font-bold text-lg">{toConfig.name}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-yellow-400 text-sm">x{promotionEvent.newStars}</span>
                  </div>
                </motion.div>
              </div>

              {promotionEvent.rewards.length > 0 && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mb-6"
                >
                  <p className="text-white/80 text-sm font-medium mb-3 text-center">获得奖励</p>
                  <div className="space-y-2">
                    {promotionEvent.rewards.map((reward, index) => (
                      <RewardItem key={index} reward={reward} delay={0.7 + index * 0.1} />
                    ))}
                  </div>
                </motion.div>
              )}

              {promotionEvent.isMasterTier && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8, type: 'spring' }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30"
                >
                  <Crown className="w-5 h-5 text-purple-400" />
                  <span className="text-purple-300 font-medium">大师段位达成!</span>
                  <Crown className="w-5 h-5 text-purple-400" />
                </motion.div>
              )}

              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1 }}
                onClick={onClose}
                className="w-full mt-6 py-3 px-6 rounded-xl font-bold text-white transition-all hover:scale-105 active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${toConfig.color} 0%, ${toConfig.color}dd 100%)`,
                  boxShadow: `0 8px 32px ${toConfig.color}40`,
                }}
              >
                继续挑战
              </motion.button>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="text-center text-white/40 text-xs mt-4"
              >
                {closeIn > 0 ? `${closeIn} 秒后自动关闭` : '即将关闭'}
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function RewardItem({ reward, delay }: { reward: RankReward; delay: number }) {
  const icons: Record<string, React.ElementType> = {
    title: Trophy,
    avatar: Gem,
    theme: Sparkles,
    special: Crown,
    effect: Sparkles,
  }

  const Icon = icons[reward.type] || Sparkles

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay }}
      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
    >
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400/20 to-orange-500/20 flex items-center justify-center text-xl">
        {reward.icon}
      </div>
      <div className="flex-1">
        <p className="text-white font-medium text-sm">{reward.name}</p>
        <p className="text-white/50 text-xs">{reward.description}</p>
      </div>
      <Icon className="w-5 h-5 text-yellow-400" />
    </motion.div>
  )
}

function SparklesBackground() {
  const configs = [
    { x: 100, y: 200, duration: 3, delay: 0.5 },
    { x: 300, y: 150, duration: 2.5, delay: 1 },
    { x: 500, y: 400, duration: 3.2, delay: 0.8 },
    { x: 200, y: 500, duration: 2.8, delay: 1.2 },
    { x: 600, y: 300, duration: 3.5, delay: 0.3 },
    { x: 400, y: 100, duration: 2.2, delay: 1.5 },
    { x: 150, y: 350, duration: 3.1, delay: 0.7 },
    { x: 350, y: 450, duration: 2.7, delay: 1.1 },
    { x: 550, y: 250, duration: 3.3, delay: 0.9 },
    { x: 250, y: 550, duration: 2.4, delay: 1.3 },
    { x: 450, y: 350, duration: 3.4, delay: 0.4 },
    { x: 650, y: 150, duration: 2.6, delay: 1.4 },
    { x: 50, y: 400, duration: 3.0, delay: 0.6 },
    { x: 550, y: 50, duration: 2.9, delay: 1.0 },
    { x: 150, y: 250, duration: 3.6, delay: 0.2 },
    { x: 350, y: 550, duration: 2.3, delay: 1.6 },
    { x: 650, y: 350, duration: 2.5, delay: 0.8 },
    { x: 50, y: 150, duration: 3.1, delay: 1.2 },
    { x: 250, y: 50, duration: 3.2, delay: 0.4 },
    { x: 550, y: 500, duration: 2.7, delay: 1.1 },
  ]

  return (
    <>
      {configs.map((config, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full"
          initial={{
            x: config.x,
            y: config.y,
            scale: 0,
            opacity: 0,
          }}
          animate={{
            y: [null, config.y - 500],
            scale: [0, 1, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: config.duration,
            repeat: Infinity,
            delay: config.delay,
          }}
        />
      ))}
    </>
  )
}
