import { FastifyRequest, FastifyReply } from 'fastify';

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const payload = await request.jwtVerify<{ id: string; email: string }>();
    if (!payload || !payload.id) {
      reply.status(401).send({
        success: false,
        message: 'Unauthorized: Invalid authentication credentials',
      });
      return;
    }
  } catch (err) {
    reply.status(401).send({
      success: false,
      message: 'Unauthorized: Access token is missing, invalid, or expired',
    });
  }
}

