import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/core/theme/app_theme.dart';
import 'package:machine_usage_app/core/widgets/app_button.dart';
import 'package:machine_usage_app/core/widgets/app_empty_state.dart';
import 'package:machine_usage_app/core/widgets/app_error_state.dart';
import 'package:machine_usage_app/core/widgets/app_loading.dart';
import 'package:machine_usage_app/core/widgets/app_text_field.dart';
import 'package:machine_usage_app/core/widgets/update_bottom_sheet.dart';

void main() {
  Widget wrapWithTheme(Widget child) {
    return MaterialApp(
      theme: AppTheme.lightTheme,
      home: Scaffold(body: child),
    );
  }

  group('UI Components Widget Tests', () {
    testWidgets('AppButton renders text, responds to tap, and handles loading state',
        (tester) async {
      var tapped = false;

      await tester.pumpWidget(
        wrapWithTheme(
          AppButton(
            text: 'Click Me',
            onPressed: () => tapped = true,
          ),
        ),
      );

      expect(find.text('Click Me'), findsOneWidget);
      await tester.tap(find.text('Click Me'));
      expect(tapped, isTrue);

      // Loading state
      await tester.pumpWidget(
        wrapWithTheme(
          AppButton(
            text: 'Click Me',
            isLoading: true,
            onPressed: () => tapped = false,
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('AppTextField renders label, hint, and toggles password visibility',
        (tester) async {
      await tester.pumpWidget(
        wrapWithTheme(
          const AppTextField(
            label: 'Secret Password',
            hintText: 'Enter password',
            isPassword: true,
          ),
        ),
      );

      expect(find.textContaining('Secret Password'), findsOneWidget);
      expect(find.text('Enter password'), findsOneWidget);
      expect(find.byIcon(Icons.visibility_off_outlined), findsOneWidget);

      await tester.tap(find.byIcon(Icons.visibility_off_outlined));
      await tester.pump();
      expect(find.byIcon(Icons.visibility_outlined), findsOneWidget);
    });

    testWidgets('AppEmptyState renders title, message, and action button', (tester) async {
      var actionTriggered = false;

      await tester.pumpWidget(
        wrapWithTheme(
          AppEmptyState(
            title: 'No Machines',
            message: 'Add your first machine',
            actionLabel: 'Create Machine',
            onAction: () => actionTriggered = true,
          ),
        ),
      );

      expect(find.text('No Machines'), findsOneWidget);
      expect(find.text('Add your first machine'), findsOneWidget);
      expect(find.text('Create Machine'), findsOneWidget);

      await tester.tap(find.text('Create Machine'));
      expect(actionTriggered, isTrue);
    });

    testWidgets('AppErrorState renders message and retry button', (tester) async {
      var retryTriggered = false;

      await tester.pumpWidget(
        wrapWithTheme(
          AppErrorState(
            message: 'Server connection timeout',
            onRetry: () => retryTriggered = true,
          ),
        ),
      );

      expect(
        find.text('The server took too long to respond. Please try again in a moment.'),
        findsOneWidget,
      );
      expect(find.text('Try Again'), findsOneWidget);

      await tester.tap(find.text('Try Again'));
      expect(retryTriggered, isTrue);
    });

    testWidgets('AppLoading renders spinner and optional message', (tester) async {
      await tester.pumpWidget(
        wrapWithTheme(
          const AppLoading(message: 'Loading assets...'),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Loading assets...'), findsOneWidget);
    });

    testWidgets('UpdateBottomSheet renders update prompt and buttons', (tester) async {
      var updateTapped = false;
      var laterTapped = false;

      await tester.pumpWidget(
        wrapWithTheme(
          UpdateBottomSheet(
            availableVersionCode: 105,
            onUpdateNow: () => updateTapped = true,
            onLater: () => laterTapped = true,
          ),
        ),
      );

      expect(find.text('Update Available'), findsOneWidget);
      expect(find.text('Build #105 is ready to install'), findsOneWidget);
      expect(find.text('Update Now'), findsOneWidget);
      expect(find.text('Later'), findsOneWidget);

      await tester.tap(find.text('Update Now'));
      expect(updateTapped, isTrue);

      await tester.tap(find.text('Later'));
      expect(laterTapped, isTrue);
    });
  });
}
