import 'package:flutter/material.dart';
import '../constants/app_spacing.dart';
import '../theme/app_colors.dart';

/// Reusable popup menu item descriptor
class AppPopupMenuItem<T> {
  final T value;
  final String label;
  final IconData icon;
  final bool isDestructive;

  const AppPopupMenuItem({
    required this.value,
    required this.label,
    required this.icon,
    this.isDestructive = false,
  });
}

/// Standardized EquipTrack popup menu button
class AppPopupMenu<T> extends StatelessWidget {
  final List<AppPopupMenuItem<T>> items;
  final ValueChanged<T> onSelected;
  final IconData icon;
  final double iconSize;
  final String? tooltip;

  const AppPopupMenu({
    super.key,
    required this.items,
    required this.onSelected,
    this.icon = Icons.more_vert_rounded,
    this.iconSize = 18.0,
    this.tooltip = 'More options',
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final menuBg = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;

    return PopupMenuButton<T>(
      icon: Icon(
        icon,
        size: iconSize,
        color: theme.colorScheme.onSurfaceVariant,
      ),
      tooltip: tooltip,
      splashRadius: 18,
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
      color: menuBg,
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        side: BorderSide(color: borderColor, width: 1),
      ),
      onSelected: onSelected,
      itemBuilder: (context) {
        return items.map((item) {
          final itemColor = item.isDestructive
              ? AppColors.error
              : theme.colorScheme.onSurface;

          return PopupMenuItem<T>(
            value: item.value,
            height: 38,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  item.icon,
                  size: 16,
                  color: itemColor,
                ),
                const SizedBox(width: 10),
                Text(
                  item.label,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: itemColor,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          );
        }).toList();
      },
    );
  }
}
