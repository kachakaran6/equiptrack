import { apiRequest } from './apiClient'
import type { Section } from '@/types/api'

export interface CreateSectionInput {
  name: string
  machine_id: string
  description?: string
}

export const sectionsApi = {
  async listSections(machineId?: string): Promise<Section[]> {
    const query = machineId ? `?machine_id=${encodeURIComponent(machineId)}` : ''
    const res = await apiRequest<{ success: boolean; data: Section[] }>(`/api/admin/sections${query}`)
    return res.data
  },

  async getSection(id: string): Promise<Section> {
    const res = await apiRequest<{ success: boolean; data: Section }>(`/api/admin/sections/${id}`)
    return res.data
  },

  async createSection(input: CreateSectionInput): Promise<Section> {
    const res = await apiRequest<{ success: boolean; data: Section }>('/api/admin/sections', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return res.data
  },

  async updateSection(id: string, input: Partial<CreateSectionInput>): Promise<Section> {
    const res = await apiRequest<{ success: boolean; data: Section }>(`/api/admin/sections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    return res.data
  },

  async deleteSection(id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/admin/sections/${id}`, {
      method: 'DELETE',
    })
  },
}
