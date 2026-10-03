import 'package:flutter/material.dart';
import '../../../core/constants/app_keys.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/extensions/date_extensions.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/app_button.dart';

/// Compact warning sheet for handling duplicate record dates
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
    final isDark = theme.brightness == Brightness.dark;

    final sheetBg = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;

    return Container(
      key: const Key(AppKeys.duplicateWarningDialog),
      decoration: BoxDecoration(
        color: sheetBg,
        borderRadius: AppSpacing.sheetRadius,
        border: Border(
          top: BorderSide(color: borderColor, width: 1),
          left: BorderSide(color: borderColor, width: 1),
          right: BorderSide(color: borderColor, width: 1),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(isDark ? 80 : 30),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Drag Handle
              Center(
                child: Container(
                  margin: const EdgeInsets.only(bottom: 14),
                  width: 32,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isDark
                          ? AppColors.warningContainerDark
                          : AppColors.warningContainer,
                      borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                    ),
                    child: const Icon(
                      Icons.event_repeat_rounded,
                      color: AppColors.warning,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Duplicate Date Detected',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: theme.colorScheme.onSurface,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'A record already exists for ${date.toReadableDate()}.\n\nAdding another record on this date will calculate a 0-day duration between them.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: AppButton(
                      text: 'Cancel',
                      variant: AppButtonVariant.outline,
                      size: AppButtonSize.medium,
                      onPressed: onCancel,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: AppButton(
                      keyString: AppKeys.duplicateConfirmButton,
                      text: 'Add Anyway',
                      variant: AppButtonVariant.primary,
                      size: AppButtonSize.medium,
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
