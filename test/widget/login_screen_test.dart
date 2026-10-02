import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/core/constants/app_keys.dart';
import 'package:machine_usage_app/core/theme/app_theme.dart';
import 'package:machine_usage_app/features/auth/screens/login_screen.dart';

void main() {
  group('LoginScreen Widget Tests', () {
    testWidgets('Renders all required login fields and buttons', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const LoginScreen(),
          ),
        ),
      );

      expect(find.byKey(const Key(AppKeys.emailField)), findsOneWidget);
      expect(find.byKey(const Key(AppKeys.passwordField)), findsOneWidget);
      expect(find.byKey(const Key(AppKeys.signInButton)), findsOneWidget);
      expect(find.textContaining('Email'), findsOneWidget);
      expect(find.textContaining('Password'), findsOneWidget);
      expect(find.text('Sign In'), findsOneWidget);
    });

    testWidgets('Validates required fields on empty submit', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const LoginScreen(),
          ),
        ),
      );

      await tester.tap(find.byKey(const Key(AppKeys.signInButton)));
      await tester.pumpAndSettle();

      expect(find.text('Email is required'), findsOneWidget);
    });
  });
}
