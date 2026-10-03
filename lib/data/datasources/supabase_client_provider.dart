import 'package:flutter/services.dart';
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
    String? url;
    String? anonKey;

    try {
      await dotenv.load(fileName: '.env');
      url = dotenv.env['SUPABASE_URL'];
      anonKey = dotenv.env['SUPABASE_ANON_KEY'];
    } catch (e) {
      AppLogger.warning('dotenv.load failed, attempting manual asset parse: $e');
      try {
        final envContent = await rootBundle.loadString('.env');
        for (final line in envContent.split('\n')) {
          final trimmed = line.trim();
          if (trimmed.startsWith('#') || !trimmed.contains('=')) continue;
          final parts = trimmed.split('=');
          final key = parts[0].trim();
          final value = parts.sublist(1).join('=').trim();
          if (key == 'SUPABASE_URL') url = value;
          if (key == 'SUPABASE_ANON_KEY') anonKey = value;
        }
      } catch (assetError) {
        AppLogger.warning('Manual .env asset read failed: $assetError');
      }
    }

    url ??= const String.fromEnvironment('SUPABASE_URL', defaultValue: 'https://hpwgqrcftjqmklxxcnap.supabase.co');
    anonKey ??= const String.fromEnvironment('SUPABASE_ANON_KEY', defaultValue: 'placeholder-anon-key');

    AppLogger.info('Initializing Supabase with URL: $url');

    try {
      await Supabase.initialize(
        url: url,
        publishableKey: anonKey,
        debug: false,
      );
      AppLogger.info('Supabase client initialized successfully.');
    } catch (e, st) {
      AppLogger.error('Failed to initialize Supabase client', e, st);
    }
  }
}
