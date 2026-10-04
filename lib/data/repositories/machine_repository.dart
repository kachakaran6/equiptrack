import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/errors/app_failure.dart';
import '../../core/network/api_client.dart';
import '../../core/utils/app_logger.dart';
import '../../models/machine.dart';

abstract class MachineRepository {
  Future<List<Machine>> getMachines();
  Future<Machine?> getMachineById(String id);
  Future<Machine> createMachine({required String name, String? description});
  Future<Machine> updateMachine({required String id, required String name, String? description});
  Future<Machine> duplicateMachine({required String id, String? name, String? description});
  Future<void> deleteMachine(String id);
}

class ApiMachineRepository implements MachineRepository {
  final ApiClient _apiClient;

  ApiMachineRepository(this._apiClient);

  @override
  Future<List<Machine>> getMachines() async {
    try {
      final data = await _apiClient.get('/machines');
      if (data is List) {
        return data
            .map((item) => Machine.fromJson(Map<String, dynamic>.from(item as Map)))
            .toList();
      }
      return [];
    } catch (e, st) {
      AppLogger.error('Error fetching machines via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Unable to load machines: $e');
    }
  }

  @override
  Future<Machine?> getMachineById(String id) async {
    try {
      final data = await _apiClient.get('/machines/$id');
      if (data is Map) {
        return Machine.fromJson(Map<String, dynamic>.from(data));
      }
      return null;
    } catch (e, st) {
      AppLogger.error('Error fetching machine $id via API', e, st);
      if (e is DatabaseFailure && e.code == '404') {
        return null;
      }
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Unable to load machine details: $e');
    }
  }

  @override
  Future<Machine> createMachine({
    required String name,
    String? description,
  }) async {
    try {
      final data = await _apiClient.post(
        '/machines',
        body: {
          'name': name.trim(),
          'description': description?.trim().isEmpty == true ? null : description?.trim(),
        },
      );

      return Machine.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e, st) {
      AppLogger.error('Error creating machine via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to save new machine: $e');
    }
  }

  @override
  Future<Machine> updateMachine({
    required String id,
    required String name,
    String? description,
  }) async {
    try {
      final data = await _apiClient.patch(
        '/machines/$id',
        body: {
          'name': name.trim(),
          'description': description?.trim().isEmpty == true ? null : description?.trim(),
        },
      );

      return Machine.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e, st) {
      AppLogger.error('Error updating machine $id via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to update machine: $e');
    }
  }

  @override
  Future<Machine> duplicateMachine({
    required String id,
    String? name,
    String? description,
  }) async {
    try {
      final data = await _apiClient.post(
        '/machines/$id/duplicate',
        body: {
          if (name != null && name.trim().isNotEmpty) 'name': name.trim(),
          if (description != null) 'description': description.trim().isEmpty ? null : description.trim(),
        },
      );

      return Machine.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e, st) {
      AppLogger.error('Error duplicating machine $id via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to duplicate machine: $e');
    }
  }

  @override
  Future<void> deleteMachine(String id) async {
    try {
      await _apiClient.delete('/machines/$id');
    } catch (e, st) {
      AppLogger.error('Error deleting machine $id via API', e, st);
      if (e is AppFailure) rethrow;
      throw DatabaseFailure('Failed to delete machine: $e');
    }
  }
}


final machineRepositoryProvider = Provider<MachineRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return ApiMachineRepository(apiClient);
});

final machinesStreamProvider = FutureProvider<List<Machine>>((ref) async {
  final repo = ref.watch(machineRepositoryProvider);
  return repo.getMachines();
});
