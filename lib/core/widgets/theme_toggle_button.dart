import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/theme_controller.dart';

/// An animated theme toggle button with smooth icon rotation and scale transition
class ThemeToggleButton extends ConsumerWidget {
  final bool showLabel;
  final VoidCallback? onThemeChanged;

  const ThemeToggleButton({
    super.key,
    this.showLabel = false,
    this.onThemeChanged,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeControllerProvider);
    final platformBrightness = MediaQuery.platformBrightnessOf(context);
    final isDark = switch (themeMode) {
      ThemeMode.dark => true,
      ThemeMode.light => false,
      ThemeMode.system => platformBrightness == Brightness.dark,
    };

    final tooltip = switch (themeMode) {
      ThemeMode.system => 'Theme: System (${isDark ? "Dark" : "Light"})',
      ThemeMode.dark => 'Theme: Dark',
      ThemeMode.light => 'Theme: Light',
    };

    final iconWidget = AnimatedSwitcher(
      duration: const Duration(milliseconds: 350),
      transitionBuilder: (child, animation) {
        return RotationTransition(
          turns: Tween<double>(begin: 0.75, end: 1.0).animate(animation),
          child: ScaleTransition(
            scale: Tween<double>(begin: 0.6, end: 1.0).animate(
              CurvedAnimation(parent: animation, curve: Curves.easeOutBack),
            ),
            child: FadeTransition(
              opacity: animation,
              child: child,
            ),
          ),
        );
      },
      child: Icon(
        isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
        key: ValueKey<bool>(isDark),
        size: 20,
        color: isDark ? const Color(0xFFFFD54F) : const Color(0xFF5C6BC0),
      ),
    );

    if (showLabel) {
      return TextButton.icon(
        onPressed: () => _handleToggle(context, ref, platformBrightness),
        icon: iconWidget,
        label: Text(
          isDark ? 'Light Mode' : 'Dark Mode',
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
      );
    }

    return IconButton(
      tooltip: tooltip,
      icon: iconWidget,
      onPressed: () => _handleToggle(context, ref, platformBrightness),
    );
  }

  void _handleToggle(
    BuildContext context,
    WidgetRef ref,
    Brightness platformBrightness,
  ) {
    HapticFeedback.lightImpact();
    ref
        .read(themeControllerProvider.notifier)
        .toggleTheme(platformBrightness: platformBrightness);
    onThemeChanged?.call();
  }
}
