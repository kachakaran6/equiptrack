import { query } from '../../db/index.js';

export interface BackupHistoryRow {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: 'started' | 'success' | 'failed';
  format: string | null;
  file_size: number | null;
  checksum: string | null;
  destination: string;
  error_message: string | null;
  triggered_by: string;
  created_at: string;
}

export interface BackupConfigRow {
  id: number;
  enabled: boolean;
  cron_expression: string;
  timezone: string;
  format: string;
  compression: string;
  retention_days: number;
  telegram_chat_id: string | null;
  telegram_bot_token: string | null;
  telegram_enabled: boolean;
  updated_at: string;
}

export class BackupRepository {
  static async startBackup(opts: {
    format: string;
    triggeredBy?: string;
  }): Promise<string> {
    const res = await query<{ id: string }>(
      `INSERT INTO backup_history (format, status, triggered_by)
       VALUES ($1, 'started', $2)
       RETURNING id`,
      [opts.format, opts.triggeredBy ?? 'manual']
    );
    return res.rows[0].id;
  }

  static async completeBackup(id: string, opts: {
    fileSize: number;
    checksum: string;
    destination?: string;
  }): Promise<void> {
    await query(
      `UPDATE backup_history
       SET status = 'success', completed_at = NOW(), file_size = $1, checksum = $2, destination = $3
       WHERE id = $4`,
      [opts.fileSize, opts.checksum, opts.destination ?? 'telegram', id]
    );
  }

  static async failBackup(id: string, errorMessage: string): Promise<void> {
    await query(
      `UPDATE backup_history
       SET status = 'failed', completed_at = NOW(), error_message = $1
       WHERE id = $2`,
      [errorMessage.substring(0, 2000), id]
    );
  }

  static async listHistory(opts: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{ rows: BackupHistoryRow[]; total: number }> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (opts.status) {
      conditions.push(`status = $${idx++}`);
      params.push(opts.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRes, rowsRes] = await Promise.all([
      query<{ count: string }>(`SELECT COUNT(*) FROM backup_history ${where}`, params),
      query<BackupHistoryRow>(
        `SELECT id, started_at, completed_at, status, format, file_size, checksum, destination, error_message, triggered_by, created_at
         FROM backup_history ${where}
         ORDER BY created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      ),
    ]);

    return { rows: rowsRes.rows, total: parseInt(countRes.rows[0].count, 10) };
  }

  static async getLatestSuccessful(): Promise<BackupHistoryRow | null> {
    const res = await query<BackupHistoryRow>(
      `SELECT * FROM backup_history WHERE status = 'success' ORDER BY completed_at DESC LIMIT 1`
    );
    return res.rows[0] ?? null;
  }

  static async getConfig(): Promise<BackupConfigRow> {
    try {
      let res = await query<BackupConfigRow>('SELECT * FROM backup_config WHERE id = 1');
      if (!res.rows[0]) {
        await query(
          `INSERT INTO backup_config (id, enabled, cron_expression, timezone, format, compression, retention_days, telegram_enabled)
           VALUES (1, false, '0 2 * * *', 'Asia/Kolkata', 'sql', 'gzip', 30, false)
           ON CONFLICT (id) DO NOTHING`
        );
        res = await query<BackupConfigRow>('SELECT * FROM backup_config WHERE id = 1');
      }
      return res.rows[0];
    } catch (err) {
      console.error('[BackupRepository] Error in getConfig, returning default config:', err);
      return {
        id: 1,
        enabled: false,
        cron_expression: '0 2 * * *',
        timezone: 'Asia/Kolkata',
        format: 'sql',
        compression: 'gzip',
        retention_days: 30,
        telegram_chat_id: null,
        telegram_bot_token: null,
        telegram_enabled: false,
        updated_at: new Date().toISOString(),
      };
    }
  }

  static async updateConfig(updates: Partial<Omit<BackupConfigRow, 'id' | 'updated_at'>>): Promise<BackupConfigRow> {
    // Proactively drop any restrictive check constraints so all format/compression types can be saved
    try {
      await query(`ALTER TABLE backup_config DROP CONSTRAINT IF EXISTS backup_config_format_check;`);
      await query(`ALTER TABLE backup_config DROP CONSTRAINT IF EXISTS backup_config_compression_check;`);
      await query(`ALTER TABLE backup_history DROP CONSTRAINT IF EXISTS backup_history_format_check;`);
    } catch {
      // Non-fatal if table not created
    }

    const current = await this.getConfig();

    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    const allowed: (keyof typeof updates)[] = [
      'enabled', 'cron_expression', 'timezone', 'format', 'compression',
      'retention_days', 'telegram_chat_id', 'telegram_bot_token', 'telegram_enabled',
    ];

    for (const key of allowed) {
      if (key in updates && updates[key] !== undefined) {
        fields.push(`"${key}" = $${idx++}`);
        params.push(updates[key]);
      }
    }

    if (fields.length === 0) {
      return current;
    }

    fields.push(`"updated_at" = NOW()`);

    try {
      const res = await query<BackupConfigRow>(
        `UPDATE backup_config SET ${fields.join(', ')} WHERE id = (SELECT id FROM backup_config ORDER BY id ASC LIMIT 1) RETURNING *`,
        params
      );
      if (res.rows && res.rows[0]) {
        return res.rows[0];
      }
    } catch (err: any) {
      console.error('[BackupRepository] Update failed:', err?.message);
    }

    return await this.getConfig();
  }

  static async cleanOldHistory(retentionDays: number): Promise<number> {
    const res = await query(
      `DELETE FROM backup_history WHERE created_at < NOW() - INTERVAL '${Math.floor(retentionDays)} days' AND status != 'started' RETURNING id`
    );
    return res.rowCount ?? 0;
  }
}
