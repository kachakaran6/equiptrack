import { query, pool } from '../../db/index.js';

export class AdminSystemService {
  static async getDatabaseInfo(): Promise<{
    connected: boolean;
    version?: string;
    latencyMs?: number;
    tableCounts?: Record<string, number>;
    databaseSizeMb?: number;
    latestBackup?: {
      id: string;
      status: string;
      format: string | null;
      completedAt: string | null;
    } | null;
  }> {
    const start = Date.now();
    try {
      await query('SELECT 1');
      const latencyMs = Date.now() - start;

      const [versionRes, tablesRes, sizeRes, backupRes] = await Promise.all([
        query<{ version: string }>('SELECT version()'),
        query<{ table_name: string; row_count: string }>(
          `SELECT schemaname || '.' || relname AS table_name,
                  n_live_tup AS row_count
           FROM pg_stat_user_tables
           ORDER BY relname`
        ),
        query<{ size: string }>(
          "SELECT pg_size_pretty(pg_database_size(current_database())) AS size"
        ),
        query(
          "SELECT id, status, format, completed_at FROM backup_history WHERE status = 'success' ORDER BY completed_at DESC LIMIT 1"
        ).catch(() => ({ rows: [] as any[] })),
      ]);

      const tableCounts: Record<string, number> = {};
      for (const row of tablesRes.rows) {
        const name = row.table_name.replace('public.', '');
        tableCounts[name] = parseInt(row.row_count, 10);
      }

      // Parse size from pretty string like "1024 kB" or "2 MB"
      const sizeStr = sizeRes.rows[0]?.size ?? '0 bytes';
      let sizeBytes = 0;
      const match = sizeStr.match(/^([\d.]+)\s*(bytes?|kB|MB|GB)/i);
      if (match) {
        const val = parseFloat(match[1]);
        const unit = match[2].toLowerCase();
        if (unit.startsWith('kb')) sizeBytes = val * 1024;
        else if (unit.startsWith('mb')) sizeBytes = val * 1024 * 1024;
        else if (unit.startsWith('gb')) sizeBytes = val * 1024 * 1024 * 1024;
        else sizeBytes = val;
      }

      const latest = backupRes.rows[0];

      return {
        connected: true,
        version: versionRes.rows[0]?.version?.split(' ').slice(0, 2).join(' '),
        latencyMs,
        tableCounts,
        databaseSizeMb: parseFloat((sizeBytes / (1024 * 1024)).toFixed(2)),
        latestBackup: latest
          ? {
              id: latest.id,
              status: latest.status,
              format: latest.format,
              completedAt: latest.completed_at,
            }
          : null,
      };
    } catch (err: any) {
      return { connected: false };
    }
  }

  static getSystemInfo() {
    const memUsage = process.memoryUsage();
    return {
      application: 'EquipTrack',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      serverTime: new Date().toISOString(),
      memory: {
        rss: formatBytes(memUsage.rss),
        heapUsed: formatBytes(memUsage.heapUsed),
        heapTotal: formatBytes(memUsage.heapTotal),
        external: formatBytes(memUsage.external),
      },
      pid: process.pid,
      platform: process.platform,
    };
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
