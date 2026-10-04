import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/utils/app_logger.dart';
import '../../../data/repositories/inventory_repository.dart';
import '../../../models/inventory_models.dart';

class InventorySearchQueryNotifier extends Notifier<String> {
  @override
  String build() => '';

  void setQuery(String query) => state = query;
}

final inventorySearchQueryProvider =
    NotifierProvider<InventorySearchQueryNotifier, String>(InventorySearchQueryNotifier.new);

final inventoryProductsProvider = AsyncNotifierProvider<InventoryProductsNotifier, List<InventoryProduct>>(
  InventoryProductsNotifier.new,
);

class InventoryProductsNotifier extends AsyncNotifier<List<InventoryProduct>> {
  @override
  FutureOr<List<InventoryProduct>> build() {
    final search = ref.watch(inventorySearchQueryProvider);
    return ref.read(inventoryRepositoryProvider).getProducts(search: search);
  }

  Future<InventoryProduct?> createProduct(String name, List<String> fields) async {
    try {
      final repo = ref.read(inventoryRepositoryProvider);
      final product = await repo.createProduct(name, fields);
      ref.invalidateSelf();
      return product;
    } catch (e, st) {
      AppLogger.error('Failed to create inventory product', e, st);
      rethrow;
    }
  }

  Future<InventoryProduct?> updateProduct(
    String id, {
    String? name,
    List<Map<String, dynamic>>? fields,
  }) async {
    try {
      final repo = ref.read(inventoryRepositoryProvider);
      final product = await repo.updateProduct(id, name: name, fields: fields);
      ref.invalidateSelf();
      return product;
    } catch (e, st) {
      AppLogger.error('Failed to update inventory product', e, st);
      rethrow;
    }
  }

  Future<bool> deleteProduct(String id) async {
    try {
      final repo = ref.read(inventoryRepositoryProvider);
      await repo.deleteProduct(id);
      ref.invalidateSelf();
      return true;
    } catch (e, st) {
      AppLogger.error('Failed to delete inventory product', e, st);
      rethrow;
    }
  }

  Future<InventorySubProduct?> createSubProduct(String productId, Map<String, String> values) async {
    try {
      final repo = ref.read(inventoryRepositoryProvider);
      final sub = await repo.createSubProduct(productId, values);
      ref.invalidateSelf();
      return sub;
    } catch (e, st) {
      AppLogger.error('Failed to create sub product', e, st);
      rethrow;
    }
  }

  Future<InventorySubProduct?> updateSubProduct(String id, Map<String, String> values) async {
    try {
      final repo = ref.read(inventoryRepositoryProvider);
      final sub = await repo.updateSubProduct(id, values);
      ref.invalidateSelf();
      return sub;
    } catch (e, st) {
      AppLogger.error('Failed to update sub product', e, st);
      rethrow;
    }
  }

  Future<bool> deleteSubProduct(String id) async {
    try {
      final repo = ref.read(inventoryRepositoryProvider);
      await repo.deleteSubProduct(id);
      ref.invalidateSelf();
      return true;
    } catch (e, st) {
      AppLogger.error('Failed to delete sub product', e, st);
      rethrow;
    }
  }

  Future<InventoryTransaction?> addStockTransaction({
    required String subProductId,
    required String type,
    required int quantity,
    required String date,
    String? remarks,
  }) async {
    try {
      final repo = ref.read(inventoryRepositoryProvider);
      final tx = await repo.createTransaction(
        subProductId,
        type: type,
        quantity: quantity,
        date: date,
        remarks: remarks,
      );
      ref.invalidateSelf();
      return tx;
    } catch (e, st) {
      AppLogger.error('Failed to record stock transaction', e, st);
      rethrow;
    }
  }
}

// Single Sub-Product Detail / History Provider
final subProductDetailProvider = FutureProvider.family<InventorySubProduct, String>((ref, subProductId) async {
  return ref.watch(inventoryRepositoryProvider).getSubProduct(subProductId);
});

final subProductTransactionsProvider = FutureProvider.family<List<InventoryTransaction>, String>((ref, subProductId) async {
  return ref.watch(inventoryRepositoryProvider).getTransactions(subProductId: subProductId);
});

// Filter provider for Stock Report screen
class ReportFilterState {
  final String? type; // 'ALL', 'IN', 'OUT'
  final String? search;
  final String? productId;
  final String? startDate;
  final String? endDate;

  const ReportFilterState({
    this.type = 'ALL',
    this.search,
    this.productId,
    this.startDate,
    this.endDate,
  });

  ReportFilterState copyWith({
    String? type,
    String? search,
    String? productId,
    String? startDate,
    String? endDate,
  }) {
    return ReportFilterState(
      type: type ?? this.type,
      search: search ?? this.search,
      productId: productId ?? this.productId,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
    );
  }
}

class ReportFilterNotifier extends Notifier<ReportFilterState> {
  @override
  ReportFilterState build() => const ReportFilterState();

  void updateFilter(ReportFilterState Function(ReportFilterState) update) {
    state = update(state);
  }

  void setFilter(ReportFilterState filter) {
    state = filter;
  }
}

final reportFilterProvider =
    NotifierProvider<ReportFilterNotifier, ReportFilterState>(ReportFilterNotifier.new);

final stockReportsProvider = FutureProvider<List<InventoryTransaction>>((ref) async {
  final filter = ref.watch(reportFilterProvider);
  return ref.watch(inventoryRepositoryProvider).getTransactions(
    type: filter.type,
    search: filter.search,
    productId: filter.productId,
    startDate: filter.startDate,
    endDate: filter.endDate,
    limit: 500,
  );
});
