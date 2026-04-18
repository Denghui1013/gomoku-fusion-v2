'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { cn, buttonStyles, cardStyles, textStyles } from '@/lib/styles'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  onReset?: () => void
  componentName?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * 错误边界组件
 * 用于捕获子组件树中的 JavaScript 错误，并显示备用 UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误信息
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo,
    })

    // 调用外部错误处理回调
    this.props.onError?.(error, errorInfo)

    // 自动处理前端代码分片更新导致的 ChunkLoadError（通常是缓存旧资源）
    const message = `${error?.name ?? ''} ${error?.message ?? ''}`
    const isChunkLoadError =
      message.includes('ChunkLoadError') ||
      message.includes('Loading chunk') ||
      message.includes('Failed to fetch dynamically imported module')

    if (typeof window !== 'undefined' && isChunkLoadError) {
      const reloadKey = 'gomoku:auto-reload-on-chunk-error'
      const hasReloaded = window.sessionStorage.getItem(reloadKey) === '1'
      if (!hasReloaded) {
        window.sessionStorage.setItem(reloadKey, '1')
        window.location.reload()
        return
      }
      window.sessionStorage.removeItem(reloadKey)
    }

    // 可以在这里发送错误到监控服务
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo)
    }
  }

  private reportError(error: Error, errorInfo: ErrorInfo) {
    // 这里可以集成错误监控服务，如 Sentry、LogRocket 等
    const errorData = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
      componentName: this.props.componentName,
    }

    // 发送到监控服务
    console.log('Reporting error:', errorData)
    
    // 示例：发送到自定义端点
    // fetch('/api/error-report', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorData),
    // }).catch(console.error)
  }

  private handleReset = () => {
    this.props.onReset?.()
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    const { hasError, error, errorInfo } = this.state
    const { children, fallback, componentName } = this.props

    if (hasError) {
      // 如果提供了自定义 fallback，使用它
      if (fallback) {
        return fallback
      }

      // 默认错误 UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className={cardStyles({ padding: 'lg', shadow: 'lg', className: 'max-w-lg w-full' })}>
            {/* 错误图标 */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>

            {/* 错误标题 */}
            <h2 className={textStyles({ size: 'xl', weight: 'bold', align: 'center', className: 'mb-2' })}>
              出错了
            </h2>

            {/* 错误描述 */}
            <p className={textStyles({ size: 'sm', color: 'muted', align: 'center', className: 'mb-6' })}>
              {componentName ? `${componentName} 组件` : '页面'}加载时发生错误
            </p>

            {/* 错误详情（仅在开发环境显示） */}
            {process.env.NODE_ENV === 'development' && error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg overflow-auto">
                <p className={cn(textStyles({ size: 'sm', weight: 'semibold', className: 'mb-2' }), 'text-red-600')}>
                  错误信息：
                </p>
                <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap break-all">
                  {error.message}
                </pre>
                {errorInfo && (
                  <>
                    <p className={cn(textStyles({ size: 'sm', weight: 'semibold', className: 'mt-4 mb-2' }), 'text-red-600')}>
                      组件堆栈：
                    </p>
                    <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className={buttonStyles({ variant: 'primary', size: 'md' })}
              >
                <RefreshCw className="w-4 h-4" />
                重试
              </button>
              <button
                onClick={this.handleReload}
                className={buttonStyles({ variant: 'secondary', size: 'md' })}
              >
                <RefreshCw className="w-4 h-4" />
                刷新页面
              </button>
              <button
                onClick={this.handleGoHome}
                className={buttonStyles({ variant: 'cta', size: 'md' })}
              >
                <Home className="w-4 h-4" />
                返回首页
              </button>
            </div>
          </div>
        </div>
      )
    }

    return children
  }
}

/**
 * 异步错误边界 Hook
 * 用于包装异步操作中的错误处理
 */
export function useErrorHandler() {
  const handleError = React.useCallback((error: Error, context?: string) => {
    console.error(`Error${context ? ` in ${context}` : ''}:`, error)
    
    // 可以在这里集成错误监控
    if (process.env.NODE_ENV === 'production') {
      // 发送到监控服务
    }
  }, [])

  return { handleError }
}

/**
 * 小型错误边界 - 用于局部组件
 */
export function SmallErrorBoundary({ 
  children, 
  onReset 
}: { 
  children: ReactNode
  onReset?: () => void 
}) {
  return (
    <ErrorBoundary
      onReset={onReset}
      fallback={
        <div className="p-4 text-center">
          <p className="text-sm text-red-500 mb-2">组件加载失败</p>
          <button
            onClick={onReset}
            className="text-sm text-sky-600 hover:text-sky-700 underline"
          >
            点击重试
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

export default ErrorBoundary
