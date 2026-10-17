export type AuditAction =
  // Categories
  | 'category.created'
  | 'category.updated'
  | 'category.deleted'
  | 'category.restored'
  // Machines
  | 'machine.created'
  | 'machine.updated'
  | 'machine.deleted'
  | 'machine.duplicated'
  // Sections / Components
  | 'section.created'
  | 'section.updated'
  | 'section.deleted'
  // Usage Records
  | 'usage_record.created'
  | 'usage_record.updated'
  | 'usage_record.deleted'
  // Inventory
  | 'inventory_product.created'
  | 'inventory_product.updated'
  | 'inventory_product.deleted'
  | 'inventory_sub_product.created'
  | 'inventory_sub_product.updated'
  | 'inventory_sub_product.deleted'
  | 'inventory_transaction.created'
  | 'inventory_transaction.deleted'
  // Users & Roles
  | 'user.created'
  | 'user.updated'
  | 'user.role_changed'
  | 'user.status_changed'
  | 'user.deleted'
  // Auth & Security
  | 'auth.login_succeeded'
  | 'auth.login_failed'
  | 'auth.logout_completed'
  | 'auth.password_changed'
  | 'auth.unauthorized_attempt'
  | 'auth.permission_denied'
  // Backups & Maintenance
  | 'backup.started'
  | 'backup.completed'
  | 'backup.failed'
  | 'backup.config_changed'
  | 'restore.started'
  | 'restore.completed'
  | 'restore.failed'
  // Administrative & System
  | 'admin.settings_changed'
  | 'system.maintenance'
  | 'system.migration';

export type AuditResourceType =
  | 'category'
  | 'machine'
  | 'section'
  | 'usage_record'
  | 'inventory_product'
  | 'inventory_sub_product'
  | 'inventory_transaction'
  | 'user'
  | 'auth'
  | 'backup'
  | 'restore'
  | 'system';

export type AuditSource = 'mobile_app' | 'admin_panel' | 'api' | 'scheduler' | 'system';

export type AuditOutcome = 'SUCCESS' | 'FAILURE';

export interface AuditContext {
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorRole?: string;
  source?: AuditSource;
  requestId?: string;
  correlationId?: string;
  ipAddress?: string | null;
  applicationVersion?: string;
}

export interface AuditLogEntry {
  id?: string;
  occurredAt?: Date;
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorRole?: string;
  action: AuditAction | string;
  resourceType: AuditResourceType | string;
  resourceId?: string | null;
  resourceLabel?: string | null;
  outcome?: AuditOutcome;
  source?: AuditSource;
  requestId?: string | null;
  correlationId?: string | null;
  changedFields?: string[];
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  reason?: string | null;
  applicationVersion?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AuditLogRow {
  id: string;
  occurred_at: string;
  ingested_at: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_label: string | null;
  outcome: string;
  source: string;
  request_id: string | null;
  correlation_id: string | null;
  changed_fields: string[];
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  reason: string | null;
  application_version: string | null;
  ip_address: string | null;
  metadata: Record<string, unknown>;
  created_at?: string;
}

export interface OutboxEntry {
  id?: string;
  auditLogId?: string;
  eventName: string;
  distinctId: string;
  properties: Record<string, unknown>;
}

export interface OutboxRow {
  id: string;
  audit_log_id: string | null;
  event_name: string;
  distinct_id: string;
  properties: Record<string, unknown>;
  status: 'pending' | 'processing' | 'delivered' | 'failed';
  attempt_count: number;
  max_attempts: number;
  last_attempt_at: string | null;
  next_retry_at: string;
  delivered_at: string | null;
  last_error: string | null;
  created_at: string;
}
