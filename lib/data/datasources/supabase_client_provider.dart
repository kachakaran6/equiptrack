import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/utils/app_logger.dart';

/// Provider exposing the Supabase instance
final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  return Supabase.instance.client;
});

/// Initializer helper for Supabase
class SupabaseBootstrap {
  SupabaseBootstrap._();

  static Future<void> initialize() async {
    try {
      await dotenv.load(fileName: '.env').catchError((_) {
        AppLogger.warning('No .env file found or failed to load. Using fallback / runtime config.');
      });

      final url = dotenv.env['SUPABASE_URL'] ??
          const String.fromEnvironment('SUPABASE_URL', defaultValue: 'https://placeholder-project.supabase.co');
      final anonKey = dotenv.env['SUPABASE_ANON_KEY'] ??
          const String.fromEnvironment('SUPABASE_ANON_KEY', defaultValue: 'placeholder-anon-key');

      AppLogger.info('Initializing Supabase with URL: $url');

      await Supabase.initialize(
        url: url,
        publishableKey: anonKey,
        debug: false,
      );
    } catch (e, st) {
      AppLogger.error('Failed to initialize Supabase client', e, st);
    }
  }
}
