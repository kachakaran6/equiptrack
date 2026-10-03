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

/// Clean table view matching reference design: Name | Date | Usage Days | ···
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
    final recordsMap = {for (final r in rawRecords) r.id: r};
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return AppCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Header Row ──────────────────────────────────────────────────
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
            decoration: BoxDecoration(
              color: isDark
                  ? AppColors.surfaceContainerDark
                  : AppColors.surfaceContainerLight,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(AppSpacing.radiusLg),
                topRight: Radius.circular(AppSpacing.radiusLg),
              ),
            ),
            child: Row(
              children: [
                _HeaderCell(label: 'Name', flex: 3),
                _HeaderCell(label: 'Date', flex: 2),
                _HeaderCell(label: 'Usage Days', flex: 2, align: TextAlign.right),
                // space for ··· menu
                const SizedBox(width: 40),
              ],
            ),
          ),

          // ── Data Rows ────────────────────────────────────────────────────
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: rows.length,
            separatorBuilder: (_, _) => Divider(
              height: 1,
              thickness: 1,
              indent: 0,
              endIndent: 0,
              color: (isDark ? AppColors.borderDark : AppColors.borderLight)
                  .withAlpha(120),
            ),
            itemBuilder: (context, index) {
              final row = rows[index];
              final rawRecord = recordsMap[row.recordId];
              return _DataRow(
                row: row,
                rawRecord: rawRecord,
                sectionId: sectionId,
                isLast: index == rows.length - 1,
                onEdit: () {
                  if (rawRecord != null) {
                    AddEditRecordSheet.show(
                      context,
                      sectionId: sectionId,
                      record: rawRecord,
                    );
                  }
                },
                onDuplicate: () async {
                  if (rawRecord == null) return;
                  final ok = await ref
                      .read(usageRecordsControllerProvider.notifier)
                      .duplicateRecord(rawRecord);
                  if (context.mounted) {
                    if (ok) {
                      context.showSuccessSnackBar('Record duplicated');
                    } else {
                      context.showErrorSnackBar('Failed to duplicate');
                    }
                  }
                },
                onDelete: () => _handleDelete(context, ref, rawRecord, row),
              );
            },
          ),
        ],
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
          'Delete "${rawRecord.name}" (${row.formattedDate})? Durations will be recalculated.',
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

// ── Header cell helper ─────────────────────────────────────────────────────────

class _HeaderCell extends StatelessWidget {
  final String label;
  final int flex;
  final TextAlign align;

  const _HeaderCell({
    required this.label,
    required this.flex,
    this.align = TextAlign.left,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Expanded(
      flex: flex,
      child: Text(
        label,
        textAlign: align,
        style: theme.textTheme.labelSmall?.copyWith(
          fontWeight: FontWeight.w700,
          color: theme.colorScheme.onSurfaceVariant,
          letterSpacing: 0.3,
          fontSize: 12,
        ),
      ),
    );
  }
}

// ── Single data row ────────────────────────────────────────────────────────────

class _DataRow extends StatelessWidget {
  final CalculatedUsageRow row;
  final UsageRecord? rawRecord;
  final String sectionId;
  final bool isLast;
  final VoidCallback onEdit;
  final VoidCallback onDuplicate;
  final VoidCallback onDelete;

  const _DataRow({
    required this.row,
    required this.rawRecord,
    required this.sectionId,
    required this.isLast,
    required this.onEdit,
    required this.onDuplicate,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onEdit,
        borderRadius: isLast
            ? BorderRadius.only(
                bottomLeft: Radius.circular(AppSpacing.radiusLg),
                bottomRight: Radius.circular(AppSpacing.radiusLg),
              )
            : BorderRadius.zero,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Name
              Expanded(
                flex: 3,
                child: Text(
                  row.name,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: colorScheme.onSurface,
                    fontSize: 14,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),

              // Date
              Expanded(
                flex: 2,
                child: Text(
                  row.formattedDate,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),

              // Usage Days / Running badge
              Expanded(
                flex: 2,
                child: Align(
                  alignment: Alignment.centerRight,
                  child: row.isRunning
                      ? FittedBox(
                          fit: BoxFit.scaleDown,
                          child: const RunningBadge(),
                        )
                      : Text(
                          '${row.usageDays ?? 0}',
                          textAlign: TextAlign.right,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: isDark
                                ? AppColors.primaryLight
                                : AppColors.primary,
                            fontSize: 17,
                          ),
                        ),
                ),
              ),

              // ··· overflow menu
              const SizedBox(width: 4),
              SizedBox(
                width: 36,
                child: AppPopupMenu<String>(
                  iconSize: 18,
                  items: const [
                    AppPopupMenuItem(
                      value: 'edit',
                      label: 'Edit',
                      icon: Icons.edit_outlined,
                    ),
                    AppPopupMenuItem(
                      value: 'duplicate',
                      label: 'Duplicate',
                      icon: Icons.content_copy_rounded,
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
                    } else if (action == 'duplicate') {
                      onDuplicate();
                    } else if (action == 'delete') {
                      onDelete();
                    }
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
