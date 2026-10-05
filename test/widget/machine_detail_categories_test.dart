import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/core/theme/app_theme.dart';
import 'package:machine_usage_app/data/repositories/category_repository.dart';
import 'package:machine_usage_app/data/repositories/section_repository.dart';
import 'package:machine_usage_app/data/repositories/usage_record_repository.dart';
import 'package:machine_usage_app/features/machines/controllers/machines_controller.dart';
import 'package:machine_usage_app/features/sections/screens/machine_detail_screen.dart';
import 'package:machine_usage_app/models/category.dart';
import 'package:machine_usage_app/models/machine.dart';
import 'package:machine_usage_app/models/section.dart';

void main() {
  group('MachineDetailScreen Category & Report Tests', () {
    final now = DateTime(2026, 10, 5);

    final testMachine = Machine(
      id: 'm-1',
      name: 'Extruder 01',
      description: 'High temperature plastics extruder',
      createdAt: now,
      updatedAt: now,
    );

    final catBearings = Category(
      id: 'cat-1',
      machineId: 'm-1',
      name: 'Bearings',
      createdAt: now,
      updatedAt: now,
    );

    final catMotors = Category(
      id: 'cat-2',
      machineId: 'm-1',
      name: 'Motors',
      createdAt: now,
      updatedAt: now,
    );

    final sec1 = Section(
      id: 's-1',
      machineId: 'm-1',
      name: 'Thrust Bearing A',
      categoryId: 'cat-1',
      createdAt: now,
      updatedAt: now,
    );

    final sec2 = Section(
      id: 's-2',
      machineId: 'm-1',
      name: 'Roller Bearing B',
      categoryId: 'cat-1',
      createdAt: now,
      updatedAt: now,
    );

    final sec3 = Section(
      id: 's-3',
      machineId: 'm-1',
      name: 'Drive Motor',
      categoryId: 'cat-2',
      createdAt: now,
      updatedAt: now,
    );

    final secUncat = Section(
      id: 's-4',
      machineId: 'm-1',
      name: 'Heating Band',
      categoryId: null,
      createdAt: now,
      updatedAt: now,
    );

    testWidgets('Renders Category Accordions with component counts and action buttons',
        (tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            singleMachineProvider('m-1').overrideWith((ref) => Future.value(testMachine)),
            categoriesStreamFamily('m-1').overrideWith((ref) => Future.value([catBearings, catMotors])),
            sectionsStreamFamily('m-1').overrideWith((ref) => Future.value([sec1, sec2, sec3, secUncat])),
            usageRecordsStreamFamily('s-1').overrideWith((ref) => Future.value([])),
            usageRecordsStreamFamily('s-2').overrideWith((ref) => Future.value([])),
            usageRecordsStreamFamily('s-3').overrideWith((ref) => Future.value([])),
            usageRecordsStreamFamily('s-4').overrideWith((ref) => Future.value([])),
          ],
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const MachineDetailScreen(machineId: 'm-1'),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Check Machine details header
      expect(find.text('Extruder 01'), findsWidgets);

      // Check Action Buttons
      expect(find.text('Create Category'), findsOneWidget);
      expect(find.text('Select for Report'), findsOneWidget);

      // Check Category Accordion headers
      expect(find.text('Bearings'), findsOneWidget);
      expect(find.text('Motors'), findsOneWidget);
      expect(find.text('Uncategorized'), findsOneWidget);

      // Check Components inside accordions
      expect(find.text('Thrust Bearing A'), findsOneWidget);
      expect(find.text('Roller Bearing B'), findsOneWidget);
      expect(find.text('Drive Motor'), findsOneWidget);
      expect(find.text('Heating Band'), findsOneWidget);
    });

    testWidgets('Selection mode enables checkboxes and Generate PDF button',
        (tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            singleMachineProvider('m-1').overrideWith((ref) => Future.value(testMachine)),
            categoriesStreamFamily('m-1').overrideWith((ref) => Future.value([catBearings, catMotors])),
            sectionsStreamFamily('m-1').overrideWith((ref) => Future.value([sec1, sec2, sec3, secUncat])),
            usageRecordsStreamFamily('s-1').overrideWith((ref) => Future.value([])),
            usageRecordsStreamFamily('s-2').overrideWith((ref) => Future.value([])),
            usageRecordsStreamFamily('s-3').overrideWith((ref) => Future.value([])),
            usageRecordsStreamFamily('s-4').overrideWith((ref) => Future.value([])),
          ],
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const MachineDetailScreen(machineId: 'm-1'),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Tap 'Select for Report'
      await tester.tap(find.text('Select for Report'));
      await tester.pumpAndSettle();

      // Check selection bar appears
      expect(find.text('Select All'), findsOneWidget);
      expect(find.text('Clear'), findsOneWidget);
      expect(find.text('Generate PDF (0)'), findsOneWidget);

      // Tap 'Select All'
      await tester.tap(find.text('Select All'));
      await tester.pumpAndSettle();

      // Check all 4 components are selected
      expect(find.text('Generate PDF (4)'), findsOneWidget);
      expect(find.text('4 of 4 selected'), findsOneWidget);

      // Tap 'Clear'
      await tester.tap(find.text('Clear'));
      await tester.pumpAndSettle();

      expect(find.text('Generate PDF (0)'), findsOneWidget);
      expect(find.text('0 of 4 selected'), findsOneWidget);
    });
  });
}
