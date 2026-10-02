import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/app_update_service.dart';
import '../../../core/utils/app_logger.dart';

final appUpdateServiceProvider = Provider<AppUpdateService>((ref) {
  return AppUpdateService();
});

class AppUpdateState {
  final bool isChecking;
  final AppUpdateStatus status;
  final bool isFlexibleDownloading;
  final bool isDownloaded;
  final String? error;

  const AppUpdateState({
    this.isChecking = false,
    this.status = const AppUpdateStatus.none(),
    this.isFlexibleDownloading = false,
    this.isDownloaded = false,
    this.error,
  });

  AppUpdateState copyWith({
    bool? isChecking,
    AppUpdateStatus? status,
    bool? isFlexibleDownloading,
    bool? isDownloaded,
    String? error,
  }) {
    return AppUpdateState(
      isChecking: isChecking ?? this.isChecking,
      status: status ?? this.status,
      isFlexibleDownloading: isFlexibleDownloading ?? this.isFlexibleDownloading,
      isDownloaded: isDownloaded ?? this.isDownloaded,
      error: error,
    );
  }
}

class AppUpdateController extends Notifier<AppUpdateState> {
  @override
  AppUpdateState build() {
    return const AppUpdateState();
  }

  /// Check Google Play for available updates
  Future<AppUpdateStatus> checkForUpdate() async {
    state = state.copyWith(isChecking: true, error: null);
    try {
      final service = ref.read(appUpdateServiceProvider);
      final status = await service.checkForUpdate();
      state = state.copyWith(isChecking: false, status: status);
      return status;
    } catch (e, st) {
      AppLogger.error('AppUpdateController check error', e, st);
      state = state.copyWith(isChecking: false, error: e.toString());
      return const AppUpdateStatus.none();
    }
  }

  void markPromptShown() {
    final service = ref.read(appUpdateServiceProvider);
    service.markPromptShown();
  }

  bool get sessionPromptShown {
    final service = ref.read(appUpdateServiceProvider);
    return service.sessionPromptShown;
  }

  Future<void> startFlexibleUpdate() async {
    state = state.copyWith(isFlexibleDownloading: true, error: null);
    try {
      final service = ref.read(appUpdateServiceProvider);
      final result = await service.startFlexibleUpdate();
      state = state.copyWith(
        isFlexibleDownloading: false,
        isDownloaded: result.toString().contains('success'),
      );
    } catch (e, st) {
      AppLogger.error('Flexible update failed', e, st);
      state = state.copyWith(
        isFlexibleDownloading: false,
        error: 'Flexible update failed: $e',
      );
    }
  }

  Future<void> performImmediateUpdate() async {
    try {
      final service = ref.read(appUpdateServiceProvider);
      await service.performImmediateUpdate();
    } catch (e, st) {
      AppLogger.error('Immediate update failed', e, st);
    }
  }

  Future<void> completeFlexibleUpdate() async {
    try {
      final service = ref.read(appUpdateServiceProvider);
      await service.completeFlexibleUpdate();
    } catch (e, st) {
      AppLogger.error('Complete update failed', e, st);
    }
  }
}

final appUpdateControllerProvider =
    NotifierProvider<AppUpdateController, AppUpdateState>(AppUpdateController.new);
