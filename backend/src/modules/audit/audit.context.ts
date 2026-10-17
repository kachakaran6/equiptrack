import { FastifyRequest } from 'fastify';
import { AuditContext, AuditSource } from './audit.types.js';

export function getAuditContext(request: FastifyRequest): AuditContext {
  const user = (request as any).user as { id?: string; email?: string; role?: string } | undefined;

  // Determine source
  let source: AuditSource = 'api';
  const customSource = request.headers['x-client-source'] as string | undefined;
  const userAgent = (request.headers['user-agent'] || '').toLowerCase();

  if (customSource === 'admin_panel' || request.url.startsWith('/api/admin')) {
    source = 'admin_panel';
  } else if (
    customSource === 'mobile_app' ||
    userAgent.includes('dart') ||
    userAgent.includes('flutter') ||
    userAgent.includes('equiptrack-mobile')
  ) {
    source = 'mobile_app';
  }

  const requestId = (request.id || request.headers['x-request-id'] || undefined) as string | undefined;
  const correlationId = (request.headers['x-correlation-id'] || requestId) as string | undefined;
  const appVersion = (request.headers['x-app-version'] || '1.0.0') as string;

  return {
    actorUserId: user?.id || null,
    actorEmail: user?.email || null,
    actorRole: user?.role || (user ? 'user' : 'anonymous'),
    source,
    requestId,
    correlationId,
    ipAddress: request.ip,
    applicationVersion: appVersion,
  };
}
