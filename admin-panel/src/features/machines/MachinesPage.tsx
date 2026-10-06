import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { machinesApi, type CreateMachineInput } from '@/lib/api/machinesApi'
import type { Machine } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Skeleton } from '@/components/ui/skeleton'
import { FormattedDate } from '@/components/ui/formatted-date'
import { CopyableCode } from '@/components/ui/copyable-code'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit2,
  Trash2,
  Layers,
  RefreshCw,
  CheckCircle,
  Cpu,
} from 'lucide-react'

export const MachinesPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null)
  const [deletingMachine, setDeletingMachine] = useState<Machine | null>(null)
  const [formData, setFormData] = useState<CreateMachineInput>({
    name: '',
    code: '',
    description: '',
    location: '',
  })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { data: machines = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['adminMachines'],
    queryFn: () => machinesApi.listMachines(),
  })

  const createMutation = useMutation({
    mutationFn: (input: CreateMachineInput) => machinesApi.createMachine(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMachines'] })
      setIsCreateOpen(false)
      setFormData({ name: '', code: '', description: '', location: '' })
      setSuccessMsg('Machine created successfully.')
      setTimeout(() => setSuccessMsg(null), 4000)
    },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateMachineInput> }) =>
      machinesApi.updateMachine(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMachines'] })
      setEditingMachine(null)
      setSuccessMsg('Machine updated successfully.')
      setTimeout(() => setSuccessMsg(null), 4000)
    },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => machinesApi.deleteMachine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMachines'] })
      setDeletingMachine(null)
      setSuccessMsg('Machine deleted successfully.')
      setTimeout(() => setSuccessMsg(null), 4000)
    },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  const filteredMachines = machines.filter((m) => {
    return (
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.code && m.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.location && m.location.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })

  const handleOpenCreate = () => {
    setErrorMsg(null)
    setFormData({ name: '', code: '', description: '', location: '' })
    setIsCreateOpen(true)
  }

  const handleOpenEdit = (m: Machine) => {
    setErrorMsg(null)
    setEditingMachine(m)
    setFormData({
      name: m.name,
      code: m.code || '',
      description: m.description || '',
      location: m.location || '',
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Cpu className="h-6 w-6 text-primary" />
            <span>Machines & Equipment</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage primary machine assets, identifier codes, and equipment metadata
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
            onClick={handleOpenCreate}
            className="h-9 gap-1.5 text-xs font-medium shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Machine</span>
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search machines, codes, locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs bg-card border-border/80"
          />
        </div>
      </div>

      {/* Machines Table with Sticky Header & Scrollable Body */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs relative">
        <div className="max-h-[calc(100vh-290px)] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/50 backdrop-blur-xs border-b border-border/70">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-xs text-muted-foreground">Machine Name</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Code / Serial</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Location</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Description</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Registered</TableHead>
                <TableHead className="text-right font-semibold text-xs text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredMachines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-36 text-center text-muted-foreground">
                    <p className="text-sm font-medium">No machines found.</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Click &quot;Add Machine&quot; to register equipment.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMachines.map((m) => (
                  <TableRow key={m.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell>
                      <div className="font-semibold text-foreground text-sm">{m.name}</div>
                      <div className="mt-0.5">
                        <CopyableCode value={m.id} truncateLength={8} />
                      </div>
                    </TableCell>

                    <TableCell>
                      {m.code ? (
                        <span className="inline-flex rounded-md bg-muted/80 px-2 py-0.5 font-mono text-[11px] text-foreground border border-border/60">
                          {m.code}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 text-xs">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-foreground/80 text-xs">
                      {m.location || <span className="text-muted-foreground/60">—</span>}
                    </TableCell>

                    <TableCell className="text-muted-foreground text-xs max-w-xs truncate">
                      {m.description || <span className="text-muted-foreground/60">—</span>}
                    </TableCell>

                    <TableCell className="text-xs">
                      <FormattedDate value={m.created_at} format="date-only" />
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 p-1.5">
                          <DropdownMenuLabel className="text-xs">Machine Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild className="cursor-pointer">
                            <Link to={`/sections?machine_id=${m.id}`} className="flex items-center">
                              <Layers className="mr-2 h-4 w-4 text-primary" />
                              View Components
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEdit(m)} className="cursor-pointer">
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletingMachine(m)}
                            className="text-rose-500 focus:text-rose-600 focus:bg-rose-500/10 cursor-pointer"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Machine
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
      </div>

      {/* Create Machine Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register New Machine</DialogTitle>
            <DialogDescription>
              Add an industrial machine or plant equipment record.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="m-name" className="text-xs font-medium">Machine Name *</Label>
              <Input
                id="m-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. CNC Lathe Alpha"
                className="h-9 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-code" className="text-xs font-medium">Machine Code / Serial Tag</Label>
              <Input
                id="m-code"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. CNC-01"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-loc" className="text-xs font-medium">Floor / Location</Label>
              <Input
                id="m-loc"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Workshop Bay 3"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-desc" className="text-xs font-medium">Description</Label>
              <Textarea
                id="m-desc"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Operational notes, model specifications..."
                className="text-sm min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!formData.name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate(formData)}
            >
              {createMutation.isPending ? 'Saving...' : 'Register Machine'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Machine Dialog */}
      <Dialog open={!!editingMachine} onOpenChange={() => setEditingMachine(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Machine Record</DialogTitle>
            <DialogDescription>
              Update machine details and specifications.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-m-name" className="text-xs font-medium">Machine Name *</Label>
              <Input
                id="edit-m-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-9 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-m-code" className="text-xs font-medium">Code / Serial Tag</Label>
              <Input
                id="edit-m-code"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-m-loc" className="text-xs font-medium">Location</Label>
              <Input
                id="edit-m-loc"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-m-desc" className="text-xs font-medium">Description</Label>
              <Textarea
                id="edit-m-desc"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="text-sm min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setEditingMachine(null)}>
              Cancel
            </Button>
            <Button
              disabled={!formData.name.trim() || updateMutation.isPending}
              onClick={() => {
                if (editingMachine) {
                  updateMutation.mutate({ id: editingMachine.id, data: formData })
                }
              }}
            >
              {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Machine AlertDialog */}
      <AlertDialog open={!!deletingMachine} onOpenChange={() => setDeletingMachine(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Machine Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong className="text-foreground">{deletingMachine?.name}</strong>?
              This will remove the machine and its associated sections and usage records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => {
                if (deletingMachine) {
                  deleteMutation.mutate(deletingMachine.id)
                }
              }}
            >
              Delete Machine
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
