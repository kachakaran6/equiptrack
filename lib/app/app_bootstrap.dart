import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/analytics/analytics_event.dart';
import '../core/analytics/analytics_service.dart';
import '../core/analytics/app_lifecycle_observer.dart';
import '../core/utils/app_logger.dart';
import '../data/repositories/auth_repository.dart';

/// Initializes core services, environment configuration, and device orientations
class AppBootstrap {
  AppBootstrap._();

  static Future<ProviderContainer> initialize() async {
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

    // Initialize Analytics non-blockingly
    try {
      await AnalyticsService.instance.initialize();
      await AnalyticsService.instance.track(AnalyticsEvent.appOpened);
      WidgetsBinding.instance.addObserver(AppLifecycleObserver());
    } catch (e) {
      AppLogger.warning('Analytics initialization error in bootstrap: $e');
    }

    final container = ProviderContainer();

    // Restore persistent user session before router starts
    try {
      await container.read(authRepositoryProvider).initSession();
      final isAuth = container.read(authRepositoryProvider).isAuthenticated;
      final user = container.read(authRepositoryProvider).currentUser;
      AppLogger.info('Auth session initialized: isAuthenticated=$isAuth (${user?.email ?? "none"})');

      if (isAuth && user != null) {
        // Safely identify restored session without PII
        await AnalyticsService.instance.identify(
          userId: user.id,
          properties: {
            'restored_session': true,
          },
        );
      }
    } catch (e) {
      AppLogger.warning('Error initializing auth session during bootstrap: $e');
    }

    return container;
  }
}
