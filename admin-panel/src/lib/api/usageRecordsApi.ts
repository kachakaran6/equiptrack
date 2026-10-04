import { apiRequest } from './apiClient'
import type { UsageRecord } from '@/types/api'

export interface CreateUsageRecordInput {
  machine_id: string
  section_id: string
  user_id?: string
  start_date: string
  end_date?: string | null
  notes?: string
}

export const usageRecordsApi = {
  async listUsageRecords(params?: { machine_id?: string; section_id?: string; user_id?: string }): Promise<UsageRecord[]> {
    const query = new URLSearchParams()
    if (params?.machine_id) query.set('machine_id', params.machine_id)
    if (params?.section_id) query.set('section_id', params.section_id)
    if (params?.user_id) query.set('user_id', params.user_id)

    const queryString = query.toString() ? `?${query.toString()}` : ''
    const res = await apiRequest<{ success: boolean; data: UsageRecord[] }>(`/api/admin/usage-records${queryString}`)
    return res.data
  },

  async getUsageRecord(id: string): Promise<UsageRecord> {
    const res = await apiRequest<{ success: boolean; data: UsageRecord }>(`/api/admin/usage-records/${id}`)
    return res.data
  },

  async createUsageRecord(input: CreateUsageRecordInput): Promise<UsageRecord> {
    const res = await apiRequest<{ success: boolean; data: UsageRecord }>('/api/admin/usage-records', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return res.data
  },

  async updateUsageRecord(id: string, input: Partial<CreateUsageRecordInput>): Promise<UsageRecord> {
    const res = await apiRequest<{ success: boolean; data: UsageRecord }>(`/api/admin/usage-records/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    return res.data
  },

  async deleteUsageRecord(id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/admin/usage-records/${id}`, {
      method: 'DELETE',
    })
  },
}
