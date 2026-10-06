import React from 'react'
import { Sun, Moon, Laptop } from 'lucide-react'
import { useTheme } from '@/lib/theme/ThemeContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export const ThemeToggle: React.FC<{ variant?: 'button' | 'dropdown'; className?: string }> = ({
  variant = 'button',
  className,
}) => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()

  if (variant === 'button') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className={cn('h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/80', className)}
        aria-label="Toggle theme (Light / Dark)"
        title={`Current: ${theme}. Click to toggle`}
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="h-4 w-4 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
        ) : (
          <Moon className="h-4 w-4 text-indigo-600 transition-transform rotate-0 hover:-rotate-12" />
        )}
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/80', className)}
          aria-label="Select theme"
        >
          {resolvedTheme === 'dark' ? (
            <Moon className="h-4 w-4 text-indigo-400" />
          ) : (
            <Sun className="h-4 w-4 text-amber-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onClick={() => setTheme('light')} className={cn(theme === 'light' && 'font-semibold text-primary')}>
          <Sun className="mr-2 h-4 w-4 text-amber-500" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} className={cn(theme === 'dark' && 'font-semibold text-primary')}>
          <Moon className="mr-2 h-4 w-4 text-indigo-400" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')} className={cn(theme === 'system' && 'font-semibold text-primary')}>
          <Laptop className="mr-2 h-4 w-4 text-muted-foreground" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
