'use client'

import { useEffect, useId, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
}

export function Dialog({ open, onOpenChange, title, description, children }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusedRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!open) return

    previousFocusedRef.current = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'

    const root = dialogRef.current
    const focusables = root?.querySelectorAll<HTMLElement>(
      'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
    )

    if (focusables && focusables.length > 0) {
      focusables[0].focus()
    } else {
      root?.focus()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false)
        return
      }

      if (event.key !== 'Tab') return

      const nodes = root?.querySelectorAll<HTMLElement>(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
      )
      if (!nodes || nodes.length === 0) return

      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
        return
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previousFocusedRef.current?.focus()
    }
  }, [open, onOpenChange])
  
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50"
            onClick={() => onOpenChange(false)}
            aria-hidden="true"
          />
          
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
          >
            <div className="game-panel p-6 m-4 max-h-[calc(100vh-2rem)] overflow-auto">
              <div className="flex items-start justify-between mb-4">
                <h2 id={titleId} className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {title}
                </h2>
                <button
                  onClick={() => onOpenChange(false)}
                  className="game-btn game-btn-secondary p-2 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                  style={{ color: 'var(--text-tertiary)', borderRadius: 'var(--radius-sm)', minWidth: '44px' }}
                  aria-label="关闭对话框"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {description && (
                <p id={descriptionId} className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                  {description}
                </p>
              )}
              
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'
  className?: string
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}

export function Button({ variant = 'primary', className, children, onClick, disabled, style }: ButtonProps & { style?: React.CSSProperties }) {
  const getButtonStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      borderRadius: '14px',
      transition: 'var(--transition-fast)',
      minHeight: '44px',
    }
    
    if (variant === 'primary') {
      return { ...baseStyle, background: 'var(--primary)', color: '#ffffff' }
    }
    if (variant === 'secondary') {
      return { ...baseStyle, background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }
    }
    if (variant === 'danger') {
      return { ...baseStyle, background: '#EF4444', color: '#ffffff' }
    }
    return baseStyle
  }

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] font-medium cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
      style={{ ...getButtonStyle(), ...style }}
    >
      {children}
    </motion.button>
  )
}
