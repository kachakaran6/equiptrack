import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../data/repositories/inventory_repository.dart';
import '../../../models/inventory_models.dart';
import '../controllers/inventory_controller.dart';
import '../widgets/stock_in_out_dialog.dart';
import 'add_edit_sub_product_screen.dart';

class SubProductDetailScreen extends ConsumerStatefulWidget {
  final String subProductId;
  final String productName;

  const SubProductDetailScreen({
    super.key,
    required this.subProductId,
    this.productName = '',
  });

  @override
  ConsumerState<SubProductDetailScreen> createState() => _SubProductDetailScreenState();
}

class _SubProductDetailScreenState extends ConsumerState<SubProductDetailScreen> {
  Future<void> _deleteTransaction(InventoryTransaction tx) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Transaction?'),
        content: Text(
          'Are you sure you want to delete this ${tx.type} transaction of ${tx.quantity} units from ${tx.displayDate}? This will update the current stock accordingly.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      try {
        await ref.read(inventoryRepositoryProvider).deleteTransaction(tx.id);
        ref.invalidate(subProductDetailProvider(widget.subProductId));
        ref.invalidate(subProductTransactionsProvider(widget.subProductId));
        ref.invalidate(inventoryProductsProvider);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Transaction deleted successfully.')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(e.toString().replaceAll('Exception:', '').trim()),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  Future<void> _editTransaction(InventoryTransaction tx) async {
    final qtyController = TextEditingController(text: tx.quantity.toString());
    final remarksController = TextEditingController(text: tx.remarks ?? '');
    DateTime selectedDate = DateTime.tryParse(tx.date) ?? DateTime.now();

    final updated = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) => AlertDialog(
          title: Text('Edit ${tx.type} Transaction'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: qtyController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Quantity *', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              InkWell(
                onTap: () async {
                  final picked = await showDatePicker(
                    context: dialogCtx,
                    initialDate: selectedDate,
                    firstDate: DateTime(2020),
                    lastDate: DateTime(2035),
                  );
                  if (picked != null) {
                    setDialogState(() => selectedDate = picked);
                  }
                },
                child: InputDecorator(
                  decoration: const InputDecoration(labelText: 'Date *', border: OutlineInputBorder()),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(DateFormat('dd MMM yyyy').format(selectedDate)),
                      const Icon(Icons.calendar_today, size: 18),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: remarksController,
                decoration: const InputDecoration(labelText: 'Remarks', border: OutlineInputBorder()),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogCtx).pop(false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                final qty = int.tryParse(qtyController.text.trim());
                if (qty == null || qty <= 0) return;
                try {
                  await ref.read(inventoryRepositoryProvider).updateTransaction(
                        tx.id,
                        quantity: qty,
                        date: DateFormat('yyyy-MM-dd').format(selectedDate),
                        remarks: remarksController.text.trim().isEmpty ? null : remarksController.text.trim(),
                      );
                  if (dialogCtx.mounted) Navigator.of(dialogCtx).pop(true);
                } catch (e) {
                  if (dialogCtx.mounted) {
                    ScaffoldMessenger.of(dialogCtx).showSnackBar(
                      SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
                    );
                  }
                }
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );

    if (updated == true) {
      ref.invalidate(subProductDetailProvider(widget.subProductId));
      ref.invalidate(subProductTransactionsProvider(widget.subProductId));
      ref.invalidate(inventoryProductsProvider);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final subDetailAsync = ref.watch(subProductDetailProvider(widget.subProductId));
    final transactionsAsync = ref.watch(subProductTransactionsProvider(widget.subProductId));

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.productName.isNotEmpty ? widget.productName : 'Item Details'),
        actions: [
          subDetailAsync.when(
            data: (sub) => IconButton(
              icon: const Icon(Icons.edit_outlined),
              tooltip: 'Edit item attributes',
              onPressed: () async {
                final products = await ref.read(inventoryRepositoryProvider).getProducts();
                final parentProd = products.firstWhere(
                  (p) => p.id == sub.productId,
                  orElse: () => InventoryProduct(
                    id: sub.productId,
                    userId: sub.userId,
                    name: widget.productName,
                    createdAt: DateTime.now(),
                    updatedAt: DateTime.now(),
                  ),
                );

                if (context.mounted) {
                  final res = await Navigator.of(context).push<bool>(
                    MaterialPageRoute(
                      builder: (_) => AddEditSubProductScreen(
                        product: parentProd,
                        subProduct: sub,
                      ),
                    ),
                  );
                  if (res == true) {
                    ref.invalidate(subProductDetailProvider(widget.subProductId));
                    ref.invalidate(inventoryProductsProvider);
                  }
                }
              },
            ),
            loading: () => const SizedBox.shrink(),
            error: (error, stack) => const SizedBox.shrink(),
          ),
        ],
      ),
      body: subDetailAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error loading item: $err')),
        data: (sub) {
          final summaryStr = sub.values.entries.map((e) => '${e.key}: ${e.value}').join(' • ');

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Stock KPI Card
              Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: isDark
                        ? [const Color(0xFF1E1E24), const Color(0xFF141417)]
                        : [const Color(0xFFEDE9FE), const Color(0xFFF5F3FF)],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: const Color(0xFF7C3AED).withValues(alpha: 0.3),
                  ),
                ),
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          widget.productName.isNotEmpty ? widget.productName.toUpperCase() : 'INVENTORY ITEM',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.1,
                            color: isDark ? const Color(0xFFA78BFA) : const Color(0xFF6D28D9),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: sub.currentStock > 0
                                ? const Color(0xFF10B981).withValues(alpha: 0.2)
                                : Colors.amber.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            sub.currentStock > 0 ? 'IN STOCK' : 'OUT OF STOCK',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: sub.currentStock > 0 ? const Color(0xFF10B981) : Colors.amber,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(
                          '${sub.currentStock}',
                          style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w900),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'units current stock',
                          style: TextStyle(fontSize: 13, color: theme.hintColor),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    // In & Out stats
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: isDark ? Colors.black26 : Colors.white60,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.arrow_downward, color: Color(0xFF10B981), size: 16),
                                const SizedBox(width: 6),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Total In', style: TextStyle(fontSize: 10, color: Colors.grey)),
                                    Text('${sub.totalIn}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: isDark ? Colors.black26 : Colors.white60,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.arrow_upward, color: Colors.redAccent, size: 16),
                                const SizedBox(width: 6),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Total Out', style: TextStyle(fontSize: 10, color: Colors.grey)),
                                    Text('${sub.totalOut}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Action Buttons Row (IN / OUT)
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        final res = await StockInOutDialog.show(
                          context,
                          subProductId: sub.id,
                          productName: widget.productName.isNotEmpty ? widget.productName : 'Item',
                          subProductSummary: summaryStr,
                          currentStock: sub.currentStock,
                          isStockIn: true,
                        );
                        if (res == true) {
                          ref.invalidate(subProductDetailProvider(widget.subProductId));
                          ref.invalidate(subProductTransactionsProvider(widget.subProductId));
                        }
                      },
                      icon: const Icon(Icons.add, size: 18),
                      label: const Text('Stock In (Add)'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        final res = await StockInOutDialog.show(
                          context,
                          subProductId: sub.id,
                          productName: widget.productName.isNotEmpty ? widget.productName : 'Item',
                          subProductSummary: summaryStr,
                          currentStock: sub.currentStock,
                          isStockIn: false,
                        );
                        if (res == true) {
                          ref.invalidate(subProductDetailProvider(widget.subProductId));
                          ref.invalidate(subProductTransactionsProvider(widget.subProductId));
                        }
                      },
                      icon: const Icon(Icons.remove, size: 18),
                      label: const Text('Stock Out (Remove)'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366F1),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Custom Attributes Table/Card
              if (sub.values.isNotEmpty) ...[
                const Text('Item Attributes', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF18181B) : const Color(0xFFF9FAFB),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: theme.dividerColor),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  child: Column(
                    children: sub.values.entries.map((e) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(e.key, style: TextStyle(fontSize: 12, color: theme.hintColor)),
                            Text(e.value.isEmpty ? '—' : e.value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 24),
              ],

              // Transaction History List
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Inventory History', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  transactionsAsync.when(
                    data: (txs) => Text('${txs.length} entries', style: TextStyle(fontSize: 12, color: theme.hintColor)),
                    loading: () => const SizedBox.shrink(),
                    error: (error, stack) => const SizedBox.shrink(),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              transactionsAsync.when(
                loading: () => const Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (err, _) => Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text('Error loading history: $err', style: const TextStyle(color: Colors.red)),
                ),
                data: (txs) {
                  if (txs.isEmpty) {
                    return Container(
                      padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
                      alignment: Alignment.center,
                      child: Column(
                        children: [
                          Icon(Icons.history_toggle_off, size: 40, color: theme.hintColor),
                          const SizedBox(height: 8),
                          Text(
                            'No inventory transactions yet.',
                            style: TextStyle(color: theme.hintColor, fontSize: 13),
                          ),
                        ],
                      ),
                    );
                  }

                  return ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: txs.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 8),
                    itemBuilder: (ctx, idx) {
                      final tx = txs[idx];
                      final isIn = tx.isIn;

                      return Container(
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF18181B) : Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isIn
                                ? const Color(0xFF10B981).withValues(alpha: 0.3)
                                : Colors.indigo.withValues(alpha: 0.3),
                          ),
                        ),
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            // Badge
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: isIn
                                    ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                    : Colors.indigo.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                tx.type,
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 11,
                                  color: isIn ? const Color(0xFF10B981) : Colors.indigoAccent,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            // Details
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        '${isIn ? "+" : "-"}${tx.quantity} ${tx.quantity == 1 ? 'unit' : 'units'}',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13,
                                          color: isIn ? const Color(0xFF10B981) : Colors.indigoAccent,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        '•  ${tx.displayDate}',
                                        style: TextStyle(fontSize: 11, color: theme.hintColor),
                                      ),
                                    ],
                                  ),
                                  if (tx.remarks != null && tx.remarks!.isNotEmpty) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      tx.remarks!,
                                      style: TextStyle(fontSize: 11, color: theme.hintColor),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            // Action Icons
                            IconButton(
                              icon: const Icon(Icons.edit_outlined, size: 18),
                              color: theme.hintColor,
                              onPressed: () => _editTransaction(tx),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline, size: 18),
                              color: Colors.redAccent.withValues(alpha: 0.8),
                              onPressed: () => _deleteTransaction(tx),
                            ),
                          ],
                        ),
                      );
                    },
                  );
                },
              ),
            ],
          );
        },
      ),
    );
  }
}
