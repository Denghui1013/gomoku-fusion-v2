/**
 * Web Vitals 性能监控
 * 用于收集和报告 Core Web Vitals 指标
 */

import type { NextWebVitalsMetric } from 'next/app'

// 性能指标类型
export type WebVitalMetric = {
  id: string
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta?: number
  entries?: PerformanceEntry[]
}

// Core Web Vitals 阈值
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
}

/**
 * 获取性能评级
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS]
  if (!threshold) return 'good'
  
  if (value <= threshold.good) return 'good'
  if (value <= threshold.poor) return 'needs-improvement'
  return 'poor'
}

/**
 * 格式化性能指标
 */
function formatMetric(metric: NextWebVitalsMetric): WebVitalMetric {
  const formatted: WebVitalMetric = {
    id: metric.id,
    name: metric.name,
    value: metric.value,
    rating: getRating(metric.name, metric.value),
  }
  
  // 可选属性
  if ('delta' in metric) {
    formatted.delta = metric.delta
  }
  if ('entries' in metric) {
    formatted.entries = metric.entries
  }
  
  return formatted
}

/**
 * 发送性能指标到分析服务
 */
function sendToAnalytics(metric: WebVitalMetric) {
  // 开发环境打印到控制台
  if (process.env.NODE_ENV === 'development') {
    const styles = {
      good: 'color: green; font-weight: bold',
      'needs-improvement': 'color: orange; font-weight: bold',
      poor: 'color: red; font-weight: bold',
    }
    
    console.log(
      `%c[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`,
      styles[metric.rating]
    )
  }

  // 生产环境发送到分析服务
  if (process.env.NODE_ENV === 'production') {
    // 发送到 Google Analytics
    if (typeof window !== 'undefined' && 'gtag' in window) {
      const gtag = window.gtag as (command: string, eventName: string, params: object) => void
      gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.value),
        event_label: metric.id,
        non_interaction: true,
      })
    }

    // 发送到自定义端点
    sendToCustomEndpoint(metric)
  }
}

/**
 * 发送到自定义监控端点
 */
function sendToCustomEndpoint(metric: WebVitalMetric) {
  const data = {
    ...metric,
    url: typeof window !== 'undefined' ? window.location.href : '',
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
  }

  // 使用 sendBeacon API 发送数据
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon('/api/vitals', JSON.stringify(data))
  } else {
    // 降级方案：使用 fetch
    fetch('/api/vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      keepalive: true,
    }).catch(console.error)
  }
}

/**
 * 报告 Web Vitals 指标
 * 这个函数会被 Next.js 自动调用
 */
export function reportWebVitals(metric: NextWebVitalsMetric) {
  const formattedMetric = formatMetric(metric)
  sendToAnalytics(formattedMetric)
}

/**
 * 手动测量自定义性能指标
 */
export function measurePerformance(
  name: string,
  startMark?: string,
  endMark?: string
): number | null {
  if (typeof window === 'undefined' || !window.performance) {
    return null
  }

  try {
    if (startMark && endMark) {
      // 测量两个标记之间的时间
      performance.mark(startMark)
      performance.mark(endMark)
      performance.measure(name, startMark, endMark)
    }

    const entries = performance.getEntriesByName(name, 'measure')
    if (entries.length > 0) {
      const duration = entries[entries.length - 1].duration
      
      // 报告自定义指标
      const metric: WebVitalMetric = {
        id: `${name}-${Date.now()}`,
        name: `Custom-${name}`,
        value: duration,
        rating: 'good',
      }
      
      sendToAnalytics(metric)
      return duration
    }
  } catch (error) {
    console.error('Error measuring performance:', error)
  }

  return null
}

/**
 * 标记性能时间点
 */
export function markPerformance(label: string) {
  if (typeof window !== 'undefined' && window.performance) {
    performance.mark(label)
  }
}

/**
 * 测量组件渲染性能
 */
export function measureComponentPerformance(componentName: string) {
  const startMark = `${componentName}-start`
  const endMark = `${componentName}-end`

  return {
    start: () => markPerformance(startMark),
    end: () => {
      markPerformance(endMark)
      return measurePerformance(`${componentName}-render`, startMark, endMark)
    },
  }
}

/**
 * 性能监控 Hook
 */
export function usePerformanceMonitor(componentName: string) {
  if (process.env.NODE_ENV === 'development') {
    const measure = measureComponentPerformance(componentName)
    measure.start()
    
    // 使用 requestAnimationFrame 确保在渲染完成后测量
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        measure.end()
      })
    })
  }
}

/**
 * 长任务监控
 */
export function observeLongTasks() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const longTask = entry as PerformanceEntry & { duration: number }
        
        if (longTask.duration > 50) {
          console.warn(`[Long Task] Duration: ${longTask.duration}ms`, longTask)
          
          // 报告长任务
          const metric: WebVitalMetric = {
            id: `longtask-${Date.now()}`,
            name: 'LongTask',
            value: longTask.duration,
            rating: longTask.duration > 100 ? 'poor' : 'needs-improvement',
          }
          
          sendToAnalytics(metric)
        }
      }
    })

    observer.observe({ entryTypes: ['longtask'] })
  } catch (error) {
    console.error('Error observing long tasks:', error)
  }
}

/**
 * 布局偏移监控
 */
export function observeLayoutShifts() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return
  }

  let cumulativeLayoutShift = 0

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }
        
        if (!layoutShift.hadRecentInput) {
          cumulativeLayoutShift += layoutShift.value
        }
      }
    })

    observer.observe({ entryTypes: ['layout-shift'] })

    // 页面卸载时报告最终的 CLS
    window.addEventListener('beforeunload', () => {
      const metric: WebVitalMetric = {
        id: `cls-${Date.now()}`,
        name: 'CLS-Final',
        value: cumulativeLayoutShift,
        rating: getRating('CLS', cumulativeLayoutShift),
      }
      
      sendToAnalytics(metric)
    })
  } catch (error) {
    console.error('Error observing layout shifts:', error)
  }
}

/**
 * 资源加载监控
 */
export function observeResourceLoading() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resource = entry as PerformanceResourceTiming
        
        // 只监控慢速资源
        if (resource.duration > 1000) {
          console.warn(`[Slow Resource] ${resource.name}: ${resource.duration}ms`)
          
          const metric: WebVitalMetric = {
            id: `resource-${Date.now()}`,
            name: 'SlowResource',
            value: resource.duration,
            rating: resource.duration > 3000 ? 'poor' : 'needs-improvement',
          }
          
          sendToAnalytics(metric)
        }
      }
    })

    observer.observe({ entryTypes: ['resource'] })
  } catch (error) {
    console.error('Error observing resource loading:', error)
  }
}

/**
 * 初始化所有性能监控
 */
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return

  // 只在生产环境启用详细监控
  if (process.env.NODE_ENV === 'production') {
    observeLongTasks()
    observeLayoutShifts()
    observeResourceLoading()
  }

  // 报告导航计时
  window.addEventListener('load', () => {
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      if (navigation) {
        const metrics = [
          { name: 'DNS', value: navigation.domainLookupEnd - navigation.domainLookupStart },
          { name: 'TCP', value: navigation.connectEnd - navigation.connectStart },
          { name: 'TTFB', value: navigation.responseStart - navigation.startTime },
          { name: 'DOMContentLoaded', value: navigation.domContentLoadedEventEnd - navigation.startTime },
          { name: 'LoadComplete', value: navigation.loadEventEnd - navigation.startTime },
        ]

        metrics.forEach(({ name, value }) => {
          if (value > 0) {
            const metric: WebVitalMetric = {
              id: `nav-${name}-${Date.now()}`,
              name: `Navigation-${name}`,
              value,
              rating: 'good',
            }
            
            sendToAnalytics(metric)
          }
        })
      }
    }, 0)
  })
}

export default {
  reportWebVitals,
  measurePerformance,
  markPerformance,
  measureComponentPerformance,
  usePerformanceMonitor,
  initPerformanceMonitoring,
}
