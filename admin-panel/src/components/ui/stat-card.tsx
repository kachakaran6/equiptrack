import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number | React.ReactNode
  description?: string
  icon: LucideIcon
  iconColor?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'purple' | 'zinc'
  action?: React.ReactNode
  className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  iconColor = 'indigo',
  action,
  className,
}) => {
  const colorMap = {
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    zinc: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
  }

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-border/90 bg-card border-border/70',
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {value}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground truncate">{description}</p>
            )}
          </div>
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-transform duration-200 group-hover:scale-105',
              colorMap[iconColor]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {action && <div className="mt-3 pt-3 border-t border-border/50">{action}</div>}
      </CardContent>
    </Card>
  )
}
