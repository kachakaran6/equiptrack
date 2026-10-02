import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:in_app_update/in_app_update.dart';
import '../utils/app_logger.dart';

/// Data class holding update status info
class AppUpdateStatus {
  final bool isUpdateAvailable;
  final bool isFlexibleAllowed;
  final bool isImmediateAllowed;
  final int? availableVersionCode;
  final int? updatePriority;

  const AppUpdateStatus({
    required this.isUpdateAvailable,
    required this.isFlexibleAllowed,
    required this.isImmediateAllowed,
    this.availableVersionCode,
    this.updatePriority,
  });

  const AppUpdateStatus.none()
      : isUpdateAvailable = false,
        isFlexibleAllowed = false,
        isImmediateAllowed = false,
        availableVersionCode = null,
        updatePriority = null;
}

/// Service handling Google Play In-App Updates directly without custom backend servers.
class AppUpdateService {
  AppUpdateInfo? _updateInfo;
  bool _sessionPromptShown = false;
  DateTime? _lastCheckTime;

  /// Whether a prompt has already been surfaced during this active user session
  bool get sessionPromptShown => _sessionPromptShown;

  /// Mark that the user was prompted during this session
  void markPromptShown() {
    _sessionPromptShown = true;
  }

  /// Reset session guard (e.g., when a fresh session starts)
  void resetSessionGuard() {
    _sessionPromptShown = false;
  }

  /// Check Google Play for an available in-app update.
  /// Gracefully catches errors when Play Services are unavailable or running on non-Android platforms.
  Future<AppUpdateStatus> checkForUpdate() async {
    // In-app updates are only available on Android platform
    if (kIsWeb || !Platform.isAndroid) {
      AppLogger.debug('InAppUpdate: skipped (non-Android platform)');
      return const AppUpdateStatus.none();
    }

    // Debounce rapid checks (e.g., on repeated app resume)
    final now = DateTime.now();
    if (_lastCheckTime != null &&
        now.difference(_lastCheckTime!).inSeconds < 60 &&
        _updateInfo != null) {
      return _buildStatusFromInfo(_updateInfo!);
    }

    try {
      _lastCheckTime = now;
      AppLogger.info('InAppUpdate: Checking Google Play for updates...');
      _updateInfo = await InAppUpdate.checkForUpdate();

      if (_updateInfo != null) {
        final isAvailable =
            _updateInfo!.updateAvailability == UpdateAvailability.updateAvailable;

        AppLogger.info(
          'InAppUpdate result: available=$isAvailable, flexible=${_updateInfo!.flexibleUpdateAllowed}, immediate=${_updateInfo!.immediateUpdateAllowed}, versionCode=${_updateInfo!.availableVersionCode}',
        );

        return _buildStatusFromInfo(_updateInfo!);
      }
    } catch (e, st) {
      // Play Store unavailable, debug build, network issue, or unlisted package.
      // Must degrade gracefully without crashing the app.
      AppLogger.warning('InAppUpdate: Google Play update check unavailable', e);
      AppLogger.debug('InAppUpdate stack trace', null, st);
    }

    return const AppUpdateStatus.none();
  }

  /// Start flexible update (downloads in background while user continues using app)
  Future<AppUpdateResult> startFlexibleUpdate() async {
    if (kIsWeb || !Platform.isAndroid) {
      return AppUpdateResult.inAppUpdateFailed;
    }

    try {
      AppLogger.info('InAppUpdate: Starting flexible update...');
      return await InAppUpdate.startFlexibleUpdate();
    } catch (e, st) {
      AppLogger.error('InAppUpdate: flexible update failed', e, st);
      return AppUpdateResult.inAppUpdateFailed;
    }
  }

  /// Complete flexible update and restart the app
  Future<void> completeFlexibleUpdate() async {
    if (kIsWeb || !Platform.isAndroid) return;

    try {
      AppLogger.info('InAppUpdate: Completing flexible update...');
      await InAppUpdate.completeFlexibleUpdate();
    } catch (e, st) {
      AppLogger.error('InAppUpdate: complete update failed', e, st);
    }
  }

  /// Perform immediate update (blocking full-screen flow for critical updates)
  Future<AppUpdateResult> performImmediateUpdate() async {
    if (kIsWeb || !Platform.isAndroid) {
      return AppUpdateResult.inAppUpdateFailed;
    }

    try {
      AppLogger.info('InAppUpdate: Performing immediate update...');
      return await InAppUpdate.performImmediateUpdate();
    } catch (e, st) {
      AppLogger.error('InAppUpdate: immediate update failed', e, st);
      return AppUpdateResult.inAppUpdateFailed;
    }
  }

  AppUpdateStatus _buildStatusFromInfo(AppUpdateInfo info) {
    final isAvailable =
        info.updateAvailability == UpdateAvailability.updateAvailable;
    return AppUpdateStatus(
      isUpdateAvailable: isAvailable,
      isFlexibleAllowed: info.flexibleUpdateAllowed,
      isImmediateAllowed: info.immediateUpdateAllowed,
      availableVersionCode: info.availableVersionCode,
      updatePriority: info.updatePriority,
    );
  }
}
