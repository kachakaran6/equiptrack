import { pool, query } from '../../db/index.js';
import { AuditContext } from '../audit/audit.types.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateSectionInput, UpdateSectionInput } from './sections.schemas.js';

export interface SectionRow {
  id: string;
  machine_id: string;
  user_id: string;
  name: string;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

export class SectionsService {
  static async listSectionsByMachine(_userId: string, machineId: string): Promise<SectionRow[] | null> {
    const machineCheck = await query('SELECT id FROM machines WHERE id = $1', [machineId]);
    if (machineCheck.rows.length === 0) {
      return null;
    }

    const result = await query<SectionRow>(
      'SELECT id, machine_id, user_id, name, category_id, created_at, updated_at FROM sections WHERE machine_id = $1 ORDER BY name ASC',
      [machineId]
    );
    return result.rows;
  }

  static async getSectionById(_userId: string, sectionId: string): Promise<SectionRow | null> {
    const result = await query<SectionRow>(
      'SELECT id, machine_id, user_id, name, category_id, created_at, updated_at FROM sections WHERE id = $1',
      [sectionId]
    );
    return result.rows[0] || null;
  }

  /**
   * Create section with transactional audit
   */
  static async createSection(
    context: AuditContext,
    machineId: string,
    input: CreateSectionInput
  ): Promise<SectionRow | null> {
    const machineCheck = await query('SELECT id, name FROM machines WHERE id = $1', [machineId]);
    if (machineCheck.rows.length === 0) {
      return null;
    }
    const machineName = machineCheck.rows[0].name;

    const categoryId = input.category_id ?? null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query<SectionRow>(
        'INSERT INTO sections (machine_id, user_id, name, category_id) VALUES ($1, $2, $3, $4) RETURNING id, machine_id, user_id, name, category_id, created_at, updated_at',
        [machineId, context.actorUserId, input.name.trim(), categoryId]
      );
      const newSection = result.rows[0];

      await AuditService.recordMutation(client, context, {
        action: 'section.created',
        resourceType: 'section',
        resourceId: newSection.id,
        resourceLabel: newSection.name,
        before: null,
        after: newSection as unknown as Record<string, unknown>,
        metadata: {
          machineId,
          machineName,
          categoryId,
        },
      });

      await client.query('COMMIT');
      return newSection;
    } catch (err: any) {
      await client.query('ROLLBACK');
      await AuditService.recordFailure(context, {
        action: 'section.created',
        resourceType: 'section',
        resourceLabel: input.name,
        error: err,
        metadata: { machineId },
      });
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update section with transactional audit and diff calculation
   */
  static async updateSection(
    context: AuditContext,
    sectionId: string,
    input: UpdateSectionInput
  ): Promise<SectionRow | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query<SectionRow>(
        'SELECT id, machine_id, user_id, name, category_id, created_at, updated_at FROM sections WHERE id = $1 FOR UPDATE',
        [sectionId]
      );
      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      const before = existing.rows[0];

      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (input.name !== undefined) {
        fields.push(`name = $${idx++}`);
        values.push(input.name.trim());
      }
      if (input.category_id !== undefined) {
        fields.push(`category_id = $${idx++}`);
        values.push(input.category_id);
      }

      if (fields.length === 0) {
        await client.query('ROLLBACK');
        return before;
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(sectionId);

      const result = await client.query<SectionRow>(
        `UPDATE sections 
         SET ${fields.join(', ')} 
         WHERE id = $${idx} 
         RETURNING id, machine_id, user_id, name, category_id, created_at, updated_at`,
        values
      );
      const after = result.rows[0];

      await AuditService.recordMutation(client, context, {
        action: 'section.updated',
        resourceType: 'section',
        resourceId: sectionId,
        resourceLabel: after.name,
        before: before as unknown as Record<string, unknown>,
        after: after as unknown as Record<string, unknown>,
      });

      await client.query('COMMIT');
      return after;
    } catch (err: any) {
      await client.query('ROLLBACK');
      await AuditService.recordFailure(context, {
        action: 'section.updated',
        resourceType: 'section',
        resourceId: sectionId,
        error: err,
      });
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Delete section with transactional audit and cascade usage records tracking
   */
  static async deleteSection(
    context: AuditContext,
    sectionId: string,
    reason?: string
  ): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query<SectionRow>(
        'SELECT id, machine_id, user_id, name, category_id, created_at, updated_at FROM sections WHERE id = $1 FOR UPDATE',
        [sectionId]
      );
      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }
      const before = existing.rows[0];

      // Quantify cascade usage records count
      const recCountRes = await client.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM usage_records WHERE section_id = $1',
        [sectionId]
      );
      const cascadeUsageRecords = parseInt(recCountRes.rows[0].count, 10);

      await client.query('DELETE FROM sections WHERE id = $1', [sectionId]);

      await AuditService.recordMutation(client, context, {
        action: 'section.deleted',
        resourceType: 'section',
        resourceId: sectionId,
        resourceLabel: before.name,
        before: before as unknown as Record<string, unknown>,
        after: null,
        reason,
        metadata: {
          machineId: before.machine_id,
          categoryId: before.category_id,
          cascadeUsageRecordsCount: cascadeUsageRecords,
        },
      });

      await client.query('COMMIT');
      return true;
    } catch (err: any) {
      await client.query('ROLLBACK');
      await AuditService.recordFailure(context, {
        action: 'section.deleted',
        resourceType: 'section',
        resourceId: sectionId,
        error: err,
      });
      throw err;
    } finally {
      client.release();
    }
  }
}
