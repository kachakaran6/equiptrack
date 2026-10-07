import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/analytics/analytics_event.dart';
import '../../../core/analytics/analytics_service.dart';
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
    required String name,
    String? machineId,
  }) async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(categoryRepositoryProvider);
      final category = await repo.createCategory(
        name: name,
        machineId: machineId,
      );
      ref.invalidate(allCategoriesProvider);
      if (machineId != null) {
        ref.invalidate(categoriesStreamFamily(machineId));
      }
      state = const AsyncValue.data(null);

      await AnalyticsService.instance.track(
        AnalyticsEvent.categoryCreated,
        {
          'category_id': category.id,
          'machine_id': machineId,
        },
      );
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
    required String name,
    String? machineId,
  }) async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(categoryRepositoryProvider);
      final category = await repo.updateCategory(
        id: id,
        name: name,
      );
      ref.invalidate(allCategoriesProvider);
      if (machineId != null) {
        ref.invalidate(categoriesStreamFamily(machineId));
      }
      state = const AsyncValue.data(null);

      await AnalyticsService.instance.track(
        AnalyticsEvent.categoryUpdated,
        {
          'category_id': category.id,
          'machine_id': machineId,
        },
      );
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
    String? machineId,
  }) async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(categoryRepositoryProvider);
      await repo.deleteCategory(id);
      // Invalidate all categories and affected sections
      ref.invalidate(allCategoriesProvider);
      if (machineId != null) {
        ref.invalidate(categoriesStreamFamily(machineId));
        ref.invalidate(sectionsStreamFamily(machineId));
      }
      state = const AsyncValue.data(null);

      await AnalyticsService.instance.track(
        AnalyticsEvent.categoryDeleted,
        {
          'category_id': id,
          'machine_id': machineId,
        },
      );
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

