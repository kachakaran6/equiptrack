import 'package:shared_preferences/shared_preferences.dart';
import '../utils/app_logger.dart';

enum AnalyticsConsent {
  granted,
  denied;

  bool get isGranted => this == AnalyticsConsent.granted;
}

/// Persistent manager for user analytics preferences and GDPR/privacy controls.
class AnalyticsConsentManager {
  static const String _consentKey = 'equiptrack_analytics_consent_status';

  static Future<AnalyticsConsent> getConsent() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final stored = prefs.getString(_consentKey);
      if (stored == 'denied') {
        return AnalyticsConsent.denied;
      }
      // Defaults to granted unless explicitly turned off by user in privacy settings
      return AnalyticsConsent.granted;
    } catch (e) {
      AppLogger.warning('Could not read analytics consent preference: $e');
      return AnalyticsConsent.granted;
    }
  }

  static Future<void> setConsent(AnalyticsConsent consent) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_consentKey, consent.name);
    } catch (e) {
      AppLogger.warning('Could not persist analytics consent preference: $e');
    }
  }
}
