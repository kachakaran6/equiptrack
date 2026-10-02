import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/errors/app_failure.dart';
import '../../../core/utils/app_logger.dart';
import '../../../data/repositories/auth_repository.dart';

class AuthStateData {
  final bool isLoading;
  final String? errorMessage;

  const AuthStateData({this.isLoading = false, this.errorMessage});

  AuthStateData copyWith({bool? isLoading, String? errorMessage}) {
    return AuthStateData(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

class AuthController extends Notifier<AuthStateData> {
  @override
  AuthStateData build() {
    return const AuthStateData();
  }

  Future<bool> signIn(String email, String password) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final repo = ref.read(authRepositoryProvider);
      await repo.signInWithEmailPassword(email, password);
      state = state.copyWith(isLoading: false, errorMessage: null);
      return true;
    } on AppFailure catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'An error occurred during sign in: $e',
      );
      return false;
    }
  }

  Future<void> signOut() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final repo = ref.read(authRepositoryProvider);
      await repo.signOut();
      state = state.copyWith(isLoading: false, errorMessage: null);
    } catch (e) {
      AppLogger.error('Logout error', e);
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Logout failed: $e',
      );
    }
  }

  void clearError() {
    state = state.copyWith(errorMessage: null);
  }
}

final authControllerProvider =
    NotifierProvider<AuthController, AuthStateData>(AuthController.new);
