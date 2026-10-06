import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { usersApi, type CreateUserInput } from '@/lib/api/usersApi'
import type { User, UserRole, UserStatus } from '@/types/api'
import { useAuth } from '@/lib/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPill } from '@/components/ui/status-pill'
import { FormattedDate } from '@/components/ui/formatted-date'
import {
  UserPlus,
  Search,
  MoreHorizontal,
  Shield,
  Trash2,
  KeyRound,
  Eye,
  RefreshCw,
  PowerOff,
  CheckCircle,
  Users as UsersIcon,
} from 'lucide-react'

export const UsersPage: React.FC = () => {
  const { user: currentAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newUserData, setNewUserData] = useState<CreateUserInput>({
    name: '',
    email: '',
    password: '',
    role: 'USER',
    phone: '',
  })
  const [formError, setFormError] = useState<string | null>(null)

  // Action states
  const [roleChangeTarget, setRoleChangeTarget] = useState<{ user: User; newRole: UserRole } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const { data: users = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => usersApi.listUsers(),
  })

  // Create User Mutation
  const createMutation = useMutation({
    mutationFn: (input: CreateUserInput) => usersApi.createUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      setIsAddOpen(false)
      setNewUserData({ name: '', email: '', password: '', role: 'USER', phone: '' })
      setFormError(null)
      setActionSuccess('User account successfully created.')
      setTimeout(() => setActionSuccess(null), 4000)
    },
    onError: (err: Error) => {
      setFormError(err.message)
    },
  })

  // Change Role Mutation
  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      usersApi.updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      setRoleChangeTarget(null)
      setActionSuccess('User role updated successfully.')
      setTimeout(() => setActionSuccess(null), 4000)
    },
    onError: (err: Error) => {
      setActionError(err.message)
    },
  })

  // Change Status Mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      usersApi.updateUserStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      setActionSuccess('User status updated successfully.')
      setTimeout(() => setActionSuccess(null), 4000)
    },
    onError: (err: Error) => {
      setActionError(err.message)
    },
  })

  // Change Password Mutation
  const passwordMutation = useMutation({
    mutationFn: ({ id, pass }: { id: string; pass: string }) =>
      usersApi.updateUserPassword(id, pass),
    onSuccess: () => {
      setPasswordTarget(null)
      setNewPassword('')
      setActionSuccess('User password successfully reset.')
      setTimeout(() => setActionSuccess(null), 4000)
    },
    onError: (err: Error) => {
      setActionError(err.message)
    },
  })

  // Delete User Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      setDeleteTarget(null)
      setActionSuccess('User successfully removed.')
      setTimeout(() => setActionSuccess(null), 4000)
    },
    onError: (err: Error) => {
      setActionError(err.message)
    },
  })

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm))
    const userRole = (u.role || '').toUpperCase()
    const matchesRole = roleFilter === 'ALL' || userRole === roleFilter
    return matchesSearch && matchesRole
  })

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!newUserData.name.trim() || !newUserData.email.trim() || !newUserData.password) {
      setFormError('Name, email, and password are required.')
      return
    }
    createMutation.mutate(newUserData)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <UsersIcon className="h-6 w-6 text-primary" />
            <span>User Accounts & Roles</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage administrative privileges, credentials, and account statuses
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 gap-1.5 border-border/80 bg-card hover:bg-muted/70 text-xs shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setFormError(null)
              setIsAddOpen(true)
            }}
            className="h-9 gap-1.5 text-xs font-medium shadow-xs"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add User</span>
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-300">
          <span>{actionError}</span>
          <Button variant="ghost" size="sm" onClick={() => setActionError(null)} className="h-6 text-xs hover:bg-rose-500/20">
            Dismiss
          </Button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs bg-card border-border/80"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Role:</span>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-36 h-9 text-xs bg-card border-border/80">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="USER">User</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table with Sticky Header & Scrollable Body */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs relative">
        <div className="max-h-[calc(100vh-290px)] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/50 backdrop-blur-xs border-b border-border/70">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-xs text-muted-foreground">User Name & Email</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Access Role</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Status</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Registered</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Last Login</TableHead>
                <TableHead className="text-right font-semibold text-xs text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-36 text-center text-muted-foreground">
                    <p className="text-sm font-medium">No user accounts found.</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your search terms or role filters.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => {
                  const isAdmin = (u.role || '').toUpperCase() === 'ADMIN'
                  const isActive = (u.status || '').toUpperCase() === 'ACTIVE'

                  return (
                    <TableRow key={u.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-sm">{u.name}</span>
                          <span className="text-xs text-muted-foreground">{u.email}</span>
                          {u.phone && <span className="font-mono text-[10px] text-muted-foreground/70 mt-0.5">{u.phone}</span>}
                        </div>
                      </TableCell>

                      <TableCell>
                        <StatusPill
                          variant={isAdmin ? 'info' : 'neutral'}
                          label={isAdmin ? 'Admin' : 'User'}
                        />
                      </TableCell>

                      <TableCell>
                        <StatusPill
                          variant={isActive ? 'success' : 'danger'}
                          label={isActive ? 'Active' : 'Suspended'}
                        />
                      </TableCell>

                      <TableCell className="text-xs">
                        <FormattedDate value={u.created_at} format="date-only" />
                      </TableCell>

                      <TableCell className="text-xs">
                        <FormattedDate value={u.last_login_at} format="full" fallback="Never" />
                      </TableCell>

                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 p-1.5">
                            <DropdownMenuLabel className="text-xs">User Operations</DropdownMenuLabel>
                            <DropdownMenuItem asChild className="cursor-pointer">
                              <Link to={`/users/${u.id}`} className="flex items-center">
                                <Eye className="mr-2 h-4 w-4 text-primary" />
                                View Profile & Logs
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => {
                                const newRole: UserRole = isAdmin ? 'USER' : 'ADMIN'
                                setRoleChangeTarget({ user: u, newRole })
                              }}
                            >
                              <Shield className="mr-2 h-4 w-4 text-amber-500" />
                              Change to {isAdmin ? 'Standard User' : 'Administrator'}
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => {
                                const newStatus: UserStatus = isActive ? 'SUSPENDED' : 'ACTIVE'
                                statusMutation.mutate({ id: u.id, status: newStatus })
                              }}
                            >
                              <PowerOff className="mr-2 h-4 w-4 text-muted-foreground" />
                              {isActive ? 'Suspend Account' : 'Activate Account'}
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => setPasswordTarget(u)} className="cursor-pointer">
                              <KeyRound className="mr-2 h-4 w-4 text-indigo-400" />
                              Reset Password
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(u)}
                              disabled={u.id === currentAdmin?.id}
                              className="text-rose-500 focus:text-rose-600 focus:bg-rose-500/10 cursor-pointer"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add User Account</DialogTitle>
            <DialogDescription>
              Create a new user with administrative or standard access.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
              {formError}
            </div>
          )}

          <form onSubmit={handleAddSubmit} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-name" className="text-xs font-medium">Full Name *</Label>
              <Input
                id="add-name"
                value={newUserData.name}
                onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                placeholder="e.g. Karan Admin"
                className="h-9 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-email" className="text-xs font-medium">Email Address *</Label>
              <Input
                id="add-email"
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                placeholder="name@equiptrack.internal"
                className="h-9 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-pass" className="text-xs font-medium">Initial Password *</Label>
              <Input
                id="add-pass"
                type="password"
                value={newUserData.password}
                onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                placeholder="Minimum 6 characters"
                className="h-9 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-phone" className="text-xs font-medium">Phone Number (Optional)</Label>
              <Input
                id="add-phone"
                value={newUserData.phone || ''}
                onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Access Privilege Tier</Label>
              <Select
                value={newUserData.role}
                onValueChange={(val: UserRole) => setNewUserData({ ...newUserData, role: val })}
              >
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Standard User (Mobile App Access)</SelectItem>
                  <SelectItem value="ADMIN">Administrator (Full Console Access)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Role Change Confirmation */}
      <AlertDialog open={!!roleChangeTarget} onOpenChange={() => setRoleChangeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change User Access Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change {roleChangeTarget?.user.name}&apos;s role to{' '}
              <strong className="text-foreground font-semibold">{roleChangeTarget?.newRole}</strong>?
              {roleChangeTarget?.newRole === 'USER' && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400">
                  Warning: Removing admin privileges will prevent this user from accessing the admin console.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (roleChangeTarget) {
                  roleMutation.mutate({
                    id: roleChangeTarget.user.id,
                    role: roleChangeTarget.newRole,
                  })
                }
              }}
            >
              Confirm Role Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!passwordTarget} onOpenChange={() => setPasswordTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              Set a new password for <span className="text-foreground font-medium">{passwordTarget?.name}</span> ({passwordTarget?.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="reset-pass" className="text-xs font-medium">New Secure Password</Label>
              <Input
                id="reset-pass"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setPasswordTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={!newPassword || passwordMutation.isPending}
              onClick={() => {
                if (passwordTarget && newPassword) {
                  passwordMutation.mutate({ id: passwordTarget.id, pass: newPassword })
                }
              }}
            >
              {passwordMutation.isPending ? 'Updating...' : 'Set Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User AlertDialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong className="text-foreground">{deleteTarget?.name}</strong> ({deleteTarget?.email})?
              This action is permanent and will remove their access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id)
                }
              }}
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
