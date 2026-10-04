import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  inventoryApi,
  type InventoryProduct,
  type InventorySubProduct,
  type ProductCustomField,
} from '@/lib/api/inventoryApi'
import {
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Package,
  AlertCircle,
  X,
  Calendar,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export const InventoryProductsPage: React.FC = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  // Modal states
  const [isAddProductOpen, setIsAddProductOpen] = useState(false)
  const [newProductName, setNewProductName] = useState('')
  const [customFields, setCustomFields] = useState<string[]>([])
  const [savingProduct, setSavingProduct] = useState(false)

  // Sub-product modal
  const [selectedProductForSub, setSelectedProductForSub] = useState<InventoryProduct | null>(null)
  const [isSubProductModalOpen, setIsSubProductModalOpen] = useState(false)
  const [subProductFormValues, setSubProductFormValues] = useState<Record<string, string>>({})
  const [editingSubProduct, setEditingSubProduct] = useState<InventorySubProduct | null>(null)
  const [savingSubProduct, setSavingSubProduct] = useState(false)

  // Stock In / Out Modal
  const [stockModalConfig, setStockModalConfig] = useState<{
    open: boolean
    type: 'IN' | 'OUT'
    subProduct: InventorySubProduct | null
    product: InventoryProduct | null
  }>({
    open: false,
    type: 'IN',
    subProduct: null,
    product: null,
  })
  const [stockQty, setStockQty] = useState<number>(1)
  const [stockDate, setStockDate] = useState(new Date().toISOString().slice(0, 10))
  const [stockRemarks, setStockRemarks] = useState('')
  const [submittingStock, setSubmittingStock] = useState(false)
  const [stockModalError, setStockModalError] = useState<string | null>(null)

  const loadProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await inventoryApi.listProducts({ search: search.trim() || undefined })
      setProducts(data)
      // Auto-expand all by default or on first load
      const exp: Record<string, boolean> = {}
      data.forEach((p) => {
        exp[p.id] = true
      })
      setExpandedIds((prev) => (Object.keys(prev).length === 0 ? exp : prev))
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [search])

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Create Product Handlers (Ref: Image 2 & 3)
  const handleAddExtraField = () => {
    setCustomFields((prev) => [...prev, ''])
  }

  const handleCustomFieldChange = (index: number, val: string) => {
    setCustomFields((prev) => {
      const next = [...prev]
      next[index] = val
      return next
    })
  }

  const handleRemoveCustomField = (index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProductName.trim()) return

    try {
      setSavingProduct(true)
      const validFields = customFields.map((f) => f.trim()).filter((f) => f.length > 0)
      await inventoryApi.createProduct({
        name: newProductName.trim(),
        fields: validFields,
      })
      setIsAddProductOpen(false)
      setNewProductName('')
      setCustomFields([])
      await loadProducts()
    } catch (err: any) {
      alert(`Error creating product: ${err.message}`)
    } finally {
      setSavingProduct(false)
    }
  }

  // Delete Product
  const handleDeleteProduct = async (product: InventoryProduct) => {
    if (
      !window.confirm(
        `Are you sure you want to delete product "${product.name}" and all associated items and transaction history?`
      )
    ) {
      return
    }

    try {
      await inventoryApi.deleteProduct(product.id)
      await loadProducts()
    } catch (err: any) {
      alert(`Error deleting product: ${err.message}`)
    }
  }

  // Add / Edit Sub-product Handlers
  const handleOpenAddSubProduct = (product: InventoryProduct) => {
    setSelectedProductForSub(product)
    setEditingSubProduct(null)
    const initialValues: Record<string, string> = {}
    product.fields.forEach((f) => {
      initialValues[f.label] = ''
    })
    setSubProductFormValues(initialValues)
    setIsSubProductModalOpen(true)
  }

  const handleOpenEditSubProduct = (product: InventoryProduct, sub: InventorySubProduct) => {
    setSelectedProductForSub(product)
    setEditingSubProduct(sub)
    const initialValues: Record<string, string> = {}
    product.fields.forEach((f) => {
      initialValues[f.label] = sub.values[f.label] || sub.values[f.id] || ''
    })
    setSubProductFormValues(initialValues)
    setIsSubProductModalOpen(true)
  }

  const handleSaveSubProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProductForSub) return

    try {
      setSavingSubProduct(true)
      if (editingSubProduct) {
        await inventoryApi.updateSubProduct(editingSubProduct.id, {
          values: subProductFormValues,
        })
      } else {
        await inventoryApi.createSubProduct(selectedProductForSub.id, {
          values: subProductFormValues,
        })
      }
      setIsSubProductModalOpen(false)
      await loadProducts()
    } catch (err: any) {
      alert(`Error saving item: ${err.message}`)
    } finally {
      setSavingSubProduct(false)
    }
  }

  const handleDeleteSubProduct = async (sub: InventorySubProduct) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return
    try {
      await inventoryApi.deleteSubProduct(sub.id)
      await loadProducts()
    } catch (err: any) {
      alert(`Error deleting item: ${err.message}`)
    }
  }

  // Stock In / Out Handlers (Ref: Image 1, 4)
  const handleOpenStockModal = (
    product: InventoryProduct,
    sub: InventorySubProduct,
    type: 'IN' | 'OUT'
  ) => {
    setStockModalConfig({
      open: true,
      type,
      subProduct: sub,
      product,
    })
    setStockQty(1)
    setStockDate(new Date().toISOString().slice(0, 10))
    setStockRemarks('')
    setStockModalError(null)
  }

  const handleSubmitStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stockModalConfig.subProduct) return

    if (stockModalConfig.type === 'OUT' && stockQty > stockModalConfig.subProduct.current_stock) {
      setStockModalError(
        `Cannot remove ${stockQty} items. Available stock is only ${stockModalConfig.subProduct.current_stock}.`
      )
      return
    }

    try {
      setSubmittingStock(true)
      setStockModalError(null)
      await inventoryApi.createTransaction({
        sub_product_id: stockModalConfig.subProduct.id,
        type: stockModalConfig.type,
        quantity: stockQty,
        date: stockDate,
        remarks: stockRemarks.trim() || undefined,
      })
      setStockModalConfig((prev) => ({ ...prev, open: false }))
      await loadProducts()
    } catch (err: any) {
      setStockModalError(err.message || 'Failed to record stock transaction')
    } finally {
      setSubmittingStock(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">Products</h1>
          <p className="text-xs text-zinc-400">
            Manage inventory categories, dynamic attributes, stock counts, and instant IN / OUT adjustments.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/inventory/reports')}
            className="h-9 gap-1.5 text-xs border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
          >
            <FileSpreadsheet className="h-4 w-4 text-purple-400" />
            Stock Reports
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setNewProductName('')
              setCustomFields([])
              setIsAddProductOpen(true)
            }}
            className="h-9 gap-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add New Product
          </Button>
        </div>
      </div>

      {/* Prominent Purple "Add New Product" Banner Button (Matching Image 1 & 4) */}
      <div className="w-full">
        <button
          onClick={() => {
            setNewProductName('')
            setCustomFields([])
            setIsAddProductOpen(true)
          }}
          className="w-full py-3 px-4 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add New Product
        </button>
      </div>

      {/* Find Stock Detail Search Bar (Ref: Image 1) */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          type="text"
          placeholder="Find Stock Detail"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 bg-zinc-900/90 border-zinc-800 text-zinc-200 text-sm placeholder:text-zinc-500 focus-visible:ring-purple-500"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-lg bg-red-950/40 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={loadProducts} className="ml-auto text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Products Accordion List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-lg bg-zinc-900/60 border border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center rounded-lg border border-dashed border-zinc-800 bg-zinc-950/50">
          <Package className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-300">
            {search ? 'No matching products or items found' : 'No inventory products yet'}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Click &ldquo;Add New Product&rdquo; above to create your first item category.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => {
            const isExpanded = expandedIds[product.id] ?? true

            return (
              <div
                key={product.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-sm transition-all"
              >
                {/* Accordion Header (Ref: Image 1 & 4) */}
                <div className="flex items-center justify-between px-5 py-4 bg-zinc-900/90 border-b border-zinc-800/80">
                  <div
                    onClick={() => toggleExpand(product.id)}
                    className="flex-1 cursor-pointer flex items-center gap-3"
                  >
                    <span className="font-bold text-sm text-zinc-100 tracking-wide uppercase">
                      {product.name}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/60 text-purple-300">
                      Total: {product.total_stock}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* '+' Add Sub-product button (Ref: Image 1 & 4) */}
                    <button
                      onClick={() => handleOpenAddSubProduct(product)}
                      title="Add item"
                      className="h-7 w-7 rounded border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                    </button>

                    {/* Expand/Collapse Chevron */}
                    <button
                      onClick={() => toggleExpand(product.id)}
                      className="h-7 w-7 rounded hover:bg-zinc-800 text-zinc-400 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Accordion Body: Sub-products list */}
                {isExpanded && (
                  <div className="p-4 space-y-3 bg-zinc-950/40">
                    {product.sub_products.length === 0 ? (
                      <div className="py-6 text-center text-xs text-zinc-500">
                        No items added to {product.name} yet.{' '}
                        <button
                          onClick={() => handleOpenAddSubProduct(product)}
                          className="text-purple-400 hover:underline ml-1 cursor-pointer"
                        >
                          Add the first item
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {product.sub_products.map((sub) => {
                          // Display key-value pairs formatted nicely (Ref: Image 1 & 4)
                          const fieldEntries: Array<{ label: string; value: string }> = []
                          product.fields.forEach((f) => {
                            const val = sub.values[f.label] || sub.values[f.id] || ''
                            if (val) fieldEntries.push({ label: f.label, value: val })
                          })

                          if (fieldEntries.length === 0 && Object.keys(sub.values).length > 0) {
                            Object.entries(sub.values).forEach(([k, v]) => {
                              if (v) fieldEntries.push({ label: k, value: v })
                            })
                          }

                          return (
                            <div
                              key={sub.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-zinc-800/80 bg-zinc-900/70 hover:bg-zinc-900 transition-colors"
                            >
                              {/* Left: Dynamic Fields key-values */}
                              <div className="space-y-0.5 min-w-0">
                                {fieldEntries.length === 0 ? (
                                  <span className="text-xs text-zinc-500 italic">No attributes set</span>
                                ) : (
                                  fieldEntries.map((entry, idx) => (
                                    <div key={idx} className="text-xs">
                                      <span className="font-semibold text-zinc-400">{entry.label} : </span>
                                      <span className="font-medium text-zinc-200">{entry.value}</span>
                                    </div>
                                  ))
                                )}
                              </div>

                              {/* Right: Controls [Edit] [IN] [ Count ] [OUT] [Delete] (Ref: Image 1 & 4) */}
                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                <button
                                  onClick={() => handleOpenEditSubProduct(product, sub)}
                                  title="Edit Item Details"
                                  className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>

                                {/* [ IN ] Button */}
                                <button
                                  onClick={() => handleOpenStockModal(product, sub, 'IN')}
                                  className="px-2.5 py-1 text-xs font-bold rounded border border-zinc-700 bg-zinc-800 hover:bg-emerald-900/60 hover:text-emerald-300 hover:border-emerald-700 text-zinc-200 transition-colors cursor-pointer"
                                >
                                  IN
                                </button>

                                {/* [ Stock Count ] Badge */}
                                <div className="min-w-8 px-2 py-1 text-center font-mono text-xs font-bold rounded border border-zinc-700 bg-zinc-950 text-zinc-100">
                                  {sub.current_stock}
                                </div>

                                {/* [ OUT ] Button */}
                                <button
                                  onClick={() => handleOpenStockModal(product, sub, 'OUT')}
                                  className="px-2.5 py-1 text-xs font-bold rounded border border-zinc-700 bg-zinc-800 hover:bg-indigo-900/60 hover:text-indigo-300 hover:border-indigo-700 text-zinc-200 transition-colors cursor-pointer"
                                >
                                  OUT
                                </button>

                                <button
                                  onClick={() => handleDeleteSubProduct(sub)}
                                  title="Delete Item"
                                  className="p-1.5 rounded hover:bg-red-950/60 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer ml-1"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Bottom Action Footer for Product: [View Report] & Delete Trash (Ref: Image 4) */}
                    <div className="flex items-center gap-3 pt-3 mt-3 border-t border-zinc-800/80">
                      <button
                        onClick={() => navigate(`/inventory/reports?product_id=${product.id}`)}
                        className="flex-1 py-2 px-4 rounded bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs transition-colors text-center cursor-pointer"
                      >
                        View Report
                      </button>

                      <button
                        onClick={() => handleDeleteProduct(product)}
                        title="Delete Product Category"
                        className="h-8 w-8 rounded bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ================= MODAL 1: ADD PRODUCT (Ref: Image 2 & 3) ================= */}
      <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
        <DialogContent className="sm:max-w-lg bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-100">Add Product</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateProductSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-medium">Product Name</Label>
              <Input
                placeholder="Enter Product Name (e.g. BELT, BEARING)"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                required
                className="bg-zinc-900 border-zinc-800 text-zinc-100 text-sm focus-visible:ring-purple-500"
              />
            </div>

            {/* Dynamic Custom Labels (Ref: Image 3) */}
            <div className="space-y-3 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">Custom Attributes / Fields</span>
                <span className="text-[11px] text-zinc-500">e.g. Make, Number, Location</span>
              </div>

              {customFields.map((field, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="text-[11px] font-medium text-zinc-400">Custom Label {idx + 1}</div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Enter Field Label"
                      value={field}
                      onChange={(e) => handleCustomFieldChange(idx, e.target.value)}
                      className="bg-zinc-900 border-zinc-700 text-zinc-200 text-xs h-9"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomField(idx)}
                      className="h-9 w-9 rounded border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="pt-1 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddExtraField}
                  className="h-8 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
                >
                  Add extra field
                </Button>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddProductOpen(false)}
                className="border-zinc-700 text-zinc-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingProduct || !newProductName.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              >
                {savingProduct ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL 2: ADD / EDIT SUB-PRODUCT ================= */}
      <Dialog open={isSubProductModalOpen} onOpenChange={setIsSubProductModalOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-100">
              {editingSubProduct ? 'Edit Item' : `Add Item to ${selectedProductForSub?.name}`}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveSubProduct} className="space-y-4 pt-2">
            {selectedProductForSub?.fields.length === 0 ? (
              <p className="text-xs text-zinc-400">
                This category has no custom fields configured. An item will be created with default attributes.
              </p>
            ) : (
              selectedProductForSub?.fields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">{field.label}</Label>
                  <Input
                    placeholder={`Enter ${field.label}`}
                    value={subProductFormValues[field.label] || ''}
                    onChange={(e) =>
                      setSubProductFormValues((prev) => ({
                        ...prev,
                        [field.label]: e.target.value,
                      }))
                    }
                    className="bg-zinc-900 border-zinc-800 text-zinc-200 text-sm"
                  />
                </div>
              ))
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSubProductModalOpen(false)}
                className="border-zinc-700 text-zinc-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingSubProduct}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              >
                {savingSubProduct ? 'Saving...' : editingSubProduct ? 'Update Item' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL 3: STOCK IN / STOCK OUT ================= */}
      <Dialog
        open={stockModalConfig.open}
        onOpenChange={(open) => setStockModalConfig((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                  stockModalConfig.type === 'IN'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                }`}
              >
                {stockModalConfig.type === 'IN' ? 'STOCK IN (+)' : 'STOCK OUT (-)'}
              </span>
              <span>{stockModalConfig.product?.name}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitStock} className="space-y-4 pt-1">
            {/* Sub-product Summary Badge */}
            {stockModalConfig.subProduct && (
              <div className="p-3 rounded bg-zinc-900 border border-zinc-800 text-xs flex justify-between items-center">
                <div className="text-zinc-300 truncate">
                  {Object.entries(stockModalConfig.subProduct.values)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(' • ') || 'Item'}
                </div>
                <div className="font-mono font-bold text-purple-300 shrink-0 ml-2">
                  Current Stock: {stockModalConfig.subProduct.current_stock}
                </div>
              </div>
            )}

            {stockModalError && (
              <div className="p-3 rounded bg-red-950/60 border border-red-800 text-red-300 text-xs">
                {stockModalError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Quantity *</Label>
              <Input
                type="number"
                min="1"
                required
                value={stockQty}
                onChange={(e) => setStockQty(parseInt(e.target.value, 10) || 1)}
                className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-base"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Transaction Date *</Label>
              <Input
                type="date"
                required
                value={stockDate}
                onChange={(e) => setStockDate(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-zinc-200 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Remarks (Optional)</Label>
              <Input
                placeholder={stockModalConfig.type === 'IN' ? 'e.g. Received shipment' : 'e.g. Issued to section 2'}
                value={stockRemarks}
                onChange={(e) => setStockRemarks(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-zinc-200 text-sm"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStockModalConfig((prev) => ({ ...prev, open: false }))}
                className="border-zinc-700 text-zinc-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingStock || stockQty <= 0}
                className={`font-semibold text-white ${
                  stockModalConfig.type === 'IN'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {submittingStock
                  ? 'Saving...'
                  : stockModalConfig.type === 'IN'
                  ? `Add ${stockQty} Units`
                  : `Remove ${stockQty} Units`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
