import 'package:flutter/material.dart';
import '../constants/app_keys.dart';
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

    return Container(
      key: const Key(AppKeys.updateBottomSheet),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(25),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Drag Handle
              if (!isImmediate)
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
              // Icon Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer.withAlpha(120),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.system_update_rounded,
                      color: theme.colorScheme.primary,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Update available',
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        if (availableVersionCode != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            'Build #$availableVersionCode is ready',
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
              const SizedBox(height: 16),
              Text(
                state == UpdateSheetState.downloaded
                    ? 'The update is downloaded and ready to be installed. Restart the app to apply the newest features.'
                    : 'A newer version of the application is available on Google Play. Update now to get the latest features, reliability improvements, and security updates.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  height: 1.4,
                ),
              ),
              if (state == UpdateSheetState.downloading) ...[
                const SizedBox(height: 20),
                const LinearProgressIndicator(),
                const SizedBox(height: 8),
                Text(
                  'Downloading in background...',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
              if (state == UpdateSheetState.error && errorMessage != null) ...[
                const SizedBox(height: 12),
                Text(
                  errorMessage!,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.error,
                  ),
                ),
              ],
              const SizedBox(height: 24),
              // Action Buttons
              if (state == UpdateSheetState.downloaded) ...[
                AppButton(
                  text: 'Restart to Install',
                  icon: Icons.restart_alt_rounded,
                  onPressed: onCompleteInstall,
                  isFullWidth: true,
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
                          onPressed: () {
                            Navigator.of(context).pop();
                            onLater();
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                    ],
                    Expanded(
                      flex: isImmediate ? 1 : 1,
                      child: AppButton(
                        keyString: AppKeys.updateNowButton,
                        text: 'Update now',
                        icon: Icons.download_rounded,
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
