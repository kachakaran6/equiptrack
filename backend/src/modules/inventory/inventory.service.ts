import { query, pool } from '../../db/index.js';
import type {
  CreateProductInput,
  UpdateProductInput,
  CreateSubProductInput,
  UpdateSubProductInput,
  CreateTransactionInput,
  UpdateTransactionInput,
  InventoryFilterInput,
} from './inventory.schemas.js';

export interface ProductFieldRow {
  id: string;
  product_id: string;
  label: string;
  position: number;
  created_at: string;
}

export interface SubProductValueItem {
  field_id: string;
  label: string;
  value: string;
}

export interface SubProductItem {
  id: string;
  product_id: string;
  user_id: string;
  current_stock: number;
  total_in: number;
  total_out: number;
  values: Record<string, string>; // label -> value
  field_values: SubProductValueItem[];
  created_at: string;
  updated_at: string;
}

export interface ProductItem {
  id: string;
  user_id: string;
  name: string;
  fields: ProductFieldRow[];
  sub_products: SubProductItem[];
  total_stock: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransactionItem {
  id: string;
  sub_product_id: string;
  product_id: string;
  product_name: string;
  user_id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  date: string;
  remarks: string | null;
  sub_product_values: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export class InventoryService {
  // ─── Products ─────────────────────────────────────────────────────────────

  static async listProducts(search?: string): Promise<ProductItem[]> {
    let whereSql = '';
    const params: unknown[] = [];
    if (search && search.trim()) {
      whereSql = 'WHERE p.name ILIKE $1';
      params.push(`%${search.trim()}%`);
    }

    // 1. Fetch Products
    const productsRes = await query<{
      id: string;
      user_id: string;
      name: string;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT p.id, p.user_id, p.name, p.created_at, p.updated_at
       FROM inventory_products p
       ${whereSql}
       ORDER BY p.name ASC`,
      params
    );

    if (productsRes.rows.length === 0) {
      return [];
    }

    const productIds = productsRes.rows.map((p) => p.id);

    // 2. Fetch Fields
    const fieldsRes = await query<ProductFieldRow>(
      `SELECT id, product_id, label, position, created_at
       FROM inventory_product_fields
       WHERE product_id = ANY($1::uuid[])
       ORDER BY position ASC, created_at ASC`,
      [productIds]
    );

    // 3. Fetch SubProducts with aggregated stock
    const subProductsRes = await query<{
      id: string;
      product_id: string;
      user_id: string;
      total_in: string;
      total_out: string;
      current_stock: string;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT 
         sp.id,
         sp.product_id,
         sp.user_id,
         COALESCE(SUM(CASE WHEN t.type = 'IN' THEN t.quantity ELSE 0 END), 0) AS total_in,
         COALESCE(SUM(CASE WHEN t.type = 'OUT' THEN t.quantity ELSE 0 END), 0) AS total_out,
         COALESCE(SUM(CASE WHEN t.type = 'IN' THEN t.quantity ELSE -t.quantity END), 0) AS current_stock,
         sp.created_at,
         sp.updated_at
       FROM inventory_sub_products sp
       LEFT JOIN inventory_transactions t ON t.sub_product_id = sp.id
       WHERE sp.product_id = ANY($1::uuid[])
       GROUP BY sp.id, sp.product_id, sp.user_id, sp.created_at, sp.updated_at
       ORDER BY sp.created_at ASC`,
      [productIds]
    );

    const subProductIds = subProductsRes.rows.map((sp) => sp.id);

    // 4. Fetch SubProduct Values
    let valuesRes: { rows: Array<{ sub_product_id: string; field_id: string; label: string; value: string }> } = { rows: [] };
    if (subProductIds.length > 0) {
      valuesRes = await query<{
        sub_product_id: string;
        field_id: string;
        label: string;
        value: string;
      }>(
        `SELECT v.sub_product_id, v.field_id, f.label, v.value
         FROM inventory_sub_product_values v
         JOIN inventory_product_fields f ON f.id = v.field_id
         WHERE v.sub_product_id = ANY($1::uuid[])`,
        [subProductIds]
      );
    }

    // Index mappings
    const fieldsByProduct = new Map<string, ProductFieldRow[]>();
    for (const f of fieldsRes.rows) {
      if (!fieldsByProduct.has(f.product_id)) fieldsByProduct.set(f.product_id, []);
      fieldsByProduct.get(f.product_id)!.push(f);
    }

    const valuesBySubProduct = new Map<string, Array<{ field_id: string; label: string; value: string }>>();
    for (const v of valuesRes.rows) {
      if (!valuesBySubProduct.has(v.sub_product_id)) valuesBySubProduct.set(v.sub_product_id, []);
      valuesBySubProduct.get(v.sub_product_id)!.push(v);
    }

    const subProductsByProduct = new Map<string, SubProductItem[]>();
    for (const sp of subProductsRes.rows) {
      const valList = valuesBySubProduct.get(sp.id) || [];
      const valMap: Record<string, string> = {};
      for (const v of valList) {
        valMap[v.label] = v.value;
      }

      const item: SubProductItem = {
        id: sp.id,
        product_id: sp.product_id,
        user_id: sp.user_id,
        total_in: parseInt(sp.total_in, 10),
        total_out: parseInt(sp.total_out, 10),
        current_stock: parseInt(sp.current_stock, 10),
        values: valMap,
        field_values: valList,
        created_at: sp.created_at,
        updated_at: sp.updated_at,
      };

      if (!subProductsByProduct.has(sp.product_id)) subProductsByProduct.set(sp.product_id, []);
      subProductsByProduct.get(sp.product_id)!.push(item);
    }

    // Build final hierarchy
    return productsRes.rows.map((p) => {
      const subs = subProductsByProduct.get(p.id) || [];
      const totalStock = subs.reduce((acc, curr) => acc + curr.current_stock, 0);
      return {
        id: p.id,
        user_id: p.user_id,
        name: p.name,
        fields: fieldsByProduct.get(p.id) || [],
        sub_products: subs,
        total_stock: totalStock,
        created_at: p.created_at,
        updated_at: p.updated_at,
      };
    });
  }

  static async getProductById(productId: string): Promise<ProductItem | null> {
    const list = await this.listProducts();
    return list.find((p) => p.id === productId) || null;
  }

  static async createProduct(userId: string, input: CreateProductInput): Promise<ProductItem> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const productRes = await client.query<{ id: string; user_id: string; name: string; created_at: string; updated_at: string }>(
        'INSERT INTO inventory_products (user_id, name) VALUES ($1, $2) RETURNING id, user_id, name, created_at, updated_at',
        [userId, input.name.trim()]
      );
      const product = productRes.rows[0];

      const fields: ProductFieldRow[] = [];
      if (input.fields && input.fields.length > 0) {
        // Filter unique non-empty labels
        const uniqueLabels = Array.from(new Set(input.fields.map((f) => f.trim()).filter(Boolean)));
        for (let i = 0; i < uniqueLabels.length; i++) {
          const fieldRes = await client.query<ProductFieldRow>(
            'INSERT INTO inventory_product_fields (product_id, label, position) VALUES ($1, $2, $3) RETURNING id, product_id, label, position, created_at',
            [product.id, uniqueLabels[i], i]
          );
          fields.push(fieldRes.rows[0]);
        }
      }

      await client.query('COMMIT');

      return {
        id: product.id,
        user_id: product.user_id,
        name: product.name,
        fields,
        sub_products: [],
        total_stock: 0,
        created_at: product.created_at,
        updated_at: product.updated_at,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async updateProduct(productId: string, input: UpdateProductInput): Promise<ProductItem> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (input.name && input.name.trim()) {
        await client.query(
          'UPDATE inventory_products SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [input.name.trim(), productId]
        );
      }

      if (input.fields) {
        // Upsert or insert fields
        const existingRes = await client.query<ProductFieldRow>(
          'SELECT id, label FROM inventory_product_fields WHERE product_id = $1',
          [productId]
        );
        const existingMap = new Map<string, ProductFieldRow>(existingRes.rows.map((r) => [r.id, r]));

        const incomingIds = new Set<string>();
        for (let i = 0; i < input.fields.length; i++) {
          const f = input.fields[i];
          const label = f.label.trim();
          if (!label) continue;

          if (f.id && existingMap.has(f.id)) {
            incomingIds.add(f.id);
            await client.query(
              'UPDATE inventory_product_fields SET label = $1, position = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
              [label, i, f.id]
            );
          } else {
            const insRes = await client.query<{ id: string }>(
              'INSERT INTO inventory_product_fields (product_id, label, position) VALUES ($1, $2, $3) RETURNING id',
              [productId, label, i]
            );
            incomingIds.add(insRes.rows[0].id);
          }
        }

        // Delete fields that were removed by user
        for (const existing of existingRes.rows) {
          if (!incomingIds.has(existing.id)) {
            await client.query('DELETE FROM inventory_product_fields WHERE id = $1', [existing.id]);
          }
        }
      }

      await client.query('COMMIT');

      const updated = await this.getProductById(productId);
      if (!updated) throw new Error('Product not found after update');
      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async deleteProduct(productId: string): Promise<boolean> {
    const res = await query('DELETE FROM inventory_products WHERE id = $1 RETURNING id', [productId]);
    return (res.rowCount ?? 0) > 0;
  }

  // ─── Sub Products ──────────────────────────────────────────────────────────

  static async createSubProduct(
    userId: string,
    productId: string,
    input: CreateSubProductInput
  ): Promise<SubProductItem> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify product exists and get its fields
      const fieldsRes = await client.query<ProductFieldRow>(
        'SELECT id, label FROM inventory_product_fields WHERE product_id = $1',
        [productId]
      );

      const subRes = await client.query<{ id: string; product_id: string; user_id: string; created_at: string; updated_at: string }>(
        'INSERT INTO inventory_sub_products (product_id, user_id) VALUES ($1, $2) RETURNING id, product_id, user_id, created_at, updated_at',
        [productId, userId]
      );
      const sub = subRes.rows[0];

      const valMap: Record<string, string> = {};
      const fieldValues: SubProductValueItem[] = [];

      for (const field of fieldsRes.rows) {
        // Check if value is passed by field.id or by field.label
        const enteredVal = input.values[field.id] ?? input.values[field.label] ?? '';
        valMap[field.label] = enteredVal;

        await client.query(
          'INSERT INTO inventory_sub_product_values (sub_product_id, field_id, value) VALUES ($1, $2, $3)',
          [sub.id, field.id, enteredVal]
        );

        fieldValues.push({
          field_id: field.id,
          label: field.label,
          value: enteredVal,
        });
      }

      await client.query('COMMIT');

      return {
        id: sub.id,
        product_id: sub.product_id,
        user_id: sub.user_id,
        current_stock: 0,
        total_in: 0,
        total_out: 0,
        values: valMap,
        field_values: fieldValues,
        created_at: sub.created_at,
        updated_at: sub.updated_at,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async getSubProductById(subProductId: string): Promise<SubProductItem | null> {
    const subRes = await query<{
      id: string;
      product_id: string;
      user_id: string;
      total_in: string;
      total_out: string;
      current_stock: string;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT 
         sp.id,
         sp.product_id,
         sp.user_id,
         COALESCE(SUM(CASE WHEN t.type = 'IN' THEN t.quantity ELSE 0 END), 0) AS total_in,
         COALESCE(SUM(CASE WHEN t.type = 'OUT' THEN t.quantity ELSE 0 END), 0) AS total_out,
         COALESCE(SUM(CASE WHEN t.type = 'IN' THEN t.quantity ELSE -t.quantity END), 0) AS current_stock,
         sp.created_at,
         sp.updated_at
       FROM inventory_sub_products sp
       LEFT JOIN inventory_transactions t ON t.sub_product_id = sp.id
       WHERE sp.id = $1
       GROUP BY sp.id, sp.product_id, sp.user_id, sp.created_at, sp.updated_at`,
      [subProductId]
    );

    if (subRes.rows.length === 0) return null;
    const sp = subRes.rows[0];

    const valuesRes = await query<{
      field_id: string;
      label: string;
      value: string;
    }>(
      `SELECT v.field_id, f.label, v.value
       FROM inventory_sub_product_values v
       JOIN inventory_product_fields f ON f.id = v.field_id
       WHERE v.sub_product_id = $1
       ORDER BY f.position ASC`,
      [subProductId]
    );

    const valMap: Record<string, string> = {};
    for (const v of valuesRes.rows) {
      valMap[v.label] = v.value;
    }

    return {
      id: sp.id,
      product_id: sp.product_id,
      user_id: sp.user_id,
      total_in: parseInt(sp.total_in, 10),
      total_out: parseInt(sp.total_out, 10),
      current_stock: parseInt(sp.current_stock, 10),
      values: valMap,
      field_values: valuesRes.rows,
      created_at: sp.created_at,
      updated_at: sp.updated_at,
    };
  }

  static async updateSubProduct(
    subProductId: string,
    input: UpdateSubProductInput
  ): Promise<SubProductItem> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const subRes = await client.query<{ product_id: string }>(
        'SELECT product_id FROM inventory_sub_products WHERE id = $1',
        [subProductId]
      );
      if (subRes.rows.length === 0) throw new Error('Sub product not found');

      const fieldsRes = await client.query<ProductFieldRow>(
        'SELECT id, label FROM inventory_product_fields WHERE product_id = $1',
        [subRes.rows[0].product_id]
      );

      for (const field of fieldsRes.rows) {
        const val = input.values[field.id] ?? input.values[field.label];
        if (val !== undefined) {
          await client.query(
            `INSERT INTO inventory_sub_product_values (sub_product_id, field_id, value, updated_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
             ON CONFLICT (sub_product_id, field_id)
             DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
            [subProductId, field.id, val]
          );
        }
      }

      await client.query(
        'UPDATE inventory_sub_products SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [subProductId]
      );

      await client.query('COMMIT');

      const updated = await this.getSubProductById(subProductId);
      if (!updated) throw new Error('Sub product not found after update');
      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async deleteSubProduct(subProductId: string): Promise<boolean> {
    const res = await query('DELETE FROM inventory_sub_products WHERE id = $1 RETURNING id', [subProductId]);
    return (res.rowCount ?? 0) > 0;
  }

  // ─── Transactions & Stock Management ──────────────────────────────────────

  static async getCurrentStock(subProductId: string, client?: any): Promise<number> {
    const res = client
      ? await client.query(
          `SELECT COALESCE(SUM(CASE WHEN type = 'IN' THEN quantity ELSE -quantity END), 0) AS current_stock
           FROM inventory_transactions
           WHERE sub_product_id = $1`,
          [subProductId]
        )
      : await query<{ current_stock: string }>(
          `SELECT COALESCE(SUM(CASE WHEN type = 'IN' THEN quantity ELSE -quantity END), 0) AS current_stock
           FROM inventory_transactions
           WHERE sub_product_id = $1`,
          [subProductId]
        );
    return parseInt(res.rows[0]?.current_stock ?? '0', 10);
  }

  static async createTransaction(
    userId: string,
    subProductId: string,
    input: CreateTransactionInput
  ): Promise<{ transaction: InventoryTransactionItem; current_stock: number }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock the sub_product row for concurrency safety without aggregate FOR UPDATE
      await client.query(
        'SELECT id FROM inventory_sub_products WHERE id = $1 FOR UPDATE',
        [subProductId]
      );

      // Check current stock
      const stockRes = await client.query<{ current_stock: string }>(
        `SELECT COALESCE(SUM(CASE WHEN type = 'IN' THEN quantity ELSE -quantity END), 0) AS current_stock
         FROM inventory_transactions
         WHERE sub_product_id = $1`,
        [subProductId]
      );
      const currentStock = parseInt(stockRes.rows[0]?.current_stock ?? '0', 10);

      if (input.type === 'OUT' && currentStock < input.quantity) {
        throw new Error(
          `Insufficient inventory. Available: ${currentStock}, Requested Out: ${input.quantity}`
        );
      }

      const txRes = await client.query<{
        id: string;
        sub_product_id: string;
        user_id: string;
        type: 'IN' | 'OUT';
        quantity: number;
        date: string;
        remarks: string | null;
        created_at: string;
        updated_at: string;
      }>(
        `INSERT INTO inventory_transactions (sub_product_id, user_id, type, quantity, date, remarks)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, sub_product_id, user_id, type, quantity, date, remarks, created_at, updated_at`,
        [subProductId, userId, input.type, input.quantity, input.date, input.remarks || null]
      );

      const newStock = input.type === 'IN' ? currentStock + input.quantity : currentStock - input.quantity;

      await client.query('COMMIT');

      const tx = txRes.rows[0];

      // Fetch metadata
      const subItem = await this.getSubProductById(subProductId);
      const prodRes = await query<{ name: string }>(
        'SELECT name FROM inventory_products WHERE id = $1',
        [subItem?.product_id]
      );

      const formattedTx: InventoryTransactionItem = {
        id: tx.id,
        sub_product_id: tx.sub_product_id,
        product_id: subItem?.product_id || '',
        product_name: prodRes.rows[0]?.name || '',
        user_id: tx.user_id,
        type: tx.type,
        quantity: tx.quantity,
        date: tx.date,
        remarks: tx.remarks,
        sub_product_values: subItem?.values || {},
        created_at: tx.created_at,
        updated_at: tx.updated_at,
      };

      return { transaction: formattedTx, current_stock: newStock };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async listTransactions(
    opts: InventoryFilterInput = { page: 1, limit: 50 }
  ): Promise<{ transactions: InventoryTransactionItem[]; total: number; page: number; limit: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (opts.subProductId) {
      conditions.push(`t.sub_product_id = $${idx++}`);
      params.push(opts.subProductId);
    }
    if (opts.productId) {
      conditions.push(`sp.product_id = $${idx++}`);
      params.push(opts.productId);
    }
    if (opts.type && opts.type !== 'ALL') {
      conditions.push(`t.type = $${idx++}`);
      params.push(opts.type);
    }
    if (opts.startDate) {
      conditions.push(`t.date >= $${idx++}`);
      params.push(opts.startDate);
    }
    if (opts.endDate) {
      conditions.push(`t.date <= $${idx++}`);
      params.push(opts.endDate);
    }
    if (opts.search && opts.search.trim()) {
      conditions.push(`(p.name ILIKE $${idx} OR t.remarks ILIKE $${idx})`);
      params.push(`%${opts.search.trim()}%`);
      idx++;
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(200, Math.max(1, opts.limit || 50));
    const offset = (page - 1) * limit;

    const countRes = await query<{ count: string }>(
      `SELECT COUNT(t.id) as count
       FROM inventory_transactions t
       JOIN inventory_sub_products sp ON sp.id = t.sub_product_id
       JOIN inventory_products p ON p.id = sp.product_id
       ${whereSql}`,
      params
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const rowsRes = await query<{
      id: string;
      sub_product_id: string;
      product_id: string;
      product_name: string;
      user_id: string;
      type: 'IN' | 'OUT';
      quantity: number;
      date: string;
      remarks: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT 
         t.id,
         t.sub_product_id,
         sp.product_id,
         p.name AS product_name,
         t.user_id,
         t.type,
         t.quantity,
         t.date,
         t.remarks,
         t.created_at,
         t.updated_at
       FROM inventory_transactions t
       JOIN inventory_sub_products sp ON sp.id = t.sub_product_id
       JOIN inventory_products p ON p.id = sp.product_id
       ${whereSql}
       ORDER BY t.date DESC, t.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    // Fetch custom values for sub products in these rows
    const subProductIds = Array.from(new Set(rowsRes.rows.map((r) => r.sub_product_id)));
    let valuesMap = new Map<string, Record<string, string>>();

    if (subProductIds.length > 0) {
      const valuesRes = await query<{
        sub_product_id: string;
        label: string;
        value: string;
      }>(
        `SELECT v.sub_product_id, f.label, v.value
         FROM inventory_sub_product_values v
         JOIN inventory_product_fields f ON f.id = v.field_id
         WHERE v.sub_product_id = ANY($1::uuid[])`,
        [subProductIds]
      );

      for (const v of valuesRes.rows) {
        if (!valuesMap.has(v.sub_product_id)) valuesMap.set(v.sub_product_id, {});
        valuesMap.get(v.sub_product_id)![v.label] = v.value;
      }
    }

    const transactions: InventoryTransactionItem[] = rowsRes.rows.map((r) => ({
      ...r,
      sub_product_values: valuesMap.get(r.sub_product_id) || {},
    }));

    return { transactions, total, page, limit };
  }

  static async updateTransaction(
    transactionId: string,
    input: UpdateTransactionInput
  ): Promise<InventoryTransactionItem> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existingRes = await client.query<{
        id: string;
        sub_product_id: string;
        type: 'IN' | 'OUT';
        quantity: number;
      }>('SELECT id, sub_product_id, type, quantity FROM inventory_transactions WHERE id = $1 FOR UPDATE', [
        transactionId,
      ]);

      if (existingRes.rows.length === 0) {
        throw new Error('Transaction not found');
      }

      const existing = existingRes.rows[0];
      const newType = input.type ?? existing.type;
      const newQty = input.quantity ?? existing.quantity;

      // Validate stock feasibility if quantity/type changed
      const stockRes = await client.query<{ current_stock: string }>(
        `SELECT COALESCE(SUM(CASE WHEN type = 'IN' THEN quantity ELSE -quantity END), 0) AS current_stock
         FROM inventory_transactions
         WHERE sub_product_id = $1`,
        [existing.sub_product_id]
      );
      const currentStock = parseInt(stockRes.rows[0]?.current_stock || '0', 10);

      // Revert effect of old transaction, add effect of new transaction
      const oldDelta = existing.type === 'IN' ? existing.quantity : -existing.quantity;
      const newDelta = newType === 'IN' ? newQty : -newQty;
      const prospectiveStock = currentStock - oldDelta + newDelta;

      if (prospectiveStock < 0) {
        throw new Error(`Cannot update transaction: resulting stock would be negative (${prospectiveStock})`);
      }

      const updateFields: string[] = ['updated_at = CURRENT_TIMESTAMP'];
      const params: unknown[] = [transactionId];
      let idx = 2;

      if (input.type) {
        updateFields.push(`type = $${idx++}`);
        params.push(input.type);
      }
      if (input.quantity !== undefined) {
        updateFields.push(`quantity = $${idx++}`);
        params.push(input.quantity);
      }
      if (input.date) {
        updateFields.push(`date = $${idx++}`);
        params.push(input.date);
      }
      if (input.remarks !== undefined) {
        updateFields.push(`remarks = $${idx++}`);
        params.push(input.remarks);
      }

      await client.query(
        `UPDATE inventory_transactions SET ${updateFields.join(', ')} WHERE id = $1`,
        params
      );

      await client.query('COMMIT');

      const txList = await this.listTransactions({ page: 1, limit: 1 });
      const updatedTx = txList.transactions.find((t) => t.id === transactionId);
      if (updatedTx) return updatedTx;

      // Fallback fetch
      const singleRes = await query<{
        id: string;
        sub_product_id: string;
        user_id: string;
        type: 'IN' | 'OUT';
        quantity: number;
        date: string;
        remarks: string | null;
        created_at: string;
        updated_at: string;
      }>('SELECT * FROM inventory_transactions WHERE id = $1', [transactionId]);
      const row = singleRes.rows[0];
      const subItem = await this.getSubProductById(row.sub_product_id);
      return {
        ...row,
        product_id: subItem?.product_id || '',
        product_name: '',
        sub_product_values: subItem?.values || {},
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async deleteTransaction(transactionId: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existingRes = await client.query<{
        id: string;
        sub_product_id: string;
        type: 'IN' | 'OUT';
        quantity: number;
      }>('SELECT id, sub_product_id, type, quantity FROM inventory_transactions WHERE id = $1 FOR UPDATE', [
        transactionId,
      ]);

      if (existingRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return true; // Already deleted
      }

      const existing = existingRes.rows[0];

      // If deleting an IN transaction, ensure stock doesn't become negative
      if (existing.type === 'IN') {
        const stockRes = await client.query<{ current_stock: string }>(
          `SELECT COALESCE(SUM(CASE WHEN type = 'IN' THEN quantity ELSE -quantity END), 0) AS current_stock
           FROM inventory_transactions
           WHERE sub_product_id = $1`,
          [existing.sub_product_id]
        );
        const currentStock = parseInt(stockRes.rows[0]?.current_stock || '0', 10);
        if (currentStock - existing.quantity < 0) {
          throw new Error(
            `Cannot delete Stock In transaction: current stock is ${currentStock}, deleting ${existing.quantity} would result in negative stock.`
          );
        }
      }

      await client.query('DELETE FROM inventory_transactions WHERE id = $1', [transactionId]);
      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
