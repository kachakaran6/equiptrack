import { apiRequest } from './apiClient'
import type { AuditLog, AuditOutboxStats } from '@/types/api'

export interface AuditQueryParams {
  page?: number
  limit?: number
  search?: string
  action?: string
  resource_type?: string
  resource?: string
  resource_id?: string
  actor_user_id?: string
  actor_email?: string
  outcome?: string
  source?: string
  start_date?: string
  end_date?: string
}

export interface AuditListResponse {
  data: AuditLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const auditApi = {
  async listAuditLogs(params?: AuditQueryParams): Promise<AuditListResponse> {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.search) query.set('search', params.search)
    const resType = params?.resource_type || params?.resource
    if (resType) query.set('resource_type', resType)
    if (params?.resource_id) query.set('resource_id', params.resource_id)
    if (params?.actor_user_id) query.set('actor_user_id', params.actor_user_id)
    if (params?.actor_email) query.set('actor_email', params.actor_email)
    if (params?.outcome) query.set('outcome', params.outcome)
    if (params?.source) query.set('source', params.source)
    if (params?.start_date) query.set('start_date', params.start_date)
    if (params?.end_date) query.set('end_date', params.end_date)

    const queryString = query.toString() ? `?${query.toString()}` : ''
    const res = await apiRequest<{ success: boolean; data: AuditLog[]; pagination: AuditListResponse['pagination'] }>(
      `/api/admin/audit-logs${queryString}`
    )
    return {
      data: res.data,
      pagination: res.pagination || { page: 1, limit: params?.limit || 25, total: res.data.length, totalPages: 1 },
    }
  },

  async getOutboxStats(): Promise<AuditOutboxStats> {
    const res = await apiRequest<{ success: boolean; data: AuditOutboxStats }>('/api/admin/audit-logs/outbox-stats')
    return res.data
  },

  async retryOutbox(): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>('/api/admin/audit-logs/outbox-retry', {
      method: 'POST',
    })
  },

  async getAuditLogById(id: string): Promise<AuditLog & { outbox?: any }> {
    const res = await apiRequest<{ success: boolean; data: AuditLog & { outbox?: any } }>(
      `/api/admin/audit-logs/${id}`
    )
    return res.data
  },

  getExportCsvUrl(params?: AuditQueryParams): string {
    const query = new URLSearchParams()
    if (params?.search) query.set('search', params.search)
    if (params?.action) query.set('action', params.action)
    if (params?.resource_type) query.set('resource_type', params.resource_type)
    if (params?.resource_id) query.set('resource_id', params.resource_id)
    if (params?.actor_email) query.set('actor_email', params.actor_email)
    if (params?.outcome) query.set('outcome', params.outcome)
    if (params?.source) query.set('source', params.source)
    if (params?.start_date) query.set('start_date', params.start_date)
    if (params?.end_date) query.set('end_date', params.end_date)

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return `/api/admin/audit-logs/export${queryString}`
  },
}
