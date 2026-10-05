import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/analytics/analytics_event.dart';
import '../../../core/analytics/analytics_service.dart';
import '../../../core/errors/app_failure.dart';
import '../../../core/utils/app_logger.dart';
import '../../../data/repositories/category_repository.dart';
import '../../../data/repositories/section_repository.dart';
import '../../../models/section.dart';

final singleSectionProvider =
    FutureProvider.family<Section?, String>((ref, sectionId) async {
  final repo = ref.watch(sectionRepositoryProvider);
  return repo.getSectionById(sectionId);
});

class SectionsController extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<Section?> createSection({
    required String machineId,
    required String name,
    String? categoryId,
  }) async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(sectionRepositoryProvider);
      final section = await repo.createSection(
        machineId: machineId,
        name: name,
        categoryId: categoryId,
      );
      ref.invalidate(sectionsStreamFamily(machineId));
      ref.invalidate(categoriesStreamFamily(machineId));
      state = const AsyncValue.data(null);

      await AnalyticsService.instance.track(
        AnalyticsEvent.sectionCreated,
        {
          'machine_id': machineId,
          'section_id': section.id,
          'has_category': categoryId != null,
        },
      );
      return section;
    } catch (e, st) {
      AppLogger.error('SectionsController: Failed to create section', e, st);
      final failure = e is AppFailure ? e : DatabaseFailure('Failed to create section: $e');
      state = AsyncValue.error(failure, st);
      return null;
    }
  }

  Future<Section?> updateSection({
    required String id,
    required String machineId,
    String? name,
    String? categoryId,
    bool clearCategory = false,
  }) async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(sectionRepositoryProvider);
      final section = await repo.updateSection(
        id: id,
        name: name,
        categoryId: categoryId,
        clearCategory: clearCategory,
      );
      ref.invalidate(sectionsStreamFamily(machineId));
      ref.invalidate(categoriesStreamFamily(machineId));
      state = const AsyncValue.data(null);

      await AnalyticsService.instance.track(
        AnalyticsEvent.sectionUpdated,
        {
          'machine_id': machineId,
          'section_id': section.id,
        },
      );
      return section;
    } catch (e, st) {
      AppLogger.error('SectionsController: Failed to update section', e, st);
      final failure = e is AppFailure ? e : DatabaseFailure('Failed to update section: $e');
      state = AsyncValue.error(failure, st);
      return null;
    }
  }

  Future<bool> deleteSection(String id, String machineId) async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(sectionRepositoryProvider);
      await repo.deleteSection(id);
      ref.invalidate(sectionsStreamFamily(machineId));
      ref.invalidate(categoriesStreamFamily(machineId));
      state = const AsyncValue.data(null);

      await AnalyticsService.instance.track(
        AnalyticsEvent.sectionDeleted,
        {
          'machine_id': machineId,
          'section_id': id,
        },
      );
      return true;
    } catch (e, st) {
      AppLogger.error('SectionsController: Failed to delete section', e, st);
      final failure = e is AppFailure ? e : DatabaseFailure('Failed to delete section: $e');
      state = AsyncValue.error(failure, st);
      return false;
    }
  }
}

final sectionsControllerProvider =
    AsyncNotifierProvider<SectionsController, void>(SectionsController.new);
