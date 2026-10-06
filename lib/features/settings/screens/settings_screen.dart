import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/analytics/analytics_event.dart';
import '../../../core/analytics/analytics_service.dart';
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
import '../../../core/services/package_info_service.dart';
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
    AnalyticsService.instance.track(AnalyticsEvent.settingsOpened);
  }

  Color _getCategoryColor(int index) {
    return _categoryPalette[index % _categoryPalette.length];
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final themeMode = ref.watch(themeControllerProvider);
    final isDark = themeMode == ThemeMode.dark ||
        (themeMode == ThemeMode.system && theme.brightness == Brightness.dark);
    final user = ref.watch(currentUserProvider);
    final categoriesAsync = ref.watch(allCategoriesProvider);
    final updateState = ref.watch(appUpdateControllerProvider);
    final versionText = ref.watch(appVersionDisplayProvider);
    final buildDescription = ref.watch(appBuildDescriptionProvider);

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

          // ================= SECTION 2: APPEARANCE =================
          const AppSectionHeader(
            title: 'Appearance',
            subtitle: 'Dark or light theme mode',
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
                    isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
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
                        'Dark Mode',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        isDark ? 'Dark theme enabled' : 'Light theme enabled',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                Switch.adaptive(
                  value: isDark,
                  activeTrackColor: isDark ? AppColors.primaryLight : AppColors.primary,
                  onChanged: (val) {
                    ref.read(themeControllerProvider.notifier).setThemeMode(
                          val ? ThemeMode.dark : ThemeMode.light,
                        );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // ================= SECTION 3: APP UPDATES & SYSTEM =================
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
                        versionText,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        buildDescription,
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
}
