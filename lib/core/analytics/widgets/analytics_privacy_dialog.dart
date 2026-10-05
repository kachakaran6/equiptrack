import 'package:flutter/material.dart';
import '../../constants/app_spacing.dart';
import '../../extensions/context_extensions.dart';
import '../../theme/app_colors.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_card.dart';
import '../analytics_consent.dart';
import '../analytics_screen.dart';
import '../analytics_service.dart';

/// Interactive Privacy & Analytics preferences dialog enabling users to
/// transparently review data collection policies and toggle analytics consent anytime.
class AnalyticsPrivacyDialog extends StatefulWidget {
  const AnalyticsPrivacyDialog({super.key});

  static Future<void> show(BuildContext context) {
    AnalyticsService.instance.screen(AnalyticsScreen.privacySettings);
    return showDialog(
      context: context,
      builder: (context) => const AnalyticsPrivacyDialog(),
    );
  }

  @override
  State<AnalyticsPrivacyDialog> createState() => _AnalyticsPrivacyDialogState();
}

class _AnalyticsPrivacyDialogState extends State<AnalyticsPrivacyDialog> {
  late bool _isEnabled;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _isEnabled = AnalyticsService.instance.consent.isGranted;
  }

  Future<void> _toggleConsent(bool value) async {
    setState(() {
      _isEnabled = value;
      _isSaving = true;
    });

    final newConsent = value ? AnalyticsConsent.granted : AnalyticsConsent.denied;
    await AnalyticsService.instance.setConsent(newConsent);

    if (mounted) {
      setState(() {
        _isSaving = false;
      });
      context.showSuccessSnackBar(
        value
            ? 'Analytics enabled. Thank you for supporting app quality!'
            : 'Analytics disabled. No diagnostic telemetry will be collected.',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
      ),
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: (isDark ? AppColors.primaryLight : AppColors.primary)
                            .withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                      ),
                      child: Icon(
                        Icons.shield_outlined,
                        color: isDark ? AppColors.primaryLight : AppColors.primary,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Privacy & Analytics',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Control telemetry and diagnostic sharing',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Consent Toggle Card
                AppCard(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Share Anonymous Telemetry',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Helps detect crashes and improve reliability',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.colorScheme.onSurfaceVariant,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Switch.adaptive(
                        value: _isEnabled,
                        onChanged: _isSaving ? null : _toggleConsent,
                        activeTrackColor: isDark ? AppColors.primaryLight : AppColors.primary,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Transparency Info
                Text(
                  'What We Collect & Why',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),

                _buildBullet(
                  context,
                  icon: Icons.check_circle_outline_rounded,
                  color: AppColors.success,
                  title: 'Crash & Error Diagnostics',
                  subtitle: 'Uncaught errors and sanitized API error codes to patch bugs rapidly.',
                ),
                const SizedBox(height: 6),
                _buildBullet(
                  context,
                  icon: Icons.check_circle_outline_rounded,
                  color: AppColors.success,
                  title: 'Feature & Screen Usage',
                  subtitle: 'Aggregate screen transitions and report export formats (PDF / Excel).',
                ),
                const SizedBox(height: 6),
                _buildBullet(
                  context,
                  icon: Icons.cancel_outlined,
                  color: AppColors.error,
                  title: 'Strictly NEVER Collected',
                  subtitle: 'Passwords, authorization tokens, personal documents, or private credentials.',
                ),
                const SizedBox(height: 20),

                // Actions
                Align(
                  alignment: Alignment.centerRight,
                  child: AppButton(
                    text: 'Close',
                    variant: AppButtonVariant.primary,
                    size: AppButtonSize.small,
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBullet(
    BuildContext context, {
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
  }) {
    final theme = Theme.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: theme.textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                subtitle,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
