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

class ExportActionsSheet extends ConsumerWidget {
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
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

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
                  '${machine.name} • ${section.name} (${records.length} records)',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Option 1: PDF Preview & Print
        AppCard(
          onTap: () async {
            Navigator.of(context).pop();
            String? categoryName;
            if (section.categoryId != null) {
              final cats = ref.read(categoriesStreamFamily(machine.id)).value;
              categoryName = cats
                  ?.where((c) => c.id == section.categoryId)
                  .firstOrNull
                  ?.name;
            }
            await ref
                .read(reportsControllerProvider.notifier)
                .printOrPreviewPdf(
                  machine: machine,
                  section: section,
                  records: records,
                  categoryName: categoryName,
                );
          },
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
                  Icons.picture_as_pdf_rounded,
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
                      'Preview / Print PDF',
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'A4 document layout ready for printing or viewing',
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
        const SizedBox(height: 8),

        // Option 2: Share PDF
        AppCard(
          keyString: AppKeys.exportPdfButton,
          onTap: () async {
            Navigator.of(context).pop();
            try {
              String? categoryName;
              if (section.categoryId != null) {
                final cats = ref.read(categoriesStreamFamily(machine.id)).value;
                categoryName = cats
                    ?.where((c) => c.id == section.categoryId)
                    .firstOrNull
                    ?.name;
              }
              await ref.read(reportsControllerProvider.notifier).sharePdf(
                    machine: machine,
                    section: section,
                    records: records,
                    categoryName: categoryName,
                  );
            } catch (e) {
              if (context.mounted) {
                context.showErrorSnackBar('Failed to share PDF: $e');
              }
            }
          },
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
                  Icons.share_rounded,
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
                      'Share PDF File',
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Export document and send via WhatsApp, Email, or Drive',
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
        const SizedBox(height: 8),

        // Option 3: Share Excel (.xlsx)
        AppCard(
          keyString: AppKeys.exportExcelButton,
          onTap: () async {
            Navigator.of(context).pop();
            try {
              await ref.read(reportsControllerProvider.notifier).shareExcel(
                    machine: machine,
                    section: section,
                    records: records,
                  );
            } catch (e) {
              if (context.mounted) {
                context.showErrorSnackBar('Failed to share Excel: $e');
              }
            }
          },
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
      ],
    );
  }
}
