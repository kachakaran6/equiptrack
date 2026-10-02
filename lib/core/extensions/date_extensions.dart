import 'package:intl/intl.dart';
import '../constants/app_constants.dart';

/// Extension methods for DateTime formatting and date manipulation
extension DateTimeX on DateTime {
  /// Format as dd/MM/yyyy (e.g. 02/10/2026)
  String toAppDateString() {
    return DateFormat(AppConstants.defaultDateFormat).format(this);
  }

  /// Format as readable date e.g. 02 Oct 2026
  String toReadableDate() {
    return DateFormat('dd MMM yyyy').format(this);
  }

  /// Format as readable datetime e.g. 02 Oct 2026, 03:45 PM
  String toReadableDateTime() {
    return DateFormat(AppConstants.displayDateTimeFormat).format(this);
  }

  /// Format for filename e.g. 20261002_154500
  String toFileTimestamp() {
    return DateFormat(AppConstants.fileTimestampFormat).format(this);
  }

  /// Compare only the year, month, day components (ignoring time)
  bool isSameDay(DateTime other) {
    return year == other.year && month == other.month && day == other.day;
  }

  /// Returns date with 00:00:00 time
  DateTime dateOnly() {
    return DateTime(year, month, day);
  }
}
