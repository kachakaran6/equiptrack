import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/utils/app_logger.dart';
import '../data/datasources/supabase_client_provider.dart';

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

    // Initialize Supabase
    try {
      await SupabaseBootstrap.initialize();
    } catch (e, st) {
      AppLogger.error('AppBootstrap: Supabase initialization failed', e, st);
    }
  }
}
