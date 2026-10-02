import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/errors/app_failure.dart';
import '../../../core/utils/app_logger.dart';
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
  }) async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(sectionRepositoryProvider);
      final section = await repo.createSection(
        machineId: machineId,
        name: name,
      );
      state = const AsyncValue.data(null);
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
    required String name,
  }) async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(sectionRepositoryProvider);
      final section = await repo.updateSection(
        id: id,
        name: name,
      );
      state = const AsyncValue.data(null);
      return section;
    } catch (e, st) {
      AppLogger.error('SectionsController: Failed to update section', e, st);
      final failure = e is AppFailure ? e : DatabaseFailure('Failed to update section: $e');
      state = AsyncValue.error(failure, st);
      return null;
    }
  }

  Future<bool> deleteSection(String id) async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(sectionRepositoryProvider);
      await repo.deleteSection(id);
      state = const AsyncValue.data(null);
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
