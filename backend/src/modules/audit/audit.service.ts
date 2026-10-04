import { query } from '../../db/index.js';

export interface AuditLogEntry {
  userId?: string;
  userEmail?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export class AuditService {
  /**
   * Log an administrative action. Never throws — best-effort logging.
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      await query(
        `INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, metadata, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          entry.userId ?? null,
          entry.userEmail ?? null,
          entry.action,
          entry.resourceType ?? null,
          entry.resourceId ?? null,
          JSON.stringify(entry.metadata ?? {}),
          entry.ipAddress ?? null,
        ]
      );
    } catch (err) {
      // Best-effort — never crash the request handler due to audit log failure
      console.error('[AuditService] Failed to write audit log:', err);
    }
  }

  static async list(opts: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
  }): Promise<{ rows: AuditLogRow[]; total: number }> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (opts.userId) {
      conditions.push(`user_id = $${idx++}`);
      params.push(opts.userId);
    }
    if (opts.action) {
      conditions.push(`action ILIKE $${idx++}`);
      params.push(`%${opts.action}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRes, rowsRes] = await Promise.all([
      query<{ count: string }>(`SELECT COUNT(*) as count FROM audit_logs ${where}`, params),
      query<AuditLogRow>(
        `SELECT id, user_id, user_email, action, resource_type, resource_id, metadata, ip_address, created_at
         FROM audit_logs ${where}
         ORDER BY created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      ),
    ]);

    return {
      rows: rowsRes.rows,
      total: parseInt(countRes.rows[0].count, 10),
    };
  }
}
