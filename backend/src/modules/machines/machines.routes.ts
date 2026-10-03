import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { createMachineSchema, updateMachineSchema } from './machines.schemas.js';
import { MachinesService } from './machines.service.js';

export const machineRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // GET /api/machines
  fastify.get('/', async (request, reply) => {
    const machines = await MachinesService.listUserMachines(request.user.id);
    return reply.status(200).send({
      success: true,
      data: machines,
    });
  });

  // GET /api/machines/:id
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const machine = await MachinesService.getUserMachineById(request.user.id, request.params.id);
    if (!machine) {
      return reply.status(404).send({
        success: false,
        message: 'Machine not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: machine,
    });
  });

  // POST /api/machines
  fastify.post('/', async (request, reply) => {
    const parsed = createMachineSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid machine data',
        errors: parsed.error.issues,
      });
    }

    const machine = await MachinesService.createMachine(request.user.id, parsed.data);
    return reply.status(201).send({
      success: true,
      data: machine,
    });
  });

  // PATCH /api/machines/:id
  fastify.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const parsed = updateMachineSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid machine data',
        errors: parsed.error.issues,
      });
    }

    const machine = await MachinesService.updateMachine(
      request.user.id,
      request.params.id,
      parsed.data
    );

    if (!machine) {
      return reply.status(404).send({
        success: false,
        message: 'Machine not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: machine,
    });
  });

  // DELETE /api/machines/:id
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const deleted = await MachinesService.deleteMachine(request.user.id, request.params.id);
    if (!deleted) {
      return reply.status(404).send({
        success: false,
        message: 'Machine not found',
      });
    }

    return reply.status(200).send({
      success: true,
      message: 'Machine deleted successfully',
    });
  });
};
