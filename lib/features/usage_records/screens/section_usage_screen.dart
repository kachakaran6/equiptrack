import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_keys.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/extensions/context_extensions.dart';
import '../../../core/widgets/app_app_bar.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_empty_state.dart';
import '../../../core/widgets/app_error_state.dart';
import '../../../core/widgets/app_section_header.dart';
import '../../../core/widgets/app_shimmer.dart';
import '../../../core/widgets/responsive_scaffold.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../data/repositories/usage_record_repository.dart';
import '../../machines/controllers/machines_controller.dart';
import '../../reports/widgets/export_actions_sheet.dart';
import '../../sections/controllers/sections_controller.dart';
import '../controllers/usage_records_controller.dart';
import '../widgets/add_edit_record_sheet.dart';
import '../widgets/usage_table_view.dart';

class SectionUsageScreen extends ConsumerWidget {
  final String machineId;
  final String sectionId;

  const SectionUsageScreen({
    super.key,
    required this.machineId,
    required this.sectionId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final machineAsync = ref.watch(singleMachineProvider(machineId));
    final sectionAsync = ref.watch(singleSectionProvider(sectionId));
    final rawRecordsAsync = ref.watch(usageRecordsStreamFamily(sectionId));
    final calculatedRowsAsync = ref.watch(calculatedUsageRowsFamily(sectionId));

    final machineName = machineAsync.maybeWhen(
      data: (m) => m?.name ?? 'Machine',
      orElse: () => 'Machine',
    );
    final sectionName = sectionAsync.maybeWhen(
      data: (s) => s?.name ?? 'Component',
      orElse: () => 'Component',
    );

    return ResponsiveScaffold(
      appBar: AppAppBar(
        title: sectionName,
        subtitle: machineName,
        actions: [
          IconButton(
            key: const Key(AppKeys.generateReportButton),
            icon: const Icon(Icons.ios_share_rounded, size: 20),
            tooltip: 'Export Report',
            splashRadius: 20,
            onPressed: () {
              final machine = machineAsync.value;
              final section = sectionAsync.value;
              final rawRecords = rawRecordsAsync.value ?? [];

              if (rawRecords.isEmpty) {
                context.showInfoSnackBar('No usage records found to export for this component.');
                return;
              }

              if (machine != null && section != null) {
                ExportActionsSheet.show(
                  context,
                  machine: machine,
                  section: section,
                  records: rawRecords,
                );
              }
            },
          ),
          const SizedBox(width: 4),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        key: const Key(AppKeys.addRecordButton),
        onPressed: () => AddEditRecordSheet.show(context, sectionId: sectionId),
        icon: const Icon(Icons.add_rounded, size: 20),
        label: const Text(
          'Add Record',
          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
        ),
      ),
      body: rawRecordsAsync.when(
        loading: () => ListView(
          padding: AppSpacing.screenPadding,
          children: const [
            UsageTableSkeleton(),
          ],
        ),
        error: (err, _) => AppErrorState(
          message: err.toString(),
          onRetry: () => ref.invalidate(usageRecordsStreamFamily(sectionId)),
        ),
        data: (rawRecords) {
          return calculatedRowsAsync.when(
            loading: () => ListView(
              padding: AppSpacing.screenPadding,
              children: const [
                UsageTableSkeleton(),
              ],
            ),
            error: (err, _) => AppErrorState(message: err.toString()),
            data: (rows) {
              return RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(usageRecordsStreamFamily(sectionId));
                },
                child: ListView(
                  padding: AppSpacing.screenPadding,
                  children: [
                    // Top Section Summary Header with Count & Quick Export
                    AppSectionHeader(
                      title: 'Usage History',
                      subtitle: 'Chronological replacement and duration log',
                      badge: CountBadge(
                        count: rows.length,
                        singular: 'record',
                        plural: 'records',
                      ),
                      trailing: rows.isNotEmpty
                          ? AppButton(
                              text: 'Export',
                              icon: Icons.ios_share_rounded,
                              size: AppButtonSize.small,
                              variant: AppButtonVariant.outline,
                              onPressed: () {
                                final machine = machineAsync.value;
                                final section = sectionAsync.value;
                                if (machine != null && section != null) {
                                  ExportActionsSheet.show(
                                    context,
                                    machine: machine,
                                    section: section,
                                    records: rawRecords,
                                  );
                                }
                              },
                            )
                          : null,
                      padding: const EdgeInsets.only(top: 2, bottom: 10),
                    ),

                    // Content Table / Cards or Empty State
                    if (rows.isEmpty)
                      AppEmptyState(
                        title: 'No usage records yet',
                        message:
                            'Add the first replacement record for "$sectionName" to begin tracking operational durability.',
                        icon: Icons.history_toggle_off_rounded,
                        actionLabel: 'Add Record',
                        onAction: () =>
                            AddEditRecordSheet.show(context, sectionId: sectionId),
                      )
                    else
                      UsageTableView(
                        sectionId: sectionId,
                        rows: rows,
                        rawRecords: rawRecords,
                      ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}
