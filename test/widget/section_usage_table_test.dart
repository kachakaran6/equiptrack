import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/core/constants/app_constants.dart';
import 'package:machine_usage_app/core/theme/app_theme.dart';
import 'package:machine_usage_app/features/usage_records/widgets/usage_table_view.dart';
import 'package:machine_usage_app/models/calculated_usage_row.dart';
import 'package:machine_usage_app/models/usage_record.dart';

void main() {
  group('UsageTableView Widget Tests', () {
    testWidgets('Renders 3 columns: Name, Date, Usage Days and Running badge',
        (tester) async {
      final rows = [
        CalculatedUsageRow(
          recordId: '1',
          name: 'Seal Replacement',
          date: DateTime(2026, 10, 2),
          usageDays: 10,
          isRunning: false,
        ),
        CalculatedUsageRow(
          recordId: '2',
          name: 'Belt Tensioning',
          date: DateTime(2026, 10, 12),
          usageDays: null,
          isRunning: true,
        ),
      ];

      final rawRecords = [
        UsageRecord(
          id: '1',
          sectionId: 'sec-1',
          name: 'Seal Replacement',
          usageDate: DateTime(2026, 10, 2),
          createdAt: DateTime(2026, 10, 2),
          updatedAt: DateTime(2026, 10, 2),
        ),
        UsageRecord(
          id: '2',
          sectionId: 'sec-1',
          name: 'Belt Tensioning',
          usageDate: DateTime(2026, 10, 12),
          createdAt: DateTime(2026, 10, 12),
          updatedAt: DateTime(2026, 10, 12),
        ),
      ];

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: Scaffold(
              body: UsageTableView(
                sectionId: 'sec-1',
                rows: rows,
                rawRecords: rawRecords,
              ),
            ),
          ),
        ),
      );

      // Verify Column headers
      expect(find.text('Name'), findsOneWidget);
      expect(find.text('Date'), findsOneWidget);
      expect(find.text('Usage Days'), findsOneWidget);

      // Verify row values
      expect(find.text('Seal Replacement'), findsOneWidget);
      expect(find.text('02/10/2026'), findsOneWidget);
      expect(find.text('10'), findsOneWidget);

      expect(find.text('Belt Tensioning'), findsOneWidget);
      expect(find.text('12/10/2026'), findsOneWidget);
      expect(find.text(AppConstants.runningText), findsOneWidget);
    });
  });
}
