import type { FC } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { useTheme } from '@/lib/theme/ThemeContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/ui/status-pill'
import { CopyableCode } from '@/components/ui/copyable-code'
import {
  Shield,
  Globe,
  LogOut,
  Sun,
  Moon,
  Laptop,
  Palette,
  Check,
} from 'lucide-react'

export const SettingsPage: FC = () => {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const apiUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span>Console Preferences &amp; Session</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Environment bindings, active security session, and theme appearance preferences
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Theme & Visual Preferences */}
        <Card className="border-border/80 bg-card shadow-xs">
          <CardHeader className="pb-3 border-b border-border/80">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <span>Appearance &amp; Theme</span>
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Choose your preferred visual theme for the EquipTrack Admin Console
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center justify-center gap-2.5 rounded-xl border p-4 transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary'
                    : 'border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                }`}
              >
                <Sun className="h-5 w-5 text-amber-500" />
                <span className="text-xs">Light</span>
                {theme === 'light' && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center justify-center gap-2.5 rounded-xl border p-4 transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary'
                    : 'border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                }`}
              >
                <Moon className="h-5 w-5 text-indigo-400" />
                <span className="text-xs">Dark</span>
                {theme === 'dark' && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>

              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`flex flex-col items-center justify-center gap-2.5 rounded-xl border p-4 transition-all cursor-pointer ${
                  theme === 'system'
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary'
                    : 'border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                }`}
              >
                <Laptop className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs">System (Auto)</span>
                {theme === 'system' && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            </div>

            <div className="pt-2 text-xs text-muted-foreground leading-relaxed">
              Theme preference is persisted to browser local storage with zero flash.
            </div>
          </CardContent>
        </Card>

        {/* Active Session Info */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-3 border-b border-border/80">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Active Admin Session</span>
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Current authenticated session credentials and privileges
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Authenticated User:</span>
              <span className="text-foreground font-semibold">{user?.name}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Email Address:</span>
              <span className="text-foreground font-mono text-xs">{user?.email}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Privilege Role:</span>
              <StatusPill
                variant={user?.role === 'ADMIN' ? 'warning' : 'neutral'}
                label={user?.role || 'ADMIN'}
                size="sm"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Security Scope:</span>
              <StatusPill variant="success" label="ADMINISTRATOR" size="sm" />
            </div>

            <div className="pt-3 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="w-full text-xs text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/10 hover:border-rose-500/40 h-9"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                <span>Sign Out of Admin Console</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* API Endpoint & Environment */}
        <Card className="border-border bg-card shadow-xs md:col-span-2">
          <CardHeader className="pb-3 border-b border-border/80">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span>API Gateway &amp; Service Environment</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-3.5 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-muted-foreground">Configured API Base URL:</span>
              <CopyableCode value={apiUrl} truncateLength={0} className="text-xs font-mono" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Design Token Palette:</span>
              <span className="text-foreground font-medium">Indigo Accent / Neutral Slate Surface</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Direct SQL Terminal Console:</span>
              <span className="text-muted-foreground text-[11px] font-mono">Disabled by Security Policy</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
