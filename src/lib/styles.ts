/**
 * 统一样式工具函数
 * 用于将内联样式转换为 Tailwind 类名
 */

import { cn } from './utils'
export { cn }

/**
 * 颜色变体映射
 */
export const colorVariants = {
  primary: {
    bg: 'bg-sky-700',
    bgHover: 'hover:bg-sky-600',
    text: 'text-sky-700',
    border: 'border-sky-700',
    ring: 'ring-sky-700',
  },
  secondary: {
    bg: 'bg-sky-500',
    bgHover: 'hover:bg-sky-400',
    text: 'text-sky-500',
    border: 'border-sky-500',
    ring: 'ring-sky-500',
  },
  cta: {
    bg: 'bg-green-500',
    bgHover: 'hover:bg-green-600',
    text: 'text-green-500',
    border: 'border-green-500',
    ring: 'ring-green-500',
  },
  danger: {
    bg: 'bg-red-500',
    bgHover: 'hover:bg-red-600',
    text: 'text-red-500',
    border: 'border-red-500',
    ring: 'ring-red-500',
  },
  warning: {
    bg: 'bg-amber-500',
    bgHover: 'hover:bg-amber-600',
    text: 'text-amber-500',
    border: 'border-amber-500',
    ring: 'ring-amber-500',
  },
  success: {
    bg: 'bg-emerald-500',
    bgHover: 'hover:bg-emerald-600',
    text: 'text-emerald-500',
    border: 'border-emerald-500',
    ring: 'ring-emerald-500',
  },
} as const

/**
 * 尺寸变体映射
 */
export const sizeVariants = {
  xs: {
    text: 'text-xs',
    padding: 'px-2 py-1',
    height: 'h-6',
    icon: 'w-3 h-3',
  },
  sm: {
    text: 'text-sm',
    padding: 'px-3 py-1.5',
    height: 'h-8',
    icon: 'w-4 h-4',
  },
  md: {
    text: 'text-base',
    padding: 'px-4 py-2',
    height: 'h-10',
    icon: 'w-5 h-5',
  },
  lg: {
    text: 'text-lg',
    padding: 'px-6 py-3',
    height: 'h-12',
    icon: 'w-6 h-6',
  },
  xl: {
    text: 'text-xl',
    padding: 'px-8 py-4',
    height: 'h-14',
    icon: 'w-7 h-7',
  },
} as const

/**
 * 圆角变体映射
 */
export const radiusVariants = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
} as const

/**
 * 阴影变体映射
 */
export const shadowVariants = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
} as const

/**
 * 按钮样式生成器
 */
export function buttonStyles(options: {
  variant?: keyof typeof colorVariants
  size?: keyof typeof sizeVariants
  radius?: keyof typeof radiusVariants
  shadow?: keyof typeof shadowVariants
  fullWidth?: boolean
  disabled?: boolean
  className?: string
}) {
  const {
    variant = 'primary',
    size = 'md',
    radius = 'md',
    shadow = 'none',
    fullWidth = false,
    disabled = false,
    className = '',
  } = options

  const colors = colorVariants[variant]
  const sizes = sizeVariants[size]

  return cn(
    // 基础样式
    'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'cursor-pointer',
    
    // 颜色
    colors.bg,
    colors.bgHover,
    'text-white',
    colors.ring,
    
    // 尺寸
    sizes.text,
    sizes.padding,
    sizes.height,
    
    // 圆角
    radiusVariants[radius],
    
    // 阴影
    shadowVariants[shadow],
    
    // 全宽
    fullWidth && 'w-full',
    
    // 禁用状态
    disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
    
    // 自定义类名
    className
  )
}

/**
 * 卡片样式生成器
 */
export function cardStyles(options: {
  radius?: keyof typeof radiusVariants
  shadow?: keyof typeof shadowVariants
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const {
    radius = 'lg',
    shadow = 'md',
    padding = 'md',
    className = '',
  } = options

  const paddingMap = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  }

  return cn(
    'bg-white dark:bg-slate-800',
    'border border-slate-200 dark:border-slate-700',
    radiusVariants[radius],
    shadowVariants[shadow],
    paddingMap[padding],
    className
  )
}

/**
 * 输入框样式生成器
 */
export function inputStyles(options: {
  size?: keyof typeof sizeVariants
  radius?: keyof typeof radiusVariants
  fullWidth?: boolean
  error?: boolean
  className?: string
}) {
  const {
    size = 'md',
    radius = 'md',
    fullWidth = false,
    error = false,
    className = '',
  } = options

  const sizes = sizeVariants[size]

  return cn(
    // 基础样式
    'block border bg-white dark:bg-slate-800',
    'text-slate-900 dark:text-slate-100',
    'placeholder:text-slate-400',
    'focus:outline-none focus:ring-2 focus:ring-offset-1',
    'transition-colors duration-200',
    
    // 边框颜色
    error
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : 'border-slate-300 dark:border-slate-600 focus:border-sky-500 focus:ring-sky-500',
    
    // 尺寸
    sizes.text,
    sizes.padding,
    sizes.height,
    
    // 圆角
    radiusVariants[radius],
    
    // 全宽
    fullWidth && 'w-full',
    
    // 自定义类名
    className
  )
}

/**
 * 文本样式生成器
 */
export function textStyles(options: {
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
  weight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold'
  color?: 'primary' | 'secondary' | 'tertiary' | 'muted' | 'inverse'
  align?: 'left' | 'center' | 'right'
  truncate?: boolean
  className?: string
}) {
  const {
    size = 'base',
    weight = 'normal',
    color = 'primary',
    align = 'left',
    truncate = false,
    className = '',
  } = options

  const sizeMap = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
    '4xl': 'text-4xl',
  }

  const weightMap = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
    extrabold: 'font-extrabold',
  }

  const colorMap = {
    primary: 'text-slate-900 dark:text-slate-100',
    secondary: 'text-slate-700 dark:text-slate-300',
    tertiary: 'text-slate-600 dark:text-slate-400',
    muted: 'text-slate-500 dark:text-slate-500',
    inverse: 'text-white',
  }

  const alignMap = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }

  return cn(
    sizeMap[size],
    weightMap[weight],
    colorMap[color],
    alignMap[align],
    truncate && 'truncate',
    className
  )
}

/**
 * 布局样式生成器
 */
export function layoutStyles(options: {
  display?: 'flex' | 'grid' | 'block' | 'inline' | 'hidden'
  direction?: 'row' | 'col'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  items?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  wrap?: boolean
  className?: string
}) {
  const {
    display = 'flex',
    direction = 'row',
    justify = 'start',
    items = 'stretch',
    gap = 'none',
    wrap = false,
    className = '',
  } = options

  const displayMap = {
    flex: 'flex',
    grid: 'grid',
    block: 'block',
    inline: 'inline',
    hidden: 'hidden',
  }

  const directionMap = {
    row: 'flex-row',
    col: 'flex-col',
  }

  const justifyMap = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly',
  }

  const itemsMap = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
    baseline: 'items-baseline',
  }

  const gapMap = {
    none: '',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
    '2xl': 'gap-12',
  }

  return cn(
    displayMap[display],
    display === 'flex' && directionMap[direction],
    display === 'flex' && justifyMap[justify],
    display === 'flex' && itemsMap[items],
    gapMap[gap],
    wrap && 'flex-wrap',
    className
  )
}
