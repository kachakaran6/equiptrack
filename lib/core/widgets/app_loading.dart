import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Professional, industrial loading indicator with subtle dual-track animation
class AppLoading extends StatelessWidget {
  final String? message;
  final double size;
  final bool isOverlay;

  const AppLoading({
    super.key,
    this.message,
    this.size = 28,
    this.isOverlay = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final primaryColor = isDark ? AppColors.primaryLight : AppColors.primary;
    final trackColor = isDark
        ? AppColors.primaryContainerDark.withAlpha(160)
        : AppColors.primaryContainerLight;

    final content = Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            SizedBox(
              width: size,
              height: size,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Subtle static background ring
                  SizedBox(
                    width: size,
                    height: size,
                    child: CircularProgressIndicator(
                      value: 1.0,
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(trackColor),
                    ),
                  ),
                  // Animated spinning ring with rounded stroke
                  SizedBox(
                    width: size,
                    height: size,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      strokeCap: StrokeCap.round,
                      valueColor: AlwaysStoppedAnimation<Color>(primaryColor),
                    ),
                  ),
                ],
              ),
            ),
            if (message != null && message!.isNotEmpty) ...[
              const SizedBox(height: 14),
              Text(
                message!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  fontWeight: FontWeight.w500,
                  letterSpacing: 0.2,
                  fontSize: 12.5,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ],
        ),
      ),
    );

    if (isOverlay) {
      return Container(
        color: (isDark ? Colors.black : Colors.white).withAlpha(140),
        child: content,
      );
    }

    return content;
  }
}

/// Compact inline spinner for buttons, search fields, and table headers
class AppSpinner extends StatelessWidget {
  final double size;
  final Color? color;
  final double strokeWidth;

  const AppSpinner({
    super.key,
    this.size = 16,
    this.color,
    this.strokeWidth = 2.0,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final spinnerColor =
        color ?? (isDark ? AppColors.primaryLight : AppColors.primary);

    return SizedBox(
      width: size,
      height: size,
      child: CircularProgressIndicator(
        strokeWidth: strokeWidth,
        strokeCap: StrokeCap.round,
        valueColor: AlwaysStoppedAnimation<Color>(spinnerColor),
      ),
    );
  }
}
