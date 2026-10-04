import React from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Settings as SettingsIcon,
  Shield,
  Key,
  Globe,
  LogOut,
} from 'lucide-react'

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth()
  const apiUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-zinc-400" />
          Console Preferences &amp; Session
        </h1>
        <p className="text-xs text-zinc-400">
          Environment bindings, active security session, and endpoint configuration
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Session Info */}
        <Card className="border-zinc-800 bg-zinc-950/60">
          <CardHeader className="pb-3 border-b border-zinc-800">
            <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase flex items-center gap-2">
              <Shield className="h-4 w-4" /> Active Admin Session
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Authenticated User:</span>
              <span className="text-zinc-200 font-semibold">{user?.name}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Email:</span>
              <span className="text-zinc-300">{user?.email}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Privilege Role:</span>
              <Badge variant="default" className="text-[10px]">
                {user?.role}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Security Scope:</span>
              <span className="text-emerald-400">ADMINISTRATOR</span>
            </div>

            <div className="pt-3 border-t border-zinc-900">
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="w-full text-xs text-red-400 border-zinc-800 hover:bg-red-950/20"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sign Out of Admin Console
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* API Endpoint & Environment */}
        <Card className="border-zinc-800 bg-zinc-950/60">
          <CardHeader className="pb-3 border-b border-zinc-800">
            <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase flex items-center gap-2">
              <Globe className="h-4 w-4" /> API Gateway Target
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 font-mono text-xs">
            <div className="space-y-1">
              <span className="text-zinc-500">Configured Base URL:</span>
              <div className="rounded border border-zinc-800 bg-zinc-900/50 p-2 text-zinc-200 break-all text-[11px]">
                {apiUrl}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-zinc-500">Design System:</span>
              <Badge variant="outline" className="text-[10px]">Monochrome Minimal Dark</Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Direct SQL Console:</span>
              <span className="text-zinc-400 text-[10px]">Disabled by Security Policy</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
