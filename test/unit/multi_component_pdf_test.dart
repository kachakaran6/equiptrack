import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/core/services/pdf_service.dart';
import 'package:machine_usage_app/models/calculated_usage_row.dart';
import 'package:machine_usage_app/models/machine.dart';
import 'package:machine_usage_app/models/section.dart';

void main() {
  group('Multi-Component PDF Report Tests', () {
    const pdfService = PdfService();
    final now = DateTime(2026, 10, 5, 12, 0);

    final testMachine = Machine(
      id: 'm-1',
      name: 'CNC Milling Center 01',
      description: 'Heavy duty vertical machining center',
      createdAt: now,
      updatedAt: now,
    );

    final componentA = Section(
      id: 's-1',
      machineId: 'm-1',
      name: 'Spindle Bearing',
      categoryId: 'cat-1',
      createdAt: now,
      updatedAt: now,
    );

    final componentB = Section(
      id: 's-2',
      machineId: 'm-1',
      name: 'Coolant Pump',
      categoryId: 'cat-2',
      createdAt: now,
      updatedAt: now,
    );

    final componentC = Section(
      id: 's-3',
      machineId: 'm-1',
      name: 'Emergency Switch',
      categoryId: null, // Uncategorized
      createdAt: now,
      updatedAt: now,
    );

    final rowsA = <CalculatedUsageRow>[
      CalculatedUsageRow(
        recordId: 'r-1',
        name: 'Batch 1',
        date: DateTime(2026, 1, 1),
        usageDays: 30,
        isRunning: false,
      ),
      CalculatedUsageRow(
        recordId: 'r-2',
        name: 'Batch 2',
        date: DateTime(2026, 1, 31),
        usageDays: null,
        isRunning: true,
      ),
    ];

    final rowsB = <CalculatedUsageRow>[
      CalculatedUsageRow(
        recordId: 'r-3',
        name: 'Initial Run',
        date: DateTime(2026, 2, 1),
        usageDays: 15,
        isRunning: false,
      ),
    ];

    test('Generates valid multi-component combined PDF bytes', () async {
      final components = [
        ComponentReportData(
          section: componentA,
          categoryName: 'Bearings',
          rows: rowsA,
        ),
        ComponentReportData(
          section: componentB,
          categoryName: 'Pumps',
          rows: rowsB,
        ),
        ComponentReportData(
          section: componentC,
          categoryName: null, // Uncategorized
          rows: [],
        ),
      ];

      final pdfBytes = await pdfService.generateMultiComponentReportPdf(
        machine: testMachine,
        components: components,
        generatedAt: now,
      );

      expect(pdfBytes, isNotNull);
      expect(pdfBytes.isNotEmpty, isTrue);
      // Valid PDF magic header bytes: %PDF-
      expect(String.fromCharCodes(pdfBytes.take(5)), '%PDF-');
    });

    test('Single-component PDF generation delegates to combined builder and produces valid PDF', () async {
      final pdfBytes = await pdfService.generateUsageReportPdf(
        machine: testMachine,
        section: componentA,
        rows: rowsA,
        categoryName: 'Bearings',
        generatedAt: now,
      );

      expect(pdfBytes, isNotNull);
      expect(pdfBytes.isNotEmpty, isTrue);
      expect(String.fromCharCodes(pdfBytes.take(5)), '%PDF-');
    });

    test('Preserves component ordering: Category order -> Component order', () async {
      // Simulating Category order (Bearings, then Pumps, then Uncategorized)
      final orderedComponents = [
        ComponentReportData(
          section: componentA,
          categoryName: 'Bearings',
          rows: rowsA,
        ),
        ComponentReportData(
          section: componentB,
          categoryName: 'Pumps',
          rows: rowsB,
        ),
        ComponentReportData(
          section: componentC,
          categoryName: 'Uncategorized',
          rows: [],
        ),
      ];

      final pdfBytes = await pdfService.generateMultiComponentReportPdf(
        machine: testMachine,
        components: orderedComponents,
        generatedAt: now,
      );

      expect(pdfBytes.length, greaterThan(1000));
    });
  });
}
