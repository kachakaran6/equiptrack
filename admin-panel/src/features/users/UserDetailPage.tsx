import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/lib/api/usersApi'
import { auditApi } from '@/lib/api/auditApi'
import type { UserRole, UserStatus } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPill } from '@/components/ui/status-pill'
import { FormattedDate } from '@/components/ui/formatted-date'
import { CopyableCode } from '@/components/ui/copyable-code'
import {
  ArrowLeft,
  Shield,
  Clock,
  Mail,
  Phone,
  Calendar,
  KeyRound,
  CheckCircle,
  ShieldCheck,
  User as UserIcon,
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
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (isError || !user) {
    return (
      <div className="space-y-4">
        <Link to="/users">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Users
          </Button>
        </Link>
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300">
          User account not found or access denied.
        </div>
      </div>
    )
  }

  const isAdmin = (user.role || '').toUpperCase() === 'ADMIN'
  const isActive = (user.status || '').toUpperCase() === 'ACTIVE'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-5">
        <div className="flex items-center gap-3">
          <Link to="/users">
            <Button variant="outline" size="icon" className="h-9 w-9 border-border/80 bg-card hover:bg-muted/70">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {user.name}
              </h1>
              <StatusPill variant={isAdmin ? 'info' : 'neutral'} label={isAdmin ? 'Admin' : 'User'} />
              <StatusPill variant={isActive ? 'success' : 'danger'} label={isActive ? 'Active' : 'Suspended'} />
            </div>
            <div className="mt-0.5">
              <CopyableCode value={user.id} truncateLength={16} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetPassOpen(true)}
            className="h-9 gap-1.5 text-xs border-border/80 bg-card hover:bg-muted/70 shadow-xs"
          >
            <KeyRound className="h-3.5 w-3.5 text-primary" />
            <span>Reset Password</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newRole: UserRole = isAdmin ? 'USER' : 'ADMIN'
              roleMutation.mutate(newRole)
            }}
            disabled={roleMutation.isPending}
            className="h-9 gap-1.5 text-xs border-border/80 bg-card hover:bg-muted/70 shadow-xs"
          >
            <Shield className="h-3.5 w-3.5 text-amber-500" />
            <span>Switch to {isAdmin ? 'Standard User' : 'Admin'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newStatus: UserStatus = isActive ? 'SUSPENDED' : 'ACTIVE'
              statusMutation.mutate(newStatus)
            }}
            disabled={statusMutation.isPending}
            className="h-9 text-xs border-border/80 bg-card hover:bg-muted/70 shadow-xs"
          >
            {isActive ? 'Suspend Account' : 'Activate Account'}
          </Button>
        </div>
      </div>

      {notification && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>{notification}</span>
        </div>
      )}

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border-border/70 bg-card shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-primary" />
              <span>Account Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2 text-xs">
                <Mail className="h-3.5 w-3.5" /> Email Address
              </span>
              <span className="text-foreground font-medium">{user.email}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2 text-xs">
                <Phone className="h-3.5 w-3.5" /> Phone Number
              </span>
              <span className="text-foreground font-medium">{user.phone || 'Not provided'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2 text-xs">
                <Shield className="h-3.5 w-3.5" /> Privilege Tier
              </span>
              <StatusPill variant={isAdmin ? 'info' : 'neutral'} label={user.role} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2 text-xs">
                <Calendar className="h-3.5 w-3.5" /> Date Registered
              </span>
              <FormattedDate value={user.created_at} format="full" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2 text-xs">
                <Clock className="h-3.5 w-3.5" /> Last Active
              </span>
              <FormattedDate value={user.last_login_at} format="full" fallback="Never logged in" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Security & Access Scope</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3 text-xs">
            <div className="rounded-lg border border-border/70 bg-muted/40 p-3.5">
              <div className="font-semibold text-foreground mb-1">Session & Authentication</div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Authentication tokens are signed using HMAC SHA-256 JWTs with automatic rotation. Passwords use salted bcrypt encryption.
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/40 p-3.5">
              <div className="font-semibold text-foreground mb-1">Authorization Scope</div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {user.role === 'ADMIN'
                  ? 'Full administrative control over all machines, inventory, usage records, backups, and user credentials.'
                  : 'Standard mobile/operator access to record usage data and inspect assigned equipment.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Trail for this resource */}
      <Card className="border-border/70 bg-card shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-base font-semibold text-foreground">Related Audit Trail Events</CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Audit logs involving administrative operations on this account
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {auditLogs.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              No audit logs recorded for this entity.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 text-xs hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <StatusPill variant="neutral" size="sm" label={log.action} dot={false} />
                    <span className="font-medium text-foreground">{log.resource}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">({log.resource_id || 'all'})</span>
                  </div>
                  <FormattedDate value={log.created_at} format="full" className="text-xs text-muted-foreground" />
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
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              Assign a new password for <span className="font-medium text-foreground">{user.name}</span> ({user.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="detail-reset-pass" className="text-xs font-medium">New Password</Label>
              <Input
                id="detail-reset-pass"
                type="password"
                placeholder="Enter new secure password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
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
