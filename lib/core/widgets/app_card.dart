import 'package:flutter/material.dart';
import '../constants/app_spacing.dart';
import '../theme/app_colors.dart';

/// Authentic industrial card with crisp hairline border, tonal surface, and interactive ripple
class AppCard extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;
  final Color? backgroundColor;
  final Color? borderColor;
  final double borderRadius;
  final double elevation;
  final String? keyString;

  const AppCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding = AppSpacing.cardPadding,
    this.backgroundColor,
    this.borderColor,
    this.borderRadius = AppSpacing.radiusLg,
    this.elevation = 0,
    this.keyString,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final cardColor = backgroundColor ??
        (isDark ? AppColors.cardDark : AppColors.cardLight);

    final effectiveBorderColor = borderColor ??
        (isDark ? AppColors.borderDark : AppColors.borderLight);

    final cardShape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(borderRadius),
      side: BorderSide(color: effectiveBorderColor, width: 1),
    );

    final cardWidget = Material(
      color: cardColor,
      elevation: elevation,
      shape: cardShape,
      clipBehavior: Clip.antiAlias,
      child: onTap != null
          ? InkWell(
              onTap: onTap,
              splashColor: theme.colorScheme.primary.withAlpha(20),
              highlightColor: theme.colorScheme.primary.withAlpha(10),
              child: Padding(
                padding: padding,
                child: child,
              ),
            )
          : Padding(
              padding: padding,
              child: child,
            ),
    );

    if (keyString != null) {
      return KeyedSubtree(
        key: Key(keyString!),
        child: cardWidget,
      );
    }

    return cardWidget;
  }
}
