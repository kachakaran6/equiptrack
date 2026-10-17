import { pool, query } from '../../db/index.js';
import { AuditContext } from '../audit/audit.types.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateUsageRecordInput, UpdateUsageRecordInput } from './usage-records.schemas.js';

export interface UsageRecordRow {
  id: string;
  section_id: string;
  user_id: string;
  name: string;
  usage_date: string;
  created_at: string;
  updated_at: string;
}

export class UsageRecordsService {
  static async listRecordsBySection(_userId: string, sectionId: string): Promise<UsageRecordRow[] | null> {
    const sectionCheck = await query('SELECT id FROM sections WHERE id = $1', [sectionId]);
    if (sectionCheck.rows.length === 0) {
      return null;
    }

    const result = await query<UsageRecordRow>(
      'SELECT id, section_id, user_id, name, usage_date, created_at, updated_at FROM usage_records WHERE section_id = $1 ORDER BY usage_date ASC, created_at ASC',
      [sectionId]
    );
    return result.rows;
  }

  static async getRecordById(_userId: string, recordId: string): Promise<UsageRecordRow | null> {
    const result = await query<UsageRecordRow>(
      'SELECT id, section_id, user_id, name, usage_date, created_at, updated_at FROM usage_records WHERE id = $1',
      [recordId]
    );
    return result.rows[0] || null;
  }

  static async isDuplicateDate(
    _userId: string,
    sectionId: string,
    date: string,
    excludeRecordId?: string
  ): Promise<boolean> {
    let sql = 'SELECT id FROM usage_records WHERE section_id = $1 AND usage_date = $2';
    const params: any[] = [sectionId, date];

    if (excludeRecordId) {
      sql += ' AND id != $3';
      params.push(excludeRecordId);
    }

    const result = await query(sql, params);
    return result.rows.length > 0;
  }

  /**
   * Create a usage record with transactional auditing
   */
  static async createRecord(
    context: AuditContext,
    sectionId: string,
    input: CreateUsageRecordInput
  ): Promise<{ record?: UsageRecordRow; error?: 'SECTION_NOT_FOUND' }> {
    const sectionCheck = await query<{ id: string; name: string }>(
      'SELECT id, name FROM sections WHERE id = $1',
      [sectionId]
    );
    if (sectionCheck.rows.length === 0) {
      return { error: 'SECTION_NOT_FOUND' };
    }
    const sectionName = sectionCheck.rows[0].name;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query<UsageRecordRow>(
        'INSERT INTO usage_records (section_id, user_id, name, usage_date) VALUES ($1, $2, $3, $4) RETURNING id, section_id, user_id, name, usage_date, created_at, updated_at',
        [sectionId, context.actorUserId, input.name.trim(), input.usage_date]
      );
      const newRecord = result.rows[0];

      await AuditService.recordMutation(client, context, {
        action: 'usage_record.created',
        resourceType: 'usage_record',
        resourceId: newRecord.id,
        resourceLabel: newRecord.name,
        before: null,
        after: newRecord as unknown as Record<string, unknown>,
        metadata: {
          sectionId,
          sectionName,
          usageDate: input.usage_date,
        },
      });

      await client.query('COMMIT');
      return { record: newRecord };
    } catch (err: any) {
      await client.query('ROLLBACK');
      await AuditService.recordFailure(context, {
        action: 'usage_record.created',
        resourceType: 'usage_record',
        resourceLabel: input.name,
        error: err,
        metadata: { sectionId },
      });
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update a usage record with transactional auditing and diff calculation
   */
  static async updateRecord(
    context: AuditContext,
    recordId: string,
    input: UpdateUsageRecordInput
  ): Promise<{ record?: UsageRecordRow; error?: 'RECORD_NOT_FOUND' }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query<UsageRecordRow>(
        'SELECT id, section_id, user_id, name, usage_date, created_at, updated_at FROM usage_records WHERE id = $1 FOR UPDATE',
        [recordId]
      );
      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return { error: 'RECORD_NOT_FOUND' };
      }
      const before = existing.rows[0];

      const result = await client.query<UsageRecordRow>(
        `UPDATE usage_records 
         SET name = $1, usage_date = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3 
         RETURNING id, section_id, user_id, name, usage_date, created_at, updated_at`,
        [input.name.trim(), input.usage_date, recordId]
      );
      const after = result.rows[0];

      await AuditService.recordMutation(client, context, {
        action: 'usage_record.updated',
        resourceType: 'usage_record',
        resourceId: recordId,
        resourceLabel: after.name,
        before: before as unknown as Record<string, unknown>,
        after: after as unknown as Record<string, unknown>,
      });

      await client.query('COMMIT');
      return { record: after };
    } catch (err: any) {
      await client.query('ROLLBACK');
      await AuditService.recordFailure(context, {
        action: 'usage_record.updated',
        resourceType: 'usage_record',
        resourceId: recordId,
        error: err,
      });
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a usage record with transactional auditing
   */
  static async deleteRecord(
    context: AuditContext,
    recordId: string,
    reason?: string
  ): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query<UsageRecordRow>(
        'SELECT id, section_id, user_id, name, usage_date, created_at, updated_at FROM usage_records WHERE id = $1 FOR UPDATE',
        [recordId]
      );
      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }
      const before = existing.rows[0];

      await client.query('DELETE FROM usage_records WHERE id = $1', [recordId]);

      await AuditService.recordMutation(client, context, {
        action: 'usage_record.deleted',
        resourceType: 'usage_record',
        resourceId: recordId,
        resourceLabel: before.name,
        before: before as unknown as Record<string, unknown>,
        after: null,
        reason,
        metadata: {
          sectionId: before.section_id,
          usageDate: before.usage_date,
        },
      });

      await client.query('COMMIT');
      return true;
    } catch (err: any) {
      await client.query('ROLLBACK');
      await AuditService.recordFailure(context, {
        action: 'usage_record.deleted',
        resourceType: 'usage_record',
        resourceId: recordId,
        error: err,
      });
      throw err;
    } finally {
      client.release();
    }
  }
}
