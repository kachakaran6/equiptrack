import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/errors/app_failure.dart';
import '../../core/network/api_client.dart';
import '../../core/utils/app_logger.dart';
import '../../models/section.dart';

abstract class SectionRepository {
  Future<List<Section>> getSections(String machineId);
  Future<Section?> getSectionById(String id);
  Future<Section> createSection({
    required String machineId,
    required String name,
    String? categoryId,
  });
  Future<Section> updateSection({
    required String id,
    String? name,
    String? categoryId,
    bool clearCategory = false,
  });
  Future<void> deleteSection(String id);
}

class ApiSectionRepository implements SectionRepository {
  final ApiClient _apiClient;

  ApiSectionRepository(this._apiClient);

  @override
  Future<List<Section>> getSections(String machineId) async {
    try {
      final data = await _apiClient.get('/machines/$machineId/sections');
      if (data is List) {
        return data
            .map((item) => Section.fromJson(Map<String, dynamic>.from(item as Map)))
            .toList();
      }
      return [];
    } catch (e, st) {
      AppLogger.error('Error fetching sections for machine $machineId via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Unable to load sections: $e');
    }
  }

  @override
  Future<Section?> getSectionById(String id) async {
    try {
      final data = await _apiClient.get('/sections/$id');
      if (data is Map) {
        return Section.fromJson(Map<String, dynamic>.from(data));
      }
      return null;
    } catch (e, st) {
      AppLogger.error('Error fetching section $id via API', e, st);
      if (e is DatabaseFailure && e.code == '404') {
        return null;
      }
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Unable to load section details: $e');
    }
  }

  @override
  Future<Section> createSection({
    required String machineId,
    required String name,
    String? categoryId,
  }) async {
    try {
      final body = <String, dynamic>{
        'name': name.trim(),
      };
      if (categoryId != null && categoryId.isNotEmpty) {
        body['category_id'] = categoryId;
      }

      final data = await _apiClient.post(
        '/machines/$machineId/sections',
        body: body,
      );

      return Section.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e, st) {
      AppLogger.error('Error creating section via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to save section: $e');
    }
  }

  @override
  Future<Section> updateSection({
    required String id,
    String? name,
    String? categoryId,
    bool clearCategory = false,
  }) async {
    try {
      final body = <String, dynamic>{};
      if (name != null) {
        body['name'] = name.trim();
      }
      if (clearCategory) {
        body['category_id'] = null;
      } else if (categoryId != null) {
        body['category_id'] = categoryId;
      }

      final data = await _apiClient.patch(
        '/sections/$id',
        body: body,
      );

      return Section.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e, st) {
      AppLogger.error('Error updating section $id via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to update section: $e');
    }
  }

  @override
  Future<void> deleteSection(String id) async {
    try {
      await _apiClient.delete('/sections/$id');
    } on AppFailure catch (e) {
      if (e.code == '404' ||
          e.message.toLowerCase().contains('not found') ||
          e.message.toLowerCase().contains('does not exist')) {
        return; // Already deleted on backend
      }
      rethrow;
    } catch (e, st) {
      AppLogger.error('Error deleting section $id via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to delete section: $e');
    }
  }
}

final sectionRepositoryProvider = Provider<SectionRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return ApiSectionRepository(apiClient);
});

final sectionsStreamFamily = FutureProvider.family<List<Section>, String>((ref, machineId) async {
  final repo = ref.watch(sectionRepositoryProvider);
  return repo.getSections(machineId);
});
