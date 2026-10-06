import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_keys.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/extensions/context_extensions.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/app_bottom_sheet.dart';
import '../../../core/widgets/app_card.dart';
import '../../../data/repositories/category_repository.dart';
import '../../../models/machine.dart';
import '../../../models/section.dart';
import '../../../models/usage_record.dart';
import '../controllers/reports_controller.dart';
import '../models/report_filter_options.dart';
import 'pdf_export_dialog.dart';
import 'report_date_filter_selector.dart';

class ExportActionsSheet extends ConsumerStatefulWidget {
  final Machine machine;
  final Section section;
  final List<UsageRecord> records;

  const ExportActionsSheet({
    super.key,
    required this.machine,
    required this.section,
    required this.records,
  });

  static Future<void> show(
    BuildContext context, {
    required Machine machine,
    required Section section,
    required List<UsageRecord> records,
  }) {
    return AppBottomSheet.show(
      context: context,
      builder: (context) => ExportActionsSheet(
        machine: machine,
        section: section,
        records: records,
      ),
    );
  }

  @override
  ConsumerState<ExportActionsSheet> createState() => _ExportActionsSheetState();
}

class _ExportActionsSheetState extends ConsumerState<ExportActionsSheet> {
  ReportDatePreset _datePreset = ReportDatePreset.allTime;
  DateTimeRange? _dateRange;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final filteredRecords = _dateRange != null
        ? widget.records
            .where((r) => ReportFilterHelper.isDateInRange(r.usageDate, _dateRange))
            .toList()
        : widget.records;

    final hasRecords = filteredRecords.isNotEmpty;
    final dateRangeText = _datePreset == ReportDatePreset.allTime
        ? null
        : ReportFilterHelper.getDisplayText(_datePreset, _dateRange);

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Summary info
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: isDark
                ? AppColors.surfaceContainerDark
                : AppColors.surfaceContainerLight,
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            border: Border.all(
              color: isDark ? AppColors.borderDark : AppColors.borderLight,
            ),
          ),
          child: Row(
            children: [
              Icon(
                Icons.assessment_outlined,
                color: isDark ? AppColors.primaryLight : AppColors.primary,
                size: 18,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '${widget.machine.name} • ${widget.section.name} (${filteredRecords.length} ${filteredRecords.length == 1 ? "record" : "records"})',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Date Filter Selector
        ReportDateFilterSelector(
          selectedPreset: _datePreset,
          selectedRange: _dateRange,
          onPresetChanged: (preset) {
            setState(() {
              _datePreset = preset;
              _dateRange = ReportFilterHelper.getRangeForPreset(preset);
            });
          },
          onRangeChanged: (range) {
            setState(() {
              _dateRange = range;
            });
          },
        ),
        const SizedBox(height: 12),

        // Empty filter state notice
        if (!hasRecords) ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark
                  ? AppColors.warningContainerDark.withAlpha(80)
                  : AppColors.warningContainer.withAlpha(120),
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
              border: Border.all(
                color: isDark
                    ? AppColors.warning.withAlpha(100)
                    : AppColors.warning.withAlpha(80),
              ),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.info_outline_rounded,
                  color: AppColors.warning,
                  size: 20,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'No records found for "${ReportFilterHelper.getDisplayText(_datePreset, _dateRange)}". Select another date filter to export.',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: isDark ? Colors.amber[200] : Colors.brown[800],
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],

        // Option 1: PDF Export (Large, responsive modal)
        Opacity(
          opacity: hasRecords ? 1.0 : 0.5,
          child: AppCard(
            keyString: AppKeys.exportPdfButton,
            onTap: hasRecords
                ? () async {
                    Navigator.of(context).pop();
                    String? categoryName;
                    if (widget.section.categoryId != null) {
                      final cats = ref
                          .read(categoriesStreamFamily(widget.machine.id))
                          .value;
                      categoryName = cats
                          ?.where((c) => c.id == widget.section.categoryId)
                          .firstOrNull
                          ?.name;
                    }
                    await PdfExportDialog.showSingle(
                      context,
                      machine: widget.machine,
                      section: widget.section,
                      records: filteredRecords,
                      categoryName: categoryName,
                    );
                  }
                : null,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.primaryContainerDark
                        : AppColors.primaryContainerLight,
                    borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                  ),
                  child: Icon(
                    Icons.picture_as_pdf_rounded,
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
                        'Export PDF Document',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Configure, preview, print, or share formatted A4 PDF report',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  Icons.chevron_right_rounded,
                  size: 18,
                  color: theme.colorScheme.onSurfaceVariant.withAlpha(120),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),

        // Option 2: Quick Preview / Print PDF
        Opacity(
          opacity: hasRecords ? 1.0 : 0.5,
          child: AppCard(
            onTap: hasRecords
                ? () async {
                    Navigator.of(context).pop();
                    String? categoryName;
                    if (widget.section.categoryId != null) {
                      final cats = ref
                          .read(categoriesStreamFamily(widget.machine.id))
                          .value;
                      categoryName = cats
                          ?.where((c) => c.id == widget.section.categoryId)
                          .firstOrNull
                          ?.name;
                    }
                    await ref
                        .read(reportsControllerProvider.notifier)
                        .printOrPreviewPdf(
                          machine: widget.machine,
                          section: widget.section,
                          records: filteredRecords,
                          categoryName: categoryName,
                          dateRangeText: dateRangeText,
                        );
                  }
                : null,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.errorContainerDark
                        : AppColors.errorContainer,
                    borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                  ),
                  child: const Icon(
                    Icons.print_rounded,
                    color: AppColors.error,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Direct Print / Preview',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Directly open the system print and preview dialog',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  Icons.chevron_right_rounded,
                  size: 18,
                  color: theme.colorScheme.onSurfaceVariant.withAlpha(120),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),

        // Option 3: Share Excel (.xlsx)
        Opacity(
          opacity: hasRecords ? 1.0 : 0.5,
          child: AppCard(
            keyString: AppKeys.exportExcelButton,
            onTap: hasRecords
                ? () async {
                    Navigator.of(context).pop();
                    try {
                      await ref.read(reportsControllerProvider.notifier).shareExcel(
                            machine: widget.machine,
                            section: widget.section,
                            records: filteredRecords,
                          );
                    } catch (e) {
                      if (context.mounted) {
                        context.showErrorSnackBar('Failed to share Excel: $e');
                      }
                    }
                  }
                : null,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.successContainerDark
                        : AppColors.successContainer,
                    borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                  ),
                  child: const Icon(
                    Icons.table_chart_rounded,
                    color: AppColors.success,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Export Excel Spreadsheet (.xlsx)',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Formatted spreadsheet with calculated replacement durations',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  Icons.chevron_right_rounded,
                  size: 18,
                  color: theme.colorScheme.onSurfaceVariant.withAlpha(120),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
