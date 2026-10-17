import { PoolClient } from 'pg';
import { query, pool } from '../../db/index.js';
import {
  AuditAction,
  AuditContext,
  AuditLogEntry,
  AuditLogRow,
  AuditOutcome,
  AuditResourceType,
  OutboxRow,
} from './audit.types.js';
import { computeDiffAndRedact, createOutboxSpec } from './audit.utils.js';

export interface MutationAuditSpec {
  action: AuditAction | string;
  resourceType: AuditResourceType | string;
  resourceId?: string | null;
  resourceLabel?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  extraSensitiveFields?: string[];
}

export interface FailureAuditSpec {
  action: AuditAction | string;
  resourceType: AuditResourceType | string;
  resourceId?: string | null;
  resourceLabel?: string | null;
  error: Error | string;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AuditListFilters {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  actorUserId?: string;
  userId?: string;
  actorEmail?: string;
  outcome?: 'SUCCESS' | 'FAILURE' | string;
  source?: string;
  startDate?: string;
  endDate?: string;
}

export class AuditService {
  /**
   * Writes an immutable audit entry and transactional outbox event inside an active PostgreSQL transaction.
   * If this fails, the entire transaction will roll back, guaranteeing transactional atomicity.
   */
  static async writeTransactionalAudit(
    client: PoolClient,
    entry: AuditLogEntry
  ): Promise<string> {
    const occurredAt = entry.occurredAt || new Date();
    const outcome = entry.outcome || 'SUCCESS';
    const source = entry.source || 'api';

    const insertAuditSql = `
      INSERT INTO audit_logs (
        occurred_at,
        actor_user_id,
        actor_email,
        actor_role,
        action,
        resource_type,
        resource_id,
        resource_label,
        outcome,
        source,
        request_id,
        correlation_id,
        changed_fields,
        before_data,
        after_data,
        reason,
        application_version,
        ip_address,
        metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19
      ) RETURNING id;
    `;

    const auditParams = [
      occurredAt,
      entry.actorUserId ?? null,
      entry.actorEmail ?? null,
      entry.actorRole ?? 'user',
      entry.action,
      entry.resourceType,
      entry.resourceId ?? null,
      entry.resourceLabel ?? null,
      outcome,
      source,
      entry.requestId ?? null,
      entry.correlationId ?? null,
      JSON.stringify(entry.changedFields ?? []),
      entry.beforeData ? JSON.stringify(entry.beforeData) : null,
      entry.afterData ? JSON.stringify(entry.afterData) : null,
      entry.reason ?? null,
      entry.applicationVersion ?? '1.0.0',
      entry.ipAddress ?? null,
      JSON.stringify(entry.metadata ?? {}),
    ];

    const auditResult = await client.query<{ id: string }>(insertAuditSql, auditParams);
    const auditLogId = auditResult.rows[0]?.id || crypto.randomUUID();

    // Create corresponding outbox event in the SAME transaction
    const outboxSpec = createOutboxSpec({ ...entry, id: auditLogId }, auditLogId);

    const insertOutboxSql = `
      INSERT INTO audit_outbox (
        audit_log_id,
        event_name,
        distinct_id,
        properties,
        status,
        next_retry_at
      ) VALUES ($1, $2, $3, $4, 'pending', CURRENT_TIMESTAMP);
    `;

    await client.query(insertOutboxSql, [
      auditLogId,
      outboxSpec.eventName,
      outboxSpec.distinctId,
      JSON.stringify(outboxSpec.properties),
    ]);

    return auditLogId;
  }

  /**
   * Helper that computes diff, redacts fields, and writes audit record inside an active transaction.
   */
  static async recordMutation(
    client: PoolClient,
    context: AuditContext,
    spec: MutationAuditSpec
  ): Promise<string> {
    const { changedFields, beforeData, afterData } = computeDiffAndRedact(
      spec.before,
      spec.after,
      spec.extraSensitiveFields
    );

    const entry: AuditLogEntry = {
      occurredAt: new Date(),
      actorUserId: context.actorUserId,
      actorEmail: context.actorEmail,
      actorRole: context.actorRole || 'user',
      action: spec.action,
      resourceType: spec.resourceType,
      resourceId: spec.resourceId,
      resourceLabel: spec.resourceLabel,
      outcome: 'SUCCESS',
      source: context.source || 'api',
      requestId: context.requestId,
      correlationId: context.correlationId,
      changedFields,
      beforeData,
      afterData,
      reason: spec.reason,
      applicationVersion: context.applicationVersion || '1.0.0',
      ipAddress: context.ipAddress,
      metadata: spec.metadata,
    };

    return this.writeTransactionalAudit(client, entry);
  }

  /**
   * Records a failed business mutation or unauthorized access attempt outside any rolled-back transaction.
   * This ensures failed actions, permission denials, and attack attempts are preserved.
   */
  static async recordFailure(
    context: AuditContext,
    spec: FailureAuditSpec
  ): Promise<void> {
    try {
      const errorMessage = typeof spec.error === 'string' ? spec.error : spec.error?.message || 'Unknown error';

      const entry: AuditLogEntry = {
        occurredAt: new Date(),
        actorUserId: context.actorUserId,
        actorEmail: context.actorEmail,
        actorRole: context.actorRole || 'anonymous',
        action: spec.action,
        resourceType: spec.resourceType,
        resourceId: spec.resourceId,
        resourceLabel: spec.resourceLabel,
        outcome: 'FAILURE',
        source: context.source || 'api',
        requestId: context.requestId,
        correlationId: context.correlationId,
        reason: spec.reason || errorMessage,
        applicationVersion: context.applicationVersion || '1.0.0',
        ipAddress: context.ipAddress,
        metadata: {
          ...(spec.metadata || {}),
          errorMessage,
          stackTrace: typeof spec.error === 'object' && spec.error ? spec.error.stack : undefined,
        },
      };

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await this.writeTransactionalAudit(client, entry);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('[AuditService.recordFailure] Failed to write failure audit:', err);
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('[AuditService.recordFailure] Unhandled error:', err);
    }
  }

  /**
   * Backward-compatible logger for existing non-transactional administrative logging.
   */
  static async log(entry: {
    userId?: string;
    userEmail?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }): Promise<void> {
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await this.writeTransactionalAudit(client, {
          actorUserId: entry.userId,
          actorEmail: entry.userEmail,
          actorRole: 'admin',
          action: entry.action,
          resourceType: entry.resourceType || 'system',
          resourceId: entry.resourceId,
          source: 'admin_panel',
          ipAddress: entry.ipAddress,
          metadata: entry.metadata,
        });
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('[AuditService.log] Failed legacy log:', err);
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('[AuditService.log] Error acquiring client:', err);
    }
  }

  /**
   * Full forensic query method with server-side filtering and pagination.
   */
  static async list(filters: AuditListFilters): Promise<{
    rows: (AuditLogRow & { outbox_status?: string; outbox_delivered_at?: string })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 25));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.search) {
      conditions.push(`(
        action ILIKE $${idx} OR
        resource_type ILIKE $${idx} OR
        resource_id ILIKE $${idx} OR
        resource_label ILIKE $${idx} OR
        actor_email ILIKE $${idx} OR
        ip_address ILIKE $${idx} OR
        request_id ILIKE $${idx}
      )`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    if (filters.action) {
      conditions.push(`action ILIKE $${idx++}`);
      params.push(`%${filters.action}%`);
    }

    if (filters.resourceType) {
      conditions.push(`resource_type = $${idx++}`);
      params.push(filters.resourceType);
    }

    if (filters.resourceId) {
      conditions.push(`resource_id = $${idx++}`);
      params.push(filters.resourceId);
    }

    const targetUserId = filters.actorUserId || filters.userId;
    if (targetUserId) {
      conditions.push(`actor_user_id = $${idx++}`);
      params.push(targetUserId);
    }

    if (filters.actorEmail) {
      conditions.push(`actor_email ILIKE $${idx++}`);
      params.push(`%${filters.actorEmail}%`);
    }

    if (filters.outcome) {
      conditions.push(`outcome = $${idx++}`);
      params.push(filters.outcome);
    }

    if (filters.source) {
      conditions.push(`source = $${idx++}`);
      params.push(filters.source);
    }

    if (filters.startDate) {
      conditions.push(`occurred_at >= $${idx++}`);
      params.push(new Date(filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(`occurred_at <= $${idx++}`);
      params.push(new Date(filters.endDate));
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) as count FROM audit_logs ${where};`;
    const dataQuery = `
      SELECT 
        a.id,
        a.occurred_at,
        a.ingested_at,
        a.actor_user_id,
        a.actor_email,
        a.actor_role,
        a.action,
        a.resource_type,
        a.resource_id,
        a.resource_label,
        a.outcome,
        a.source,
        a.request_id,
        a.correlation_id,
        a.changed_fields,
        a.before_data,
        a.after_data,
        a.reason,
        a.application_version,
        a.ip_address,
        a.metadata,
        a.created_at,
        o.status as outbox_status,
        o.delivered_at as outbox_delivered_at
      FROM audit_logs a
      LEFT JOIN LATERAL (
        SELECT status, delivered_at 
        FROM audit_outbox 
        WHERE audit_log_id = a.id 
        ORDER BY created_at DESC 
        LIMIT 1
      ) o ON true
      ${where}
      ORDER BY a.occurred_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;

    const [countRes, rowsRes] = await Promise.all([
      query<{ count: string }>(countQuery, params),
      query(dataQuery, [...params, limit, offset]),
    ]);

    const total = parseInt(countRes.rows[0]?.count ?? '0', 10);
    const totalPages = Math.ceil(total / limit);

    return {
      rows: rowsRes.rows,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Retrieves single audit record by UUID with full details and outbox history.
   */
  static async getById(id: string): Promise<{
    auditLog: AuditLogRow | null;
    outbox: OutboxRow | null;
  }> {
    const auditRes = await query<AuditLogRow>(
      'SELECT * FROM audit_logs WHERE id = $1',
      [id]
    );

    if (auditRes.rows.length === 0) {
      return { auditLog: null, outbox: null };
    }

    const outboxRes = await query<OutboxRow>(
      'SELECT * FROM audit_outbox WHERE audit_log_id = $1 ORDER BY created_at DESC LIMIT 1',
      [id]
    );

    return {
      auditLog: auditRes.rows[0],
      outbox: outboxRes.rows[0] || null,
    };
  }

  /**
   * Health metrics and stats for the PostHog transactional outbox.
   */
  static async getOutboxStats(): Promise<{
    pendingCount: number;
    processingCount: number;
    deliveredCount: number;
    failedCount: number;
    oldestPendingAgeSeconds: number;
  }> {
    const res = await query<{
      status: string;
      count: string;
      oldest_pending_seconds: string | null;
    }>(`
      SELECT 
        status, 
        COUNT(*) as count,
        EXTRACT(EPOCH FROM (NOW() - MIN(created_at))) as oldest_pending_seconds
      FROM audit_outbox
      GROUP BY status;
    `);

    let pending = 0;
    let processing = 0;
    let delivered = 0;
    let failed = 0;
    let oldestPendingSeconds = 0;

    for (const row of res.rows) {
      const c = parseInt(row.count, 10);
      if (row.status === 'pending') {
        pending = c;
        oldestPendingSeconds = Math.max(oldestPendingSeconds, parseFloat(row.oldest_pending_seconds || '0'));
      } else if (row.status === 'processing') {
        processing = c;
      } else if (row.status === 'delivered') {
        delivered = c;
      } else if (row.status === 'failed') {
        failed = c;
      }
    }

    return {
      pendingCount: pending,
      processingCount: processing,
      deliveredCount: delivered,
      failedCount: failed,
      oldestPendingAgeSeconds: Math.floor(oldestPendingSeconds),
    };
  }

  /**
   * Generates CSV export for administrators.
   */
  static async exportCsv(filters: AuditListFilters): Promise<string> {
    const { rows } = await this.list({ ...filters, limit: 1000, page: 1 });

    const headers = [
      'ID',
      'Occurred At (UTC)',
      'Action',
      'Resource Type',
      'Resource ID',
      'Resource Label',
      'Actor Email',
      'Actor Role',
      'Outcome',
      'Source',
      'Changed Fields',
      'Client IP',
      'Request ID',
      'Reason',
      'PostHog Status',
    ];

    const escape = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    let csv = headers.join(',') + '\n';
    for (const r of rows) {
      csv += [
        escape(r.id),
        escape(r.occurred_at),
        escape(r.action),
        escape(r.resource_type),
        escape(r.resource_id),
        escape(r.resource_label),
        escape(r.actor_email || 'System'),
        escape(r.actor_role),
        escape(r.outcome),
        escape(r.source),
        escape(Array.isArray(r.changed_fields) ? r.changed_fields.join(', ') : r.changed_fields),
        escape(r.ip_address),
        escape(r.request_id),
        escape(r.reason),
        escape(r.outbox_status || 'delivered'),
      ].join(',') + '\n';
    }

    return csv;
  }
}
