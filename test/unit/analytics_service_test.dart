import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/core/analytics/analytics_consent.dart';
import 'package:machine_usage_app/core/analytics/analytics_event.dart';
import 'package:machine_usage_app/core/analytics/analytics_properties.dart';
import 'package:machine_usage_app/core/analytics/analytics_screen.dart';
import 'package:machine_usage_app/core/analytics/analytics_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AnalyticsProperties Sanitizer Tests', () {
    test('Strips blacklisted sensitive keys completely', () {
      final raw = {
        'machine_id': 'mach-123',
        'password': 'super_secret_password',
        'token': 'jwt_bearer_token_999',
        'jwt': 'header.payload.signature',
        'authorization': 'Bearer xyz',
        'auth_header': 'Bearer abc',
        'secret_key': '123456',
        'telegram_token': '123456:ABC-DEF',
        'postgres_url': 'postgres://postgres:pwd@db:5432/db',
        'database_name': 'equiptrack',
        'connection_string': 'postgres://...',
        'format': 'pdf',
        'count': 10,
        'is_active': true,
      };

      final sanitized = AnalyticsProperties.sanitize(raw);

      // Verify sensitive keys are purged
      expect(sanitized.containsKey('password'), isFalse);
      expect(sanitized.containsKey('token'), isFalse);
      expect(sanitized.containsKey('jwt'), isFalse);
      expect(sanitized.containsKey('authorization'), isFalse);
      expect(sanitized.containsKey('auth_header'), isFalse);
      expect(sanitized.containsKey('secret_key'), isFalse);
      expect(sanitized.containsKey('telegram_token'), isFalse);
      expect(sanitized.containsKey('postgres_url'), isFalse);
      expect(sanitized.containsKey('database_name'), isFalse);
      expect(sanitized.containsKey('connection_string'), isFalse);

      // Verify safe keys are retained
      expect(sanitized['machine_id'], equals('mach-123'));
      expect(sanitized['format'], equals('pdf'));
      expect(sanitized['count'], equals(10));
      expect(sanitized['is_active'], equals(true));
    });

    test('Truncates oversized string values', () {
      final veryLongString = 'A' * 500;
      final raw = {
        'description': veryLongString,
      };

      final sanitized = AnalyticsProperties.sanitize(raw);
      final truncated = sanitized['description'] as String;

      expect(truncated.length, equals(256));
    });

    test('Ambient properties builder generates safe platform and build info', () {
      final ambient = AnalyticsProperties.ambient(
        appVersion: '1.0.0+9',
        platform: 'android',
        environment: 'production',
      );

      expect(ambient['app_platform'], equals('android'));
      expect(ambient['app_version'], equals('1.0.0+9'));
      expect(ambient['environment'], equals('production'));
      expect(ambient.containsKey('is_debug'), isTrue);
    });
  });

  group('AnalyticsConsentManager Tests', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    test('Defaults to granted if no preference is stored', () async {
      final consent = await AnalyticsConsentManager.getConsent();
      expect(consent, equals(AnalyticsConsent.granted));
      expect(consent.isGranted, isTrue);
    });

    test('Persists and retrieves denied consent', () async {
      await AnalyticsConsentManager.setConsent(AnalyticsConsent.denied);
      final consent = await AnalyticsConsentManager.getConsent();
      expect(consent, equals(AnalyticsConsent.denied));
      expect(consent.isGranted, isFalse);
    });
  });

  group('AnalyticsService Architecture & Resilience Tests', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    test('Gracefully operates without crashing when credentials are mock/missing', () async {
      final service = AnalyticsService.instance;

      // Calling methods before or without valid configuration never throws
      await expectLater(
        service.track(AnalyticsEvent.appOpened),
        completes,
      );

      await expectLater(
        service.screen(AnalyticsScreen.login),
        completes,
      );

      await expectLater(
        service.identify(userId: 'test-user-id-123'),
        completes,
      );

      expect(service.identifiedUserId, equals('test-user-id-123'));

      await expectLater(
        service.reset(),
        completes,
      );

      expect(service.identifiedUserId, isNull);

      await expectLater(
        service.captureError(Exception('Sample crash test')),
        completes,
      );

      final flagValue = await service.isFeatureEnabled('non_existent_flag', defaultValue: true);
      expect(flagValue, isTrue);
    });

    test('Consent update persists and alters state', () async {
      final service = AnalyticsService.instance;

      await service.setConsent(AnalyticsConsent.denied);
      expect(service.consent, equals(AnalyticsConsent.denied));

      await service.setConsent(AnalyticsConsent.granted);
      expect(service.consent, equals(AnalyticsConsent.granted));
    });

    test('Deduplicates rapid viewMachine and viewSection calls', () async {
      final service = AnalyticsService.instance;

      await expectLater(service.viewMachine('m-1'), completes);
      // Rapid repeat does not throw
      await expectLater(service.viewMachine('m-1'), completes);

      await expectLater(service.viewSection('m-1', 's-1'), completes);
      // Rapid repeat does not throw
      await expectLater(service.viewSection('m-1', 's-1'), completes);
    });

    test('Search and backup telemetry executes cleanly', () async {
      final service = AnalyticsService.instance;

      await expectLater(service.searchStarted(searchContext: 'machines'), completes);
      await expectLater(service.searchUsed(searchContext: 'machines', resultCount: 5), completes);
      await expectLater(service.searchNoResults(searchContext: 'machines'), completes);

      await expectLater(service.backupStarted(backupType: 'manual_json'), completes);
      await expectLater(service.backupCompleted(backupType: 'manual_json', durationMs: 120), completes);
      await expectLater(service.backupFailed(backupType: 'manual_json', durationMs: 50, error: 'timeout'), completes);
      await expectLater(service.telegramBackupTested(success: true, durationMs: 200), completes);
    });

    test('Global context attaches version and platform metadata', () {
      final props = AnalyticsProperties.withGlobalContext({'key': 'val'});
      expect(props['app_version'], equals('1.0.0'));
      expect(props['build_number'], equals(10));
      expect(props.containsKey('platform'), isTrue);
      expect(props.containsKey('environment'), isTrue);
      expect(props['key'], equals('val'));
    });
  });
}
