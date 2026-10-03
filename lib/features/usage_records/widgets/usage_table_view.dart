import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/extensions/context_extensions.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/app_confirm_dialog.dart';
import '../../../core/widgets/app_popup_menu.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../models/calculated_usage_row.dart';
import '../../../models/usage_record.dart';
import '../controllers/usage_records_controller.dart';
import 'add_edit_record_sheet.dart';

/// Responsive data list / table view for component usage records
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
    final isSmall = context.isSmallScreen;
    final recordsMap = {for (final r in rawRecords) r.id: r};

    if (isSmall) {
      return _buildMobileRecordList(context, ref, recordsMap);
    } else {
      return _buildDesktopTable(context, ref, recordsMap);
    }
  }

  /// Mobile-first responsive record cards/rows (clean, compact, no horizontal scrolling needed)
  Widget _buildMobileRecordList(
    BuildContext context,
    WidgetRef ref,
    Map<String, UsageRecord> recordsMap,
  ) {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: rows.length,
      separatorBuilder: (_, _) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final row = rows[index];
        final rawRecord = recordsMap[row.recordId];

        return _MobileUsageRowCard(
          row: row,
          rawRecord: rawRecord,
          sectionId: sectionId,
          onEdit: () {
            if (rawRecord != null) {
              AddEditRecordSheet.show(
                context,
                sectionId: sectionId,
                record: rawRecord,
              );
            }
          },
          onDelete: () => _handleDelete(context, ref, rawRecord, row),
        );
      },
    );
  }

  /// Desktop / Tablet clean data table
  Widget _buildDesktopTable(
    BuildContext context,
    WidgetRef ref,
    Map<String, UsageRecord> recordsMap,
  ) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return AppCard(
      padding: EdgeInsets.zero,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        child: DataTable(
          headingRowHeight: 40,
          dataRowMinHeight: 46,
          dataRowMaxHeight: 52,
          headingRowColor: WidgetStateProperty.all(
            isDark ? AppColors.surfaceContainerDark : AppColors.surfaceContainerLight,
          ),
          horizontalMargin: 16,
          columnSpacing: 24,
          headingTextStyle: theme.textTheme.labelMedium?.copyWith(
            fontWeight: FontWeight.w700,
            color: theme.colorScheme.onSurface,
          ),
          dataTextStyle: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurface,
          ),
          columns: const [
            DataColumn(label: Text('Record Name')),
            DataColumn(label: Text('Usage Date')),
            DataColumn(label: Text('Duration'), numeric: true),
            DataColumn(label: SizedBox(width: 24)),
          ],
          rows: rows.map((row) {
            final rawRecord = recordsMap[row.recordId];

            return DataRow(
              cells: [
                DataCell(
                  Text(
                    row.name,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                DataCell(
                  Text(
                    row.formattedDate,
                    style: TextStyle(
                      color: theme.colorScheme.onSurfaceVariant,
                      fontSize: 13,
                    ),
                  ),
                ),
                DataCell(
                  row.isRunning
                      ? const RunningBadge()
                      : Text(
                          '${row.usageDays} ${row.usageDays == 1 ? "day" : "days"}',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: isDark ? AppColors.primaryLight : AppColors.primary,
                          ),
                        ),
                ),
                DataCell(
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
                    onSelected: (action) {
                      if (rawRecord == null) return;
                      if (action == 'edit') {
                        AddEditRecordSheet.show(
                          context,
                          sectionId: sectionId,
                          record: rawRecord,
                        );
                      } else if (action == 'delete') {
                        _handleDelete(context, ref, rawRecord, row);
                      }
                    },
                  ),
                ),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }

  Future<void> _handleDelete(
    BuildContext context,
    WidgetRef ref,
    UsageRecord? rawRecord,
    CalculatedUsageRow row,
  ) async {
    if (rawRecord == null) return;

    final confirm = await AppConfirmDialog.show(
      context: context,
      title: 'Delete record?',
      message:
          'Are you sure you want to delete "${rawRecord.name}" (${row.formattedDate})? Durations will be automatically recalculated.',
      confirmLabel: 'Delete',
      isDestructive: true,
    );
    if (confirm == true) {
      final ok = await ref
          .read(usageRecordsControllerProvider.notifier)
          .deleteRecord(rawRecord.id, rawRecord.sectionId);
      if (context.mounted) {
        if (ok) {
          context.showSuccessSnackBar('Record deleted & durations updated');
        } else {
          context.showErrorSnackBar('Failed to delete record');
        }
      }
    }
  }
}

/// Mobile-optimized record row card with high information density
class _MobileUsageRowCard extends StatelessWidget {
  final CalculatedUsageRow row;
  final UsageRecord? rawRecord;
  final String sectionId;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _MobileUsageRowCard({
    required this.row,
    required this.rawRecord,
    required this.sectionId,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return AppCard(
      onTap: onEdit,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Top Row: Record Name + Duration/Status
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Text(
                  row.name,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              if (row.isRunning)
                const RunningBadge()
              else
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.surfaceContainerDark
                        : AppColors.surfaceContainerLight,
                    borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                    border: Border.all(
                      color: isDark ? AppColors.borderDark : AppColors.borderLight,
                    ),
                  ),
                  child: Text(
                    '${row.usageDays} ${row.usageDays == 1 ? "day" : "days"}',
                    style: theme.textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          // Bottom Row: Date + Overflow Actions
          Row(
            children: [
              Icon(
                Icons.event_outlined,
                size: 14,
                color: colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 6),
              Text(
                row.formattedDate,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const Spacer(),
              AppPopupMenu<String>(
                iconSize: 18,
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
                onSelected: (action) {
                  if (action == 'edit') {
                    onEdit();
                  } else if (action == 'delete') {
                    onDelete();
                  }
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}
