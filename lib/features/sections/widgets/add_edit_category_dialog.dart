import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/extensions/context_extensions.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_dialog.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/unsaved_changes_scope.dart';
import '../../../models/category.dart';
import '../controllers/categories_controller.dart';

class AddEditCategoryDialog extends ConsumerStatefulWidget {
  final String machineId;
  final Category? category;

  const AddEditCategoryDialog({
    super.key,
    required this.machineId,
    this.category,
  });

  static Future<Category?> show(
    BuildContext context, {
    required String machineId,
    Category? category,
  }) {
    return showDialog<Category>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AddEditCategoryDialog(
        machineId: machineId,
        category: category,
      ),
    );
  }

  @override
  ConsumerState<AddEditCategoryDialog> createState() => _AddEditCategoryDialogState();
}

class _AddEditCategoryDialogState extends ConsumerState<AddEditCategoryDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  bool _isSubmitting = false;
  bool _isDirty = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.category?.name ?? '');
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

    final controller = ref.read(categoriesControllerProvider.notifier);
    final isEditing = widget.category != null;
    final name = _nameController.text.trim();
    Category? result;

    if (!isEditing) {
      result = await controller.createCategory(
        machineId: widget.machineId,
        name: name,
      );
    } else {
      result = await controller.updateCategory(
        id: widget.category!.id,
        machineId: widget.machineId,
        name: name,
      );
    }

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (result != null) {
        _isDirty = false;
        context.showSuccessSnackBar(
          isEditing
              ? 'Category updated'
              : 'Category "${result.name}" created',
        );
        Navigator.of(context).pop(result);
      } else {
        context.showErrorSnackBar(
          'Failed to save category. Please ensure the name is unique.',
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.category != null;

    return UnsavedChangesScope(
      hasUnsavedChanges: _isDirty && !_isSubmitting,
      child: AppDialog(
        title: isEditing ? 'Edit Category' : 'Create Category',
        icon: isEditing ? Icons.edit_note_rounded : Icons.create_new_folder_outlined,
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 380),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AppTextField(
                  label: 'Category Name',
                  hintText: 'e.g. Bearings, Motors, Electrical, Side A',
                  controller: _nameController,
                  isRequired: true,
                  autofocus: true,
                  validator: (val) {
                    final res = FormValidators.requiredField(val, 'Category name');
                    if (res != null) return res;
                    if (val!.trim().length > 255) {
                      return 'Category name must not exceed 255 characters';
                    }
                    return null;
                  },
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
          const SizedBox(width: 4),
          AppButton(
            text: isEditing ? 'Save Changes' : 'Create Category',
            icon: Icons.check_rounded,
            size: AppButtonSize.small,
            isLoading: _isSubmitting,
            onPressed: _isSubmitting ? null : _submit,
          ),
        ],
      ),
    );
  }
}
