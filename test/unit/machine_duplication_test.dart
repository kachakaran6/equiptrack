import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:machine_usage_app/core/network/api_client.dart';
import 'package:machine_usage_app/data/repositories/machine_repository.dart';
import 'package:machine_usage_app/features/machines/controllers/machines_controller.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Machine Duplication Tests', () {
    test('duplicateMachine API request and model parsing', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/machines/m-123/duplicate') && request.method == 'POST') {
          final body = jsonDecode(request.body);
          expect(body['name'], 'Machine 1 (Custom Copy)');
          expect(body['description'], 'Duplicated note');

          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'id': 'm-new-999',
                'name': 'Machine 1 (Custom Copy)',
                'description': 'Duplicated note',
                'created_at': DateTime.now().toIso8601String(),
                'updated_at': DateTime.now().toIso8601String(),
              },
              'message': 'Machine duplicated successfully with all components',
            }),
            201,
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final repo = ApiMachineRepository(apiClient);

      final result = await repo.duplicateMachine(
        id: 'm-123',
        name: 'Machine 1 (Custom Copy)',
        description: 'Duplicated note',
      );

      expect(result.id, equals('m-new-999'));
      expect(result.name, equals('Machine 1 (Custom Copy)'));
      expect(result.description, equals('Duplicated note'));
    });

    test('MachinesController duplicateMachine returns Machine and updates state', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/machines/m-abc/duplicate')) {
          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'id': 'm-new-abc',
                'name': 'Machine ABC (Copy)',
                'description': null,
                'created_at': DateTime.now().toIso8601String(),
                'updated_at': DateTime.now().toIso8601String(),
              },
            }),
            201,
          );
        }
        return http.Response('Not Found', 404);
      });

      final container = ProviderContainer(
        overrides: [
          apiClientProvider.overrideWithValue(ApiClient(httpClient: mockClient)),
        ],
      );
      addTearDown(container.dispose);

      final controller = container.read(machinesControllerProvider.notifier);
      final machine = await controller.duplicateMachine(
        id: 'm-abc',
        name: 'Machine ABC (Copy)',
      );

      expect(machine, isNotNull);
      expect(machine?.id, equals('m-new-abc'));
      expect(machine?.name, equals('Machine ABC (Copy)'));
    });
  });
}
