import 'package:flutter/widgets.dart';
import 'analytics_screen.dart';
import 'analytics_service.dart';

/// Navigation observer for GoRouter that reports screen transitions
/// using standardized screen names.
class AnalyticsNavigationObserver extends NavigatorObserver {
  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPush(route, previousRoute);
    _recordScreenView(route);
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    super.didReplace(newRoute: newRoute, oldRoute: oldRoute);
    if (newRoute != null) {
      _recordScreenView(newRoute);
    }
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPop(route, previousRoute);
    // Only re-record screen view if returning from a full PageRoute, not dialogs/popups
    if (route is PageRoute && previousRoute != null && previousRoute is PageRoute) {
      _recordScreenView(previousRoute);
    }
  }

  void _recordScreenView(Route<dynamic> route) {
    final routeName = route.settings.name;
    if (routeName == null || routeName.isEmpty) return;

    final standardScreen = _mapRouteNameToScreen(routeName);
    if (standardScreen != null) {
      AnalyticsService.instance.screen(standardScreen);
    }
  }

  String? _mapRouteNameToScreen(String routeName) {
    switch (routeName) {
      case 'login':
        return AnalyticsScreen.login;
      case 'machines':
        return AnalyticsScreen.machines;
      case 'machineDetails':
        return AnalyticsScreen.machineDetails;
      case 'sectionUsage':
        return AnalyticsScreen.sectionUsage;
      case 'inventory':
        return AnalyticsScreen.inventory;
      case 'inventoryAddProduct':
        return AnalyticsScreen.inventoryAddProduct;
      case 'inventoryEditProduct':
        return AnalyticsScreen.inventoryEditProduct;
      case 'inventoryAddSubProduct':
        return AnalyticsScreen.inventoryAddSubProduct;
      case 'inventorySubProductDetail':
        return AnalyticsScreen.inventorySubProductDetail;
      case 'inventoryReports':
        return AnalyticsScreen.inventoryReports;
      case 'settings':
        return AnalyticsScreen.settings;
      default:
        return routeName;
    }
  }
}
