import { FastifyPluginAsync } from 'fastify';
import { ErrorLogsService } from './error-logs.service.js';

export const errorLogRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/logs/error - Ingest error from client or service
  fastify.post('/logs/error', async (request, reply) => {
    const body = (request.body as any) || {};
    let userId: string | undefined;
    let userEmail: string | undefined;

    // Optional user token extraction if provided
    try {
      if (request.headers.authorization) {
        const decoded = await request.jwtVerify() as any;
        userId = decoded?.id;
        userEmail = decoded?.email;
      }
    } catch {
      // Ignored for error ingestion
    }

    const log = await ErrorLogsService.logError({
      userId: body.userId || userId,
      userEmail: body.userEmail || userEmail,
      source: body.source || 'client',
      level: body.level || 'error',
      endpoint: body.endpoint,
      method: body.method,
      statusCode: body.statusCode,
      message: body.message || 'Unknown client error',
      stackTrace: body.stackTrace || body.stack,
      metadata: body.metadata || {},
    });

    return reply.status(201).send({
      success: true,
      data: log,
    });
  });

  // GET /api/logs/error - View error logs (admin / inspection)
  fastify.get<{ Querystring: { limit?: string; offset?: string } }>(
    '/logs/error',
    async (request, reply) => {
      const limit = parseInt(request.query.limit || '100', 10);
      const offset = parseInt(request.query.offset || '0', 10);

      const logs = await ErrorLogsService.getLogs(limit, offset);
      return reply.status(200).send({
        success: true,
        count: logs.length,
        data: logs,
      });
    }
  );

  // DELETE /api/logs/error - Clear error logs
  fastify.delete('/logs/error', async (request, reply) => {
    const deletedCount = await ErrorLogsService.clearLogs();
    return reply.status(200).send({
      success: true,
      message: `Cleared ${deletedCount} error log entries`,
    });
  });
};
