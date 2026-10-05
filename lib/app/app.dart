import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/analytics/analytics_event.dart';
import '../core/analytics/analytics_service.dart';
import '../core/constants/app_constants.dart';
import '../core/router/app_router.dart';
import '../core/theme/app_theme.dart';
import '../core/theme/theme_controller.dart';

class MachineUsageApp extends ConsumerStatefulWidget {
  const MachineUsageApp({super.key});

  @override
  ConsumerState<MachineUsageApp> createState() => _MachineUsageAppState();
}

class _MachineUsageAppState extends ConsumerState<MachineUsageApp>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    if (state == AppLifecycleState.paused) {
      AnalyticsService.instance.track(AnalyticsEvent.appBackgrounded);
    } else if (state == AppLifecycleState.resumed) {
      AnalyticsService.instance.track(AnalyticsEvent.appResumed);
    }
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(appRouterProvider);
    final themeMode = ref.watch(themeControllerProvider);

    return MaterialApp.router(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode,
      themeAnimationDuration: const Duration(milliseconds: 350),
      themeAnimationCurve: Curves.easeInOutCubic,
      routerConfig: router,
    );
  }
}
