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
  final String? machineId;
  final Category? category;

  const AddEditCategoryDialog({
    super.key,
    this.machineId,
    this.category,
  });

  static Future<Category?> show(
    BuildContext context, {
    String? machineId,
    Category? existingCategory,
    Category? category,
  }) {
    final cat = existingCategory ?? category;
    return showDialog<Category>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AddEditCategoryDialog(
        machineId: machineId,
        category: cat,
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
        name: name,
        machineId: widget.machineId,
      );
    } else {
      result = await controller.updateCategory(
        id: widget.category!.id,
        name: name,
        machineId: widget.machineId,
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
        icon: isEditing ? Icons.edit_rounded : Icons.create_new_folder_rounded,
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
                  hintText: 'e.g. Electrical, Mechanical, Hydraulic',
                  controller: _nameController,
                  isRequired: true,
                  autofocus: true,
                  validator: FormValidators.categoryName,
                ),
              ],
            ),
          ),
        ),
        actions: [
          AppButton(
            text: 'Cancel',
            variant: AppButtonVariant.outline,
            size: AppButtonSize.medium,
            onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(),
          ),
          AppButton(
            text: isEditing ? 'Save Changes' : 'Create Category',
            variant: AppButtonVariant.primary,
            size: AppButtonSize.medium,
            isLoading: _isSubmitting,
            onPressed: _submit,
          ),
        ],
      ),
    );
  }
}
