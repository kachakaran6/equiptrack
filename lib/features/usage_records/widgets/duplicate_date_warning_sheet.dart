import 'package:flutter/material.dart';
import '../../../core/constants/app_keys.dart';
import '../../../core/extensions/date_extensions.dart';
import '../../../core/widgets/app_button.dart';

class DuplicateDateWarningSheet extends StatelessWidget {
  final DateTime date;
  final VoidCallback onConfirm;
  final VoidCallback onCancel;

  const DuplicateDateWarningSheet({
    super.key,
    required this.date,
    required this.onConfirm,
    required this.onCancel,
  });

  static Future<bool?> show(BuildContext context, {required DateTime date}) {
    return showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => DuplicateDateWarningSheet(
        date: date,
        onConfirm: () => Navigator.of(context).pop(true),
        onCancel: () => Navigator.of(context).pop(false),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      key: const Key(AppKeys.duplicateWarningDialog),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(20),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Drag Handle
              Center(
                child: Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.outlineVariant,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.errorContainer.withAlpha(80),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.event_repeat_rounded,
                      color: theme.colorScheme.error,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      'Duplicate Date Detected',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'A record already exists for ${date.toReadableDate()}.\n\nDo you want to add another record for this date? (Calculated duration between equal dates will be 0 days).',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: AppButton(
                      text: 'Cancel',
                      variant: AppButtonVariant.outline,
                      onPressed: onCancel,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: AppButton(
                      keyString: AppKeys.duplicateConfirmButton,
                      text: 'Add Anyway',
                      variant: AppButtonVariant.primary,
                      onPressed: onConfirm,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
