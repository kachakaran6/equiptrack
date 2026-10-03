import { FastifyRequest, FastifyReply } from 'fastify';

export interface AuthUser {
  id: string;
  email: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const payload = await request.jwtVerify<AuthUser>();
    if (!payload || !payload.id) {
      reply.status(401).send({
        success: false,
        message: 'Unauthorized: Invalid authentication credentials',
      });
      return;
    }
    request.user = payload;
  } catch (err) {
    reply.status(401).send({
      success: false,
      message: 'Unauthorized: Access token is missing, invalid, or expired',
    });
  }
}
