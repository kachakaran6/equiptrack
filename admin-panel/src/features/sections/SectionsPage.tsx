import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { sectionsApi, type CreateSectionInput } from '@/lib/api/sectionsApi'
import { machinesApi } from '@/lib/api/machinesApi'
import type { Section } from '@/types/api'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  RefreshCw,
  CheckCircle,
} from 'lucide-react'

export const SectionsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialMachineId = searchParams.get('machine_id') || 'ALL'

  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMachine, setSelectedMachine] = useState<string>(initialMachineId)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<Section | null>(null)
  const [deletingSection, setDeletingSection] = useState<Section | null>(null)
  const [formData, setFormData] = useState<CreateSectionInput>({
    name: '',
    machine_id: '',
    description: '',
  })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { data: machines = [] } = useQuery({
    queryKey: ['adminMachines'],
    queryFn: () => machinesApi.listMachines(),
  })

  const { data: sections = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['adminSections', selectedMachine],
    queryFn: () => sectionsApi.listSections(selectedMachine === 'ALL' ? undefined : selectedMachine),
  })

  const createMutation = useMutation({
    mutationFn: (input: CreateSectionInput) => sectionsApi.createSection(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSections'] })
      setIsCreateOpen(false)
      setFormData({ name: '', machine_id: '', description: '' })
      setSuccessMsg('Section created successfully.')
      setTimeout(() => setSuccessMsg(null), 4000)
    },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateSectionInput> }) =>
      sectionsApi.updateSection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSections'] })
      setEditingSection(null)
      setSuccessMsg('Section updated successfully.')
      setTimeout(() => setSuccessMsg(null), 4000)
    },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sectionsApi.deleteSection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSections'] })
      setDeletingSection(null)
      setSuccessMsg('Section removed successfully.')
      setTimeout(() => setSuccessMsg(null), 4000)
    },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  const handleMachineFilterChange = (machineId: string) => {
    setSelectedMachine(machineId)
    if (machineId === 'ALL') {
      searchParams.delete('machine_id')
    } else {
      searchParams.set('machine_id', machineId)
    }
    setSearchParams(searchParams)
  }

  const filteredSections = sections.filter((s) => {
    return (
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.machine_name && s.machine_name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })

  const handleOpenCreate = () => {
    setErrorMsg(null)
    setFormData({
      name: '',
      machine_id: selectedMachine !== 'ALL' ? selectedMachine : (machines[0]?.id || ''),
      description: '',
    })
    setIsCreateOpen(true)
  }

  const handleOpenEdit = (sec: Section) => {
    setErrorMsg(null)
    setEditingSection(sec)
    setFormData({
      name: sec.name,
      machine_id: sec.machine_id,
      description: sec.description || '',
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
            Machine Sections & Components
          </h1>
          <p className="text-xs text-zinc-400">
            Manage sub-assemblies and modular sections assigned to equipment
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
            disabled={machines.length === 0}
            className="h-8 gap-1.5 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Section
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded border border-emerald-900/60 bg-emerald-950/30 p-3 text-xs text-emerald-300">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <Input
            placeholder="Search sections or machine names..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-zinc-400">Parent Machine:</span>
          <Select value={selectedMachine} onValueChange={handleMachineFilterChange}>
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue placeholder="All Machines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Machines</SelectItem>
              {machines.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name} {m.code ? `(${m.code})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sections Table */}
      <div className="rounded-md border border-zinc-800 bg-zinc-950/70 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Section Name</TableHead>
              <TableHead>Machine</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredSections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-zinc-500">
                  No sections found. Add a section to attach it to a machine.
                </TableCell>
              </TableRow>
            ) : (
              filteredSections.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-semibold text-zinc-100">{s.name}</div>
                    <div className="font-mono text-[10px] text-zinc-500">{s.id}</div>
                  </TableCell>

                  <TableCell>
                    <div className="text-zinc-200 font-medium">{s.machine_name || 'Machine ' + s.machine_id.slice(0, 6)}</div>
                    <div className="font-mono text-[10px] text-zinc-500">{s.machine_id}</div>
                  </TableCell>

                  <TableCell className="text-zinc-400 text-xs max-w-xs truncate">
                    {s.description || <span className="text-zinc-600">—</span>}
                  </TableCell>

                  <TableCell className="font-mono text-[11px] text-zinc-400">
                    {new Date(s.created_at).toLocaleDateString()}
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
                        <DropdownMenuItem onClick={() => handleOpenEdit(s)}>
                          <Edit2 className="mr-2 h-3.5 w-3.5" />
                          Edit Section
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletingSection(s)}
                          className="text-red-400 focus:text-red-300"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete Section
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

      {/* Create Section Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Machine Section</DialogTitle>
            <DialogDescription>
              Assign a component or sub-assembly to a machine.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="rounded border border-red-900/60 bg-red-950/30 p-2.5 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="sec-name">Section Name *</Label>
              <Input
                id="sec-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Spindle Assembly"
                required
              />
            </div>

            <div className="space-y-1">
              <Label>Parent Machine *</Label>
              <Select
                value={formData.machine_id}
                onValueChange={(val) => setFormData({ ...formData, machine_id: val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Machine" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} {m.code ? `(${m.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="sec-desc">Description</Label>
              <Textarea
                id="sec-desc"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Component specifications, maintenance parameters..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!formData.name.trim() || !formData.machine_id || createMutation.isPending}
              onClick={() => createMutation.mutate(formData)}
            >
              {createMutation.isPending ? 'Saving...' : 'Add Section'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Section Dialog */}
      <Dialog open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Section Record</DialogTitle>
            <DialogDescription>
              Update section attributes and specifications.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="rounded border border-red-900/60 bg-red-950/30 p-2.5 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="edit-sec-name">Section Name *</Label>
              <Input
                id="edit-sec-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <Label>Parent Machine *</Label>
              <Select
                value={formData.machine_id}
                onValueChange={(val) => setFormData({ ...formData, machine_id: val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} {m.code ? `(${m.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-sec-desc">Description</Label>
              <Textarea
                id="edit-sec-desc"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSection(null)}>
              Cancel
            </Button>
            <Button
              disabled={!formData.name.trim() || !formData.machine_id || updateMutation.isPending}
              onClick={() => {
                if (editingSection) {
                  updateMutation.mutate({ id: editingSection.id, data: formData })
                }
              }}
            >
              {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Section AlertDialog */}
      <AlertDialog open={!!deletingSection} onOpenChange={() => setDeletingSection(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong className="text-zinc-100">{deletingSection?.name}</strong>?
              This action cannot be undone and will delete associated usage records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingSection) {
                  deleteMutation.mutate(deletingSection.id)
                }
              }}
            >
              Delete Section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
