import { apiRequest } from './apiClient'

export interface ProductCustomField {
  id: string
  product_id: string
  label: string
  position: number
  created_at?: string
}

export interface InventorySubProduct {
  id: string
  product_id: string
  user_id: string
  current_stock: number
  total_in: number
  total_out: number
  values: Record<string, string>
  created_at: string
  updated_at: string
}

export interface InventoryProduct {
  id: string
  user_id: string
  name: string
  total_stock: number
  fields: ProductCustomField[]
  sub_products: InventorySubProduct[]
  created_at: string
  updated_at: string
}

export interface InventoryTransaction {
  id: string
  sub_product_id: string
  product_id: string
  product_name: string
  user_id: string
  type: 'IN' | 'OUT'
  quantity: number
  date: string
  remarks?: string
  sub_product_values: Record<string, string>
  created_at: string
  updated_at: string
}

export const inventoryApi = {
  async listProducts(params?: { search?: string }): Promise<InventoryProduct[]> {
    const qs = params?.search ? `?search=${encodeURIComponent(params.search)}` : ''
    const res = await apiRequest<{ success: boolean; data: InventoryProduct[] }>(`/api/inventory/products${qs}`)
    return res.data
  },

  async getProduct(id: string): Promise<InventoryProduct> {
    const res = await apiRequest<{ success: boolean; data: InventoryProduct }>(`/api/inventory/products/${id}`)
    return res.data
  },

  async createProduct(data: { name: string; fields?: string[] }): Promise<InventoryProduct> {
    const res = await apiRequest<{ success: boolean; data: InventoryProduct }>('/api/inventory/products', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res.data
  },

  async updateProduct(
    id: string,
    data: { name?: string; fields?: Array<{ id?: string; label: string; position?: number }> }
  ): Promise<InventoryProduct> {
    const res = await apiRequest<{ success: boolean; data: InventoryProduct }>(`/api/inventory/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    return res.data
  },

  async deleteProduct(id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/inventory/products/${id}`, {
      method: 'DELETE',
    })
  },

  async createSubProduct(productId: string, data: { values?: Record<string, string> }): Promise<InventorySubProduct> {
    const res = await apiRequest<{ success: boolean; data: InventorySubProduct }>(
      `/api/inventory/products/${productId}/sub-products`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
    return res.data
  },

  async updateSubProduct(id: string, data: { values?: Record<string, string> }): Promise<InventorySubProduct> {
    const res = await apiRequest<{ success: boolean; data: InventorySubProduct }>(`/api/inventory/sub-products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    return res.data
  },

  async deleteSubProduct(id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/inventory/sub-products/${id}`, {
      method: 'DELETE',
    })
  },

  async createTransaction(data: {
    sub_product_id: string
    type: 'IN' | 'OUT'
    quantity: number
    date: string
    remarks?: string
  }): Promise<InventoryTransaction> {
    const res = await apiRequest<{ success: boolean; data: InventoryTransaction }>('/api/inventory/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res.data
  },

  async listTransactions(params?: {
    sub_product_id?: string
    product_id?: string
    type?: string
    search?: string
    start_date?: string
    end_date?: string
    limit?: number
  }): Promise<InventoryTransaction[]> {
    const searchParams = new URLSearchParams()
    if (params?.sub_product_id) searchParams.set('sub_product_id', params.sub_product_id)
    if (params?.product_id) searchParams.set('product_id', params.product_id)
    if (params?.type && params.type !== 'ALL') searchParams.set('type', params.type)
    if (params?.search) searchParams.set('search', params.search)
    if (params?.start_date) searchParams.set('start_date', params.start_date)
    if (params?.end_date) searchParams.set('end_date', params.end_date)
    if (params?.limit) searchParams.set('limit', params.limit.toString())

    const qs = searchParams.toString() ? `?${searchParams.toString()}` : ''
    const res = await apiRequest<{ success: boolean; data: InventoryTransaction[] }>(`/api/inventory/transactions${qs}`)
    return res.data
  },

  async deleteTransaction(id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/inventory/transactions/${id}`, {
      method: 'DELETE',
    })
  },
}
