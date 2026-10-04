import { apiRequest } from './apiClient'
import type { ErrorLog } from '@/types/api'

export const errorsApi = {
  async listErrors(params?: { severity?: string; limit?: number }): Promise<ErrorLog[]> {
    const query = new URLSearchParams()
    if (params?.severity) query.set('severity', params.severity)
    if (params?.limit) query.set('limit', String(params.limit))

    const queryString = query.toString() ? `?${query.toString()}` : ''
    const res = await apiRequest<{ success: boolean; data: ErrorLog[] }>(`/api/admin/error-logs${queryString}`)
    return res.data
  },

  async clearErrors(): Promise<void> {
    await apiRequest<{ success: boolean }>('/api/admin/error-logs', {
      method: 'DELETE',
    })
  },
}
