import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { databaseApi } from '@/lib/api/databaseApi'
import type { TableColumnMetadata } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'

export const TableViewerPage: React.FC = () => {
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
  React.useEffect(() => {
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
      <div key={col.column_name} className="space-y-1">
        <Label htmlFor={`field-${col.column_name}`} className="font-mono text-xs">
          {col.column_name} {col.is_nullable ? '(optional)' : '*'}
          <span className="text-[10px] text-zinc-500 ml-1 font-normal">({col.data_type})</span>
        </Label>

        {isBool ? (
          <div className="flex items-center gap-2 pt-1">
            <Switch
              id={`field-${col.column_name}`}
              checked={Boolean(value)}
              onCheckedChange={(checked) => setFormData({ ...formData, [col.column_name]: checked })}
            />
            <span className="font-mono text-xs text-zinc-400">{value ? 'true' : 'false'}</span>
          </div>
        ) : isJson || isText ? (
          <Textarea
            id={`field-${col.column_name}`}
            value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
            onChange={(e) => setFormData({ ...formData, [col.column_name]: e.target.value })}
            placeholder={isJson ? '{"key": "value"}' : 'Enter text...'}
          />
        ) : (
          <Input
            id={`field-${col.column_name}`}
            value={String(value)}
            onChange={(e) => setFormData({ ...formData, [col.column_name]: e.target.value })}
            placeholder={`Enter ${col.column_name}`}
            required={!col.is_nullable}
          />
        )}
      </div>
    )
  }

  const activeColumns = schema.filter((col) => visibleColumns[col.column_name] !== false)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Link to="/database">
            <Button variant="outline" size="icon" className="h-8 w-8 border-zinc-800 bg-zinc-900/50">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-zinc-100 font-mono flex items-center gap-2">
              <span>{tableName}</span>
              <Badge variant="outline" className="font-mono text-[10px]">
                {totalRows.toLocaleString()} rows
              </Badge>
            </h1>
            <p className="text-xs text-zinc-400">
              PostgreSQL Table View &amp; Schema Metadata
            </p>
          </div>
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
            Insert Row
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded border border-emerald-900/60 bg-emerald-950/30 p-3 text-xs text-emerald-300">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'data' | 'schema')}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="data">Data Rows ({totalRows})</TabsTrigger>
            <TabsTrigger value="schema">Table Schema ({schema.length} Columns)</TabsTrigger>
          </TabsList>

          {activeTab === 'data' && (
            <div className="flex items-center gap-2">
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                <Input
                  placeholder="Search rows..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setPage(1)
                  }}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              {/* Column Visibility Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs border-zinc-800 bg-zinc-900/50">
                    <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
                    Columns
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
        <TabsContent value="data" className="space-y-3">
          <div className="rounded-md border border-zinc-800 bg-zinc-950/70 overflow-auto max-h-[calc(100vh-320px)]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800">
                <TableRow>
                  {activeColumns.map((col) => (
                    <TableHead key={col.column_name} className="whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        {col.is_primary_key && <Key className="h-3 w-3 text-amber-400" />}
                        {col.column_name}
                      </span>
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell colSpan={activeColumns.length + 1} className="h-32 text-center text-zinc-500">
                      No records found in table {tableName}.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, rIdx) => {
                    const primaryKeyCol = schema.find((c) => c.is_primary_key)?.column_name || 'id'
                    const rowId = String(row[primaryKeyCol] ?? rIdx)

                    return (
                      <TableRow key={rowId} className="hover:bg-zinc-900/60 font-mono text-xs">
                        {activeColumns.map((col) => {
                          const val = row[col.column_name]
                          return (
                            <TableCell key={col.column_name} className="max-w-xs truncate text-zinc-200">
                              {val === null || val === undefined ? (
                                <span className="text-zinc-600 font-sans italic text-[11px]">null</span>
                              ) : typeof val === 'boolean' ? (
                                <Badge variant={val ? 'success' : 'secondary'} className="text-[9px]">
                                  {val ? 'TRUE' : 'FALSE'}
                                </Badge>
                              ) : typeof val === 'object' ? (
                                <span className="text-zinc-400 text-[10px]">{JSON.stringify(val)}</span>
                              ) : col.column_name.includes('_at') && typeof val === 'string' ? (
                                <span className="text-[11px] text-zinc-400">{new Date(val).toLocaleString()}</span>
                              ) : (
                                String(val)
                              )}
                            </TableCell>
                          )
                        })}

                        <TableCell className="text-right font-sans">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem onClick={() => handleOpenEdit(row)}>
                                <Edit2 className="mr-2 h-3.5 w-3.5" />
                                Edit Row
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeletingRowId(rowId)}
                                className="text-red-400 focus:text-red-300"
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

          {/* Pagination */}
          <div className="flex items-center justify-between font-mono text-xs text-zinc-400 px-1">
            <div>
              Showing {rows.length > 0 ? (page - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(page * pageSize, totalRows)} of {totalRows} records
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || dataLoading}
                className="h-7 px-2 border-zinc-800 bg-zinc-900/50"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
              </Button>
              <span>
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || dataLoading}
                className="h-7 px-2 border-zinc-800 bg-zinc-900/50"
              >
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* SCHEMA TAB */}
        <TabsContent value="schema">
          <div className="rounded-md border border-zinc-800 bg-zinc-950/70 overflow-auto max-h-[calc(100vh-320px)]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800">
                <TableRow>
                  <TableHead>Column Name</TableHead>
                  <TableHead>Data Type</TableHead>
                  <TableHead>Nullable</TableHead>
                  <TableHead>Key Type</TableHead>
                  <TableHead>Default Value</TableHead>
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
                    <TableRow key={col.column_name} className="font-mono text-xs">
                      <TableCell className="font-semibold text-zinc-100 flex items-center gap-2">
                        {col.is_primary_key && <Key className="h-3.5 w-3.5 text-amber-400" />}
                        {col.column_name}
                      </TableCell>

                      <TableCell className="text-zinc-300">
                        <Badge variant="outline" className="text-[10px]">
                          {col.data_type}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge variant={col.is_nullable ? 'secondary' : 'default'} className="text-[10px]">
                          {col.is_nullable ? 'NULLABLE' : 'NOT NULL'}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {col.is_primary_key ? (
                          <Badge variant="warning" className="text-[10px]">PRIMARY KEY</Badge>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-zinc-400 text-[11px] truncate max-w-xs">
                        {col.column_default || <span className="text-zinc-600 font-sans italic">None</span>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
            <div className="rounded border border-red-900/60 bg-red-950/30 p-2.5 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          <div className="space-y-3 py-2">
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
            <div className="rounded border border-red-900/60 bg-red-950/30 p-2.5 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          <div className="space-y-3 py-2">
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
              Are you sure you want to delete this record from <strong className="text-zinc-100 font-mono">{tableName}</strong>?
              This operation cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
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
