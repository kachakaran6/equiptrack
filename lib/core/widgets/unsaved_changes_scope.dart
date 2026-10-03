import 'package:flutter/material.dart';
import 'app_confirm_dialog.dart';

/// Wraps form screens/sheets to intercept back navigation when unsaved changes exist
class UnsavedChangesScope extends StatelessWidget {
  final bool hasUnsavedChanges;
  final Widget child;

  const UnsavedChangesScope({
    super.key,
    required this.hasUnsavedChanges,
    required this.child,
  });

  Future<bool> _showDiscardDialog(BuildContext context) async {
    final result = await AppConfirmDialog.show(
      context: context,
      title: 'Discard changes?',
      message: 'You have unsaved changes that will be lost if you leave this screen.',
      confirmLabel: 'Discard',
      cancelLabel: 'Keep Editing',
      isDestructive: true,
    );

    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !hasUnsavedChanges,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final shouldDiscard = await _showDiscardDialog(context);
        if (shouldDiscard && context.mounted) {
          Navigator.of(context).pop();
        }
      },
      child: child,
    );
  }
}
