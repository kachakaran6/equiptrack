import { apiRequest } from './apiClient'
import type { BackupConfig, BackupHistoryItem } from '@/types/api'

export interface TriggerBackupInput {
  format?: 'SQL' | 'JSON' | 'CSV' | 'ZIP' | 'ALL'
  compression?: 'GZIP' | 'NONE'
  send_to_telegram?: boolean
}

export interface UpdateBackupConfigInput {
  enabled?: boolean
  cron_expression?: string
  timezone?: string
  format?: 'SQL' | 'JSON' | 'CSV' | 'ZIP' | 'ALL'
  compression?: 'GZIP' | 'NONE'
  retention_days?: number
  telegram_enabled?: boolean
  telegram_bot_token?: string
  telegram_chat_id?: string
}

export interface UpdateTelegramInput {
  telegram_bot_token?: string
  bot_token?: string
  telegram_chat_id?: string
  chat_id?: string
  telegram_enabled?: boolean
  enabled?: boolean
}

export const backupApi = {
  async getConfig(): Promise<BackupConfig> {
    const res = await apiRequest<{ success: boolean; data: BackupConfig }>('/api/admin/backup/config')
    return res.data
  },

  async updateConfig(input: UpdateBackupConfigInput): Promise<BackupConfig> {
    const res = await apiRequest<{ success: boolean; data: BackupConfig }>('/api/admin/backup/config', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return res.data
  },

  async updateTelegram(input: UpdateTelegramInput): Promise<any> {
    const res = await apiRequest<{ success: boolean; data: any }>('/api/admin/backup/telegram', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return res.data
  },

  async getHistory(): Promise<BackupHistoryItem[]> {
    const res = await apiRequest<{ success: boolean; data: BackupHistoryItem[] }>('/api/admin/backup/history')
    return res.data
  },

  async triggerBackup(input?: TriggerBackupInput): Promise<{ message: string; backup: BackupHistoryItem }> {
    const res = await apiRequest<{ success: boolean; data: { message: string; backup: BackupHistoryItem } }>('/api/admin/backup/run', {
      method: 'POST',
      body: JSON.stringify(input || {}),
    })
    return res.data
  },

  async testTelegram(): Promise<{ success: boolean; message: string }> {
    const res = await apiRequest<{ success: boolean; message: string }>('/api/admin/backup/telegram/test', {
      method: 'POST',
    })
    return res
  },
}
