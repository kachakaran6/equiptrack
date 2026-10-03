import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_keys.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/extensions/context_extensions.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/app_app_bar.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/app_confirm_dialog.dart';
import '../../../core/widgets/app_empty_state.dart';
import '../../../core/widgets/app_error_state.dart';
import '../../../core/widgets/app_loading.dart';
import '../../../core/widgets/app_popup_menu.dart';
import '../../../core/widgets/app_search_field.dart';
import '../../../core/widgets/app_section_header.dart';
import '../../../core/widgets/responsive_scaffold.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../data/repositories/section_repository.dart';
import '../../../data/repositories/usage_record_repository.dart';
import '../../../models/section.dart';
import '../../machines/controllers/machines_controller.dart';
import '../../machines/widgets/add_edit_machine_dialog.dart';
import '../controllers/sections_controller.dart';
import '../widgets/add_edit_section_dialog.dart';

class MachineDetailScreen extends ConsumerStatefulWidget {
  final String machineId;

  const MachineDetailScreen({super.key, required this.machineId});

  @override
  ConsumerState<MachineDetailScreen> createState() => _MachineDetailScreenState();
}

class _MachineDetailScreenState extends ConsumerState<MachineDetailScreen> {
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final machineAsync = ref.watch(singleMachineProvider(widget.machineId));
    final sectionsAsync = ref.watch(sectionsStreamFamily(widget.machineId));

    return ResponsiveScaffold(
      appBar: AppAppBar(
        title: machineAsync.when(
          data: (machine) => machine?.name ?? 'Machine Details',
          loading: () => 'Machine Details',
          error: (_, _) => 'Machine Details',
        ),
        subtitle: 'Components & Tracking',
        actions: [
          machineAsync.maybeWhen(
            data: (machine) => machine != null
                ? IconButton(
                    icon: const Icon(Icons.edit_outlined, size: 20),
                    tooltip: 'Edit Machine',
                    splashRadius: 20,
                    onPressed: () async {
                      final updated = await AddEditMachineDialog.show(
                        context,
                        machine: machine,
                      );
                      if (updated != null) {
                        ref.invalidate(singleMachineProvider(widget.machineId));
                      }
                    },
                  )
                : const SizedBox.shrink(),
            orElse: () => const SizedBox.shrink(),
          ),
          const SizedBox(width: 4),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        key: const Key(AppKeys.addSectionButton),
        onPressed: () => AddEditSectionDialog.show(context, machineId: widget.machineId),
        icon: const Icon(Icons.add_rounded, size: 20),
        label: const Text(
          'Add Component',
          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
        ),
      ),
      body: machineAsync.when(
        loading: () => const AppLoading(message: 'Loading machine info...'),
        error: (err, _) => AppErrorState(
          message: err.toString(),
          onRetry: () => ref.invalidate(singleMachineProvider(widget.machineId)),
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
              ref.invalidate(singleMachineProvider(widget.machineId));
              ref.invalidate(sectionsStreamFamily(widget.machineId));
            },
            child: ListView(
              padding: AppSpacing.screenPadding,
              children: [
                // Compact Machine Summary Card
                AppCard(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  backgroundColor: isDark
                      ? AppColors.surfaceContainerLowDark
                      : AppColors.surfaceContainerLowLight,
                  child: Row(
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: isDark
                              ? AppColors.primaryContainerDark
                              : AppColors.primaryContainerLight,
                          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                          border: Border.all(
                            color: isDark ? AppColors.borderDark : AppColors.borderLight,
                          ),
                        ),
                        child: Icon(
                          Icons.precision_manufacturing_rounded,
                          color: isDark ? AppColors.primaryLight : AppColors.primary,
                          size: 19,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              machine.name,
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            if (machine.description != null &&
                                machine.description!.trim().isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(
                                machine.description!.trim(),
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
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // Search Component Field
                AppSearchField(
                  hintText: 'Search components...',
                  onChanged: (val) {
                    setState(() {
                      _searchQuery = val.trim().toLowerCase();
                    });
                  },
                ),
                const SizedBox(height: 12),

                // Sections Header & List
                sectionsAsync.when(
                  loading: () => const AppLoading(message: 'Loading components...'),
                  error: (err, _) => AppErrorState(
                    message: err.toString(),
                    onRetry: () => ref.invalidate(sectionsStreamFamily(widget.machineId)),
                  ),
                  data: (sections) {
                    if (sections.isEmpty) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const AppSectionHeader(
                            title: 'Components',
                            subtitle: 'Select a component to view and manage usage logs',
                            padding: EdgeInsets.only(top: 4, bottom: 8),
                          ),
                          AppEmptyState(
                            title: 'No components yet',
                            message:
                                'Add a component (e.g. Big ID Fan, Gearbox, Spindle) to start logging usage.',
                            icon: Icons.category_outlined,
                            actionLabel: 'Add Component',
                            onAction: () => AddEditSectionDialog.show(
                              context,
                              machineId: widget.machineId,
                            ),
                          ),
                        ],
                      );
                    }

                    final filteredSections = _searchQuery.isEmpty
                        ? sections
                        : sections
                            .where((s) => s.name.toLowerCase().contains(_searchQuery))
                            .toList();

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        AppSectionHeader(
                          title: 'Components',
                          subtitle: 'Select a component to view and manage usage logs',
                          badge: CountBadge(
                            count: filteredSections.length,
                            singular: 'component',
                            plural: 'components',
                          ),
                          padding: const EdgeInsets.only(top: 4, bottom: 8),
                        ),
                        if (filteredSections.isEmpty)
                          AppEmptyState(
                            title: 'No matching components',
                            message: 'No component names match "$_searchQuery".',
                            icon: Icons.search_off_rounded,
                          )
                        else
                          ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: filteredSections.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final section = filteredSections[index];
                              return _ComponentRowCard(
                                machineId: widget.machineId,
                                section: section,
                              );
                            },
                          ),
                      ],
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

/// Compact, industrial 68dp Component / Section Row Card
class _ComponentRowCard extends ConsumerWidget {
  final String machineId;
  final Section section;

  const _ComponentRowCard({required this.machineId, required this.section});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final recordsAsync = ref.watch(usageRecordsStreamFamily(section.id));

    return AppCard(
      keyString: '${AppKeys.sectionCardPrefix}${section.id}',
      onTap: () {
        context.go('/machines/$machineId/sections/${section.id}');
      },
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Compact Component Icon Container (36x36)
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: isDark
                  ? AppColors.secondaryContainerDark
                  : AppColors.secondaryContainerLight,
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
              border: Border.all(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
                width: 1,
              ),
            ),
            child: Icon(
              Icons.tune_rounded,
              color: isDark ? AppColors.secondaryLight : AppColors.secondary,
              size: 18,
            ),
          ),
          const SizedBox(width: 12),
          // Component Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  section.name,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 3),
                recordsAsync.when(
                  loading: () => Text(
                    'Loading records...',
                    style: theme.textTheme.bodySmall?.copyWith(fontSize: 12),
                  ),
                  error: (_, _) => const SizedBox.shrink(),
                  data: (records) {
                    final recordCountText = records.isEmpty
                        ? 'No usage records'
                        : '${records.length} ${records.length == 1 ? "usage record" : "usage records"}';

                    return Text(
                      recordCountText,
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
                value: 'delete',
                label: 'Delete',
                icon: Icons.delete_outline_rounded,
                isDestructive: true,
              ),
            ],
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
                  title: 'Delete component?',
                  message: 'Are you sure you want to delete component "${section.name}"?',
                  cascadeNotice:
                      'Deleting this component will permanently delete all its logged usage records.',
                  confirmLabel: 'Delete',
                  isDestructive: true,
                );
                if (confirm == true) {
                  final ok = await ref
                      .read(sectionsControllerProvider.notifier)
                      .deleteSection(section.id, section.machineId);
                  if (context.mounted) {
                    if (ok) {
                      context.showSuccessSnackBar('Component deleted');
                    } else {
                      context.showErrorSnackBar('Failed to delete component');
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
