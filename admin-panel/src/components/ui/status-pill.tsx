import React from 'react'
import { cn } from '@/lib/utils'

export type StatusVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'in'
  | 'out'
  | 'connected'
  | 'disconnected'
  | 'active'
  | 'inactive'

interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusVariant
  label?: string
  dot?: boolean
  pulse?: boolean
  children?: React.ReactNode
  size?: 'sm' | 'md'
}

export const StatusPill: React.FC<StatusPillProps> = ({
  variant = 'neutral',
  label,
  dot = true,
  pulse = false,
  children,
  size = 'md',
  className,
  ...props
}) => {
  const content = label || children

  // Normalize string content if variant not explicitly given
  let resolvedVariant = variant
  if (typeof content === 'string') {
    const lower = content.toLowerCase().trim()
    if (lower === 'success' || lower === 'connected' || lower === 'active' || lower === 'ok' || lower === 'in') {
      resolvedVariant = lower === 'in' ? 'in' : 'success'
    } else if (lower === 'warning' || lower === 'degraded' || lower === 'pending' || lower === 'out') {
      resolvedVariant = lower === 'out' ? 'out' : 'warning'
    } else if (lower === 'danger' || lower === 'error' || lower === 'failed' || lower === 'disconnected' || lower === 'inactive') {
      resolvedVariant = 'danger'
    } else if (lower === 'info' || lower === 'running') {
      resolvedVariant = 'info'
    }
  }

  const variantStyles: Record<StatusVariant, { container: string; dot: string }> = {
    success: {
      container: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30',
      dot: 'bg-emerald-500',
    },
    warning: {
      container: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30',
      dot: 'bg-amber-500',
    },
    danger: {
      container: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/30',
      dot: 'bg-rose-500',
    },
    info: {
      container: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 dark:border-sky-500/30',
      dot: 'bg-sky-500',
    },
    neutral: {
      container: 'bg-muted/80 text-muted-foreground border-border/80',
      dot: 'bg-muted-foreground/60',
    },
    in: {
      container: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold border-emerald-500/30',
      dot: 'bg-emerald-500',
    },
    out: {
      container: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 font-semibold border-rose-500/30',
      dot: 'bg-rose-500',
    },
    connected: {
      container: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      dot: 'bg-emerald-500',
    },
    disconnected: {
      container: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      dot: 'bg-rose-500',
    },
    active: {
      container: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      dot: 'bg-emerald-500',
    },
    inactive: {
      container: 'bg-muted/80 text-muted-foreground border-border/80',
      dot: 'bg-muted-foreground/60',
    },
  }

  const current = variantStyles[resolvedVariant] || variantStyles.neutral

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium transition-colors select-none',
        size === 'sm' ? 'text-[11px] leading-tight px-1.5 py-0.2' : 'text-xs leading-none px-2.5 py-1',
        current.container,
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'rounded-full shrink-0',
            size === 'sm' ? 'h-1.5 w-1.5' : 'h-1.5 w-1.5',
            current.dot,
            pulse && 'animate-pulse'
          )}
        />
      )}
      <span className="capitalize">{content}</span>
    </span>
  )
}
