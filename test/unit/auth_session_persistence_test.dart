import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:machine_usage_app/core/network/api_client.dart';
import 'package:machine_usage_app/data/repositories/auth_repository.dart';

class MockStorage extends Fake implements FlutterSecureStorage {
  final Map<String, String> _data = {};

  @override
  Future<void> write({
    required String key,
    required String? value,
    AndroidOptions? aOptions,
    AppleOptions? iOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    AppleOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    if (value != null) {
      _data[key] = value;
    } else {
      _data.remove(key);
    }
  }

  @override
  Future<String?> read({
    required String key,
    AndroidOptions? aOptions,
    AppleOptions? iOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    AppleOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    return _data[key];
  }

  @override
  Future<void> delete({
    required String key,
    AndroidOptions? aOptions,
    AppleOptions? iOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    AppleOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    _data.remove(key);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  // Helper to generate a dummy JWT with payload { id, email }
  String createDummyJwt(String id, String email) {
    final header = base64Url.encode(utf8.encode(jsonEncode({'alg': 'HS256', 'typ': 'JWT'}))).replaceAll('=', '');
    final payload = base64Url.encode(utf8.encode(jsonEncode({'id': id, 'email': email}))).replaceAll('=', '');
    const sig = 'dummy_sig';
    return '$header.$payload.$sig';
  }

  group('Auth Session Persistence & Auto-Login Tests', () {
    late MockStorage mockStorage;

    setUp(() {
      mockStorage = MockStorage();
    });

    test('initSession does nothing if no token exists in storage', () async {
      final mockClient = MockClient((request) async {
        return http.Response('{"message": "should not be called"}', 500);
      });

      final apiClient = ApiClient(httpClient: mockClient, storage: mockStorage);
      final repo = ApiAuthRepository(apiClient);

      await repo.initSession();

      expect(repo.isAuthenticated, isFalse);
      expect(repo.currentUser, isNull);
    });

    test('initSession restores session immediately from cached user & token and verifies with /auth/me', () async {
      final token = createDummyJwt('user-123', 'karan@gmail.com');
      await mockStorage.write(key: 'equiptrack_jwt_token', value: token);
      await mockStorage.write(
        key: 'equiptrack_user_data',
        value: jsonEncode({'id': 'user-123', 'email': 'karan@gmail.com'}),
      );

      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/auth/me')) {
          expect(request.headers['authorization'], 'Bearer $token');
          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'user': {'id': 'user-123', 'email': 'karan@gmail.com'}
              }
            }),
            200,
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient, storage: mockStorage);
      final repo = ApiAuthRepository(apiClient);

      await repo.initSession();

      expect(repo.isAuthenticated, isTrue);
      expect(repo.currentUser?.id, equals('user-123'));
      expect(repo.currentUser?.email, equals('karan@gmail.com'));
    });

    test('initSession decodes user from JWT if only token is present', () async {
      final token = createDummyJwt('user-456', 'aayush@gmail.com');
      await mockStorage.write(key: 'equiptrack_jwt_token', value: token);

      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/auth/me')) {
          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'user': {'id': 'user-456', 'email': 'aayush@gmail.com'}
              }
            }),
            200,
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient, storage: mockStorage);
      final repo = ApiAuthRepository(apiClient);

      await repo.initSession();

      expect(repo.isAuthenticated, isTrue);
      expect(repo.currentUser?.id, equals('user-456'));
      expect(repo.currentUser?.email, equals('aayush@gmail.com'));
    });

    test('initSession clears storage and logs out if server returns 401 Unauthorized', () async {
      final token = createDummyJwt('user-789', 'expired@gmail.com');
      await mockStorage.write(key: 'equiptrack_jwt_token', value: token);

      final mockClient = MockClient((request) async {
        if (request.url.path.endsWith('/auth/me')) {
          return http.Response(
            jsonEncode({'success': false, 'message': 'Token expired'}),
            401,
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(httpClient: mockClient, storage: mockStorage);
      final repo = ApiAuthRepository(apiClient);

      await repo.initSession();

      expect(repo.isAuthenticated, isFalse);
      expect(repo.currentUser, isNull);
      expect(await mockStorage.read(key: 'equiptrack_jwt_token'), isNull);
    });

    test('initSession preserves session when server is offline or unreachable', () async {
      final token = createDummyJwt('user-999', 'offline@gmail.com');
      await mockStorage.write(key: 'equiptrack_jwt_token', value: token);
      await mockStorage.write(
        key: 'equiptrack_user_data',
        value: jsonEncode({'id': 'user-999', 'email': 'offline@gmail.com'}),
      );

      final mockClient = MockClient((request) async {
        throw Exception('Network unreachable');
      });

      final apiClient = ApiClient(httpClient: mockClient, storage: mockStorage);
      final repo = ApiAuthRepository(apiClient);

      await repo.initSession();

      // Should still be authenticated using cached session
      expect(repo.isAuthenticated, isTrue);
      expect(repo.currentUser?.email, equals('offline@gmail.com'));
      expect(await mockStorage.read(key: 'equiptrack_jwt_token'), equals(token));
    });
  });
}
