import 'analytics_service.dart';

/// Centralized Feature Flag Service for EquipTrack.
/// Provides safe, deterministic local fallback values whenever PostHog
/// is unavailable, offline, or experiencing network timeout.
class FeatureFlagService {
  FeatureFlagService._();
  static final FeatureFlagService instance = FeatureFlagService._();

  /// Default baseline feature states
  static const Map<String, bool> _localFallbacks = {
    'new_usage_screen': false,
    'advanced_pdf_options': true,
    'dark_mode_quick_toggle': true,
    'global_categories_v2': true,
    'in_app_update_prompt': true,
  };

  /// Evaluates whether a feature flag is enabled.
  /// Always returns deterministic fallback if PostHog is unconfigured or unreachable.
  Future<bool> isEnabled(
    String key, {
    bool? defaultValue,
  }) async {
    final fallback = defaultValue ?? _localFallbacks[key] ?? false;
    try {
      return await AnalyticsService.instance.isFeatureEnabled(
        key,
        defaultValue: fallback,
      );
    } catch (_) {
      return fallback;
    }
  }

  /// Synchronous fallback helper for immediate UI decisions before async check completes
  bool getFallbackValue(String key, [bool defaultValue = false]) {
    return _localFallbacks[key] ?? defaultValue;
  }
}
