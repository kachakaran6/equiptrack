import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/errors/app_failure.dart';
import '../../../core/services/usage_calculation_service.dart';
import '../../../core/utils/app_logger.dart';
import '../../../data/repositories/usage_record_repository.dart';
import '../../../models/calculated_usage_row.dart';
import '../../../models/usage_record.dart';

final calculatedUsageRowsFamily =
    Provider.family<AsyncValue<List<CalculatedUsageRow>>, String>((ref, sectionId) {
  final recordsAsync = ref.watch(usageRecordsStreamFamily(sectionId));
  const calculationService = UsageCalculationService();

  return recordsAsync.whenData((records) {
    return calculationService.calculate(records);
  });
});

class UsageRecordsController extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<bool> checkForDuplicateDate({
    required String sectionId,
    required DateTime date,
    String? excludeRecordId,
  }) async {
    final repo = ref.read(usageRecordRepositoryProvider);
    return await repo.checkForDuplicateDate(
      sectionId: sectionId,
      date: date,
      excludeRecordId: excludeRecordId,
    );
  }

  Future<UsageRecord?> createRecord({
    required String sectionId,
    required String name,
    required DateTime usageDate,
  }) async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(usageRecordRepositoryProvider);
      final record = await repo.createRecord(
        sectionId: sectionId,
        name: name,
        usageDate: usageDate,
      );
      ref.invalidate(usageRecordsStreamFamily(sectionId));
      state = const AsyncValue.data(null);
      return record;
    } catch (e, st) {
      AppLogger.error('UsageRecordsController: Failed to create record', e, st);
      final failure = e is AppFailure ? e : DatabaseFailure('Failed to create record: $e');
      state = AsyncValue.error(failure, st);
      return null;
    }
  }

  Future<UsageRecord?> updateRecord({
    required String id,
    required String sectionId,
    required String name,
    required DateTime usageDate,
  }) async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(usageRecordRepositoryProvider);
      final record = await repo.updateRecord(
        id: id,
        name: name,
        usageDate: usageDate,
      );
      ref.invalidate(usageRecordsStreamFamily(sectionId));
      state = const AsyncValue.data(null);
      return record;
    } catch (e, st) {
      AppLogger.error('UsageRecordsController: Failed to update record', e, st);
      final failure = e is AppFailure ? e : DatabaseFailure('Failed to update record: $e');
      state = AsyncValue.error(failure, st);
      return null;
    }
  }

  Future<bool> deleteRecord(String id, String sectionId) async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(usageRecordRepositoryProvider);
      await repo.deleteRecord(id);
      ref.invalidate(usageRecordsStreamFamily(sectionId));
      state = const AsyncValue.data(null);
      return true;
    } catch (e, st) {
      AppLogger.error('UsageRecordsController: Failed to delete record', e, st);
      final failure = e is AppFailure ? e : DatabaseFailure('Failed to delete record: $e');
      state = AsyncValue.error(failure, st);
      return false;
    }
  }
}

final usageRecordsControllerProvider =
    AsyncNotifierProvider<UsageRecordsController, void>(UsageRecordsController.new);
