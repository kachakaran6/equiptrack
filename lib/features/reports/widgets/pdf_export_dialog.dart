import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/analytics/analytics_event.dart';
import '../../../core/analytics/analytics_service.dart';
import '../../../core/constants/app_keys.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/services/pdf_service.dart';
import '../../../core/services/usage_calculation_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/app_logger.dart';
import '../../../core/widgets/app_button.dart';
import '../../../data/repositories/category_repository.dart';
import '../../../data/repositories/usage_record_repository.dart';
import '../../../models/machine.dart';
import '../../../models/section.dart';
import '../../../models/usage_record.dart';
import '../models/report_filter_options.dart';
import 'report_date_filter_selector.dart';

enum PdfExportStatus {
  ready,
  exporting,
  completed,
  empty,
  error,
}

/// Large, professional, responsive PDF Export Dialog for EquipTrack.
/// Supports both single-section and multi-component reports with clear visual hierarchy,
/// responsive sizing for desktop/tablet/mobile, and full lifecycle state management.
class PdfExportDialog extends ConsumerStatefulWidget {
  final Machine machine;
  final List<Section> sections;
  final List<UsageRecord>? initialRecords; // For single-section if already loaded
  final Map<String, String>? categoryNames; // categoryId -> categoryName

  const PdfExportDialog({
    super.key,
    required this.machine,
    required this.sections,
    this.initialRecords,
    this.categoryNames,
  });

  /// Opens the PDF export dialog for a single section/component
  static Future<void> showSingle(
    BuildContext context, {
    required Machine machine,
    required Section section,
    required List<UsageRecord> records,
    String? categoryName,
  }) {
    final catMap = categoryName != null && section.categoryId != null
        ? {section.categoryId!: categoryName}
        : <String, String>{};

    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => PdfExportDialog(
        machine: machine,
        sections: [section],
        initialRecords: records,
        categoryNames: catMap,
      ),
    );
  }

  /// Opens the PDF export dialog for multiple sections/components
  static Future<void> showMulti(
    BuildContext context, {
    required Machine machine,
    required List<Section> selectedSections,
    required Map<String, String> categoryNames,
  }) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => PdfExportDialog(
        machine: machine,
        sections: selectedSections,
        categoryNames: categoryNames,
      ),
    );
  }

  @override
  ConsumerState<PdfExportDialog> createState() => _PdfExportDialogState();
}

class _PdfExportDialogState extends ConsumerState<PdfExportDialog> {
  PdfExportStatus _status = PdfExportStatus.ready;
  ReportDatePreset _datePreset = ReportDatePreset.allTime;
  DateTimeRange? _dateRange;
  bool _excludeEmptyComponents = true;

  bool _isExporting = false;
  String _currentStepText = 'Preparing report data...';
  double _progress = 0.0;
  String? _errorMessage;
  Uint8List? _generatedPdfBytes;
  File? _savedFile;
  final List<ComponentReportData> _compiledComponents = [];
  int _calculatedTotalRecords = 0;

  bool get isMultiComponent => widget.sections.length > 1;

  @override
  void initState() {
    super.initState();
    if (!isMultiComponent && widget.initialRecords != null) {
      _calculatedTotalRecords = widget.initialRecords!.length;
    }
  }

  Future<void> _startExport() async {
    if (_isExporting) return; // Prevent duplicate execution

    setState(() {
      _isExporting = true;
      _status = PdfExportStatus.exporting;
      _errorMessage = null;
      _progress = 0.0;
      _compiledComponents.clear();
      _currentStepText = isMultiComponent
          ? 'Fetching records (0/${widget.sections.length})...'
          : 'Compiling usage records...';
    });

    final stopwatch = Stopwatch()..start();
    final exportType = isMultiComponent ? 'multi_component' : 'single_section';

    try {
      final usageRepo = ref.read(usageRecordRepositoryProvider);
      const calcService = UsageCalculationService();
      final total = widget.sections.length;

      // Track export started with safe metadata
      await AnalyticsService.instance.track(
        AnalyticsEvent.reportExportStarted,
        {
          'format': 'pdf',
          'export_type': exportType,
          'component_count': total,
        },
      );

      for (int i = 0; i < total; i++) {
        final section = widget.sections[i];
        if (!mounted) return;

        setState(() {
          _currentStepText = isMultiComponent
              ? 'Loading records for "${section.name}" (${i + 1}/$total)...'
              : 'Processing records for "${section.name}"...';
          _progress = (i + 0.4) / total;
        });

        List<UsageRecord> records;
        if (!isMultiComponent && widget.initialRecords != null) {
          records = widget.initialRecords!;
        } else {
          records = await usageRepo.getRecords(section.id);
        }

        final allRows = calcService.calculate(records);

        // Filter rows based on selected date range
        final filteredRows = _dateRange != null
            ? allRows
                .where((r) => ReportFilterHelper.isDateInRange(r.date, _dateRange))
                .toList()
            : allRows;

        if (!isMultiComponent || !_excludeEmptyComponents || filteredRows.isNotEmpty) {
          String? catName;
          if (widget.categoryNames != null && section.categoryId != null) {
            catName = widget.categoryNames![section.categoryId];
          } else if (section.categoryId != null) {
            final cats = ref.read(categoriesStreamFamily(widget.machine.id)).value;
            catName = cats?.where((c) => c.id == section.categoryId).firstOrNull?.name;
          }

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
          _progress = (i + 0.8) / total;
        });
      }

      final totalRecords =
          _compiledComponents.fold<int>(0, (sum, c) => sum + c.rows.length);
      _calculatedTotalRecords = totalRecords;

      if (_compiledComponents.isEmpty || totalRecords == 0) {
        if (!mounted) return;
        setState(() {
          _isExporting = false;
          _status = PdfExportStatus.empty;
        });
        return;
      }

      if (!mounted) return;
      setState(() {
        _currentStepText = 'Generating high-resolution PDF document...';
        _progress = 0.95;
      });

      final dateRangeText = _datePreset == ReportDatePreset.allTime
          ? null
          : ReportFilterHelper.getDisplayText(_datePreset, _dateRange);

      const pdfService = PdfService();
      final pdfBytes = await pdfService.generateMultiComponentReportPdf(
        machine: widget.machine,
        components: _compiledComponents,
        dateRangeText: dateRangeText,
      );

      final file = await pdfService.saveMultiComponentPdfFile(
        machine: widget.machine,
        components: _compiledComponents,
        dateRangeText: dateRangeText,
      );

      if (!mounted) return;
      setState(() {
        _generatedPdfBytes = pdfBytes;
        _savedFile = file;
        _progress = 1.0;
        _isExporting = false;
        _status = PdfExportStatus.completed;
      });

      // Track export completed successfully
      await AnalyticsService.instance.track(
        AnalyticsEvent.reportExportCompleted,
        {
          'format': 'pdf',
          'export_type': exportType,
          'component_count': _compiledComponents.length,
          'record_count': totalRecords,
          'duration_ms': stopwatch.elapsedMilliseconds,
        },
      );
    } catch (e, st) {
      AppLogger.error('Failed to generate PDF report', e, st);

      // Track export failure with safe duration and error type
      await AnalyticsService.instance.track(
        AnalyticsEvent.reportExportFailed,
        {
          'format': 'pdf',
          'export_type': exportType,
          'duration_ms': stopwatch.elapsedMilliseconds,
          'error_type': e.runtimeType.toString(),
        },
      );

      if (!mounted) return;
      setState(() {
        _isExporting = false;
        _status = PdfExportStatus.error;
        _errorMessage = _formatSafeErrorMessage(e);
      });
    }
  }

  String _formatSafeErrorMessage(dynamic error) {
    final raw = error.toString();
    if (raw.contains('ValidationFailure')) {
      return 'No records available to export for the selected filter.';
    }
    if (raw.contains('SocketException') || raw.contains('Network')) {
      return 'Network communication error while loading records. Please check your connection and try again.';
    }
    return 'Unable to generate PDF report. Please check your data and try again.';
  }

  Future<void> _openOrPreview() async {
    if (_generatedPdfBytes == null) return;
    try {
      await Printing.layoutPdf(
        onLayout: (format) async => _generatedPdfBytes!,
        name: 'EquipTrack_${widget.machine.name}_Report',
      );
    } catch (e, st) {
      AppLogger.error('Failed to preview PDF', e, st);
    }
  }

  Future<void> _share() async {
    if (_savedFile == null) return;
    try {
      final count = _compiledComponents.length;
      final desc = isMultiComponent
          ? 'Usage Report for ${widget.machine.name} ($count ${count == 1 ? "component" : "components"})'
          : 'Usage Report for ${widget.machine.name} - ${widget.sections.first.name}';

      await SharePlus.instance.share(
        ShareParams(
          text: desc,
          subject: 'Machine Usage Report: ${widget.machine.name}',
          files: [XFile(_savedFile!.path)],
        ),
      );
    } catch (e, st) {
      AppLogger.error('Failed to share PDF', e, st);
    }
  }

  int _getDisplayRecordCount() {
    if (widget.initialRecords != null && !isMultiComponent) {
      if (_dateRange == null) return widget.initialRecords!.length;
      return widget.initialRecords!
          .where((r) => ReportFilterHelper.isDateInRange(r.usageDate, _dateRange))
          .length;
    }
    return _calculatedTotalRecords;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final screenSize = MediaQuery.of(context).size;
    final isDesktopOrTablet = screenSize.width >= 600;

    final dialogBg = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;

    return Dialog(
      backgroundColor: dialogBg,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        side: BorderSide(color: borderColor, width: 1),
      ),
      insetPadding: EdgeInsets.symmetric(
        horizontal: isDesktopOrTablet ? 40 : 16,
        vertical: isDesktopOrTablet ? 36 : 24,
      ),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: 580,
          maxHeight: screenSize.height * 0.88,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Fixed Header
              _buildHeader(context, theme, isDark, borderColor),

              // 2. Scrollable Content Area
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                  physics: const ClampingScrollPhysics(),
                  child: _buildBodyContent(context, theme, isDark, borderColor),
                ),
              ),

              // 3. Fixed Footer Actions
              _buildFooterActions(context, theme, isDark, borderColor),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(
    BuildContext context,
    ThemeData theme,
    bool isDark,
    Color borderColor,
  ) {
    String titleText = 'Export PDF Report';
    String subtitleText = 'Export your usage report as a PDF.';

    if (_status == PdfExportStatus.exporting) {
      titleText = 'Generating PDF Report';
      subtitleText = 'Compiling document records and formatting pages...';
    } else if (_status == PdfExportStatus.completed) {
      titleText = 'PDF Ready';
      subtitleText = 'Your report document has been generated.';
    } else if (_status == PdfExportStatus.empty) {
      titleText = 'No Records Found';
      subtitleText = 'Selected date range contains no usage records.';
    } else if (_status == PdfExportStatus.error) {
      titleText = 'PDF Generation Failed';
      subtitleText = 'An error occurred during report generation.';
    }

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 12, 14),
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.surfaceContainerDark.withAlpha(120)
            : AppColors.surfaceContainerLight.withAlpha(180),
        border: Border(bottom: BorderSide(color: borderColor, width: 1)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.error.withAlpha(isDark ? 40 : 25),
              borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
            ),
            child: const Icon(
              Icons.picture_as_pdf_rounded,
              size: 20,
              color: AppColors.error,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  titleText,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: theme.colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitleText,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close_rounded, size: 20),
            splashRadius: 18,
            onPressed: _isExporting ? null : () => Navigator.of(context).pop(),
            tooltip: 'Close',
          ),
        ],
      ),
    );
  }

  Widget _buildBodyContent(
    BuildContext context,
    ThemeData theme,
    bool isDark,
    Color borderColor,
  ) {
    switch (_status) {
      case PdfExportStatus.ready:
        return _buildReadyState(context, theme, isDark, borderColor);
      case PdfExportStatus.exporting:
        return _buildExportingState(context, theme, isDark);
      case PdfExportStatus.completed:
        return _buildSuccessState(context, theme, isDark, borderColor);
      case PdfExportStatus.empty:
        return _buildEmptyState(context, theme, isDark, borderColor);
      case PdfExportStatus.error:
        return _buildErrorState(context, theme, isDark, borderColor);
    }
  }

  Widget _buildReadyState(
    BuildContext context,
    ThemeData theme,
    bool isDark,
    Color borderColor,
  ) {
    final recordCount = _getDisplayRecordCount();
    final componentCount = widget.sections.length;
    final dateDisplayText =
        ReportFilterHelper.getDisplayText(_datePreset, _dateRange);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. Report Summary Card
        Text(
          'REPORT SUMMARY',
          style: theme.textTheme.labelSmall?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isDark
                ? AppColors.surfaceContainerDark
                : AppColors.surfaceContainerLight,
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            border: Border.all(color: borderColor),
          ),
          child: Column(
            children: [
              _buildSummaryRow(
                icon: Icons.precision_manufacturing_rounded,
                label: 'Machine',
                value: widget.machine.name,
                theme: theme,
                isDark: isDark,
              ),
              Divider(height: 16, color: borderColor),
              _buildSummaryRow(
                icon: Icons.view_in_ar_rounded,
                label: isMultiComponent ? 'Components' : 'Section',
                value: isMultiComponent
                    ? '$componentCount ${componentCount == 1 ? "component" : "components"} selected'
                    : widget.sections.first.name,
                theme: theme,
                isDark: isDark,
              ),
              if (!isMultiComponent) ...[
                Divider(height: 16, color: borderColor),
                _buildSummaryRow(
                  icon: Icons.receipt_long_rounded,
                  label: 'Usage Records',
                  value: '$recordCount ${recordCount == 1 ? "record" : "records"}',
                  theme: theme,
                  isDark: isDark,
                ),
              ],
              Divider(height: 16, color: borderColor),
              _buildSummaryRow(
                icon: Icons.calendar_month_rounded,
                label: 'Date Range',
                value: dateDisplayText,
                theme: theme,
                isDark: isDark,
                highlightValue: _datePreset != ReportDatePreset.allTime,
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // 2. Export Format Card
        Text(
          'EXPORT FORMAT',
          style: theme.textTheme.labelSmall?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isDark
                ? AppColors.surfaceContainerDark
                : AppColors.surfaceContainerLight,
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            border: Border.all(
              color: isDark ? AppColors.primary.withAlpha(120) : AppColors.primary.withAlpha(80),
            ),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isDark
                      ? AppColors.primaryLight.withAlpha(30)
                      : AppColors.primary.withAlpha(20),
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
                      'PDF Document (.pdf)',
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'A4 document layout ready for printing, archiving, or sharing',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.primary : AppColors.primary,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text(
                  'A4',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // 3. Date Range Filter Configuration
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

        // Multi-component skip empty toggle
        if (isMultiComponent) ...[
          const SizedBox(height: 12),
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
                      'Skip components with 0 records in selected range',
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

        // Zero record warning on single-section
        if (!isMultiComponent && recordCount == 0) ...[
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark
                  ? AppColors.warningContainerDark.withAlpha(80)
                  : AppColors.warningContainer.withAlpha(120),
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
              border: Border.all(
                color: isDark ? AppColors.warning.withAlpha(100) : AppColors.warning.withAlpha(80),
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
                    'No usage records recorded for "$dateDisplayText". Select another date filter to export.',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: isDark ? Colors.amber[200] : Colors.brown[800],
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildSummaryRow({
    required IconData icon,
    required String label,
    required String value,
    required ThemeData theme,
    required bool isDark,
    bool highlightValue = false,
  }) {
    return Row(
      children: [
        Icon(
          icon,
          size: 16,
          color: theme.colorScheme.onSurfaceVariant,
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
            fontSize: 12,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.end,
            overflow: TextOverflow.ellipsis,
            maxLines: 1,
            style: theme.textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w600,
              fontSize: 12,
              color: highlightValue
                  ? (isDark ? AppColors.primaryLight : AppColors.primary)
                  : theme.colorScheme.onSurface,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildExportingState(
    BuildContext context,
    ThemeData theme,
    bool isDark,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          SizedBox(
            width: 56,
            height: 56,
            child: CircularProgressIndicator(
              value: _progress > 0 ? _progress : null,
              strokeWidth: 4,
              backgroundColor: isDark
                  ? AppColors.surfaceContainerHighDark
                  : AppColors.surfaceContainerHighLight,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Generating PDF…',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            _currentStepText,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: _progress > 0 ? _progress : null,
              minHeight: 6,
            ),
          ),
          const SizedBox(height: 10),
        ],
      ),
    );
  }

  Widget _buildSuccessState(
    BuildContext context,
    ThemeData theme,
    bool isDark,
    Color borderColor,
  ) {
    final count = _compiledComponents.length;
    final totalRecords = _calculatedTotalRecords;
    final dateRangeLabel =
        ReportFilterHelper.getDisplayText(_datePreset, _dateRange);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(
            color: isDark
                ? AppColors.successContainerDark
                : AppColors.successContainer,
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.check_circle_rounded,
            color: AppColors.success,
            size: 32,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'PDF Generated Successfully',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 6),
        Text(
          isMultiComponent
              ? '${widget.machine.name} • $count ${count == 1 ? "component" : "components"} ($totalRecords ${totalRecords == 1 ? "record" : "records"})'
              : '${widget.machine.name} • ${widget.sections.first.name} ($totalRecords ${totalRecords == 1 ? "record" : "records"})',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
          textAlign: TextAlign.center,
        ),
        if (_datePreset != ReportDatePreset.allTime) ...[
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: (isDark ? AppColors.primaryLight : AppColors.primary).withAlpha(20),
              borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
            ),
            child: Text(
              'Filter: $dateRangeLabel',
              style: TextStyle(
                color: isDark ? AppColors.primaryLight : AppColors.primary,
                fontWeight: FontWeight.w600,
                fontSize: 11,
              ),
            ),
          ),
        ],
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildEmptyState(
    BuildContext context,
    ThemeData theme,
    bool isDark,
    Color borderColor,
  ) {
    final dateRangeLabel =
        ReportFilterHelper.getDisplayText(_datePreset, _dateRange);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          width: 56,
          height: 56,
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
        const SizedBox(height: 16),
        Text(
          'No records to export',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          'No usage records were found for "$dateRangeLabel".\n\nSelect another date filter to generate the PDF.',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
            height: 1.4,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 12),
      ],
    );
  }

  Widget _buildErrorState(
    BuildContext context,
    ThemeData theme,
    bool isDark,
    Color borderColor,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: isDark
                ? AppColors.errorContainerDark
                : AppColors.errorContainer,
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.error_outline_rounded,
            color: AppColors.error,
            size: 28,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Could not generate PDF',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isDark
                ? AppColors.errorContainerDark.withAlpha(80)
                : AppColors.errorContainer.withAlpha(120),
            borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
            border: Border.all(
              color: AppColors.error.withAlpha(80),
            ),
          ),
          child: Text(
            _errorMessage ?? 'An unexpected error occurred during export.',
            style: const TextStyle(
              color: AppColors.error,
              fontSize: 12,
            ),
            textAlign: TextAlign.center,
          ),
        ),
        const SizedBox(height: 12),
      ],
    );
  }

  Widget _buildFooterActions(
    BuildContext context,
    ThemeData theme,
    bool isDark,
    Color borderColor,
  ) {
    if (_status == PdfExportStatus.exporting) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        decoration: BoxDecoration(
          color: isDark
              ? AppColors.surfaceContainerDark.withAlpha(80)
              : AppColors.surfaceContainerLight.withAlpha(120),
          border: Border(top: BorderSide(color: borderColor, width: 1)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: const [
            Text(
              'Export in progress...',
              style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic),
            ),
          ],
        ),
      );
    }

    if (_status == PdfExportStatus.completed) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        decoration: BoxDecoration(
          color: isDark
              ? AppColors.surfaceContainerDark.withAlpha(80)
              : AppColors.surfaceContainerLight.withAlpha(120),
          border: Border(top: BorderSide(color: borderColor, width: 1)),
        ),
        child: Wrap(
          alignment: WrapAlignment.end,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 8,
          runSpacing: 8,
          children: [
            AppButton(
              text: 'Close',
              variant: AppButtonVariant.outline,
              size: AppButtonSize.medium,
              onPressed: () => Navigator.of(context).pop(),
            ),
            AppButton(
              text: 'Preview / Print',
              icon: Icons.visibility_outlined,
              variant: AppButtonVariant.secondary,
              size: AppButtonSize.medium,
              onPressed: _openOrPreview,
            ),
            AppButton(
              text: 'Share PDF',
              icon: Icons.share_rounded,
              variant: AppButtonVariant.primary,
              size: AppButtonSize.medium,
              onPressed: _share,
            ),
          ],
        ),
      );
    }

    if (_status == PdfExportStatus.empty) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        decoration: BoxDecoration(
          color: isDark
              ? AppColors.surfaceContainerDark.withAlpha(80)
              : AppColors.surfaceContainerLight.withAlpha(120),
          border: Border(top: BorderSide(color: borderColor, width: 1)),
        ),
        child: Wrap(
          alignment: WrapAlignment.end,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 8,
          runSpacing: 8,
          children: [
            AppButton(
              text: 'Cancel',
              variant: AppButtonVariant.outline,
              size: AppButtonSize.medium,
              onPressed: () => Navigator.of(context).pop(),
            ),
            AppButton(
              text: 'Change Filter',
              icon: Icons.filter_alt_outlined,
              size: AppButtonSize.medium,
              onPressed: () {
                setState(() {
                  _status = PdfExportStatus.ready;
                });
              },
            ),
          ],
        ),
      );
    }

    if (_status == PdfExportStatus.error) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        decoration: BoxDecoration(
          color: isDark
              ? AppColors.surfaceContainerDark.withAlpha(80)
              : AppColors.surfaceContainerLight.withAlpha(120),
          border: Border(top: BorderSide(color: borderColor, width: 1)),
        ),
        child: Wrap(
          alignment: WrapAlignment.end,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 8,
          runSpacing: 8,
          children: [
            AppButton(
              text: 'Cancel',
              variant: AppButtonVariant.outline,
              size: AppButtonSize.medium,
              onPressed: () => Navigator.of(context).pop(),
            ),
            AppButton(
              text: 'Try Again',
              icon: Icons.refresh_rounded,
              size: AppButtonSize.medium,
              onPressed: _startExport,
            ),
          ],
        ),
      );
    }

    // Default READY State Actions
    final hasRecords = _getDisplayRecordCount() > 0 || isMultiComponent;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.surfaceContainerDark.withAlpha(80)
            : AppColors.surfaceContainerLight.withAlpha(120),
        border: Border(top: BorderSide(color: borderColor, width: 1)),
      ),
      child: Wrap(
        alignment: WrapAlignment.end,
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: 8,
        runSpacing: 8,
        children: [
          AppButton(
            text: 'Cancel',
            variant: AppButtonVariant.outline,
            size: AppButtonSize.medium,
            onPressed: () => Navigator.of(context).pop(),
          ),
          AppButton(
            keyString: AppKeys.exportPdfButton,
            text: 'Export PDF',
            icon: Icons.picture_as_pdf_rounded,
            variant: AppButtonVariant.primary,
            size: AppButtonSize.medium,
            isLoading: _isExporting,
            onPressed: hasRecords && !_isExporting ? _startExport : null,
          ),
        ],
      ),
    );
  }
}
