import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_keys.dart';
import '../../../core/extensions/context_extensions.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/app_search_field.dart';
import '../../../core/widgets/app_confirm_dialog.dart';
import '../../../core/widgets/app_empty_state.dart';
import '../../../core/widgets/app_error_state.dart';
import '../../../core/widgets/app_loading.dart';
import '../../../core/router/app_routes.dart';
import '../../../core/widgets/responsive_scaffold.dart';
import '../../../core/widgets/theme_toggle_button.dart';
import '../../../data/repositories/auth_repository.dart';
import '../../../data/repositories/machine_repository.dart';
import '../../../data/repositories/section_repository.dart';
import '../../../models/machine.dart';
import '../../auth/controllers/auth_controller.dart';
import '../controllers/machines_controller.dart';
import '../widgets/add_edit_machine_dialog.dart';

class MachineListScreen extends ConsumerWidget {
  const MachineListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final machinesAsync = ref.watch(filteredMachinesProvider);
    final user = ref.watch(currentUserProvider);

    return ResponsiveScaffold(
      appBar: AppBar(
        title: const Text('EquipTrack'),
        actions: [
          const ThemeToggleButton(),
          const SizedBox(width: 4),
          IconButton(
            key: const Key(AppKeys.signOutButton),
            icon: const Icon(Icons.logout_rounded),
            tooltip: 'Sign Out (${user?.email ?? ""})',
            onPressed: () async {
              final confirm = await AppConfirmDialog.show(
                context: context,
                title: 'Sign Out',
                message: 'Are you sure you want to sign out?',
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
          const SizedBox(width: 8),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        key: const Key(AppKeys.addMachineFab),
        onPressed: () => AddEditMachineDialog.show(context),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Add Machine'),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(machinesStreamProvider);
        },
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: AppSearchField(
                keyString: AppKeys.machineSearchField,
                onChanged: (val) {
                  ref.read(searchQueryProvider.notifier).setQuery(val);
                },
              ),
            ),
            Expanded(
              child: machinesAsync.when(
                loading: () => const AppLoading(message: 'Loading machines...'),
                error: (err, _) => AppErrorState(
                  message: err.toString(),
                  onRetry: () => ref.invalidate(machinesStreamProvider),
                ),
                data: (machines) {
                  if (machines.isEmpty) {
                    final query = ref.watch(searchQueryProvider);
                    if (query.isNotEmpty) {
                      return AppEmptyState(
                        title: 'No matching machines',
                        message: 'No machines match "$query". Try a different search term.',
                        icon: Icons.search_off_rounded,
                      );
                    }
                    return AppEmptyState(
                      title: 'No machines yet',
                      message: 'Add your first machine to start tracking usage history.',
                      icon: Icons.precision_manufacturing_outlined,
                      actionLabel: 'Add Machine',
                      onAction: () => AddEditMachineDialog.show(context),
                    );
                  }

                  return ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 88),
                    itemCount: machines.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final machine = machines[index];
                      return _MachineCard(machine: machine);
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MachineCard extends ConsumerWidget {
  final Machine machine;

  const _MachineCard({required this.machine});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = context.theme;
    final sectionsAsync = ref.watch(sectionsStreamFamily(machine.id));

    return AppCard(
      keyString: '${AppKeys.machineCardPrefix}${machine.id}',
      onTap: () {
        context.go('/machines/${machine.id}');
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer.withAlpha(100),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Icons.precision_manufacturing_rounded,
                  color: theme.colorScheme.primary,
                  size: 22,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      machine.name,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (machine.description != null &&
                        machine.description!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        machine.description!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert_rounded, size: 20),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                onSelected: (action) async {
                  if (action == 'edit') {
                    AddEditMachineDialog.show(context, machine: machine);
                  } else if (action == 'delete') {
                    final confirm = await AppConfirmDialog.show(
                      context: context,
                      title: 'Delete machine?',
                      message: 'Are you sure you want to delete "${machine.name}"?',
                      cascadeNotice:
                          'Deleting this machine will permanently delete all its sections and usage records.',
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
                itemBuilder: (context) => [
                  const PopupMenuItem(
                    value: 'edit',
                    child: Row(
                      children: [
                        Icon(Icons.edit_outlined, size: 18),
                        SizedBox(width: 10),
                        Text('Edit'),
                      ],
                    ),
                  ),
                  PopupMenuItem(
                    value: 'delete',
                    child: Row(
                      children: [
                        Icon(Icons.delete_outline, size: 18, color: Colors.red),
                        const SizedBox(width: 10),
                        const Text('Delete', style: TextStyle(color: Colors.red)),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 10),
          // Sections summary tag / preview
          sectionsAsync.when(
            loading: () => const Text('Loading sections...', style: TextStyle(fontSize: 12)),
            error: (_, _) => const SizedBox.shrink(),
            data: (sections) {
              if (sections.isEmpty) {
                return Row(
                  children: [
                    Icon(
                      Icons.folder_open_rounded,
                      size: 14,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'No sections yet — tap to add',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const Spacer(),
                    Icon(
                      Icons.chevron_right_rounded,
                      size: 20,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ],
                );
              }

              final sectionNames = sections.map((s) => s.name).take(4).join(' • ');
              final hasMore = sections.length > 4 ? ' +${sections.length - 4} more' : '';

              return Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${sections.length} ${sections.length == 1 ? "Section" : "Sections"}',
                          style: theme.textTheme.labelMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: theme.colorScheme.primary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '$sectionNames$hasMore',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    Icons.chevron_right_rounded,
                    size: 20,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}
