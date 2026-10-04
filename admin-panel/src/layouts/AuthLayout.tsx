import React from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthContext'
import { Skeleton } from '@/components/ui/skeleton'

export const AuthLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-4">
        <div className="w-full max-w-sm space-y-4">
          <Skeleton className="h-8 w-32 mx-auto" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 py-12 select-none">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 font-mono text-sm font-bold text-zinc-100">
            ET
          </div>
          <h1 className="text-base font-semibold tracking-tight text-zinc-100">
            EquipTrack Internal Console
          </h1>
          <p className="text-xs text-zinc-400">
            Restricted administrative access only
          </p>
        </div>

        <Outlet />

        <div className="text-center font-mono text-[10px] text-zinc-600">
          EquipTrack v1.0.0 &bull; Security Boundary Active
        </div>
      </div>
    </div>
  )
}
