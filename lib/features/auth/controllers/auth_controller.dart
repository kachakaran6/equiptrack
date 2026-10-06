import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/analytics/analytics_event.dart';
import '../../../core/analytics/analytics_service.dart';
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
    final stopwatch = Stopwatch()..start();
    await AnalyticsService.instance.track(AnalyticsEvent.loginStarted);

    try {
      final repo = ref.read(authRepositoryProvider);
      await repo.signInWithEmailPassword(email, password);
      final user = repo.currentUser;

      if (user != null) {
        await AnalyticsService.instance.identifyUser(user);
      }

      await AnalyticsService.instance.track(
        AnalyticsEvent.loginCompleted,
        {'duration_ms': stopwatch.elapsedMilliseconds},
      );
      state = state.copyWith(isLoading: false, errorMessage: null);
      return true;
    } on AppFailure catch (e) {
      await AnalyticsService.instance.track(
        AnalyticsEvent.loginFailed,
        {
          'reason': 'app_failure',
          'error_code': e.code,
          'duration_ms': stopwatch.elapsedMilliseconds,
        },
      );
      state = state.copyWith(isLoading: false, errorMessage: e.message);
      return false;
    } catch (e) {
      await AnalyticsService.instance.track(
        AnalyticsEvent.loginFailed,
        {
          'reason': 'unexpected_error',
          'duration_ms': stopwatch.elapsedMilliseconds,
        },
      );
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
      await AnalyticsService.instance.track(AnalyticsEvent.logoutCompleted);
      await AnalyticsService.instance.reset();
    } catch (e) {
      AppLogger.error('Logout error', e);
    } finally {
      ref.invalidate(currentUserProvider);
      ref.invalidate(authStateStreamProvider);
      state = const AuthStateData();
    }
  }

  void clearError() {
    state = state.copyWith(errorMessage: null);
  }
}

final authControllerProvider =
    NotifierProvider<AuthController, AuthStateData>(AuthController.new);
