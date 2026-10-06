import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/core/services/excel_service.dart';
import 'package:machine_usage_app/core/services/pdf_service.dart';
import 'package:machine_usage_app/core/services/usage_calculation_service.dart';
import 'package:machine_usage_app/models/machine.dart';
import 'package:machine_usage_app/models/section.dart';
import 'package:machine_usage_app/models/usage_record.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Machine testMachine;
  late Section testSection;
  late List<UsageRecord> testRecords;
  late UsageCalculationService calculationService;
  late PdfService pdfService;
  late ExcelService excelService;

  setUp(() {
    calculationService = const UsageCalculationService();
    pdfService = const PdfService();
    excelService = const ExcelService();

    testMachine = Machine(
      id: 'm1',
      name: 'CNC Milling Machine 01',
      description: 'Main workshop milling unit',
      createdAt: DateTime(2026, 1, 1),
      updatedAt: DateTime(2026, 1, 1),
    );

    testSection = Section(
      id: 's1',
      machineId: 'm1',
      name: 'Spindle Assembly',
      createdAt: DateTime(2026, 1, 1),
      updatedAt: DateTime(2026, 1, 1),
    );

    testRecords = [
      UsageRecord(
        id: 'r1',
        sectionId: 's1',
        name: 'Bearing Replacement',
        usageDate: DateTime(2026, 10, 2),
        createdAt: DateTime(2026, 10, 2, 8, 0),
        updatedAt: DateTime(2026, 10, 2, 8, 0),
      ),
      UsageRecord(
        id: 'r2',
        sectionId: 's1',
        name: 'Calibration Run',
        usageDate: DateTime(2026, 10, 12),
        createdAt: DateTime(2026, 10, 12, 8, 0),
        updatedAt: DateTime(2026, 10, 12, 8, 0),
      ),
      UsageRecord(
        id: 'r3',
        sectionId: 's1',
        name: 'Motor Inspection',
        usageDate: DateTime(2026, 10, 20),
        createdAt: DateTime(2026, 10, 20, 8, 0),
        updatedAt: DateTime(2026, 10, 20, 8, 0),
      ),
    ];
  });

  group('Reports Service Tests', () {
    test('PdfService generates valid PDF bytes with rows', () async {
      final rows = calculationService.calculate(testRecords);
      final pdfBytes = await pdfService.generateUsageReportPdf(
        machine: testMachine,
        section: testSection,
        rows: rows,
      );

      expect(pdfBytes, isNotEmpty);
      // PDF documents start with %PDF- header magic bytes
      final header = String.fromCharCodes(pdfBytes.take(5));
      expect(header.startsWith('%PDF'), isTrue);
    });

    test('PdfService generates valid multi-component PDF bytes', () async {
      final rows = calculationService.calculate(testRecords);
      final pdfBytes = await pdfService.generateMultiComponentReportPdf(
        machine: testMachine,
        components: [
          ComponentReportData(
            section: testSection,
            categoryName: 'Spindle System',
            rows: rows,
          ),
        ],
      );

      expect(pdfBytes, isNotEmpty);
      final header = String.fromCharCodes(pdfBytes.take(5));
      expect(header.startsWith('%PDF'), isTrue);
    });

    test('PdfService throws ValidationFailure when components have 0 rows', () async {
      expect(
        () => pdfService.generateMultiComponentReportPdf(
          machine: testMachine,
          components: [
            ComponentReportData(
              section: testSection,
              categoryName: 'Spindle System',
              rows: const [],
            ),
          ],
        ),
        throwsA(isA<Exception>()),
      );
    });

    test('ExcelService generates valid .xlsx bytes with metadata and rows', () {
      final rows = calculationService.calculate(testRecords);
      final excelBytes = excelService.generateUsageReportExcel(
        machine: testMachine,
        section: testSection,
        rows: rows,
      );

      expect(excelBytes, isNotEmpty);
      // XLSX (ZIP format) starts with PK (0x50, 0x4B)
      expect(excelBytes[0], 0x50);
      expect(excelBytes[1], 0x4B);
    });
  });
}

