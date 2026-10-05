import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

enum ReportDatePreset {
  allTime('All Time'),
  thisMonth('This Month'),
  last30Days('Last 30 Days'),
  last90Days('Last 90 Days'),
  thisYear('This Year'),
  custom('Custom Range');

  final String label;
  const ReportDatePreset(this.label);
}

class ReportFilterHelper {
  ReportFilterHelper._();

  static DateTimeRange? getRangeForPreset(
    ReportDatePreset preset, {
    DateTimeRange? customRange,
    DateTime? now,
  }) {
    final current = now ?? DateTime.now();
    switch (preset) {
      case ReportDatePreset.allTime:
        return null;
      case ReportDatePreset.thisMonth:
        return DateTimeRange(
          start: DateTime(current.year, current.month, 1),
          end: DateTime(current.year, current.month, current.day),
        );
      case ReportDatePreset.last30Days:
        return DateTimeRange(
          start: current.subtract(const Duration(days: 30)),
          end: current,
        );
      case ReportDatePreset.last90Days:
        return DateTimeRange(
          start: current.subtract(const Duration(days: 90)),
          end: current,
        );
      case ReportDatePreset.thisYear:
        return DateTimeRange(
          start: DateTime(current.year, 1, 1),
          end: current,
        );
      case ReportDatePreset.custom:
        return customRange;
    }
  }

  static String getDisplayText(ReportDatePreset preset, DateTimeRange? range) {
    if (preset == ReportDatePreset.allTime || range == null) {
      return 'All Time';
    }
    final df = DateFormat('dd MMM yyyy');
    return '${df.format(range.start)} – ${df.format(range.end)}';
  }

  static bool isDateInRange(DateTime date, DateTimeRange? range) {
    if (range == null) return true;
    final dateOnly = DateTime(date.year, date.month, date.day);
    final startOnly = DateTime(range.start.year, range.start.month, range.start.day);
    final endOnly = DateTime(range.end.year, range.end.month, range.end.day);
    return !dateOnly.isBefore(startOnly) && !dateOnly.isAfter(endOnly);
  }
}
