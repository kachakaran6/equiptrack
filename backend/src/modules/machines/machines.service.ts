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

  static async deleteMachine(_userId: string, machineId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM machines WHERE id = $1 RETURNING id',
      [machineId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}

