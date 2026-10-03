import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/core/theme/theme_controller.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ThemeController Tests', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    test('Initial theme mode is ThemeMode.system', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final mode = container.read(themeControllerProvider);
      expect(mode, equals(ThemeMode.system));
    });

    test('setThemeMode updates state and persists value', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final controller = container.read(themeControllerProvider.notifier);
      await controller.setThemeMode(ThemeMode.dark);

      expect(container.read(themeControllerProvider), equals(ThemeMode.dark));

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('app_theme_mode_preference'), equals('dark'));
    });

    test('toggleTheme switches from light to dark and vice versa', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final controller = container.read(themeControllerProvider.notifier);

      // Light -> Dark
      await controller.setThemeMode(ThemeMode.light);
      await controller.toggleTheme(platformBrightness: Brightness.light);
      expect(container.read(themeControllerProvider), equals(ThemeMode.dark));

      // Dark -> Light
      await controller.toggleTheme(platformBrightness: Brightness.dark);
      expect(container.read(themeControllerProvider), equals(ThemeMode.light));
    });

    test('toggleTheme correctly evaluates ThemeMode.system against platformBrightness', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final controller = container.read(themeControllerProvider.notifier);

      // If system is light, toggling switches to dark
      await controller.setThemeMode(ThemeMode.system);
      await controller.toggleTheme(platformBrightness: Brightness.light);
      expect(container.read(themeControllerProvider), equals(ThemeMode.dark));

      // Reset to system
      await controller.setThemeMode(ThemeMode.system);
      // If system is dark, toggling switches to light
      await controller.toggleTheme(platformBrightness: Brightness.dark);
      expect(container.read(themeControllerProvider), equals(ThemeMode.light));
    });
  });
}
