import 'package:flutter/material.dart';

/// Authentic Material Design 3 Card with interactive ripple, proper tonal surface, and clipping
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
    this.padding = const EdgeInsets.all(16),
    this.backgroundColor,
    this.borderColor,
    this.borderRadius = 16,
    this.elevation = 0,
    this.keyString,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cardColor = backgroundColor ??
        theme.cardTheme.color ??
        theme.colorScheme.surfaceContainerLow;
    final effectiveBorderColor =
        borderColor ?? theme.colorScheme.outlineVariant.withAlpha(140);

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
              splashColor: theme.colorScheme.primary.withAlpha(25),
              highlightColor: theme.colorScheme.primary.withAlpha(15),
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

