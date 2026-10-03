import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { createSectionSchema, updateSectionSchema } from './sections.schemas.js';
import { SectionsService } from './sections.service.js';

export const sectionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // GET /api/machines/:machineId/sections
  fastify.get<{ Params: { machineId: string } }>(
    '/machines/:machineId/sections',
    async (request, reply) => {
      const sections = await SectionsService.listSectionsByMachine(
        request.user.id,
        request.params.machineId
      );
      if (sections === null) {
        return reply.status(404).send({
          success: false,
          message: 'Machine not found',
        });
      }

      return reply.status(200).send({
        success: true,
        data: sections,
      });
    }
  );

  // POST /api/machines/:machineId/sections
  fastify.post<{ Params: { machineId: string } }>(
    '/machines/:machineId/sections',
    async (request, reply) => {
      const parsed = createSectionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          message: parsed.error.issues[0]?.message || 'Invalid section data',
          errors: parsed.error.issues,
        });
      }

      const section = await SectionsService.createSection(
        request.user.id,
        request.params.machineId,
        parsed.data
      );

      if (section === null) {
        return reply.status(404).send({
          success: false,
          message: 'Parent machine not found',
        });
      }

      return reply.status(201).send({
        success: true,
        data: section,
      });
    }
  );

  // GET /api/sections/:id
  fastify.get<{ Params: { id: string } }>('/sections/:id', async (request, reply) => {
    const section = await SectionsService.getSectionById(request.user.id, request.params.id);
    if (!section) {
      return reply.status(404).send({
        success: false,
        message: 'Section not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: section,
    });
  });

  // PATCH /api/sections/:id
  fastify.patch<{ Params: { id: string } }>('/sections/:id', async (request, reply) => {
    const parsed = updateSectionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid section data',
        errors: parsed.error.issues,
      });
    }

    const section = await SectionsService.updateSection(
      request.user.id,
      request.params.id,
      parsed.data
    );

    if (!section) {
      return reply.status(404).send({
        success: false,
        message: 'Section not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: section,
    });
  });

  // DELETE /api/sections/:id
  fastify.delete<{ Params: { id: string } }>('/sections/:id', async (request, reply) => {
    const deleted = await SectionsService.deleteSection(request.user.id, request.params.id);
    if (!deleted) {
      return reply.status(404).send({
        success: false,
        message: 'Section not found',
      });
    }

    return reply.status(200).send({
      success: true,
      message: 'Section deleted successfully',
    });
  });
};
