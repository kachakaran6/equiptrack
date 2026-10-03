import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/extensions/context_extensions.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/app_confirm_dialog.dart';
import '../../../models/calculated_usage_row.dart';
import '../../../models/usage_record.dart';
import '../controllers/usage_records_controller.dart';
import 'add_edit_record_sheet.dart';

class UsageTableView extends ConsumerWidget {
  final String sectionId;
  final List<CalculatedUsageRow> rows;
  final List<UsageRecord> rawRecords;

  const UsageTableView({
    super.key,
    required this.sectionId,
    required this.rows,
    required this.rawRecords,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = context.theme;

    // Lookup raw record by id for edit
    final recordsMap = {for (final r in rawRecords) r.id: r};

    return AppCard(
      padding: EdgeInsets.zero,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minWidth: MediaQuery.of(context).size.width - 32,
            ),
            child: DataTable(
              headingRowColor: WidgetStateProperty.all(
                theme.colorScheme.surfaceContainerHigh,
              ),
              horizontalMargin: 16,
              columnSpacing: 20,
              headingTextStyle: theme.textTheme.labelMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: theme.colorScheme.onSurface,
              ),
              dataTextStyle: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface,
              ),
              columns: const [
                DataColumn(
                  label: Text('Name'),
                ),
                DataColumn(
                  label: Text('Date'),
                ),
                DataColumn(
                  label: Text('Usage Days'),
                  numeric: true,
                ),
                DataColumn(
                  label: SizedBox(width: 24),
                ),
              ],
              rows: rows.map((row) {
                final rawRecord = recordsMap[row.recordId];

                return DataRow(
                  cells: [
                    // Name
                    DataCell(
                      ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 160),
                        child: Text(
                          row.name,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                    // Date (dd/MM/yyyy)
                    DataCell(
                      Text(
                        row.formattedDate,
                        style: TextStyle(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                    // Usage Days / Running badge
                    DataCell(
                      row.isRunning
                          ? Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: theme.colorScheme.primaryContainer,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: theme.colorScheme.primary.withAlpha(50),
                                ),
                              ),
                              child: Text(
                                AppConstants.runningText,
                                style: theme.textTheme.labelSmall?.copyWith(
                                  color: theme.colorScheme.onPrimaryContainer,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            )
                          : Text(
                              '${row.usageDays}',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: theme.colorScheme.primary,
                              ),
                            ),
                    ),
                    // Row Actions (Edit / Delete)
                    DataCell(
                      PopupMenuButton<String>(
                        icon: Icon(
                          Icons.more_horiz_rounded,
                          size: 18,
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        onSelected: (action) async {
                          if (rawRecord == null) return;

                          if (action == 'edit') {
                            AddEditRecordSheet.show(
                              context,
                              sectionId: sectionId,
                              record: rawRecord,
                            );
                          } else if (action == 'delete') {
                            final confirm = await AppConfirmDialog.show(
                              context: context,
                              title: 'Delete record?',
                              message:
                                  'Are you sure you want to delete "${rawRecord.name}" (${row.formattedDate})? Durations will be automatically recalculated.',
                              confirmLabel: 'Delete',
                            );
                            if (confirm == true) {
                              final ok = await ref
                                  .read(usageRecordsControllerProvider.notifier)
                                  .deleteRecord(rawRecord.id, rawRecord.sectionId);
                              if (context.mounted) {
                                if (ok) {
                                  context.showSuccessSnackBar(
                                    'Record deleted & durations updated',
                                  );
                                } else {
                                  context.showErrorSnackBar('Failed to delete record');
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
                                SizedBox(width: 12),
                                Text('Edit'),
                              ],
                            ),
                          ),
                          PopupMenuItem(
                            value: 'delete',
                            child: Row(
                              children: [
                                Icon(Icons.delete_outline, size: 18, color: theme.colorScheme.error),
                                const SizedBox(width: 12),
                                Text('Delete', style: TextStyle(color: theme.colorScheme.error)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                );
              }).toList(),
            ),
          ),
        ),
      ),
    );
  }
}

