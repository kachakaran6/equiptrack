import '../core/constants/app_constants.dart';
import '../core/extensions/date_extensions.dart';

/// Presentation & report row model resulting from chronological duration calculation.
/// This unified model powers UI tables, PDF export, and Excel export with 100% consistency.
class CalculatedUsageRow {
  final String recordId;
  final String name;
  final DateTime date;
  final int? usageDays;
  final bool isRunning;

  const CalculatedUsageRow({
    required this.recordId,
    required this.name,
    required this.date,
    this.usageDays,
    required this.isRunning,
  });

  /// Human readable display for the Usage Days column ('10', '0', or 'Running')
  String get usageDaysDisplay {
    if (isRunning) {
      return AppConstants.runningText;
    }
    return (usageDays ?? 0).toString();
  }

  /// Formatted date string (dd/MM/yyyy)
  String get formattedDate => date.toAppDateString();

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CalculatedUsageRow &&
          runtimeType == other.runtimeType &&
          recordId == other.recordId &&
          name == other.name &&
          date.year == other.date.year &&
          date.month == other.date.month &&
          date.day == other.date.day &&
          usageDays == other.usageDays &&
          isRunning == other.isRunning;

  @override
  int get hashCode =>
      recordId.hashCode ^
      name.hashCode ^
      date.hashCode ^
      usageDays.hashCode ^
      isRunning.hashCode;

  @override
  String toString() =>
      'CalculatedUsageRow(name: $name, date: $formattedDate, days: $usageDaysDisplay)';
}
