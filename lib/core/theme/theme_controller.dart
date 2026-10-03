import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/app_logger.dart';

const String _themeModeKey = 'app_theme_mode_preference';

/// Notifier for application ThemeMode persistence and switching
class ThemeController extends Notifier<ThemeMode> {
  @override
  ThemeMode build() {
    _loadPersistedTheme();
    return ThemeMode.system;
  }

  Future<void> _loadPersistedTheme() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedMode = prefs.getString(_themeModeKey);
      if (savedMode != null) {
        final mode = ThemeMode.values.firstWhere(
          (m) => m.name == savedMode,
          orElse: () => ThemeMode.system,
        );
        state = mode;
      }
    } catch (e) {
      AppLogger.warning('Failed to load theme preference: $e');
    }
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    if (state == mode) return;
    state = mode;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_themeModeKey, mode.name);
      AppLogger.info('Theme set to: ${mode.name}');
    } catch (e) {
      AppLogger.warning('Failed to save theme preference: $e');
    }
  }

  Future<void> toggleTheme({required Brightness platformBrightness}) async {
    final isCurrentlyDark = switch (state) {
      ThemeMode.dark => true,
      ThemeMode.light => false,
      ThemeMode.system => platformBrightness == Brightness.dark,
    };

    final newMode = isCurrentlyDark ? ThemeMode.light : ThemeMode.dark;
    await setThemeMode(newMode);
  }
}

final themeControllerProvider =
    NotifierProvider<ThemeController, ThemeMode>(ThemeController.new);
