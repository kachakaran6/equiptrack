import { query } from '../../db/index.js';
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
  static async listRecordsBySection(userId: string, sectionId: string): Promise<UsageRecordRow[] | null> {
    // 1. Verify user owns the section
    const sectionCheck = await query('SELECT id FROM sections WHERE id = $1 AND user_id = $2', [
      sectionId,
      userId,
    ]);
    if (sectionCheck.rows.length === 0) {
      return null;
    }

    // 2. Fetch usage records
    const result = await query<UsageRecordRow>(
      'SELECT id, section_id, user_id, name, usage_date, created_at, updated_at FROM usage_records WHERE section_id = $1 AND user_id = $2 ORDER BY usage_date ASC, created_at ASC',
      [sectionId, userId]
    );
    return result.rows;
  }

  static async getRecordById(userId: string, recordId: string): Promise<UsageRecordRow | null> {
    const result = await query<UsageRecordRow>(
      'SELECT id, section_id, user_id, name, usage_date, created_at, updated_at FROM usage_records WHERE id = $1 AND user_id = $2',
      [recordId, userId]
    );
    return result.rows[0] || null;
  }

  static async isDuplicateDate(
    userId: string,
    sectionId: string,
    date: string,
    excludeRecordId?: string
  ): Promise<boolean> {
    let sql = 'SELECT id FROM usage_records WHERE section_id = $1 AND user_id = $2 AND usage_date = $3';
    const params: any[] = [sectionId, userId, date];

    if (excludeRecordId) {
      sql += ' AND id != $4';
      params.push(excludeRecordId);
    }

    const result = await query(sql, params);
    return result.rows.length > 0;
  }

  static async createRecord(
    userId: string,
    sectionId: string,
    input: CreateUsageRecordInput
  ): Promise<{ record?: UsageRecordRow; error?: 'SECTION_NOT_FOUND' | 'DUPLICATE_DATE' }> {
    // 1. Verify section ownership
    const sectionCheck = await query('SELECT id FROM sections WHERE id = $1 AND user_id = $2', [
      sectionId,
      userId,
    ]);
    if (sectionCheck.rows.length === 0) {
      return { error: 'SECTION_NOT_FOUND' };
    }

    // 2. Check for duplicate date in this section
    const isDup = await this.isDuplicateDate(userId, sectionId, input.usage_date);
    if (isDup) {
      return { error: 'DUPLICATE_DATE' };
    }

    // 3. Insert
    const result = await query<UsageRecordRow>(
      'INSERT INTO usage_records (section_id, user_id, name, usage_date) VALUES ($1, $2, $3, $4) RETURNING id, section_id, user_id, name, usage_date, created_at, updated_at',
      [sectionId, userId, input.name, input.usage_date]
    );
    return { record: result.rows[0] };
  }

  static async updateRecord(
    userId: string,
    recordId: string,
    input: UpdateUsageRecordInput
  ): Promise<{ record?: UsageRecordRow; error?: 'RECORD_NOT_FOUND' | 'DUPLICATE_DATE' }> {
    // 1. Fetch existing record and verify ownership
    const existing = await this.getRecordById(userId, recordId);
    if (!existing) {
      return { error: 'RECORD_NOT_FOUND' };
    }

    // 2. Check for duplicate date in the same section excluding this record
    const isDup = await this.isDuplicateDate(userId, existing.section_id, input.usage_date, recordId);
    if (isDup) {
      return { error: 'DUPLICATE_DATE' };
    }

    // 3. Update
    const result = await query<UsageRecordRow>(
      `UPDATE usage_records 
       SET name = $1, usage_date = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 AND user_id = $4 
       RETURNING id, section_id, user_id, name, usage_date, created_at, updated_at`,
      [input.name, input.usage_date, recordId, userId]
    );
    return { record: result.rows[0] };
  }

  static async deleteRecord(userId: string, recordId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM usage_records WHERE id = $1 AND user_id = $2 RETURNING id',
      [recordId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
