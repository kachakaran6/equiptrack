import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Demo and Bot Shield Middleware
 * Intercepts write/delete operations from demo / reviewer accounts (such as Play Store review bot `aayush@gmail.com`).
 * Returns simulated success responses so automated app-store crawlers and reviewers pass without crashes or 4xx errors,
 * while ensuring ZERO data in PostgreSQL is ever modified or deleted.
 */
export async function demoGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // Allow safe read operations (GET, HEAD, OPTIONS)
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return;
  }

  // Allow auth and error-log operations
  if (request.url.startsWith('/api/auth') || request.url.startsWith('/api/error-logs')) {
    return;
  }

  // Attempt to extract user from JWT
  let user = (request as any).user as { id?: string; email?: string; role?: string } | undefined;
  if (!user?.email) {
    try {
      user = await request.jwtVerify<{ id: string; email: string; role: string }>();
    } catch {
      // If not authenticated or token missing, normal route authentication handler will handle it
      return;
    }
  }

  const email = (user?.email || '').toLowerCase().trim();
  const role = (user?.role || '').toLowerCase().trim();

  const isDemoUser =
    email === 'aayush@gmail.com' ||
    role === 'demo' ||
    role === 'reviewer' ||
    email.includes('playstore') ||
    email.includes('testlab');

  if (isDemoUser) {
    request.log.warn(
      `[DEMO BOT SHIELD] Prevented mutating request ${request.method} ${request.url} by ${email}. Simulated success returned.`
    );

    // If it's a DELETE operation
    if (request.method === 'DELETE') {
      return reply.status(200).send({
        success: true,
        message: 'Deleted successfully (sandbox mode)',
      });
    }

    // If it's a POST/PATCH/PUT operation
    const body =
      request.body && typeof request.body === 'object'
        ? (request.body as Record<string, unknown>)
        : {};

    return reply.status(request.method === 'POST' ? 201 : 200).send({
      success: true,
      message: 'Saved successfully (sandbox mode)',
      data: {
        id: 'sandbox-' + Math.random().toString(36).substring(2, 10),
        ...body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  }
}
