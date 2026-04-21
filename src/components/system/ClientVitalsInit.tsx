'use client'

import { useEffect } from 'react'
import { initPerformanceMonitoring } from '@/lib/vitals'

export default function ClientVitalsInit() {
  useEffect(() => {
    initPerformanceMonitoring()
  }, [])

  return null
}

