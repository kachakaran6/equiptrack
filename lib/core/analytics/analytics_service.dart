import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:posthog_flutter/posthog_flutter.dart';
import '../utils/app_logger.dart';
import 'analytics_consent.dart';
import 'analytics_event.dart';
import 'analytics_properties.dart';

/// Centralized, production-grade analytics facade for EquipTrack.
/// All telemetry passes through this singleton with strict privacy sanitization,
/// duplicate-initialization protection, and graceful zero-crash degradation.
class AnalyticsService {
  AnalyticsService._();
  static final AnalyticsService instance = AnalyticsService._();

  bool _isInitialized = false;
  bool _isConfigured = false;
  AnalyticsConsent _consent = AnalyticsConsent.granted;
  String? _identifiedUserId;

  // Deduplication state
  String? _lastScreenName;
  DateTime? _lastScreenTime;

  String? _lastViewedMachineId;
  DateTime? _lastMachineViewedTime;

  String? _lastViewedSectionKey;
  DateTime? _lastSectionViewedTime;

  String? _lastTrackSignature;
  DateTime? _lastTrackTime;

  // Error throttling cache (signature -> timestamp)
  final Map<String, DateTime> _recentErrors = {};

  bool get isInitialized => _isInitialized;
  bool get isConfigured => _isConfigured;
  AnalyticsConsent get consent => _consent;
  String? get identifiedUserId => _identifiedUserId;

  /// Initializes the analytics service non-blockingly.
  /// If credentials or network are missing, falls back to a graceful no-op mode without throwing.
  Future<void> initialize({
    String? tokenOverride,
    String? hostOverride,
  }) async {
    if (_isInitialized) {
      AppLogger.debug('AnalyticsService is already initialized; skipping.');
      return;
    }

    try {
      // 1. Read persistent consent
      _consent = await AnalyticsConsentManager.getConsent();

      // 2. Resolve token and host from parameters or .env
      String? token = tokenOverride;
      String? host = hostOverride;

      if ((token == null || token.isEmpty) && dotenv.isInitialized) {
        token = dotenv.env['POSTHOG_PROJECT_TOKEN']?.trim();
      }
      if ((host == null || host.isEmpty) && dotenv.isInitialized) {
        host = dotenv.env['POSTHOG_HOST']?.trim();
      }

      host ??= 'https://us.i.posthog.com';

      if (token == null || token.isEmpty || token.startsWith('phc_your_')) {
        AppLogger.warning('PostHog token not configured or using placeholder. Analytics running in no-op mode.');
        _isInitialized = true;
        _isConfigured = false;
        return;
      }

      _isConfigured = true;
      _isInitialized = true;

      // 3. Apply initial consent state
      if (_consent == AnalyticsConsent.denied) {
        await Posthog().disable();
      } else {
        await Posthog().enable();
      }

      AppLogger.info('PostHog analytics initialized successfully (host: $host, consent: ${_consent.name}).');
    } catch (e, st) {
      AppLogger.warning('Failed to initialize PostHog analytics (gracefully continuing in safe mode): $e');
      if (kDebugMode) {
        AppLogger.debug('PostHog init stackTrace', e, st);
      }
      _isInitialized = true;
      _isConfigured = false;
    }
  }

  /// Identifies the user in PostHog with the application's stable backend ID.
  /// Never accepts passwords, tokens, full database records, or sensitive personal data.
  Future<void> identify({
    required String userId,
    Map<String, dynamic>? properties,
  }) async {
    if (!_isInitialized || !_isConfigured || _consent != AnalyticsConsent.granted) {
      _identifiedUserId = userId;
      return;
    }

    try {
      _identifiedUserId = userId;
      final enriched = AnalyticsProperties.withGlobalContext(properties);
      final sanitized = AnalyticsProperties.sanitize(enriched);
      await Posthog().identify(
        userId: userId,
        userProperties: sanitized,
      );
      AppLogger.debug('PostHog: Identified user $userId');
    } catch (e) {
      AppLogger.warning('PostHog identify failed: $e');
    }
  }

  /// Clears the current user identity on logout to prevent session crossover.
  Future<void> reset() async {
    _identifiedUserId = null;
    _lastScreenName = null;
    _lastScreenTime = null;
    _lastViewedMachineId = null;
    _lastMachineViewedTime = null;
    _lastViewedSectionKey = null;
    _lastSectionViewedTime = null;
    _recentErrors.clear();

    if (!_isInitialized || !_isConfigured) return;

    try {
      await Posthog().reset();
      AppLogger.debug('PostHog: Identity reset successfully.');
    } catch (e) {
      AppLogger.warning('PostHog reset failed: $e');
    }
  }

  /// Tracks a strongly typed business event with sanitized properties and rapid deduplication.
  Future<void> track(
    AnalyticsEvent event, [
    Map<String, dynamic>? properties,
  ]) async {
    final now = DateTime.now();

    // Rapid deduplication: prevent double-clicks or accidental identical triggers within 500ms
    final idVal = properties?['id'] ?? properties?['machine_id'] ?? properties?['section_id'] ?? '';
    final signature = '${event.eventName}:$idVal';
    if (_lastTrackSignature == signature &&
        _lastTrackTime != null &&
        now.difference(_lastTrackTime!).inMilliseconds < 500) {
      return;
    }
    _lastTrackSignature = signature;
    _lastTrackTime = now;

    if (!_isInitialized || !_isConfigured || _consent != AnalyticsConsent.granted) {
      if (kDebugMode) {
        AppLogger.debug('Analytics [No-Op/Disabled]: ${event.eventName} -> $properties');
      }
      return;
    }

    try {
      final enriched = AnalyticsProperties.withGlobalContext(properties);
      final sanitized = AnalyticsProperties.sanitize(enriched);
      await Posthog().capture(
        eventName: event.eventName,
        properties: sanitized,
      );
      if (kDebugMode) {
        AppLogger.debug('Analytics [Captured]: ${event.eventName} -> $sanitized');
      }
    } catch (e) {
      AppLogger.warning('PostHog track failed for ${event.eventName}: $e');
    }
  }

  /// Authoritative screen transition with strict duplicate prevention.
  /// Deduplicates identical screen transitions occurring within 1.5 seconds.
  Future<void> screen(
    String screenName, [
    Map<String, dynamic>? properties,
  ]) async {
    final now = DateTime.now();
    if (_lastScreenName == screenName &&
        _lastScreenTime != null &&
        now.difference(_lastScreenTime!).inMilliseconds < 1500) {
      return;
    }
    _lastScreenName = screenName;
    _lastScreenTime = now;

    if (!_isInitialized || !_isConfigured || _consent != AnalyticsConsent.granted) {
      if (kDebugMode) {
        AppLogger.debug('Analytics Screen [No-Op/Disabled]: $screenName');
      }
      return;
    }

    try {
      final enriched = AnalyticsProperties.withGlobalContext({
        'screen_name': screenName,
        ...?properties,
      });
      final sanitized = AnalyticsProperties.sanitize(enriched);

      // 1. PostHog native Screen event
      await Posthog().screen(
        screenName: screenName,
        properties: sanitized,
      );

      // 2. Standardized screen_viewed event in taxonomy
      await Posthog().capture(
        eventName: AnalyticsEvent.screenViewed.eventName,
        properties: sanitized,
      );

      if (kDebugMode) {
        AppLogger.debug('Analytics Screen [Viewed]: $screenName');
      }
    } catch (e) {
      AppLogger.warning('PostHog screen tracking failed for $screenName: $e');
    }
  }

  /// Deduplicated machine view tracker.
  /// Prevents widget rebuilds or rapid back-navigation from spamming `machine_viewed`.
  Future<void> viewMachine(
    String machineId, [
    Map<String, dynamic>? properties,
  ]) async {
    final now = DateTime.now();
    if (_lastViewedMachineId == machineId &&
        _lastMachineViewedTime != null &&
        now.difference(_lastMachineViewedTime!).inSeconds < 10) {
      return;
    }
    _lastViewedMachineId = machineId;
    _lastMachineViewedTime = now;

    await track(
      AnalyticsEvent.machineViewed,
      {
        'machine_id': machineId,
        ...?properties,
      },
    );
  }

  /// Deduplicated section view tracker.
  /// Prevents widget rebuilds or table re-renders from spamming `section_viewed`.
  Future<void> viewSection(
    String machineId,
    String sectionId, [
    Map<String, dynamic>? properties,
  ]) async {
    final key = '$machineId/$sectionId';
    final now = DateTime.now();
    if (_lastViewedSectionKey == key &&
        _lastSectionViewedTime != null &&
        now.difference(_lastSectionViewedTime!).inSeconds < 10) {
      return;
    }
    _lastViewedSectionKey = key;
    _lastSectionViewedTime = now;

    await track(
      AnalyticsEvent.sectionViewed,
      {
        'machine_id': machineId,
        'section_id': sectionId,
        ...?properties,
      },
    );
  }

  /// Captures an application error with privacy sanitization and throttling.
  Future<void> captureError(
    dynamic error, {
    StackTrace? stackTrace,
    String? feature,
    String? operation,
    Map<String, dynamic>? properties,
  }) async {
    final errorType = error.runtimeType.toString();
    final errorMessage = error.toString().split('\n').first;
    final signature = '$errorType:$errorMessage';

    final now = DateTime.now();
    final lastTime = _recentErrors[signature];
    if (lastTime != null && now.difference(lastTime).inSeconds < 10) {
      // Throttle identical error spam within 10s
      return;
    }
    _recentErrors[signature] = now;
    if (_recentErrors.length > 50) {
      _recentErrors.remove(_recentErrors.keys.first);
    }

    if (!_isInitialized || !_isConfigured || _consent != AnalyticsConsent.granted) {
      return;
    }

    try {
      final errorProps = <String, dynamic>{
        'error_type': errorType,
        'error_message': errorMessage,
        'feature': ?feature,
        'operation': ?operation,
        ...?properties,
      };

      await track(AnalyticsEvent.appError, errorProps);
    } catch (e) {
      AppLogger.warning('PostHog captureError failed: $e');
    }
  }

  /// Captures a sanitized API error with throttling.
  Future<void> trackApiError({
    required String endpoint,
    required String operation,
    required int statusCode,
    required String errorType,
  }) async {
    final signature = '$operation:$endpoint:$statusCode';
    final now = DateTime.now();
    final lastTime = _recentErrors[signature];
    if (lastTime != null && now.difference(lastTime).inSeconds < 10) {
      return;
    }
    _recentErrors[signature] = now;
    if (_recentErrors.length > 50) {
      _recentErrors.remove(_recentErrors.keys.first);
    }

    await track(AnalyticsEvent.apiError, {
      'endpoint_name': endpoint,
      'operation': operation,
      'status_code': statusCode,
      'error_type': errorType,
    });
  }

  /// Tracks search lifecycle safely without leaking sensitive search strings.
  Future<void> searchStarted({required String searchContext}) async {
    await track(AnalyticsEvent.searchStarted, {
      'search_context': searchContext,
    });
  }

  Future<void> searchUsed({
    required String searchContext,
    required int resultCount,
  }) async {
    await track(AnalyticsEvent.searchUsed, {
      'search_context': searchContext,
      'result_count': resultCount,
    });
  }

  Future<void> searchNoResults({required String searchContext}) async {
    await track(AnalyticsEvent.searchNoResults, {
      'search_context': searchContext,
    });
  }

  /// Tracks backup lifecycle with duration and status without sensitive data.
  Future<void> backupStarted({required String backupType}) async {
    await track(AnalyticsEvent.backupStarted, {
      'backup_type': backupType,
    });
  }

  Future<void> backupCompleted({
    required String backupType,
    required int durationMs,
  }) async {
    await track(AnalyticsEvent.backupCompleted, {
      'backup_type': backupType,
      'duration_ms': durationMs,
    });
  }

  Future<void> backupFailed({
    required String backupType,
    required int durationMs,
    required String error,
  }) async {
    await track(AnalyticsEvent.backupFailed, {
      'backup_type': backupType,
      'duration_ms': durationMs,
      'error': error,
    });
  }

  Future<void> telegramBackupTested({
    required bool success,
    required int durationMs,
  }) async {
    await track(AnalyticsEvent.telegramBackupTested, {
      'result': success ? 'success' : 'failed',
      'duration_ms': durationMs,
    });
  }

  /// Evaluates a feature flag with safe offline/fallback handling.
  Future<bool> isFeatureEnabled(
    String key, {
    bool defaultValue = false,
  }) async {
    if (!_isInitialized || !_isConfigured || _consent != AnalyticsConsent.granted) {
      return defaultValue;
    }

    try {
      final isEnabled = await Posthog().isFeatureEnabled(key);
      return isEnabled;
    } catch (e) {
      AppLogger.warning('PostHog feature flag check failed for "$key": $e');
      return defaultValue;
    }
  }

  /// Updates user analytics consent (GDPR/Privacy settings) and notifies PostHog.
  Future<void> setConsent(AnalyticsConsent consent) async {
    _consent = consent;
    await AnalyticsConsentManager.setConsent(consent);

    if (_isConfigured) {
      try {
        if (consent == AnalyticsConsent.granted) {
          await Posthog().enable();
          await track(AnalyticsEvent.analyticsPreferenceChanged, {'consent': 'granted'});
        } else {
          await track(AnalyticsEvent.analyticsPreferenceChanged, {'consent': 'denied'});
          await Posthog().disable();
        }
      } catch (e) {
        AppLogger.warning('PostHog setConsent failed: $e');
      }
    }

    AppLogger.info('Analytics consent updated to: ${consent.name}');
  }
}
