'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextValue {
  addToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void
}

let toastId = 0
let toastContext: ToastContextValue | null = null

export function setToastContext(context: ToastContextValue | null) {
  toastContext = context
}

export function toast(type: ToastType, message: string, duration = 3000) {
  if (toastContext) {
    toastContext.addToast(type, message, duration)
  }
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'var(--state-success-bg)',
    iconColor: 'var(--state-success-text)',
    borderColor: 'var(--state-success-border)',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'var(--state-danger-bg)',
    iconColor: 'var(--state-danger-text)',
    borderColor: 'var(--state-danger-border)',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'var(--state-warning-bg)',
    iconColor: 'var(--state-warning-text)',
    borderColor: 'var(--state-warning-border)',
  },
  info: {
    icon: Info,
    bgColor: 'var(--state-info-bg)',
    iconColor: 'var(--state-info-text)',
    borderColor: 'var(--state-info-border)',
  },
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const config = toastConfig[toast.type]
  const Icon = config.icon

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onRemove(toast.id)
      }, toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, onRemove])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      drag="x"
      dragConstraints={{ left: 0, right: 100 }}
      dragElastic={0.2}
      onDragEnd={(_, info) => {
        if (info.offset.x > 50) {
          onRemove(toast.id)
        }
      }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="flex items-center gap-3 px-4 py-3 min-w-[280px] max-w-md shadow-lg cursor-grab active:cursor-grabbing touch-pan-y border backdrop-blur-sm"
      style={{
        background: config.bgColor,
        color: 'var(--text-primary)',
        borderColor: config.borderColor,
        borderRadius: 'var(--radius-md)',
      }}
    >
      <Icon className="w-5 h-5 flex-shrink-0" style={{ color: config.iconColor }} />
      <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors cursor-pointer"
        style={{ background: 'color-mix(in srgb, var(--card-bg) 70%, transparent)' }}
        aria-label="关闭提示"
      >
        <X className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
      </button>
    </motion.div>
  )
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    let isActive = true
    
    setToastContext({
      addToast: (type, message, duration) => {
        if (!isActive) return
        setToasts((prev) => {
          const same = prev.find((t) => t.type === type && t.message === message)
          if (same) return prev
          const id = `toast-${++toastId}`
          return [...prev, { id, type, message, duration }]
        })
      },
      removeToast: (id) => {
        if (!isActive) return
        setToasts((prev) => prev.filter((t) => t.id !== id))
      },
    })

    return () => {
      isActive = false
      setToastContext(null)
    }
  }, [])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[90%] max-w-md sm:w-auto sm:max-w-none sm:top-4 sm:bottom-auto sm:right-4 sm:left-auto sm:translate-x-0"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
