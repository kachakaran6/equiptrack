import React, { useState, useEffect } from 'react'
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
  Calendar,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export const InventoryReportsPage: React.FC = () => {
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

  const handleDelete = async (tx: InventoryTransaction) => {
    if (
      !window.confirm(
        `Are you sure you want to delete this ${tx.type} record for ${tx.quantity} items? Stock counts will be recalculated automatically.`
      )
    ) {
      return
    }

    try {
      await inventoryApi.deleteTransaction(tx.id)
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
      {/* Back to Products link */}
      <button
        onClick={() => navigate('/inventory/products')}
        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Products
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">Stock Reports</h1>
          <p className="text-xs text-zinc-400">
            Real-time audit log of all stock intake and deduction activities.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-8 gap-1.5 text-xs border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Top Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search input: "Filter Report..." */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            placeholder="Filter Report..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 bg-zinc-900/90 border-zinc-800 text-zinc-200 text-xs placeholder:text-zinc-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category filter dropdown */}
        <div>
          <Select
            value={selectedProductId}
            onValueChange={(val) => {
              setSelectedProductId(val)
              setSearchParams(val === 'ALL' ? {} : { product_id: val })
            }}
          >
            <SelectTrigger className="h-8 bg-zinc-900 border-zinc-800 text-zinc-200 text-xs">
              <SelectValue placeholder="All Product Categories" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
              <SelectItem value="ALL">All Categories</SelectItem>
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
      <div className="flex rounded-lg border border-zinc-800 bg-zinc-950/80 p-1">
        {(['ALL', 'IN', 'OUT'] as const).map((tab) => {
          const isActive = activeTypeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTypeTab(tab)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer text-center ${
                isActive
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              {tab === 'ALL' ? 'All' : tab === 'IN' ? 'In' : 'Out'}
            </button>
          )
        })}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-lg bg-red-950/40 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={loadTransactions} className="ml-auto text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Transactions Table */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-auto max-h-[calc(100vh-280px)] shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-zinc-800 bg-zinc-900 text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-4">Name ↓</th>
              <th className="py-2.5 px-4">Make ↓</th>
              <th className="py-2.5 px-4">Number ↓</th>
              <th className="py-2.5 px-4 text-center">Quantity ↓</th>
              <th className="py-2.5 px-4 text-center">Type ↓</th>
              <th className="py-2.5 px-4">Date ↓</th>
              <th className="py-2.5 px-4">Remarks ↓</th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                      Loading reports...
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-zinc-500">
                    <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
                    No transactions found for the selected filters.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isOut = tx.type === 'OUT'
                  const makeVal =
                    tx.sub_product_values?.Make ||
                    tx.sub_product_values?.make ||
                    Object.values(tx.sub_product_values || {})[0] ||
                    '-'
                  const numberVal =
                    tx.sub_product_values?.Number ||
                    tx.sub_product_values?.number ||
                    Object.values(tx.sub_product_values || {})[1] ||
                    '-'

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-zinc-800/40 transition-colors text-zinc-300"
                    >
                      {/* Name in orange / brand warm tone (Ref: Image 5) */}
                      <td className="py-3.5 px-4 font-bold text-orange-400 tracking-wide uppercase">
                        {tx.product_name}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-zinc-200">{makeVal}</td>
                      <td className="py-3.5 px-4 font-mono text-zinc-300">{numberVal}</td>
                      {/* Quantity in central rounded box (Ref: Image 5) */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-3 py-1 font-mono font-bold rounded border border-zinc-700 bg-zinc-950 text-zinc-100">
                          {tx.quantity}
                        </span>
                      </td>
                      {/* Type Badge (Ref: Image 5) */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-[11px] font-bold rounded border ${
                            isOut
                              ? 'bg-red-950/70 text-red-400 border-red-800/80'
                              : 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-400">{tx.date}</td>
                      <td className="py-3.5 px-4 text-zinc-400 italic">
                        {tx.remarks && tx.remarks.trim() ? tx.remarks : 'Nill'}
                      </td>
                      {/* Red Delete Button (Ref: Image 5) */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDelete(tx)}
                          className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
    </div>
  )
}
