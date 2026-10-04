import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/lib/api/usersApi'
import { auditApi } from '@/lib/api/auditApi'
import type { UserRole, UserStatus } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Shield,
  Clock,
  Mail,
  Phone,
  Calendar,
  KeyRound,
  CheckCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const UserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [resetPassOpen, setResetPassOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [notification, setNotification] = useState<string | null>(null)

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['adminUser', id],
    queryFn: () => usersApi.getUser(id!),
    enabled: !!id,
  })

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['userAuditLogs', id],
    queryFn: () => auditApi.listAuditLogs({ resource: 'users', limit: 20 }),
    enabled: !!id,
  })

  const passwordMutation = useMutation({
    mutationFn: (pass: string) => usersApi.updateUserPassword(id!, pass),
    onSuccess: () => {
      setResetPassOpen(false)
      setNewPassword('')
      setNotification('Password successfully reset.')
      setTimeout(() => setNotification(null), 4000)
    },
  })

  const roleMutation = useMutation({
    mutationFn: (newRole: UserRole) => usersApi.updateUserRole(id!, newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUser', id] })
      setNotification('Role successfully updated.')
      setTimeout(() => setNotification(null), 4000)
    },
  })

  const statusMutation = useMutation({
    mutationFn: (newStatus: UserStatus) => usersApi.updateUserStatus(id!, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUser', id] })
      setNotification('Status successfully updated.')
      setTimeout(() => setNotification(null), 4000)
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (isError || !user) {
    return (
      <div className="space-y-4">
        <Link to="/users">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-zinc-400">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Users
          </Button>
        </Link>
        <div className="rounded-md border border-red-900/60 bg-red-950/30 p-4 text-xs text-red-300">
          User account not found or access denied.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/users">
            <Button variant="outline" size="icon" className="h-8 w-8 border-zinc-800 bg-zinc-900/50">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
              <span>{user.name}</span>
              <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                {user.role}
              </Badge>
              <Badge variant={user.status === 'ACTIVE' ? 'success' : 'destructive'}>
                {user.status || 'ACTIVE'}
              </Badge>
            </h1>
            <p className="font-mono text-xs text-zinc-500">ID: {user.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetPassOpen(true)}
            className="h-8 gap-1.5 text-xs border-zinc-800 bg-zinc-900/50"
          >
            <KeyRound className="h-3.5 w-3.5" /> Reset Password
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN'
              roleMutation.mutate(newRole)
            }}
            disabled={roleMutation.isPending}
            className="h-8 gap-1.5 text-xs border-zinc-800 bg-zinc-900/50"
          >
            <Shield className="h-3.5 w-3.5" />
            Switch to {user.role === 'ADMIN' ? 'User' : 'Admin'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
              statusMutation.mutate(newStatus)
            }}
            disabled={statusMutation.isPending}
            className="h-8 text-xs border-zinc-800 bg-zinc-900/50"
          >
            {user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
          </Button>
        </div>
      </div>

      {notification && (
        <div className="flex items-center gap-2 rounded border border-emerald-900/60 bg-emerald-950/30 p-3 text-xs text-emerald-300">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-950/70">
          <CardHeader className="pb-3 border-b border-zinc-800">
            <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase">
              Account Attributes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email
              </span>
              <span className="text-zinc-200">{user.email}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Phone
              </span>
              <span className="text-zinc-200">{user.phone || 'Not provided'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Privilege Tier
              </span>
              <span className="text-zinc-200 font-semibold">{user.role}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Registered
              </span>
              <span className="text-zinc-200">{new Date(user.created_at).toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Last Login
              </span>
              <span className="text-zinc-200">{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never logged in'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-950/70">
          <CardHeader className="pb-3 border-b border-zinc-800">
            <CardTitle className="text-xs font-mono font-medium text-zinc-400 uppercase">
              Security Policy & Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="rounded border border-zinc-800 bg-zinc-900/50 p-3">
              <div className="font-semibold text-zinc-200 mb-1">Session & Authentication</div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Authentication tokens are signed using HMAC SHA-256 JWTs. Password hashes are stored securely with bcrypt salt rounds.
              </p>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900/50 p-3">
              <div className="font-semibold text-zinc-200 mb-1">Access Scope</div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                {user.role === 'ADMIN'
                  ? 'Full administrative control over all machines, sections, usage logs, and system operations.'
                  : 'Standard mobile/operator access to record usage data and inspect assigned equipment.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Trail for this resource */}
      <Card className="border-zinc-800 bg-zinc-950/70">
        <CardHeader className="pb-3 border-b border-zinc-800">
          <CardTitle className="text-sm text-zinc-200">Related Audit Events</CardTitle>
          <CardDescription className="text-xs text-zinc-500">
            Audit trail records involving user management operations
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {auditLogs.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-500">
              No audit logs recorded for this entity.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">{log.action}</Badge>
                    <span className="font-mono text-[11px] text-zinc-400">{log.resource} ({log.resource_id || 'all'})</span>
                  </div>
                  <div className="font-mono text-[11px] text-zinc-500">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Reset Modal */}
      <Dialog open={resetPassOpen} onOpenChange={setResetPassOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Assign a new password for {user.name} ({user.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="detail-reset-pass">New Password</Label>
              <Input
                id="detail-reset-pass"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPassOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newPassword || passwordMutation.isPending}
              onClick={() => passwordMutation.mutate(newPassword)}
            >
              {passwordMutation.isPending ? 'Updating...' : 'Update Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
