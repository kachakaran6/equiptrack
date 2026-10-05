import 'package:flutter/material.dart';
import '../constants/app_keys.dart';
import '../constants/app_spacing.dart';
import '../theme/app_colors.dart';
import 'app_button.dart';

enum UpdateSheetState {
  available,
  downloading,
  downloaded,
  error,
}

class UpdateBottomSheet extends StatelessWidget {
  final UpdateSheetState state;
  final int? availableVersionCode;
  final bool isImmediate;
  final VoidCallback onUpdateNow;
  final VoidCallback onLater;
  final VoidCallback? onCompleteInstall;
  final String? errorMessage;

  const UpdateBottomSheet({
    super.key,
    this.state = UpdateSheetState.available,
    this.availableVersionCode,
    this.isImmediate = false,
    required this.onUpdateNow,
    required this.onLater,
    this.onCompleteInstall,
    this.errorMessage,
  });

  static Future<void> show({
    required BuildContext context,
    required VoidCallback onUpdateNow,
    required VoidCallback onLater,
    bool isImmediate = false,
    int? availableVersionCode,
  }) {
    return showModalBottomSheet(
      context: context,
      isDismissible: !isImmediate,
      enableDrag: !isImmediate,
      showDragHandle: false,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (context) => PopScope(
        canPop: !isImmediate,
        child: UpdateBottomSheet(
          isImmediate: isImmediate,
          availableVersionCode: availableVersionCode,
          onUpdateNow: onUpdateNow,
          onLater: onLater,
        ),
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
      key: const Key(AppKeys.updateBottomSheet),
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
              if (!isImmediate)
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
              // Icon Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isDark
                          ? AppColors.primaryContainerDark
                          : AppColors.primaryContainerLight,
                      borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                      border: Border.all(
                        color: isDark ? AppColors.borderDark : AppColors.borderLight,
                      ),
                    ),
                    child: Icon(
                      Icons.system_update_rounded,
                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Update Available',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: theme.colorScheme.onSurface,
                          ),
                        ),
                        if (availableVersionCode != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            'Build #$availableVersionCode is ready to install',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                state == UpdateSheetState.downloaded
                    ? 'The update has been downloaded. Restart the app to apply the newest features.'
                    : 'A newer version of EquipTrack is available. Update now to ensure system reliability and security.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  height: 1.4,
                ),
              ),
              if (state == UpdateSheetState.downloading) ...[
                const SizedBox(height: 16),
                const LinearProgressIndicator(),
                const SizedBox(height: 6),
                Text(
                  'Downloading in background...',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
              if (state == UpdateSheetState.error && errorMessage != null) ...[
                const SizedBox(height: 10),
                Text(
                  errorMessage!,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppColors.error,
                  ),
                ),
              ],
              const SizedBox(height: 20),
              // Action Buttons
              if (state == UpdateSheetState.downloaded) ...[
                AppButton(
                  text: 'Restart to Install',
                  icon: Icons.restart_alt_rounded,
                  onPressed: onCompleteInstall,
                  isFullWidth: true,
                  size: AppButtonSize.medium,
                ),
              ] else ...[
                Row(
                  children: [
                    if (!isImmediate) ...[
                      Expanded(
                        child: AppButton(
                          keyString: AppKeys.updateLaterButton,
                          text: 'Later',
                          variant: AppButtonVariant.outline,
                          size: AppButtonSize.medium,
                          onPressed: () {
                            Navigator.of(context).pop();
                            onLater();
                          },
                        ),
                      ),
                      const SizedBox(width: 10),
                    ],
                    Expanded(
                      flex: isImmediate ? 1 : 1,
                      child: AppButton(
                        keyString: AppKeys.updateNowButton,
                        text: 'Update Now',
                        icon: Icons.download_rounded,
                        size: AppButtonSize.medium,
                        onPressed: onUpdateNow,
                        isFullWidth: isImmediate,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
