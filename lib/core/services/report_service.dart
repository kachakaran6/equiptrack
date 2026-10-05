import 'dart:io';
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

  /// Calculate rows and generate PDF bytes for a single section
  Future<Uint8List> generatePdf({
    required Machine machine,
    required Section section,
    required List<UsageRecord> records,
    String? categoryName,
  }) async {
    try {
      final rows = calculationService.calculate(records);
      return await pdfService.generateUsageReportPdf(
        machine: machine,
        section: section,
        rows: rows,
        categoryName: categoryName,
      );
    } catch (e, st) {
      AppLogger.error('ReportService: Failed to generate PDF', e, st);
      throw ExportFailure('Failed to generate PDF report: $e');
    }
  }

  /// Calculate rows and generate combined PDF bytes for multiple components
  Future<Uint8List> generateMultiComponentPdf({
    required Machine machine,
    required List<ComponentReportData> components,
  }) async {
    try {
      return await pdfService.generateMultiComponentReportPdf(
        machine: machine,
        components: components,
      );
    } catch (e, st) {
      AppLogger.error('ReportService: Failed to generate multi-component PDF', e, st);
      throw ExportFailure('Failed to generate combined PDF report: $e');
    }
  }

  /// Save multi-component PDF to temporary storage
  Future<File> saveMultiComponentPdfFile({
    required Machine machine,
    required List<ComponentReportData> components,
  }) async {
    try {
      return await pdfService.saveMultiComponentPdfFile(
        machine: machine,
        components: components,
      );
    } catch (e, st) {
      AppLogger.error('ReportService: Failed to save multi-component PDF', e, st);
      throw ExportFailure('Failed to save combined PDF report: $e');
    }
  }

  /// Share multi-component PDF
  Future<void> shareMultiComponentPdf({
    required Machine machine,
    required List<ComponentReportData> components,
  }) async {
    try {
      await pdfService.shareMultiComponentPdf(
        machine: machine,
        components: components,
      );
    } catch (e, st) {
      AppLogger.error('ReportService: Failed to share multi-component PDF', e, st);
      throw ExportFailure('Failed to share combined PDF report: $e');
    }
  }

  /// Preview or print multi-component PDF
  Future<void> printOrPreviewMultiComponentPdf({
    required Machine machine,
    required List<ComponentReportData> components,
  }) async {
    try {
      await pdfService.printOrPreviewMultiComponentPdf(
        machine: machine,
        components: components,
      );
    } catch (e, st) {
      AppLogger.error('ReportService: Failed to preview multi-component PDF', e, st);
      throw ExportFailure('Failed to preview combined PDF report: $e');
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
    String? categoryName,
  }) async {
    try {
      final rows = calculationService.calculate(records);
      await pdfService.sharePdf(
        machine: machine,
        section: section,
        rows: rows,
        categoryName: categoryName,
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
    String? categoryName,
  }) async {
    try {
      final rows = calculationService.calculate(records);
      await pdfService.printOrPreview(
        machine: machine,
        section: section,
        rows: rows,
        categoryName: categoryName,
      );
    } catch (e, st) {
      AppLogger.error('ReportService: Failed to preview PDF', e, st);
      throw ExportFailure('Failed to preview PDF report: $e');
    }
  }
}
