import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { getAuditContext } from '../audit/audit.context.js';
import { createMachineSchema, updateMachineSchema, duplicateMachineSchema } from './machines.schemas.js';
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

    const context = getAuditContext(request);
    const machine = await MachinesService.createMachine(context, parsed.data);
    return reply.status(201).send({
      success: true,
      data: machine,
    });
  });

  // POST /api/machines/:id/duplicate
  fastify.post<{ Params: { id: string } }>('/:id/duplicate', async (request, reply) => {
    const parsed = duplicateMachineSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid duplication data',
        errors: parsed.error.issues,
      });
    }

    const context = getAuditContext(request);
    const machine = await MachinesService.duplicateMachine(
      context,
      request.params.id,
      parsed.data
    );

    if (!machine) {
      return reply.status(404).send({
        success: false,
        message: 'Machine not found',
      });
    }

    return reply.status(201).send({
      success: true,
      data: machine,
      message: 'Machine duplicated successfully with all components',
    });
  });

  // PATCH /api/machines/:id
  fastify.patch<{ Params: { id: string }; Body?: { reason?: string } }>('/:id', async (request, reply) => {
    const parsed = updateMachineSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid machine data',
        errors: parsed.error.issues,
      });
    }

    const context = getAuditContext(request);
    const machine = await MachinesService.updateMachine(
      context,
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
  fastify.delete<{ Params: { id: string }; Body?: { reason?: string } }>('/:id', async (request, reply) => {
    const context = getAuditContext(request);
    const reason = (request.body as any)?.reason;
    const deleted = await MachinesService.deleteMachine(context, request.params.id, reason);
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

