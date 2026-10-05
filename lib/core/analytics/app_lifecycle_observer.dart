import 'package:flutter/widgets.dart';
import 'analytics_event.dart';
import 'analytics_service.dart';

/// App lifecycle observer that logs high-signal app state transitions
/// (app_resumed and app_backgrounded) to support active user (DAU/WAU/MAU)
/// and session retention analysis in PostHog.
class AppLifecycleObserver with WidgetsBindingObserver {
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.resumed:
        AnalyticsService.instance.track(AnalyticsEvent.appResumed);
        break;
      case AppLifecycleState.paused:
      case AppLifecycleState.inactive:
        AnalyticsService.instance.track(AnalyticsEvent.appBackgrounded);
        break;
      case AppLifecycleState.detached:
      case AppLifecycleState.hidden:
        break;
    }
  }
}
