import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../router/app_routes.dart';
import '../theme/app_colors.dart';
import 'theme_toggle_button.dart';

/// Global, professional branded header for EquipTrack top-level screens.
/// Uses native AppBar geometry to ensure zero status bar overlap, perfect vertical
/// centering, and responsive action placement.
class GlobalAppHeader extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final String subtitle;
  final IconData? icon;
  final List<Widget>? additionalActions;
  final bool showBackButton;
  final VoidCallback? onBackPressed;
  final bool showSettings;
  final bool showThemeToggle;
  final double height;

  const GlobalAppHeader({
    super.key,
    this.title = 'EquipTrack',
    required this.subtitle,
    this.icon,
    this.additionalActions,
    this.showBackButton = false,
    this.onBackPressed,
    this.showSettings = true,
    this.showThemeToggle = true,
    this.height = 58.0,
  });

  @override
  Size get preferredSize => Size.fromHeight(height);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;
    final primaryColor = isDark ? AppColors.primaryLight : AppColors.primary;

    Widget? leadingWidget;
    if (showBackButton) {
      leadingWidget = IconButton(
        icon: const Icon(Icons.arrow_back_rounded, size: 20),
        tooltip: 'Back',
        splashRadius: 20,
        onPressed: onBackPressed ??
            () {
              if (Navigator.of(context).canPop()) {
                Navigator.of(context).pop();
              } else {
                try {
                  if (context.canPop()) {
                    context.pop();
                    return;
                  }
                } catch (_) {}
                Navigator.of(context).maybePop();
              }
            },
      );
    }

    final actionsList = <Widget>[
      ...?additionalActions,
      if (showSettings)
        IconButton(
          icon: const Icon(Icons.settings_outlined, size: 20),
          tooltip: 'Settings',
          splashRadius: 20,
          onPressed: () => context.push(AppRoutes.settings),
        ),
      if (showThemeToggle) const ThemeToggleButton(),
      const SizedBox(width: 4),
    ];

    return AppBar(
      toolbarHeight: height,
      backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
      titleSpacing: showBackButton ? 0 : 16.0,
      leading: leadingWidget,
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(1),
        child: Container(
          color: borderColor,
          height: 1,
        ),
      ),
      title: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (icon != null && !showBackButton) ...[
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: primaryColor.withValues(alpha: isDark ? 0.20 : 0.12),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: primaryColor.withValues(alpha: isDark ? 0.35 : 0.22),
                  width: 1,
                ),
              ),
              child: Center(
                child: Icon(
                  icon,
                  size: 20,
                  color: primaryColor,
                ),
              ),
            ),
            const SizedBox(width: 12),
          ],
          Flexible(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                    color: theme.colorScheme.onSurface,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (subtitle.isNotEmpty) ...[
                  const SizedBox(height: 1),
                  Text(
                    subtitle,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
      actions: actionsList,
    );
  }
}
