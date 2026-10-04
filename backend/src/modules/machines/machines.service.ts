import { query } from '../../db/index.js';
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

  static async createMachine(userId: string, input: CreateMachineInput): Promise<MachineRow> {
    const result = await query<MachineRow>(
      'INSERT INTO machines (user_id, name, description) VALUES ($1, $2, $3) RETURNING id, user_id, name, description, created_at, updated_at',
      [userId, input.name, input.description]
    );
    return result.rows[0];
  }

  static async updateMachine(
    _userId: string,
    machineId: string,
    input: UpdateMachineInput
  ): Promise<MachineRow | null> {
    const result = await query<MachineRow>(
      `UPDATE machines 
       SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING id, user_id, name, description, created_at, updated_at`,
      [input.name, input.description, machineId]
    );
    return result.rows[0] || null;
  }

  static async duplicateMachine(
    userId: string,
    machineId: string,
    input?: { name?: string; description?: string | null }
  ): Promise<MachineRow | null> {
    const source = await this.getUserMachineById(userId, machineId);
    if (!source) {
      return null;
    }

    const newName = input?.name?.trim() || `${source.name} (Copy)`;
    const newDescription =
      input?.description !== undefined ? input.description : source.description;

    // 1. Create duplicated machine
    const machineRes = await query<MachineRow>(
      'INSERT INTO machines (user_id, name, description) VALUES ($1, $2, $3) RETURNING id, user_id, name, description, created_at, updated_at',
      [userId, newName, newDescription]
    );
    const newMachine = machineRes.rows[0];

    // 2. Fetch all sections for the source machine
    const sectionsRes = await query<{ name: string }>(
      'SELECT name FROM sections WHERE machine_id = $1 ORDER BY created_at ASC',
      [machineId]
    );

    // 3. Duplicate each section/component for the new machine (without copying usage records)
    for (const section of sectionsRes.rows) {
      await query(
        'INSERT INTO sections (machine_id, user_id, name) VALUES ($1, $2, $3)',
        [newMachine.id, userId, section.name]
      );
    }

    return newMachine;
  }

  static async deleteMachine(_userId: string, machineId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM machines WHERE id = $1 RETURNING id',
      [machineId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}

