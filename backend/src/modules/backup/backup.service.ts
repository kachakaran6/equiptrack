import { generateBackup, cleanupBackupFile, BackupFormat } from './backup.formats.js';
import { sendBackupToTelegram } from './telegram.service.js';
import { BackupRepository } from './backup.repository.js';
import { AuditService } from '../audit/audit.service.js';
import { env } from '../../config/env.js';
import { query } from '../../db/index.js';

// Prevent overlapping backup runs
let backupInProgress = false;

export interface RunBackupOptions {
  format?: BackupFormat;
  compress?: boolean;
  sendToTelegram?: boolean;
  triggeredBy?: string;
  adminUserId?: string;
  adminEmail?: string;
}

export interface RunBackupResult {
  backupId: string;
  format: BackupFormat;
  sizeBytes: number;
  checksum: string;
  telegramStatus?: 'sent' | 'skipped' | 'failed';
  telegramError?: string;
}

/**
 * Execute a full backup: generate → compress → send → cleanup → record.
 * Never throws permanently — records failure in backup_history.
 */
export async function runBackup(opts: RunBackupOptions = {}): Promise<RunBackupResult> {
  if (backupInProgress) {
    throw new Error('A backup is already in progress. Please wait for it to complete.');
  }

  const format: BackupFormat = (opts.format as BackupFormat) ?? 'sql';
  const compress = opts.compress ?? true;
  const sendTg = opts.sendToTelegram ?? true;

  backupInProgress = true;
  let backupId: string | null = null;
  let filePath: string | null = null;

  try {
    // 1. Record backup start
    backupId = await BackupRepository.startBackup({
      format,
      triggeredBy: opts.triggeredBy ?? 'manual',
    });

    // Audit log
    if (opts.adminUserId) {
      await AuditService.log({
        userId: opts.adminUserId,
        userEmail: opts.adminEmail,
        action: 'backup.started',
        metadata: { format, compress, sendToTelegram: sendTg },
      });
    }

    // 2. Generate backup
    const result = await generateBackup(format, compress);
    filePath = result.filePath;

    let telegramStatus: 'sent' | 'skipped' | 'failed' = 'skipped';
    let telegramError: string | undefined;

    // 3. Send to Telegram if configured
    if (sendTg) {
      const sizeStr = formatFileSize(result.sizeBytes);
      const caption =
        `📦 *EquipTrack Database Backup*\n\n` +
        `📅 *Date:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST\n` +
        `📋 *Format:* ${format.toUpperCase()}\n` +
        `💾 *Size:* ${sizeStr}\n` +
        `✅ *Status:* SUCCESS\n` +
        `🔐 *SHA256:* \`${result.checksum.slice(0, 16)}...\``;

      const tgRes = await sendBackupToTelegram(result.filePath, caption);
      telegramStatus = tgRes.success ? 'sent' : 'failed';
      telegramError = tgRes.error;
    }

    // 4. Record success
    await BackupRepository.completeBackup(backupId, {
      fileSize: result.sizeBytes,
      checksum: result.checksum,
      destination: sendTg ? 'telegram' : 'local',
    });

    // Audit success
    if (opts.adminUserId) {
      await AuditService.log({
        userId: opts.adminUserId,
        userEmail: opts.adminEmail,
        action: 'backup.completed',
        resourceId: backupId,
        metadata: { format, sizeBytes: result.sizeBytes, telegramStatus },
      });
    }

    return {
      backupId,
      format,
      sizeBytes: result.sizeBytes,
      checksum: result.checksum,
      telegramStatus,
      telegramError,
    };
  } catch (err: any) {
    const message = err?.message ?? 'Unknown backup error';

    if (backupId) {
      await BackupRepository.failBackup(backupId, message).catch(console.error);
    }

    if (opts.adminUserId) {
      await AuditService.log({
        userId: opts.adminUserId,
        userEmail: opts.adminEmail,
        action: 'backup.failed',
        resourceId: backupId ?? undefined,
        metadata: { format, error: message },
      });
    }

    throw err;
  } finally {
    // 5. Always clean up temp file
    if (filePath) {
      cleanupBackupFile(filePath);
    }
    backupInProgress = false;
  }
}

/**
 * Run a diagnostic test: verify DB, generate backup, test Telegram.
 * Cleans up all temp files.
 */
export async function runBackupTest(): Promise<{
  database: 'ok' | 'error';
  databaseError?: string;
  backupGeneration: 'ok' | 'error';
  backupError?: string;
  telegramConfig: 'configured' | 'not_configured';
  telegramTest: 'ok' | 'skipped' | 'error';
  telegramError?: string;
  overallStatus: 'ok' | 'partial' | 'error';
}> {
  const result: {
    database: 'ok' | 'error';
    databaseError?: string;
    backupGeneration: 'ok' | 'error';
    backupError?: string;
    telegramConfig: 'configured' | 'not_configured';
    telegramTest: 'ok' | 'skipped' | 'error';
    telegramError?: string;
    overallStatus: 'ok' | 'partial' | 'error';
  } = {
    database: 'ok',
    backupGeneration: 'ok',
    telegramConfig: 'not_configured',
    telegramTest: 'skipped',
    overallStatus: 'ok',
  };

  // Test database
  try {
    await query('SELECT 1');
  } catch (err: any) {
    result.database = 'error';
    result.databaseError = err.message;
    result.overallStatus = 'error';
    return result;
  }

  // Test backup generation (small JSON backup)
  let filePath: string | null = null;
  try {
    const { generateJsonBackup } = await import('./backup.formats.js');
    const backup = await generateJsonBackup(false);
    filePath = backup.filePath;
    cleanupBackupFile(backup.filePath);
    filePath = null;
  } catch (err: any) {
    result.backupGeneration = 'error';
    result.backupError = err.message;
    result.overallStatus = 'error';
    return result;
  } finally {
    if (filePath) cleanupBackupFile(filePath);
  }

  // Test Telegram if configured
  const tgConfig = await (await import('./telegram.service.js')).getEffectiveTelegramConfig();
  if (tgConfig) {
    result.telegramConfig = 'configured';
    const { sendTelegramTestMessage } = await import('./telegram.service.js');
    const tgRes = await sendTelegramTestMessage();
    result.telegramTest = tgRes.success ? 'ok' : 'error';
    result.telegramError = tgRes.error;
    if (!tgRes.success) {
      result.overallStatus = result.overallStatus === 'ok' ? 'partial' : result.overallStatus;
    }
  } else {
    result.telegramConfig = 'not_configured';
  }

  return result;
}

export function isBackupInProgress(): boolean {
  return backupInProgress;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
