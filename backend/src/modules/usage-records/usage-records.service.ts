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

  static async createRecord(
    userId: string,
    sectionId: string,
    input: CreateUsageRecordInput
  ): Promise<{ record?: UsageRecordRow; error?: 'SECTION_NOT_FOUND' | 'DUPLICATE_DATE' }> {
    const sectionCheck = await query('SELECT id FROM sections WHERE id = $1', [sectionId]);
    if (sectionCheck.rows.length === 0) {
      return { error: 'SECTION_NOT_FOUND' };
    }

    const isDup = await this.isDuplicateDate(userId, sectionId, input.usage_date);
    if (isDup) {
      return { error: 'DUPLICATE_DATE' };
    }

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
    const existing = await this.getRecordById(userId, recordId);
    if (!existing) {
      return { error: 'RECORD_NOT_FOUND' };
    }

    const isDup = await this.isDuplicateDate(userId, existing.section_id, input.usage_date, recordId);
    if (isDup) {
      return { error: 'DUPLICATE_DATE' };
    }

    const result = await query<UsageRecordRow>(
      `UPDATE usage_records 
       SET name = $1, usage_date = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING id, section_id, user_id, name, usage_date, created_at, updated_at`,
      [input.name, input.usage_date, recordId]
    );
    return { record: result.rows[0] };
  }

  static async deleteRecord(_userId: string, recordId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM usage_records WHERE id = $1 RETURNING id',
      [recordId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}

