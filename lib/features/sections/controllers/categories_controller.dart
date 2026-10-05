import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/errors/app_failure.dart';
import '../../../core/utils/app_logger.dart';
import '../../../data/repositories/category_repository.dart';
import '../../../data/repositories/section_repository.dart';
import '../../../models/category.dart';

final singleCategoryProvider =
    FutureProvider.family<Category?, String>((ref, categoryId) async {
  final repo = ref.watch(categoryRepositoryProvider);
  return repo.getCategoryById(categoryId);
});

class CategoriesController extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<Category?> createCategory({
    required String machineId,
    required String name,
  }) async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(categoryRepositoryProvider);
      final category = await repo.createCategory(
        machineId: machineId,
        name: name,
      );
      ref.invalidate(categoriesStreamFamily(machineId));
      state = const AsyncValue.data(null);
      return category;
    } catch (e, st) {
      AppLogger.error('CategoriesController: Failed to create category', e, st);
      final failure = e is AppFailure ? e : DatabaseFailure('Failed to create category: $e');
      state = AsyncValue.error(failure, st);
      return null;
    }
  }

  Future<Category?> updateCategory({
    required String id,
    required String machineId,
    required String name,
  }) async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(categoryRepositoryProvider);
      final category = await repo.updateCategory(
        id: id,
        name: name,
      );
      ref.invalidate(categoriesStreamFamily(machineId));
      state = const AsyncValue.data(null);
      return category;
    } catch (e, st) {
      AppLogger.error('CategoriesController: Failed to update category', e, st);
      final failure = e is AppFailure ? e : DatabaseFailure('Failed to update category: $e');
      state = AsyncValue.error(failure, st);
      return null;
    }
  }

  Future<bool> deleteCategory({
    required String id,
    required String machineId,
  }) async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(categoryRepositoryProvider);
      await repo.deleteCategory(id);
      // Invalidate both categories and sections because deleted category's components become uncategorized
      ref.invalidate(categoriesStreamFamily(machineId));
      ref.invalidate(sectionsStreamFamily(machineId));
      state = const AsyncValue.data(null);
      return true;
    } catch (e, st) {
      AppLogger.error('CategoriesController: Failed to delete category', e, st);
      final failure = e is AppFailure ? e : DatabaseFailure('Failed to delete category: $e');
      state = AsyncValue.error(failure, st);
      return false;
    }
  }
}

final categoriesControllerProvider =
    AsyncNotifierProvider<CategoriesController, void>(CategoriesController.new);
