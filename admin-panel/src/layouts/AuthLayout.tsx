import React from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthContext'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Skeleton } from '@/components/ui/skeleton'

export const AuthLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-4">
          <Skeleton className="h-10 w-32 mx-auto rounded-lg" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-background px-4 py-8 select-none overflow-y-auto">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle variant="button" />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2.5 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-sm">
            ET
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            EquipTrack Admin Console
          </h1>
          <p className="text-xs text-muted-foreground max-w-xs">
            Internal operations, machinery fleet, stock, and diagnostic control center
          </p>
        </div>

        <Outlet />

        <div className="text-center font-mono text-[11px] text-muted-foreground/60">
          EquipTrack Control &bull; Production v1.0.0
        </div>
      </div>
    </div>
  )
}
