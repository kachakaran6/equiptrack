import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_keys.dart';
import '../../../core/extensions/context_extensions.dart';
import '../../../core/widgets/app_bottom_sheet.dart';
import '../../../core/widgets/app_card.dart';
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
    final theme = context.theme;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Summary info
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: theme.colorScheme.primaryContainer.withAlpha(60),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            children: [
              Icon(
                Icons.assessment_outlined,
                color: theme.colorScheme.primary,
                size: 20,
              ),
              const SizedBox(width: 10),
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
        const SizedBox(height: 16),

        // Option 1: PDF Preview & Print
        AppCard(
          onTap: () async {
            Navigator.of(context).pop();
            await ref
                .read(reportsControllerProvider.notifier)
                .printOrPreviewPdf(
                  machine: machine,
                  section: section,
                  records: records,
                );
          },
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.red.withAlpha(20),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.picture_as_pdf_rounded,
                  color: Colors.red,
                  size: 24,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Preview / Print PDF',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'A4 document layout ready for printing or preview',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Option 2: Share PDF
        AppCard(
          keyString: AppKeys.exportPdfButton,
          onTap: () async {
            Navigator.of(context).pop();
            try {
              await ref.read(reportsControllerProvider.notifier).sharePdf(
                    machine: machine,
                    section: section,
                    records: records,
                  );
            } catch (e) {
              if (context.mounted) {
                context.showErrorSnackBar('Failed to share PDF: $e');
              }
            }
          },
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.blue.withAlpha(20),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.share_rounded,
                  color: Colors.blue,
                  size: 24,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Share PDF File',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Export and send via WhatsApp, Email, or Drive',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded),
            ],
          ),
        ),
        const SizedBox(height: 12),

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
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.green.withAlpha(20),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.table_chart_rounded,
                  color: Colors.green,
                  size: 24,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Export Excel Spreadsheet (.xlsx)',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Formatted workbook with columns and calculated days',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded),
            ],
          ),
        ),
        const SizedBox(height: 12),
      ],
    );
  }
}
