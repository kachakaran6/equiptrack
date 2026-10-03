/// Application-wide constants
class AppConstants {
  AppConstants._();

  static const String appName = 'EquipTrack';
  static const String appTagline = 'Track machine lifecycle & component durability';
  static const String runningText = 'Running';

  // PostgreSQL Tables
  static const String tableMachines = 'machines';
  static const String tableSections = 'sections';
  static const String tableUsageRecords = 'usage_records';

  // Storage / Report Constants
  static const String defaultDateFormat = 'dd/MM/yyyy';
  static const String displayDateTimeFormat = 'dd MMM yyyy, hh:mm a';
  static const String reportDateFormat = 'dd MMM yyyy';
  static const String fileTimestampFormat = 'yyyyMMdd_HHmmss';

  // Session & App Update
  static const int updateCheckCooldownSeconds = 300; // 5 min
}
