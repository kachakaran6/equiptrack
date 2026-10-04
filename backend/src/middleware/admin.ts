import { FastifyRequest, FastifyReply } from 'fastify';
import { query } from '../db/index.js';

/**
 * Admin authorization middleware.
 * NEVER trusts the role from the JWT token alone.
 * Always re-validates the role from the database to prevent privilege escalation.
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // 1. Verify JWT is valid and extract user id
    const payload = await request.jwtVerify<{ id: string; email: string; role: string }>();
    if (!payload?.id) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    // 2. Re-check role from database — never trust client-supplied role
    const result = await query<{ role: string; status: string }>(
      'SELECT role, status FROM users WHERE id = $1',
      [payload.id]
    );

    if (result.rows.length === 0) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not found' },
      });
    }

    const dbUser = result.rows[0];

    if (dbUser.status === 'suspended') {
      return reply.status(403).send({
        success: false,
        error: { code: 'ACCOUNT_SUSPENDED', message: 'Account suspended' },
      });
    }

    if (dbUser.role !== 'admin') {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' },
      });
    }

    // Role confirmed from DB — safe to proceed
  } catch {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired authentication token' },
    });
  }
}
