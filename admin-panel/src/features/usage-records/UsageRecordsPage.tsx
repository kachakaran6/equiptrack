import type { FC } from 'react'
import { useState } from 'react'
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
import { FormattedDate } from '@/components/ui/formatted-date'
import { StatusPill } from '@/components/ui/status-pill'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit2,
  Trash2,
  RefreshCw,
  CheckCircle,
  Clock,
  User as UserIcon,
} from 'lucide-react'

export const UsageRecordsPage: FC = () => {
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
      setSuccessMsg('Usage record removed successfully.')
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Equipment Usage Records
          </h1>
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
            <span>Add Usage Record</span>
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search records, operators, notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Machine Filter:</span>
          <Select value={selectedMachine} onValueChange={setSelectedMachine}>
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

      {/* Usage Records Table Container */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold text-xs text-muted-foreground">Machine / Section</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Operator / User</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Start Date</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">End Date</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Usage Days</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Notes</TableHead>
                <TableHead className="text-right font-semibold text-xs text-muted-foreground">Actions</TableHead>
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
                  <TableCell colSpan={7} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Clock className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm font-medium text-foreground">No usage records found</p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {searchTerm ? 'No records match your search filter.' : 'Log your first equipment run session to track operating duration.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell>
                      <div className="font-medium text-foreground text-sm">
                        {r.machine_name || 'Machine ' + r.machine_id.slice(0, 6)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.section_name || 'Section ' + r.section_id.slice(0, 6)}
                      </div>
                    </TableCell>

                    <TableCell>
                      {r.user_name ? (
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium text-foreground">{r.user_name}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-mono text-muted-foreground">
                          {r.user_id ? r.user_id.slice(0, 8) + '...' : '—'}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      <FormattedDate value={r.start_date} />
                    </TableCell>

                    <TableCell className="text-xs">
                      {r.end_date ? (
                        <FormattedDate value={r.end_date} />
                      ) : (
                        <StatusPill variant="success" label="Ongoing" pulse />
                      )}
                    </TableCell>

                    <TableCell>
                      <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                        {r.usage_days}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">
                        {r.usage_days === 1 ? 'day' : 'days'}
                      </span>
                    </TableCell>

                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {r.notes || <span className="text-muted-foreground/40 italic">No notes</span>}
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
                          <DropdownMenuItem onClick={() => handleOpenEdit(r)} className="cursor-pointer">
                            <Edit2 className="mr-2 h-3.5 w-3.5" />
                            Edit Record
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletingRecord(r)}
                            className="text-rose-600 focus:text-rose-600 dark:text-rose-400 cursor-pointer"
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
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
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
                      {m.name} {m.code ? `(${m.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
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

            <div className="space-y-1.5">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rec-start">Start Date *</Label>
                <Input
                  id="rec-start"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rec-end">End Date (Optional)</Label>
                <Input
                  id="rec-end"
                  type="date"
                  value={formData.end_date || ''}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-notes">Notes / Observations</Label>
              <Textarea
                id="rec-notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Shift details, operating parameters, remarks..."
                className="resize-none h-20"
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
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
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
                      {m.name} {m.code ? `(${m.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-rec-start">Start Date *</Label>
                <Input
                  id="edit-rec-start"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-rec-end">End Date</Label>
                <Input
                  id="edit-rec-end"
                  type="date"
                  value={formData.end_date || ''}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-rec-notes">Notes</Label>
              <Textarea
                id="edit-rec-notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="resize-none h-20"
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
              className="bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700"
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
