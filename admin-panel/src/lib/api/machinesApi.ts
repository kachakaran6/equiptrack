import { apiRequest } from './apiClient'
import type { Machine } from '@/types/api'

export interface CreateMachineInput {
  name: string
  code?: string
  description?: string
  location?: string
  status?: string
}

export const machinesApi = {
  async listMachines(): Promise<Machine[]> {
    const res = await apiRequest<{ success: boolean; data: Machine[] }>('/api/admin/machines')
    return res.data
  },

  async getMachine(id: string): Promise<Machine> {
    const res = await apiRequest<{ success: boolean; data: Machine }>(`/api/admin/machines/${id}`)
    return res.data
  },

  async createMachine(input: CreateMachineInput): Promise<Machine> {
    const res = await apiRequest<{ success: boolean; data: Machine }>('/api/admin/machines', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return res.data
  },

  async updateMachine(id: string, input: Partial<CreateMachineInput>): Promise<Machine> {
    const res = await apiRequest<{ success: boolean; data: Machine }>(`/api/admin/machines/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    return res.data
  },

  async deleteMachine(id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/admin/machines/${id}`, {
      method: 'DELETE',
    })
  },
}
