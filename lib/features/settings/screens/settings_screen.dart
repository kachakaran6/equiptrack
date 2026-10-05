import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/analytics/analytics_event.dart';
import '../../../core/analytics/analytics_screen.dart';
import '../../../core/analytics/analytics_service.dart';
import '../../../core/analytics/widgets/analytics_privacy_dialog.dart';
import '../../../core/constants/app_keys.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/extensions/context_extensions.dart';
import '../../../core/router/app_routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/theme_controller.dart';
import '../../../core/widgets/app_app_bar.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/app_confirm_dialog.dart';
import '../../../core/widgets/app_empty_state.dart';
import '../../../core/widgets/app_section_header.dart';
import '../../../core/widgets/responsive_scaffold.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../data/repositories/auth_repository.dart';
import '../../../data/repositories/category_repository.dart';
import '../../app_update/controllers/app_update_controller.dart';
import '../../auth/controllers/auth_controller.dart';
import '../../sections/controllers/categories_controller.dart';
import '../../sections/widgets/add_edit_category_dialog.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  static const List<Color> _categoryPalette = [
    Color(0xFF3B82F6), // Blue
    Color(0xFF10B981), // Emerald
    Color(0xFFF59E0B), // Amber
    Color(0xFF8B5CF6), // Purple
    Color(0xFFEC4899), // Pink
    Color(0xFF06B6D4), // Cyan
    Color(0xFFF97316), // Orange
    Color(0xFF14B8A6), // Teal
  ];

  @override
  void initState() {
    super.initState();
    AnalyticsService.instance.screen(AnalyticsScreen.settings);
    AnalyticsService.instance.track(AnalyticsEvent.settingsOpened);
  }

  Color _getCategoryColor(int index) {
    return _categoryPalette[index % _categoryPalette.length];
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final user = ref.watch(currentUserProvider);
    final categoriesAsync = ref.watch(allCategoriesProvider);
    final themeMode = ref.watch(themeControllerProvider);
    final updateState = ref.watch(appUpdateControllerProvider);

    return ResponsiveScaffold(
      appBar: const AppAppBar(
        title: 'Settings',
        subtitle: 'Categories, Appearance & System',
        showBackButton: true,
      ),
      body: ListView(
        padding: AppSpacing.screenPadding,
        children: [
          // ================= SECTION 1: GLOBAL CATEGORY MANAGEMENT =================
          AppSectionHeader(
            title: 'Global Categories',
            subtitle: 'Categories available across all machines & components',
            badge: categoriesAsync.maybeWhen(
              data: (cats) => CountBadge(
                count: cats.length,
                singular: 'category',
                plural: 'categories',
              ),
              orElse: () => null,
            ),
            trailing: AppButton(
              text: 'Add Category',
              icon: Icons.add_rounded,
              size: AppButtonSize.small,
              onPressed: () async {
                await AddEditCategoryDialog.show(context);
              },
            ),
          ),
          const SizedBox(height: 8),

          categoriesAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(child: CircularProgressIndicator.adaptive()),
            ),
            error: (err, _) => AppCard(
              child: Text(
                'Unable to load categories: $err',
                style: TextStyle(color: theme.colorScheme.error),
              ),
            ),
            data: (categories) {
              if (categories.isEmpty) {
                return AppEmptyState(
                  title: 'No categories created yet',
                  message:
                      'Create reusable categories (e.g., Electrical, Hydraulic, Mechanical) to organize components in any machine.',
                  icon: Icons.category_outlined,
                  actionLabel: 'Create First Category',
                  onAction: () => AddEditCategoryDialog.show(context),
                );
              }

              return Column(
                children: categories.asMap().entries.map((entry) {
                  final index = entry.key;
                  final category = entry.value;
                  final color = _getCategoryColor(index);

                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: AppCard(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      child: Row(
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: color,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              category.name,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.edit_outlined, size: 18),
                            tooltip: 'Rename category',
                            splashRadius: 18,
                            onPressed: () {
                              AddEditCategoryDialog.show(
                                context,
                                existingCategory: category,
                              );
                            },
                          ),
                          IconButton(
                            icon: Icon(
                              Icons.delete_outline_rounded,
                              size: 18,
                              color: theme.colorScheme.error,
                            ),
                            tooltip: 'Delete category',
                            splashRadius: 18,
                            onPressed: () async {
                              final confirm = await AppConfirmDialog.show(
                                context: context,
                                title: 'Delete category?',
                                message:
                                    'Are you sure you want to delete category "${category.name}"?',
                                cascadeNotice:
                                    'Components in this category will remain intact and become Uncategorized.',
                                confirmLabel: 'Delete',
                                isDestructive: true,
                              );
                              if (confirm == true) {
                                final ok = await ref
                                    .read(categoriesControllerProvider.notifier)
                                    .deleteCategory(id: category.id);
                                if (context.mounted) {
                                  if (ok) {
                                    context.showSuccessSnackBar('Category deleted');
                                  } else {
                                    context.showErrorSnackBar('Failed to delete category');
                                  }
                                }
                              }
                            },
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              );
            },
          ),
          const SizedBox(height: 24),

          // ================= SECTION 2: APPEARANCE / THEME =================
          const AppSectionHeader(
            title: 'Appearance',
            subtitle: 'Visual theme and color mode',
          ),
          const SizedBox(height: 8),
          AppCard(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                _buildThemeOption(
                  context,
                  title: 'System',
                  icon: Icons.brightness_auto_rounded,
                  isSelected: themeMode == ThemeMode.system,
                  onTap: () => ref
                      .read(themeControllerProvider.notifier)
                      .setThemeMode(ThemeMode.system),
                ),
                const SizedBox(width: 8),
                _buildThemeOption(
                  context,
                  title: 'Light',
                  icon: Icons.light_mode_rounded,
                  isSelected: themeMode == ThemeMode.light,
                  onTap: () => ref
                      .read(themeControllerProvider.notifier)
                      .setThemeMode(ThemeMode.light),
                ),
                const SizedBox(width: 8),
                _buildThemeOption(
                  context,
                  title: 'Dark',
                  icon: Icons.dark_mode_rounded,
                  isSelected: themeMode == ThemeMode.dark,
                  onTap: () => ref
                      .read(themeControllerProvider.notifier)
                      .setThemeMode(ThemeMode.dark),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // ================= SECTION 3: PRIVACY & TELEMETRY =================
          const AppSectionHeader(
            title: 'Privacy & Analytics',
            subtitle: 'Telemetry controls & diagnostic data sharing',
          ),
          const SizedBox(height: 8),
          AppCard(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: (isDark ? AppColors.primaryLight : AppColors.primary)
                        .withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                  ),
                  child: Icon(
                    Icons.shield_outlined,
                    color: isDark ? AppColors.primaryLight : AppColors.primary,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Telemetry Sharing',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        AnalyticsService.instance.consent.isGranted
                            ? 'Enabled (helping detect crashes & improve app)'
                            : 'Disabled (zero diagnostic data collected)',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                AppButton(
                  text: 'Manage',
                  variant: AppButtonVariant.outline,
                  size: AppButtonSize.small,
                  onPressed: () => AnalyticsPrivacyDialog.show(context),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // ================= SECTION 4: APP UPDATES & SYSTEM =================
          const AppSectionHeader(
            title: 'App Version & Updates',
            subtitle: 'Google Play update channel and build information',
          ),
          const SizedBox(height: 8),
          AppCard(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: (isDark ? AppColors.primaryLight : AppColors.primary)
                        .withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                  ),
                  child: Icon(
                    Icons.system_update_rounded,
                    color: isDark ? AppColors.primaryLight : AppColors.primary,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'EquipTrack v1.0.0+9',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Production release build',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                AppButton(
                  text: updateState.isChecking ? 'Checking...' : 'Check Updates',
                  variant: AppButtonVariant.secondary,
                  size: AppButtonSize.small,
                  isLoading: updateState.isChecking,
                  onPressed: () async {
                    final status = await ref
                        .read(appUpdateControllerProvider.notifier)
                        .checkForUpdate();
                    if (context.mounted) {
                      if (status.isUpdateAvailable) {
                        context.showSuccessSnackBar('A new version is available on Google Play!');
                      } else {
                        context.showInfoSnackBar('You are using the latest version.');
                      }
                    }
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // ================= SECTION 5: ACCOUNT & SESSION =================
          const AppSectionHeader(
            title: 'Account',
            subtitle: 'Current authenticated session',
          ),
          const SizedBox(height: 8),
          AppCard(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              children: [
                Icon(
                  Icons.account_circle_outlined,
                  size: 24,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user?.email ?? 'Signed in User',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'EquipTrack Member',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                AppButton(
                  keyString: AppKeys.signOutButton,
                  text: 'Sign Out',
                  variant: AppButtonVariant.danger,
                  size: AppButtonSize.small,
                  onPressed: () async {
                    final confirm = await AppConfirmDialog.show(
                      context: context,
                      title: 'Sign out?',
                      message: 'Are you sure you want to sign out from ${user?.email ?? "EquipTrack"}?',
                      confirmLabel: 'Sign Out',
                      isDestructive: true,
                    );
                    if (confirm == true) {
                      if (context.mounted) {
                        context.showInfoSnackBar('Signing out...');
                      }
                      await ref.read(authControllerProvider.notifier).signOut();
                      if (context.mounted) {
                        context.go(AppRoutes.login);
                      }
                    }
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildThemeOption(
    BuildContext context, {
    required String title,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = isDark ? AppColors.primaryLight : AppColors.primary;

    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected
                ? primaryColor.withValues(alpha: isDark ? 0.25 : 0.15)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
            border: Border.all(
              color: isSelected ? primaryColor : Colors.transparent,
              width: 1.5,
            ),
          ),
          child: Column(
            children: [
              Icon(
                icon,
                size: 20,
                color: isSelected ? primaryColor : theme.colorScheme.onSurfaceVariant,
              ),
              const SizedBox(height: 4),
              Text(
                title,
                style: theme.textTheme.bodySmall?.copyWith(
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: isSelected ? primaryColor : theme.colorScheme.onSurface,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
