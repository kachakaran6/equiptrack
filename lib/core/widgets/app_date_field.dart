import 'package:flutter/material.dart';
import '../constants/app_spacing.dart';
import '../extensions/date_extensions.dart';
import '../theme/app_colors.dart';

/// Clean, platform-friendly Date Field component
class AppDateField extends StatelessWidget {
  final String label;
  final DateTime? selectedDate;
  final ValueChanged<DateTime> onDateSelected;
  final bool isRequired;
  final String? errorText;
  final DateTime? firstDate;
  final DateTime? lastDate;
  final String? keyString;

  const AppDateField({
    super.key,
    required this.label,
    required this.selectedDate,
    required this.onDateSelected,
    this.isRequired = false,
    this.errorText,
    this.firstDate,
    this.lastDate,
    this.keyString,
  });

  Future<void> _pickDate(BuildContext context) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: selectedDate ?? now,
      firstDate: firstDate ?? DateTime(2000),
      lastDate: lastDate ?? DateTime(2100),
    );

    if (picked != null) {
      onDateSelected(picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final hasError = errorText != null && errorText!.isNotEmpty;

    final borderColor = hasError
        ? AppColors.error
        : (isDark ? AppColors.borderDark : AppColors.borderLight);
    final fillColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text.rich(
          TextSpan(
            text: label,
            style: theme.textTheme.labelMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color: theme.colorScheme.onSurface,
            ),
            children: [
              if (isRequired)
                const TextSpan(
                  text: ' *',
                  style: TextStyle(
                    color: AppColors.error,
                    fontWeight: FontWeight.bold,
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 5),
        InkWell(
          key: keyString != null ? Key(keyString!) : null,
          onTap: () => _pickDate(context),
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            decoration: BoxDecoration(
              color: fillColor,
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
              border: Border.all(
                color: borderColor,
                width: hasError ? 1.5 : 1,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.calendar_today_outlined,
                  size: 17,
                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    selectedDate != null
                        ? selectedDate!.toReadableDate()
                        : 'Select date',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: selectedDate != null
                          ? theme.colorScheme.onSurface
                          : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                      fontWeight: selectedDate != null ? FontWeight.w500 : FontWeight.w400,
                    ),
                  ),
                ),
                Icon(
                  Icons.arrow_drop_down_rounded,
                  color: theme.colorScheme.onSurfaceVariant,
                  size: 20,
                ),
              ],
            ),
          ),
        ),
        if (hasError) ...[
          const SizedBox(height: 4),
          Padding(
            padding: const EdgeInsets.only(left: 8),
            child: Text(
              errorText!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: AppColors.error,
              ),
            ),
          ),
        ],
      ],
    );
  }
}
