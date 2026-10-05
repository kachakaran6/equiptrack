import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:machine_usage_app/core/network/api_client.dart';
import 'package:machine_usage_app/data/repositories/category_repository.dart';
import 'package:machine_usage_app/features/sections/controllers/categories_controller.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('CategoryRepository & CategoriesController Tests', () {
    test('getCategories lists categories from API', () async {
      final now = DateTime.now();
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/machines/m-1/categories') && request.method == 'GET') {
          return http.Response(
            jsonEncode({
              'success': true,
              'data': [
                {
                  'id': 'cat-1',
                  'machine_id': 'm-1',
                  'name': 'Bearings',
                  'created_at': now.toIso8601String(),
                  'updated_at': now.toIso8601String(),
                },
                {
                  'id': 'cat-2',
                  'machine_id': 'm-1',
                  'name': 'Motors',
                  'created_at': now.toIso8601String(),
                  'updated_at': now.toIso8601String(),
                },
              ],
            }),
            200,
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final repo = ApiCategoryRepository(apiClient);

      final categories = await repo.getCategories('m-1');
      expect(categories.length, 2);
      expect(categories[0].name, 'Bearings');
      expect(categories[1].name, 'Motors');
    });

    test('createCategory sends POST and returns Category', () async {
      final now = DateTime.now();
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/machines/m-1/categories') && request.method == 'POST') {
          final body = jsonDecode(request.body);
          expect(body['name'], 'Pumps');

          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'id': 'cat-3',
                'machine_id': 'm-1',
                'name': 'Pumps',
                'created_at': now.toIso8601String(),
                'updated_at': now.toIso8601String(),
              },
            }),
            201,
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final repo = ApiCategoryRepository(apiClient);

      final result = await repo.createCategory(machineId: 'm-1', name: 'Pumps');
      expect(result.id, 'cat-3');
      expect(result.name, 'Pumps');
    });

    test('updateCategory sends PATCH and returns updated Category', () async {
      final now = DateTime.now();
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/categories/cat-1') && request.method == 'PATCH') {
          final body = jsonDecode(request.body);
          expect(body['name'], 'High-Speed Bearings');

          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'id': 'cat-1',
                'machine_id': 'm-1',
                'name': 'High-Speed Bearings',
                'created_at': now.toIso8601String(),
                'updated_at': now.toIso8601String(),
              },
            }),
            200,
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final repo = ApiCategoryRepository(apiClient);

      final result = await repo.updateCategory(id: 'cat-1', name: 'High-Speed Bearings');
      expect(result.name, 'High-Speed Bearings');
    });

    test('deleteCategory sends DELETE request', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/categories/cat-1') && request.method == 'DELETE') {
          return http.Response(
            jsonEncode({
              'success': true,
              'message': 'Category deleted successfully',
            }),
            200,
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final repo = ApiCategoryRepository(apiClient);

      await expectLater(repo.deleteCategory('cat-1'), completes);
    });

    test('CategoriesController operations succeed and notify state', () async {
      final now = DateTime.now();
      final mockClient = MockClient((request) async {
        if (request.method == 'POST') {
          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'id': 'cat-new',
                'machine_id': 'm-1',
                'name': 'Sensors',
                'created_at': now.toIso8601String(),
                'updated_at': now.toIso8601String(),
              },
            }),
            201,
          );
        }
        if (request.method == 'DELETE') {
          return http.Response(
            jsonEncode({'success': true, 'message': 'Category deleted'}),
            200,
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient);
      final container = ProviderContainer(
        overrides: [
          apiClientProvider.overrideWithValue(apiClient),
        ],
      );

      final controller = container.read(categoriesControllerProvider.notifier);
      final created = await controller.createCategory(machineId: 'm-1', name: 'Sensors');
      expect(created, isNotNull);
      expect(created!.name, 'Sensors');

      final deleted = await controller.deleteCategory(id: 'cat-new', machineId: 'm-1');
      expect(deleted, isTrue);
    });
  });
}
