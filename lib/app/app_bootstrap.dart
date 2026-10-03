import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../core/utils/app_logger.dart';

/// Initializes core services, environment configuration, and device orientations
class AppBootstrap {
  AppBootstrap._();

  static Future<void> initialize() async {
    WidgetsFlutterBinding.ensureInitialized();

    // Set preferred orientations for phones/tablets
    await SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);

    // Load environment variables (.env)
    try {
      await dotenv.load(fileName: '.env');
      AppLogger.info('Environment variables loaded successfully.');
    } catch (e) {
      AppLogger.warning('Could not load .env file (using runtime defaults): $e');
    }
  }
}
