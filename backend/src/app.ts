import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { authRoutes } from './modules/auth/auth.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { machineRoutes } from './modules/machines/machines.routes.js';
import { sectionRoutes } from './modules/sections/sections.routes.js';
import { usageRecordRoutes } from './modules/usage-records/usage-records.routes.js';
import { reportRoutes } from './modules/reports/reports.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { errorLogRoutes } from './modules/error-logs/error-logs.routes.js';
import { ErrorLogsService } from './modules/error-logs/error-logs.service.js';
import { query } from './db/index.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: env.NODE_ENV === 'development',
    trustProxy: true,
  });

  // 1. CORS
  app.register(cors, {
    origin: env.CORS_ORIGINS === '*' ? true : env.CORS_ORIGINS.split(','),
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // 2. Rate Limiting (global: 100 req/min for normal users)
  app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
  });

  // 3. JWT Authentication
  app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  });

  // 4. Health Check Endpoints (for Coolify & Docker probes)
  app.get('/health', async (request, reply) => {
    let dbStatus = 'connected';
    try {
      await query('SELECT 1');
    } catch {
      dbStatus = 'disconnected';
    }

    const isHealthy = dbStatus === 'connected';
    reply.status(isHealthy ? 200 : 503).send({
      status: isHealthy ? 'ok' : 'degraded',
      service: 'equiptrack-api',
      version: '1.0.0',
      uptime: Math.floor(process.uptime()),
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness check — verifies DB connectivity before accepting traffic
  app.get('/health/ready', async (request, reply) => {
    try {
      await query('SELECT 1');
      reply.status(200).send({ status: 'ready', database: 'connected' });
    } catch {
      reply.status(503).send({ status: 'not_ready', database: 'disconnected' });
    }
  });

  // Liveness check — just confirms the process is alive
  app.get('/health/live', async (request, reply) => {
    reply.status(200).send({ status: 'alive' });
  });

  // 5. Admin Panel Static UI (/admin/)
  const publicDir = path.resolve(__dirname, '..', 'public', 'admin');
  app.register(fastifyStatic, {
    root: publicDir,
    prefix: '/admin/',
  });

  app.get('/admin', async (request, reply) => {
    return reply.redirect('/admin/');
  });

  // 5. Register API Routes
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(machineRoutes, { prefix: '/api/machines' });
  app.register(sectionRoutes, { prefix: '/api' });
  app.register(usageRecordRoutes, { prefix: '/api' });
  app.register(reportRoutes, { prefix: '/api/reports' });
  app.register(errorLogRoutes, { prefix: '/api' });

  // Admin routes with stricter rate limiting (30 req/min)
  app.register(
    async (adminApp) => {
      adminApp.register(rateLimit, {
        max: 30,
        timeWindow: '1 minute',
        keyGenerator: (req) => req.ip,
      });
      adminApp.register(adminRoutes, { prefix: '/' });
    },
    { prefix: '/api/admin' }
  );

  // 6. Global Error Handler
  app.setErrorHandler(async (error: Error & { statusCode?: number }, request, reply) => {
    app.log.error(error);
    const statusCode = error.statusCode || 500;

    // Log to DB if 4xx/5xx error
    try {
      const user = (request as any).user;
      await ErrorLogsService.logError({
        userId: user?.id,
        userEmail: user?.email,
        source: 'server',
        level: statusCode >= 500 ? 'error' : 'warn',
        endpoint: request.url,
        method: request.method,
        statusCode: statusCode,
        message: error.message || 'Server error',
        stackTrace: error.stack,
        metadata: {
          params: request.params,
          query: request.query,
        },
      });
    } catch {
      // Best-effort error logging
    }

    reply.status(statusCode).send({
      success: false,
      error: {
        code: statusCode === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
        message:
          env.NODE_ENV === 'production' && statusCode === 500
            ? 'Internal server error'
            : error.message || 'An unexpected error occurred',
      },
    });
  });

  return app;
}
