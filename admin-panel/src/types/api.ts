export type UserRole = 'ADMIN' | 'USER'
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  phone?: string | null
  last_login_at?: string | null
  created_at: string
  updated_at: string
}

export interface Machine {
  id: string
  name: string
  code?: string | null
  description?: string | null
  location?: string | null
  status?: string | null
  created_at: string
  updated_at: string
}

export interface Section {
  id: string
  name: string
  machine_id: string
  machine_name?: string | null
  description?: string | null
  created_at: string
  updated_at: string
}

export interface UsageRecord {
  id: string
  machine_id: string
  machine_name?: string | null
  section_id: string
  section_name?: string | null
  user_id?: string | null
  user_name?: string | null
  start_date: string
  end_date?: string | null
  usage_days: number
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface ErrorLog {
  id: string
  severity: 'INFO' | 'WARN' | 'ERROR' | 'FATAL'
  error_code?: string | null
  endpoint?: string | null
  method?: string | null
  status_code?: number | null
  user_id?: string | null
  message: string
  stack_trace?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
}

export interface AuditLog {
  id: string
  occurred_at?: string
  ingested_at?: string
  actor_user_id?: string | null
  actor_email?: string | null
  actor_role?: string | null
  action: string
  resource_type?: string
  resource?: string
  resource_id?: string | null
  resource_label?: string | null
  outcome?: 'SUCCESS' | 'FAILURE'
  result?: string
  source?: string
  request_id?: string | null
  correlation_id?: string | null
  changed_fields?: string[] | null
  before_data?: Record<string, unknown> | null
  after_data?: Record<string, unknown> | null
  reason?: string | null
  application_version?: string | null
  ip_address?: string | null
  metadata?: Record<string, unknown> | null
  outbox_status?: 'pending' | 'delivered' | 'failed' | null
  outbox_delivered_at?: string | null
  created_at?: string
  admin_email?: string | null
  admin_id?: string | null
  admin_name?: string | null
  user_agent?: string | null
  details?: Record<string, unknown> | null
}

export interface AuditOutboxStats {
  pendingCount: number
  failedCount: number
  deliveredCount: number
  oldestPendingAgeSeconds: number | null
}

export interface TableColumnMetadata {
  column_name: string
  data_type: string
  is_nullable: boolean
  column_default: string | null
  is_primary_key: boolean
}

export interface TableInfo {
  name: string
  rowCount: number
  columns: TableColumnMetadata[]
}

export interface BackupHistoryItem {
  id: string
  started_at: string
  completed_at?: string | null
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  format: 'SQL' | 'JSON' | 'CSV' | 'ZIP' | 'ALL'
  size_bytes?: number | null
  checksum?: string | null
  destination: string
  error_message?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
}

export interface BackupConfig {
  enabled: boolean
  cron_expression: string
  timezone: string
  format: 'SQL' | 'JSON' | 'CSV' | 'ZIP' | 'ALL'
  compression: 'GZIP' | 'NONE'
  retention_days: number
  telegram_configured: boolean
  telegram_chat_id_masked?: string | null
  telegram_enabled?: boolean
  bot_token_configured?: boolean
}

export interface SystemHealth {
  status: 'ok' | 'degraded' | 'down'
  uptime_seconds: number
  node_version: string
  memory_usage: {
    rss_mb: number
    heap_total_mb: number
    heap_used_mb: number
    external_mb: number
  }
  environment: string
  timestamp: string
}

export interface DatabaseHealth {
  status: 'connected' | 'disconnected'
  latency_ms: number
  pg_version: string
  database_name: string
  database_size: string
  tables_count: number
  total_records_approx: number
}

export interface OverviewMetrics {
  users_count: number
  machines_count: number
  sections_count: number
  usage_records_count: number
  recent_errors_count: number
  api_status: 'healthy' | 'unhealthy'
  db_status: 'connected' | 'disconnected'
  last_backup?: {
    time: string
    status: string
  } | null
  recent_activities: AuditLog[]
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
