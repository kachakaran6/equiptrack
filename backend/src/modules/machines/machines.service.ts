import { pool, query } from '../../db/index.js';
import { AuditContext } from '../audit/audit.types.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateMachineInput, UpdateMachineInput } from './machines.schemas.js';

export interface MachineRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export class MachinesService {
  static async listUserMachines(_userId: string): Promise<MachineRow[]> {
    const result = await query<MachineRow>(
      'SELECT id, user_id, name, description, created_at, updated_at FROM machines ORDER BY name ASC'
    );
    return result.rows;
  }

  static async getUserMachineById(_userId: string, machineId: string): Promise<MachineRow | null> {
    const result = await query<MachineRow>(
      'SELECT id, user_id, name, description, created_at, updated_at FROM machines WHERE id = $1',
      [machineId]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a machine with transactional audit and PostHog outbox event
   */
  static async createMachine(context: AuditContext, input: CreateMachineInput): Promise<MachineRow> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query<MachineRow>(
        'INSERT INTO machines (user_id, name, description) VALUES ($1, $2, $3) RETURNING id, user_id, name, description, created_at, updated_at',
        [context.actorUserId, input.name.trim(), input.description ?? null]
      );
      const newMachine = result.rows[0];

      await AuditService.recordMutation(client, context, {
        action: 'machine.created',
        resourceType: 'machine',
        resourceId: newMachine.id,
        resourceLabel: newMachine.name,
        before: null,
        after: newMachine as unknown as Record<string, unknown>,
      });

      await client.query('COMMIT');
      return newMachine;
    } catch (err: any) {
      await client.query('ROLLBACK');
      await AuditService.recordFailure(context, {
        action: 'machine.created',
        resourceType: 'machine',
        resourceLabel: input.name,
        error: err,
      });
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update machine with transactional audit and field-level diff calculation
   */
  static async updateMachine(
    context: AuditContext,
    machineId: string,
    input: UpdateMachineInput
  ): Promise<MachineRow | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query<MachineRow>(
        'SELECT id, user_id, name, description, created_at, updated_at FROM machines WHERE id = $1 FOR UPDATE',
        [machineId]
      );
      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      const before = existing.rows[0];

      const result = await client.query<MachineRow>(
        `UPDATE machines 
         SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3 
         RETURNING id, user_id, name, description, created_at, updated_at`,
        [input.name.trim(), input.description, machineId]
      );
      const after = result.rows[0];

      await AuditService.recordMutation(client, context, {
        action: 'machine.updated',
        resourceType: 'machine',
        resourceId: machineId,
        resourceLabel: after.name,
        before: before as unknown as Record<string, unknown>,
        after: after as unknown as Record<string, unknown>,
      });

      await client.query('COMMIT');
      return after;
    } catch (err: any) {
      await client.query('ROLLBACK');
      await AuditService.recordFailure(context, {
        action: 'machine.updated',
        resourceType: 'machine',
        resourceId: machineId,
        error: err,
      });
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Duplicate machine with transactional audit
   */
  static async duplicateMachine(
    context: AuditContext,
    machineId: string,
    input?: { name?: string; description?: string | null }
  ): Promise<MachineRow | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const sourceRes = await client.query<MachineRow>(
        'SELECT id, user_id, name, description, created_at, updated_at FROM machines WHERE id = $1',
        [machineId]
      );
      if (sourceRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      const source = sourceRes.rows[0];

      const newName = input?.name?.trim() || `${source.name} (Copy)`;
      const newDescription =
        input?.description !== undefined ? input.description : source.description;

      const machineRes = await client.query<MachineRow>(
        'INSERT INTO machines (user_id, name, description) VALUES ($1, $2, $3) RETURNING id, user_id, name, description, created_at, updated_at',
        [context.actorUserId, newName, newDescription]
      );
      const newMachine = machineRes.rows[0];

      const sectionsRes = await client.query<{ name: string; category_id: string | null }>(
        'SELECT name, category_id FROM sections WHERE machine_id = $1 ORDER BY created_at ASC',
        [machineId]
      );

      for (const section of sectionsRes.rows) {
        await client.query(
          'INSERT INTO sections (machine_id, user_id, name, category_id) VALUES ($1, $2, $3, $4)',
          [newMachine.id, context.actorUserId, section.name, section.category_id]
        );
      }

      await AuditService.recordMutation(client, context, {
        action: 'machine.duplicated',
        resourceType: 'machine',
        resourceId: newMachine.id,
        resourceLabel: newMachine.name,
        before: null,
        after: newMachine as unknown as Record<string, unknown>,
        metadata: {
          sourceMachineId: machineId,
          sourceMachineName: source.name,
          copiedSectionsCount: sectionsRes.rows.length,
        },
      });

      await client.query('COMMIT');
      return newMachine;
    } catch (err: any) {
      await client.query('ROLLBACK');
      await AuditService.recordFailure(context, {
        action: 'machine.duplicated',
        resourceType: 'machine',
        resourceId: machineId,
        error: err,
      });
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Delete machine with transactional audit and cascade impact tracking
   */
  static async deleteMachine(
    context: AuditContext,
    machineId: string,
    reason?: string
  ): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query<MachineRow>(
        'SELECT id, user_id, name, description, created_at, updated_at FROM machines WHERE id = $1 FOR UPDATE',
        [machineId]
      );
      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }
      const before = existing.rows[0];

      // Quantify cascade impact before deletion
      const secCountRes = await client.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM sections WHERE machine_id = $1',
        [machineId]
      );
      const recCountRes = await client.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM usage_records WHERE section_id IN (SELECT id FROM sections WHERE machine_id = $1)',
        [machineId]
      );
      const cascadeSections = parseInt(secCountRes.rows[0].count, 10);
      const cascadeUsageRecords = parseInt(recCountRes.rows[0].count, 10);

      // Delete machine (foreign keys cascade delete sections and usage_records)
      await client.query('DELETE FROM machines WHERE id = $1', [machineId]);

      await AuditService.recordMutation(client, context, {
        action: 'machine.deleted',
        resourceType: 'machine',
        resourceId: machineId,
        resourceLabel: before.name,
        before: before as unknown as Record<string, unknown>,
        after: null,
        reason,
        metadata: {
          cascadeSectionsCount: cascadeSections,
          cascadeUsageRecordsCount: cascadeUsageRecords,
        },
      });

      await client.query('COMMIT');
      return true;
    } catch (err: any) {
      await client.query('ROLLBACK');
      await AuditService.recordFailure(context, {
        action: 'machine.deleted',
        resourceType: 'machine',
        resourceId: machineId,
        error: err,
      });
      throw err;
    } finally {
      client.release();
    }
  }
}
