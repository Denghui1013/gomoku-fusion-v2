'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useSound } from '@/hooks/useSound'

type SoundContextType = ReturnType<typeof useSound>

const SoundContext = createContext<SoundContextType | undefined>(undefined)

interface SoundProviderProps {
  children: ReactNode
}

export function SoundProvider({ children }: SoundProviderProps) {
  const sound = useSound()
  
  return (
    <SoundContext.Provider value={sound}>
      {children}
    </SoundContext.Provider>
  )
}

export function useSoundContext() {
  const context = useContext(SoundContext)
  if (!context) {
    throw new Error('useSoundContext must be used within a SoundProvider')
  }
  return context
}

export type { SoundContextType }
