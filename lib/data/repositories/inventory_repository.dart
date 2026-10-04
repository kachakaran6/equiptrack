import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/errors/app_failure.dart';
import '../../core/network/api_client.dart';
import '../../core/utils/app_logger.dart';
import '../../models/inventory_models.dart';

abstract class InventoryRepository {
  Future<List<InventoryProduct>> getProducts({String? search});
  Future<InventoryProduct> getProduct(String id);
  Future<InventoryProduct> createProduct(String name, List<String> fields);
  Future<InventoryProduct> updateProduct(String id, {String? name, List<Map<String, dynamic>>? fields});
  Future<void> deleteProduct(String id);

  Future<InventorySubProduct> createSubProduct(String productId, Map<String, String> values);
  Future<InventorySubProduct> getSubProduct(String id);
  Future<InventorySubProduct> updateSubProduct(String id, Map<String, String> values);
  Future<void> deleteSubProduct(String id);

  Future<InventoryTransaction> createTransaction(
    String subProductId, {
    required String type,
    required int quantity,
    required String date,
    String? remarks,
  });
  Future<List<InventoryTransaction>> getTransactions({
    String? subProductId,
    String? productId,
    String? type,
    String? startDate,
    String? endDate,
    String? search,
    int page = 1,
    int limit = 100,
  });
  Future<InventoryTransaction> updateTransaction(
    String id, {
    String? type,
    int? quantity,
    String? date,
    String? remarks,
  });
  Future<void> deleteTransaction(String id);
}

class ApiInventoryRepository implements InventoryRepository {
  final ApiClient _apiClient;

  ApiInventoryRepository(this._apiClient);

  @override
  Future<List<InventoryProduct>> getProducts({String? search}) async {
    try {
      final queryParams = <String, dynamic>{};
      if (search != null && search.trim().isNotEmpty) {
        queryParams['search'] = search.trim();
      }

      final data = await _apiClient.get('/inventory/products', queryParameters: queryParams);
      if (data is List) {
        return data
            .map((item) => InventoryProduct.fromJson(Map<String, dynamic>.from(item as Map)))
            .toList();
      }
      return [];
    } catch (e, st) {
      AppLogger.error('Error fetching inventory products via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to fetch inventory products: $e');
    }
  }

  @override
  Future<InventoryProduct> getProduct(String id) async {
    try {
      final data = await _apiClient.get('/inventory/products/$id');
      return InventoryProduct.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e, st) {
      AppLogger.error('Error fetching product $id via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to fetch product: $e');
    }
  }

  @override
  Future<InventoryProduct> createProduct(String name, List<String> fields) async {
    try {
      final data = await _apiClient.post('/inventory/products', body: {
        'name': name.trim(),
        'fields': fields.map((f) => f.trim()).where((f) => f.isNotEmpty).toList(),
      });
      return InventoryProduct.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e, st) {
      AppLogger.error('Error creating product via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to create product: $e');
    }
  }

  @override
  Future<InventoryProduct> updateProduct(
    String id, {
    String? name,
    List<Map<String, dynamic>>? fields,
  }) async {
    try {
      final body = <String, dynamic>{};
      if (name != null) body['name'] = name.trim();
      if (fields != null) body['fields'] = fields;

      final data = await _apiClient.patch('/inventory/products/$id', body: body);
      return InventoryProduct.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e, st) {
      AppLogger.error('Error updating product $id via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to update product: $e');
    }
  }

  @override
  Future<void> deleteProduct(String id) async {
    try {
      await _apiClient.delete('/inventory/products/$id');
    } on AppFailure catch (e) {
      if (e.code == '404' ||
          e.message.toLowerCase().contains('not found') ||
          e.message.toLowerCase().contains('does not exist')) {
        return;
      }
      rethrow;
    } catch (e, st) {
      AppLogger.error('Error deleting product $id via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to delete product: $e');
    }
  }

  @override
  Future<InventorySubProduct> createSubProduct(String productId, Map<String, String> values) async {
    try {
      final data = await _apiClient.post(
        '/inventory/products/$productId/sub-products',
        body: {'values': values},
      );
      return InventorySubProduct.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e, st) {
      AppLogger.error('Error creating sub product via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to create sub product: $e');
    }
  }

  @override
  Future<InventorySubProduct> getSubProduct(String id) async {
    try {
      final data = await _apiClient.get('/inventory/sub-products/$id');
      return InventorySubProduct.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e, st) {
      AppLogger.error('Error fetching sub product $id via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to fetch sub product: $e');
    }
  }

  @override
  Future<InventorySubProduct> updateSubProduct(String id, Map<String, String> values) async {
    try {
      final data = await _apiClient.patch(
        '/inventory/sub-products/$id',
        body: {'values': values},
      );
      return InventorySubProduct.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e, st) {
      AppLogger.error('Error updating sub product $id via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to update sub product: $e');
    }
  }

  @override
  Future<void> deleteSubProduct(String id) async {
    try {
      await _apiClient.delete('/inventory/sub-products/$id');
    } on AppFailure catch (e) {
      if (e.code == '404' ||
          e.message.toLowerCase().contains('not found') ||
          e.message.toLowerCase().contains('does not exist')) {
        return;
      }
      rethrow;
    } catch (e, st) {
      AppLogger.error('Error deleting sub product $id via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to delete sub product: $e');
    }
  }

  @override
  Future<InventoryTransaction> createTransaction(
    String subProductId, {
    required String type,
    required int quantity,
    required String date,
    String? remarks,
  }) async {
    try {
      final res = await _apiClient.post(
        '/inventory/sub-products/$subProductId/transactions',
        body: {
          'type': type,
          'quantity': quantity,
          'date': date,
          'remarks': remarks,
        },
      );
      final txData = (res is Map && res.containsKey('transaction')) ? res['transaction'] : res;
      return InventoryTransaction.fromJson(Map<String, dynamic>.from(txData as Map));
    } catch (e, st) {
      AppLogger.error('Error recording inventory transaction via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to record transaction: $e');
    }
  }

  @override
  Future<List<InventoryTransaction>> getTransactions({
    String? subProductId,
    String? productId,
    String? type,
    String? startDate,
    String? endDate,
    String? search,
    int page = 1,
    int limit = 100,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };
      if (subProductId != null) queryParams['subProductId'] = subProductId;
      if (productId != null) queryParams['productId'] = productId;
      if (type != null && type != 'ALL') queryParams['type'] = type;
      if (startDate != null) queryParams['startDate'] = startDate;
      if (endDate != null) queryParams['endDate'] = endDate;
      if (search != null && search.trim().isNotEmpty) queryParams['search'] = search.trim();

      final endpoint = subProductId != null
          ? '/inventory/sub-products/$subProductId/transactions'
          : '/inventory/transactions';

      final data = await _apiClient.get(endpoint, queryParameters: queryParams);
      if (data is List) {
        return data
            .map((item) => InventoryTransaction.fromJson(Map<String, dynamic>.from(item as Map)))
            .toList();
      }
      return [];
    } catch (e, st) {
      AppLogger.error('Error fetching inventory transactions via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to fetch transactions: $e');
    }
  }

  @override
  Future<InventoryTransaction> updateTransaction(
    String id, {
    String? type,
    int? quantity,
    String? date,
    String? remarks,
  }) async {
    try {
      final body = <String, dynamic>{};
      if (type != null) body['type'] = type;
      if (quantity != null) body['quantity'] = quantity;
      if (date != null) body['date'] = date;
      if (remarks != null) body['remarks'] = remarks;

      final data = await _apiClient.patch('/inventory/transactions/$id', body: body);
      return InventoryTransaction.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e, st) {
      AppLogger.error('Error updating transaction $id via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to update transaction: $e');
    }
  }

  @override
  Future<void> deleteTransaction(String id) async {
    try {
      await _apiClient.delete('/inventory/transactions/$id');
    } on AppFailure catch (e) {
      if (e.code == '404' ||
          e.message.toLowerCase().contains('not found') ||
          e.message.toLowerCase().contains('does not exist')) {
        return;
      }
      rethrow;
    } catch (e, st) {
      AppLogger.error('Error deleting transaction $id via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to delete transaction: $e');
    }
  }
}

final inventoryRepositoryProvider = Provider<InventoryRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return ApiInventoryRepository(apiClient);
});
