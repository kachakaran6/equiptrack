/// Standardized strongly-typed event taxonomy for EquipTrack PostHog integration.
enum AnalyticsEvent {
  // App Lifecycle
  appOpened('app_opened'),
  appBackgrounded('app_backgrounded'),
  appResumed('app_resumed'),

  // Authentication
  loginStarted('login_started'),
  loginCompleted('login_completed'),
  loginFailed('login_failed'),
  logoutCompleted('logout_completed'),

  // Machines
  machineViewed('machine_viewed'),
  machineCreated('machine_created'),
  machineUpdated('machine_updated'),
  machineDeleted('machine_deleted'),

  // Sections / Components
  sectionViewed('section_viewed'),
  sectionCreated('section_created'),
  sectionUpdated('section_updated'),
  sectionDeleted('section_deleted'),

  // Categories
  categoryCreated('category_created'),
  categoryUpdated('category_updated'),
  categoryDeleted('category_deleted'),

  // Usage Records
  usageRecordViewed('usage_record_viewed'),
  usageRecordCreated('usage_record_created'),
  usageRecordUpdated('usage_record_updated'),
  usageRecordDeleted('usage_record_deleted'),

  // Reports
  reportExportStarted('report_export_started'),
  reportExportCompleted('report_export_completed'),
  reportExportFailed('report_export_failed'),

  // Backup & Maintenance
  backupStarted('backup_started'),
  backupCompleted('backup_completed'),
  backupFailed('backup_failed'),
  telegramBackupTested('telegram_backup_tested'),

  // In-App Updates
  appUpdateAvailable('app_update_available'),
  appUpdateStarted('app_update_started'),
  appUpdateCompleted('app_update_completed'),
  appUpdateFailed('app_update_failed'),

  // Settings & Privacy
  settingsOpened('settings_opened'),
  analyticsPreferenceChanged('analytics_preference_changed'),

  // Errors & Diagnostics
  appError('app_error'),
  apiError('api_error'),

  // Search
  searchStarted('search_started'),
  searchUsed('search_used'),
  searchNoResults('search_no_results'),

  // Navigation
  screenViewed('screen_viewed');

  final String eventName;
  const AnalyticsEvent(this.eventName);

  @override
  String toString() => eventName;
}
