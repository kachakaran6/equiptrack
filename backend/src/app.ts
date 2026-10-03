import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { machineRoutes } from './modules/machines/machines.routes.js';
import { sectionRoutes } from './modules/sections/sections.routes.js';
import { usageRecordRoutes } from './modules/usage-records/usage-records.routes.js';
import { reportRoutes } from './modules/reports/reports.routes.js';

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

  // 2. Rate Limiting
  app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // 3. JWT Authentication
  app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  });

  // 4. Health Check Endpoint (for Coolify & Docker probes)
  app.get('/health', async (request, reply) => {
    let dbStatus = 'connected';
    try {
      await import('./db/index.js').then((m) => m.query('SELECT 1'));
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

  // 5. Register API Routes
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(machineRoutes, { prefix: '/api/machines' });
  app.register(sectionRoutes, { prefix: '/api' });
  app.register(usageRecordRoutes, { prefix: '/api' });
  app.register(reportRoutes, { prefix: '/api/reports' });

  // 6. Global Error Handler
  app.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
    app.log.error(error);
    const statusCode = error.statusCode || 500;

    reply.status(statusCode).send({
      success: false,
      message:
        env.NODE_ENV === 'production' && statusCode === 500
          ? 'Internal server error'
          : error.message || 'An unexpected error occurred',
    });
  });

  return app;
}
