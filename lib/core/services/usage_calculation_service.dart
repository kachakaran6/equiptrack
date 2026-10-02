import '../../models/calculated_usage_row.dart';
import '../../models/usage_record.dart';

/// Centralized service for calculating usage durations between chronological records.
/// This is the SINGLE SOURCE OF TRUTH for:
/// 1. Mobile UI Usage Table
/// 2. PDF Reports
/// 3. Excel Reports
class UsageCalculationService {
  const UsageCalculationService();

  /// Calculates chronological usage rows from a list of [UsageRecord]s.
  ///
  /// Algorithm:
  /// 1. Sort records by `usageDate` ascending (with `createdAt` as secondary sort).
  /// 2. For each record at index `i`:
  ///    - If it is the latest record (`i == length - 1`):
  ///        `isRunning = true`, `usageDays = null`
  ///    - Otherwise:
  ///        `usageDays = (nextRecord.date - currentRecord.date).inDays`
  ///        `isRunning = false`
  /// 3. Return a list of immutable [CalculatedUsageRow]s.
  List<CalculatedUsageRow> calculate(List<UsageRecord> records) {
    if (records.isEmpty) {
      return const [];
    }

    // 1. Sort records chronologically (ascending)
    final sorted = List<UsageRecord>.from(records)
      ..sort((a, b) {
        final aDateOnly = DateTime(a.usageDate.year, a.usageDate.month, a.usageDate.day);
        final bDateOnly = DateTime(b.usageDate.year, b.usageDate.month, b.usageDate.day);
        final dateComparison = aDateOnly.compareTo(bDateOnly);
        if (dateComparison != 0) {
          return dateComparison;
        }
        return a.createdAt.compareTo(b.createdAt);
      });

    final rows = <CalculatedUsageRow>[];

    for (var i = 0; i < sorted.length; i++) {
      final current = sorted[i];
      final currentDateOnly = DateTime(
        current.usageDate.year,
        current.usageDate.month,
        current.usageDate.day,
      );

      if (i == sorted.length - 1) {
        // Newest record is always marked as Running
        rows.add(
          CalculatedUsageRow(
            recordId: current.id,
            name: current.name,
            date: current.usageDate,
            usageDays: null,
            isRunning: true,
          ),
        );
      } else {
        final next = sorted[i + 1];
        final nextDateOnly = DateTime(
          next.usageDate.year,
          next.usageDate.month,
          next.usageDate.day,
        );
        final days = nextDateOnly.difference(currentDateOnly).inDays;

        rows.add(
          CalculatedUsageRow(
            recordId: current.id,
            name: current.name,
            date: current.usageDate,
            usageDays: days >= 0 ? days : 0,
            isRunning: false,
          ),
        );
      }
    }

    return rows;
  }
}
