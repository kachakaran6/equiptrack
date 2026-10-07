import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/errors/app_failure.dart';
import '../../core/network/api_client.dart';
import '../../core/utils/app_logger.dart';
import '../../models/category.dart';

import 'auth_repository.dart';

abstract class CategoryRepository {
  Future<List<Category>> getCategories([String? machineId]);
  Future<Category?> getCategoryById(String id);
  Future<Category> createCategory({required String name, String? machineId});
  Future<Category> updateCategory({required String id, required String name});
  Future<void> deleteCategory(String id);
}

class ApiCategoryRepository implements CategoryRepository {
  final ApiClient _apiClient;

  ApiCategoryRepository(this._apiClient);

  @override
  Future<List<Category>> getCategories([String? machineId]) async {
    try {
      dynamic data;
      if (machineId != null && machineId.isNotEmpty) {
        // Query categories used in this machine
        try {
          data = await _apiClient.get('/machines/$machineId/categories');
        } catch (e) {
          data = await _apiClient.get(
            '/categories',
            queryParameters: {'machine_id': machineId},
          );
        }
      } else {
        // Global user categories
        data = await _apiClient.get('/categories');
      }

      if (data is List) {
        return data
            .map((item) => Category.fromJson(Map<String, dynamic>.from(item as Map)))
            .toList();
      }
      return [];
    } catch (e, st) {
      AppLogger.error('Error fetching categories via API', e, st);
      if (e is DatabaseFailure && e.code == '404') {
        return [];
      }
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Unable to load categories: $e');
    }
  }

  @override
  Future<Category?> getCategoryById(String id) async {
    try {
      final data = await _apiClient.get('/categories/$id');
      if (data is Map) {
        return Category.fromJson(Map<String, dynamic>.from(data));
      }
      return null;
    } catch (e, st) {
      AppLogger.error('Error fetching category $id via API', e, st);
      if (e is DatabaseFailure && e.code == '404') {
        return null;
      }
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Unable to load category details: $e');
    }
  }

  @override
  Future<Category> createCategory({
    required String name,
    String? machineId,
  }) async {
    try {
      dynamic data;
      try {
        data = await _apiClient.post(
          '/categories',
          body: {
            'name': name.trim(),
          },
        );
      } catch (e) {
        if (machineId != null && machineId.isNotEmpty) {
          data = await _apiClient.post(
            '/machines/$machineId/categories',
            body: {
              'name': name.trim(),
            },
          );
        } else {
          rethrow;
        }
      }

      return Category.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e, st) {
      AppLogger.error('Error creating category via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to save category: $e');
    }
  }

  @override
  Future<Category> updateCategory({
    required String id,
    required String name,
  }) async {
    try {
      final data = await _apiClient.patch(
        '/categories/$id',
        body: {
          'name': name.trim(),
        },
      );

      return Category.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e, st) {
      AppLogger.error('Error updating category $id via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to update category: $e');
    }
  }

  @override
  Future<void> deleteCategory(String id) async {
    try {
      await _apiClient.delete('/categories/$id');
    } catch (e, st) {
      AppLogger.error('Error deleting category $id via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to delete category: $e');
    }
  }
}

final categoryRepositoryProvider = Provider<CategoryRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return ApiCategoryRepository(apiClient);
});

/// Stream/Future family of categories for any machine or global
final categoriesStreamFamily =
    FutureProvider.family<List<Category>, String>((ref, machineId) async {
  ref.watch(currentUserProvider);
  final repo = ref.watch(categoryRepositoryProvider);
  return repo.getCategories(machineId);
});

/// Global user categories provider
final allCategoriesProvider = FutureProvider<List<Category>>((ref) async {
  ref.watch(currentUserProvider);
  final repo = ref.watch(categoryRepositoryProvider);
  return repo.getCategories();
});
