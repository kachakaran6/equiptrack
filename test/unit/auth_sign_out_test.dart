import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/core/router/app_router.dart';
import 'package:machine_usage_app/data/repositories/auth_repository.dart';
import 'package:machine_usage_app/features/auth/controllers/auth_controller.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class MockAuthRepository implements AuthRepository {
  bool signOutCalled = false;
  final StreamController<AuthState> _controller = StreamController<AuthState>.broadcast();

  @override
  User? get currentUser => null;

  @override
  bool get isAuthenticated => false;

  @override
  Stream<AuthState> get authStateChanges => _controller.stream;

  @override
  Future<void> signInWithEmailPassword(String email, String password) async {}

  @override
  Future<void> signOut() async {
    signOutCalled = true;
    _controller.add(AuthState(AuthChangeEvent.signedOut, null));
  }

  void dispose() {
    _controller.close();
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Sign Out & Auth Navigation Tests', () {
    test('AuthController signOut calls repository signOut and resets state', () async {
      final mockRepo = MockAuthRepository();
      final container = ProviderContainer(
        overrides: [
          authRepositoryProvider.overrideWithValue(mockRepo),
        ],
      );
      addTearDown(() {
        mockRepo.dispose();
        container.dispose();
      });

      final controller = container.read(authControllerProvider.notifier);
      await controller.signOut();

      expect(mockRepo.signOutCalled, isTrue);
      final state = container.read(authControllerProvider);
      expect(state.isLoading, isFalse);
      expect(state.errorMessage, isNull);
    });

    test('GoRouterRefreshStream notifies listeners when stream emits event', () async {
      final controller = StreamController<AuthState>.broadcast();
      addTearDown(controller.close);

      final refreshStream = GoRouterRefreshStream(controller.stream);
      addTearDown(refreshStream.dispose);

      var notified = false;
      refreshStream.addListener(() {
        notified = true;
      });

      controller.add(AuthState(AuthChangeEvent.signedOut, null));
      await Future<void>.delayed(Duration.zero);

      expect(notified, isTrue);
    });
  });
}
