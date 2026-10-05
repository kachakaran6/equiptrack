import { query } from '../../db/index.js';
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

  static async createSection(
    userId: string,
    machineId: string,
    input: CreateSectionInput
  ): Promise<SectionRow | null> {
    const machineCheck = await query('SELECT id FROM machines WHERE id = $1', [machineId]);
    if (machineCheck.rows.length === 0) {
      return null;
    }

    const categoryId = input.category_id ?? null;

    const result = await query<SectionRow>(
      'INSERT INTO sections (machine_id, user_id, name, category_id) VALUES ($1, $2, $3, $4) RETURNING id, machine_id, user_id, name, category_id, created_at, updated_at',
      [machineId, userId, input.name, categoryId]
    );
    return result.rows[0];
  }

  static async updateSection(
    _userId: string,
    sectionId: string,
    input: UpdateSectionInput
  ): Promise<SectionRow | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (input.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(input.name);
    }
    if (input.category_id !== undefined) {
      fields.push(`category_id = $${idx++}`);
      values.push(input.category_id);
    }

    if (fields.length === 0) {
      return this.getSectionById(_userId, sectionId);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(sectionId);

    const result = await query<SectionRow>(
      `UPDATE sections 
       SET ${fields.join(', ')} 
       WHERE id = $${idx} 
       RETURNING id, machine_id, user_id, name, category_id, created_at, updated_at`,
      values
    );
    return result.rows[0] || null;
  }

  static async deleteSection(_userId: string, sectionId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM sections WHERE id = $1 RETURNING id',
      [sectionId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
