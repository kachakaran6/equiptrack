import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/constants/app_constants.dart';
import '../../core/errors/app_failure.dart';
import '../../core/utils/app_logger.dart';
import '../../models/machine.dart';
import '../datasources/supabase_client_provider.dart';

abstract class MachineRepository {
  Future<List<Machine>> getMachines();
  Future<Machine?> getMachineById(String id);
  Future<Machine> createMachine({required String name, String? description});
  Future<Machine> updateMachine({required String id, required String name, String? description});
  Future<void> deleteMachine(String id);
  Stream<List<Machine>> watchMachines();
}

class SupabaseMachineRepository implements MachineRepository {
  final SupabaseClient _client;

  SupabaseMachineRepository(this._client);

  @override
  Future<List<Machine>> getMachines() async {
    try {
      final data = await _client
          .from(AppConstants.tableMachines)
          .select()
          .order('name', ascending: true);

      return (data as List).map((item) => Machine.fromJson(item)).toList();
    } on PostgrestException catch (e) {
      AppLogger.error('Postgrest error fetching machines', e);
      throw DatabaseFailure(e.message, e.code, e.details);
    } catch (e, st) {
      AppLogger.error('Unexpected error fetching machines', e, st);
      throw DatabaseFailure('Unable to load machines: $e');
    }
  }

  @override
  Future<Machine?> getMachineById(String id) async {
    try {
      final data = await _client
          .from(AppConstants.tableMachines)
          .select()
          .eq('id', id)
          .maybeSingle();

      if (data == null) return null;
      return Machine.fromJson(data);
    } on PostgrestException catch (e) {
      AppLogger.error('Postgrest error fetching machine $id', e);
      throw DatabaseFailure(e.message, e.code, e.details);
    } catch (e, st) {
      AppLogger.error('Unexpected error fetching machine $id', e, st);
      throw DatabaseFailure('Unable to load machine details: $e');
    }
  }

  @override
  Future<Machine> createMachine({
    required String name,
    String? description,
  }) async {
    try {
      final userId = _client.auth.currentUser?.id;
      final response = await _client
          .from(AppConstants.tableMachines)
          .insert({
            'name': name.trim(),
            'description': description?.trim().isEmpty == true ? null : description?.trim(),
            'created_by': userId,
            'updated_by': userId,
          })
          .select()
          .single();

      return Machine.fromJson(response);
    } on PostgrestException catch (e) {
      AppLogger.error('Postgrest error creating machine', e);
      throw DatabaseFailure(e.message, e.code, e.details);
    } catch (e, st) {
      AppLogger.error('Unexpected error creating machine', e, st);
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
      final userId = _client.auth.currentUser?.id;
      final response = await _client
          .from(AppConstants.tableMachines)
          .update({
            'name': name.trim(),
            'description': description?.trim().isEmpty == true ? null : description?.trim(),
            'updated_by': userId,
          })
          .eq('id', id)
          .select()
          .single();

      return Machine.fromJson(response);
    } on PostgrestException catch (e) {
      AppLogger.error('Postgrest error updating machine $id', e);
      throw DatabaseFailure(e.message, e.code, e.details);
    } catch (e, st) {
      AppLogger.error('Unexpected error updating machine $id', e, st);
      throw DatabaseFailure('Failed to update machine: $e');
    }
  }

  @override
  Future<void> deleteMachine(String id) async {
    try {
      await _client.from(AppConstants.tableMachines).delete().eq('id', id);
    } on PostgrestException catch (e) {
      AppLogger.error('Postgrest error deleting machine $id', e);
      throw DatabaseFailure(e.message, e.code, e.details);
    } catch (e, st) {
      AppLogger.error('Unexpected error deleting machine $id', e, st);
      throw DatabaseFailure('Failed to delete machine: $e');
    }
  }

  @override
  Stream<List<Machine>> watchMachines() {
    return _client
        .from(AppConstants.tableMachines)
        .stream(primaryKey: ['id'])
        .order('name', ascending: true)
        .map((data) {
          final items = data.map((item) => Machine.fromJson(item)).toList();
          final seen = <String>{};
          return items.where((item) => seen.add(item.id)).toList();
        });
  }
}

final machineRepositoryProvider = Provider<MachineRepository>((ref) {
  final client = ref.watch(supabaseClientProvider);
  return SupabaseMachineRepository(client);
});

final machinesStreamProvider = StreamProvider<List<Machine>>((ref) {
  final repo = ref.watch(machineRepositoryProvider);
  return repo.watchMachines();
});
