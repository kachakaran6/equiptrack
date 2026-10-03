import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/errors/app_failure.dart';
import '../../core/utils/app_logger.dart';
import '../datasources/supabase_client_provider.dart';

abstract class AuthRepository {
  User? get currentUser;
  bool get isAuthenticated;
  Stream<AuthState> get authStateChanges;
  Future<void> signInWithEmailPassword(String email, String password);
  Future<void> signOut();
}

class SupabaseAuthRepository implements AuthRepository {
  final SupabaseClient _client;

  SupabaseAuthRepository(this._client);

  @override
  User? get currentUser => _client.auth.currentUser;

  @override
  bool get isAuthenticated => _client.auth.currentSession != null;

  @override
  Stream<AuthState> get authStateChanges => _client.auth.onAuthStateChange;

  @override
  Future<void> signInWithEmailPassword(String email, String password) async {
    try {
      AppLogger.info('Attempting sign in for: $email');
      final response = await _client.auth.signInWithPassword(
        email: email.trim(),
        password: password,
      );

      if (response.user == null) {
        throw const AuthenticationFailure('Sign in failed: User not found.');
      }
    } on AuthException catch (e) {
      AppLogger.warning('AuthException during sign in', e);
      throw AuthenticationFailure(e.message, e.statusCode);
    } catch (e, st) {
      AppLogger.error('Unexpected error during sign in', e, st);
      if (e is AppFailure) rethrow;
      throw UnknownFailure('Sign in failed: $e');
    }
  }

  @override
  Future<void> signOut() async {
    try {
      AppLogger.info('Signing out user: ${currentUser?.email}');
      await _client.auth.signOut(scope: SignOutScope.local);
    } catch (e) {
      AppLogger.warning('Remote sign out encountered an error, forcing local session clear: $e');
      try {
        await _client.auth.signOut();
      } catch (_) {}
    }
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final client = ref.watch(supabaseClientProvider);
  return SupabaseAuthRepository(client);
});

final authStateStreamProvider = StreamProvider<AuthState>((ref) {
  final authRepo = ref.watch(authRepositoryProvider);
  return authRepo.authStateChanges;
});

final currentUserProvider = Provider<User?>((ref) {
  final authRepo = ref.watch(authRepositoryProvider);
  ref.watch(authStateStreamProvider);
  return authRepo.currentUser;
});
