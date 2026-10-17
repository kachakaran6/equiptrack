import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin } from '../../middleware/admin.js';
import { AuditService } from './audit.service.js';
import { AuditOutboxWorker } from './audit-outbox.worker.js';

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  action: z.string().optional(),
  resource_type: z.string().optional(),
  resource_id: z.string().optional(),
  actor_user_id: z.string().optional(),
  actor_email: z.string().optional(),
  outcome: z.enum(['SUCCESS', 'FAILURE']).optional(),
  source: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export async function auditRoutes(fastify: FastifyInstance) {
  // Global admin guard: all routes in this plugin require admin privileges
  fastify.addHook('preHandler', requireAdmin);

  // GET /api/admin/audit-logs
  fastify.get('/audit-logs', async (request, reply) => {
    const parseRes = auditQuerySchema.safeParse(request.query);
    if (!parseRes.success) {
      return reply.status(400).send({
        success: false,
        message: 'Invalid query parameters',
        errors: parseRes.error.issues,
      });
    }

    const {
      page,
      limit,
      search,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      actor_user_id: actorUserId,
      actor_email: actorEmail,
      outcome,
      source,
      start_date: startDate,
      end_date: endDate,
    } = parseRes.data;

    const result = await AuditService.list({
      page,
      limit,
      search,
      action,
      resourceType,
      resourceId,
      actorUserId,
      actorEmail,
      outcome,
      source,
      startDate,
      endDate,
    });

    return reply.status(200).send({
      success: true,
      data: result.rows,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  // GET /api/admin/audit-logs/outbox-stats
  fastify.get('/audit-logs/outbox-stats', async (request, reply) => {
    const stats = await AuditService.getOutboxStats();
    return reply.status(200).send({
      success: true,
      data: stats,
    });
  });

  // POST /api/admin/audit-logs/outbox-retry
  fastify.post('/audit-logs/outbox-retry', async (request, reply) => {
    const processed = await AuditOutboxWorker.processBatch();
    return reply.status(200).send({
      success: true,
      message: `Triggered outbox processing; delivered ${processed} events.`,
    });
  });

  // GET /api/admin/audit-logs/export
  fastify.get('/audit-logs/export', async (request, reply) => {
    const parseRes = auditQuerySchema.safeParse(request.query);
    const filters = parseRes.success ? parseRes.data : auditQuerySchema.parse({});

    const csvData = await AuditService.exportCsv({
      search: filters.search,
      action: filters.action,
      resourceType: filters.resource_type,
      resourceId: filters.resource_id,
      actorUserId: filters.actor_user_id,
      actorEmail: filters.actor_email,
      outcome: filters.outcome,
      source: filters.source,
      startDate: filters.start_date,
      endDate: filters.end_date,
    });

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename="equiptrack_audit_trail_${new Date().toISOString().slice(0, 10)}.csv"`);
    return reply.send(csvData);
  });

  // GET /api/admin/audit-logs/:id
  fastify.get<{ Params: { id: string } }>('/audit-logs/:id', async (request, reply) => {
    const result = await AuditService.getById(request.params.id);
    if (!result.auditLog) {
      return reply.status(404).send({
        success: false,
        message: 'Audit log entry not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: {
        ...result.auditLog,
        outbox: result.outbox,
      },
    });
  });
}
