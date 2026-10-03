import { query } from '../../db/index.js';

export interface LogErrorInput {
  userId?: string | null;
  userEmail?: string | null;
  source?: 'server' | 'client';
  level?: 'error' | 'warn' | 'fatal';
  endpoint?: string | null;
  method?: string | null;
  statusCode?: number | null;
  message: string;
  stackTrace?: string | null;
  metadata?: Record<string, any> | null;
}

export interface ErrorLogRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  source: string;
  level: string;
  endpoint: string | null;
  method: string | null;
  status_code: number | null;
  message: string;
  stack_trace: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export class ErrorLogsService {
  static async logError(input: LogErrorInput): Promise<ErrorLogRow | null> {
    try {
      const result = await query<ErrorLogRow>(
        `INSERT INTO error_logs 
         (user_id, user_email, source, level, endpoint, method, status_code, message, stack_trace, metadata) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
         RETURNING *`,
        [
          input.userId || null,
          input.userEmail || null,
          input.source || 'server',
          input.level || 'error',
          input.endpoint || null,
          input.method || null,
          input.statusCode || null,
          input.message || 'Unknown error',
          input.stackTrace || null,
          JSON.stringify(input.metadata || {}),
        ]
      );
      return result.rows[0];
    } catch (err) {
      console.error('[ErrorLogsService] Failed to insert error log into DB:', err);
      return null;
    }
  }

  static async getLogs(limit: number = 100, offset: number = 0): Promise<ErrorLogRow[]> {
    try {
      const result = await query<ErrorLogRow>(
        `SELECT * FROM error_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [Math.min(limit, 500), Math.max(offset, 0)]
      );
      return result.rows;
    } catch (err) {
      console.error('[ErrorLogsService] Failed to fetch error logs:', err);
      return [];
    }
  }

  static async clearLogs(): Promise<number> {
    const result = await query('DELETE FROM error_logs');
    return result.rowCount || 0;
  }
}
