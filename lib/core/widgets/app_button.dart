import 'package:flutter/material.dart';
import '../constants/app_spacing.dart';
import '../theme/app_colors.dart';

enum AppButtonVariant { primary, secondary, outline, danger, text }

enum AppButtonSize { small, medium, large }

/// Standard reusable Material 3 button for EquipTrack
class AppButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final IconData? icon;
  final AppButtonVariant variant;
  final AppButtonSize size;
  final bool isFullWidth;
  final String? keyString;

  const AppButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.isLoading = false,
    this.icon,
    this.variant = AppButtonVariant.primary,
    this.size = AppButtonSize.medium,
    this.isFullWidth = false,
    this.keyString,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    final (padding, minHeight, iconSize, spinnerSize) = switch (size) {
      AppButtonSize.small => (
          const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          34.0,
          15.0,
          13.0,
        ),
      AppButtonSize.medium => (
          const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          42.0,
          18.0,
          16.0,
        ),
      AppButtonSize.large => (
          const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
          48.0,
          20.0,
          18.0,
        ),
    };

    final textStyle = switch (size) {
      AppButtonSize.small => theme.textTheme.labelMedium?.copyWith(
          fontWeight: FontWeight.w600,
          letterSpacing: 0.1,
        ),
      AppButtonSize.medium => theme.textTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.w600,
          letterSpacing: 0.1,
        ),
      AppButtonSize.large => theme.textTheme.titleSmall?.copyWith(
          fontWeight: FontWeight.w600,
          letterSpacing: 0.1,
        ),
    };

    final foregroundColor = switch (variant) {
      AppButtonVariant.primary => Colors.white,
      AppButtonVariant.danger => Colors.white,
      AppButtonVariant.secondary => isDark ? AppColors.textPrimaryDark : colorScheme.onSurface,
      AppButtonVariant.outline => isDark ? AppColors.textPrimaryDark : colorScheme.onSurface,
      AppButtonVariant.text => isDark ? AppColors.primaryLight : AppColors.primary,
    };

    Widget content = Row(
      mainAxisSize: isFullWidth ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (isLoading) ...[
          SizedBox(
            width: spinnerSize,
            height: spinnerSize,
            child: CircularProgressIndicator(
              strokeWidth: 2.0,
              valueColor: AlwaysStoppedAnimation<Color>(foregroundColor),
            ),
          ),
          const SizedBox(width: 8),
        ] else if (icon != null) ...[
          Icon(icon, size: iconSize, color: foregroundColor),
          const SizedBox(width: 8),
        ],
        Text(
          text,
          style: textStyle?.copyWith(color: foregroundColor),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );

    final borderRadius = BorderRadius.circular(AppSpacing.radiusMd);

    Widget button;

    switch (variant) {
      case AppButtonVariant.primary:
        button = FilledButton(
          key: keyString != null ? Key(keyString!) : null,
          onPressed: isLoading ? null : onPressed,
          style: FilledButton.styleFrom(
            backgroundColor: isDark ? AppColors.primaryLight : AppColors.primary,
            foregroundColor: Colors.white,
            padding: padding,
            minimumSize: Size(0, minHeight),
            shape: RoundedRectangleBorder(borderRadius: borderRadius),
            elevation: 0,
          ),
          child: content,
        );
        break;

      case AppButtonVariant.secondary:
        button = FilledButton.tonal(
          key: keyString != null ? Key(keyString!) : null,
          onPressed: isLoading ? null : onPressed,
          style: FilledButton.styleFrom(
            backgroundColor: isDark ? AppColors.surfaceContainerDark : colorScheme.surfaceContainerHigh,
            foregroundColor: foregroundColor,
            padding: padding,
            minimumSize: Size(0, minHeight),
            shape: RoundedRectangleBorder(
              borderRadius: borderRadius,
              side: BorderSide(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
                width: 1,
              ),
            ),
            elevation: 0,
          ),
          child: content,
        );
        break;

      case AppButtonVariant.outline:
        final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;
        button = OutlinedButton(
          key: keyString != null ? Key(keyString!) : null,
          onPressed: isLoading ? null : onPressed,
          style: OutlinedButton.styleFrom(
            padding: padding,
            minimumSize: Size(0, minHeight),
            side: BorderSide(color: borderColor, width: 1),
            shape: RoundedRectangleBorder(borderRadius: borderRadius),
          ),
          child: content,
        );
        break;

      case AppButtonVariant.danger:
        button = FilledButton(
          key: keyString != null ? Key(keyString!) : null,
          onPressed: isLoading ? null : onPressed,
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.error,
            foregroundColor: Colors.white,
            padding: padding,
            minimumSize: Size(0, minHeight),
            shape: RoundedRectangleBorder(borderRadius: borderRadius),
            elevation: 0,
          ),
          child: content,
        );
        break;

      case AppButtonVariant.text:
        button = TextButton(
          key: keyString != null ? Key(keyString!) : null,
          onPressed: isLoading ? null : onPressed,
          style: TextButton.styleFrom(
            padding: padding,
            minimumSize: Size(0, minHeight),
            shape: RoundedRectangleBorder(borderRadius: borderRadius),
          ),
          child: content,
        );
        break;
    }

    if (isFullWidth) {
      return SizedBox(width: double.infinity, child: button);
    }
    return button;
  }
}
