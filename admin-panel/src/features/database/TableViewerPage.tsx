import type { FC } from 'react'
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { databaseApi } from '@/lib/api/databaseApi'
import type { TableColumnMetadata } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { StatusPill } from '@/components/ui/status-pill'
import { FormattedDate } from '@/components/ui/formatted-date'
import {
  ArrowLeft,
  Search,
  Plus,
  MoreHorizontal,
  Edit2,
  Trash2,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Key,
  CheckCircle,
  Database,
} from 'lucide-react'

export const TableViewerPage: FC = () => {
  const { table } = useParams<{ table: string }>()
  const queryClient = useQueryClient()
  const tableName = table || ''

  const [activeTab, setActiveTab] = useState<'data' | 'schema'>('data')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 15

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({})

  // Row CRUD states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null)
  const [deletingRowId, setDeletingRowId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // 1. Fetch Schema
  const { data: schema = [], isLoading: schemaLoading } = useQuery({
    queryKey: ['tableSchema', tableName],
    queryFn: () => databaseApi.getTableSchema(tableName),
    enabled: !!tableName,
  })

  // 2. Fetch Data Rows
  const {
    data: rowsResult,
    isLoading: dataLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['tableRows', tableName, page, searchTerm],
    queryFn: () =>
      databaseApi.getTableRows(tableName, {
        page,
        limit: pageSize,
        search: searchTerm || undefined,
      }),
    enabled: !!tableName,
  })

  const rows = rowsResult?.rows || []
  const totalRows = rowsResult?.total || 0
  const totalPages = Math.ceil(totalRows / pageSize) || 1

  // Set visible columns once schema is loaded
  useEffect(() => {
    if (schema.length > 0 && Object.keys(visibleColumns).length === 0) {
      const initial: Record<string, boolean> = {}
      schema.forEach((col) => {
        initial[col.column_name] = true
      })
      setVisibleColumns(initial)
    }
  }, [schema, visibleColumns])

  // Create Row Mutation
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => databaseApi.createRow(tableName, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tableRows', tableName] })
      setIsCreateOpen(false)
      setFormData({})
      setSuccessMsg('Record successfully inserted.')
      setTimeout(() => setSuccessMsg(null), 4000)
    },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  // Update Row Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      databaseApi.updateRow(tableName, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tableRows', tableName] })
      setEditingRow(null)
      setSuccessMsg('Record successfully updated.')
      setTimeout(() => setSuccessMsg(null), 4000)
    },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  // Delete Row Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => databaseApi.deleteRow(tableName, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tableRows', tableName] })
      setDeletingRowId(null)
      setSuccessMsg('Record removed.')
      setTimeout(() => setSuccessMsg(null), 4000)
    },
    onError: (err: Error) => setErrorMsg(err.message),
  })

  const handleOpenCreate = () => {
    setErrorMsg(null)
    const initial: Record<string, unknown> = {}
    schema.forEach((col) => {
      if (!col.is_primary_key && col.column_name !== 'created_at' && col.column_name !== 'updated_at') {
        initial[col.column_name] = ''
      }
    })
    setFormData(initial)
    setIsCreateOpen(true)
  }

  const handleOpenEdit = (row: Record<string, unknown>) => {
    setErrorMsg(null)
    setEditingRow(row)
    const formValues: Record<string, unknown> = {}
    schema.forEach((col) => {
      if (!col.is_primary_key && col.column_name !== 'created_at' && col.column_name !== 'updated_at') {
        formValues[col.column_name] = row[col.column_name] ?? ''
      }
    })
    setFormData(formValues)
  }

  const renderFormField = (col: TableColumnMetadata) => {
    if (col.is_primary_key || col.column_name === 'created_at' || col.column_name === 'updated_at') {
      return null
    }

    const value = formData[col.column_name] ?? ''
    const isBool = col.data_type.toLowerCase().includes('bool')
    const isJson = col.data_type.toLowerCase().includes('json')
    const isText = col.data_type.toLowerCase().includes('text')

    return (
      <div key={col.column_name} className="space-y-1.5">
        <Label htmlFor={`field-${col.column_name}`} className="font-mono text-xs">
          {col.column_name} {col.is_nullable ? '(optional)' : '*'}
          <span className="text-[10px] text-muted-foreground ml-1 font-normal">({col.data_type})</span>
        </Label>

        {isBool ? (
          <div className="flex items-center gap-2 pt-1">
            <Switch
              id={`field-${col.column_name}`}
              checked={Boolean(value)}
              onCheckedChange={(checked) => setFormData({ ...formData, [col.column_name]: checked })}
            />
            <span className="font-mono text-xs text-muted-foreground">{value ? 'true' : 'false'}</span>
          </div>
        ) : isJson || isText ? (
          <Textarea
            id={`field-${col.column_name}`}
            value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
            onChange={(e) => setFormData({ ...formData, [col.column_name]: e.target.value })}
            placeholder={isJson ? '{"key": "value"}' : 'Enter text...'}
            className="font-mono text-xs resize-none h-20"
          />
        ) : (
          <Input
            id={`field-${col.column_name}`}
            value={String(value)}
            onChange={(e) => setFormData({ ...formData, [col.column_name]: e.target.value })}
            placeholder={`Enter ${col.column_name}`}
            required={!col.is_nullable}
            className="h-9 text-xs"
          />
        )}
      </div>
    )
  }

  const activeColumns = schema.filter((col) => visibleColumns[col.column_name] !== false)

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link to="/database">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8 px-2">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Explorer</span>
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {tableName}
            </h1>
            <span className="font-mono text-xs font-semibold tabular-nums px-2.5 py-0.5 rounded-full bg-muted border border-border text-foreground/80">
              {totalRows.toLocaleString()} rows
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            PostgreSQL Table View &amp; Schema Metadata Inspector
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
            className="h-9 gap-2 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Insert Row</span>
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'data' | 'schema')} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="data" className="text-xs">
              Data Rows ({totalRows})
            </TabsTrigger>
            <TabsTrigger value="schema" className="text-xs">
              Table Schema ({schema.length} Columns)
            </TabsTrigger>
          </TabsList>

          {activeTab === 'data' && (
            <div className="flex items-center gap-2">
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search rows..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setPage(1)
                  }}
                  className="pl-8.5 h-8 text-xs"
                />
              </div>

              {/* Column Visibility Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 shadow-xs">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span>Columns</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 max-h-64 overflow-y-auto">
                  <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {schema.map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.column_name}
                      checked={visibleColumns[col.column_name] !== false}
                      onCheckedChange={(checked) =>
                        setVisibleColumns({ ...visibleColumns, [col.column_name]: checked })
                      }
                    >
                      <span className="font-mono text-xs">{col.column_name}</span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* DATA TAB */}
        <TabsContent value="data" className="space-y-4 m-0">
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40">
                    {activeColumns.map((col) => (
                      <TableHead key={col.column_name} className="whitespace-nowrap font-mono text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          {col.is_primary_key && <Key className="h-3 w-3 text-amber-500 shrink-0" />}
                          <span>{col.column_name}</span>
                        </span>
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-semibold text-xs text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataLoading || schemaLoading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <TableRow key={idx}>
                        {activeColumns.map((c) => (
                          <TableCell key={c.column_name}><Skeleton className="h-5 w-20" /></TableCell>
                        ))}
                        <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={activeColumns.length + 1} className="h-44 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Database className="h-8 w-8 text-muted-foreground/50" />
                          <p className="text-sm font-medium text-foreground">No records found</p>
                          <p className="text-xs text-muted-foreground max-w-sm">
                            {searchTerm ? 'No rows match your search query.' : `No records currently in table ${tableName}.`}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row, rIdx) => {
                      const primaryKeyCol = schema.find((c) => c.is_primary_key)?.column_name || 'id'
                      const rowId = String(row[primaryKeyCol] ?? rIdx)

                      return (
                        <TableRow key={rowId} className="hover:bg-muted/40 transition-colors font-mono text-xs">
                          {activeColumns.map((col) => {
                            const val = row[col.column_name]
                            return (
                              <TableCell key={col.column_name} className="max-w-xs truncate text-foreground/90">
                                {val === null || val === undefined ? (
                                  <span className="text-muted-foreground/40 font-sans italic text-[11px]">null</span>
                                ) : typeof val === 'boolean' ? (
                                  <StatusPill
                                    variant={val ? 'success' : 'neutral'}
                                    label={val ? 'TRUE' : 'FALSE'}
                                    size="sm"
                                  />
                                ) : typeof val === 'object' ? (
                                  <span className="text-muted-foreground text-[10px]">{JSON.stringify(val)}</span>
                                ) : col.column_name.includes('_at') && typeof val === 'string' ? (
                                  <FormattedDate value={val} className="text-xs text-muted-foreground" />
                                ) : (
                                  String(val)
                                )}
                              </TableCell>
                            )
                          })}

                          <TableCell className="text-right font-sans">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem onClick={() => handleOpenEdit(row)} className="cursor-pointer">
                                  <Edit2 className="mr-2 h-3.5 w-3.5" />
                                  Edit Row
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeletingRowId(rowId)}
                                  className="text-rose-600 focus:text-rose-600 dark:text-rose-400 cursor-pointer"
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  Delete Row
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

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <div>
              Showing <span className="font-semibold text-foreground tabular-nums">{rows.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{' '}
              <span className="font-semibold text-foreground tabular-nums">{Math.min(page * pageSize, totalRows)}</span> of{' '}
              <span className="font-semibold text-foreground tabular-nums">{totalRows}</span> records
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || dataLoading}
                className="h-8 px-2.5 text-xs shadow-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                <span>Prev</span>
              </Button>
              <span className="font-medium text-foreground px-1">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || dataLoading}
                className="h-8 px-2.5 text-xs shadow-xs"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* SCHEMA TAB */}
        <TabsContent value="schema" className="m-0">
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold text-xs text-muted-foreground">Column Name</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground">Data Type</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground">Nullable</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground">Key Constraint</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground">Default Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schemaLoading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <TableRow key={idx}>
                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    schema.map((col) => (
                      <TableRow key={col.column_name} className="font-mono text-xs hover:bg-muted/40 transition-colors">
                        <TableCell className="font-semibold text-foreground flex items-center gap-2">
                          {col.is_primary_key && <Key className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                          <span>{col.column_name}</span>
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          <span className="px-2 py-0.5 rounded bg-muted border border-border text-[11px]">
                            {col.data_type}
                          </span>
                        </TableCell>

                        <TableCell>
                          <StatusPill
                            variant={col.is_nullable ? 'neutral' : 'info'}
                            label={col.is_nullable ? 'Nullable' : 'Not Null'}
                            size="sm"
                          />
                        </TableCell>

                        <TableCell>
                          {col.is_primary_key ? (
                            <StatusPill variant="warning" label="Primary Key" size="sm" />
                          ) : (
                            <span className="text-muted-foreground/40 italic font-sans">—</span>
                          )}
                        </TableCell>

                        <TableCell className="text-muted-foreground text-[11px] truncate max-w-xs">
                          {col.column_default || <span className="text-muted-foreground/40 font-sans italic">None</span>}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Insert Row Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">Insert Record into {tableName}</DialogTitle>
            <DialogDescription>
              Provide values for columns. Primary keys and timestamps are managed automatically.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4 py-2">
            {schema.map((col) => renderFormField(col))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate(formData)}
            >
              {createMutation.isPending ? 'Inserting...' : 'Insert Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Row Dialog */}
      <Dialog open={!!editingRow} onOpenChange={() => setEditingRow(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">Update Record in {tableName}</DialogTitle>
            <DialogDescription>
              Edit existing attributes and commit changes to the backend.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4 py-2">
            {schema.map((col) => renderFormField(col))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRow(null)}>
              Cancel
            </Button>
            <Button
              disabled={updateMutation.isPending}
              onClick={() => {
                if (editingRow) {
                  const pk = schema.find((c) => c.is_primary_key)?.column_name || 'id'
                  const id = String(editingRow[pk])
                  updateMutation.mutate({ id, data: formData })
                }
              }}
            >
              {updateMutation.isPending ? 'Updating...' : 'Save Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Row AlertDialog */}
      <AlertDialog open={!!deletingRowId} onOpenChange={() => setDeletingRowId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Table Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this record from <strong className="text-foreground font-mono">{tableName}</strong>?
              This operation cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700"
              onClick={() => {
                if (deletingRowId) {
                  deleteMutation.mutate(deletingRowId)
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
