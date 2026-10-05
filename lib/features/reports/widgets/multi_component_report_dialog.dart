import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/constants/app_spacing.dart';
import '../../../core/services/pdf_service.dart';
import '../../../core/services/usage_calculation_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/app_logger.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_dialog.dart';
import '../../../data/repositories/usage_record_repository.dart';
import '../../../models/machine.dart';
import '../../../models/section.dart';
import '../models/report_filter_options.dart';
import 'report_date_filter_selector.dart';

class MultiComponentReportDialog extends ConsumerStatefulWidget {
  final Machine machine;
  final List<Section> selectedSections;
  final Map<String, String> categoryNames; // categoryId -> categoryName

  const MultiComponentReportDialog({
    super.key,
    required this.machine,
    required this.selectedSections,
    required this.categoryNames,
  });

  static Future<void> show(
    BuildContext context, {
    required Machine machine,
    required List<Section> selectedSections,
    required Map<String, String> categoryNames,
  }) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => MultiComponentReportDialog(
        machine: machine,
        selectedSections: selectedSections,
        categoryNames: categoryNames,
      ),
    );
  }

  @override
  ConsumerState<MultiComponentReportDialog> createState() =>
      _MultiComponentReportDialogState();
}

enum _ReportStatus { configuring, generating, completed, empty, error }

class _MultiComponentReportDialogState
    extends ConsumerState<MultiComponentReportDialog> {
  _ReportStatus _status = _ReportStatus.configuring;
  ReportDatePreset _datePreset = ReportDatePreset.allTime;
  DateTimeRange? _dateRange;
  bool _excludeEmptyComponents = true;

  String _currentStepText = 'Preparing report data...';
  double _progress = 0.0;
  String? _errorMessage;
  Uint8List? _generatedPdfBytes;
  File? _savedFile;
  final List<ComponentReportData> _compiledComponents = [];

  Future<void> _startGeneration() async {
    setState(() {
      _status = _ReportStatus.generating;
      _errorMessage = null;
      _progress = 0.0;
      _compiledComponents.clear();
      _currentStepText =
          'Fetching usage records (0/${widget.selectedSections.length})...';
    });

    try {
      final usageRepo = ref.read(usageRecordRepositoryProvider);
      final calcService = const UsageCalculationService();
      final total = widget.selectedSections.length;

      for (int i = 0; i < total; i++) {
        final section = widget.selectedSections[i];
        if (!mounted) return;
        setState(() {
          _currentStepText =
              'Fetching usage records for "${section.name}" (${i + 1}/$total)...';
          _progress = (i + 0.5) / total;
        });

        final records = await usageRepo.getRecords(section.id);
        final allRows = calcService.calculate(records);

        // Filter rows based on date range
        final filteredRows = _dateRange != null
            ? allRows
                .where((r) => ReportFilterHelper.isDateInRange(r.date, _dateRange))
                .toList()
            : allRows;

        if (!_excludeEmptyComponents || filteredRows.isNotEmpty) {
          final catName = section.categoryId != null
              ? widget.categoryNames[section.categoryId]
              : null;

          _compiledComponents.add(
            ComponentReportData(
              section: section,
              categoryName: catName,
              rows: filteredRows,
            ),
          );
        }

        if (!mounted) return;
        setState(() {
          _progress = (i + 1) / total;
        });
      }

      // Check if all compiled components have 0 records
      final totalRecords =
          _compiledComponents.fold<int>(0, (sum, c) => sum + c.rows.length);

      if (_compiledComponents.isEmpty || totalRecords == 0) {
        if (!mounted) return;
        setState(() {
          _status = _ReportStatus.empty;
        });
        return;
      }

      if (!mounted) return;
      setState(() {
        _currentStepText = 'Generating combined PDF document...';
      });

      final dateRangeText =
          ReportFilterHelper.getDisplayText(_datePreset, _dateRange);

      const pdfService = PdfService();
      final pdfBytes = await pdfService.generateMultiComponentReportPdf(
        machine: widget.machine,
        components: _compiledComponents,
        dateRangeText: _datePreset == ReportDatePreset.allTime ? null : dateRangeText,
      );

      final file = await pdfService.saveMultiComponentPdfFile(
        machine: widget.machine,
        components: _compiledComponents,
        dateRangeText: _datePreset == ReportDatePreset.allTime ? null : dateRangeText,
      );

      if (!mounted) return;
      setState(() {
        _generatedPdfBytes = pdfBytes;
        _savedFile = file;
        _status = _ReportStatus.completed;
      });

      // Directly open share modal after PDF creation
      await _share();
    } catch (e, st) {
      AppLogger.error('Failed to generate multi-component PDF report', e, st);
      if (!mounted) return;
      setState(() {
        _status = _ReportStatus.error;
        _errorMessage = e.toString();
      });
    }
  }

  Future<void> _openOrPreview() async {
    if (_generatedPdfBytes == null) return;
    try {
      await Printing.layoutPdf(
        onLayout: (format) async => _generatedPdfBytes!,
        name: 'EquipTrack_${widget.machine.name}_Component_Report',
      );
    } catch (e, st) {
      AppLogger.error('Failed to preview PDF', e, st);
    }
  }

  Future<void> _share() async {
    if (_savedFile == null) return;
    try {
      final count = _compiledComponents.length;
      await SharePlus.instance.share(
        ShareParams(
          text:
              'Usage Report for ${widget.machine.name} ($count ${count == 1 ? "component" : "components"})',
          subject: 'Machine Usage Report: ${widget.machine.name}',
          files: [XFile(_savedFile!.path)],
        ),
      );
    } catch (e, st) {
      AppLogger.error('Failed to share PDF', e, st);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // 1. Configuration / Filter View
    if (_status == _ReportStatus.configuring) {
      final count = widget.selectedSections.length;
      return AppDialog(
        title: 'Export PDF Report',
        icon: Icons.picture_as_pdf_outlined,
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 380),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Summary card
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
                      Icons.precision_manufacturing_rounded,
                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${widget.machine.name} • $count ${count == 1 ? "component" : "components"}',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Date Filter Section
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
              const SizedBox(height: 10),

              // Exclude empty components toggle
              InkWell(
                onTap: () {
                  setState(() {
                    _excludeEmptyComponents = !_excludeEmptyComponents;
                  });
                },
                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      SizedBox(
                        height: 24,
                        width: 24,
                        child: Checkbox(
                          value: _excludeEmptyComponents,
                          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          onChanged: (val) {
                            setState(() {
                              _excludeEmptyComponents = val ?? true;
                            });
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Skip components with 0 records',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurface,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        actions: [
          AppButton(
            text: 'Cancel',
            variant: AppButtonVariant.outline,
            size: AppButtonSize.small,
            onPressed: () => Navigator.of(context).pop(),
          ),
          const SizedBox(width: 8),
          AppButton(
            text: 'Generate PDF',
            icon: Icons.picture_as_pdf_rounded,
            size: AppButtonSize.small,
            onPressed: _startGeneration,
          ),
        ],
      );
    }

    // 2. Generating View
    if (_status == _ReportStatus.generating) {
      return AppDialog(
        title: 'Generating PDF Report',
        icon: Icons.picture_as_pdf_outlined,
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 8),
              SizedBox(
                width: 52,
                height: 52,
                child: CircularProgressIndicator(
                  value: _progress > 0 ? _progress : null,
                  strokeWidth: 3.5,
                  backgroundColor: isDark
                      ? AppColors.surfaceContainerHighDark
                      : AppColors.surfaceContainerHighLight,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Generating PDF...',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
              Text(
                _currentStepText,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: _progress > 0 ? _progress : null,
                  minHeight: 6,
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
        actions: const [],
      );
    }

    // 3. Empty Records View (No records found -> PDF not generated)
    if (_status == _ReportStatus.empty) {
      return AppDialog(
        title: 'No Records to Export',
        icon: Icons.warning_amber_rounded,
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: isDark
                      ? AppColors.warningContainerDark
                      : AppColors.warningContainer,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.info_outline_rounded,
                  color: AppColors.warning,
                  size: 28,
                ),
              ),
              const SizedBox(height: 14),
              Text(
                'No usage records found',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
              Text(
                'The selected components have no usage records for "${ReportFilterHelper.getDisplayText(_datePreset, _dateRange)}".\n\nPDF was not generated.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  height: 1.4,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
        actions: [
          AppButton(
            text: 'Close',
            variant: AppButtonVariant.outline,
            size: AppButtonSize.small,
            onPressed: () => Navigator.of(context).pop(),
          ),
          const SizedBox(width: 8),
          AppButton(
            text: 'Change Filter',
            icon: Icons.filter_alt_outlined,
            size: AppButtonSize.small,
            onPressed: () {
              setState(() {
                _status = _ReportStatus.configuring;
              });
            },
          ),
        ],
      );
    }

    // 4. Error View
    if (_status == _ReportStatus.error) {
      return AppDialog(
        title: 'PDF Generation Failed',
        icon: Icons.error_outline_rounded,
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'An error occurred while compiling the report.',
                style: theme.textTheme.bodyMedium,
              ),
              const SizedBox(height: 8),
              if (_errorMessage != null)
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.errorContainerDark
                        : AppColors.errorContainer,
                    borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: AppColors.error, fontSize: 12),
                  ),
                ),
            ],
          ),
        ),
        actions: [
          AppButton(
            text: 'Close',
            variant: AppButtonVariant.outline,
            size: AppButtonSize.small,
            onPressed: () => Navigator.of(context).pop(),
          ),
          const SizedBox(width: 8),
          AppButton(
            text: 'Retry',
            size: AppButtonSize.small,
            onPressed: _startGeneration,
          ),
        ],
      );
    }

    // 5. Success State
    final count = _compiledComponents.length;
    final dateRangeLabel =
        ReportFilterHelper.getDisplayText(_datePreset, _dateRange);

    return AppDialog(
      title: 'Report Ready',
      icon: Icons.check_circle_outline_rounded,
      content: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 380),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: isDark
                    ? AppColors.successContainerDark
                    : AppColors.successContainer,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.picture_as_pdf_rounded,
                color: AppColors.success,
                size: 28,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'PDF generated successfully.',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Text(
              '${widget.machine.name} • $count ${count == 1 ? "component" : "components"} included',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            if (_datePreset != ReportDatePreset.allTime) ...[
              const SizedBox(height: 4),
              Text(
                'Filter: $dateRangeLabel',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                  fontWeight: FontWeight.w600,
                  fontSize: 11,
                ),
                textAlign: TextAlign.center,
              ),
            ],
            const SizedBox(height: 8),
          ],
        ),
      ),
      actions: [
        AppButton(
          text: 'Close',
          variant: AppButtonVariant.outline,
          size: AppButtonSize.small,
          onPressed: () => Navigator.of(context).pop(),
        ),
        const SizedBox(width: 6),
        AppButton(
          text: 'Open',
          icon: Icons.visibility_outlined,
          variant: AppButtonVariant.secondary,
          size: AppButtonSize.small,
          onPressed: _openOrPreview,
        ),
        const SizedBox(width: 6),
        AppButton(
          text: 'Share',
          icon: Icons.share_rounded,
          size: AppButtonSize.small,
          onPressed: _share,
        ),
      ],
    );
  }
}
