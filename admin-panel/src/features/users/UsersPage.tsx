import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { usersApi, type CreateUserInput } from '@/lib/api/usersApi'
import type { User, UserRole, UserStatus } from '@/types/api'
import { useAuth } from '@/lib/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
            User Accounts & Roles
          </h1>
          <p className="text-xs text-zinc-400">
            Manage administrative privileges, credentials, and account statuses
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 gap-1.5 border-zinc-800 bg-zinc-900/60 text-xs text-zinc-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setFormError(null)
              setIsAddOpen(true)
            }}
            className="h-8 gap-1.5 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 text-xs font-medium"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add User
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-900/60 bg-emerald-950/30 p-3 text-xs text-emerald-300">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="flex items-center justify-between rounded-md border border-red-900/60 bg-red-950/30 p-3 text-xs text-red-300">
          <span>{actionError}</span>
          <Button variant="ghost" size="sm" onClick={() => setActionError(null)} className="h-6 text-[10px]">
            Dismiss
          </Button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <Input
            placeholder="Search by name, email, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-zinc-400">Role:</span>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-32 h-8 text-xs">
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
      <div className="rounded-md border border-zinc-800/80 bg-zinc-950/70 overflow-hidden max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-auto relative">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-zinc-900 shadow-sm">
            <TableRow className="border-b border-zinc-800 bg-zinc-900 hover:bg-zinc-900">
              <TableHead className="text-zinc-300 bg-zinc-900 font-semibold">User</TableHead>
              <TableHead className="text-zinc-300 bg-zinc-900 font-semibold">Role</TableHead>
              <TableHead className="text-zinc-300 bg-zinc-900 font-semibold">Status</TableHead>
              <TableHead className="text-zinc-300 bg-zinc-900 font-semibold">Created</TableHead>
              <TableHead className="text-zinc-300 bg-zinc-900 font-semibold">Last Activity</TableHead>
              <TableHead className="text-right text-zinc-300 bg-zinc-900 font-semibold">Actions</TableHead>
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
                <TableCell colSpan={6} className="h-32 text-center text-zinc-500">
                  No user accounts found matching your search.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-zinc-100">{u.name}</span>
                      <span className="font-mono text-[11px] text-zinc-400">{u.email}</span>
                      {u.phone && <span className="font-mono text-[10px] text-zinc-500">{u.phone}</span>}
                    </div>
                  </TableCell>

                  <TableCell>
                    {(() => {
                      const isAdmin = (u.role || '').toUpperCase() === 'ADMIN'
                      return (
                        <Badge variant={isAdmin ? 'default' : 'secondary'}>
                          {isAdmin && <Shield className="mr-1 h-3 w-3 inline" />}
                          {isAdmin ? 'ADMIN' : 'USER'}
                        </Badge>
                      )
                    })()}
                  </TableCell>

                  <TableCell>
                    {(() => {
                      const isActive = (u.status || '').toUpperCase() === 'ACTIVE'
                      return (
                        <Badge variant={isActive ? 'success' : 'destructive'}>
                          {isActive ? 'ACTIVE' : (u.status || 'SUSPENDED').toUpperCase()}
                        </Badge>
                      )
                    })()}
                  </TableCell>

                  <TableCell className="font-mono text-[11px] text-zinc-400">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>

                  <TableCell className="font-mono text-[11px] text-zinc-500">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}
                  </TableCell>

                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link to={`/users/${u.id}`} className="flex items-center">
                            <Eye className="mr-2 h-3.5 w-3.5" />
                            View Profile
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => {
                            const isAdmin = (u.role || '').toUpperCase() === 'ADMIN'
                            const newRole: UserRole = isAdmin ? 'USER' : 'ADMIN'
                            setRoleChangeTarget({ user: u, newRole })
                          }}
                        >
                          <Shield className="mr-2 h-3.5 w-3.5" />
                          Change to {(u.role || '').toUpperCase() === 'ADMIN' ? 'User' : 'Admin'}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => {
                            const isActive = (u.status || '').toUpperCase() === 'ACTIVE'
                            const newStatus: UserStatus = isActive ? 'SUSPENDED' : 'ACTIVE'
                            statusMutation.mutate({ id: u.id, status: newStatus })
                          }}
                        >
                          <PowerOff className="mr-2 h-3.5 w-3.5" />
                          {(u.status || '').toUpperCase() === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => setPasswordTarget(u)}>
                          <KeyRound className="mr-2 h-3.5 w-3.5" />
                          Reset Password
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(u)}
                          disabled={u.id === currentAdmin?.id}
                          className="text-red-400 focus:text-red-300"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
            <div className="rounded border border-red-900/60 bg-red-950/30 p-2.5 text-xs text-red-300">
              {formError}
            </div>
          )}

          <form onSubmit={handleAddSubmit} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="add-name">Full Name *</Label>
              <Input
                id="add-name"
                value={newUserData.name}
                onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                placeholder="e.g. Karan Admin"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="add-email">Email Address *</Label>
              <Input
                id="add-email"
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                placeholder="name@equiptrack.internal"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="add-pass">Initial Password *</Label>
              <Input
                id="add-pass"
                type="password"
                value={newUserData.password}
                onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                placeholder="Minimum 6 characters"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="add-phone">Phone Number (Optional)</Label>
              <Input
                id="add-phone"
                value={newUserData.phone || ''}
                onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="space-y-1">
              <Label>Access Role</Label>
              <Select
                value={newUserData.role}
                onValueChange={(val: UserRole) => setNewUserData({ ...newUserData, role: val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User (Standard Access)</SelectItem>
                  <SelectItem value="ADMIN">Admin (Full Control Access)</SelectItem>
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
              <strong className="text-zinc-100 font-mono">{roleChangeTarget?.newRole}</strong>?
              {roleChangeTarget?.newRole === 'USER' && (
                <span className="block mt-2 text-amber-400">
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
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for <span className="text-zinc-200 font-medium">{passwordTarget?.name}</span> ({passwordTarget?.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="reset-pass">New Secure Password</Label>
              <Input
                id="reset-pass"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
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
              Are you sure you want to delete <strong className="text-zinc-100">{deleteTarget?.name}</strong> ({deleteTarget?.email})?
              This action is permanent and will remove their access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
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
