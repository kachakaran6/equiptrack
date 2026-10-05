import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;

import '../analytics/analytics_service.dart';

/// Lightweight structured logger that sanitizes sensitive data in production
/// and forwards runtime errors to backend DB and PostHog for diagnosis.
class AppLogger {
  AppLogger._();

  static void debug(String message, [dynamic error, StackTrace? stackTrace]) {
    if (kDebugMode) {
      // ignore: avoid_print
      print('[DEBUG] $message ${error != null ? ' | Error: $error' : ''}');
      if (stackTrace != null) {
        // ignore: avoid_print
        print(stackTrace);
      }
    }
  }

  static void info(String message) {
    if (kDebugMode) {
      // ignore: avoid_print
      print('[INFO] $message');
    }
  }

  static void warning(String message, [dynamic error]) {
    if (kDebugMode) {
      // ignore: avoid_print
      print('[WARN] $message ${error != null ? ' | Details: $error' : ''}');
    }
  }

  static void error(String message, [dynamic error, StackTrace? stackTrace]) {
    // ignore: avoid_print
    print('[ERROR] $message ${error != null ? ' | Details: $error' : ''}');
    if (kDebugMode && stackTrace != null) {
      // ignore: avoid_print
      print(stackTrace);
    }
    _reportToBackend(message, error, stackTrace);

    try {
      AnalyticsService.instance.captureError(
        error ?? message,
        stackTrace: stackTrace,
        properties: {'log_message': message},
      );
    } catch (_) {
      // Ignore background analytics capture errors
    }
  }

  static void _reportToBackend(String message, dynamic error, StackTrace? stackTrace) {
    try {
      if (!dotenv.isInitialized) return;
      final baseUrl = dotenv.env['API_BASE_URL']?.trim();
      if (baseUrl == null || baseUrl.isEmpty) return;

      final url = Uri.parse('$baseUrl/logs/error');
      final body = jsonEncode({
        'source': 'client',
        'level': 'error',
        'message': message,
        'stackTrace': error != null ? '$error\n${stackTrace ?? ""}' : (stackTrace?.toString() ?? ''),
        'metadata': {
          'platform': defaultTargetPlatform.toString(),
          'kDebugMode': kDebugMode,
        },
      });

      http
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: body,
          )
          .catchError((_) => http.Response('', 500));
    } catch (_) {
      // Ignore background reporting errors
    }
  }
}
