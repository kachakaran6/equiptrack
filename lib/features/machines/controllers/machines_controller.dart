import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/analytics/analytics_event.dart';
import '../../../core/analytics/analytics_service.dart';
import '../../../core/errors/app_failure.dart';
import '../../../core/utils/app_logger.dart';
import '../../../data/repositories/machine_repository.dart';
import '../../../models/machine.dart';

final singleMachineProvider =
    FutureProvider.family<Machine?, String>((ref, machineId) async {
  final repo = ref.watch(machineRepositoryProvider);
  return repo.getMachineById(machineId);
});

class SearchQueryNotifier extends Notifier<String> {
  @override
  String build() => '';

  void setQuery(String query) => state = query;
}

final searchQueryProvider =
    NotifierProvider<SearchQueryNotifier, String>(SearchQueryNotifier.new);

final filteredMachinesProvider = Provider<AsyncValue<List<Machine>>>((ref) {
  final machinesAsync = ref.watch(machinesStreamProvider);
  final query = ref.watch(searchQueryProvider).trim().toLowerCase();

  return machinesAsync.whenData((machines) {
    if (query.isEmpty) return machines;
    return machines.where((m) {
      final matchName = m.name.toLowerCase().contains(query);
      final matchDesc = m.description?.toLowerCase().contains(query) ?? false;
      return matchName || matchDesc;
    }).toList();
  });
});

class MachinesController extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<Machine?> createMachine({
    required String name,
    String? description,
  }) async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(machineRepositoryProvider);
      final machine = await repo.createMachine(
        name: name,
        description: description,
      );
      ref.invalidate(machinesStreamProvider);
      state = const AsyncValue.data(null);

      await AnalyticsService.instance.track(
        AnalyticsEvent.machineCreated,
        {'machine_id': machine.id},
      );
      return machine;
    } catch (e, st) {
      AppLogger.error('MachinesController: Failed to create machine', e, st);
      final failure = e is AppFailure ? e : DatabaseFailure('Failed to create machine: $e');
      state = AsyncValue.error(failure, st);
      return null;
    }
  }

  Future<Machine?> updateMachine({
    required String id,
    required String name,
    String? description,
  }) async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(machineRepositoryProvider);
      final machine = await repo.updateMachine(
        id: id,
        name: name,
        description: description,
      );
      ref.invalidate(machinesStreamProvider);
      state = const AsyncValue.data(null);

      await AnalyticsService.instance.track(
        AnalyticsEvent.machineUpdated,
        {'machine_id': machine.id},
      );
      return machine;
    } catch (e, st) {
      AppLogger.error('MachinesController: Failed to update machine', e, st);
      final failure = e is AppFailure ? e : DatabaseFailure('Failed to update machine: $e');
      state = AsyncValue.error(failure, st);
      return null;
    }
  }

  Future<Machine?> duplicateMachine({
    required String id,
    String? name,
    String? description,
  }) async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(machineRepositoryProvider);
      final machine = await repo.duplicateMachine(
        id: id,
        name: name,
        description: description,
      );
      ref.invalidate(machinesStreamProvider);
      state = const AsyncValue.data(null);

      await AnalyticsService.instance.track(
        AnalyticsEvent.machineCreated,
        {
          'machine_id': machine.id,
          'is_duplicate': true,
        },
      );
      return machine;
    } catch (e, st) {
      AppLogger.error('MachinesController: Failed to duplicate machine', e, st);
      final failure = e is AppFailure ? e : DatabaseFailure('Failed to duplicate machine: $e');
      state = AsyncValue.error(failure, st);
      return null;
    }
  }

  Future<bool> deleteMachine(String id) async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(machineRepositoryProvider);
      await repo.deleteMachine(id);
      ref.invalidate(machinesStreamProvider);
      state = const AsyncValue.data(null);

      await AnalyticsService.instance.track(
        AnalyticsEvent.machineDeleted,
        {'machine_id': id},
      );
      return true;
    } catch (e, st) {
      AppLogger.error('MachinesController: Failed to delete machine', e, st);
      final failure = e is AppFailure ? e : DatabaseFailure('Failed to delete machine: $e');
      state = AsyncValue.error(failure, st);
      return false;
    }
  }
}


final machinesControllerProvider =
    AsyncNotifierProvider<MachinesController, void>(MachinesController.new);
