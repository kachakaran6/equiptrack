import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import '../errors/app_failure.dart';
import '../utils/app_logger.dart';
import '../../models/app_user.dart';

class ApiClient {
  final http.Client _httpClient;
  final FlutterSecureStorage _storage;
  String? _cachedToken;

  AppUser? _cachedUser;

  static const String _tokenKey = 'equiptrack_jwt_token';
  static const String _userKey = 'equiptrack_user_data';

  ApiClient({
    http.Client? httpClient,
    FlutterSecureStorage? storage,
  })  : _httpClient = httpClient ?? http.Client(),
        _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(resetOnError: true),
              iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
            );

  String get baseUrl {
    try {
      if (dotenv.isInitialized) {
        final envUrl = dotenv.env['API_BASE_URL'];
        if (envUrl != null && envUrl.trim().isNotEmpty) {
          return envUrl.trim();
        }
      }
    } catch (_) {}

    if (!kIsWeb && Platform.isAndroid) {
      // 10.0.2.2 is Android emulator host loopback
      return 'http://10.0.2.2:3000/api';
    }
    return 'http://localhost:3000/api';
  }

  Future<void> saveToken(String token) async {
    _cachedToken = token;
    try {
      await _storage.write(key: _tokenKey, value: token);
    } catch (e) {
      AppLogger.warning('Could not persist token to secure storage: $e');
    }
  }

  Future<String?> getToken() async {
    if (_cachedToken != null) return _cachedToken;
    try {
      _cachedToken = await _storage.read(key: _tokenKey);
    } catch (e) {
      AppLogger.warning('Could not read token from secure storage: $e');
    }
    return _cachedToken;
  }

  Future<void> saveUser(AppUser user) async {
    _cachedUser = user;
    try {
      await _storage.write(key: _userKey, value: jsonEncode(user.toJson()));
    } catch (e) {
      AppLogger.warning('Could not persist user to secure storage: $e');
    }
  }

  Future<AppUser?> getUser() async {
    if (_cachedUser != null) return _cachedUser;
    try {
      final userJson = await _storage.read(key: _userKey);
      if (userJson != null && userJson.isNotEmpty) {
        final map = jsonDecode(userJson);
        if (map is Map<String, dynamic>) {
          _cachedUser = AppUser.fromJson(map);
        } else if (map is Map) {
          _cachedUser = AppUser.fromJson(Map<String, dynamic>.from(map));
        }
      }
    } catch (e) {
      AppLogger.warning('Could not read user from secure storage: $e');
    }
    return _cachedUser;
  }

  Future<void> clearAuth() async {
    _cachedToken = null;
    _cachedUser = null;
    try {
      await _storage.delete(key: _tokenKey);
      await _storage.delete(key: _userKey);
    } catch (e) {
      AppLogger.warning('Could not clear auth from secure storage: $e');
    }
  }

  Future<void> clearToken() async => clearAuth();

  Future<Map<String, String>> _headers({bool requiresAuth = true, bool hasBody = true}) async {
    final headers = <String, String>{
      'Accept': 'application/json',
    };

    if (hasBody) {
      headers['Content-Type'] = 'application/json';
    }

    if (requiresAuth) {
      final token = await getToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }

    return headers;
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? queryParameters, bool requiresAuth = true}) async {
    final uri = _buildUri(path, queryParameters);
    try {
      final headers = await _headers(requiresAuth: requiresAuth, hasBody: false);
      final response = await _httpClient.get(uri, headers: headers).timeout(const Duration(seconds: 15));
      return _handleResponse(response);
    } on SocketException catch (e) {
      throw NetworkFailure('Cannot connect to server: ${e.message}');
    } on TimeoutException {
      throw const NetworkFailure('Request timed out. Please check your connection.');
    } catch (e) {
      if (e is AppFailure) rethrow;
      throw UnknownFailure('API request failed: $e');
    }
  }

  Future<dynamic> post(String path, {Map<String, dynamic>? body, bool requiresAuth = true}) async {
    final uri = _buildUri(path);
    try {
      final headers = await _headers(requiresAuth: requiresAuth, hasBody: body != null);
      final response = await _httpClient
          .post(uri, headers: headers, body: body != null ? jsonEncode(body) : null)
          .timeout(const Duration(seconds: 15));
      return _handleResponse(response);
    } on SocketException catch (e) {
      throw NetworkFailure('Cannot connect to server: ${e.message}');
    } on TimeoutException {
      throw const NetworkFailure('Request timed out. Please check your connection.');
    } catch (e) {
      if (e is AppFailure) rethrow;
      throw UnknownFailure('API request failed: $e');
    }
  }

  Future<dynamic> patch(String path, {Map<String, dynamic>? body, bool requiresAuth = true}) async {
    final uri = _buildUri(path);
    try {
      final headers = await _headers(requiresAuth: requiresAuth, hasBody: body != null);
      final response = await _httpClient
          .patch(uri, headers: headers, body: body != null ? jsonEncode(body) : null)
          .timeout(const Duration(seconds: 15));
      return _handleResponse(response);
    } on SocketException catch (e) {
      throw NetworkFailure('Cannot connect to server: ${e.message}');
    } on TimeoutException {
      throw const NetworkFailure('Request timed out. Please check your connection.');
    } catch (e) {
      if (e is AppFailure) rethrow;
      throw UnknownFailure('API request failed: $e');
    }
  }

  Future<dynamic> delete(String path, {bool requiresAuth = true}) async {
    final uri = _buildUri(path);
    try {
      final headers = await _headers(requiresAuth: requiresAuth, hasBody: false);
      final response = await _httpClient.delete(uri, headers: headers).timeout(const Duration(seconds: 15));
      return _handleResponse(response);
    } on SocketException catch (e) {
      throw NetworkFailure('Cannot connect to server: ${e.message}');
    } on TimeoutException {
      throw const NetworkFailure('Request timed out. Please check your connection.');
    } catch (e) {
      if (e is AppFailure) rethrow;
      throw UnknownFailure('API request failed: $e');
    }
  }

  Uri _buildUri(String path, [Map<String, dynamic>? queryParameters]) {
    final cleanPath = path.startsWith('/') ? path : '/$path';
    final fullUrl = '$baseUrl$cleanPath';
    final uri = Uri.parse(fullUrl);

    if (queryParameters != null && queryParameters.isNotEmpty) {
      final stringParams = queryParameters.map((k, v) => MapEntry(k, v?.toString() ?? ''));
      return uri.replace(queryParameters: stringParams);
    }

    return uri;
  }

  dynamic _handleResponse(http.Response response) {
    dynamic decoded;
    try {
      if (response.body.isNotEmpty) {
        decoded = jsonDecode(response.body);
      }
    } catch (_) {
      decoded = null;
    }

    final message = (decoded is Map && decoded['message'] != null)
        ? decoded['message'].toString()
        : 'Request failed with status ${response.statusCode}';

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (decoded is Map && decoded.containsKey('data')) {
        return decoded['data'];
      }
      return decoded;
    }

    if (response.statusCode == 401) {
      throw AuthenticationFailure(message, response.statusCode.toString());
    }

    if (response.statusCode == 400 || response.statusCode == 422) {
      throw ValidationFailure(message);
    }

    if (response.statusCode == 404) {
      throw DatabaseFailure(message, '404');
    }

    if (response.statusCode == 409) {
      throw DatabaseFailure(message, '409');
    }

    throw DatabaseFailure(message, response.statusCode.toString());
  }
}

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient();
});
