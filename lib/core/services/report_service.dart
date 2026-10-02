import 'package:flutter/foundation.dart';

import '../../models/machine.dart';
import '../../models/section.dart';
import '../../models/usage_record.dart';
import '../errors/app_failure.dart';
import '../utils/app_logger.dart';
import 'excel_service.dart';
import 'pdf_service.dart';
import 'usage_calculation_service.dart';

/// Orchestrator service for reports. Ensures that PDF and Excel always use the identical
/// calculated duration rows generated from [UsageCalculationService].
class ReportService {
  final UsageCalculationService calculationService;
  final PdfService pdfService;
  final ExcelService excelService;

  const ReportService({
    this.calculationService = const UsageCalculationService(),
    this.pdfService = const PdfService(),
    this.excelService = const ExcelService(),
  });

  /// Calculate rows and generate PDF bytes
  Future<Uint8List> generatePdf({
    required Machine machine,
    required Section section,
    required List<UsageRecord> records,
  }) async {
    try {
      final rows = calculationService.calculate(records);
      return await pdfService.generateUsageReportPdf(
        machine: machine,
        section: section,
        rows: rows,
      );
    } catch (e, st) {
      AppLogger.error('ReportService: Failed to generate PDF', e, st);
      throw ExportFailure('Failed to generate PDF report: $e');
    }
  }

  /// Calculate rows and generate Excel bytes
  List<int> generateExcel({
    required Machine machine,
    required Section section,
    required List<UsageRecord> records,
  }) {
    try {
      final rows = calculationService.calculate(records);
      return excelService.generateUsageReportExcel(
        machine: machine,
        section: section,
        rows: rows,
      );
    } catch (e, st) {
      AppLogger.error('ReportService: Failed to generate Excel', e, st);
      throw ExportFailure('Failed to generate Excel report: $e');
    }
  }

  /// Share PDF report
  Future<void> sharePdf({
    required Machine machine,
    required Section section,
    required List<UsageRecord> records,
  }) async {
    try {
      final rows = calculationService.calculate(records);
      await pdfService.sharePdf(
        machine: machine,
        section: section,
        rows: rows,
      );
    } catch (e, st) {
      AppLogger.error('ReportService: Failed to share PDF', e, st);
      throw ExportFailure('Failed to share PDF report: $e');
    }
  }

  /// Share Excel report
  Future<void> shareExcel({
    required Machine machine,
    required Section section,
    required List<UsageRecord> records,
  }) async {
    try {
      final rows = calculationService.calculate(records);
      await excelService.shareExcel(
        machine: machine,
        section: section,
        rows: rows,
      );
    } catch (e, st) {
      AppLogger.error('ReportService: Failed to share Excel', e, st);
      throw ExportFailure('Failed to share Excel report: $e');
    }
  }

  /// Print or show native PDF preview
  Future<void> printOrPreviewPdf({
    required Machine machine,
    required Section section,
    required List<UsageRecord> records,
  }) async {
    try {
      final rows = calculationService.calculate(records);
      await pdfService.printOrPreview(
        machine: machine,
        section: section,
        rows: rows,
      );
    } catch (e, st) {
      AppLogger.error('ReportService: Failed to preview PDF', e, st);
      throw ExportFailure('Failed to preview PDF report: $e');
    }
  }
}
