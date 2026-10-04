import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../data/repositories/auth_repository.dart';
import '../../features/app_update/widgets/app_update_listener.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/inventory/controllers/inventory_controller.dart';
import '../../features/inventory/screens/add_edit_product_screen.dart';
import '../../features/inventory/screens/add_edit_sub_product_screen.dart';
import '../../features/inventory/screens/inventory_home_screen.dart';
import '../../features/inventory/screens/stock_report_screen.dart';
import '../../features/inventory/screens/sub_product_detail_screen.dart';
import '../../features/machines/screens/machine_list_screen.dart';
import '../../features/sections/screens/machine_detail_screen.dart';
import '../../features/shell/main_shell_screen.dart';
import '../../features/usage_records/screens/section_usage_screen.dart';
import '../../models/inventory_models.dart';
import 'app_routes.dart';

final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');
final GlobalKey<NavigatorState> _machinesNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'machinesTab');
final GlobalKey<NavigatorState> _inventoryNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'inventoryTab');

/// Listenable adapter that triggers GoRouter redirects whenever the stream emits
class GoRouterRefreshStream extends ChangeNotifier {
  late final StreamSubscription<dynamic> _subscription;

  GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _subscription = stream.asBroadcastStream().listen((_) => notifyListeners());
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}

final appRouterProvider = Provider<GoRouter>((ref) {
  final authRepo = ref.watch(authRepositoryProvider);
  final refreshNotifier = GoRouterRefreshStream(authRepo.authStateChanges);
  ref.onDispose(refreshNotifier.dispose);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: AppRoutes.machines,
    refreshListenable: refreshNotifier,
    routes: [
      GoRoute(
        path: AppRoutes.login,
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),

      // Top-level modal/sub screens outside shell if needed, or within Shell
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return AppUpdateListener(
            child: MainShellScreen(navigationShell: navigationShell),
          );
        },
        branches: [
          // ================= TAB 1: Equipment Tracking =================
          StatefulShellBranch(
            navigatorKey: _machinesNavigatorKey,
            routes: [
              GoRoute(
                path: AppRoutes.machines,
                name: 'machines',
                builder: (context, state) => const MachineListScreen(),
                routes: [
                  GoRoute(
                    path: ':machineId',
                    name: 'machineDetails',
                    builder: (context, state) {
                      final machineId = state.pathParameters['machineId']!;
                      return MachineDetailScreen(machineId: machineId);
                    },
                    routes: [
                      GoRoute(
                        path: 'sections/:sectionId',
                        name: 'sectionUsage',
                        builder: (context, state) {
                          final machineId = state.pathParameters['machineId']!;
                          final sectionId = state.pathParameters['sectionId']!;
                          return SectionUsageScreen(
                            machineId: machineId,
                            sectionId: sectionId,
                          );
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),

          // ================= TAB 2: Inventory Management =================
          StatefulShellBranch(
            navigatorKey: _inventoryNavigatorKey,
            routes: [
              GoRoute(
                path: AppRoutes.inventory,
                name: 'inventory',
                builder: (context, state) => const InventoryHomeScreen(),
                routes: [
                  GoRoute(
                    path: 'products/new',
                    name: 'inventoryAddProduct',
                    parentNavigatorKey: _rootNavigatorKey,
                    builder: (context, state) {
                      return const AddEditProductScreen();
                    },
                  ),
                  GoRoute(
                    path: 'products/:productId/edit',
                    name: 'inventoryEditProduct',
                    parentNavigatorKey: _rootNavigatorKey,
                    builder: (context, state) {
                      final product = state.extra as InventoryProduct?;
                      return AddEditProductScreen(product: product);
                    },
                  ),
                  GoRoute(
                    path: 'products/:productId/sub-products/new',
                    name: 'inventoryAddSubProduct',
                    parentNavigatorKey: _rootNavigatorKey,
                    builder: (context, state) {
                      final productId = state.pathParameters['productId']!;
                      final products = ref.read(inventoryProductsProvider).asData?.value ?? [];
                      final product = products.firstWhere(
                        (p) => p.id == productId,
                        orElse: () => InventoryProduct(
                          id: productId,
                          userId: '',
                          name: 'Product',
                          createdAt: DateTime.now(),
                          updatedAt: DateTime.now(),
                        ),
                      );
                      return AddEditSubProductScreen(product: product);
                    },
                  ),
                  GoRoute(
                    path: 'sub-products/:subProductId',
                    name: 'inventorySubProductDetail',
                    parentNavigatorKey: _rootNavigatorKey,
                    builder: (context, state) {
                      final subProductId = state.pathParameters['subProductId']!;
                      final productName = state.extra as String? ?? '';
                      return SubProductDetailScreen(
                        subProductId: subProductId,
                        productName: productName,
                      );
                    },
                  ),
                  GoRoute(
                    path: 'reports',
                    name: 'inventoryReports',
                    parentNavigatorKey: _rootNavigatorKey,
                    builder: (context, state) => const StockReportScreen(),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
    redirect: (BuildContext context, GoRouterState state) {
      final isAuthenticated = authRepo.isAuthenticated;
      final isLoggingIn = state.matchedLocation == AppRoutes.login;

      // Unauthenticated user -> send to /login
      if (!isAuthenticated && !isLoggingIn) {
        return AppRoutes.login;
      }

      // Authenticated user trying to access /login -> send to /machines
      if (isAuthenticated && isLoggingIn) {
        return AppRoutes.machines;
      }

      return null;
    },
  );
});
