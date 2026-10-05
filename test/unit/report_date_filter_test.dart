import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/core/errors/app_failure.dart';
import 'package:machine_usage_app/core/services/pdf_service.dart';
import 'package:machine_usage_app/features/reports/models/report_filter_options.dart';
import 'package:machine_usage_app/models/machine.dart';
import 'package:machine_usage_app/models/section.dart';

void main() {
  group('Report Filter and Date Range Tests', () {
    final fixedNow = DateTime(2026, 10, 5, 12, 0);

    test('getRangeForPreset computes correct ranges', () {
      // All Time
      expect(
        ReportFilterHelper.getRangeForPreset(ReportDatePreset.allTime, now: fixedNow),
        isNull,
      );

      // This Month
      final thisMonth = ReportFilterHelper.getRangeForPreset(
        ReportDatePreset.thisMonth,
        now: fixedNow,
      );
      expect(thisMonth, isNotNull);
      expect(thisMonth!.start, DateTime(2026, 10, 1));
      expect(thisMonth.end, DateTime(2026, 10, 5));

      // Last 30 Days
      final last30 = ReportFilterHelper.getRangeForPreset(
        ReportDatePreset.last30Days,
        now: fixedNow,
      );
      expect(last30, isNotNull);
      expect(last30!.end, fixedNow);

      // This Year
      final thisYear = ReportFilterHelper.getRangeForPreset(
        ReportDatePreset.thisYear,
        now: fixedNow,
      );
      expect(thisYear, isNotNull);
      expect(thisYear!.start, DateTime(2026, 1, 1));
    });

    test('isDateInRange accurately checks date inclusion', () {
      final range = DateTimeRange(
        start: DateTime(2026, 10, 1),
        end: DateTime(2026, 10, 15),
      );

      expect(
        ReportFilterHelper.isDateInRange(DateTime(2026, 10, 5), range),
        isTrue,
      );
      expect(
        ReportFilterHelper.isDateInRange(DateTime(2026, 10, 1), range),
        isTrue,
      );
      expect(
        ReportFilterHelper.isDateInRange(DateTime(2026, 10, 15), range),
        isTrue,
      );
      expect(
        ReportFilterHelper.isDateInRange(DateTime(2026, 9, 30), range),
        isFalse,
      );
      expect(
        ReportFilterHelper.isDateInRange(DateTime(2026, 10, 16), range),
        isFalse,
      );
      expect(
        ReportFilterHelper.isDateInRange(DateTime(2026, 10, 5), null),
        isTrue,
      );
    });

    test('PdfService throws ValidationFailure when components have 0 usage records', () async {
      const pdfService = PdfService();
      final machine = Machine(
        id: 'm-1',
        name: 'Test Machine',
        createdAt: fixedNow,
        updatedAt: fixedNow,
      );
      final section = Section(
        id: 's-1',
        machineId: 'm-1',
        name: 'Empty Section',
        createdAt: fixedNow,
        updatedAt: fixedNow,
      );

      expect(
        () async => await pdfService.generateMultiComponentReportPdf(
          machine: machine,
          components: [
            ComponentReportData(
              section: section,
              rows: [],
            ),
          ],
        ),
        throwsA(isA<ValidationFailure>()),
      );
    });
  });
}
