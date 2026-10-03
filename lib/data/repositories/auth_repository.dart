import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/errors/app_failure.dart';
import '../../core/network/api_client.dart';
import '../../core/utils/app_logger.dart';
import '../../models/app_user.dart';

abstract class AuthRepository {
  AppUser? get currentUser;
  bool get isAuthenticated;
  Stream<bool> get authStateChanges;
  Future<void> initSession();
  Future<void> signInWithEmailPassword(String email, String password);
  Future<void> registerWithEmailPassword(String email, String password);
  Future<void> signOut();
}

class ApiAuthRepository implements AuthRepository {
  final ApiClient _apiClient;
  final _authStateController = StreamController<bool>.broadcast();
  AppUser? _currentUser;

  ApiAuthRepository(this._apiClient);

  @override
  AppUser? get currentUser => _currentUser;

  @override
  bool get isAuthenticated => _currentUser != null;

  @override
  Stream<bool> get authStateChanges => _authStateController.stream;

  @override
  Future<void> initSession() async {
    try {
      final token = await _apiClient.getToken();
      if (token == null || token.isEmpty) {
        _currentUser = null;
        _authStateController.add(false);
        return;
      }

      final data = await _apiClient.get('/auth/me');
      if (data is Map && data['user'] != null) {
        _currentUser = AppUser.fromJson(Map<String, dynamic>.from(data['user'] as Map));
        _authStateController.add(true);
      } else {
        await _apiClient.clearToken();
        _currentUser = null;
        _authStateController.add(false);
      }
    } catch (e) {
      AppLogger.warning('Session check failed or expired: $e');
      await _apiClient.clearToken();
      _currentUser = null;
      _authStateController.add(false);
    }
  }

  @override
  Future<void> signInWithEmailPassword(String email, String password) async {
    try {
      AppLogger.info('Attempting sign in via API for: $email');
      final data = await _apiClient.post(
        '/auth/login',
        body: {
          'email': email.trim(),
          'password': password,
        },
        requiresAuth: false,
      );

      if (data is Map && data['token'] != null && data['user'] != null) {
        final token = data['token'] as String;
        await _apiClient.saveToken(token);
        _currentUser = AppUser.fromJson(Map<String, dynamic>.from(data['user'] as Map));
        _authStateController.add(true);
        AppLogger.info('Sign in successful for user: ${_currentUser?.email}');
      } else {
        throw const AuthenticationFailure('Invalid response from authentication server.');
      }
    } catch (e, st) {
      AppLogger.error('Error during sign in', e, st);
      if (e is AppFailure) rethrow;
      throw UnknownFailure('Sign in failed: $e');
    }
  }

  @override
  Future<void> registerWithEmailPassword(String email, String password) async {
    try {
      AppLogger.info('Attempting registration via API for: $email');
      final data = await _apiClient.post(
        '/auth/register',
        body: {
          'email': email.trim(),
          'password': password,
        },
        requiresAuth: false,
      );

      if (data is Map && data['token'] != null && data['user'] != null) {
        final token = data['token'] as String;
        await _apiClient.saveToken(token);
        _currentUser = AppUser.fromJson(Map<String, dynamic>.from(data['user'] as Map));
        _authStateController.add(true);
      } else {
        throw const AuthenticationFailure('Registration failed: Invalid response format');
      }
    } catch (e, st) {
      AppLogger.error('Error during registration', e, st);
      if (e is AppFailure) rethrow;
      throw UnknownFailure('Registration failed: $e');
    }
  }

  @override
  Future<void> signOut() async {
    try {
      AppLogger.info('Signing out user: ${_currentUser?.email}');
      try {
        await _apiClient.post('/auth/logout');
      } catch (_) {}
      await _apiClient.clearToken();
    } finally {
      _currentUser = null;
      _authStateController.add(false);
    }
  }

  void dispose() {
    _authStateController.close();
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final repo = ApiAuthRepository(apiClient);
  ref.onDispose(repo.dispose);
  return repo;
});

final authStateStreamProvider = StreamProvider<bool>((ref) {
  final authRepo = ref.watch(authRepositoryProvider);
  return authRepo.authStateChanges;
});

final currentUserProvider = Provider<AppUser?>((ref) {
  final authRepo = ref.watch(authRepositoryProvider);
  ref.watch(authStateStreamProvider);
  return authRepo.currentUser;
});
