import { FastifyPluginAsync } from 'fastify';
import { query } from '../../db/index.js';
import { authenticate } from '../../middleware/auth.js';

export const reportRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // GET /api/reports/summary
  fastify.get('/summary', async (request, reply) => {
    const userId = request.user.id;

    const [machinesRes, sectionsRes, recordsRes] = await Promise.all([
      query('SELECT COUNT(*)::int as count FROM machines WHERE user_id = $1', [userId]),
      query('SELECT COUNT(*)::int as count FROM sections WHERE user_id = $1', [userId]),
      query('SELECT COUNT(*)::int as count FROM usage_records WHERE user_id = $1', [userId]),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        totalMachines: machinesRes.rows[0]?.count ?? 0,
        totalSections: sectionsRes.rows[0]?.count ?? 0,
        totalUsageRecords: recordsRes.rows[0]?.count ?? 0,
      },
    });
  });
};
