import 'package:flutter/material.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/theme/app_colors.dart';
import '../models/report_filter_options.dart';

class ReportDateFilterSelector extends StatelessWidget {
  final ReportDatePreset selectedPreset;
  final DateTimeRange? selectedRange;
  final ValueChanged<ReportDatePreset> onPresetChanged;
  final ValueChanged<DateTimeRange?> onRangeChanged;

  const ReportDateFilterSelector({
    super.key,
    required this.selectedPreset,
    required this.selectedRange,
    required this.onPresetChanged,
    required this.onRangeChanged,
  });

  Future<void> _pickCustomRange(BuildContext context) async {
    final now = DateTime.now();
    final initialRange = selectedRange ??
        DateTimeRange(
          start: now.subtract(const Duration(days: 30)),
          end: now,
        );

    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
      initialDateRange: initialRange,
      helpText: 'Select Report Date Range',
      saveText: 'Apply',
      builder: (context, child) {
        return Theme(
          data: Theme.of(context),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );

    if (picked != null) {
      onPresetChanged(ReportDatePreset.custom);
      onRangeChanged(picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            Icon(
              Icons.calendar_month_outlined,
              size: 16,
              color: isDark ? AppColors.primaryLight : AppColors.primary,
            ),
            const SizedBox(width: 6),
            Text(
              'Date Filter',
              style: theme.textTheme.labelMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: theme.colorScheme.onSurface,
              ),
            ),
            const Spacer(),
            Text(
              ReportFilterHelper.getDisplayText(selectedPreset, selectedRange),
              style: theme.textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.w600,
                color: selectedPreset == ReportDatePreset.allTime
                    ? theme.colorScheme.onSurfaceVariant
                    : (isDark ? AppColors.primaryLight : AppColors.primary),
                fontSize: 11,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: ReportDatePreset.values.map((preset) {
              final isSelected = selectedPreset == preset;
              return Padding(
                padding: const EdgeInsets.only(right: 6),
                child: ChoiceChip(
                  label: Text(preset.label),
                  selected: isSelected,
                  labelStyle: TextStyle(
                    fontSize: 11,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    color: isSelected
                        ? Colors.white
                        : (isDark ? Colors.grey[300] : Colors.grey[800]),
                  ),
                  selectedColor: isDark ? AppColors.primary : AppColors.primary,
                  backgroundColor: isDark
                      ? AppColors.surfaceContainerHighDark
                      : AppColors.surfaceContainerHighLight,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                    side: BorderSide(
                      color: isSelected
                          ? Colors.transparent
                          : (isDark ? AppColors.borderDark : AppColors.borderLight),
                    ),
                  ),
                  showCheckmark: false,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  visualDensity: const VisualDensity(horizontal: -2, vertical: -2),
                  onSelected: (selected) async {
                    if (preset == ReportDatePreset.custom) {
                      await _pickCustomRange(context);
                    } else {
                      final range = ReportFilterHelper.getRangeForPreset(preset);
                      onPresetChanged(preset);
                      onRangeChanged(range);
                    }
                  },
                ),
              );
            }).toList(),
          ),
        ),
        if (selectedPreset == ReportDatePreset.custom && selectedRange != null) ...[
          const SizedBox(height: 6),
          InkWell(
            onTap: () => _pickCustomRange(context),
            borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: isDark
                    ? AppColors.primaryContainerDark.withAlpha(80)
                    : AppColors.primaryContainerLight.withAlpha(120),
                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                border: Border.all(
                  color: isDark ? AppColors.primary.withAlpha(100) : AppColors.primary.withAlpha(60),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.edit_calendar_outlined,
                    size: 14,
                    color: isDark ? AppColors.primaryLight : AppColors.primary,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Range: ${ReportFilterHelper.getDisplayText(selectedPreset, selectedRange)}',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Text('(Change)', style: TextStyle(fontSize: 10, decoration: TextDecoration.underline)),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}
