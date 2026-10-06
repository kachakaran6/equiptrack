import React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface FormattedDateProps {
  value?: string | number | Date | null
  format?: 'full' | 'date-only' | 'time-only' | 'relative'
  className?: string
  fallback?: string
}

export const formatDateHelper = (
  value?: string | number | Date | null,
  format: 'full' | 'date-only' | 'time-only' | 'relative' = 'full',
  fallback = '—'
): { formatted: string; iso: string } => {
  if (!value) return { formatted: fallback, iso: '' }

  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) {
      return { formatted: String(value), iso: String(value) }
    }

    const iso = d.toISOString()

    if (format === 'date-only') {
      const formatted = new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(d)
      return { formatted, iso }
    }

    if (format === 'time-only') {
      const formatted = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(d)
      return { formatted, iso }
    }

    // Default 'full'
    const formatted = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d)

    return { formatted, iso }
  } catch (_) {
    return { formatted: String(value), iso: String(value) }
  }
}

export const FormattedDate: React.FC<FormattedDateProps> = ({
  value,
  format = 'full',
  className,
  fallback = '—',
}) => {
  const { formatted, iso } = formatDateHelper(value, format, fallback)

  if (!iso || formatted === fallback) {
    return <span className={cn('text-muted-foreground/60', className)}>{fallback}</span>
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('cursor-default tabular-nums text-foreground/90 hover:text-foreground', className)}>
            {formatted}
          </span>
        </TooltipTrigger>
        <TooltipContent className="font-mono text-[11px]">
          {iso}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
