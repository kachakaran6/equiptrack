import { query } from '../../db/index.js';
import { CreateCategoryInput, UpdateCategoryInput } from './categories.schemas.js';

export interface CategoryRow {
  id: string;
  machine_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export class CategoriesService {
  static async listCategoriesByMachine(machineId: string): Promise<CategoryRow[] | null> {
    const machineCheck = await query('SELECT id FROM machines WHERE id = $1', [machineId]);
    if (machineCheck.rows.length === 0) {
      return null;
    }

    const result = await query<CategoryRow>(
      'SELECT id, machine_id, name, created_at, updated_at FROM categories WHERE machine_id = $1 ORDER BY name ASC',
      [machineId]
    );
    return result.rows;
  }

  static async getCategoryById(categoryId: string): Promise<CategoryRow | null> {
    const result = await query<CategoryRow>(
      'SELECT id, machine_id, name, created_at, updated_at FROM categories WHERE id = $1',
      [categoryId]
    );
    return result.rows[0] || null;
  }

  static async createCategory(
    machineId: string,
    input: CreateCategoryInput
  ): Promise<{ category?: CategoryRow; error?: string; status?: number }> {
    const machineCheck = await query('SELECT id FROM machines WHERE id = $1', [machineId]);
    if (machineCheck.rows.length === 0) {
      return { error: 'Parent machine not found', status: 404 };
    }

    // Check duplicate category name within this machine (case-insensitive)
    const duplicateCheck = await query(
      'SELECT id FROM categories WHERE machine_id = $1 AND LOWER(name) = LOWER($2)',
      [machineId, input.name]
    );
    if (duplicateCheck.rows.length > 0) {
      return {
        error: `Category "${input.name}" already exists for this machine`,
        status: 409,
      };
    }

    try {
      const result = await query<CategoryRow>(
        'INSERT INTO categories (machine_id, name) VALUES ($1, $2) RETURNING id, machine_id, name, created_at, updated_at',
        [machineId, input.name]
      );
      return { category: result.rows[0] };
    } catch (err: any) {
      if (err.code === '23505') {
        return {
          error: `Category "${input.name}" already exists for this machine`,
          status: 409,
        };
      }
      throw err;
    }
  }

  static async updateCategory(
    categoryId: string,
    input: UpdateCategoryInput
  ): Promise<{ category?: CategoryRow; error?: string; status?: number }> {
    const existing = await query<CategoryRow>(
      'SELECT id, machine_id, name FROM categories WHERE id = $1',
      [categoryId]
    );
    if (existing.rows.length === 0) {
      return { error: 'Category not found', status: 404 };
    }

    const machineId = existing.rows[0].machine_id;

    // Check duplicate category name on same machine
    const duplicateCheck = await query(
      'SELECT id FROM categories WHERE machine_id = $1 AND LOWER(name) = LOWER($2) AND id != $3',
      [machineId, input.name, categoryId]
    );
    if (duplicateCheck.rows.length > 0) {
      return {
        error: `Category "${input.name}" already exists for this machine`,
        status: 409,
      };
    }

    try {
      const result = await query<CategoryRow>(
        `UPDATE categories 
         SET name = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING id, machine_id, name, created_at, updated_at`,
        [input.name, categoryId]
      );
      return { category: result.rows[0] || null };
    } catch (err: any) {
      if (err.code === '23505') {
        return {
          error: `Category "${input.name}" already exists for this machine`,
          status: 409,
        };
      }
      throw err;
    }
  }

  static async deleteCategory(categoryId: string): Promise<boolean> {
    // Ensure components become uncategorized
    await query('UPDATE sections SET category_id = NULL WHERE category_id = $1', [categoryId]);

    const result = await query('DELETE FROM categories WHERE id = $1 RETURNING id', [categoryId]);
    return (result.rowCount ?? 0) > 0;
  }
}
