import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/utils/app_logger.dart';
import '../../../core/widgets/update_bottom_sheet.dart';
import '../controllers/app_update_controller.dart';

/// Lifecycle-aware widget that periodically checks for Google Play In-App Updates
/// and displays the update bottom sheet when appropriate.
class AppUpdateListener extends ConsumerStatefulWidget {
  final Widget child;

  const AppUpdateListener({super.key, required this.child});

  @override
  ConsumerState<AppUpdateListener> createState() => _AppUpdateListenerState();
}

class _AppUpdateListenerState extends ConsumerState<AppUpdateListener>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    // Initial check after first frame is drawn
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkAndPromptUpdate();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      AppLogger.info('App resumed — verifying update status...');
      _checkAndPromptUpdate();
    }
  }

  Future<void> _checkAndPromptUpdate() async {
    final controller = ref.read(appUpdateControllerProvider.notifier);

    // If already prompted in this active session, do not interrupt
    if (controller.sessionPromptShown) {
      return;
    }

    final status = await controller.checkForUpdate();

    if (status.isUpdateAvailable && mounted) {
      controller.markPromptShown();

      final isImmediate = status.isImmediateAllowed && !status.isFlexibleAllowed;

      UpdateBottomSheet.show(
        context: context,
        isImmediate: isImmediate,
        availableVersionCode: status.availableVersionCode,
        onLater: () {
          // User chose later; session guard is active
        },
        onUpdateNow: () {
          if (isImmediate) {
            controller.performImmediateUpdate();
          } else {
            controller.startFlexibleUpdate();
          }
        },
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}
