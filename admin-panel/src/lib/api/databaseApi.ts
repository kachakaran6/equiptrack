import { apiRequest } from './apiClient'
import type { TableInfo, TableColumnMetadata } from '@/types/api'

export interface TableRowsResult<T = Record<string, unknown>> {
  rows: T[]
  total: number
  page: number
  limit: number
}

export const databaseApi = {
  async getTables(): Promise<TableInfo[]> {
    const res = await apiRequest<{ success: boolean; data: TableInfo[] }>('/api/admin/database/tables')
    return res.data
  },

  async getTableSchema(table: string): Promise<TableColumnMetadata[]> {
    const res = await apiRequest<{ success: boolean; data: TableColumnMetadata[] }>(`/api/admin/database/tables/${table}/schema`)
    return res.data
  },

  async getTableRows<T = Record<string, unknown>>(
    table: string,
    params?: { page?: number; limit?: number; search?: string; sortBy?: string; sortDir?: 'asc' | 'desc' }
  ): Promise<TableRowsResult<T>> {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.search) query.set('search', params.search)
    if (params?.sortBy) query.set('sortBy', params.sortBy)
    if (params?.sortDir) query.set('sortDir', params.sortDir)

    const queryString = query.toString() ? `?${query.toString()}` : ''
    const res = await apiRequest<any>(`/api/admin/tables/${table}${queryString}`)

    if (res?.data && Array.isArray(res.data.rows)) {
      return {
        rows: res.data.rows,
        total: res.data.total ?? res.data.rows.length,
        page: res.data.page ?? params?.page ?? 1,
        limit: res.data.limit ?? params?.limit ?? 25,
      }
    } else if (Array.isArray(res?.data)) {
      const total = res.pagination?.total ?? res.data.length
      return {
        rows: res.data,
        total,
        page: res.pagination?.page ?? params?.page ?? 1,
        limit: res.pagination?.limit ?? params?.limit ?? 25,
      }
    } else if (Array.isArray(res?.rows)) {
      return {
        rows: res.rows,
        total: res.total ?? res.rows.length,
        page: res.page ?? params?.page ?? 1,
        limit: res.limit ?? params?.limit ?? 25,
      }
    }

    return {
      rows: [],
      total: 0,
      page: params?.page ?? 1,
      limit: params?.limit ?? 25,
    }
  },

  async createRow(table: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await apiRequest<{ success: boolean; data: Record<string, unknown> }>(`/api/admin/tables/${table}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res.data
  },

  async updateRow(table: string, id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await apiRequest<{ success: boolean; data: Record<string, unknown> }>(`/api/admin/tables/${table}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    return res.data
  },

  async deleteRow(table: string, id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/admin/tables/${table}/${id}`, {
      method: 'DELETE',
    })
  },
}
