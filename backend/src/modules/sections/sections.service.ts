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
  static async listSectionsByMachine(userId: string, machineId: string): Promise<SectionRow[] | null> {
    // 1. Verify user owns the parent machine
    const machineCheck = await query('SELECT id FROM machines WHERE id = $1 AND user_id = $2', [
      machineId,
      userId,
    ]);
    if (machineCheck.rows.length === 0) {
      return null;
    }

    // 2. Fetch sections for this machine owned by user
    const result = await query<SectionRow>(
      'SELECT id, machine_id, user_id, name, created_at, updated_at FROM sections WHERE machine_id = $1 AND user_id = $2 ORDER BY name ASC',
      [machineId, userId]
    );
    return result.rows;
  }

  static async getSectionById(userId: string, sectionId: string): Promise<SectionRow | null> {
    const result = await query<SectionRow>(
      'SELECT id, machine_id, user_id, name, created_at, updated_at FROM sections WHERE id = $1 AND user_id = $2',
      [sectionId, userId]
    );
    return result.rows[0] || null;
  }

  static async createSection(
    userId: string,
    machineId: string,
    input: CreateSectionInput
  ): Promise<SectionRow | null> {
    // 1. Verify parent machine ownership
    const machineCheck = await query('SELECT id FROM machines WHERE id = $1 AND user_id = $2', [
      machineId,
      userId,
    ]);
    if (machineCheck.rows.length === 0) {
      return null;
    }

    // 2. Insert section
    const result = await query<SectionRow>(
      'INSERT INTO sections (machine_id, user_id, name) VALUES ($1, $2, $3) RETURNING id, machine_id, user_id, name, created_at, updated_at',
      [machineId, userId, input.name]
    );
    return result.rows[0];
  }

  static async updateSection(
    userId: string,
    sectionId: string,
    input: UpdateSectionInput
  ): Promise<SectionRow | null> {
    const result = await query<SectionRow>(
      `UPDATE sections 
       SET name = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND user_id = $3 
       RETURNING id, machine_id, user_id, name, created_at, updated_at`,
      [input.name, sectionId, userId]
    );
    return result.rows[0] || null;
  }

  static async deleteSection(userId: string, sectionId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM sections WHERE id = $1 AND user_id = $2 RETURNING id',
      [sectionId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
