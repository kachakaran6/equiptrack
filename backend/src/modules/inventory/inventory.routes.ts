import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import {
  createProductSchema,
  updateProductSchema,
  createSubProductSchema,
  updateSubProductSchema,
  createTransactionSchema,
  updateTransactionSchema,
  inventoryFilterSchema,
} from './inventory.schemas.js';
import { InventoryService } from './inventory.service.js';

export const inventoryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // ─── Products ─────────────────────────────────────────────────────────────

  // GET /api/inventory/products
  fastify.get('/products', async (request, reply) => {
    const query = request.query as { search?: string };
    const products = await InventoryService.listProducts(query.search);
    return reply.status(200).send({
      success: true,
      data: products,
    });
  });

  // GET /api/inventory/products/:id
  fastify.get<{ Params: { id: string } }>('/products/:id', async (request, reply) => {
    const product = await InventoryService.getProductById(request.params.id);
    if (!product) {
      return reply.status(404).send({
        success: false,
        message: 'Product not found',
      });
    }
    return reply.status(200).send({
      success: true,
      data: product,
    });
  });

  // POST /api/inventory/products
  fastify.post('/products', async (request, reply) => {
    const parsed = createProductSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid product data',
        errors: parsed.error.issues,
      });
    }

    const product = await InventoryService.createProduct(request.user.id, parsed.data);
    return reply.status(201).send({
      success: true,
      data: product,
    });
  });

  // PATCH /api/inventory/products/:id
  fastify.patch<{ Params: { id: string } }>('/products/:id', async (request, reply) => {
    const parsed = updateProductSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid update data',
        errors: parsed.error.issues,
      });
    }

    try {
      const product = await InventoryService.updateProduct(request.params.id, parsed.data);
      return reply.status(200).send({
        success: true,
        data: product,
      });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        message: err.message || 'Failed to update product',
      });
    }
  });

  // DELETE /api/inventory/products/:id
  fastify.delete<{ Params: { id: string } }>('/products/:id', async (request, reply) => {
    await InventoryService.deleteProduct(request.params.id);
    return reply.status(200).send({
      success: true,
      message: 'Product deleted successfully',
    });
  });

  // ─── Sub Products ──────────────────────────────────────────────────────────

  // POST /api/inventory/products/:id/sub-products
  fastify.post<{ Params: { id: string } }>('/products/:id/sub-products', async (request, reply) => {
    const parsed = createSubProductSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid sub product data',
        errors: parsed.error.issues,
      });
    }

    try {
      const subProduct = await InventoryService.createSubProduct(
        request.user.id,
        request.params.id,
        parsed.data
      );
      return reply.status(201).send({
        success: true,
        data: subProduct,
      });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        message: err.message || 'Failed to create sub product',
      });
    }
  });

  // GET /api/inventory/sub-products/:id
  fastify.get<{ Params: { id: string } }>('/sub-products/:id', async (request, reply) => {
    const subProduct = await InventoryService.getSubProductById(request.params.id);
    if (!subProduct) {
      return reply.status(404).send({
        success: false,
        message: 'Sub product not found',
      });
    }
    return reply.status(200).send({
      success: true,
      data: subProduct,
    });
  });

  // PATCH /api/inventory/sub-products/:id
  fastify.patch<{ Params: { id: string } }>('/sub-products/:id', async (request, reply) => {
    const parsed = updateSubProductSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid update data',
        errors: parsed.error.issues,
      });
    }

    try {
      const updated = await InventoryService.updateSubProduct(request.params.id, parsed.data);
      return reply.status(200).send({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        message: err.message || 'Failed to update sub product',
      });
    }
  });

  // DELETE /api/inventory/sub-products/:id
  fastify.delete<{ Params: { id: string } }>('/sub-products/:id', async (request, reply) => {
    await InventoryService.deleteSubProduct(request.params.id);
    return reply.status(200).send({
      success: true,
      message: 'Sub product deleted successfully',
    });
  });

  // ─── Transactions & Stock ──────────────────────────────────────────────────

  // POST /api/inventory/sub-products/:id/transactions
  fastify.post<{ Params: { id: string } }>('/sub-products/:id/transactions', async (request, reply) => {
    const parsed = createTransactionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid transaction data',
        errors: parsed.error.issues,
      });
    }

    try {
      const result = await InventoryService.createTransaction(
        request.user.id,
        request.params.id,
        parsed.data
      );
      return reply.status(201).send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        message: err.message || 'Failed to record inventory transaction',
      });
    }
  });

  // GET /api/inventory/sub-products/:id/transactions
  fastify.get<{ Params: { id: string } }>('/sub-products/:id/transactions', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const parsed = inventoryFilterSchema.safeParse({ ...query, subProductId: request.params.id });
    const filters = parsed.success ? parsed.data : { subProductId: request.params.id, page: 1, limit: 50 };

    const result = await InventoryService.listTransactions(filters);
    return reply.status(200).send({
      success: true,
      data: result.transactions,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    });
  });

  // GET /api/inventory/transactions
  fastify.get('/transactions', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const parsed = inventoryFilterSchema.safeParse(query);
    const filters = parsed.success ? parsed.data : { page: 1, limit: 50 };

    const result = await InventoryService.listTransactions(filters);
    return reply.status(200).send({
      success: true,
      data: result.transactions,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    });
  });

  // PATCH /api/inventory/transactions/:id
  fastify.patch<{ Params: { id: string } }>('/transactions/:id', async (request, reply) => {
    const parsed = updateTransactionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: parsed.error.issues[0]?.message || 'Invalid transaction update',
        errors: parsed.error.issues,
      });
    }

    try {
      const updated = await InventoryService.updateTransaction(request.params.id, parsed.data);
      return reply.status(200).send({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        message: err.message || 'Failed to update transaction',
      });
    }
  });

  // DELETE /api/inventory/transactions/:id
  fastify.delete<{ Params: { id: string } }>('/transactions/:id', async (request, reply) => {
    try {
      await InventoryService.deleteTransaction(request.params.id);
      return reply.status(200).send({
        success: true,
        message: 'Transaction deleted successfully',
      });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        message: err.message || 'Failed to delete transaction',
      });
    }
  });

  // GET /api/inventory/reports/export/csv
  fastify.get('/reports/export/csv', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const parsed = inventoryFilterSchema.safeParse(query);
    const filters = parsed.success ? { ...parsed.data, limit: 1000 } : { page: 1, limit: 1000 };

    const { transactions } = await InventoryService.listTransactions(filters);

    const headers = ['Transaction ID', 'Product', 'Type', 'Quantity', 'Date', 'Remarks', 'Custom Fields'];
    const rows = transactions.map((t) => [
      t.id,
      `"${(t.product_name || '').replace(/"/g, '""')}"`,
      t.type,
      t.quantity,
      t.date,
      `"${(t.remarks || '').replace(/"/g, '""')}"`,
      `"${JSON.stringify(t.sub_product_values).replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="inventory-report-${Date.now()}.csv"`)
      .send(csvContent);
  });
};
