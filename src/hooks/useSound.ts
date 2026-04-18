'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface SoundOptions {
  volume?: number
  duration?: number
  type?: 'sine' | 'square' | 'sawtooth' | 'triangle'
}

const DEFAULT_OPTIONS: SoundOptions = {
  volume: 0.25,
  duration: 0.18,
  type: 'sine',
}

type CueName = 'tap' | 'toggle' | 'placePrimary' | 'placeSoft' | 'win' | 'defeat' | 'hint' | 'friendJoin'

const CUE_MAP: Record<CueName, string> = {
  tap: '/audio/gomoku/ui-tap.ogg',
  toggle: '/audio/gomoku/ui-toggle.ogg',
  placePrimary: '/audio/gomoku/place-stone-primary.ogg',
  placeSoft: '/audio/gomoku/place-stone-soft.ogg',
  win: '/audio/gomoku/rank-up.ogg',
  defeat: '/audio/gomoku/defeat.ogg',
  hint: '/audio/gomoku/hint.ogg',
  friendJoin: '/audio/gomoku/friend-join.ogg',
}

export function useSound() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioCacheRef = useRef<Partial<Record<CueName, HTMLAudioElement>>>({})
  const placeVariantRef = useRef(0)
  const placePlayedAtRef = useRef(0)
  const [isEnabled, setIsEnabled] = useState(true)
  const isEnabledRef = useRef(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (typeof Ctor !== 'function') {
      audioContextRef.current = null
      return
    }
    audioContextRef.current = new Ctor()
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close?.()
      }
    }
  }, [])

  useEffect(() => {
    isEnabledRef.current = isEnabled
  }, [isEnabled])

  const playSound = useCallback((frequency: number, options?: SoundOptions, force = false) => {
    if ((!force && !isEnabledRef.current) || !audioContextRef.current) return

    const ctx = audioContextRef.current
    const opts = { ...DEFAULT_OPTIONS, ...options }

    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.type = opts.type!
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

    gainNode.gain.setValueAtTime(opts.volume!, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + opts.duration!)

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + opts.duration!)
  }, [])

  const playCue = useCallback(
    (
      cue: CueName,
      options?: { volume?: number; playbackRate?: number },
      fallback?: () => void
    ) => {
      if (!isEnabledRef.current || typeof window === 'undefined') return
      const src = CUE_MAP[cue]
      if (!src) {
        fallback?.()
        return
      }

      let base = audioCacheRef.current[cue]
      const abs = new URL(src, window.location.origin).href
      if (!base || base.src !== abs) {
        base = new Audio(src)
        base.preload = 'auto'
        audioCacheRef.current[cue] = base
      }

      const player = base.cloneNode() as HTMLAudioElement
      player.volume = options?.volume ?? 0.8
      player.playbackRate = options?.playbackRate ?? 1
      void player.play().catch(() => fallback?.())
    },
    []
  )

  const playClick = useCallback(() => {
    playCue('tap', { volume: 0.5 }, () => {
      playSound(780, { duration: 0.08, volume: 0.16 })
    })
  }, [playCue, playSound])

  const playPlace = useCallback(() => {
    const now = Date.now()
    if (now - placePlayedAtRef.current < 40) return
    placePlayedAtRef.current = now

    const cue = placeVariantRef.current % 2 === 0 ? 'placePrimary' : 'placeSoft'
    placeVariantRef.current += 1
    playCue(cue, { volume: cue === 'placePrimary' ? 0.88 : 0.78 }, () => {
      playSound(430, { duration: 0.12, volume: 0.18, type: 'triangle' })
      setTimeout(() => playSound(620, { duration: 0.08, volume: 0.12, type: 'sine' }), 35)
    })
  }, [playCue, playSound])

  const playWin = useCallback(() => {
    playCue('win', { volume: 0.84, playbackRate: 1.03 }, () => {
      ;[523, 659, 784, 1047].forEach((freq, i) => {
        setTimeout(() => playSound(freq, { duration: 0.18, volume: 0.22, type: 'triangle' }), i * 110)
      })
    })
  }, [playCue, playSound])

  const playLose = useCallback(() => {
    playCue('defeat', { volume: 0.76 }, () => {
      ;[392, 330, 262].forEach((freq, i) => {
        setTimeout(() => playSound(freq, { duration: 0.26, volume: 0.2, type: 'triangle' }), i * 140)
      })
    })
  }, [playCue, playSound])

  const playVictory = useCallback(() => {
    playCue('win', { volume: 0.42, playbackRate: 1.1 })
    setTimeout(() => playCue('placeSoft', { volume: 0.28, playbackRate: 0.92 }), 36)

    const melody = [
      { t: 0, f: 392, v: 0.1, d: 0.09, type: 'triangle' as const },
      { t: 86, f: 523, v: 0.14, d: 0.13, type: 'triangle' as const },
      { t: 172, f: 659, v: 0.13, d: 0.14, type: 'sine' as const },
      { t: 258, f: 784, v: 0.12, d: 0.18, type: 'sine' as const },
    ]

    melody.forEach((note) => {
      setTimeout(() => {
        playSound(note.f, { duration: note.d, volume: note.v, type: note.type })
      }, note.t)
    })

    ;[1047, 1319, 1568].forEach((freq, index) => {
      setTimeout(() => {
        playSound(freq, {
          duration: 0.38,
          volume: index === 0 ? 0.085 : 0.055,
          type: 'sine',
        })
      }, 330 + index * 18)
    })

    setTimeout(() => playSound(2093, { duration: 0.08, volume: 0.045, type: 'triangle' }), 520)
  }, [playCue, playSound])

  const playDefeat = useCallback(() => {
    playLose()
  }, [playLose])

  const playError = useCallback(() => {
    playCue('hint', { volume: 0.58, playbackRate: 0.92 }, () => {
      playSound(210, { duration: 0.14, volume: 0.18, type: 'square' })
    })
  }, [playCue, playSound])

  const playNav = useCallback(() => {
    playCue('toggle', { volume: 0.44 }, () => {
      playSound(620, { duration: 0.07, volume: 0.12, type: 'sine' })
    })
  }, [playCue, playSound])

  const playBack = useCallback(() => {
    playCue('toggle', { volume: 0.42, playbackRate: 0.94 }, () => {
      playSound(560, { duration: 0.08, volume: 0.12, type: 'triangle' })
      setTimeout(() => playSound(460, { duration: 0.07, volume: 0.08, type: 'sine' }), 22)
    })
  }, [playCue, playSound])

  const playClose = useCallback(() => {
    playCue('tap', { volume: 0.28, playbackRate: 0.96 }, () => {
      playSound(540, { duration: 0.06, volume: 0.08, type: 'triangle' })
      setTimeout(() => playSound(420, { duration: 0.05, volume: 0.06, type: 'sine' }), 18)
    })
  }, [playCue, playSound])

  const playCollapse = useCallback(() => {
    playCue('toggle', { volume: 0.32, playbackRate: 0.9 }, () => {
      playSound(520, { duration: 0.08, volume: 0.09, type: 'triangle' })
      setTimeout(() => playSound(380, { duration: 0.08, volume: 0.065, type: 'sine' }), 26)
    })
  }, [playCue, playSound])

  const playConfirm = useCallback(() => {
    playCue('tap', { volume: 0.42, playbackRate: 1.04 }, () => {
      playSound(700, { duration: 0.07, volume: 0.11, type: 'triangle' })
      setTimeout(() => playSound(860, { duration: 0.06, volume: 0.08, type: 'sine' }), 24)
    })
  }, [playCue, playSound])

  const playAccept = useCallback(() => {
    playCue('toggle', { volume: 0.4, playbackRate: 1.12 }, () => {
      playSound(740, { duration: 0.08, volume: 0.12, type: 'triangle' })
      setTimeout(() => playSound(980, { duration: 0.08, volume: 0.1, type: 'sine' }), 28)
      setTimeout(() => playSound(1240, { duration: 0.08, volume: 0.08, type: 'sine' }), 58)
    })
  }, [playCue, playSound])

  const playDangerConfirm = useCallback(() => {
    playCue('hint', { volume: 0.5, playbackRate: 0.86 }, () => {
      playSound(260, { duration: 0.11, volume: 0.16, type: 'square' })
      setTimeout(() => playSound(220, { duration: 0.13, volume: 0.11, type: 'triangle' }), 36)
    })
  }, [playCue, playSound])

  const playSuccess = useCallback(() => {
    playCue('placeSoft', { volume: 0.32, playbackRate: 1.14 }, () => {
      playSound(720, { duration: 0.07, volume: 0.1, type: 'triangle' })
      setTimeout(() => playSound(940, { duration: 0.08, volume: 0.09, type: 'sine' }), 26)
      setTimeout(() => playSound(1180, { duration: 0.07, volume: 0.06, type: 'sine' }), 54)
    })
  }, [playCue, playSound])

  const playWarning = useCallback(() => {
    playCue('hint', { volume: 0.34, playbackRate: 1.02 }, () => {
      playSound(420, { duration: 0.08, volume: 0.11, type: 'triangle' })
      setTimeout(() => playSound(360, { duration: 0.07, volume: 0.08, type: 'sine' }), 34)
    })
  }, [playCue, playSound])

  const playPick = useCallback(() => {
    playCue('toggle', { volume: 0.32, playbackRate: 1.24 }, () => {
      playSound(920, { duration: 0.06, volume: 0.1, type: 'sine' })
      setTimeout(() => playSound(1120, { duration: 0.05, volume: 0.07, type: 'triangle' }), 24)
    })
  }, [playCue, playSound])

  const playDifficultyPick = useCallback(() => {
    playCue('toggle', { volume: 0.3, playbackRate: 1.28 }, () => {
      playSound(980, { duration: 0.06, volume: 0.095, type: 'sine' })
      setTimeout(() => playSound(1180, { duration: 0.045, volume: 0.065, type: 'triangle' }), 20)
    })
  }, [playCue, playSound])

  const playSidePick = useCallback(() => {
    playCue('toggle', { volume: 0.36, playbackRate: 1.08 }, () => {
      playSound(760, { duration: 0.08, volume: 0.12, type: 'triangle' })
      setTimeout(() => playSound(920, { duration: 0.055, volume: 0.085, type: 'sine' }), 26)
    })
  }, [playCue, playSound])

  return {
    playClick,
    playPlace,
    playWin,
    playLose,
    playVictory,
    playDefeat,
    playError,
    playNav,
    playBack,
    playClose,
    playCollapse,
    playConfirm,
    playAccept,
    playDangerConfirm,
    playSuccess,
    playWarning,
    playPick,
    playDifficultyPick,
    playSidePick,
    isEnabled,
    setIsEnabled,
  }
}
