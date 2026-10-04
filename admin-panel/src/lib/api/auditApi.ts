import { apiRequest } from './apiClient'
import type { AuditLog } from '@/types/api'

export const auditApi = {
  async listAuditLogs(params?: { limit?: number; action?: string; resource?: string }): Promise<AuditLog[]> {
    const query = new URLSearchParams()
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.action) query.set('action', params.action)
    if (params?.resource) query.set('resource', params.resource)

    const queryString = query.toString() ? `?${query.toString()}` : ''
    const res = await apiRequest<{ success: boolean; data: AuditLog[] }>(`/api/admin/audit-logs${queryString}`)
    return res.data
  },
}
