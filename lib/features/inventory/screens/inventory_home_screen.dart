import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/router/app_routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/inventory_models.dart';
import '../controllers/inventory_controller.dart';
import '../widgets/stock_in_out_dialog.dart';

class InventoryHomeScreen extends ConsumerStatefulWidget {
  const InventoryHomeScreen({super.key});

  @override
  ConsumerState<InventoryHomeScreen> createState() => _InventoryHomeScreenState();
}

class _InventoryHomeScreenState extends ConsumerState<InventoryHomeScreen> {
  final TextEditingController _searchController = TextEditingController();
  final Set<String> _expandedProductIds = {};

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _toggleExpanded(String productId) {
    setState(() {
      if (_expandedProductIds.contains(productId)) {
        _expandedProductIds.remove(productId);
      } else {
        _expandedProductIds.add(productId);
      }
    });
  }

  Future<void> _confirmDeleteProduct(InventoryProduct product) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Product'),
        content: Text('Are you sure you want to delete "${product.name}" and all its sub-products and transaction history? This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
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
        await ref.read(inventoryProductsProvider.notifier).deleteProduct(product.id);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Product "${product.name}" deleted successfully')),
        );
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to delete product: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _showStockModal(BuildContext context, InventorySubProduct subProduct, String type) async {
    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StockInOutDialog.fromSubProduct(
        subProduct: subProduct,
        initialType: type,
      ),
    );

    if (result == true) {
      ref.invalidate(inventoryProductsProvider);
    }
  }

  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(inventoryProductsProvider);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = isDark ? AppColors.primaryLight : AppColors.primary;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
      appBar: AppBar(
        title: const Text(
          'Products',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            tooltip: 'Stock Reports',
            icon: const Icon(Icons.assessment_outlined),
            onPressed: () {
              context.push(AppRoutes.inventoryReports);
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(inventoryProductsProvider);
        },
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: Column(
                  children: [
                    // Purple "Add New Product" button (Ref: Image 1, 4)
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: primaryColor,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                          elevation: 2,
                        ),
                        onPressed: () {
                          context.push(AppRoutes.inventoryAddProduct);
                        },
                        icon: const Icon(Icons.add, size: 20),
                        label: const Text(
                          'Add New Product',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // "Find Stock Detail" search input
                    TextField(
                      controller: _searchController,
                      decoration: InputDecoration(
                        hintText: 'Find Stock Detail',
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
                                  ref.read(inventorySearchQueryProvider.notifier).setQuery('');
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
                        ref.read(inventorySearchQueryProvider.notifier).setQuery(val.trim());
                      },
                    ),
                  ],
                ),
              ),
            ),

            // Product List & Accordions
            productsAsync.when(
              data: (products) {
                if (products.isEmpty) {
                  return SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.inventory_2_outlined,
                            size: 64,
                            color: isDark ? Colors.grey[700] : Colors.grey[400],
                          ),
                          const SizedBox(height: 16),
                          Text(
                            _searchController.text.isEmpty
                                ? 'No products found'
                                : 'No matching products or items',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: isDark ? Colors.grey[400] : Colors.grey[600],
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _searchController.text.isEmpty
                                ? 'Tap "Add New Product" to create your first category'
                                : 'Try searching with a different term',
                            style: TextStyle(
                              fontSize: 13,
                              color: isDark ? Colors.grey[500] : Colors.grey[500],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }

                return SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final product = products[index];
                        // Auto-expand if search active or in set
                        final isExpanded = _searchController.text.isNotEmpty ||
                            _expandedProductIds.contains(product.id) ||
                            index == 0;

                        return _buildProductAccordion(
                          context,
                          product: product,
                          isExpanded: isExpanded,
                          isDark: isDark,
                        );
                      },
                      childCount: products.length,
                    ),
                  ),
                );
              },
              loading: () => const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (err, stack) => SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: Colors.red),
                        const SizedBox(height: 12),
                        Text(
                          'Failed to load inventory: $err',
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.red),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => ref.invalidate(inventoryProductsProvider),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProductAccordion(
    BuildContext context, {
    required InventoryProduct product,
    required bool isExpanded,
    required bool isDark,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : AppColors.cardLight,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header: Product Name + Add Sub-product '+' + Expand/Collapse Chevron (Ref: Image 1, 4)
          InkWell(
            onTap: () => _toggleExpanded(product.id),
            borderRadius: BorderRadius.circular(10),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      product.name.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  // '+' Add Sub-product button (Ref: Image 1, 4)
                  Container(
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
                      ),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: InkWell(
                      onTap: () {
                        context.push(AppRoutes.inventoryAddSubProduct(product.id));
                      },
                      borderRadius: BorderRadius.circular(6),
                      child: const Padding(
                        padding: EdgeInsets.all(4),
                        child: Icon(Icons.add, size: 18),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Chevron icon
                  Icon(
                    isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                    color: Colors.grey[600],
                    size: 22,
                  ),
                ],
              ),
            ),
          ),

          if (isExpanded) ...[
            const Divider(height: 1, thickness: 1),
            if (product.subProducts.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                child: Center(
                  child: Column(
                    children: [
                      Text(
                        'No items in this category yet',
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextButton.icon(
                        onPressed: () {
                          context.push(AppRoutes.inventoryAddSubProduct(product.id));
                        },
                        icon: const Icon(Icons.add, size: 16),
                        label: const Text('Add First Item'),
                      ),
                    ],
                  ),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                itemCount: product.subProducts.length,
                separatorBuilder: (context, index) => const SizedBox(height: 8),
                itemBuilder: (context, subIndex) {
                  final sub = product.subProducts[subIndex];
                  return _buildSubProductRow(
                    context,
                    product: product,
                    subProduct: sub,
                    isDark: isDark,
                  );
                },
              ),

            // Bottom action row: [View Report] button + Delete Product trash button (Ref: Image 4)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 38,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF7C3AED),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(6),
                          ),
                          elevation: 0,
                        ),
                        onPressed: () {
                          // Navigate to reports filtered for this product
                          ref.read(reportFilterProvider.notifier).setFilter(ReportFilterState(
                            productId: product.id,
                            type: 'ALL',
                          ));
                          context.push(AppRoutes.inventoryReports);
                        },
                        child: const Text(
                          'View Report',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Delete Category button (Red trash icon)
                  Container(
                    height: 38,
                    width: 38,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: IconButton(
                      padding: EdgeInsets.zero,
                      icon: const Icon(Icons.delete_outline, color: Colors.white, size: 20),
                      tooltip: 'Delete Product Category',
                      onPressed: () => _confirmDeleteProduct(product),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSubProductRow(
    BuildContext context, {
    required InventoryProduct product,
    required InventorySubProduct subProduct,
    required bool isDark,
  }) {
    // Collect key-value labels for display (e.g. "Make : PIX", "Number : SPC-3550", "Location : VSL-6")
    final List<MapEntry<String, String>> fieldsToDisplay = [];
    for (final field in product.fields) {
      final val = subProduct.values[field.id] ?? subProduct.values[field.label] ?? '';
      if (val.isNotEmpty) {
        fieldsToDisplay.add(MapEntry(field.label, val));
      }
    }

    // Fallback if no matching fields configured yet
    if (fieldsToDisplay.isEmpty && subProduct.values.isNotEmpty) {
      subProduct.values.forEach((k, v) {
        if (v.isNotEmpty) {
          fieldsToDisplay.add(MapEntry(k, v));
        }
      });
    }

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF262626) : const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Left side: Dynamic Field Key-Value pairs (Ref: Image 1, 4)
          Expanded(
            child: InkWell(
              onTap: () {
                context.push(AppRoutes.inventorySubProductDetail(subProduct.id));
              },
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (fieldsToDisplay.isEmpty)
                    Text(
                      'No details provided',
                      style: TextStyle(
                        fontSize: 13,
                        fontStyle: FontStyle.italic,
                        color: isDark ? Colors.grey[400] : Colors.grey[500],
                      ),
                    )
                  else
                    ...fieldsToDisplay.map((entry) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 2),
                        child: RichText(
                          text: TextSpan(
                            style: TextStyle(
                              fontSize: 13,
                              color: isDark ? Colors.grey[300] : Colors.grey[800],
                            ),
                            children: [
                              TextSpan(
                                text: '${entry.key} : ',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                                ),
                              ),
                              TextSpan(
                                text: entry.value,
                                style: const TextStyle(fontWeight: FontWeight.w500),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                ],
              ),
            ),
          ),

          const SizedBox(width: 8),

          // Right side controls: [Pencil Edit] [IN] [ Count ] [OUT] (Ref: Image 1, 4)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Edit Icon (Pencil)
              IconButton(
                padding: const EdgeInsets.all(4),
                constraints: const BoxConstraints(),
                icon: Icon(
                  Icons.edit_outlined,
                  size: 18,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
                tooltip: 'Edit Item & Details',
                onPressed: () {
                  context.push(AppRoutes.inventorySubProductDetail(subProduct.id));
                },
              ),
              const SizedBox(width: 6),

              // [ IN ] Button
              _buildActionButton(
                label: 'IN',
                onTap: () => _showStockModal(context, subProduct, 'IN'),
                isDark: isDark,
              ),

              const SizedBox(width: 4),

              // [ Count ] Badge
              Container(
                constraints: const BoxConstraints(minWidth: 32),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(
                    color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
                  ),
                ),
                child: Text(
                  '${subProduct.currentStock}',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: subProduct.currentStock <= 0
                        ? Colors.red
                        : (isDark ? Colors.white : Colors.black87),
                  ),
                ),
              ),

              const SizedBox(width: 4),

              // [ OUT ] Button
              _buildActionButton(
                label: 'OUT',
                onTap: () => _showStockModal(context, subProduct, 'OUT'),
                isDark: isDark,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required String label,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return Material(
      color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
      borderRadius: BorderRadius.circular(4),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(4),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(4),
            border: Border.all(
              color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: isDark ? Colors.grey[300] : Colors.grey[800],
            ),
          ),
        ),
      ),
    );
  }
}
