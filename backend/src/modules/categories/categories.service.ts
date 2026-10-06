import { query } from '../../db/index.js';
import { CreateCategoryInput, UpdateCategoryInput } from './categories.schemas.js';

export interface CategoryRow {
  id: string;
  user_id?: string | null;
  machine_id?: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

export class CategoriesService {
  /**
   * List all categories across the application (global/shared for all users)
   */
  static async listAllCategories(): Promise<CategoryRow[]> {
    const result = await query<CategoryRow>(
      'SELECT id, user_id, machine_id, name, created_at, updated_at FROM categories ORDER BY name ASC'
    );
    return result.rows;
  }

  /**
   * Backward-compatible alias for listAllCategories
   */
  static async listUserCategories(_userId?: string): Promise<CategoryRow[]> {
    return this.listAllCategories();
  }

  /**
   * List categories used in a specific machine.
   * If a category is not used by any component/section in the machine,
   * it will not be returned unless includeUnused is true.
   */
  static async listCategoriesByMachine(
    machineId: string,
    _userId?: string,
    options: { includeUnused?: boolean } = {}
  ): Promise<CategoryRow[] | null> {
    const machineCheck = await query('SELECT id FROM machines WHERE id = $1', [machineId]);
    if (machineCheck.rows.length === 0) {
      return null;
    }

    if (options.includeUnused) {
      return this.listAllCategories();
    }

    // Default: return only categories actively assigned to sections in this machine
    const result = await query<CategoryRow>(
      `SELECT DISTINCT c.id, c.user_id, c.machine_id, c.name, c.created_at, c.updated_at
       FROM categories c
       INNER JOIN sections s ON s.category_id = c.id
       WHERE s.machine_id = $1
       ORDER BY c.name ASC`,
      [machineId]
    );
    return result.rows;
  }

  static async getCategoryById(categoryId: string, _userId?: string): Promise<CategoryRow | null> {
    const result = await query<CategoryRow>(
      'SELECT id, user_id, machine_id, name, created_at, updated_at FROM categories WHERE id = $1',
      [categoryId]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a global category
   */
  static async createUserCategory(
    userId: string,
    input: CreateCategoryInput
  ): Promise<{ category?: CategoryRow; error?: string; status?: number }> {
    const trimmedName = input.name.trim();

    // Check duplicate category name globally (case-insensitive)
    const duplicateCheck = await query(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER($1)',
      [trimmedName]
    );
    if (duplicateCheck.rows.length > 0) {
      return {
        error: `Category "${trimmedName}" already exists`,
        status: 409,
      };
    }

    try {
      const result = await query<CategoryRow>(
        'INSERT INTO categories (user_id, name) VALUES ($1, $2) RETURNING id, user_id, machine_id, name, created_at, updated_at',
        [userId, trimmedName]
      );
      return { category: result.rows[0] };
    } catch (err: any) {
      if (err.code === '23505') {
        return {
          error: `Category "${trimmedName}" already exists`,
          status: 409,
        };
      }
      throw err;
    }
  }

  /**
   * Backward-compatible creator supporting machineId
   */
  static async createCategory(
    machineId: string,
    input: CreateCategoryInput,
    userId?: string
  ): Promise<{ category?: CategoryRow; error?: string; status?: number }> {
    if (userId) {
      return this.createUserCategory(userId, input);
    }

    const trimmedName = input.name.trim();
    const duplicateCheck = await query(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER($1)',
      [trimmedName]
    );
    if (duplicateCheck.rows.length > 0) {
      return {
        error: `Category "${trimmedName}" already exists`,
        status: 409,
      };
    }

    try {
      const result = await query<CategoryRow>(
        'INSERT INTO categories (machine_id, name) VALUES ($1, $2) RETURNING id, user_id, machine_id, name, created_at, updated_at',
        [machineId, trimmedName]
      );
      return { category: result.rows[0] };
    } catch (err: any) {
      if (err.code === '23505') {
        return {
          error: `Category "${trimmedName}" already exists`,
          status: 409,
        };
      }
      throw err;
    }
  }

  static async updateCategory(
    categoryId: string,
    input: UpdateCategoryInput,
    _userId?: string
  ): Promise<{ category?: CategoryRow; error?: string; status?: number }> {
    // Check if category exists
    const existing = await query<CategoryRow>(
      'SELECT id, user_id, machine_id, name FROM categories WHERE id = $1',
      [categoryId]
    );
    if (existing.rows.length === 0) {
      return { error: 'Category not found', status: 404 };
    }

    const trimmedName = input.name.trim();

    // Check duplicate category name globally
    const duplicateCheck = await query(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2',
      [trimmedName, categoryId]
    );
    if (duplicateCheck.rows.length > 0) {
      return {
        error: `Category "${trimmedName}" already exists`,
        status: 409,
      };
    }

    try {
      const result = await query<CategoryRow>(
        `UPDATE categories 
         SET name = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING id, user_id, machine_id, name, created_at, updated_at`,
        [trimmedName, categoryId]
      );
      return { category: result.rows[0] || null };
    } catch (err: any) {
      if (err.code === '23505') {
        return {
          error: `Category "${trimmedName}" already exists`,
          status: 409,
        };
      }
      throw err;
    }
  }

  static async deleteCategory(categoryId: string, _userId?: string): Promise<boolean> {
    // Ensure components become uncategorized
    await query('UPDATE sections SET category_id = NULL WHERE category_id = $1', [categoryId]);

    const result = await query('DELETE FROM categories WHERE id = $1 RETURNING id', [categoryId]);
    return (result.rowCount ?? 0) > 0;
  }
}
