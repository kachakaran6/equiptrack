import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/core/widgets/global_app_header.dart';

void main() {
  testWidgets('GlobalAppHeader renders brand title, subtitle, and action buttons', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: Scaffold(
            appBar: GlobalAppHeader(
              title: 'EquipTrack',
              subtitle: 'Equipment Tracking',
              icon: Icons.precision_manufacturing_rounded,
            ),
            body: SizedBox(),
          ),
        ),
      ),
    );

    // Verify Title & Subtitle
    expect(find.text('EquipTrack'), findsOneWidget);
    expect(find.text('Equipment Tracking'), findsOneWidget);

    // Verify Brand Icon
    expect(find.byIcon(Icons.precision_manufacturing_rounded), findsOneWidget);

    // Verify Action Icons: Settings
    expect(find.byIcon(Icons.settings_outlined), findsOneWidget);
  });

  testWidgets('GlobalAppHeader renders on Inventory Management with custom actions', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          home: Scaffold(
            appBar: GlobalAppHeader(
              title: 'EquipTrack',
              subtitle: 'Inventory Management',
              icon: Icons.inventory_2_rounded,
              additionalActions: [
                IconButton(
                  key: const Key('stock_reports_action'),
                  icon: const Icon(Icons.assessment_outlined),
                  onPressed: () {},
                ),
              ],
            ),
            body: const SizedBox(),
          ),
        ),
      ),
    );

    expect(find.text('EquipTrack'), findsOneWidget);
    expect(find.text('Inventory Management'), findsOneWidget);
    expect(find.byIcon(Icons.inventory_2_rounded), findsOneWidget);
    expect(find.byKey(const Key('stock_reports_action')), findsOneWidget);
  });
}
