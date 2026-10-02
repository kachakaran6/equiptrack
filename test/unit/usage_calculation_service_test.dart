import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/core/services/usage_calculation_service.dart';
import 'package:machine_usage_app/models/usage_record.dart';

void main() {
  late UsageCalculationService service;

  setUp(() {
    service = const UsageCalculationService();
  });

  group('UsageCalculationService Tests', () {
    test('Empty list returns empty list', () {
      final result = service.calculate([]);
      expect(result, isEmpty);
    });

    test('Single record is always Running with null usageDays', () {
      final record = UsageRecord(
        id: '1',
        sectionId: 'sec-1',
        name: 'Initial Installation',
        usageDate: DateTime(2026, 10, 2),
        createdAt: DateTime(2026, 10, 2, 10, 0),
        updatedAt: DateTime(2026, 10, 2, 10, 0),
      );

      final result = service.calculate([record]);
      expect(result.length, 1);
      expect(result.first.name, 'Initial Installation');
      expect(result.first.isRunning, isTrue);
      expect(result.first.usageDays, isNull);
      expect(result.first.usageDaysDisplay, 'Running');
    });

    test('Chronological records calculation matches specification', () {
      // 02/10/2026 -> 12/10/2026 (10 days)
      // 12/10/2026 -> 20/10/2026 (8 days)
      // 20/10/2026 -> Running
      final records = [
        UsageRecord(
          id: '1',
          sectionId: 'sec-1',
          name: 'Record A',
          usageDate: DateTime(2026, 10, 2),
          createdAt: DateTime(2026, 10, 2, 8, 0),
          updatedAt: DateTime(2026, 10, 2, 8, 0),
        ),
        UsageRecord(
          id: '2',
          sectionId: 'sec-1',
          name: 'Record B',
          usageDate: DateTime(2026, 10, 12),
          createdAt: DateTime(2026, 10, 12, 8, 0),
          updatedAt: DateTime(2026, 10, 12, 8, 0),
        ),
        UsageRecord(
          id: '3',
          sectionId: 'sec-1',
          name: 'Record C',
          usageDate: DateTime(2026, 10, 20),
          createdAt: DateTime(2026, 10, 20, 8, 0),
          updatedAt: DateTime(2026, 10, 20, 8, 0),
        ),
      ];

      final result = service.calculate(records);

      expect(result.length, 3);
      expect(result[0].name, 'Record A');
      expect(result[0].usageDays, 10);
      expect(result[0].isRunning, isFalse);
      expect(result[0].usageDaysDisplay, '10');

      expect(result[1].name, 'Record B');
      expect(result[1].usageDays, 8);
      expect(result[1].isRunning, isFalse);
      expect(result[1].usageDaysDisplay, '8');

      expect(result[2].name, 'Record C');
      expect(result[2].usageDays, isNull);
      expect(result[2].isRunning, isTrue);
      expect(result[2].usageDaysDisplay, 'Running');
    });

    test('Out-of-order records are automatically sorted chronologically', () {
      final records = [
        UsageRecord(
          id: '3',
          sectionId: 'sec-1',
          name: 'Record C',
          usageDate: DateTime(2026, 10, 20),
          createdAt: DateTime(2026, 10, 20, 8, 0),
          updatedAt: DateTime(2026, 10, 20, 8, 0),
        ),
        UsageRecord(
          id: '1',
          sectionId: 'sec-1',
          name: 'Record A',
          usageDate: DateTime(2026, 10, 2),
          createdAt: DateTime(2026, 10, 2, 8, 0),
          updatedAt: DateTime(2026, 10, 2, 8, 0),
        ),
        UsageRecord(
          id: '2',
          sectionId: 'sec-1',
          name: 'Record B',
          usageDate: DateTime(2026, 10, 12),
          createdAt: DateTime(2026, 10, 12, 8, 0),
          updatedAt: DateTime(2026, 10, 12, 8, 0),
        ),
      ];

      final result = service.calculate(records);

      expect(result[0].name, 'Record A');
      expect(result[0].usageDays, 10);
      expect(result[1].name, 'Record B');
      expect(result[1].usageDays, 8);
      expect(result[2].name, 'Record C');
      expect(result[2].isRunning, isTrue);
    });

    test('Duplicate dates produce 0 days difference', () {
      final records = [
        UsageRecord(
          id: '1',
          sectionId: 'sec-1',
          name: 'Maintenance Check',
          usageDate: DateTime(2026, 10, 12),
          createdAt: DateTime(2026, 10, 12, 9, 0),
          updatedAt: DateTime(2026, 10, 12, 9, 0),
        ),
        UsageRecord(
          id: '2',
          sectionId: 'sec-1',
          name: 'Part Replacement',
          usageDate: DateTime(2026, 10, 12),
          createdAt: DateTime(2026, 10, 12, 11, 0),
          updatedAt: DateTime(2026, 10, 12, 11, 0),
        ),
        UsageRecord(
          id: '3',
          sectionId: 'sec-1',
          name: 'Subsequent Check',
          usageDate: DateTime(2026, 10, 15),
          createdAt: DateTime(2026, 10, 15, 10, 0),
          updatedAt: DateTime(2026, 10, 15, 10, 0),
        ),
      ];

      final result = service.calculate(records);

      expect(result[0].name, 'Maintenance Check');
      expect(result[0].usageDays, 0);
      expect(result[1].name, 'Part Replacement');
      expect(result[1].usageDays, 3);
      expect(result[2].name, 'Subsequent Check');
      expect(result[2].isRunning, isTrue);
    });

    test('Deleting a middle record recalculates surrounding durations', () {
      // Original: A (10/2) -> B (10/12) -> C (10/20)
      // Delete B => A (10/2) -> C (10/20) = 18 days
      final records = [
        UsageRecord(
          id: '1',
          sectionId: 'sec-1',
          name: 'Record A',
          usageDate: DateTime(2026, 10, 2),
          createdAt: DateTime(2026, 10, 2, 8, 0),
          updatedAt: DateTime(2026, 10, 2, 8, 0),
        ),
        UsageRecord(
          id: '3',
          sectionId: 'sec-1',
          name: 'Record C',
          usageDate: DateTime(2026, 10, 20),
          createdAt: DateTime(2026, 10, 20, 8, 0),
          updatedAt: DateTime(2026, 10, 20, 8, 0),
        ),
      ];

      final result = service.calculate(records);

      expect(result.length, 2);
      expect(result[0].name, 'Record A');
      expect(result[0].usageDays, 18);
      expect(result[1].name, 'Record C');
      expect(result[1].isRunning, isTrue);
    });
  });
}
