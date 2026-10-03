import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/errors/app_failure.dart';
import '../../core/network/api_client.dart';
import '../../core/utils/app_logger.dart';
import '../../models/usage_record.dart';

abstract class UsageRecordRepository {
  Future<List<UsageRecord>> getRecords(String sectionId);
  Future<UsageRecord> createRecord({
    required String sectionId,
    required String name,
    required DateTime usageDate,
  });
  Future<UsageRecord> updateRecord({
    required String id,
    required String name,
    required DateTime usageDate,
  });
  Future<void> deleteRecord(String id);
  Future<bool> checkForDuplicateDate({
    required String sectionId,
    required DateTime date,
    String? excludeRecordId,
  });
}

class ApiUsageRecordRepository implements UsageRecordRepository {
  final ApiClient _apiClient;

  ApiUsageRecordRepository(this._apiClient);

  @override
  Future<List<UsageRecord>> getRecords(String sectionId) async {
    try {
      final data = await _apiClient.get('/sections/$sectionId/usage-records');
      if (data is List) {
        return data
            .map((item) => UsageRecord.fromJson(Map<String, dynamic>.from(item as Map)))
            .toList();
      }
      return [];
    } catch (e, st) {
      AppLogger.error('Error fetching usage records for section $sectionId via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Unable to load usage history: $e');
    }
  }

  @override
  Future<bool> checkForDuplicateDate({
    required String sectionId,
    required DateTime date,
    String? excludeRecordId,
  }) async {
    try {
      final dateStr =
          '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

      final queryParams = <String, dynamic>{'date': dateStr};
      if (excludeRecordId != null) {
        queryParams['excludeId'] = excludeRecordId;
      }

      final data = await _apiClient.get(
        '/sections/$sectionId/check-duplicate-date',
        queryParameters: queryParams,
      );

      if (data is Map && data['isDuplicate'] != null) {
        return data['isDuplicate'] as bool;
      }
      return false;
    } catch (e, st) {
      AppLogger.error('Error checking duplicate date via API', e, st);
      return false;
    }
  }

  @override
  Future<UsageRecord> createRecord({
    required String sectionId,
    required String name,
    required DateTime usageDate,
  }) async {
    try {
      final dateStr =
          '${usageDate.year.toString().padLeft(4, '0')}-${usageDate.month.toString().padLeft(2, '0')}-${usageDate.day.toString().padLeft(2, '0')}';

      final data = await _apiClient.post(
        '/sections/$sectionId/usage-records',
        body: {
          'name': name.trim(),
          'usage_date': dateStr,
        },
      );

      return UsageRecord.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e, st) {
      AppLogger.error('Error creating usage record via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to save usage record: $e');
    }
  }

  @override
  Future<UsageRecord> updateRecord({
    required String id,
    required String name,
    required DateTime usageDate,
  }) async {
    try {
      final dateStr =
          '${usageDate.year.toString().padLeft(4, '0')}-${usageDate.month.toString().padLeft(2, '0')}-${usageDate.day.toString().padLeft(2, '0')}';

      final data = await _apiClient.patch(
        '/usage-records/$id',
        body: {
          'name': name.trim(),
          'usage_date': dateStr,
        },
      );

      return UsageRecord.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e, st) {
      AppLogger.error('Error updating usage record $id via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to update usage record: $e');
    }
  }

  @override
  Future<void> deleteRecord(String id) async {
    try {
      await _apiClient.delete('/usage-records/$id');
    } catch (e, st) {
      AppLogger.error('Error deleting usage record $id via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to delete usage record: $e');
    }
  }
}

final usageRecordRepositoryProvider = Provider<UsageRecordRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return ApiUsageRecordRepository(apiClient);
});

final usageRecordsStreamFamily =
    FutureProvider.family<List<UsageRecord>, String>((ref, sectionId) async {
  final repo = ref.watch(usageRecordRepositoryProvider);
  return repo.getRecords(sectionId);
});
