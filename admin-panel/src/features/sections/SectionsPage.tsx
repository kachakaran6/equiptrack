import type { FC } from 'react'
import { useState } from 'react'
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
import { CopyableCode } from '@/components/ui/copyable-code'
import { FormattedDate } from '@/components/ui/formatted-date'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit2,
  Trash2,
  RefreshCw,
  CheckCircle,
  Layers,
  Cpu,
} from 'lucide-react'

export const SectionsPage: FC = () => {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Machine Sections
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage sub-assemblies and modular sections assigned to production equipment
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 gap-2 shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreate}
            disabled={machines.length === 0}
            className="h-9 gap-2 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Section</span>
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filters Card */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sections or machine names..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Parent Machine:</span>
          <Select value={selectedMachine} onValueChange={handleMachineFilterChange}>
            <SelectTrigger className="w-56 h-9 text-xs">
              <SelectValue placeholder="All Machines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Machines ({machines.length})</SelectItem>
              {machines.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name} {m.code ? `(${m.code})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sections Table Container */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold text-xs text-muted-foreground">Section Name</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Parent Machine</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Description</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Created Date</TableHead>
                <TableHead className="text-right font-semibold text-xs text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredSections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm font-medium text-foreground">No sections found</p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {searchTerm ? 'No sections match your search filter.' : 'Add your first modular section to attach it to a machine.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSections.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          <Layers className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground text-sm">{s.name}</div>
                          <CopyableCode value={s.id} truncateLength={8} className="text-[11px] text-muted-foreground" />
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Cpu className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium text-foreground">
                          {s.machine_name || 'Machine ' + s.machine_id.slice(0, 6)}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground pl-5.5 font-mono">
                        {s.machine_id.slice(0, 8)}...
                      </div>
                    </TableCell>

                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {s.description || <span className="text-muted-foreground/40 italic">No description</span>}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      <FormattedDate value={s.created_at} />
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleOpenEdit(s)} className="cursor-pointer">
                            <Edit2 className="mr-2 h-3.5 w-3.5" />
                            Edit Section
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletingSection(s)}
                            className="text-rose-600 focus:text-rose-600 dark:text-rose-400 cursor-pointer"
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
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="sec-name">Section Name *</Label>
              <Input
                id="sec-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Spindle Assembly"
                required
              />
            </div>

            <div className="space-y-1.5">
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

            <div className="space-y-1.5">
              <Label htmlFor="sec-desc">Description</Label>
              <Textarea
                id="sec-desc"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Component specifications, maintenance parameters..."
                className="resize-none h-24"
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
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-sec-name">Section Name *</Label>
              <Input
                id="edit-sec-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
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

            <div className="space-y-1.5">
              <Label htmlFor="edit-sec-desc">Description</Label>
              <Textarea
                id="edit-sec-desc"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="resize-none h-24"
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
              Are you sure you want to delete <strong className="text-foreground">{deletingSection?.name}</strong>?
              This action cannot be undone and will delete associated usage records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700"
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
