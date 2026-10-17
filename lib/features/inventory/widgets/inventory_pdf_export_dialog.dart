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
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/app_logger.dart';
import '../../../core/widgets/app_button.dart';
import '../../../data/repositories/inventory_repository.dart';
import '../../../models/inventory_models.dart';
import '../../reports/models/report_filter_options.dart';
import '../../reports/widgets/report_date_filter_selector.dart';
import '../controllers/inventory_controller.dart';

enum InventoryPdfExportStatus {
  ready,
  exporting,
  completed,
  empty,
  error,
}

/// Large, professional, responsive PDF Export Dialog for Inventory Stock Reports.
/// Mirrors the Machine PDF export dialog with date preset filtering, transaction type filtering,
/// live statistics, progress feedback, native PDF preview/print, and OS sharing.
class InventoryPdfExportDialog extends ConsumerStatefulWidget {
  final InventoryProduct? product;
  final String? productName;
  final String? productId;
  final String? subProductId;
  final String? subProductSummary;
  final List<InventoryTransaction>? initialTransactions;
  final String? initialType; // 'ALL', 'IN', 'OUT'

  const InventoryPdfExportDialog({
    super.key,
    this.product,
    this.productName,
    this.productId,
    this.subProductId,
    this.subProductSummary,
    this.initialTransactions,
    this.initialType,
  });

  /// Opens the PDF export dialog for an inventory stock report
  static Future<void> show(
    BuildContext context, {
    InventoryProduct? product,
    String? productName,
    String? productId,
    String? subProductId,
    String? subProductSummary,
    List<InventoryTransaction>? initialTransactions,
    String? initialType,
  }) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => InventoryPdfExportDialog(
        product: product,
        productName: productName,
        productId: productId,
        subProductId: subProductId,
        subProductSummary: subProductSummary,
        initialTransactions: initialTransactions,
        initialType: initialType,
      ),
    );
  }

  @override
  ConsumerState<InventoryPdfExportDialog> createState() => _InventoryPdfExportDialogState();
}

class _InventoryPdfExportDialogState extends ConsumerState<InventoryPdfExportDialog> {
  InventoryPdfExportStatus _status = InventoryPdfExportStatus.ready;
  ReportDatePreset _datePreset = ReportDatePreset.allTime;
  DateTimeRange? _dateRange;
  late String _selectedType; // 'ALL', 'IN', 'OUT'

  bool _isExporting = false;
  String _currentStepText = 'Preparing inventory report...';
  double _progress = 0.0;
  String? _errorMessage;
  Uint8List? _generatedPdfBytes;
  File? _savedFile;

  List<InventoryTransaction>? _cachedTransactions;
  bool _isLoadingTransactions = false;

  String get effectiveProductName {
    if (widget.product != null && widget.product!.name.isNotEmpty) {
      return widget.product!.name;
    }
    if (widget.productName != null && widget.productName!.isNotEmpty) {
      return widget.productName!;
    }
    if (_cachedTransactions != null && _cachedTransactions!.isNotEmpty) {
      final firstWithProd = _cachedTransactions!.where((t) => t.productName.isNotEmpty).firstOrNull;
      if (firstWithProd != null) return firstWithProd.productName;
    }
    return 'All Products';
  }

  String? get effectiveProductId {
    if (widget.product != null && widget.product!.id.isNotEmpty) {
      return widget.product!.id;
    }
    return widget.productId;
  }

  @override
  void initState() {
    super.initState();
    _selectedType = (widget.initialType ?? 'ALL').toUpperCase();
    if (_selectedType != 'IN' && _selectedType != 'OUT') {
      _selectedType = 'ALL';
    }

    if (widget.initialTransactions != null) {
      _cachedTransactions = List.from(widget.initialTransactions!);
    } else {
      _loadTransactionsIfNeeded();
    }
  }

  Future<void> _loadTransactionsIfNeeded() async {
    final prodId = effectiveProductId;
    setState(() {
      _isLoadingTransactions = true;
    });

    try {
      final repo = ref.read(inventoryRepositoryProvider);
      final txs = await repo.getTransactions(
        productId: prodId,
        subProductId: widget.subProductId,
        limit: 1000,
      );
      if (mounted) {
        setState(() {
          _cachedTransactions = txs;
          _isLoadingTransactions = false;
        });
      }
    } catch (e, st) {
      AppLogger.error('Failed to pre-load inventory transactions for export', e, st);
      if (mounted) {
        setState(() {
          _isLoadingTransactions = false;
        });
      }
    }
  }

  List<InventoryTransaction> _getFilteredTransactions() {
    final raw = _cachedTransactions ?? [];
    return raw.where((t) {
      // 1. Product ID filter if specified
      final prodId = effectiveProductId;
      if (prodId != null && prodId.isNotEmpty && t.productId.isNotEmpty) {
        if (t.productId != prodId) return false;
      }

      // 1b. Sub Product ID filter if specified
      if (widget.subProductId != null && widget.subProductId!.isNotEmpty) {
        if (t.subProductId != widget.subProductId) return false;
      }

      // 2. Transaction Type filter
      if (_selectedType == 'IN' && !t.isIn) return false;
      if (_selectedType == 'OUT' && !t.isOut) return false;

      // 3. Date Range filter
      if (_dateRange != null) {
        final txDate = DateTime.tryParse(t.date) ?? t.createdAt;
        if (!ReportFilterHelper.isDateInRange(txDate, _dateRange)) {
          return false;
        }
      }

      return true;
    }).toList();
  }

  Future<void> _startExport() async {
    if (_isExporting) return;

    setState(() {
      _isExporting = true;
      _status = InventoryPdfExportStatus.exporting;
      _errorMessage = null;
      _progress = 0.0;
      _currentStepText = 'Compiling inventory transactions...';
    });

    final stopwatch = Stopwatch()..start();

    try {
      // Step 1: Ensure transactions are loaded
      if (_cachedTransactions == null) {
        setState(() {
          _currentStepText = 'Fetching transactions from database...';
          _progress = 0.2;
        });
        final repo = ref.read(inventoryRepositoryProvider);
        _cachedTransactions = await repo.getTransactions(
          productId: effectiveProductId,
          subProductId: widget.subProductId,
          limit: 1000,
        );
      }

      final filtered = _getFilteredTransactions();

      if (filtered.isEmpty) {
        if (!mounted) return;
        setState(() {
          _isExporting = false;
          _status = InventoryPdfExportStatus.empty;
        });
        return;
      }

      // Track export started
      await AnalyticsService.instance.track(
        AnalyticsEvent.reportExportStarted,
        {
          'format': 'pdf',
          'export_type': 'inventory_stock',
          'product_name': effectiveProductName,
          'sub_product': widget.subProductSummary ?? '',
          'transaction_count': filtered.length,
          'type_filter': _selectedType,
        },
      );

      if (!mounted) return;
      setState(() {
        _currentStepText = 'Generating high-resolution PDF document...';
        _progress = 0.6;
      });

      final dateRangeText = _datePreset == ReportDatePreset.allTime
          ? null
          : ReportFilterHelper.getDisplayText(_datePreset, _dateRange);

      final products = ref.read(inventoryProductsProvider).asData?.value ?? [];
      final subProductNamesMap = <String, String>{};
      for (final p in products) {
        for (final sub in p.subProducts) {
          if (sub.values.isNotEmpty) {
            subProductNamesMap[sub.id] = sub.values.entries.map((e) => '${e.key}: ${e.value}').join(' | ');
          }
        }
      }
      if (widget.product != null) {
        for (final sub in widget.product!.subProducts) {
          if (sub.values.isNotEmpty) {
            subProductNamesMap[sub.id] = sub.values.entries.map((e) => '${e.key}: ${e.value}').join(' | ');
          }
        }
      }

      const pdfService = PdfService();
      final pdfBytes = await pdfService.generateInventoryStockReportPdf(
        productName: effectiveProductName,
        subProductSummary: widget.subProductSummary,
        subProductNamesMap: subProductNamesMap,
        transactions: filtered,
        filterType: _selectedType,
        dateRangeText: dateRangeText,
      );

      if (!mounted) return;
      setState(() {
        _currentStepText = 'Saving PDF document file...';
        _progress = 0.85;
      });

      final file = await pdfService.saveInventoryStockReportPdfFile(
        productName: effectiveProductName,
        subProductSummary: widget.subProductSummary,
        subProductNamesMap: subProductNamesMap,
        transactions: filtered,
        filterType: _selectedType,
        dateRangeText: dateRangeText,
      );

      if (!mounted) return;
      setState(() {
        _generatedPdfBytes = pdfBytes;
        _savedFile = file;
        _progress = 1.0;
        _isExporting = false;
        _status = InventoryPdfExportStatus.completed;
      });

      // Track export completed
      await AnalyticsService.instance.track(
        AnalyticsEvent.reportExportCompleted,
        {
          'format': 'pdf',
          'export_type': 'inventory_stock',
          'product_name': effectiveProductName,
          'transaction_count': filtered.length,
          'duration_ms': stopwatch.elapsedMilliseconds,
        },
      );
    } catch (e, st) {
      AppLogger.error('Failed to generate inventory stock PDF', e, st);

      await AnalyticsService.instance.track(
        AnalyticsEvent.reportExportFailed,
        {
          'format': 'pdf',
          'export_type': 'inventory_stock',
          'duration_ms': stopwatch.elapsedMilliseconds,
          'error_type': e.runtimeType.toString(),
        },
      );

      if (!mounted) return;
      setState(() {
        _isExporting = false;
        _status = InventoryPdfExportStatus.error;
        _errorMessage = _formatErrorMessage(e);
      });
    }
  }

  String _formatErrorMessage(dynamic error) {
    final raw = error.toString();
    if (raw.contains('ValidationFailure')) {
      return 'No transactions available to export for the selected filter.';
    }
    if (raw.contains('SocketException') || raw.contains('Network')) {
      return 'Network communication error while loading transactions. Please check your connection and try again.';
    }
    return 'Unable to generate inventory PDF. Please check your data and try again.';
  }

  Future<void> _openOrPreview() async {
    if (_generatedPdfBytes == null) return;
    try {
      final subPart = widget.subProductSummary != null && widget.subProductSummary!.isNotEmpty
          ? '_${widget.subProductSummary!.replaceAll(RegExp(r"[^\w\s]+"), "_")}'
          : '';
      final sanitizedName = '$effectiveProductName$subPart'.replaceAll(RegExp(r"[^\w\s]+"), "_");
      await Printing.layoutPdf(
        onLayout: (format) async => _generatedPdfBytes!,
        name: 'EquipTrack_${sanitizedName}_Stock_Report',
      );
    } catch (e, st) {
      AppLogger.error('Failed to preview inventory PDF', e, st);
    }
  }

  Future<void> _share() async {
    if (_savedFile == null) return;
    try {
      final filtered = _getFilteredTransactions();
      final subTitle = widget.subProductSummary != null && widget.subProductSummary!.isNotEmpty
          ? ' - ${widget.subProductSummary}'
          : '';
      await SharePlus.instance.share(
        ShareParams(
          text: 'Stock Report for $effectiveProductName$subTitle (${filtered.length} transactions)',
          subject: 'Inventory Stock Report: $effectiveProductName$subTitle',
          files: [XFile(_savedFile!.path)],
        ),
      );
    } catch (e, st) {
      AppLogger.error('Failed to share inventory PDF', e, st);
    }
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
              // 1. Header with icon and title
              _buildHeader(context, theme, isDark, borderColor),

              // 2. Scrollable content
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                  physics: const ClampingScrollPhysics(),
                  child: _buildBodyContent(context, theme, isDark, borderColor),
                ),
              ),

              // 3. Footer actions
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
    String titleText = 'Export Stock Report (PDF)';
    String subtitleText = 'Export inventory stock records as a high-resolution PDF.';

    if (_status == InventoryPdfExportStatus.exporting) {
      titleText = 'Generating Stock Report';
      subtitleText = 'Compiling inventory records and formatting pages...';
    } else if (_status == InventoryPdfExportStatus.completed) {
      titleText = 'PDF Ready';
      subtitleText = 'Your inventory report document has been generated.';
    } else if (_status == InventoryPdfExportStatus.empty) {
      titleText = 'No Records Found';
      subtitleText = 'Selected filter criteria contains no stock transactions.';
    } else if (_status == InventoryPdfExportStatus.error) {
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
                  ),
                ),
              ],
            ),
          ),
          if (!_isExporting)
            IconButton(
              icon: const Icon(Icons.close_rounded, size: 20),
              splashRadius: 20,
              onPressed: () => Navigator.of(context).pop(),
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
    if (_status == InventoryPdfExportStatus.exporting) {
      return _buildExportingState(context, theme, isDark);
    }

    if (_status == InventoryPdfExportStatus.completed) {
      return _buildSuccessState(context, theme, isDark, borderColor);
    }

    if (_status == InventoryPdfExportStatus.empty) {
      return _buildEmptyState(context, theme, isDark, borderColor);
    }

    if (_status == InventoryPdfExportStatus.error) {
      return _buildErrorState(context, theme, isDark);
    }

    // Default READY State Configuration
    final filtered = _getFilteredTransactions();
    final count = filtered.length;
    final totalIn = filtered.where((t) => t.isIn).fold<int>(0, (s, t) => s + t.quantity);
    final totalOut = filtered.where((t) => t.isOut).fold<int>(0, (s, t) => s + t.quantity);
    final netStock = totalIn - totalOut;

    final dateDisplayText = ReportFilterHelper.getDisplayText(_datePreset, _dateRange);

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
            color: isDark ? AppColors.surfaceContainerDark : AppColors.surfaceContainerLight,
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            border: Border.all(color: borderColor),
          ),
          child: Column(
            children: [
              _buildSummaryRow(
                icon: Icons.inventory_2_rounded,
                label: 'Product',
                value: effectiveProductName,
                theme: theme,
                isDark: isDark,
              ),
              if (widget.subProductSummary != null && widget.subProductSummary!.isNotEmpty) ...[
                Divider(height: 16, color: borderColor),
                _buildSummaryRow(
                  icon: Icons.account_tree_outlined,
                  label: 'Sub Product',
                  value: widget.subProductSummary!,
                  theme: theme,
                  isDark: isDark,
                  highlightValue: true,
                ),
              ],
              Divider(height: 16, color: borderColor),
              _buildSummaryRow(
                icon: Icons.filter_list_rounded,
                label: 'Transaction Type',
                value: _selectedType == 'ALL' ? 'All Types (In & Out)' : _selectedType,
                theme: theme,
                isDark: isDark,
              ),
              Divider(height: 16, color: borderColor),
              _buildSummaryRow(
                icon: Icons.receipt_long_rounded,
                label: 'Transactions',
                value: _isLoadingTransactions
                    ? 'Loading...'
                    : '$count ${count == 1 ? "transaction" : "transactions"}',
                theme: theme,
                isDark: isDark,
              ),
              Divider(height: 16, color: borderColor),
              _buildSummaryRow(
                icon: Icons.calendar_month_rounded,
                label: 'Date Range',
                value: dateDisplayText,
                theme: theme,
                isDark: isDark,
                highlightValue: _datePreset != ReportDatePreset.allTime,
              ),
              if (!_isLoadingTransactions && count > 0) ...[
                Divider(height: 16, color: borderColor),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF059669).withAlpha(isDark ? 35 : 20),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Column(
                          children: [
                            const Text('TOTAL IN', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                            const SizedBox(height: 2),
                            Text('+$totalIn', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444).withAlpha(isDark ? 35 : 20),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Column(
                          children: [
                            const Text('TOTAL OUT', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFFEF4444))),
                            const SizedBox(height: 2),
                            Text('-$totalOut', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFFEF4444))),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
                        decoration: BoxDecoration(
                          color: (isDark ? AppColors.primaryLight : AppColors.primary).withAlpha(isDark ? 35 : 20),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Column(
                          children: [
                            Text(
                              'NET STOCK',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: isDark ? AppColors.primaryLight : AppColors.primary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '$netStock',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: isDark ? AppColors.primaryLight : AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
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
            color: isDark ? AppColors.surfaceContainerDark : AppColors.surfaceContainerLight,
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
                  color: isDark ? AppColors.primaryLight.withAlpha(30) : AppColors.primary.withAlpha(20),
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
                      'Per sub-product dedicated pages with 4-column table (Date, Notes, Type, Amount)',
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
                  color: AppColors.primary,
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

        // 3. Transaction Type Selector
        Text(
          'TRANSACTION TYPE FILTER',
          style: theme.textTheme.labelSmall?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: borderColor),
          ),
          child: Row(
            children: [
              _buildTypeTab('ALL', 'All (In & Out)', isDark),
              _buildTypeTab('IN', 'In (+)', isDark),
              _buildTypeTab('OUT', 'Out (-)', isDark),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // 4. Date Range Filter Configuration
        ReportDateFilterSelector(
          selectedPreset: _datePreset,
          selectedRange: _dateRange,
          onPresetChanged: (preset) {
            setState(() {
              _datePreset = preset;
              _dateRange = ReportFilterHelper.getRangeForPreset(preset, customRange: _dateRange);
            });
          },
          onRangeChanged: (range) {
            setState(() {
              _dateRange = range;
            });
          },
        ),

        // Zero records warning
        if (!_isLoadingTransactions && count == 0) ...[
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
                    'No stock transactions recorded for "$dateDisplayText" with type "$_selectedType". Select another filter to export.',
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

  Widget _buildTypeTab(String type, String label, bool isDark) {
    final isSelected = _selectedType == type;
    return Expanded(
      child: InkWell(
        onTap: () {
          setState(() {
            _selectedType = type;
          });
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            border: isSelected
                ? Border.all(color: const Color(0xFF7C3AED), width: 1.5)
                : null,
            borderRadius: BorderRadius.circular(6),
            color: isSelected
                ? (isDark ? const Color(0xFF2E1065) : const Color(0xFFF3E8FF))
                : Colors.transparent,
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              color: isSelected
                  ? const Color(0xFF7C3AED)
                  : (isDark ? Colors.grey[400] : Colors.grey[700]),
            ),
          ),
        ),
      ),
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
    final filtered = _getFilteredTransactions();
    final count = filtered.length;
    final totalIn = filtered.where((t) => t.isIn).fold<int>(0, (s, t) => s + t.quantity);
    final totalOut = filtered.where((t) => t.isOut).fold<int>(0, (s, t) => s + t.quantity);
    final netStock = totalIn - totalOut;
    final dateRangeLabel = ReportFilterHelper.getDisplayText(_datePreset, _dateRange);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(
            color: isDark ? AppColors.successContainerDark : AppColors.successContainer,
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
          '$effectiveProductName • $count ${count == 1 ? "transaction" : "transactions"} (Type: $_selectedType)',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 6,
          alignment: WrapAlignment.center,
          children: [
            if (_datePreset != ReportDatePreset.allTime)
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
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF059669).withAlpha(20),
                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
              ),
              child: Text(
                'In: +$totalIn  |  Out: -$totalOut  |  Net: $netStock',
                style: const TextStyle(
                  color: Color(0xFF059669),
                  fontWeight: FontWeight.w600,
                  fontSize: 11,
                ),
              ),
            ),
          ],
        ),
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
    final dateRangeLabel = ReportFilterHelper.getDisplayText(_datePreset, _dateRange);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: isDark ? AppColors.warningContainerDark : AppColors.warningContainer,
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
          'No transactions to export',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          'No inventory records were found for "$dateRangeLabel" with type filter "$_selectedType".\n\nSelect another filter to generate the PDF.',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
            height: 1.4,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildErrorState(
    BuildContext context,
    ThemeData theme,
    bool isDark,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: isDark ? AppColors.errorContainerDark : AppColors.errorContainer,
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
          'PDF Generation Failed',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.error.withAlpha(isDark ? 30 : 15),
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            border: Border.all(
              color: AppColors.error.withAlpha(isDark ? 80 : 50),
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
    if (_status == InventoryPdfExportStatus.exporting) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        decoration: BoxDecoration(
          color: isDark
              ? AppColors.surfaceContainerDark.withAlpha(80)
              : AppColors.surfaceContainerLight.withAlpha(120),
          border: Border(top: BorderSide(color: borderColor, width: 1)),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            Text(
              'Export in progress...',
              style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic),
            ),
          ],
        ),
      );
    }

    if (_status == InventoryPdfExportStatus.completed) {
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

    if (_status == InventoryPdfExportStatus.empty) {
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
                  _status = InventoryPdfExportStatus.ready;
                });
              },
            ),
          ],
        ),
      );
    }

    if (_status == InventoryPdfExportStatus.error) {
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
    final hasRecords = _getFilteredTransactions().isNotEmpty;

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
