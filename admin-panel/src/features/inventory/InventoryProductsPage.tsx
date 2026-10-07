import type { FC, FormEvent } from 'react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  inventoryApi,
  type InventoryProduct,
  type InventorySubProduct,
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
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Label } from '@/components/ui/label'
import { StatusPill } from '@/components/ui/status-pill'

export const InventoryProductsPage: FC = () => {
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

  // Delete dialogs
  const [productToDelete, setProductToDelete] = useState<InventoryProduct | null>(null)
  const [subProductToDelete, setSubProductToDelete] = useState<InventorySubProduct | null>(null)

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

  // Create Product Handlers
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

  const handleCreateProductSubmit = async (e: FormEvent) => {
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
  const confirmDeleteProduct = async () => {
    if (!productToDelete) return
    try {
      await inventoryApi.deleteProduct(productToDelete.id)
      setProductToDelete(null)
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

  const handleSaveSubProduct = async (e: FormEvent) => {
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

  const confirmDeleteSubProduct = async () => {
    if (!subProductToDelete) return
    try {
      await inventoryApi.deleteSubProduct(subProductToDelete.id)
      setSubProductToDelete(null)
      await loadProducts()
    } catch (err: any) {
      alert(`Error deleting item: ${err.message}`)
    }
  }

  // Stock In / Out Handlers
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

  const handleSubmitStock = async (e: FormEvent) => {
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Products & Stock</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/inventory/reports')}
            className="h-9 gap-2 shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Stock Reports</span>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setNewProductName('')
              setCustomFields([])
              setIsAddProductOpen(true)
            }}
            className="h-9 gap-2 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Product</span>
          </Button>
        </div>
      </div>

      {/* Find Stock Detail Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Find stock detail or attribute..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-8 h-9 text-sm"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={loadProducts} className="ml-auto text-xs h-7">
            Retry
          </Button>
        </div>
      )}

      {/* Products Accordion List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-muted/40 border border-border animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center rounded-xl border border-dashed border-border bg-card">
          <Package className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">
            {search ? 'No matching products or items found' : 'No inventory products yet'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
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
                className="rounded-xl border border-border bg-card overflow-hidden shadow-xs transition-all"
              >
                {/* Accordion Header */}
                <div className="flex items-center justify-between px-5 py-4 bg-muted/30 border-b border-border/80">
                  <div
                    onClick={() => toggleExpand(product.id)}
                    className="flex-1 cursor-pointer flex items-center gap-3 select-none"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-sm text-foreground tracking-tight">
                          {product.name}
                        </span>
                        <span className="font-mono text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full bg-muted border border-border text-foreground/80">
                          {product.total_stock} in stock
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {product.sub_products.length} {product.sub_products.length === 1 ? 'variant' : 'variants'} configured
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Add Sub-product button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAddSubProduct(product)}
                      className="h-8 gap-1.5 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Item</span>
                    </Button>

                    {/* Expand/Collapse Chevron */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(product.id)}
                      className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                      aria-label={isExpanded ? 'Collapse category' : 'Expand category'}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Accordion Body: Sub-products list */}
                {isExpanded && (
                  <div className="p-4 space-y-3 bg-card">
                    {product.sub_products.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        No items added to {product.name} yet.{' '}
                        <button
                          type="button"
                          onClick={() => handleOpenAddSubProduct(product)}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium ml-1 cursor-pointer"
                        >
                          Add the first item
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {product.sub_products.map((sub) => {
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
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors"
                            >
                              {/* Left: Dynamic Fields key-values */}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
                                {fieldEntries.length === 0 ? (
                                  <span className="text-xs text-muted-foreground/60 italic">No attributes set</span>
                                ) : (
                                  fieldEntries.map((entry, idx) => (
                                    <div key={idx} className="text-xs flex items-center gap-1.5">
                                      <span className="font-medium text-muted-foreground">{entry.label}:</span>
                                      <span className="font-semibold text-foreground">{entry.value}</span>
                                    </div>
                                  ))
                                )}
                              </div>

                              {/* Right: Controls [Edit] [IN] [ Count ] [OUT] [Delete] */}
                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEditSubProduct(product, sub)}
                                  title="Edit Item Details"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>

                                {/* [ IN ] Button */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenStockModal(product, sub, 'IN')}
                                  className="h-8 px-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500/50 gap-1"
                                >
                                  <TrendingUp className="h-3.5 w-3.5" />
                                  <span>IN</span>
                                </Button>

                                {/* [ Stock Count ] Badge */}
                                <div className="min-w-10 px-2.5 py-1 text-center font-mono text-xs font-bold tabular-nums rounded-md border border-border bg-background text-foreground shadow-xs">
                                  {sub.current_stock}
                                </div>

                                {/* [ OUT ] Button */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenStockModal(product, sub, 'OUT')}
                                  className="h-8 px-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 hover:border-rose-500/50 gap-1"
                                >
                                  <TrendingDown className="h-3.5 w-3.5" />
                                  <span>OUT</span>
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setSubProductToDelete(sub)}
                                  title="Delete Item"
                                  className="h-8 w-8 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 ml-1"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Bottom Action Footer for Product */}
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/inventory/reports?product_id=${product.id}`)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 gap-1.5"
                      >
                        <span>View category audit reports</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setProductToDelete(product)}
                        className="text-xs text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 gap-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete Category</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL 1: ADD PRODUCT */}
      <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Product Category</DialogTitle>
            <DialogDescription>
              Create a new category and define custom dynamic attributes for tracking
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProductSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Product Name *</Label>
              <Input
                placeholder="e.g. Belt, Bearing, Spindle"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                required
              />
            </div>

            {/* Dynamic Custom Labels */}
            <div className="space-y-3 p-4 rounded-xl bg-muted/40 border border-border/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Custom Attributes / Fields</span>
                <span className="text-[11px] text-muted-foreground">e.g. Make, Number, Dimension</span>
              </div>

              {customFields.map((field, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="text-[11px] font-medium text-muted-foreground">Attribute {idx + 1}</div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Enter Field Label"
                      value={field}
                      onChange={(e) => handleCustomFieldChange(idx, e.target.value)}
                      className="h-9 text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveCustomField(idx)}
                      className="h-9 w-9 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="pt-1 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddExtraField}
                  className="h-8 text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add attribute field</span>
                </Button>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddProductOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingProduct || !newProductName.trim()}
              >
                {savingProduct ? 'Creating...' : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ADD / EDIT SUB-PRODUCT */}
      <Dialog open={isSubProductModalOpen} onOpenChange={setIsSubProductModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSubProduct ? 'Edit Item' : `Add Item to ${selectedProductForSub?.name}`}
            </DialogTitle>
            <DialogDescription>
              Fill in the attribute values for this inventory item
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSubProduct} className="space-y-4 pt-2">
            {selectedProductForSub?.fields.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                This category has no custom fields configured. An item will be created with default attributes.
              </p>
            ) : (
              selectedProductForSub?.fields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <Label className="text-xs font-medium">{field.label}</Label>
                  <Input
                    placeholder={`Enter ${field.label}`}
                    value={subProductFormValues[field.label] || ''}
                    onChange={(e) =>
                      setSubProductFormValues((prev) => ({
                        ...prev,
                        [field.label]: e.target.value,
                      }))
                    }
                    className="text-sm"
                  />
                </div>
              ))
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSubProductModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingSubProduct}
              >
                {savingSubProduct ? 'Saving...' : editingSubProduct ? 'Update Item' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: STOCK IN / STOCK OUT */}
      <Dialog
        open={stockModalConfig.open}
        onOpenChange={(open) => setStockModalConfig((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <StatusPill
                variant={stockModalConfig.type === 'IN' ? 'in' : 'out'}
                label={stockModalConfig.type === 'IN' ? 'Stock Intake (+)' : 'Stock Deduction (-)'}
              />
              <DialogTitle className="text-base font-semibold">
                {stockModalConfig.product?.name}
              </DialogTitle>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmitStock} className="space-y-4 pt-1">
            {/* Sub-product Summary Badge */}
            {stockModalConfig.subProduct && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs flex justify-between items-center">
                <div className="text-muted-foreground truncate font-medium">
                  {Object.entries(stockModalConfig.subProduct.values)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(' • ') || 'Item'}
                </div>
                <div className="font-mono font-semibold text-foreground shrink-0 ml-2">
                  Current: {stockModalConfig.subProduct.current_stock}
                </div>
              </div>
            )}

            {stockModalError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                {stockModalError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Quantity *</Label>
              <Input
                type="number"
                min="1"
                required
                value={stockQty}
                onChange={(e) => setStockQty(parseInt(e.target.value, 10) || 1)}
                className="font-mono text-base"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Transaction Date *</Label>
              <Input
                type="date"
                required
                value={stockDate}
                onChange={(e) => setStockDate(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Remarks (Optional)</Label>
              <Input
                placeholder={stockModalConfig.type === 'IN' ? 'e.g. Received new shipment' : 'e.g. Issued to section 2'}
                value={stockRemarks}
                onChange={(e) => setStockRemarks(e.target.value)}
                className="text-sm"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStockModalConfig((prev) => ({ ...prev, open: false }))}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingStock || stockQty <= 0}
                className={
                  stockModalConfig.type === 'IN'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }
              >
                {submittingStock
                  ? 'Saving...'
                  : stockModalConfig.type === 'IN'
                  ? `Add ${stockQty} Units`
                  : `Deduct ${stockQty} Units`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Product Category Dialog */}
      <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong className="text-foreground">{productToDelete?.name}</strong> and all associated items and transaction history? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700"
              onClick={confirmDeleteProduct}
            >
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Sub-Product Item Dialog */}
      <AlertDialog open={!!subProductToDelete} onOpenChange={() => setSubProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this inventory item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700"
              onClick={confirmDeleteSubProduct}
            >
              Delete Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
