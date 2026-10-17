import 'dart:io';
import 'dart:typed_data';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';

import '../../models/calculated_usage_row.dart';
import '../../models/inventory_models.dart';
import '../../models/machine.dart';
import '../../models/section.dart';
import '../constants/app_constants.dart';
import '../errors/app_failure.dart';
import '../extensions/date_extensions.dart';
import '../utils/app_logger.dart';

/// Data class holding component details and usage records for PDF generation
class ComponentReportData {
  final Section section;
  final String? categoryName;
  final List<CalculatedUsageRow> rows;

  const ComponentReportData({
    required this.section,
    this.categoryName,
    required this.rows,
  });
}

class PdfService {
  const PdfService();

  // Standard styling colors
  static const primaryPdfColor = PdfColor.fromInt(0xFF1E3A8A);
  static const headerBgColor = PdfColor.fromInt(0xFFF1F5F9);
  static const textDarkColor = PdfColor.fromInt(0xFF0F172A);
  static const textMutedColor = PdfColor.fromInt(0xFF64748B);
  static const borderRowColor = PdfColor.fromInt(0xFFE2E8F0);

  /// Generates a combined A4 PDF report with one or more components.
  /// Each component starts on its own page and follows the exact same standard report layout.
  Future<Uint8List> generateMultiComponentReportPdf({
    required Machine machine,
    required List<ComponentReportData> components,
    String? dateRangeText,
    DateTime? generatedAt,
  }) async {
    final totalRows = components.fold<int>(0, (sum, c) => sum + c.rows.length);
    if (components.isEmpty || totalRows == 0) {
      throw const ValidationFailure('Cannot generate PDF: No usage records found in the selected components.');
    }

    final timestamp = generatedAt ?? DateTime.now();
    final title = components.length == 1
        ? 'Machine Usage Report - ${machine.name} - ${components.first.section.name}'
        : 'Machine Usage Report - ${machine.name}';

    final pdf = pw.Document(
      title: title,
      author: AppConstants.appName,
    );

    for (final comp in components) {
      pdf.addPage(
        pw.MultiPage(
          pageFormat: PdfPageFormat.a4,
          margin: const pw.EdgeInsets.all(36),
          header: (pw.Context context) {
            return pw.Container(
              margin: const pw.EdgeInsets.only(bottom: 16),
              padding: const pw.EdgeInsets.only(bottom: 8),
              decoration: const pw.BoxDecoration(
                border: pw.Border(
                  bottom: pw.BorderSide(color: borderRowColor, width: 1),
                ),
              ),
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(
                    'MACHINE USAGE REPORT',
                    style: pw.TextStyle(
                      fontSize: 14,
                      fontWeight: pw.FontWeight.bold,
                      color: primaryPdfColor,
                    ),
                  ),
                  pw.Text(
                    'Page ${context.pageNumber} of ${context.pagesCount}',
                    style: const pw.TextStyle(
                      fontSize: 10,
                      color: textMutedColor,
                    ),
                  ),
                ],
              ),
            );
          },
          footer: (pw.Context context) {
            return pw.Container(
              margin: const pw.EdgeInsets.only(top: 16),
              padding: const pw.EdgeInsets.only(top: 8),
              decoration: const pw.BoxDecoration(
                border: pw.Border(
                  top: pw.BorderSide(color: borderRowColor, width: 0.5),
                ),
              ),
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(
                    'Generated on ${timestamp.toReadableDateTime()}',
                    style: const pw.TextStyle(fontSize: 9, color: textMutedColor),
                  ),
                  pw.Text(
                    AppConstants.appName,
                    style: const pw.TextStyle(fontSize: 9, color: textMutedColor),
                  ),
                ],
              ),
            );
          },
          build: (pw.Context context) {
            final categoryDisplay = (comp.categoryName != null && comp.categoryName!.trim().isNotEmpty)
                ? comp.categoryName!.trim()
                : 'Uncategorized';

            return [
              // Report Header Details Box
              pw.Container(
                padding: const pw.EdgeInsets.all(14),
                decoration: pw.BoxDecoration(
                  color: headerBgColor,
                  borderRadius: const pw.BorderRadius.all(pw.Radius.circular(6)),
                  border: pw.Border.all(color: borderRowColor),
                ),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Expanded(
                          child: pw.Column(
                            crossAxisAlignment: pw.CrossAxisAlignment.start,
                            children: [
                              pw.Text(
                                'MACHINE',
                                style: const pw.TextStyle(
                                  fontSize: 9,
                                  color: textMutedColor,
                                ),
                              ),
                              pw.SizedBox(height: 2),
                              pw.Text(
                                machine.name,
                                style: pw.TextStyle(
                                  fontSize: 16,
                                  fontWeight: pw.FontWeight.bold,
                                  color: textDarkColor,
                                ),
                              ),
                              pw.SizedBox(height: 6),
                              pw.Row(
                                children: [
                                  pw.Text(
                                    'CATEGORY: ',
                                    style: pw.TextStyle(
                                      fontSize: 9,
                                      fontWeight: pw.FontWeight.bold,
                                      color: textMutedColor,
                                    ),
                                  ),
                                  pw.Text(
                                    categoryDisplay,
                                    style: pw.TextStyle(
                                      fontSize: 10,
                                      fontWeight: pw.FontWeight.bold,
                                      color: textDarkColor,
                                    ),
                                  ),
                                ],
                              ),
                              if (dateRangeText != null && dateRangeText.isNotEmpty) ...[
                                pw.SizedBox(height: 4),
                                pw.Row(
                                  children: [
                                    pw.Text(
                                      'DATE FILTER: ',
                                      style: pw.TextStyle(
                                        fontSize: 9,
                                        fontWeight: pw.FontWeight.bold,
                                        color: textMutedColor,
                                      ),
                                    ),
                                    pw.Text(
                                      dateRangeText,
                                      style: pw.TextStyle(
                                        fontSize: 10,
                                        fontWeight: pw.FontWeight.bold,
                                        color: textDarkColor,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ),
                        pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.end,
                          children: [
                            pw.Text(
                              'SECTION / COMPONENT',
                              style: const pw.TextStyle(
                                fontSize: 9,
                                color: textMutedColor,
                              ),
                            ),
                            pw.SizedBox(height: 2),
                            pw.Text(
                              comp.section.name,
                              style: pw.TextStyle(
                                fontSize: 16,
                                fontWeight: pw.FontWeight.bold,
                                color: primaryPdfColor,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    if (machine.description != null &&
                        machine.description!.trim().isNotEmpty) ...[
                      pw.SizedBox(height: 8),
                      pw.Text(
                        'Description: ${machine.description!.trim()}',
                        style: const pw.TextStyle(
                          fontSize: 10,
                          color: textMutedColor,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              pw.SizedBox(height: 20),

              // Usage Records Table
              pw.TableHelper.fromTextArray(
                headers: ['Name', 'Date', 'Usage Days'],
                headerStyle: pw.TextStyle(
                  fontSize: 11,
                  fontWeight: pw.FontWeight.bold,
                  color: textDarkColor,
                ),
                headerDecoration: const pw.BoxDecoration(
                  color: headerBgColor,
                ),
                headerPadding: const pw.EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 8,
                ),
                cellPadding: const pw.EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 7,
                ),
                cellAlignments: {
                  0: pw.Alignment.centerLeft,
                  1: pw.Alignment.center,
                  2: pw.Alignment.centerRight,
                },
                cellStyle: const pw.TextStyle(
                  fontSize: 10,
                  color: textDarkColor,
                ),
                border: pw.TableBorder.all(
                  color: borderRowColor,
                  width: 0.5,
                ),
                data: comp.rows.map((row) {
                  return [
                    row.name,
                    row.formattedDate,
                    row.isRunning ? AppConstants.runningText : '${row.usageDays}',
                  ];
                }).toList(),
              ),

              if (comp.rows.isEmpty) ...[
                pw.Container(
                  padding: const pw.EdgeInsets.all(20),
                  alignment: pw.Alignment.center,
                  child: pw.Text(
                    'No usage records recorded for this section.',
                    style: const pw.TextStyle(fontSize: 10, color: textMutedColor),
                  ),
                ),
              ],
            ];
          },
        ),
      );
    }

    return pdf.save();
  }

  /// Generates an A4 PDF document for a single section usage history.
  /// Reuses the exact same multi-component builder for 100% layout consistency.
  Future<Uint8List> generateUsageReportPdf({
    required Machine machine,
    required Section section,
    required List<CalculatedUsageRow> rows,
    String? categoryName,
    String? dateRangeText,
    DateTime? generatedAt,
  }) async {
    return generateMultiComponentReportPdf(
      machine: machine,
      components: [
        ComponentReportData(
          section: section,
          categoryName: categoryName,
          rows: rows,
        ),
      ],
      dateRangeText: dateRangeText,
      generatedAt: generatedAt,
    );
  }

  /// Generates and writes multi-component PDF to temporary storage
  Future<File> saveMultiComponentPdfFile({
    required Machine machine,
    required List<ComponentReportData> components,
    String? dateRangeText,
  }) async {
    final pdfBytes = await generateMultiComponentReportPdf(
      machine: machine,
      components: components,
      dateRangeText: dateRangeText,
    );
    final tempDir = await getTemporaryDirectory();
    final sanitizedMachine = machine.name.replaceAll(RegExp(r'[^\w\s]+'), '_').trim();
    final fileName = 'EquipTrack_${sanitizedMachine}_Component_Report_${DateTime.now().toFileTimestamp()}.pdf';
    final file = File('${tempDir.path}/$fileName');
    await file.writeAsBytes(pdfBytes, flush: true);
    return file;
  }

  /// Share multi-component PDF via native sharing sheet
  Future<void> shareMultiComponentPdf({
    required Machine machine,
    required List<ComponentReportData> components,
    String? dateRangeText,
  }) async {
    try {
      final file = await saveMultiComponentPdfFile(
        machine: machine,
        components: components,
        dateRangeText: dateRangeText,
      );

      final count = components.length;
      await SharePlus.instance.share(
        ShareParams(
          text: 'Usage Report for ${machine.name} ($count ${count == 1 ? "component" : "components"})',
          subject: 'Machine Usage Report: ${machine.name}',
          files: [XFile(file.path)],
        ),
      );
    } catch (e, st) {
      AppLogger.error('Failed to share multi-component PDF', e, st);
      rethrow;
    }
  }

  /// Preview or print multi-component PDF via native dialog
  Future<void> printOrPreviewMultiComponentPdf({
    required Machine machine,
    required List<ComponentReportData> components,
    String? dateRangeText,
  }) async {
    final pdfBytes = await generateMultiComponentReportPdf(
      machine: machine,
      components: components,
      dateRangeText: dateRangeText,
    );

    await Printing.layoutPdf(
      onLayout: (format) async => pdfBytes,
      name: 'EquipTrack_${machine.name}_Component_Report',
    );
  }

  /// Share or open the generated single section PDF file
  Future<void> sharePdf({
    required Machine machine,
    required Section section,
    required List<CalculatedUsageRow> rows,
    String? categoryName,
    String? dateRangeText,
  }) async {
    try {
      final pdfBytes = await generateUsageReportPdf(
        machine: machine,
        section: section,
        rows: rows,
        categoryName: categoryName,
        dateRangeText: dateRangeText,
      );

      final tempDir = await getTemporaryDirectory();
      final sanitizedMachine = machine.name.replaceAll(RegExp(r'[^\w\s]+'), '_');
      final sanitizedSection = section.name.replaceAll(RegExp(r'[^\w\s]+'), '_');
      final fileName = 'Report_${sanitizedMachine}_${sanitizedSection}_${DateTime.now().toFileTimestamp()}.pdf';
      final file = File('${tempDir.path}/$fileName');
      await file.writeAsBytes(pdfBytes, flush: true);

      await SharePlus.instance.share(
        ShareParams(
          text: 'Usage Report for ${machine.name} - ${section.name}',
          subject: 'Machine Usage Report: ${machine.name}',
          files: [XFile(file.path)],
        ),
      );
    } catch (e, st) {
      AppLogger.error('Failed to share PDF', e, st);
      rethrow;
    }
  }

  /// Print or open the native PDF preview dialog for single section
  Future<void> printOrPreview({
    required Machine machine,
    required Section section,
    required List<CalculatedUsageRow> rows,
    String? categoryName,
    String? dateRangeText,
  }) async {
    final pdfBytes = await generateUsageReportPdf(
      machine: machine,
      section: section,
      rows: rows,
      categoryName: categoryName,
      dateRangeText: dateRangeText,
    );

    await Printing.layoutPdf(
      onLayout: (format) async => pdfBytes,
      name: 'Report_${machine.name}_${section.name}',
    );
  }

  static String _sanitizePdfText(String? input) {
    if (input == null) return '';
    return input
        .replaceAll('•', ' | ')
        .replaceAll('·', ' | ')
        .replaceAll('—', '-')
        .replaceAll('–', '-')
        .replaceAll('’', "'")
        .replaceAll('‘', "'")
        .replaceAll('“', '"')
        .replaceAll('”', '"')
        .trim();
  }

  /// Generates a structured A4 PDF report with a separate page per sub-product.
  /// Each sub-product page has a 4-column tabular structure:
  /// 1. Date
  /// 2. Notes
  /// 3. Type
  /// 4. Amount
  /// Every sub-product begins on a new page, and only sub-products with transactions are included.
  Future<Uint8List> generateInventoryStockReportPdf({
    required String productName,
    required List<InventoryTransaction> transactions,
    String? subProductSummary,
    Map<String, String>? subProductNamesMap,
    String? filterType,
    String? dateRangeText,
    DateTime? generatedAt,
  }) async {
    if (transactions.isEmpty) {
      throw const ValidationFailure('Cannot generate PDF: No inventory transactions found to export.');
    }

    final timestamp = generatedAt ?? DateTime.now();
    final title = subProductSummary != null && subProductSummary.trim().isNotEmpty
        ? 'Stock Report - ${_sanitizePdfText(productName)} - ${_sanitizePdfText(subProductSummary)}'
        : 'Stock Report - ${_sanitizePdfText(productName)}';

    final pdf = pw.Document(
      title: title,
      author: AppConstants.appName,
    );

    int sortTransactions(InventoryTransaction a, InventoryTransaction b) {
      final dateA = DateTime.tryParse(a.date) ?? a.createdAt;
      final dateB = DateTime.tryParse(b.date) ?? b.createdAt;
      final cmp = dateB.compareTo(dateA);
      if (cmp != 0) return cmp;
      return b.createdAt.compareTo(a.createdAt);
    }

    // Build sub-product groups. Only sub-products with at least 1 transaction get a page.
    final List<_SubProductReportGroup> groups = [];

    if (subProductSummary != null && subProductSummary.trim().isNotEmpty) {
      final sorted = List<InventoryTransaction>.from(transactions)..sort(sortTransactions);
      groups.add(_SubProductReportGroup(
        subProductId: sorted.first.subProductId,
        productName: productName.trim().isNotEmpty
            ? productName.trim()
            : (sorted.first.productName.trim().isNotEmpty ? sorted.first.productName.trim() : 'Product'),
        subProductSummary: subProductSummary.trim(),
        transactions: sorted,
      ));
    } else {
      final Map<String, List<InventoryTransaction>> grouped = {};
      for (final t in transactions) {
        final key = t.subProductId.trim().isNotEmpty
            ? t.subProductId.trim()
            : (t.subProductValues.isNotEmpty
                ? t.subProductValues.entries.map((e) => '${e.key}:${e.value}').join('|')
                : 'prod_${t.productId}');
        grouped.putIfAbsent(key, () => []).add(t);
      }

      for (final entry in grouped.entries) {
        final groupTxs = entry.value;
        if (groupTxs.isEmpty) continue; // Only sub-products with IN or OUT transactions

        final sorted = List<InventoryTransaction>.from(groupTxs)..sort(sortTransactions);

        // Determine human-readable summary
        String summary = '';
        if (subProductNamesMap != null && subProductNamesMap.containsKey(entry.key)) {
          summary = subProductNamesMap[entry.key]!;
        } else {
          final txWithValues = sorted.where((t) => t.subProductValues.isNotEmpty).firstOrNull;
          if (txWithValues != null) {
            summary = txWithValues.subProductValues.entries
                .map((e) => '${e.key}: ${e.value}')
                .join(' | ');
          }
        }

        if (summary.isEmpty) {
          summary = 'Default / Main Item';
        }

        final txWithProdName = sorted.where((t) => t.productName.trim().isNotEmpty).firstOrNull;
        final effectiveProd = txWithProdName != null && txWithProdName.productName.trim().isNotEmpty
            ? txWithProdName.productName.trim()
            : (productName.trim().isNotEmpty && productName != 'All Products' ? productName.trim() : 'Product');

        groups.add(_SubProductReportGroup(
          subProductId: entry.key,
          productName: effectiveProd,
          subProductSummary: summary,
          transactions: sorted,
        ));
      }

      // Sort groups alphabetically by product name then sub-product summary
      groups.sort((a, b) {
        final pCmp = a.productName.compareTo(b.productName);
        if (pCmp != 0) return pCmp;
        return a.subProductSummary.compareTo(b.subProductSummary);
      });
    }

    if (groups.isEmpty) {
      throw const ValidationFailure('Cannot generate PDF: No inventory transactions found to export.');
    }

    // Generate a dedicated page (pw.MultiPage) for every sub-product
    for (final group in groups) {
      final subTransactions = group.transactions;
      final totalIn = subTransactions.where((t) => t.type == 'IN').fold<int>(0, (s, t) => s + t.quantity);
      final totalOut = subTransactions.where((t) => t.type == 'OUT').fold<int>(0, (s, t) => s + t.quantity);
      final netChange = totalIn - totalOut;

      final sanitizedProdName = _sanitizePdfText(group.productName);
      final sanitizedSubSummary = _sanitizePdfText(group.subProductSummary);
      final sanitizedDateFilter = _sanitizePdfText(dateRangeText);

      pdf.addPage(
        pw.MultiPage(
          pageFormat: PdfPageFormat.a4,
          margin: const pw.EdgeInsets.all(36),
          header: (pw.Context context) {
            return pw.Container(
              margin: const pw.EdgeInsets.only(bottom: 14),
              padding: const pw.EdgeInsets.only(bottom: 8),
              decoration: const pw.BoxDecoration(
                border: pw.Border(
                  bottom: pw.BorderSide(color: borderRowColor, width: 1),
                ),
              ),
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(
                    'EQUIPTRACK INVENTORY STOCK REPORT',
                    style: pw.TextStyle(
                      fontSize: 12,
                      fontWeight: pw.FontWeight.bold,
                      color: primaryPdfColor,
                    ),
                  ),
                  pw.Text(
                    'Page ${context.pageNumber} of ${context.pagesCount}',
                    style: const pw.TextStyle(
                      fontSize: 8.5,
                      color: textMutedColor,
                    ),
                  ),
                ],
              ),
            );
          },
          footer: (pw.Context context) {
            return pw.Container(
              margin: const pw.EdgeInsets.only(top: 14),
              padding: const pw.EdgeInsets.only(top: 8),
              decoration: const pw.BoxDecoration(
                border: pw.Border(
                  top: pw.BorderSide(color: borderRowColor, width: 1),
                ),
              ),
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(
                    'EquipTrack - Confidential Inventory Record',
                    style: const pw.TextStyle(fontSize: 8, color: textMutedColor),
                  ),
                  pw.Text(
                    'Generated on ${timestamp.toReadableDateTime()}',
                    style: const pw.TextStyle(fontSize: 8, color: textMutedColor),
                  ),
                ],
              ),
            );
          },
          build: (pw.Context context) {
            return [
              // Top Summary Card for this Sub-Product
              pw.Container(
                padding: const pw.EdgeInsets.all(12),
                decoration: pw.BoxDecoration(
                  color: headerBgColor,
                  borderRadius: pw.BorderRadius.circular(6),
                  border: pw.Border.all(color: borderRowColor),
                ),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: pw.CrossAxisAlignment.center,
                  children: [
                    pw.Expanded(
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text(
                            'PRODUCT: ${sanitizedProdName.toUpperCase()}',
                            style: pw.TextStyle(
                              fontSize: 11,
                              fontWeight: pw.FontWeight.bold,
                              color: textDarkColor,
                            ),
                          ),
                          pw.SizedBox(height: 3),
                          pw.Text(
                            'SUB-PRODUCT: $sanitizedSubSummary',
                            style: pw.TextStyle(
                              fontSize: 10,
                              fontWeight: pw.FontWeight.bold,
                              color: primaryPdfColor,
                            ),
                          ),
                          pw.SizedBox(height: 4),
                          pw.Text(
                            'Filter: ${filterType ?? "ALL"}  |  Transactions: ${subTransactions.length}',
                            style: const pw.TextStyle(fontSize: 8, color: textMutedColor),
                          ),
                          if (sanitizedDateFilter.isNotEmpty) ...[
                            pw.SizedBox(height: 2),
                            pw.Row(
                              children: [
                                pw.Text(
                                  'Date Filter: ',
                                  style: pw.TextStyle(
                                    fontSize: 8,
                                    fontWeight: pw.FontWeight.bold,
                                    color: textMutedColor,
                                  ),
                                ),
                                pw.Text(
                                  sanitizedDateFilter,
                                  style: pw.TextStyle(
                                    fontSize: 8,
                                    fontWeight: pw.FontWeight.bold,
                                    color: textDarkColor,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                    pw.SizedBox(width: 12),
                    pw.Row(
                      children: [
                        pw.Container(
                          padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: pw.BoxDecoration(
                            color: const PdfColor(0.85, 0.95, 0.88),
                            borderRadius: pw.BorderRadius.circular(4),
                            border: pw.Border.all(color: const PdfColor(0.7, 0.9, 0.75), width: 0.5),
                          ),
                          child: pw.Column(
                            children: [
                              pw.Text('TOTAL IN', style: const pw.TextStyle(fontSize: 7.5, color: PdfColors.green900)),
                              pw.SizedBox(height: 2),
                              pw.Text('+$totalIn', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: PdfColors.green900)),
                            ],
                          ),
                        ),
                        pw.SizedBox(width: 6),
                        pw.Container(
                          padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: pw.BoxDecoration(
                            color: const PdfColor(0.98, 0.88, 0.88),
                            borderRadius: pw.BorderRadius.circular(4),
                            border: pw.Border.all(color: const PdfColor(0.95, 0.75, 0.75), width: 0.5),
                          ),
                          child: pw.Column(
                            children: [
                              pw.Text('TOTAL OUT', style: const pw.TextStyle(fontSize: 7.5, color: PdfColors.red900)),
                              pw.SizedBox(height: 2),
                              pw.Text('-$totalOut', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: PdfColors.red900)),
                            ],
                          ),
                        ),
                        pw.SizedBox(width: 6),
                        pw.Container(
                          padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: pw.BoxDecoration(
                            color: const PdfColor(0.9, 0.93, 0.98),
                            borderRadius: pw.BorderRadius.circular(4),
                            border: pw.Border.all(color: const PdfColor(0.75, 0.82, 0.95), width: 0.5),
                          ),
                          child: pw.Column(
                            children: [
                              pw.Text('NET STOCK', style: const pw.TextStyle(fontSize: 7.5, color: primaryPdfColor)),
                              pw.SizedBox(height: 2),
                              pw.Text('$netChange', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: primaryPdfColor)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              pw.SizedBox(height: 14),

              // 4 Columns Table: Date, Notes, Type, Amount
              pw.TableHelper.fromTextArray(
                border: pw.TableBorder.all(color: borderRowColor, width: 0.5),
                headerStyle: pw.TextStyle(
                  color: textDarkColor,
                  fontWeight: pw.FontWeight.bold,
                  fontSize: 9.5,
                ),
                headerDecoration: const pw.BoxDecoration(color: headerBgColor),
                headerPadding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                cellPadding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                cellStyle: const pw.TextStyle(fontSize: 8.5, color: textDarkColor),
                cellAlignments: {
                  0: pw.Alignment.centerLeft,
                  1: pw.Alignment.centerLeft,
                  2: pw.Alignment.center,
                  3: pw.Alignment.centerRight,
                },
                headers: ['Date', 'Notes', 'Type', 'Amount'],
                columnWidths: {
                  0: const pw.FixedColumnWidth(85),
                  1: const pw.FlexColumnWidth(1),
                  2: const pw.FixedColumnWidth(60),
                  3: const pw.FixedColumnWidth(75),
                },
                data: subTransactions.map((t) {
                  final notes = t.remarks?.trim().isNotEmpty == true ? _sanitizePdfText(t.remarks!) : '-';
                  final qtyDisplay = t.isIn ? '+${t.quantity}' : '-${t.quantity}';
                  return [
                    t.displayDate.isNotEmpty ? t.displayDate : (t.date.isNotEmpty ? t.date : '-'),
                    notes,
                    t.type.toUpperCase(),
                    qtyDisplay,
                  ];
                }).toList(),
              ),
            ];
          },
        ),
      );
    }

    return pdf.save();
  }

  /// Generates and writes inventory PDF to temporary storage
  Future<File> saveInventoryStockReportPdfFile({
    required String productName,
    required List<InventoryTransaction> transactions,
    String? subProductSummary,
    Map<String, String>? subProductNamesMap,
    String? filterType,
    String? dateRangeText,
    DateTime? generatedAt,
  }) async {
    final pdfBytes = await generateInventoryStockReportPdf(
      productName: productName,
      transactions: transactions,
      subProductSummary: subProductSummary,
      subProductNamesMap: subProductNamesMap,
      filterType: filterType,
      dateRangeText: dateRangeText,
      generatedAt: generatedAt,
    );
    final tempDir = await getTemporaryDirectory();
    final sanitizedProduct = productName.replaceAll(RegExp(r'[^\w\s]+'), '_').trim();
    final fileName = 'EquipTrack_${sanitizedProduct}_Stock_Report_${DateTime.now().toFileTimestamp()}.pdf';
    final file = File('${tempDir.path}/$fileName');
    await file.writeAsBytes(pdfBytes, flush: true);
    return file;
  }

  /// Print or preview inventory stock report PDF via native dialog
  Future<void> printOrPreviewInventoryStockReportPdf({
    required String productName,
    required List<InventoryTransaction> transactions,
    String? subProductSummary,
    Map<String, String>? subProductNamesMap,
    String? filterType,
    String? dateRangeText,
  }) async {
    final pdfBytes = await generateInventoryStockReportPdf(
      productName: productName,
      transactions: transactions,
      subProductSummary: subProductSummary,
      subProductNamesMap: subProductNamesMap,
      filterType: filterType,
      dateRangeText: dateRangeText,
    );

    await Printing.layoutPdf(
      onLayout: (format) async => pdfBytes,
      name: 'EquipTrack_${productName.replaceAll(RegExp(r"[^\w\s]+"), "_")}_Stock_Report',
    );
  }

  /// Share inventory stock report PDF file via native sharing sheet
  Future<void> shareInventoryStockReportPdf({
    required String productName,
    required List<InventoryTransaction> transactions,
    String? subProductSummary,
    Map<String, String>? subProductNamesMap,
    String? filterType,
    String? dateRangeText,
  }) async {
    try {
      final file = await saveInventoryStockReportPdfFile(
        productName: productName,
        transactions: transactions,
        subProductSummary: subProductSummary,
        subProductNamesMap: subProductNamesMap,
        filterType: filterType,
        dateRangeText: dateRangeText,
      );

      await SharePlus.instance.share(
        ShareParams(
          text: 'Stock Report for $productName (${transactions.length} transactions)',
          subject: 'Stock Report: $productName',
          files: [XFile(file.path)],
        ),
      );
    } catch (e, st) {
      AppLogger.error('Failed to share inventory PDF', e, st);
      rethrow;
    }
  }
}

class _SubProductReportGroup {
  final String subProductId;
  final String productName;
  final String subProductSummary;
  final List<InventoryTransaction> transactions;

  _SubProductReportGroup({
    required this.subProductId,
    required this.productName,
    required this.subProductSummary,
    required this.transactions,
  });
}

