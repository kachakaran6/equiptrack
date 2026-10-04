import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usageRecordsApi, type CreateUsageRecordInput } from '@/lib/api/usageRecordsApi'
import { machinesApi } from '@/lib/api/machinesApi'
import { sectionsApi } from '@/lib/api/sectionsApi'
import { usersApi } from '@/lib/api/usersApi'
import type { UsageRecord } from '@/types/api'
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

export const UsageRecordsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMachine, setSelectedMachine] = useState<string>('ALL')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<UsageRecord | null>(null)
  const [deletingRecord, setDeletingRecord] = useState<UsageRecord | null>(null)

  const [formData, setFormData] = useState<CreateUsageRecordInput>({
    machine_id: '',
    section_id: '',
    user_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: null,
    notes: '',
  })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { data: machines = [] } = useQuery({
    queryKey: ['adminMachines'],
    queryFn: () => machinesApi.listMachines(),
  })

  const { data: users = [] } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => usersApi.listUsers(),
  })

  const { data: sections = [] } = useQuery({
    queryKey: ['adminAllSections', formData.machine_id],
    queryFn: () => sectionsApi.listSections(formData.machine_id ? formData.machine_id : undefined),
  })

  const { data: usageRecords = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['adminUsageRecords', selectedMachine],
    queryFn: () => usageRecordsApi.listUsageRecords(selectedMachine !== 'ALL' ? { machine_id: selectedMachine } : undefined),
  })

  const createMutation = useMutation({
    mutationFn: (input: CreateUsageRecordInput) => usageRecordsApi.createUsageRecord(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsageRecords'] })
      setIsCreateOpen(false)
      setFormData({
        machine_id: '',
        section_id: '',
        user_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: null,
        notes: '',
      })
      setSuccessMsg('Usage record added successfully.')
      setTimeout(() => setSuccessMsg(null), 4000)
    },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateUsageRecordInput> }) =>
      usageRecordsApi.updateUsageRecord(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsageRecords'] })
      setEditingRecord(null)
      setSuccessMsg('Usage record updated successfully.')
      setTimeout(() => setSuccessMsg(null), 4000)
    },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usageRecordsApi.deleteUsageRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsageRecords'] })
      setDeletingRecord(null)
      setSuccessMsg('Usage record removed.')
      setTimeout(() => setSuccessMsg(null), 4000)
    },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  const filteredRecords = usageRecords.filter((r) => {
    return (
      (r.machine_name && r.machine_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.section_name && r.section_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.user_name && r.user_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.notes && r.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })

  const handleOpenCreate = () => {
    setErrorMsg(null)
    const defMachine = selectedMachine !== 'ALL' ? selectedMachine : (machines[0]?.id || '')
    setFormData({
      machine_id: defMachine,
      section_id: '',
      user_id: users[0]?.id || '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
      notes: '',
    })
    setIsCreateOpen(true)
  }

  const handleOpenEdit = (rec: UsageRecord) => {
    setErrorMsg(null)
    setEditingRecord(rec)
    setFormData({
      machine_id: rec.machine_id,
      section_id: rec.section_id,
      user_id: rec.user_id || '',
      start_date: rec.start_date.split('T')[0],
      end_date: rec.end_date ? rec.end_date.split('T')[0] : null,
      notes: rec.notes || '',
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
            Equipment Usage Records
          </h1>
          <p className="text-xs text-zinc-400">
            Log, inspect, and audit equipment operating days, dates, and operator assignments
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
            Add Usage Record
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
            placeholder="Search records, operators, notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-zinc-400">Machine Filter:</span>
          <Select value={selectedMachine} onValueChange={setSelectedMachine}>
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue placeholder="All Machines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Machines</SelectItem>
              {machines.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-zinc-800 bg-zinc-950/70 overflow-auto max-h-[calc(100vh-280px)]">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800">
            <TableRow>
              <TableHead>Machine / Section</TableHead>
              <TableHead>Operator / User</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Usage Days</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-zinc-500">
                  No usage records found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRecords.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-semibold text-zinc-100">{r.machine_name || 'Machine ' + r.machine_id.slice(0, 6)}</div>
                    <div className="font-mono text-[11px] text-zinc-400">{r.section_name || 'Section ' + r.section_id.slice(0, 6)}</div>
                  </TableCell>

                  <TableCell className="text-zinc-300 text-xs">
                    {r.user_name || <span className="font-mono text-zinc-600 text-[11px]">{r.user_id ? r.user_id.slice(0, 8) : '—'}</span>}
                  </TableCell>

                  <TableCell className="font-mono text-[11px] text-zinc-300">
                    {new Date(r.start_date).toLocaleDateString()}
                  </TableCell>

                  <TableCell className="font-mono text-[11px] text-zinc-400">
                    {r.end_date ? new Date(r.end_date).toLocaleDateString() : <span className="text-emerald-400 font-medium">Ongoing</span>}
                  </TableCell>

                  <TableCell className="font-mono font-semibold text-zinc-200 text-xs">
                    {r.usage_days} {r.usage_days === 1 ? 'day' : 'days'}
                  </TableCell>

                  <TableCell className="text-zinc-400 text-xs max-w-xs truncate">
                    {r.notes || <span className="text-zinc-600">—</span>}
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
                        <DropdownMenuItem onClick={() => handleOpenEdit(r)}>
                          <Edit2 className="mr-2 h-3.5 w-3.5" />
                          Edit Record
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletingRecord(r)}
                          className="text-red-400 focus:text-red-300"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete Record
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

      {/* Create Usage Record Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Usage Record</DialogTitle>
            <DialogDescription>
              Create an operational run record for machine sub-assemblies.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="rounded border border-red-900/60 bg-red-950/30 p-2.5 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Machine *</Label>
              <Select
                value={formData.machine_id}
                onValueChange={(val) => setFormData({ ...formData, machine_id: val, section_id: '' })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Machine" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Section *</Label>
              <Select
                value={formData.section_id}
                onValueChange={(val) => setFormData({ ...formData, section_id: val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Section" />
                </SelectTrigger>
                <SelectContent>
                  {sections
                    .filter((s) => !formData.machine_id || s.machine_id === formData.machine_id)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Operator / User</Label>
              <Select
                value={formData.user_id || ''}
                onValueChange={(val) => setFormData({ ...formData, user_id: val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select User" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="rec-start">Start Date *</Label>
                <Input
                  id="rec-start"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="rec-end">End Date (Optional)</Label>
                <Input
                  id="rec-end"
                  type="date"
                  value={formData.end_date || ''}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="rec-notes">Notes / Observations</Label>
              <Textarea
                id="rec-notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Shift details, parts produced, remarks..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!formData.machine_id || !formData.section_id || createMutation.isPending}
              onClick={() => createMutation.mutate(formData)}
            >
              {createMutation.isPending ? 'Saving...' : 'Add Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Usage Record Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Usage Record</DialogTitle>
            <DialogDescription>
              Modify date range, section assignment, or operator notes.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="rounded border border-red-900/60 bg-red-950/30 p-2.5 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Machine *</Label>
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
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Section *</Label>
              <Select
                value={formData.section_id}
                onValueChange={(val) => setFormData({ ...formData, section_id: val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="edit-rec-start">Start Date *</Label>
                <Input
                  id="edit-rec-start"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-rec-end">End Date</Label>
                <Input
                  id="edit-rec-end"
                  type="date"
                  value={formData.end_date || ''}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-rec-notes">Notes</Label>
              <Textarea
                id="edit-rec-notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRecord(null)}>
              Cancel
            </Button>
            <Button
              disabled={!formData.machine_id || !formData.section_id || updateMutation.isPending}
              onClick={() => {
                if (editingRecord) {
                  updateMutation.mutate({ id: editingRecord.id, data: formData })
                }
              }}
            >
              {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Record AlertDialog */}
      <AlertDialog open={!!deletingRecord} onOpenChange={() => setDeletingRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Usage Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this usage record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingRecord) {
                  deleteMutation.mutate(deletingRecord.id)
                }
              }}
            >
              Delete Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
