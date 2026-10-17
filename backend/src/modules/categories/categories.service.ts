import { pool } from '../../db/index.js';
import { AuditContext } from '../audit/audit.types.js';
import { AuditService } from '../audit/audit.service.js';
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
    const result = await pool.query<CategoryRow>(
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
   */
  static async listCategoriesByMachine(
    machineId: string,
    _userId?: string,
    options: { includeUnused?: boolean } = {}
  ): Promise<CategoryRow[] | null> {
    const machineCheck = await pool.query('SELECT id FROM machines WHERE id = $1', [machineId]);
    if (machineCheck.rows.length === 0) {
      return null;
    }

    if (options.includeUnused) {
      return this.listAllCategories();
    }

    const result = await pool.query<CategoryRow>(
      `SELECT DISTINCT c.id, c.user_id, c.machine_id, c.name, c.created_at, c.updated_at
       FROM categories c
       INNER JOIN sections s ON s.category_id = c.id
       WHERE s.machine_id = $1
       ORDER BY c.name ASC`,
      [machineId]
    );
    return result.rows;
  }

  static async getCategoryById(categoryId: string): Promise<CategoryRow | null> {
    const result = await pool.query<CategoryRow>(
      'SELECT id, user_id, machine_id, name, created_at, updated_at FROM categories WHERE id = $1',
      [categoryId]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a global category with transactional auditing
   */
  static async createUserCategory(
    context: AuditContext,
    input: CreateCategoryInput
  ): Promise<{ category?: CategoryRow; error?: string; status?: number }> {
    const trimmedName = input.name.trim();

    // Check duplicate category name globally (case-insensitive)
    const duplicateCheck = await pool.query(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER($1)',
      [trimmedName]
    );
    if (duplicateCheck.rows.length > 0) {
      return {
        error: `Category "${trimmedName}" already exists`,
        status: 409,
      };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query<CategoryRow>(
        'INSERT INTO categories (user_id, name) VALUES ($1, $2) RETURNING id, user_id, machine_id, name, created_at, updated_at',
        [context.actorUserId, trimmedName]
      );
      const newCategory = result.rows[0];

      // Audit atomically in the same transaction
      await AuditService.recordMutation(client, context, {
        action: 'category.created',
        resourceType: 'category',
        resourceId: newCategory.id,
        resourceLabel: newCategory.name,
        before: null,
        after: newCategory as unknown as Record<string, unknown>,
      });

      await client.query('COMMIT');
      return { category: newCategory };
    } catch (err: any) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        return {
          error: `Category "${trimmedName}" already exists`,
          status: 409,
        };
      }
      await AuditService.recordFailure(context, {
        action: 'category.created',
        resourceType: 'category',
        resourceLabel: trimmedName,
        error: err,
      });
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Backward-compatible creator supporting machineId with transactional auditing
   */
  static async createCategory(
    context: AuditContext,
    machineId: string,
    input: CreateCategoryInput
  ): Promise<{ category?: CategoryRow; error?: string; status?: number }> {
    const trimmedName = input.name.trim();
    const duplicateCheck = await pool.query(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER($1)',
      [trimmedName]
    );
    if (duplicateCheck.rows.length > 0) {
      return {
        error: `Category "${trimmedName}" already exists`,
        status: 409,
      };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query<CategoryRow>(
        'INSERT INTO categories (machine_id, user_id, name) VALUES ($1, $2, $3) RETURNING id, user_id, machine_id, name, created_at, updated_at',
        [machineId, context.actorUserId, trimmedName]
      );
      const newCategory = result.rows[0];

      await AuditService.recordMutation(client, context, {
        action: 'category.created',
        resourceType: 'category',
        resourceId: newCategory.id,
        resourceLabel: newCategory.name,
        before: null,
        after: newCategory as unknown as Record<string, unknown>,
        metadata: { machineId },
      });

      await client.query('COMMIT');
      return { category: newCategory };
    } catch (err: any) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        return {
          error: `Category "${trimmedName}" already exists`,
          status: 409,
        };
      }
      await AuditService.recordFailure(context, {
        action: 'category.created',
        resourceType: 'category',
        resourceLabel: trimmedName,
        error: err,
      });
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update category with transactional auditing and diff capture
   */
  static async updateCategory(
    context: AuditContext,
    categoryId: string,
    input: UpdateCategoryInput
  ): Promise<{ category?: CategoryRow; error?: string; status?: number }> {
    const trimmedName = input.name.trim();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch before snapshot with row lock
      const existing = await client.query<CategoryRow>(
        'SELECT id, user_id, machine_id, name, created_at, updated_at FROM categories WHERE id = $1 FOR UPDATE',
        [categoryId]
      );
      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return { error: 'Category not found', status: 404 };
      }
      const before = existing.rows[0];

      // 2. Check duplicate name globally
      const duplicateCheck = await client.query(
        'SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2',
        [trimmedName, categoryId]
      );
      if (duplicateCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return {
          error: `Category "${trimmedName}" already exists`,
          status: 409,
        };
      }

      // 3. Update category
      const result = await client.query<CategoryRow>(
        `UPDATE categories 
         SET name = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING id, user_id, machine_id, name, created_at, updated_at`,
        [trimmedName, categoryId]
      );
      const after = result.rows[0];

      // 4. Record transactional audit
      await AuditService.recordMutation(client, context, {
        action: 'category.updated',
        resourceType: 'category',
        resourceId: categoryId,
        resourceLabel: after.name,
        before: before as unknown as Record<string, unknown>,
        after: after as unknown as Record<string, unknown>,
      });

      await client.query('COMMIT');
      return { category: after };
    } catch (err: any) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        return {
          error: `Category "${trimmedName}" already exists`,
          status: 409,
        };
      }
      await AuditService.recordFailure(context, {
        action: 'category.updated',
        resourceType: 'category',
        resourceId: categoryId,
        error: err,
      });
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Delete category — Permanently disabled to protect system integrity
   */
  static async deleteCategory(
    context: AuditContext,
    categoryId: string,
    reason?: string
  ): Promise<boolean> {
    await AuditService.recordFailure(context, {
      action: 'category.deleted',
      resourceType: 'category',
      resourceId: categoryId,
      error: new Error('Category deletion is permanently disabled to protect system data integrity.'),
      reason,
    });
    throw new Error('Category deletion is permanently disabled to protect system data integrity.');
  }
}
