import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/analytics/analytics_service.dart';
import '../../../core/constants/app_keys.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/extensions/context_extensions.dart';
import '../../../core/router/app_routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/app_app_bar.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/app_confirm_dialog.dart';
import '../../../core/widgets/app_empty_state.dart';
import '../../../core/widgets/app_error_state.dart';
import '../../../core/widgets/app_popup_menu.dart';
import '../../../core/widgets/app_search_field.dart';
import '../../../core/widgets/app_section_header.dart';
import '../../../core/widgets/app_shimmer.dart';
import '../../../core/widgets/responsive_scaffold.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/theme_toggle_button.dart';
import '../../../data/repositories/auth_repository.dart';
import '../../../data/repositories/machine_repository.dart';
import '../../../data/repositories/section_repository.dart';
import '../../../models/machine.dart';
import 'package:flutter/services.dart';
import '../../../core/widgets/exit_confirm_dialog.dart';
import '../../auth/controllers/auth_controller.dart';
import '../controllers/machines_controller.dart';
import '../widgets/add_edit_machine_dialog.dart';
import '../widgets/duplicate_machine_dialog.dart';

class MachineListScreen extends ConsumerWidget {
  const MachineListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final machinesAsync = ref.watch(filteredMachinesProvider);
    final user = ref.watch(currentUserProvider);
    final query = ref.watch(searchQueryProvider);

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final shouldExit = await ExitConfirmDialog.show(context);
        if (shouldExit && context.mounted) {
          SystemNavigator.pop();
        }
      },
      child: ResponsiveScaffold(
        appBar: AppAppBar(
          title: 'EquipTrack',
          subtitle: 'Machine Lifecycle & Maintenance',
          showBackButton: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined, size: 20),
            tooltip: 'Settings',
            splashRadius: 20,
            onPressed: () => context.push(AppRoutes.settings),
          ),
          const ThemeToggleButton(),
          IconButton(
            key: const Key(AppKeys.signOutButton),
            icon: const Icon(Icons.logout_rounded, size: 20),
            tooltip: 'Sign Out (${user?.email ?? ""})',
            splashRadius: 20,
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
          const SizedBox(width: 6),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        key: const Key(AppKeys.addMachineFab),
        onPressed: () => AddEditMachineDialog.show(context),
        icon: const Icon(Icons.add_rounded, size: 20),
        label: const Text(
          'Add Machine',
          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(machinesStreamProvider);
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Compact Search Bar
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              child: AppSearchField(
                keyString: AppKeys.machineSearchField,
                hintText: 'Search machines...',
                onChanged: (val) {
                  final prev = ref.read(searchQueryProvider);
                  if (prev.isEmpty && val.trim().isNotEmpty) {
                    AnalyticsService.instance.searchStarted(searchContext: 'machines');
                  }
                  ref.read(searchQueryProvider.notifier).setQuery(val);
                },
              ),
            ),
            // Machines List or States
            Expanded(
              child: machinesAsync.when(
                loading: () => const MachineListSkeleton(),
                error: (err, _) => AppErrorState(
                  message: err.toString(),
                  onRetry: () => ref.invalidate(machinesStreamProvider),
                ),
                data: (machines) {
                  if (query.isNotEmpty) {
                    if (machines.isEmpty) {
                      AnalyticsService.instance.searchNoResults(searchContext: 'machines');
                    } else {
                      AnalyticsService.instance.searchUsed(
                        searchContext: 'machines',
                        resultCount: machines.length,
                      );
                    }
                  }

                  if (machines.isEmpty) {
                    if (query.isNotEmpty) {
                      return AppEmptyState(
                        title: 'No matching machines',
                        message: 'No machine names match "$query".',
                        icon: Icons.search_off_rounded,
                      );
                    }
                    return AppEmptyState(
                      title: 'No machines yet',
                      message: 'Create your first machine to start tracking usage.',
                      icon: Icons.precision_manufacturing_outlined,
                      actionLabel: 'Add Machine',
                      onAction: () => AddEditMachineDialog.show(context),
                    );
                  }

                  return ListView.separated(
                    padding: AppSpacing.screenPadding,
                    itemCount: machines.length + 1,
                    separatorBuilder: (_, index) => index == 0
                        ? const SizedBox.shrink()
                        : const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      if (index == 0) {
                        return AppSectionHeader(
                          title: 'Machines',
                          badge: CountBadge(
                            count: machines.length,
                            singular: 'machine',
                            plural: 'machines',
                          ),
                          padding: const EdgeInsets.fromLTRB(4, 8, 4, 8),
                        );
                      }

                      final machine = machines[index - 1];
                      return _MachineRowCard(machine: machine);
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    ),
  );
  }
}

/// Compact, industrial 74dp Machine Row Card
class _MachineRowCard extends ConsumerWidget {
  final Machine machine;

  const _MachineRowCard({required this.machine});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final sectionsAsync = ref.watch(sectionsStreamFamily(machine.id));

    return AppCard(
      keyString: '${AppKeys.machineCardPrefix}${machine.id}',
      onTap: () {
        context.go('/machines/${machine.id}');
      },
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Compact Industrial Icon Container (40x40)
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: isDark
                  ? AppColors.primaryContainerDark
                  : AppColors.primaryContainerLight,
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
              border: Border.all(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
                width: 1,
              ),
            ),
            child: Icon(
              Icons.precision_manufacturing_rounded,
              color: isDark ? AppColors.primaryLight : AppColors.primary,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          // Machine Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  machine.name,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 3),
                sectionsAsync.when(
                  loading: () => const Padding(
                    padding: EdgeInsets.only(top: 2, bottom: 2),
                    child: AppSkeletonLine(width: 90, height: 9),
                  ),
                  error: (_, _) => machine.description != null && machine.description!.isNotEmpty
                      ? Text(
                          machine.description!,
                          style: theme.textTheme.bodySmall?.copyWith(fontSize: 12),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        )
                      : const SizedBox.shrink(),
                  data: (sections) {
                    final countText = sections.isEmpty
                        ? '0 components'
                        : '${sections.length} ${sections.length == 1 ? "component" : "components"}';

                    if (machine.description != null && machine.description!.trim().isNotEmpty) {
                      return Text(
                        '$countText • ${machine.description!.trim()}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                          fontSize: 12,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      );
                    }

                    return Text(
                      countText,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
          // Standardized Overflow Menu
          AppPopupMenu<String>(
            items: const [
              AppPopupMenuItem(
                value: 'edit',
                label: 'Edit',
                icon: Icons.edit_outlined,
              ),
              AppPopupMenuItem(
                value: 'duplicate',
                label: 'Duplicate',
                icon: Icons.copy_rounded,
              ),
              AppPopupMenuItem(
                value: 'delete',
                label: 'Delete',
                icon: Icons.delete_outline_rounded,
                isDestructive: true,
              ),
            ],
            onSelected: (action) async {
              if (action == 'edit') {
                AddEditMachineDialog.show(context, machine: machine);
              } else if (action == 'duplicate') {
                DuplicateMachineDialog.show(context, machine: machine);
              } else if (action == 'delete') {
                final confirm = await AppConfirmDialog.show(
                  context: context,
                  title: 'Delete machine?',
                  message: 'Are you sure you want to delete "${machine.name}"?',
                  cascadeNotice:
                      'Deleting this machine will permanently remove all associated components and usage records.',
                  confirmLabel: 'Delete',
                  isDestructive: true,
                );
                if (confirm == true) {
                  final ok = await ref
                      .read(machinesControllerProvider.notifier)
                      .deleteMachine(machine.id);
                  if (context.mounted) {
                    if (ok) {
                      context.showSuccessSnackBar('Machine deleted');
                    } else {
                      context.showErrorSnackBar('Failed to delete machine');
                    }
                  }
                }
              }
            },
          ),
        ],
      ),
    );
  }
}
