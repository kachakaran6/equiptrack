import 'package:flutter/foundation.dart';

/// Utilities for sanitizing and building privacy-safe PostHog event properties.
class AnalyticsProperties {
  AnalyticsProperties._();

  static const List<String> _blacklistedKeySubstrings = [
    'password',
    'token',
    'jwt',
    'auth',
    'authorization',
    'secret',
    'key',
    'credential',
    'database',
    'postgres',
    'telegram',
    'private',
    'connection_string',
    'dsn',
    'cookie',
  ];

  /// Recursively sanitizes a map of properties to ensure no sensitive or oversized
  /// data is leaked to PostHog.
  static Map<String, Object> sanitize(Map<String, dynamic>? properties) {
    if (properties == null || properties.isEmpty) {
      return {};
    }

    final sanitized = <String, Object>{};

    for (final entry in properties.entries) {
      final key = entry.key.trim().toLowerCase();

      // Check if key contains any blacklisted sensitive terms
      final isBlacklisted = _blacklistedKeySubstrings.any((sub) => key.contains(sub));
      if (isBlacklisted) {
        continue; // Exclude sensitive key entirely
      }

      final value = entry.value;
      if (value == null) continue;

      final safeValue = _sanitizeValue(value);
      if (safeValue != null) {
        sanitized[entry.key] = safeValue;
      }
    }

    return sanitized;
  }

  static Object? _sanitizeValue(dynamic value) {
    if (value is String) {
      // Basic string sanity: truncate long strings to max 256 chars
      if (value.length > 256) {
        return value.substring(0, 256);
      }
      return value;
    } else if (value is num || value is bool) {
      return value;
    } else if (value is List) {
      final list = <Object>[];
      for (final item in value) {
        final sanitizedItem = _sanitizeValue(item);
        if (sanitizedItem != null) {
          list.add(sanitizedItem);
        }
      }
      return list;
    } else if (value is Map<String, dynamic>) {
      return sanitize(value);
    } else if (value is Enum) {
      return value.name;
    } else {
      return value.toString();
    }
  }

  /// Ambient properties attached to events for diagnostic context
  static Map<String, Object> ambient({
    String? appVersion,
    String? platform,
    String? environment,
  }) {
    return {
      'app_platform': platform ?? defaultTargetPlatform.name,
      'is_debug': kDebugMode,
      'app_version': ?appVersion,
      'environment': ?environment,
    };
  }
}
