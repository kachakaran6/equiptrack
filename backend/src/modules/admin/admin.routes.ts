import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin } from '../../middleware/admin.js';
import { AdminUsersService } from './admin.users.service.js';
import { AdminSystemService } from './admin.system.service.js';
import { AuditService } from '../audit/audit.service.js';
import { BackupRepository } from '../backup/backup.repository.js';
import { runBackup, runBackupTest, isBackupInProgress } from '../backup/backup.service.js';
import { restartBackupScheduler } from '../backup/backup.scheduler.js';
import {
  sendTelegramTestMessage,
  validateTelegramToken,
  maskChatId,
} from '../backup/telegram.service.js';
import { validateCronExpression } from '../backup/backup.scheduler.js';
import { env } from '../../config/env.js';
import { query } from '../../db/index.js';
import { MachinesService } from '../machines/machines.service.js';
import { SectionsService } from '../sections/sections.service.js';

// ─── Validation Schemas ─────────────────────────────────────────────────────

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const updateRoleSchema = z.object({
  role: z.enum(['user', 'admin']),
});

const updateStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

const runBackupSchema = z.object({
  format: z.enum(['sql', 'json', 'csv', 'zip']).default('sql'),
  sendToTelegram: z.boolean().default(true),
});

const updateBackupConfigSchema = z.object({
  enabled: z.boolean().optional(),
  cron_expression: z.string().optional(),
  timezone: z.string().optional(),
  format: z.enum(['sql', 'json', 'csv', 'zip']).optional(),
  compression: z.enum(['none', 'gzip']).optional(),
  retention_days: z.number().int().min(1).max(365).optional(),
  telegram_enabled: z.boolean().optional(),
});

const updateTelegramSchema = z.object({
  bot_token: z.string().optional(),
  chat_id: z.string().optional(),
  enabled: z.boolean().optional(),
});

// ─── Route Plugin ────────────────────────────────────────────────────────────

export async function adminRoutes(fastify: FastifyInstance) {
  // Global guard: all /api/admin/* routes require admin role (validated from DB)
  fastify.addHook('preHandler', requireAdmin);

  // ──────────────────────────────────────────────────────────────────
  // SYSTEM
  // ──────────────────────────────────────────────────────────────────

  // GET /api/admin/system
  fastify.get('/system', async (request, reply) => {
    const info = AdminSystemService.getSystemInfo();
    const dbInfo = await AdminSystemService.getDatabaseInfo();
    return reply.send({
      success: true,
      data: { ...info, database: dbInfo },
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // DATABASE
  // ──────────────────────────────────────────────────────────────────

  // GET /api/admin/database
  fastify.get('/database', async (request, reply) => {
    const info = await AdminSystemService.getDatabaseInfo();
    return reply.send({ success: true, data: info });
  });

  // ──────────────────────────────────────────────────────────────────
  // USERS
  // ──────────────────────────────────────────────────────────────────

  // GET /api/admin/users
  fastify.get('/users', async (request, reply) => {
    const q = request.query as Record<string, string>;
    const { page, limit } = paginationSchema.parse(q);
    const result = await AdminUsersService.listUsers({
      page,
      limit,
      search: q.search,
      role: q.role,
      status: q.status,
      sortBy: q.sortBy,
      sortDir: q.sortDir as 'asc' | 'desc' | undefined,
    });
    return reply.send({
      success: true,
      data: result.rows,
      pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
    });
  });

  // GET /api/admin/users/:id
  fastify.get<{ Params: { id: string } }>('/users/:id', async (request, reply) => {
    const user = await AdminUsersService.getUserById(request.params.id);
    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }
    return reply.send({ success: true, data: user });
  });

  // GET /api/admin/users/:id/activity
  fastify.get<{ Params: { id: string } }>('/users/:id/activity', async (request, reply) => {
    const user = await AdminUsersService.getUserById(request.params.id);
    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }
    const activity = await AdminUsersService.getUserActivity(request.params.id, {});
    return reply.send({ success: true, data: { user, activity } });
  });

  // PATCH /api/admin/users/:id/role
  fastify.patch<{ Params: { id: string } }>('/users/:id/role', async (request, reply) => {
    const parsed = updateRoleSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message },
      });
    }

    try {
      const user = await AdminUsersService.updateUserRole(
        request.params.id,
        parsed.data.role,
        request.user.id,
        request.user.email,
        request.ip
      );
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }
      return reply.send({ success: true, data: user, message: `Role updated to ${parsed.data.role}` });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'ROLE_UPDATE_FAILED', message: err.message },
      });
    }
  });

  // PATCH /api/admin/users/:id/status
  fastify.patch<{ Params: { id: string } }>('/users/:id/status', async (request, reply) => {
    const parsed = updateStatusSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message },
      });
    }

    try {
      const user = await AdminUsersService.updateUserStatus(
        request.params.id,
        parsed.data.status,
        request.user.id,
        request.user.email,
        request.ip
      );
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }
      return reply.send({ success: true, data: user });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'STATUS_UPDATE_FAILED', message: err.message },
      });
    }
  });

  // DELETE /api/admin/users/:id
  fastify.delete<{ Params: { id: string } }>('/users/:id', async (request, reply) => {
    try {
      const deleted = await AdminUsersService.deleteUser(
        request.params.id,
        request.user.id,
        request.user.email,
        request.ip
      );
      if (!deleted) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }
      return reply.send({ success: true, message: 'User deleted successfully' });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'DELETE_FAILED', message: err.message },
      });
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // MACHINES (Admin: view all, delete any)
  // ──────────────────────────────────────────────────────────────────

  // GET /api/admin/machines
  fastify.get('/machines', async (request, reply) => {
    const q = request.query as Record<string, string>;
    const page = Math.max(1, parseInt(q.page ?? '1', 10));
    const limit = Math.min(100, parseInt(q.limit ?? '20', 10));
    const offset = (page - 1) * limit;

    const res = await query(
      `SELECT m.id, m.name, m.description, m.user_id, u.email as owner_email,
              m.created_at, m.updated_at,
              COUNT(s.id) AS section_count
       FROM machines m
       LEFT JOIN users u ON u.id = m.user_id
       LEFT JOIN sections s ON s.machine_id = m.id
       GROUP BY m.id, u.email
       ORDER BY m.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const countRes = await query<{ count: string }>('SELECT COUNT(*) FROM machines');

    return reply.send({
      success: true,
      data: res.rows,
      pagination: { page, limit, total: parseInt(countRes.rows[0].count, 10) },
    });
  });

  // DELETE /api/admin/machines/:id
  fastify.delete<{ Params: { id: string } }>('/machines/:id', async (request, reply) => {
    const res = await query(
      'DELETE FROM machines WHERE id = $1 RETURNING id, name',
      [request.params.id]
    );
    if ((res.rowCount ?? 0) === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Machine not found' },
      });
    }

    await AuditService.log({
      userId: request.user.id,
      userEmail: request.user.email,
      action: 'admin.machine.deleted',
      resourceType: 'machine',
      resourceId: request.params.id,
      metadata: { name: res.rows[0].name },
      ipAddress: request.ip,
    });

    return reply.send({ success: true, message: 'Machine deleted' });
  });

  // ──────────────────────────────────────────────────────────────────
  // AUDIT LOGS
  // ──────────────────────────────────────────────────────────────────

  // GET /api/admin/audit-logs
  fastify.get('/audit-logs', async (request, reply) => {
    const q = request.query as Record<string, string>;
    const { page, limit } = paginationSchema.parse(q);
    const result = await AuditService.list({ page, limit, userId: q.userId, action: q.action });
    return reply.send({
      success: true,
      data: result.rows,
      pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // BACKUP CONFIG
  // ──────────────────────────────────────────────────────────────────

  // GET /api/admin/backup/config
  fastify.get('/backup/config', async (request, reply) => {
    const config = await BackupRepository.getConfig();
    if (!config) {
      return reply.status(503).send({
        success: false,
        error: { code: 'CONFIG_NOT_FOUND', message: 'Backup config not initialized' },
      });
    }
    return reply.send({
      success: true,
      data: {
        enabled: config.enabled,
        cron: config.cron_expression,
        timezone: config.timezone,
        format: config.format,
        compression: config.compression,
        retentionDays: config.retention_days,
        // Safely mask Telegram config
        telegramEnabled: config.telegram_enabled,
        telegramChatId: config.telegram_chat_id ? maskChatId(config.telegram_chat_id) : null,
        botTokenConfigured: !!env.TELEGRAM_BOT_TOKEN,
      },
    });
  });

  // PATCH /api/admin/backup/config
  fastify.patch('/backup/config', async (request, reply) => {
    const parsed = updateBackupConfigSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message },
      });
    }

    // Validate cron expression if provided
    if (parsed.data.cron_expression && !validateCronExpression(parsed.data.cron_expression)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_CRON', message: 'Invalid cron expression' },
      });
    }

    const updated = await BackupRepository.updateConfig(parsed.data);

    await AuditService.log({
      userId: request.user.id,
      userEmail: request.user.email,
      action: 'admin.backup.config_changed',
      metadata: { changes: parsed.data },
      ipAddress: request.ip,
    });

    // Restart scheduler to pick up new config
    restartBackupScheduler().catch(console.error);

    return reply.send({
      success: true,
      message: 'Backup configuration updated. Scheduler restarted.',
      data: {
        enabled: updated.enabled,
        cron: updated.cron_expression,
        timezone: updated.timezone,
        format: updated.format,
        compression: updated.compression,
        retentionDays: updated.retention_days,
        telegramEnabled: updated.telegram_enabled,
      },
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // TELEGRAM CONFIG
  // ──────────────────────────────────────────────────────────────────

  // POST /api/admin/backup/telegram/test
  fastify.post('/backup/telegram/test', async (request, reply) => {
    const res = await sendTelegramTestMessage();
    await AuditService.log({
      userId: request.user.id,
      userEmail: request.user.email,
      action: 'admin.backup.telegram_test',
      metadata: { success: res.success },
      ipAddress: request.ip,
    });
    return reply.send({
      success: res.success,
      message: res.success ? 'Test message sent to Telegram' : `Failed: ${res.error}`,
    });
  });

  // PATCH /api/admin/backup/telegram
  fastify.patch('/backup/telegram', async (request, reply) => {
    const parsed = updateTelegramSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message },
      });
    }

    // Validate token if provided
    if (parsed.data.bot_token) {
      const validation = await validateTelegramToken(parsed.data.bot_token);
      if (!validation.valid) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_TOKEN', message: `Invalid bot token: ${validation.error}` },
        });
      }
      // Note: We do NOT store the token in DB — it lives in TELEGRAM_BOT_TOKEN env var.
      // Inform the admin they must update their env var.
      await AuditService.log({
        userId: request.user.id,
        userEmail: request.user.email,
        action: 'admin.backup.telegram_credentials_changed',
        metadata: { botName: validation.botName, chatIdProvided: !!parsed.data.chat_id },
        ipAddress: request.ip,
      });
    }

    // Update chat_id and enabled in DB
    const updates: Record<string, unknown> = {};
    if (parsed.data.chat_id !== undefined) updates.telegram_chat_id = parsed.data.chat_id;
    if (parsed.data.enabled !== undefined) updates.telegram_enabled = parsed.data.enabled;

    const updated = Object.keys(updates).length > 0
      ? await BackupRepository.updateConfig(updates)
      : await BackupRepository.getConfig();

    return reply.send({
      success: true,
      message: parsed.data.bot_token
        ? 'Token validated successfully. Update TELEGRAM_BOT_TOKEN in your environment/Coolify config to persist it.'
        : 'Telegram settings updated.',
      data: {
        telegramEnabled: updated?.telegram_enabled,
        telegramChatId: updated?.telegram_chat_id ? maskChatId(updated.telegram_chat_id) : null,
        botTokenConfigured: !!env.TELEGRAM_BOT_TOKEN,
      },
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // MANUAL BACKUP
  // ──────────────────────────────────────────────────────────────────

  // POST /api/admin/backup/run
  fastify.post('/backup/run', async (request, reply) => {
    const parsed = runBackupSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message },
      });
    }

    if (isBackupInProgress()) {
      return reply.status(409).send({
        success: false,
        error: { code: 'BACKUP_IN_PROGRESS', message: 'A backup is already running' },
      });
    }

    try {
      const result = await runBackup({
        format: parsed.data.format,
        compress: true,
        sendToTelegram: parsed.data.sendToTelegram,
        triggeredBy: 'manual',
        adminUserId: request.user.id,
        adminEmail: request.user.email,
      });

      return reply.status(201).send({
        success: true,
        data: {
          backupId: result.backupId,
          format: result.format,
          sizeBytes: result.sizeBytes,
          telegram: result.telegramStatus,
          telegramError: result.telegramError,
        },
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'BACKUP_FAILED', message: err.message },
      });
    }
  });

  // POST /api/admin/backup/test
  fastify.post('/backup/test', async (request, reply) => {
    const result = await runBackupTest();
    return reply.send({ success: result.overallStatus === 'ok', data: result });
  });

  // GET /api/admin/backup/status
  fastify.get('/backup/status', async (request, reply) => {
    const latest = await BackupRepository.getLatestSuccessful();
    return reply.send({
      success: true,
      data: {
        backupInProgress: isBackupInProgress(),
        latestSuccessful: latest
          ? {
              id: latest.id,
              format: latest.format,
              fileSizeBytes: latest.file_size,
              completedAt: latest.completed_at,
              destination: latest.destination,
            }
          : null,
      },
    });
  });

  // GET /api/admin/backup/history
  fastify.get('/backup/history', async (request, reply) => {
    const q = request.query as Record<string, string>;
    const { page, limit } = paginationSchema.parse(q);
    const result = await BackupRepository.listHistory({
      page,
      limit,
      status: q.status,
    });
    return reply.send({
      success: true,
      data: result.rows,
      pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
    });
  });
}
