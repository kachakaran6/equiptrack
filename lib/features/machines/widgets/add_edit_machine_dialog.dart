import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_keys.dart';
import '../../../core/extensions/context_extensions.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_dialog.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/unsaved_changes_scope.dart';
import '../../../models/machine.dart';
import '../controllers/machines_controller.dart';

class AddEditMachineDialog extends ConsumerStatefulWidget {
  final Machine? machine;

  const AddEditMachineDialog({super.key, this.machine});

  static Future<Machine?> show(BuildContext context, {Machine? machine}) {
    return showDialog<Machine>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AddEditMachineDialog(machine: machine),
    );
  }

  @override
  ConsumerState<AddEditMachineDialog> createState() => _AddEditMachineDialogState();
}

class _AddEditMachineDialogState extends ConsumerState<AddEditMachineDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _descController;
  bool _isSubmitting = false;
  bool _isDirty = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.machine?.name ?? '');
    _descController = TextEditingController(text: widget.machine?.description ?? '');

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
    Machine? result;

    if (widget.machine == null) {
      result = await controller.createMachine(
        name: _nameController.text.trim(),
        description: _descController.text.trim(),
      );
    } else {
      result = await controller.updateMachine(
        id: widget.machine!.id,
        name: _nameController.text.trim(),
        description: _descController.text.trim(),
      );
    }

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (result != null) {
        _isDirty = false;
        context.showSuccessSnackBar(
          widget.machine == null
              ? 'Machine "${result.name}" added successfully'
              : 'Machine updated successfully',
        );
        Navigator.of(context).pop(result);
      } else {
        context.showErrorSnackBar('Failed to save machine. Please try again.');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.machine != null;

    return UnsavedChangesScope(
      hasUnsavedChanges: _isDirty && !_isSubmitting,
      child: AppDialog(
        title: isEditing ? 'Edit Machine' : 'Add Machine',
        icon: isEditing ? Icons.edit_rounded : Icons.precision_manufacturing_rounded,
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 400),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AppTextField(
                  keyString: AppKeys.machineNameField,
                  label: 'Machine Name',
                  hintText: 'e.g. CNC Milling Machine 01',
                  controller: _nameController,
                  isRequired: true,
                  autofocus: true,
                  validator: FormValidators.machineName,
                ),
                const SizedBox(height: 16),
                AppTextField(
                  keyString: AppKeys.machineDescField,
                  label: 'Description',
                  hintText: 'Optional notes, serial no., or location',
                  controller: _descController,
                  maxLines: 3,
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
            keyString: AppKeys.saveMachineButton,
            text: isEditing ? 'Save Changes' : 'Add Machine',
            icon: Icons.check_rounded,
            isLoading: _isSubmitting,
            onPressed: _isSubmitting ? null : _submit,
          ),
        ],
      ),
    );
  }
}
