import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/core/constants/app_keys.dart';
import 'package:machine_usage_app/core/theme/app_theme.dart';
import 'package:machine_usage_app/data/repositories/usage_record_repository.dart';
import 'package:machine_usage_app/features/reports/models/report_filter_options.dart';
import 'package:machine_usage_app/features/reports/widgets/pdf_export_dialog.dart';
import 'package:machine_usage_app/models/machine.dart';
import 'package:machine_usage_app/models/section.dart';
import 'package:machine_usage_app/models/usage_record.dart';

void main() {
  final now = DateTime(2026, 10, 6, 12, 0);

  final testMachine = Machine(
    id: 'm-1',
    name: 'CNC Milling Center 01',
    description: 'Main production CNC mill',
    createdAt: now,
    updatedAt: now,
  );

  final testSection1 = Section(
    id: 's-1',
    machineId: 'm-1',
    name: 'Spindle Bearing',
    categoryId: 'cat-1',
    createdAt: now,
    updatedAt: now,
  );

  final testSection2 = Section(
    id: 's-2',
    machineId: 'm-1',
    name: 'Coolant Pump',
    categoryId: 'cat-2',
    createdAt: now,
    updatedAt: now,
  );

  final sampleRecords = [
    UsageRecord(
      id: 'r-1',
      sectionId: 's-1',
      name: 'SKF 6205',
      usageDate: DateTime(2026, 1, 15),
      createdAt: now,
      updatedAt: now,
    ),
    UsageRecord(
      id: 'r-2',
      sectionId: 's-1',
      name: 'NSK 6205',
      usageDate: DateTime(2026, 2, 20),
      createdAt: now,
      updatedAt: now,
    ),
  ];

  group('PdfExportDialog Widget Tests', () {
    testWidgets('Renders Ready state with Report Summary, Format, and Actions',
        (tester) async {
      tester.view.physicalSize = const Size(1000, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            usageRecordsStreamFamily('s-1').overrideWith((ref) => Future.value(sampleRecords)),
          ],
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: Scaffold(
              body: PdfExportDialog(
                machine: testMachine,
                sections: [testSection1],
                initialRecords: sampleRecords,
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Header verification
      expect(find.text('Export PDF Report'), findsOneWidget);
      expect(find.text('Export your usage report as a PDF.'), findsOneWidget);

      // Report summary section
      expect(find.text('REPORT SUMMARY'), findsOneWidget);
      expect(find.text('CNC Milling Center 01'), findsOneWidget);
      expect(find.text('Spindle Bearing'), findsOneWidget);
      expect(find.text('2 records'), findsOneWidget);

      // Export format card
      expect(find.text('EXPORT FORMAT'), findsOneWidget);
      expect(find.text('PDF Document (.pdf)'), findsOneWidget);
      expect(find.text('A4'), findsOneWidget);

      // Date filter selector presets
      expect(find.text('All Time'), findsWidgets);
      expect(find.text('This Month'), findsOneWidget);
      expect(find.text('Last 30 Days'), findsOneWidget);

      // Actions
      expect(find.text('Cancel'), findsOneWidget);
      expect(find.text('Export PDF'), findsOneWidget);
    });

    testWidgets('Multi-component dialog shows component count and skip toggle',
        (tester) async {
      tester.view.physicalSize = const Size(1000, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: Scaffold(
              body: PdfExportDialog(
                machine: testMachine,
                sections: [testSection1, testSection2],
                categoryNames: const {'cat-1': 'Bearings', 'cat-2': 'Pumps'},
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('2 components selected'), findsOneWidget);
      expect(
        find.text('Skip components with 0 records in selected range'),
        findsOneWidget,
      );
    });

    testWidgets('Tapping date preset updates filter display', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: Scaffold(
              body: PdfExportDialog(
                machine: testMachine,
                sections: [testSection1],
                initialRecords: sampleRecords,
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Tap 'This Month'
      await tester.tap(find.text('This Month'));
      await tester.pumpAndSettle();

      final expectedRange = ReportFilterHelper.getRangeForPreset(ReportDatePreset.thisMonth);
      final expectedText = ReportFilterHelper.getDisplayText(ReportDatePreset.thisMonth, expectedRange);

      expect(find.text(expectedText), findsWidgets);
    });

    testWidgets('Empty records display warning notice and disable export button on single section',
        (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: Scaffold(
              body: PdfExportDialog(
                machine: testMachine,
                sections: [testSection1],
                initialRecords: const [],
              ),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('0 records'), findsOneWidget);
      expect(
        find.textContaining('No usage records recorded for "All Time"'),
        findsOneWidget,
      );

      // Export button is disabled when 0 records
      final exportBtn = tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Export PDF'),
      );
      expect(exportBtn.onPressed, isNull);
    });
  });
}

