import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../data/repositories/auth_repository.dart';
import '../../features/app_update/widgets/app_update_listener.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/machines/screens/machine_list_screen.dart';
import '../../features/sections/screens/machine_detail_screen.dart';
import '../../features/usage_records/screens/section_usage_screen.dart';
import 'app_routes.dart';

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
    initialLocation: AppRoutes.machines,
    refreshListenable: refreshNotifier,
    routes: [
      GoRoute(
        path: AppRoutes.login,
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) {
          return AppUpdateListener(child: child);
        },
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
