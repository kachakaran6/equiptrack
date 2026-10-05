import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../data/repositories/inventory_repository.dart';
import '../../../models/inventory_models.dart';
import '../controllers/inventory_controller.dart';

class StockReportScreen extends ConsumerStatefulWidget {
  const StockReportScreen({super.key});

  @override
  ConsumerState<StockReportScreen> createState() => _StockReportScreenState();
}

class _StockReportScreenState extends ConsumerState<StockReportScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Initialize search text if existing filter has search
    final currentFilter = ref.read(reportFilterProvider);
    if (currentFilter.search != null && currentFilter.search!.isNotEmpty) {
      _searchController.text = currentFilter.search!;
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onTypeFilterChanged(String type) {
    ref.read(reportFilterProvider.notifier).updateFilter((state) => state.copyWith(type: type));
  }

  Future<void> _confirmDeleteTransaction(InventoryTransaction tx) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Transaction'),
        content: Text('Are you sure you want to delete this ${tx.type} transaction of ${tx.quantity} units? This will automatically recalculate the stock.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      try {
        await ref.read(inventoryRepositoryProvider).deleteTransaction(tx.id);
        ref.invalidate(stockReportsProvider);
        ref.invalidate(inventoryProductsProvider);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Transaction deleted successfully')),
        );
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to delete transaction: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final filter = ref.watch(reportFilterProvider);
    final reportsAsync = ref.watch(stockReportsProvider);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF121212) : const Color(0xFFF8F9FD),
      appBar: AppBar(
        title: const Text('Stock Report', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/inventory');
            }
          },
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(stockReportsProvider);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Back to Home Link (Ref: Image 5)
              InkWell(
                onTap: () {
                  if (context.canPop()) {
                    context.pop();
                  } else {
                    context.go('/inventory');
                  }
                },
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.arrow_back, size: 16, color: Color(0xFF7C3AED)),
                      const SizedBox(width: 4),
                      Text(
                        'Back to Home',
                        style: TextStyle(
                          color: const Color(0xFF7C3AED),
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              Text(
                'Stock Reports',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black87,
                ),
              ),
              const SizedBox(height: 16),

              // Filter Report Search Input (Ref: Image 5)
              TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Filter Report...',
                  hintStyle: TextStyle(
                    color: isDark ? Colors.grey[400] : Colors.grey[500],
                    fontSize: 14,
                  ),
                  prefixIcon: const Icon(Icons.search, size: 20),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, size: 18),
                          onPressed: () {
                            _searchController.clear();
                            ref.read(reportFilterProvider.notifier).updateFilter(
                              (s) => s.copyWith(search: ''),
                            );
                          },
                        )
                      : null,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  filled: true,
                  fillColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(
                      color: isDark ? Colors.grey[800]! : Colors.grey[300]!,
                    ),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(
                      color: isDark ? Colors.grey[800]! : Colors.grey[300]!,
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: const BorderSide(
                      color: Color(0xFF7C3AED),
                      width: 1.5,
                    ),
                  ),
                ),
                onChanged: (val) {
                  ref.read(reportFilterProvider.notifier).updateFilter(
                    (s) => s.copyWith(search: val.trim()),
                  );
                },
              ),
              const SizedBox(height: 16),

              // Segmented Filter Tabs: [ All ] [ In ] [ Out ] (Ref: Image 5)
              Container(
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isDark ? Colors.grey[800]! : const Color(0xFFE5E7EB),
                  ),
                ),
                child: Row(
                  children: [
                    _buildFilterTab(
                      label: 'All',
                      isSelected: filter.type == 'ALL' || filter.type == null,
                      onTap: () => _onTypeFilterChanged('ALL'),
                      isDark: isDark,
                    ),
                    _buildFilterTab(
                      label: 'In',
                      isSelected: filter.type == 'IN',
                      onTap: () => _onTypeFilterChanged('IN'),
                      isDark: isDark,
                    ),
                    _buildFilterTab(
                      label: 'Out',
                      isSelected: filter.type == 'OUT',
                      onTap: () => _onTypeFilterChanged('OUT'),
                      isDark: isDark,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Report Data / Table List
              reportsAsync.when(
                data: (transactions) {
                  if (transactions.isEmpty) {
                    return Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 16),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isDark ? Colors.grey[850]! : Colors.grey[200]!,
                        ),
                      ),
                      child: Center(
                        child: Column(
                          children: [
                            Icon(
                              Icons.receipt_long_outlined,
                              size: 48,
                              color: isDark ? Colors.grey[600] : Colors.grey[400],
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'No stock records found',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: isDark ? Colors.grey[400] : Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }

                  return ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: transactions.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final tx = transactions[index];
                      return _buildTransactionCard(context, tx: tx, isDark: isDark);
                    },
                  );
                },
                loading: () => const Padding(
                  padding: EdgeInsets.all(40),
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (err, stack) => Padding(
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Column(
                      children: [
                        const Icon(Icons.error_outline, size: 40, color: Colors.red),
                        const SizedBox(height: 8),
                        Text('Error loading reports: $err', style: const TextStyle(color: Colors.red)),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: () => ref.invalidate(stockReportsProvider),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFilterTab({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            border: isSelected
                ? Border.all(color: const Color(0xFF7C3AED), width: 1.5)
                : null,
            borderRadius: BorderRadius.circular(6),
            color: isSelected
                ? (isDark ? const Color(0xFF2E1065) : const Color(0xFFF3E8FF))
                : Colors.transparent,
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              color: isSelected
                  ? const Color(0xFF7C3AED)
                  : (isDark ? Colors.grey[400] : Colors.grey[700]),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTransactionCard(
    BuildContext context, {
    required InventoryTransaction tx,
    required bool isDark,
  }) {
    final isOut = tx.isOut;
    final makeVal = tx.subProductValues['Make'] ??
        tx.subProductValues['make'] ??
        tx.subProductValues.values.firstOrNull ??
        '-';
    final numberVal = tx.subProductValues['Number'] ??
        tx.subProductValues['number'] ??
        (tx.subProductValues.values.length > 1 ? tx.subProductValues.values.elementAt(1) : '-');

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isDark ? Colors.grey[850]! : Colors.grey[200]!,
        ),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Product Name & details (Ref: Image 5)
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tx.productName.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF9A3412), // Warm brown/orange brand tone from Ref Image 5
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Make: $makeVal  •  No: $numberVal',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: isDark ? Colors.grey[300] : Colors.grey[800],
                      ),
                    ),
                  ],
                ),
              ),

              // Quantity badge (Ref: Image 5)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  border: Border.all(color: isDark ? Colors.grey[700]! : Colors.grey[300]!),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '${tx.quantity}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // Type badge (IN / OUT)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isOut ? const Color(0xFFFEF2F2) : const Color(0xFFECFDF5),
                  border: Border.all(
                    color: isOut ? const Color(0xFFFCA5A5) : const Color(0xFF6EE7B7),
                  ),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  tx.type.toUpperCase(),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: isOut ? const Color(0xFFDC2626) : const Color(0xFF059669),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 10),
          const Divider(height: 1),
          const SizedBox(height: 8),

          // Date, Remarks & Actions (Ref: Image 5)
          Row(
            children: [
              Icon(Icons.calendar_today_outlined, size: 14, color: isDark ? Colors.grey[500] : Colors.grey[600]),
              const SizedBox(width: 4),
              Text(
                tx.displayDate,
                style: TextStyle(fontSize: 12, color: isDark ? Colors.grey[400] : Colors.grey[600]),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  tx.remarks?.isNotEmpty == true ? 'Remarks: ${tx.remarks}' : 'Remarks: Nill',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                    fontStyle: FontStyle.italic,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              // Red Delete Action Button (Ref: Image 5)
              SizedBox(
                height: 28,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFEF4444),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                    elevation: 0,
                  ),
                  onPressed: () => _confirmDeleteTransaction(tx),
                  child: const Text('Delete', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
