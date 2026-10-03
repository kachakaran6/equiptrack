import 'package:flutter/material.dart';
import '../constants/app_spacing.dart';
import '../theme/app_colors.dart';
import 'app_button.dart';

/// Concise, platform-aligned confirmation dialog for destructive and unsaved actions
class AppConfirmDialog extends StatelessWidget {
  final String title;
  final String message;
  final String? cascadeNotice;
  final String confirmLabel;
  final String cancelLabel;
  final bool isDestructive;
  final VoidCallback onConfirm;
  final VoidCallback? onCancel;

  const AppConfirmDialog({
    super.key,
    required this.title,
    required this.message,
    this.cascadeNotice,
    this.confirmLabel = 'Delete',
    this.cancelLabel = 'Cancel',
    this.isDestructive = true,
    required this.onConfirm,
    this.onCancel,
  });

  static Future<bool?> show({
    required BuildContext context,
    required String title,
    required String message,
    String? cascadeNotice,
    String confirmLabel = 'Delete',
    String cancelLabel = 'Cancel',
    bool isDestructive = true,
  }) {
    return showDialog<bool>(
      context: context,
      builder: (context) => AppConfirmDialog(
        title: title,
        message: message,
        cascadeNotice: cascadeNotice,
        confirmLabel: confirmLabel,
        cancelLabel: cancelLabel,
        isDestructive: isDestructive,
        onConfirm: () => Navigator.of(context).pop(true),
        onCancel: () => Navigator.of(context).pop(false),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final dialogBg = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final borderColor = isDark ? AppColors.borderDark : AppColors.borderLight;

    return AlertDialog(
      backgroundColor: dialogBg,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: AppSpacing.dialogRadius,
        side: BorderSide(color: borderColor, width: 1),
      ),
      titlePadding: const EdgeInsets.fromLTRB(20, 20, 20, 10),
      contentPadding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      actionsPadding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: isDestructive
                  ? (isDark ? AppColors.errorContainerDark : AppColors.errorContainer)
                  : (isDark ? AppColors.primaryContainerDark : AppColors.primaryContainerLight),
              borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
            ),
            child: Icon(
              isDestructive ? Icons.warning_amber_rounded : Icons.info_outline_rounded,
              color: isDestructive ? AppColors.error : theme.colorScheme.primary,
              size: 18,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: theme.colorScheme.onSurface,
              ),
            ),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            message,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              height: 1.4,
            ),
          ),
          if (cascadeNotice != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isDark ? AppColors.errorContainerDark.withAlpha(120) : AppColors.errorContainer.withAlpha(140),
                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                border: Border.all(
                  color: isDark ? AppColors.error.withAlpha(60) : AppColors.error.withAlpha(80),
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.info_outline_rounded,
                    size: 16,
                    color: AppColors.error,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      cascadeNotice!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: isDark ? AppColors.onErrorContainerDark : AppColors.onErrorContainer,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
      actions: [
        AppButton(
          text: cancelLabel,
          variant: AppButtonVariant.outline,
          size: AppButtonSize.small,
          onPressed: onCancel ?? () => Navigator.of(context).pop(false),
        ),
        const SizedBox(width: 4),
        AppButton(
          text: confirmLabel,
          variant: isDestructive ? AppButtonVariant.danger : AppButtonVariant.primary,
          size: AppButtonSize.small,
          onPressed: onConfirm,
        ),
      ],
    );
  }
}
