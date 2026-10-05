import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/core/analytics/widgets/analytics_privacy_dialog.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  Widget buildTestableWidget(Widget child) {
    return MaterialApp(
      home: Scaffold(
        body: child,
      ),
    );
  }

  group('AnalyticsPrivacyDialog Widget Tests', () {
    testWidgets('Renders privacy details, transparency items, and toggle switch',
        (tester) async {
      await tester.pumpWidget(
        buildTestableWidget(
          Builder(
            builder: (context) => ElevatedButton(
              onPressed: () => AnalyticsPrivacyDialog.show(context),
              child: const Text('Open Dialog'),
            ),
          ),
        ),
      );

      // Tap button to show dialog
      await tester.tap(find.text('Open Dialog'));
      await tester.pumpAndSettle();

      // Verify header and transparency details
      expect(find.text('Privacy & Analytics'), findsOneWidget);
      expect(find.text('Share Anonymous Telemetry'), findsOneWidget);
      expect(find.text('What We Collect & Why'), findsOneWidget);
      expect(find.text('Crash & Error Diagnostics'), findsOneWidget);
      expect(find.text('Feature & Screen Usage'), findsOneWidget);
      expect(find.text('Strictly NEVER Collected'), findsOneWidget);

      // Verify switch is present
      final switchFinder = find.byType(Switch);
      expect(switchFinder, findsOneWidget);

      // Tap switch to toggle consent
      await tester.tap(switchFinder);
      await tester.pumpAndSettle();

      // Close dialog
      await tester.tap(find.text('Close'));
      await tester.pumpAndSettle();

      expect(find.text('Privacy & Analytics'), findsNothing);
    });
  });
}
