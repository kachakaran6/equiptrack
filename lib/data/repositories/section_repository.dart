import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/constants/app_constants.dart';
import '../../core/errors/app_failure.dart';
import '../../core/utils/app_logger.dart';
import '../../models/section.dart';
import '../datasources/supabase_client_provider.dart';

abstract class SectionRepository {
  Future<List<Section>> getSections(String machineId);
  Future<Section?> getSectionById(String id);
  Future<Section> createSection({required String machineId, required String name});
  Future<Section> updateSection({required String id, required String name});
  Future<void> deleteSection(String id);
  Stream<List<Section>> watchSections(String machineId);
}

class SupabaseSectionRepository implements SectionRepository {
  final SupabaseClient _client;

  SupabaseSectionRepository(this._client);

  @override
  Future<List<Section>> getSections(String machineId) async {
    try {
      final data = await _client
          .from(AppConstants.tableSections)
          .select()
          .eq('machine_id', machineId)
          .order('name', ascending: true);

      return (data as List).map((item) => Section.fromJson(item)).toList();
    } on PostgrestException catch (e) {
      AppLogger.error('Postgrest error fetching sections for machine $machineId', e);
      throw DatabaseFailure(e.message, e.code, e.details);
    } catch (e, st) {
      AppLogger.error('Unexpected error fetching sections', e, st);
      throw DatabaseFailure('Unable to load sections: $e');
    }
  }

  @override
  Future<Section?> getSectionById(String id) async {
    try {
      final data = await _client
          .from(AppConstants.tableSections)
          .select()
          .eq('id', id)
          .maybeSingle();

      if (data == null) return null;
      return Section.fromJson(data);
    } on PostgrestException catch (e) {
      AppLogger.error('Postgrest error fetching section $id', e);
      throw DatabaseFailure(e.message, e.code, e.details);
    } catch (e, st) {
      AppLogger.error('Unexpected error fetching section $id', e, st);
      throw DatabaseFailure('Unable to load section details: $e');
    }
  }

  @override
  Future<Section> createSection({
    required String machineId,
    required String name,
  }) async {
    try {
      final userId = _client.auth.currentUser?.id;
      final response = await _client
          .from(AppConstants.tableSections)
          .insert({
            'machine_id': machineId,
            'name': name.trim(),
            'created_by': userId,
            'updated_by': userId,
          })
          .select()
          .single();

      return Section.fromJson(response);
    } on PostgrestException catch (e) {
      AppLogger.error('Postgrest error creating section', e);
      throw DatabaseFailure(e.message, e.code, e.details);
    } catch (e, st) {
      AppLogger.error('Unexpected error creating section', e, st);
      throw DatabaseFailure('Failed to save section: $e');
    }
  }

  @override
  Future<Section> updateSection({
    required String id,
    required String name,
  }) async {
    try {
      final userId = _client.auth.currentUser?.id;
      final response = await _client
          .from(AppConstants.tableSections)
          .update({
            'name': name.trim(),
            'updated_by': userId,
          })
          .eq('id', id)
          .select()
          .single();

      return Section.fromJson(response);
    } on PostgrestException catch (e) {
      AppLogger.error('Postgrest error updating section $id', e);
      throw DatabaseFailure(e.message, e.code, e.details);
    } catch (e, st) {
      AppLogger.error('Unexpected error updating section $id', e, st);
      throw DatabaseFailure('Failed to update section: $e');
    }
  }

  @override
  Future<void> deleteSection(String id) async {
    try {
      await _client.from(AppConstants.tableSections).delete().eq('id', id);
    } on PostgrestException catch (e) {
      AppLogger.error('Postgrest error deleting section $id', e);
      throw DatabaseFailure(e.message, e.code, e.details);
    } catch (e, st) {
      AppLogger.error('Unexpected error deleting section $id', e, st);
      throw DatabaseFailure('Failed to delete section: $e');
    }
  }

  @override
  Stream<List<Section>> watchSections(String machineId) {
    return _client
        .from(AppConstants.tableSections)
        .stream(primaryKey: ['id'])
        .eq('machine_id', machineId)
        .order('name', ascending: true)
        .map((data) => data.map((item) => Section.fromJson(item)).toList());
  }
}

final sectionRepositoryProvider = Provider<SectionRepository>((ref) {
  final client = ref.watch(supabaseClientProvider);
  return SupabaseSectionRepository(client);
});

final sectionsStreamFamily = StreamProvider.family<List<Section>, String>((ref, machineId) {
  final repo = ref.watch(sectionRepositoryProvider);
  return repo.watchSections(machineId);
});
