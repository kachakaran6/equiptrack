import React from 'react'
import { Sun, Moon, Laptop, Check } from 'lucide-react'
import { useTheme, type Theme } from '@/lib/theme/ThemeContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  variant?: 'button' | 'segmented' | 'dropdown'
  className?: string
  size?: 'sm' | 'default'
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'button',
  className,
  size = 'default',
}) => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()

  if (variant === 'segmented') {
    return (
      <div
        className={cn(
          'flex items-center rounded-lg bg-muted/60 p-1 border border-border/70 backdrop-blur-xs select-none',
          className
        )}
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1 text-xs font-medium transition-all duration-200 cursor-pointer',
            theme === 'light'
              ? 'bg-card text-foreground shadow-xs border border-border/80 font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          )}
          title="Light Theme"
        >
          <Sun className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-[11px]">Light</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1 text-xs font-medium transition-all duration-200 cursor-pointer',
            theme === 'dark'
              ? 'bg-card text-foreground shadow-xs border border-border/80 font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          )}
          title="Dark Theme"
        >
          <Moon className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-[11px]">Dark</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme('system')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1 text-xs font-medium transition-all duration-200 cursor-pointer',
            theme === 'system'
              ? 'bg-card text-foreground shadow-xs border border-border/80 font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          )}
          title="Follow System OS Preference"
        >
          <Laptop className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px]">Auto</span>
        </button>
      </div>
    )
  }

  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        className={cn(
          'relative h-8.5 w-8.5 rounded-lg border-border/80 bg-background/60 backdrop-blur-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 shadow-xs transition-all overflow-hidden',
          className
        )}
        aria-label="Toggle theme (Light / Dark)"
        title={`Current mode: ${theme} (${resolvedTheme} active). Click to toggle`}
      >
        <div className="relative flex items-center justify-center h-full w-full">
          <Sun
            className={cn(
              'h-4 w-4 text-amber-500 transition-all duration-300 absolute',
              resolvedTheme === 'dark'
                ? 'rotate-90 scale-0 opacity-0'
                : 'rotate-0 scale-100 opacity-100'
            )}
          />
          <Moon
            className={cn(
              'h-4 w-4 text-indigo-400 transition-all duration-300 absolute',
              resolvedTheme === 'dark'
                ? 'rotate-0 scale-100 opacity-100'
                : '-rotate-90 scale-0 opacity-0'
            )}
          />
        </div>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            'h-8.5 w-8.5 rounded-lg border-border/80 bg-background/60 text-muted-foreground hover:text-foreground hover:bg-muted/80 shadow-xs',
            className
          )}
          aria-label="Select theme appearance"
        >
          {resolvedTheme === 'dark' ? (
            <Moon className="h-4 w-4 text-indigo-400" />
          ) : (
            <Sun className="h-4 w-4 text-amber-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 p-1">
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className={cn('cursor-pointer text-xs justify-between', theme === 'light' && 'font-semibold text-primary')}
        >
          <div className="flex items-center">
            <Sun className="mr-2 h-4 w-4 text-amber-500" /> Light
          </div>
          {theme === 'light' && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={cn('cursor-pointer text-xs justify-between', theme === 'dark' && 'font-semibold text-primary')}
        >
          <div className="flex items-center">
            <Moon className="mr-2 h-4 w-4 text-indigo-400" /> Dark
          </div>
          {theme === 'dark' && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className={cn('cursor-pointer text-xs justify-between', theme === 'system' && 'font-semibold text-primary')}
        >
          <div className="flex items-center">
            <Laptop className="mr-2 h-4 w-4 text-muted-foreground" /> System (Auto)
          </div>
          {theme === 'system' && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

