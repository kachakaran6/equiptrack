import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'app_button.dart';

/// Clean, human-friendly Error State widget
class AppErrorState extends StatelessWidget {
  final String title;
  final String message;
  final VoidCallback? onRetry;
  final String retryText;
  final IconData icon;

  const AppErrorState({
    super.key,
    this.title = 'Unable to load data',
    required this.message,
    this.onRetry,
    this.retryText = 'Try Again',
    this.icon = Icons.error_outline_rounded,
  });

  /// Sanitizes technical error messages for human users
  String _sanitizeErrorMessage(String rawMessage) {
    if (rawMessage.contains('SocketException') ||
        rawMessage.contains('Failed host lookup') ||
        rawMessage.contains('NetworkError') ||
        rawMessage.contains('ClientException')) {
      return 'Please check your internet connection and try again.';
    }
    if (rawMessage.contains('JWT') ||
        rawMessage.contains('unauthorized') ||
        rawMessage.contains('Invalid login credentials')) {
      return 'Invalid credentials. Please verify your email and password.';
    }
    if (rawMessage.contains('timeout') || rawMessage.contains('TimeoutException')) {
      return 'The server took too long to respond. Please try again in a moment.';
    }
    // Clean Exception prefixes
    return rawMessage
        .replaceAll(RegExp(r'^Exception:\s*'), '')
        .replaceAll(RegExp(r'^Error:\s*'), '');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final displayMessage = _sanitizeErrorMessage(message);

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark
                    ? AppColors.errorContainerDark
                    : AppColors.errorContainer,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.error_outline_rounded,
                size: 26,
                color: AppColors.error,
              ),
            ),
            const SizedBox(height: 14),
            Text(
              title,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: theme.colorScheme.onSurface,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 320),
              child: Text(
                displayMessage,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  height: 1.35,
                ),
                textAlign: TextAlign.center,
              ),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 18),
              AppButton(
                text: retryText,
                icon: Icons.refresh_rounded,
                size: AppButtonSize.small,
                variant: AppButtonVariant.outline,
                onPressed: onRetry,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
