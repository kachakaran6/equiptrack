import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/extensions/context_extensions.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_dialog.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/unsaved_changes_scope.dart';
import '../../../models/machine.dart';
import '../controllers/machines_controller.dart';

class DuplicateMachineDialog extends ConsumerStatefulWidget {
  final Machine machine;

  const DuplicateMachineDialog({super.key, required this.machine});

  static Future<Machine?> show(BuildContext context, {required Machine machine}) {
    return showDialog<Machine>(
      context: context,
      barrierDismissible: false,
      builder: (context) => DuplicateMachineDialog(machine: machine),
    );
  }

  @override
  ConsumerState<DuplicateMachineDialog> createState() => _DuplicateMachineDialogState();
}

class _DuplicateMachineDialogState extends ConsumerState<DuplicateMachineDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _descController;
  bool _isSubmitting = false;
  bool _isDirty = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: '${widget.machine.name} (Copy)');
    _descController = TextEditingController(text: widget.machine.description ?? '');

    _nameController.addListener(_markDirty);
    _descController.addListener(_markDirty);
  }

  void _markDirty() {
    if (!_isDirty) {
      setState(() {
        _isDirty = true;
      });
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSubmitting = true);

    final controller = ref.read(machinesControllerProvider.notifier);
    final result = await controller.duplicateMachine(
      id: widget.machine.id,
      name: _nameController.text.trim(),
      description: _descController.text.trim(),
    );

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (result != null) {
        _isDirty = false;
        context.showSuccessSnackBar(
          'Machine "${result.name}" duplicated with all components',
        );
        Navigator.of(context).pop(result);
      } else {
        context.showErrorSnackBar('Failed to duplicate machine. Please try again.');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return UnsavedChangesScope(
      hasUnsavedChanges: _isDirty && !_isSubmitting,
      child: AppDialog(
        title: 'Duplicate Machine',
        icon: Icons.copy_rounded,
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 390),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Informational Notice Banner
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.primaryContainerDark.withAlpha(120)
                        : AppColors.primaryContainerLight.withAlpha(150),
                    borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                    border: Border.all(
                      color: isDark
                          ? AppColors.primaryLight.withAlpha(50)
                          : AppColors.primary.withAlpha(60),
                    ),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        Icons.info_outline_rounded,
                        size: 16,
                        color: isDark ? AppColors.primaryLight : AppColors.primary,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'All components from "${widget.machine.name}" will be copied. Usage records start fresh.',
                          style: theme.textTheme.bodySmall?.copyWith(
                            fontSize: 12,
                            height: 1.35,
                            color: theme.colorScheme.onSurface,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Editable Machine Name Field
                AppTextField(
                  label: 'Machine Name',
                  hintText: 'Enter new machine name',
                  controller: _nameController,
                  isRequired: true,
                  autofocus: true,
                  validator: FormValidators.machineName,
                ),
                const SizedBox(height: 14),

                // Description Field
                AppTextField(
                  label: 'Description / Notes',
                  hintText: 'Optional notes or location',
                  controller: _descController,
                  maxLines: 2,
                ),
              ],
            ),
          ),
        ),
        actions: [
          AppButton(
            text: 'Cancel',
            variant: AppButtonVariant.outline,
            size: AppButtonSize.small,
            onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(),
          ),
          const SizedBox(width: 6),
          AppButton(
            text: 'Duplicate Machine',
            icon: Icons.copy_rounded,
            size: AppButtonSize.small,
            isLoading: _isSubmitting,
            onPressed: _isSubmitting ? null : _submit,
          ),
        ],
      ),
    );
  }
}
