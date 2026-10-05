import { query } from '../../db/index.js';
import { CreateCategoryInput, UpdateCategoryInput } from './categories.schemas.js';

export interface CategoryRow {
  id: string;
  user_id?: string;
  machine_id?: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

export class CategoriesService {
  /**
   * List all categories owned by the authenticated user
   */
  static async listUserCategories(userId: string): Promise<CategoryRow[]> {
    const result = await query<CategoryRow>(
      'SELECT id, user_id, machine_id, name, created_at, updated_at FROM categories WHERE user_id = $1 ORDER BY name ASC',
      [userId]
    );
    return result.rows;
  }

  /**
   * List categories for a machine, falling back to all user categories
   */
  static async listCategoriesByMachine(
    machineId: string,
    userId?: string
  ): Promise<CategoryRow[] | null> {
    if (userId) {
      return this.listUserCategories(userId);
    }

    const result = await query<CategoryRow>(
      'SELECT id, user_id, machine_id, name, created_at, updated_at FROM categories WHERE machine_id = $1 OR user_id IS NOT NULL ORDER BY name ASC',
      [machineId]
    );
    return result.rows;
  }

  static async getCategoryById(categoryId: string, userId?: string): Promise<CategoryRow | null> {
    const params: any[] = [categoryId];
    let sql = 'SELECT id, user_id, machine_id, name, created_at, updated_at FROM categories WHERE id = $1';
    if (userId) {
      sql += ' AND user_id = $2';
      params.push(userId);
    }

    const result = await query<CategoryRow>(sql, params);
    return result.rows[0] || null;
  }

  /**
   * Create a global / user-scoped category
   */
  static async createUserCategory(
    userId: string,
    input: CreateCategoryInput
  ): Promise<{ category?: CategoryRow; error?: string; status?: number }> {
    // Check duplicate category name for this user (case-insensitive)
    const duplicateCheck = await query(
      'SELECT id FROM categories WHERE user_id = $1 AND LOWER(name) = LOWER($2)',
      [userId, input.name.trim()]
    );
    if (duplicateCheck.rows.length > 0) {
      return {
        error: `Category "${input.name.trim()}" already exists`,
        status: 409,
      };
    }

    try {
      const result = await query<CategoryRow>(
        'INSERT INTO categories (user_id, name) VALUES ($1, $2) RETURNING id, user_id, machine_id, name, created_at, updated_at',
        [userId, input.name.trim()]
      );
      return { category: result.rows[0] };
    } catch (err: any) {
      if (err.code === '23505') {
        return {
          error: `Category "${input.name.trim()}" already exists`,
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

    try {
      const result = await query<CategoryRow>(
        'INSERT INTO categories (machine_id, name) VALUES ($1, $2) RETURNING id, user_id, machine_id, name, created_at, updated_at',
        [machineId, input.name.trim()]
      );
      return { category: result.rows[0] };
    } catch (err: any) {
      if (err.code === '23505') {
        return {
          error: `Category "${input.name.trim()}" already exists`,
          status: 409,
        };
      }
      throw err;
    }
  }

  static async updateCategory(
    categoryId: string,
    input: UpdateCategoryInput,
    userId?: string
  ): Promise<{ category?: CategoryRow; error?: string; status?: number }> {
    // Check if category exists
    const existing = await query<CategoryRow>(
      'SELECT id, user_id, machine_id, name FROM categories WHERE id = $1',
      [categoryId]
    );
    if (existing.rows.length === 0) {
      return { error: 'Category not found', status: 404 };
    }

    const currentUserId = userId || existing.rows[0].user_id;

    // Check duplicate category name for same user
    if (currentUserId) {
      const duplicateCheck = await query(
        'SELECT id FROM categories WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND id != $3',
        [currentUserId, input.name.trim(), categoryId]
      );
      if (duplicateCheck.rows.length > 0) {
        return {
          error: `Category "${input.name.trim()}" already exists`,
          status: 409,
        };
      }
    }

    try {
      const result = await query<CategoryRow>(
        `UPDATE categories 
         SET name = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING id, user_id, machine_id, name, created_at, updated_at`,
        [input.name.trim(), categoryId]
      );
      return { category: result.rows[0] || null };
    } catch (err: any) {
      if (err.code === '23505') {
        return {
          error: `Category "${input.name.trim()}" already exists`,
          status: 409,
        };
      }
      throw err;
    }
  }

  static async deleteCategory(categoryId: string, userId?: string): Promise<boolean> {
    // Ensure components become uncategorized
    await query('UPDATE sections SET category_id = NULL WHERE category_id = $1', [categoryId]);

    const params: any[] = [categoryId];
    let sql = 'DELETE FROM categories WHERE id = $1';
    if (userId) {
      sql += ' AND user_id = $2';
      params.push(userId);
    }
    sql += ' RETURNING id';

    const result = await query(sql, params);
    return (result.rowCount ?? 0) > 0;
  }
}
