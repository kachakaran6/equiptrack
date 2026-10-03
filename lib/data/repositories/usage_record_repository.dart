import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/constants/app_constants.dart';
import '../../core/errors/app_failure.dart';
import '../../core/utils/app_logger.dart';
import '../../models/usage_record.dart';
import '../datasources/supabase_client_provider.dart';

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
  Stream<List<UsageRecord>> watchRecords(String sectionId);
}

class SupabaseUsageRecordRepository implements UsageRecordRepository {
  final SupabaseClient _client;

  SupabaseUsageRecordRepository(this._client);

  @override
  Future<List<UsageRecord>> getRecords(String sectionId) async {
    try {
      final data = await _client
          .from(AppConstants.tableUsageRecords)
          .select()
          .eq('section_id', sectionId)
          .order('usage_date', ascending: true);

      return (data as List).map((item) => UsageRecord.fromJson(item)).toList();
    } on PostgrestException catch (e) {
      AppLogger.error('Postgrest error fetching usage records for section $sectionId', e);
      throw DatabaseFailure(e.message, e.code, e.details);
    } catch (e, st) {
      AppLogger.error('Unexpected error fetching usage records', e, st);
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

      var query = _client
          .from(AppConstants.tableUsageRecords)
          .select('id')
          .eq('section_id', sectionId)
          .eq('usage_date', dateStr);

      if (excludeRecordId != null) {
        query = query.neq('id', excludeRecordId);
      }

      final data = await query;
      return (data as List).isNotEmpty;
    } catch (e, st) {
      AppLogger.error('Error checking duplicate date', e, st);
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
      final userId = _client.auth.currentUser?.id;
      final dateStr =
          '${usageDate.year.toString().padLeft(4, '0')}-${usageDate.month.toString().padLeft(2, '0')}-${usageDate.day.toString().padLeft(2, '0')}';

      final response = await _client
          .from(AppConstants.tableUsageRecords)
          .insert({
            'section_id': sectionId,
            'name': name.trim(),
            'usage_date': dateStr,
            'created_by': userId,
            'updated_by': userId,
          })
          .select()
          .single();

      return UsageRecord.fromJson(response);
    } on PostgrestException catch (e) {
      AppLogger.error('Postgrest error creating usage record', e);
      throw DatabaseFailure(e.message, e.code, e.details);
    } catch (e, st) {
      AppLogger.error('Unexpected error creating usage record', e, st);
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
      final userId = _client.auth.currentUser?.id;
      final dateStr =
          '${usageDate.year.toString().padLeft(4, '0')}-${usageDate.month.toString().padLeft(2, '0')}-${usageDate.day.toString().padLeft(2, '0')}';

      final response = await _client
          .from(AppConstants.tableUsageRecords)
          .update({
            'name': name.trim(),
            'usage_date': dateStr,
            'updated_by': userId,
          })
          .eq('id', id)
          .select()
          .single();

      return UsageRecord.fromJson(response);
    } on PostgrestException catch (e) {
      AppLogger.error('Postgrest error updating usage record $id', e);
      throw DatabaseFailure(e.message, e.code, e.details);
    } catch (e, st) {
      AppLogger.error('Unexpected error updating usage record $id', e, st);
      throw DatabaseFailure('Failed to update usage record: $e');
    }
  }

  @override
  Future<void> deleteRecord(String id) async {
    try {
      await _client.from(AppConstants.tableUsageRecords).delete().eq('id', id);
    } on PostgrestException catch (e) {
      AppLogger.error('Postgrest error deleting usage record $id', e);
      throw DatabaseFailure(e.message, e.code, e.details);
    } catch (e, st) {
      AppLogger.error('Unexpected error deleting usage record $id', e, st);
      throw DatabaseFailure('Failed to delete usage record: $e');
    }
  }

  @override
  Stream<List<UsageRecord>> watchRecords(String sectionId) {
    return _client
        .from(AppConstants.tableUsageRecords)
        .stream(primaryKey: ['id'])
        .eq('section_id', sectionId)
        .order('usage_date', ascending: true)
        .map((data) {
          final items = data.map((item) => UsageRecord.fromJson(item)).toList();
          final seen = <String>{};
          return items.where((item) => seen.add(item.id)).toList();
        });
  }
}

final usageRecordRepositoryProvider = Provider<UsageRecordRepository>((ref) {
  final client = ref.watch(supabaseClientProvider);
  return SupabaseUsageRecordRepository(client);
});

final usageRecordsStreamFamily = StreamProvider.family<List<UsageRecord>, String>((ref, sectionId) {
  final repo = ref.watch(usageRecordRepositoryProvider);
  return repo.watchRecords(sectionId);
});
