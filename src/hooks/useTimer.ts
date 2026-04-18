'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

type TimerDirection = 'up' | 'down'

interface UseTimerOptions {
  direction?: TimerDirection
  initialSeconds?: number
  onExpire?: () => void
}

export function useTimer(options: UseTimerOptions = {}) {
  const { direction = 'up', initialSeconds = 0, onExpire } = options
  const [time, setTime] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(false)
  const onExpireRef = useRef<(() => void) | undefined>(onExpire)
  
  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])
  
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isRunning) {
      interval = setInterval(() => {
        setTime(t => {
          if (direction === 'up') return t + 1
          if (t <= 0) return 0
          const next = t - 1
          if (next <= 0) {
            setIsRunning(false)
            onExpireRef.current?.()
            return 0
          }
          return next
        })
      }, 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, direction])
  
  const start = useCallback(() => {
    setIsRunning(true)
  }, [])
  
  const pause = useCallback(() => {
    setIsRunning(false)
  }, [])
  
  const reset = useCallback(() => {
    setIsRunning(false)
    setTime(initialSeconds)
  }, [initialSeconds])
  
  const resetTo = useCallback((seconds: number) => {
    setIsRunning(false)
    setTime(seconds)
  }, [])
  
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])
  
  return {
    time,
    formattedTime: formatTime(time),
    isRunning,
    start,
    pause,
    reset,
    resetTo,
    formatTime
  }
}
