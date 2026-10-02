import 'package:flutter/material.dart';

enum AppButtonVariant { primary, secondary, outline, danger, text }

enum AppButtonSize { small, medium, large }

/// Standard reusable button for the application
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

    final padding = switch (size) {
      AppButtonSize.small => const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      AppButtonSize.medium => const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
      AppButtonSize.large => const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
    };

    final textStyle = switch (size) {
      AppButtonSize.small => theme.textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w600),
      AppButtonSize.medium => theme.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600),
      AppButtonSize.large => theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
    };

    Widget content = Row(
      mainAxisSize: isFullWidth ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (isLoading) ...[
          SizedBox(
            width: size == AppButtonSize.small ? 14 : 18,
            height: size == AppButtonSize.small ? 14 : 18,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(
                variant == AppButtonVariant.primary || variant == AppButtonVariant.danger
                    ? Colors.white
                    : colorScheme.primary,
              ),
            ),
          ),
          const SizedBox(width: 8),
        ] else if (icon != null) ...[
          Icon(icon, size: size == AppButtonSize.small ? 16 : 18),
          const SizedBox(width: 8),
        ],
        Text(text, style: textStyle),
      ],
    );

    Widget button;

    switch (variant) {
      case AppButtonVariant.primary:
        button = ElevatedButton(
          key: keyString != null ? Key(keyString!) : null,
          onPressed: isLoading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: colorScheme.primary,
            foregroundColor: colorScheme.onPrimary,
            padding: padding,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
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
            padding: padding,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          child: content,
        );
        break;

      case AppButtonVariant.outline:
        button = OutlinedButton(
          key: keyString != null ? Key(keyString!) : null,
          onPressed: isLoading ? null : onPressed,
          style: OutlinedButton.styleFrom(
            padding: padding,
            side: BorderSide(color: colorScheme.outlineVariant),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          child: content,
        );
        break;

      case AppButtonVariant.danger:
        button = ElevatedButton(
          key: keyString != null ? Key(keyString!) : null,
          onPressed: isLoading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: colorScheme.error,
            foregroundColor: colorScheme.onError,
            padding: padding,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
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
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
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
