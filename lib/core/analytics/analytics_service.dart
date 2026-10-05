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
      final sanitized = AnalyticsProperties.sanitize(properties);
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
    if (!_isInitialized || !_isConfigured) return;

    try {
      await Posthog().reset();
      AppLogger.debug('PostHog: Identity reset successfully.');
    } catch (e) {
      AppLogger.warning('PostHog reset failed: $e');
    }
  }

  /// Tracks a strongly typed business event with sanitized properties.
  Future<void> track(
    AnalyticsEvent event, [
    Map<String, dynamic>? properties,
  ]) async {
    if (!_isInitialized || !_isConfigured || _consent != AnalyticsConsent.granted) {
      if (kDebugMode) {
        AppLogger.debug('Analytics [No-Op/Disabled]: ${event.eventName} -> $properties');
      }
      return;
    }

    try {
      final sanitized = AnalyticsProperties.sanitize(properties);
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

  /// Tracks a screen transition with standardized stable screen names.
  Future<void> screen(
    String screenName, [
    Map<String, dynamic>? properties,
  ]) async {
    if (!_isInitialized || !_isConfigured || _consent != AnalyticsConsent.granted) {
      if (kDebugMode) {
        AppLogger.debug('Analytics Screen [No-Op/Disabled]: $screenName');
      }
      return;
    }

    try {
      final sanitized = AnalyticsProperties.sanitize(properties);
      await Posthog().screen(
        screenName: screenName,
        properties: sanitized,
      );
      if (kDebugMode) {
        AppLogger.debug('Analytics Screen [Viewed]: $screenName');
      }
    } catch (e) {
      AppLogger.warning('PostHog screen tracking failed for $screenName: $e');
    }
  }

  /// Captures an application error with privacy sanitization.
  Future<void> captureError(
    dynamic error, {
    StackTrace? stackTrace,
    String? feature,
    String? operation,
    Map<String, dynamic>? properties,
  }) async {
    if (!_isInitialized || !_isConfigured || _consent != AnalyticsConsent.granted) {
      return;
    }

    try {
      final errorType = error.runtimeType.toString();
      final errorMessage = error.toString().split('\n').first;

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
