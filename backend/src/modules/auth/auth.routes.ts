import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { registerSchema, loginSchema } from './auth.schemas.js';
import { AuthService } from './auth.service.js';

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/register
  fastify.post('/register', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    handler: async (request, reply) => {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          message: parsed.error.issues[0]?.message || 'Invalid input',
          errors: parsed.error.issues,
        });
      }

      try {
        const user = await AuthService.register(parsed.data);
        // Include role in JWT payload
        const token = fastify.jwt.sign({ id: user.id, email: user.email, role: user.role });

        return reply.status(201).send({
          success: true,
          data: { user, token },
        });
      } catch (err: any) {
        return reply.status(400).send({
          success: false,
          message: err.message || 'Registration failed',
        });
      }
    },
  });

  // POST /api/auth/login
  fastify.post('/login', {
    config: { rateLimit: { max: 15, timeWindow: '1 minute' } },
    handler: async (request, reply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          message: parsed.error.issues[0]?.message || 'Invalid input',
          errors: parsed.error.issues,
        });
      }

      try {
        const user = await AuthService.login(parsed.data);
        // Include role in JWT payload — role is set server-side, never trusted from client
        const token = fastify.jwt.sign({ id: user.id, email: user.email, role: user.role });

        return reply.status(200).send({
          success: true,
          data: { user, token },
        });
      } catch (err: any) {
        return reply.status(401).send({
          success: false,
          message: err.message || 'Invalid credentials',
        });
      }
    },
  });

  // GET /api/auth/me (Protected)
  fastify.get('/me', {
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const user = await AuthService.getUserById(request.user.id);
      if (!user) {
        return reply.status(404).send({
          success: false,
          message: 'User account not found',
        });
      }

      return reply.status(200).send({
        success: true,
        data: { user },
      });
    },
  });

  // POST /api/auth/logout (Protected)
  fastify.post('/logout', {
    preHandler: [authenticate],
    handler: async (_, reply) => {
      return reply.status(200).send({
        success: true,
        message: 'Logged out successfully',
      });
    },
  });
}
