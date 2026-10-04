import cron, { ScheduledTask } from 'node-cron';
import { runBackup } from './backup.service.js';
import { BackupRepository } from './backup.repository.js';
import { env } from '../../config/env.js';
import { BackupFormat } from './backup.formats.js';

let scheduledTask: ScheduledTask | null = null;
let isRunning = false;

/**
 * Validate a cron expression without crashing.
 */
export function validateCronExpression(expr: string): boolean {
  return cron.validate(expr);
}

/**
 * Start the backup scheduler. Safe to call multiple times — stops existing task first.
 */
export async function startBackupScheduler(): Promise<void> {
  await stopBackupScheduler();

  let config = await BackupRepository.getConfig().catch(() => null);

  // Fall back to env vars if no DB config yet
  const enabled = config?.enabled ?? env.BACKUP_ENABLED;
  const cronExpr = config?.cron_expression ?? env.BACKUP_CRON;
  const timezone = config?.timezone ?? env.BACKUP_TIMEZONE;
  const format = (config?.format ?? env.BACKUP_FORMAT) as BackupFormat;
  const compression = config?.compression ?? env.BACKUP_COMPRESSION;
  const retentionDays = config?.retention_days ?? env.BACKUP_RETENTION_DAYS;

  if (!enabled) {
    console.log('[BackupScheduler] Backups disabled — scheduler not started');
    return;
  }

  if (!validateCronExpression(cronExpr)) {
    console.error(`[BackupScheduler] Invalid cron expression "${cronExpr}" — scheduler not started`);
    return;
  }

  console.log(`[BackupScheduler] Starting with cron="${cronExpr}" tz="${timezone}" format="${format}"`);

  scheduledTask = cron.schedule(
    cronExpr,
    async () => {
      if (isRunning) {
        console.log('[BackupScheduler] Previous backup still running — skipping this trigger');
        return;
      }

      isRunning = true;
      console.log('[BackupScheduler] Scheduled backup triggered');

      try {
        const result = await runBackup({
          format,
          compress: compression === 'gzip',
          sendToTelegram: true,
          triggeredBy: 'scheduler',
        });

        console.log(`[BackupScheduler] Backup completed: id=${result.backupId} telegram=${result.telegramStatus}`);

        // Cleanup old history records
        const cleaned = await BackupRepository.cleanOldHistory(retentionDays);
        if (cleaned > 0) {
          console.log(`[BackupScheduler] Cleaned ${cleaned} old history records`);
        }
      } catch (err: any) {
        console.error('[BackupScheduler] Scheduled backup failed:', err?.message);
      } finally {
        isRunning = false;
      }
    },
    {
      timezone,
    } as any
  );

  console.log('[BackupScheduler] Scheduler started successfully');
}

/**
 * Stop the backup scheduler cleanly.
 */
export async function stopBackupScheduler(): Promise<void> {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[BackupScheduler] Scheduler stopped');
  }
}

/**
 * Restart the scheduler (called after config change).
 */
export async function restartBackupScheduler(): Promise<void> {
  console.log('[BackupScheduler] Restarting scheduler with updated config...');
  await startBackupScheduler();
}
