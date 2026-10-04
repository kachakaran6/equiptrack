import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { machinesApi, type CreateMachineInput } from '@/lib/api/machinesApi'
import type { Machine } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit2,
  Trash2,
  Layers,
  RefreshCw,
  CheckCircle,
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
            Machines & Equipment
          </h1>
          <p className="text-xs text-zinc-400">
            Manage primary machine assets, identifier codes, and equipment metadata
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
            onClick={handleOpenCreate}
            className="h-8 gap-1.5 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Machine
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded border border-emerald-900/60 bg-emerald-950/30 p-3 text-xs text-emerald-300">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <Input
            placeholder="Search machines, codes, locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Machines Table with Sticky Header & Scrollable Body */}
      <div className="rounded-md border border-zinc-800/80 bg-zinc-950/70 overflow-hidden max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-auto relative">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-zinc-900 shadow-sm">
            <TableRow className="border-b border-zinc-800 bg-zinc-900 hover:bg-zinc-900">
              <TableHead className="text-zinc-300 bg-zinc-900 font-semibold">Machine Name</TableHead>
              <TableHead className="text-zinc-300 bg-zinc-900 font-semibold">Code / Tag</TableHead>
              <TableHead className="text-zinc-300 bg-zinc-900 font-semibold">Location</TableHead>
              <TableHead className="text-zinc-300 bg-zinc-900 font-semibold">Description</TableHead>
              <TableHead className="text-zinc-300 bg-zinc-900 font-semibold">Registered</TableHead>
              <TableHead className="text-right text-zinc-300 bg-zinc-900 font-semibold">Actions</TableHead>
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
                <TableCell colSpan={6} className="h-32 text-center text-zinc-500">
                  No machines found. Click &quot;Add Machine&quot; to register equipment.
                </TableCell>
              </TableRow>
            ) : (
              filteredMachines.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="font-semibold text-zinc-100">{m.name}</div>
                    <div className="font-mono text-[10px] text-zinc-500">{m.id}</div>
                  </TableCell>

                  <TableCell>
                    {m.code ? (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {m.code}
                      </Badge>
                    ) : (
                      <span className="text-zinc-600 font-mono text-[11px]">—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-zinc-300 text-xs">
                    {m.location || <span className="text-zinc-600">—</span>}
                  </TableCell>

                  <TableCell className="text-zinc-400 text-xs max-w-xs truncate">
                    {m.description || <span className="text-zinc-600">—</span>}
                  </TableCell>

                  <TableCell className="font-mono text-[11px] text-zinc-400">
                    {new Date(m.created_at).toLocaleDateString()}
                  </TableCell>

                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link to={`/sections?machine_id=${m.id}`} className="flex items-center">
                            <Layers className="mr-2 h-3.5 w-3.5" />
                            View Sections
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEdit(m)}>
                          <Edit2 className="mr-2 h-3.5 w-3.5" />
                          Edit Machine
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletingMachine(m)}
                          className="text-red-400 focus:text-red-300"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
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
            <div className="rounded border border-red-900/60 bg-red-950/30 p-2.5 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="m-name">Machine Name *</Label>
              <Input
                id="m-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. CNC Lathe Alpha"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="m-code">Machine Code / Serial Tag</Label>
              <Input
                id="m-code"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. CNC-01"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="m-loc">Floor / Location</Label>
              <Input
                id="m-loc"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Workshop Bay 3"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="m-desc">Description</Label>
              <Textarea
                id="m-desc"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Operational notes, model details..."
              />
            </div>
          </div>

          <DialogFooter>
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
            <div className="rounded border border-red-900/60 bg-red-950/30 p-2.5 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="edit-m-name">Machine Name *</Label>
              <Input
                id="edit-m-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-m-code">Code / Serial Tag</Label>
              <Input
                id="edit-m-code"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-m-loc">Location</Label>
              <Input
                id="edit-m-loc"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-m-desc">Description</Label>
              <Textarea
                id="edit-m-desc"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
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
              Are you sure you want to delete <strong className="text-zinc-100">{deletingMachine?.name}</strong>?
              This will remove the machine and its associated sections and usage records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
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
