import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { createCategorySchema, updateCategorySchema } from './categories.schemas.js';
import { CategoriesService } from './categories.service.js';

export const categoryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // GET /api/machines/:machineId/categories
  fastify.get<{ Params: { machineId: string } }>(
    '/machines/:machineId/categories',
    async (request, reply) => {
      const categories = await CategoriesService.listCategoriesByMachine(
        request.params.machineId
      );
      if (categories === null) {
        return reply.status(404).send({
          success: false,
          message: 'Machine not found',
        });
      }

      return reply.status(200).send({
        success: true,
        data: categories,
      });
    }
  );

  // POST /api/machines/:machineId/categories
  fastify.post<{ Params: { machineId: string } }>(
    '/machines/:machineId/categories',
    async (request, reply) => {
      const parsed = createCategorySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          message: parsed.error.issues[0]?.message || 'Invalid category data',
          errors: parsed.error.issues,
        });
      }

      const res = await CategoriesService.createCategory(
        request.params.machineId,
        parsed.data
      );

      if (res.error) {
        return reply.status(res.status || 400).send({
          success: false,
          message: res.error,
        });
      }

      return reply.status(201).send({
        success: true,
        data: res.category,
      });
    }
  );

  // GET /api/categories/:id
  fastify.get<{ Params: { id: string } }>('/categories/:id', async (request, reply) => {
    const category = await CategoriesService.getCategoryById(request.params.id);
    if (!category) {
      return reply.status(404).send({
        success: false,
        message: 'Category not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: category,
    });
  });

  // PATCH /api/categories/:id
  fastify.patch<{ Params: { id: string } }>('/categories/:id', async (request, reply) => {
    const parsed = updateCategorySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid category data',
        errors: parsed.error.issues,
      });
    }

    const res = await CategoriesService.updateCategory(
      request.params.id,
      parsed.data
    );

    if (res.error) {
      return reply.status(res.status || 400).send({
        success: false,
        message: res.error,
      });
    }

    return reply.status(200).send({
      success: true,
      data: res.category,
    });
  });

  // DELETE /api/categories/:id
  fastify.delete<{ Params: { id: string } }>('/categories/:id', async (request, reply) => {
    await CategoriesService.deleteCategory(request.params.id);
    return reply.status(200).send({
      success: true,
      message: 'Category deleted successfully',
    });
  });
};
