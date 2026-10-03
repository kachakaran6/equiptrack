import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/core/theme/theme_controller.dart';
import 'package:machine_usage_app/core/widgets/theme_toggle_button.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ThemeToggleButton Widget Tests', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    testWidgets('ThemeToggleButton renders icon and toggles theme on tap', (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            home: Scaffold(
              body: ThemeToggleButton(),
            ),
          ),
        ),
      );

      expect(find.byType(IconButton), findsOneWidget);
      expect(container.read(themeControllerProvider), equals(ThemeMode.system));

      // Tap to toggle
      await tester.tap(find.byType(IconButton));
      await tester.pumpAndSettle();

      // System (Light) toggled to Dark
      expect(container.read(themeControllerProvider), equals(ThemeMode.dark));

      // Tap again to toggle to Light
      await tester.tap(find.byType(IconButton));
      await tester.pumpAndSettle();

      expect(container.read(themeControllerProvider), equals(ThemeMode.light));
    });

    testWidgets('ThemeToggleButton with showLabel renders text button', (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            home: Scaffold(
              body: ThemeToggleButton(showLabel: true),
            ),
          ),
        ),
      );

      expect(find.byType(TextButton), findsOneWidget);
    });
  });
}
