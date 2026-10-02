import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_keys.dart';
import '../../../core/extensions/context_extensions.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/app_empty_state.dart';
import '../../../core/widgets/app_error_state.dart';
import '../../../core/widgets/app_loading.dart';
import '../../../core/widgets/responsive_scaffold.dart';
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
    final theme = context.theme;
    final machineAsync = ref.watch(singleMachineProvider(machineId));
    final sectionAsync = ref.watch(singleSectionProvider(sectionId));
    final rawRecordsAsync = ref.watch(usageRecordsStreamFamily(sectionId));
    final calculatedRowsAsync = ref.watch(calculatedUsageRowsFamily(sectionId));

    final machineName = machineAsync.maybeWhen(
      data: (m) => m?.name ?? 'Machine',
      orElse: () => 'Machine',
    );
    final sectionName = sectionAsync.maybeWhen(
      data: (s) => s?.name ?? 'Section',
      orElse: () => 'Section',
    );

    return ResponsiveScaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              sectionName,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            Text(
              machineName,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            key: const Key(AppKeys.generateReportButton),
            icon: const Icon(Icons.picture_as_pdf_outlined),
            tooltip: 'Generate Report',
            onPressed: () {
              final machine = machineAsync.value;
              final section = sectionAsync.value;
              final rawRecords = rawRecordsAsync.value ?? [];

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
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        key: const Key(AppKeys.addRecordButton),
        onPressed: () => AddEditRecordSheet.show(context, sectionId: sectionId),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Add Record'),
      ),
      body: rawRecordsAsync.when(
        loading: () => const AppLoading(message: 'Loading usage history...'),
        error: (err, _) => AppErrorState(
          message: err.toString(),
          onRetry: () => ref.invalidate(usageRecordsStreamFamily(sectionId)),
        ),
        data: (rawRecords) {
          return calculatedRowsAsync.when(
            loading: () => const AppLoading(message: 'Calculating durations...'),
            error: (err, _) => AppErrorState(message: err.toString()),
            data: (rows) {
              return RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(usageRecordsStreamFamily(sectionId));
                },
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
                  children: [
                    // Operational Breadcrumb & Summary
                    AppCard(
                      backgroundColor: theme.colorScheme.surface,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      child: Row(
                        children: [
                          Icon(
                            Icons.history_rounded,
                            size: 20,
                            color: theme.colorScheme.primary,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              '${rows.length} ${rows.length == 1 ? "Usage record" : "Usage records"} logged',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          if (rows.isNotEmpty)
                            AppButton(
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
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Content Table or Empty State
                    if (rows.isEmpty)
                      AppEmptyState(
                        title: 'No usage records yet',
                        message:
                            'Add the first record for "$sectionName" to start tracking usage duration and maintenance lifecycle.',
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
