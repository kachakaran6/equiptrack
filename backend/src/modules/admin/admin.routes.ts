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
import { hashPassword } from '../../utils/crypto.js';
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

  // POST /api/admin/users (Create user)
  fastify.post('/users', async (request, reply) => {
    const createUserSchema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(['user', 'admin']).default('user'),
    });
    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message },
      });
    }

    try {
      const existing = await query('SELECT id FROM users WHERE email = $1', [parsed.data.email]);
      if (existing.rows.length > 0) {
        return reply.status(400).send({
          success: false,
          error: { code: 'USER_EXISTS', message: 'User with this email already exists' },
        });
      }

      const hash = await hashPassword(parsed.data.password);
      const res = await query(
        "INSERT INTO users (email, password_hash, role, status) VALUES ($1, $2, $3, 'active') RETURNING id, email, role, status, created_at",
        [parsed.data.email, hash, parsed.data.role]
      );

      await AuditService.log({
        userId: request.user.id,
        userEmail: request.user.email,
        action: 'admin.user.created',
        resourceType: 'user',
        resourceId: res.rows[0].id,
        metadata: { email: parsed.data.email, role: parsed.data.role },
        ipAddress: request.ip,
      });

      return reply.status(201).send({ success: true, data: res.rows[0] });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: { code: 'CREATE_FAILED', message: err.message } });
    }
  });

  // PATCH /api/admin/users/:id/password (Reset user password)
  fastify.patch<{ Params: { id: string } }>('/users/:id/password', async (request, reply) => {
    const schema = z.object({ password: z.string().min(6) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters' } });
    }

    const hash = await hashPassword(parsed.data.password);
    const res = await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email', [hash, request.params.id]);
    if (res.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    await AuditService.log({
      userId: request.user.id,
      userEmail: request.user.email,
      action: 'admin.user.password_reset',
      resourceType: 'user',
      resourceId: request.params.id,
      metadata: { email: res.rows[0].email },
      ipAddress: request.ip,
    });

    return reply.send({ success: true, message: 'Password reset successfully' });
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
  // MACHINES CRUD
  // ──────────────────────────────────────────────────────────────────

  // GET /api/admin/machines
  fastify.get('/machines', async (request, reply) => {
    const q = request.query as Record<string, string>;
    const page = Math.max(1, parseInt(q.page ?? '1', 10));
    const limit = Math.min(100, parseInt(q.limit ?? '20', 10));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (q.search) {
      whereClauses.push(`(m.name ILIKE $${pIdx} OR u.email ILIKE $${pIdx})`);
      params.push(`%${q.search}%`);
      pIdx++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const res = await query(
      `SELECT m.id, m.name, m.description, m.user_id, u.email as owner_email,
              m.created_at, m.updated_at,
              COUNT(s.id)::int AS section_count
       FROM machines m
       LEFT JOIN users u ON u.id = m.user_id
       LEFT JOIN sections s ON s.machine_id = m.id
       ${whereSql}
       GROUP BY m.id, u.email
       ORDER BY m.created_at DESC
       LIMIT $${pIdx++} OFFSET $${pIdx++}`,
      [...params, limit, offset]
    );
    const countRes = await query<{ count: string }>(`SELECT COUNT(*) FROM machines m LEFT JOIN users u ON u.id = m.user_id ${whereSql}`, params);

    return reply.send({
      success: true,
      data: res.rows,
      pagination: { page, limit, total: parseInt(countRes.rows[0]?.count ?? '0', 10) },
    });
  });

  // POST /api/admin/machines
  fastify.post('/machines', async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      userId: z.string().optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } });
    }

    const userId = parsed.data.userId || request.user.id;
    const res = await query(
      'INSERT INTO machines (name, description, user_id) VALUES ($1, $2, $3) RETURNING *',
      [parsed.data.name, parsed.data.description || null, userId]
    );

    await AuditService.log({
      userId: request.user.id,
      userEmail: request.user.email,
      action: 'admin.machine.created',
      resourceType: 'machine',
      resourceId: res.rows[0].id,
      metadata: { name: parsed.data.name },
      ipAddress: request.ip,
    });

    return reply.status(201).send({ success: true, data: res.rows[0] });
  });

  // PATCH /api/admin/machines/:id
  fastify.patch<{ Params: { id: string } }>('/machines/:id', async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } });
    }

    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (parsed.data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      params.push(parsed.data.name);
    }
    if (parsed.data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      params.push(parsed.data.description);
    }

    if (fields.length === 0) {
      return reply.status(400).send({ success: false, error: { code: 'NO_FIELDS', message: 'No fields to update' } });
    }

    fields.push(`updated_at = NOW()`);
    params.push(request.params.id);

    const res = await query(
      `UPDATE machines SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (res.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Machine not found' } });
    }

    return reply.send({ success: true, data: res.rows[0] });
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
  // SECTIONS / COMPONENTS CRUD
  // ──────────────────────────────────────────────────────────────────

  // GET /api/admin/sections
  fastify.get('/sections', async (request, reply) => {
    const q = request.query as Record<string, string>;
    const page = Math.max(1, parseInt(q.page ?? '1', 10));
    const limit = Math.min(100, parseInt(q.limit ?? '30', 10));
    const offset = (page - 1) * limit;

    const res = await query(
      `SELECT s.id, s.name, s.machine_id, s.created_at, s.updated_at,
              m.name as machine_name,
              COUNT(u.id)::int as record_count
       FROM sections s
       LEFT JOIN machines m ON m.id = s.machine_id
       LEFT JOIN usage_records u ON u.section_id = s.id
       GROUP BY s.id, m.name
       ORDER BY s.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const countRes = await query<{ count: string }>('SELECT COUNT(*) FROM sections');

    return reply.send({
      success: true,
      data: res.rows,
      pagination: { page, limit, total: parseInt(countRes.rows[0]?.count ?? '0', 10) },
    });
  });

  // POST /api/admin/sections
  fastify.post('/sections', async (request, reply) => {
    const schema = z.object({
      machineId: z.string().uuid(),
      name: z.string().min(1),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } });
    }

    const res = await query(
      'INSERT INTO sections (machine_id, name, user_id) VALUES ($1, $2, $3) RETURNING *',
      [parsed.data.machineId, parsed.data.name, request.user.id]
    );

    return reply.status(201).send({ success: true, data: res.rows[0] });
  });

  // PATCH /api/admin/sections/:id
  fastify.patch<{ Params: { id: string } }>('/sections/:id', async (request, reply) => {
    const schema = z.object({ name: z.string().min(1) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } });
    }

    const res = await query(
      'UPDATE sections SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [parsed.data.name, request.params.id]
    );
    if (res.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Component not found' } });
    }

    return reply.send({ success: true, data: res.rows[0] });
  });

  // DELETE /api/admin/sections/:id
  fastify.delete<{ Params: { id: string } }>('/sections/:id', async (request, reply) => {
    const res = await query('DELETE FROM sections WHERE id = $1 RETURNING id, name', [request.params.id]);
    if (res.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Component not found' } });
    }
    return reply.send({ success: true, message: 'Component deleted' });
  });

  // ──────────────────────────────────────────────────────────────────
  // USAGE RECORDS CRUD
  // ──────────────────────────────────────────────────────────────────

  // GET /api/admin/usage-records
  fastify.get('/usage-records', async (request, reply) => {
    const q = request.query as Record<string, string>;
    const page = Math.max(1, parseInt(q.page ?? '1', 10));
    const limit = Math.min(100, parseInt(q.limit ?? '30', 10));
    const offset = (page - 1) * limit;

    const res = await query(
      `SELECT r.id, r.name, r.usage_date, r.section_id, r.created_at, r.updated_at,
              s.name as section_name,
              m.name as machine_name,
              u.email as creator_email
       FROM usage_records r
       LEFT JOIN sections s ON s.id = r.section_id
       LEFT JOIN machines m ON m.id = s.machine_id
       LEFT JOIN users u ON u.id = r.user_id
       ORDER BY r.usage_date DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const countRes = await query<{ count: string }>('SELECT COUNT(*) FROM usage_records');

    return reply.send({
      success: true,
      data: res.rows,
      pagination: { page, limit, total: parseInt(countRes.rows[0]?.count ?? '0', 10) },
    });
  });

  // POST /api/admin/usage-records
  fastify.post('/usage-records', async (request, reply) => {
    const schema = z.object({
      sectionId: z.string().uuid(),
      name: z.string().min(1),
      usageDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } });
    }

    const res = await query(
      'INSERT INTO usage_records (section_id, name, usage_date, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [parsed.data.sectionId, parsed.data.name, parsed.data.usageDate, request.user.id]
    );

    return reply.status(201).send({ success: true, data: res.rows[0] });
  });

  // PATCH /api/admin/usage-records/:id
  fastify.patch<{ Params: { id: string } }>('/usage-records/:id', async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1).optional(),
      usageDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message } });
    }

    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (parsed.data.name) {
      fields.push(`name = $${idx++}`);
      params.push(parsed.data.name);
    }
    if (parsed.data.usageDate) {
      fields.push(`usage_date = $${idx++}`);
      params.push(parsed.data.usageDate);
    }
    fields.push('updated_at = NOW()');
    params.push(request.params.id);

    const res = await query(`UPDATE usage_records SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    if (res.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Record not found' } });
    }

    return reply.send({ success: true, data: res.rows[0] });
  });

  // DELETE /api/admin/usage-records/:id
  fastify.delete<{ Params: { id: string } }>('/usage-records/:id', async (request, reply) => {
    const res = await query('DELETE FROM usage_records WHERE id = $1 RETURNING id', [request.params.id]);
    if (res.rows.length === 0) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Record not found' } });
    }
    return reply.send({ success: true, message: 'Record deleted' });
  });

  // ──────────────────────────────────────────────────────────────────
  // ERROR LOGS
  // ──────────────────────────────────────────────────────────────────

  // GET /api/admin/error-logs
  fastify.get('/error-logs', async (request, reply) => {
    const q = request.query as Record<string, string>;
    const page = Math.max(1, parseInt(q.page ?? '1', 10));
    const limit = Math.min(100, parseInt(q.limit ?? '30', 10));
    const offset = (page - 1) * limit;

    const res = await query(
      `SELECT id, user_id, user_email, source, level, endpoint, method, status_code, message, stack_trace, metadata, created_at
       FROM error_logs
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const countRes = await query<{ count: string }>('SELECT COUNT(*) FROM error_logs');

    return reply.send({
      success: true,
      data: res.rows,
      pagination: { page, limit, total: parseInt(countRes.rows[0]?.count ?? '0', 10) },
    });
  });

  // DELETE /api/admin/error-logs/:id
  fastify.delete<{ Params: { id: string } }>('/error-logs/:id', async (request, reply) => {
    await query('DELETE FROM error_logs WHERE id = $1', [request.params.id]);
    return reply.send({ success: true, message: 'Error log deleted' });
  });

  // DELETE /api/admin/error-logs (Clear all)
  fastify.delete('/error-logs', async (request, reply) => {
    await query('DELETE FROM error_logs');
    return reply.send({ success: true, message: 'All error logs cleared' });
  });

  // ──────────────────────────────────────────────────────────────────
  // RAW DATABASE TABLES EXPLORER & METADATA
  // ──────────────────────────────────────────────────────────────────

  // GET /api/admin/database/tables (List all safe tables with row counts and column metadata)
  fastify.get('/database/tables', async (request, reply) => {
    const allowedTables = ['users', 'machines', 'sections', 'usage_records', 'error_logs', 'audit_logs', 'backup_history', 'backup_config'];
    
    const tablesInfo = await Promise.all(
      allowedTables.map(async (table) => {
        const [countRes, sizeRes] = await Promise.all([
          query<{ count: string }>(`SELECT COUNT(*) FROM ${table}`),
          query<{ total_size: string }>(`SELECT pg_size_pretty(pg_total_relation_size($1)) AS total_size`, [table]).catch(() => ({ rows: [{ total_size: 'N/A' }] })),
        ]);
        return {
          name: table,
          rowCount: parseInt(countRes.rows[0]?.count ?? '0', 10),
          size: sizeRes.rows[0]?.total_size ?? 'N/A',
        };
      })
    );

    return reply.send({ success: true, data: tablesInfo });
  });

  // GET /api/admin/database/tables/:table/schema
  fastify.get<{ Params: { table: string } }>('/database/tables/:table/schema', async (request, reply) => {
    const allowed = ['users', 'machines', 'sections', 'usage_records', 'error_logs', 'audit_logs', 'backup_history', 'backup_config'];
    const tableName = request.params.table.toLowerCase();
    if (!allowed.includes(tableName)) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_TABLE', message: 'Table not accessible' } });
    }

    const res = await query(
      `SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
       FROM information_schema.columns
       WHERE table_name = $1 AND table_schema = 'public'
       ORDER BY ordinal_position ASC`,
      [tableName]
    );

    return reply.send({ success: true, data: res.rows });
  });

  // GET /api/admin/tables/:table
  fastify.get<{ Params: { table: string } }>('/tables/:table', async (request, reply) => {
    const allowed = ['users', 'machines', 'sections', 'usage_records', 'error_logs', 'audit_logs', 'backup_history', 'backup_config'];
    const tableName = request.params.table.toLowerCase();
    if (!allowed.includes(tableName)) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_TABLE', message: 'Table not accessible' } });
    }

    const q = request.query as Record<string, string>;
    const page = Math.max(1, parseInt(q.page ?? '1', 10));
    const limit = Math.min(100, parseInt(q.limit ?? '25', 10));
    const offset = (page - 1) * limit;

    const rowsRes = await query(`SELECT * FROM ${tableName} ORDER BY 1 DESC LIMIT $1 OFFSET $2`, [limit, offset]);
    const countRes = await query<{ count: string }>(`SELECT COUNT(*) FROM ${tableName}`);

    // Mask sensitive fields if viewing users table directly
    const sanitizedRows = rowsRes.rows.map(r => {
      if (tableName === 'users' && r.password_hash) {
        return { ...r, password_hash: '[PROTECTED_HASH]' };
      }
      return r;
    });

    return reply.send({
      success: true,
      table: tableName,
      data: sanitizedRows,
      pagination: { page, limit, total: parseInt(countRes.rows[0]?.count ?? '0', 10) },
    });
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
