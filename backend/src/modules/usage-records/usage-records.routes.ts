import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import {
  createUsageRecordSchema,
  updateUsageRecordSchema,
} from './usage-records.schemas.js';
import { UsageRecordsService } from './usage-records.service.js';

export const usageRecordRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // GET /api/sections/:sectionId/usage-records
  fastify.get<{ Params: { sectionId: string } }>(
    '/sections/:sectionId/usage-records',
    async (request, reply) => {
      const records = await UsageRecordsService.listRecordsBySection(
        request.user.id,
        request.params.sectionId
      );

      if (records === null) {
        return reply.status(404).send({
          success: false,
          message: 'Section not found',
        });
      }

      return reply.status(200).send({
        success: true,
        data: records,
      });
    }
  );

  // POST /api/sections/:sectionId/usage-records
  fastify.post<{ Params: { sectionId: string } }>(
    '/sections/:sectionId/usage-records',
    async (request, reply) => {
      const parsed = createUsageRecordSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          message: parsed.error.issues[0]?.message || 'Invalid usage record data',
          errors: parsed.error.issues,
        });
      }

      const result = await UsageRecordsService.createRecord(
        request.user.id,
        request.params.sectionId,
        parsed.data
      );

      if (result.error === 'SECTION_NOT_FOUND') {
        return reply.status(404).send({
          success: false,
          message: 'Section not found',
        });
      }

      return reply.status(201).send({
        success: true,
        data: result.record,
      });
    }
  );

  // GET /api/usage-records/:id
  fastify.get<{ Params: { id: string } }>('/usage-records/:id', async (request, reply) => {
    const record = await UsageRecordsService.getRecordById(request.user.id, request.params.id);
    if (!record) {
      return reply.status(404).send({
        success: false,
        message: 'Usage record not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: record,
    });
  });

  // PATCH /api/usage-records/:id
  fastify.patch<{ Params: { id: string } }>('/usage-records/:id', async (request, reply) => {
    const parsed = updateUsageRecordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid usage record data',
        errors: parsed.error.issues,
      });
    }

    const result = await UsageRecordsService.updateRecord(
      request.user.id,
      request.params.id,
      parsed.data
    );

    if (result.error === 'RECORD_NOT_FOUND') {
      return reply.status(404).send({
        success: false,
        message: 'Usage record not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: result.record,
    });
  });

  // DELETE /api/usage-records/:id
  fastify.delete<{ Params: { id: string } }>('/usage-records/:id', async (request, reply) => {
    await UsageRecordsService.deleteRecord(request.user.id, request.params.id);
    return reply.status(200).send({
      success: true,
      message: 'Usage record deleted successfully',
    });
  });

  // GET /api/sections/:sectionId/check-duplicate-date
  fastify.get<{
    Params: { sectionId: string };
    Querystring: { date: string; excludeId?: string };
  }>('/sections/:sectionId/check-duplicate-date', async (request, reply) => {
    const { date, excludeId } = request.query;
    if (!date) {
      return reply.status(400).send({
        success: false,
        message: 'date query parameter is required (YYYY-MM-DD)',
      });
    }

    const isDuplicate = await UsageRecordsService.isDuplicateDate(
      request.user.id,
      request.params.sectionId,
      date,
      excludeId
    );

    return reply.status(200).send({
      success: true,
      data: {
        isDuplicate,
      },
    });
  });
};
