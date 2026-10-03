import { query } from '../../db/index.js';
import { CreateSectionInput, UpdateSectionInput } from './sections.schemas.js';

export interface SectionRow {
  id: string;
  machine_id: string;
  user_id: string;
  name: string;
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
      'SELECT id, machine_id, user_id, name, created_at, updated_at FROM sections WHERE machine_id = $1 ORDER BY name ASC',
      [machineId]
    );
    return result.rows;
  }

  static async getSectionById(_userId: string, sectionId: string): Promise<SectionRow | null> {
    const result = await query<SectionRow>(
      'SELECT id, machine_id, user_id, name, created_at, updated_at FROM sections WHERE id = $1',
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

    const result = await query<SectionRow>(
      'INSERT INTO sections (machine_id, user_id, name) VALUES ($1, $2, $3) RETURNING id, machine_id, user_id, name, created_at, updated_at',
      [machineId, userId, input.name]
    );
    return result.rows[0];
  }

  static async updateSection(
    _userId: string,
    sectionId: string,
    input: UpdateSectionInput
  ): Promise<SectionRow | null> {
    const result = await query<SectionRow>(
      `UPDATE sections 
       SET name = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, machine_id, user_id, name, created_at, updated_at`,
      [input.name, sectionId]
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

