import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface CopyableCodeProps {
  value?: string | null
  truncateLength?: number
  className?: string
  fallback?: string
}

export const CopyableCode: React.FC<CopyableCodeProps> = ({
  value,
  truncateLength = 12,
  className,
  fallback = '—',
}) => {
  const [copied, setCopied] = useState(false)

  if (!value) {
    return <span className={cn('text-muted-foreground/50', className)}>{fallback}</span>
  }

  const isTruncated = truncateLength > 0 && value.length > truncateLength
  const displayed = isTruncated ? `${value.slice(0, truncateLength)}…` : value

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (_) {}
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              'group inline-flex items-center gap-1.5 rounded bg-muted/60 hover:bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground/80 hover:text-foreground border border-border/50 hover:border-border transition-all cursor-pointer select-all',
              className
            )}
            title="Click to copy"
          >
            <span className="truncate">{displayed}</span>
            {copied ? (
              <Check className="h-3 w-3 text-emerald-500 shrink-0" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground/60 group-hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs font-mono text-[11px] break-all">
          {copied ? 'Copied to clipboard!' : value}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
