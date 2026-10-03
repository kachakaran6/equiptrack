import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_keys.dart';
import '../../../core/extensions/context_extensions.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_dialog.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/unsaved_changes_scope.dart';
import '../../../models/section.dart';
import '../controllers/sections_controller.dart';

class AddEditSectionDialog extends ConsumerStatefulWidget {
  final String machineId;
  final Section? section;

  const AddEditSectionDialog({
    super.key,
    required this.machineId,
    this.section,
  });

  static Future<Section?> show(
    BuildContext context, {
    required String machineId,
    Section? section,
  }) {
    return showDialog<Section>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AddEditSectionDialog(
        machineId: machineId,
        section: section,
      ),
    );
  }

  @override
  ConsumerState<AddEditSectionDialog> createState() => _AddEditSectionDialogState();
}

class _AddEditSectionDialogState extends ConsumerState<AddEditSectionDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  bool _isSubmitting = false;
  bool _isDirty = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.section?.name ?? '');
    _nameController.addListener(() {
      if (!_isDirty) {
        setState(() => _isDirty = true);
      }
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSubmitting = true);

    final controller = ref.read(sectionsControllerProvider.notifier);
    Section? result;

    if (widget.section == null) {
      result = await controller.createSection(
        machineId: widget.machineId,
        name: _nameController.text.trim(),
      );
    } else {
      result = await controller.updateSection(
        id: widget.section!.id,
        machineId: widget.machineId,
        name: _nameController.text.trim(),
      );
    }

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (result != null) {
        _isDirty = false;
        context.showSuccessSnackBar(
          widget.section == null
              ? 'Section "${result.name}" created'
              : 'Section updated',
        );
        Navigator.of(context).pop(result);
      } else {
        context.showErrorSnackBar('Failed to save section. Please try again.');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.section != null;

    return UnsavedChangesScope(
      hasUnsavedChanges: _isDirty && !_isSubmitting,
      child: AppDialog(
        title: isEditing ? 'Edit Section' : 'Add Section / Component',
        icon: isEditing ? Icons.edit_rounded : Icons.category_rounded,
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 400),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AppTextField(
                  keyString: AppKeys.sectionNameField,
                  label: 'Section / Component Name',
                  hintText: 'e.g. Side A, Spindle, Gearbox, Hydraulic Seal',
                  controller: _nameController,
                  isRequired: true,
                  autofocus: true,
                  validator: FormValidators.sectionName,
                ),
              ],
            ),
          ),
        ),
        actions: [
          AppButton(
            text: 'Cancel',
            variant: AppButtonVariant.text,
            onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(),
          ),
          AppButton(
            keyString: AppKeys.saveSectionButton,
            text: isEditing ? 'Save Changes' : 'Add Section',
            icon: Icons.check_rounded,
            isLoading: _isSubmitting,
            onPressed: _isSubmitting ? null : _submit,
          ),
        ],
      ),
    );
  }
}
