import 'dart:io';
import 'dart:typed_data';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';

import '../../models/calculated_usage_row.dart';
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
}
