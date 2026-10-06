import type { FC } from 'react'
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  inventoryApi,
  type InventoryTransaction,
  type InventoryProduct,
} from '@/lib/api/inventoryApi'
import {
  Search,
  ArrowLeft,
  Trash2,
  Download,
  AlertCircle,
  FileSpreadsheet,
  X,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPill } from '@/components/ui/status-pill'
import { FormattedDate } from '@/components/ui/formatted-date'

export const InventoryReportsPage: FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialProductId = searchParams.get('product_id') || 'ALL'
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId)
  const [activeTypeTab, setActiveTypeTab] = useState<'ALL' | 'IN' | 'OUT'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingTx, setDeletingTx] = useState<InventoryTransaction | null>(null)

  // Load products list for filter dropdown
  useEffect(() => {
    inventoryApi
      .listProducts()
      .then((prods) => setProducts(prods))
      .catch((err) => console.error('Failed to load products for dropdown', err))
  }, [])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await inventoryApi.listTransactions({
        product_id: selectedProductId === 'ALL' ? undefined : selectedProductId,
        type: activeTypeTab === 'ALL' ? undefined : activeTypeTab,
        search: searchQuery.trim() || undefined,
        limit: 500,
      })
      setTransactions(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load stock reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions()
  }, [selectedProductId, activeTypeTab, searchQuery])

  const confirmDelete = async () => {
    if (!deletingTx) return

    try {
      await inventoryApi.deleteTransaction(deletingTx.id)
      setDeletingTx(null)
      await loadTransactions()
    } catch (err: any) {
      alert(`Error deleting record: ${err.message}`)
    }
  }

  const handleExportCsv = () => {
    const params = new URLSearchParams()
    if (selectedProductId !== 'ALL') params.set('product_id', selectedProductId)
    if (activeTypeTab !== 'ALL') params.set('type', activeTypeTab)
    const url = `/api/inventory/export?${params.toString()}`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/inventory/products')}
          className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8 px-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Products</span>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Stock Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time audit log of all stock intake and deduction activities
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-9 gap-2 shadow-xs"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Filter Controls Row */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 max-w-2xl">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter report by attribute, make, or remark..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="w-full sm:w-56">
            <Select
              value={selectedProductId}
              onValueChange={(val) => {
                setSelectedProductId(val)
                setSearchParams(val === 'ALL' ? {} : { product_id: val })
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories ({products.length})</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Segmented Filter Tabs: [ All ] [ In ] [ Out ] */}
        <div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5 self-start md:self-auto">
          {(['ALL', 'IN', 'OUT'] as const).map((tab) => {
            const isActive = activeTypeTab === tab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTypeTab(tab)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  isActive
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'ALL' ? 'All' : tab === 'IN' ? 'Stock IN' : 'Stock OUT'}
              </button>
            )
          })}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={loadTransactions} className="ml-auto text-xs h-7">
            Retry
          </Button>
        </div>
      )}

      {/* Transactions Table Container */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold text-xs text-muted-foreground">Product</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Make</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Number / Spec</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground text-center">Quantity</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground text-center">Type</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Date</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Remarks</TableHead>
                <TableHead className="text-right font-semibold text-xs text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm font-medium text-foreground">No stock transaction records</p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {searchQuery
                          ? 'No entries match your search criteria.'
                          : 'Record stock intake or deductions to see the audit trail.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => {
                  const makeVal =
                    tx.sub_product_values?.Make ||
                    tx.sub_product_values?.make ||
                    Object.values(tx.sub_product_values || {})[0] ||
                    '—'
                  const numberVal =
                    tx.sub_product_values?.Number ||
                    tx.sub_product_values?.number ||
                    Object.values(tx.sub_product_values || {})[1] ||
                    '—'

                  return (
                    <TableRow key={tx.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell>
                        <span className="font-semibold text-sm text-foreground">
                          {tx.product_name}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium">
                        {makeVal}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {numberVal}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-block px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums rounded-md border border-border bg-muted/60 text-foreground">
                          {tx.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusPill
                          variant={tx.type === 'IN' ? 'in' : 'out'}
                          label={tx.type}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <FormattedDate value={tx.date} format="date-only" />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {tx.remarks && tx.remarks.trim() ? (
                          tx.remarks
                        ) : (
                          <span className="text-muted-foreground/40 italic">No remarks</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingTx(tx)}
                          title="Delete transaction record"
                          className="h-8 w-8 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete Transaction AlertDialog */}
      <AlertDialog open={!!deletingTx} onOpenChange={() => setDeletingTx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stock Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this <strong className="text-foreground">{deletingTx?.type}</strong> record for <strong className="text-foreground">{deletingTx?.quantity} units</strong>? Stock counts will be recalculated automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700"
              onClick={confirmDelete}
            >
              Delete Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
