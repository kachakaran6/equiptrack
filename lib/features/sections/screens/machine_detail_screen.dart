import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_keys.dart';
import '../../../core/extensions/context_extensions.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/app_confirm_dialog.dart';
import '../../../core/widgets/app_empty_state.dart';
import '../../../core/widgets/app_error_state.dart';
import '../../../core/widgets/app_loading.dart';
import '../../../core/widgets/app_section_header.dart';
import '../../../core/widgets/responsive_scaffold.dart';
import '../../../data/repositories/section_repository.dart';
import '../../../data/repositories/usage_record_repository.dart';
import '../../../models/section.dart';
import '../../machines/controllers/machines_controller.dart';
import '../../machines/widgets/add_edit_machine_dialog.dart';
import '../controllers/sections_controller.dart';
import '../widgets/add_edit_section_dialog.dart';

class MachineDetailScreen extends ConsumerWidget {
  final String machineId;

  const MachineDetailScreen({super.key, required this.machineId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = context.theme;
    final machineAsync = ref.watch(singleMachineProvider(machineId));
    final sectionsAsync = ref.watch(sectionsStreamFamily(machineId));

    return ResponsiveScaffold(
      appBar: AppBar(
        title: machineAsync.when(
          data: (machine) => Text(machine?.name ?? 'Machine Details'),
          loading: () => const Text('Machine Details'),
          error: (_, _) => const Text('Machine Details'),
        ),
        actions: [
          machineAsync.maybeWhen(
            data: (machine) => machine != null
                ? IconButton(
                    icon: const Icon(Icons.edit_outlined),
                    tooltip: 'Edit Machine',
                    onPressed: () async {
                      final updated = await AddEditMachineDialog.show(
                        context,
                        machine: machine,
                      );
                      if (updated != null) {
                        ref.invalidate(singleMachineProvider(machineId));
                      }
                    },
                  )
                : const SizedBox.shrink(),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        key: const Key(AppKeys.addSectionButton),
        onPressed: () => AddEditSectionDialog.show(context, machineId: machineId),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Add Section'),
      ),
      body: machineAsync.when(
        loading: () => const AppLoading(message: 'Loading machine info...'),
        error: (err, _) => AppErrorState(
          message: err.toString(),
          onRetry: () => ref.invalidate(singleMachineProvider(machineId)),
        ),
        data: (machine) {
          if (machine == null) {
            return const AppErrorState(
              title: 'Machine not found',
              message: 'The requested machine could not be located or has been deleted.',
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(singleMachineProvider(machineId));
              ref.invalidate(sectionsStreamFamily(machineId));
            },
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              children: [
                // Machine Summary Card
                AppCard(
                  backgroundColor: theme.colorScheme.primaryContainer.withAlpha(50),
                  borderColor: theme.colorScheme.primary.withAlpha(50),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.precision_manufacturing_rounded,
                            color: theme.colorScheme.primary,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            machine.name,
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                      if (machine.description != null &&
                          machine.description!.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(
                          machine.description!,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Sections Header
                const AppSectionHeader(
                  title: 'Sections / Components',
                  subtitle: 'Select a section to manage usage logs and duration history',
                ),
                const SizedBox(height: 8),

                // Sections List
                sectionsAsync.when(
                  loading: () => const AppLoading(message: 'Loading sections...'),
                  error: (err, _) => AppErrorState(
                    message: err.toString(),
                    onRetry: () => ref.invalidate(sectionsStreamFamily(machineId)),
                  ),
                  data: (sections) {
                    if (sections.isEmpty) {
                      return AppEmptyState(
                        title: 'No sections added',
                        message:
                            'Add a section or component (e.g. Side A, Spindle, Gearbox) to begin tracking usage history.',
                        icon: Icons.category_outlined,
                        actionLabel: 'Add Section',
                        onAction: () =>
                            AddEditSectionDialog.show(context, machineId: machineId),
                      );
                    }

                    return Column(
                      children: sections.map((section) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _SectionCard(
                            machineId: machineId,
                            section: section,
                          ),
                        );
                      }).toList(),
                    );
                  },
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _SectionCard extends ConsumerWidget {
  final String machineId;
  final Section section;

  const _SectionCard({required this.machineId, required this.section});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = context.theme;
    final recordsAsync = ref.watch(usageRecordsStreamFamily(section.id));

    return AppCard(
      keyString: '${AppKeys.sectionCardPrefix}${section.id}',
      onTap: () {
        context.go('/machines/$machineId/sections/${section.id}');
      },
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: theme.colorScheme.secondaryContainer.withAlpha(120),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              Icons.tune_rounded,
              color: theme.colorScheme.secondary,
              size: 20,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  section.name,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                recordsAsync.when(
                  loading: () => const Text('Loading records...', style: TextStyle(fontSize: 12)),
                  error: (_, _) => const SizedBox.shrink(),
                  data: (records) {
                    return Text(
                      '${records.length} ${records.length == 1 ? "record" : "records"}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert_rounded, size: 20),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            onSelected: (action) async {
              if (action == 'edit') {
                AddEditSectionDialog.show(
                  context,
                  machineId: machineId,
                  section: section,
                );
              } else if (action == 'delete') {
                final confirm = await AppConfirmDialog.show(
                  context: context,
                  title: 'Delete section?',
                  message: 'Are you sure you want to delete section "${section.name}"?',
                  cascadeNotice:
                      'Deleting this section will permanently delete all its usage records.',
                );
                if (confirm == true) {
                  final ok = await ref
                      .read(sectionsControllerProvider.notifier)
                      .deleteSection(section.id, section.machineId);
                  if (context.mounted) {
                    if (ok) {
                      context.showSuccessSnackBar('Section deleted');
                    } else {
                      context.showErrorSnackBar('Failed to delete section');
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
                    Text('Delete', style: TextStyle(color: Colors.red)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(width: 4),
          Icon(
            Icons.chevron_right_rounded,
            size: 20,
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ],
      ),
    );
  }
}
