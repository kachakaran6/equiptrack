import { apiRequest } from './apiClient'
import type { SystemHealth, DatabaseHealth, OverviewMetrics } from '@/types/api'

export const systemApi = {
  async getSystemHealth(): Promise<SystemHealth> {
    const res = await apiRequest<{ success: boolean; data: SystemHealth }>('/api/admin/system/health')
    return res.data
  },

  async getDatabaseHealth(): Promise<DatabaseHealth> {
    const res = await apiRequest<{ success: boolean; data: DatabaseHealth }>('/api/admin/database/health')
    return res.data
  },

  async getOverviewMetrics(): Promise<OverviewMetrics> {
    const res = await apiRequest<{ success: boolean; data: OverviewMetrics }>('/api/admin/overview')
    return res.data
  },
}
