import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';

import '../../models/calculated_usage_row.dart';
import '../../models/machine.dart';
import '../../models/section.dart';
import '../constants/app_constants.dart';
import '../extensions/date_extensions.dart';
import '../utils/app_logger.dart';

class PdfService {
  const PdfService();

  /// Generates an A4 PDF document for the section usage history.
  Future<Uint8List> generateUsageReportPdf({
    required Machine machine,
    required Section section,
    required List<CalculatedUsageRow> rows,
    DateTime? generatedAt,
  }) async {
    final pdf = pw.Document(
      title: 'Machine Usage Report - ${machine.name} - ${section.name}',
      author: AppConstants.appName,
    );

    final timestamp = generatedAt ?? DateTime.now();

    // Standard styling colors
    const primaryPdfColor = PdfColor.fromInt(0xFF1E3A8A);
    const headerBgColor = PdfColor.fromInt(0xFFF1F5F9);
    const textDarkColor = PdfColor.fromInt(0xFF0F172A);
    const textMutedColor = PdfColor.fromInt(0xFF64748B);
    const borderRowColor = PdfColor.fromInt(0xFFE2E8F0);

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
                    children: [
                      pw.Column(
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
                        ],
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
                            section.name,
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
                      machine.description!.isNotEmpty) ...[
                    pw.SizedBox(height: 8),
                    pw.Text(
                      'Description: ${machine.description}',
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
              data: rows.map((row) {
                return [
                  row.name,
                  row.formattedDate,
                  row.isRunning ? AppConstants.runningText : '${row.usageDays}',
                ];
              }).toList(),
            ),

            if (rows.isEmpty) ...[
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

    return pdf.save();
  }

  /// Share or open the generated PDF file
  Future<void> sharePdf({
    required Machine machine,
    required Section section,
    required List<CalculatedUsageRow> rows,
  }) async {
    try {
      final pdfBytes = await generateUsageReportPdf(
        machine: machine,
        section: section,
        rows: rows,
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

  /// Print or open the native PDF preview dialog
  Future<void> printOrPreview({
    required Machine machine,
    required Section section,
    required List<CalculatedUsageRow> rows,
  }) async {
    final pdfBytes = await generateUsageReportPdf(
      machine: machine,
      section: section,
      rows: rows,
    );

    await Printing.layoutPdf(
      onLayout: (format) async => pdfBytes,
      name: 'Report_${machine.name}_${section.name}',
    );
  }
}
