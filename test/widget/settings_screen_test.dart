import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/core/theme/app_theme.dart';
import 'package:machine_usage_app/data/repositories/auth_repository.dart';
import 'package:machine_usage_app/data/repositories/category_repository.dart';
import 'package:machine_usage_app/features/settings/screens/settings_screen.dart';
import 'package:machine_usage_app/models/app_user.dart';
import 'package:machine_usage_app/models/category.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('SettingsScreen Widget Tests', () {
    final now = DateTime(2026, 10, 5);
    final testUser = const AppUser(id: 'user-1', email: 'test@equiptrack.com');

    final catElectrical = Category(
      id: 'cat-1',
      name: 'Electrical',
      createdAt: now,
      updatedAt: now,
    );

    final catHydraulic = Category(
      id: 'cat-2',
      name: 'Hydraulic',
      createdAt: now,
      updatedAt: now,
    );

    testWidgets('Renders Global Categories, Theme, Privacy, and Account sections',
        (tester) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            currentUserProvider.overrideWithValue(testUser),
            allCategoriesProvider.overrideWith((ref) => Future.value([catElectrical, catHydraulic])),
          ],
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const SettingsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify sections
      expect(find.text('Settings'), findsOneWidget);
      expect(find.text('Global Categories'), findsOneWidget);
      expect(find.text('Electrical'), findsOneWidget);
      expect(find.text('Hydraulic'), findsOneWidget);
      expect(find.text('Appearance'), findsOneWidget);
      expect(find.text('Privacy & Analytics'), findsOneWidget);
      expect(find.text('App Version & Updates'), findsOneWidget);
      expect(find.text('Account'), findsOneWidget);
      expect(find.text('test@equiptrack.com'), findsOneWidget);
    });
  });
}
