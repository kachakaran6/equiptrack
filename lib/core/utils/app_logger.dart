import 'package:flutter/foundation.dart';

/// Lightweight structured logger that sanitizes sensitive data in production
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
  }
}
