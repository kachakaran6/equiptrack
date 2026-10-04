import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_keys.dart';
import '../../../core/extensions/context_extensions.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/app_bottom_sheet.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_confirm_dialog.dart';
import '../../../core/widgets/app_date_field.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/unsaved_changes_scope.dart';
import '../../../models/usage_record.dart';
import '../controllers/usage_records_controller.dart';

class AddEditRecordSheet extends ConsumerStatefulWidget {
  final String sectionId;
  final UsageRecord? record;

  const AddEditRecordSheet({
    super.key,
    required this.sectionId,
    this.record,
  });

  static Future<UsageRecord?> show(
    BuildContext context, {
    required String sectionId,
    UsageRecord? record,
  }) {
    return AppBottomSheet.show<UsageRecord>(
      context: context,
      builder: (context) => AddEditRecordSheet(
        sectionId: sectionId,
        record: record,
      ),
    );
  }

  @override
  ConsumerState<AddEditRecordSheet> createState() => _AddEditRecordSheetState();
}

class _AddEditRecordSheetState extends ConsumerState<AddEditRecordSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  DateTime? _selectedDate;
  String? _dateError;
  bool _isSubmitting = false;
  bool _isDirty = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.record?.name ?? '');
    _selectedDate = widget.record?.usageDate ?? DateTime.now();

    _nameController.addListener(() {
      if (!_isDirty) setState(() => _isDirty = true);
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _dateError = _selectedDate == null ? 'Usage date is required' : null;
    });

    if (!_formKey.currentState!.validate() || _selectedDate == null) {
      return;
    }

    setState(() => _isSubmitting = true);

    final controller = ref.read(usageRecordsControllerProvider.notifier);

    UsageRecord? result;
    if (widget.record == null) {
      result = await controller.createRecord(
        sectionId: widget.sectionId,
        name: _nameController.text.trim(),
        usageDate: _selectedDate!,
      );
    } else {
      result = await controller.updateRecord(
        id: widget.record!.id,
        sectionId: widget.sectionId,
        name: _nameController.text.trim(),
        usageDate: _selectedDate!,
      );
    }

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (result != null) {
        _isDirty = false;
        context.showSuccessSnackBar(
          widget.record == null ? 'Usage record logged' : 'Usage record updated',
        );
        Navigator.of(context).pop(result);
      } else {
        context.showErrorSnackBar('Failed to save record. Please try again.');
      }
    }
  }

  Future<void> _deleteRecord() async {
    if (widget.record == null) return;
    final confirm = await AppConfirmDialog.show(
      context: context,
      title: 'Delete record?',
      message:
          'Delete "${widget.record!.name}"? Durations will be recalculated automatically.',
      confirmLabel: 'Delete',
      isDestructive: true,
    );

    if (confirm == true && mounted) {
      setState(() => _isSubmitting = true);
      final ok = await ref
          .read(usageRecordsControllerProvider.notifier)
          .deleteRecord(widget.record!.id, widget.sectionId);
      if (mounted) {
        setState(() => _isSubmitting = false);
        if (ok) {
          _isDirty = false;
          context.showSuccessSnackBar('Record deleted & durations updated');
          Navigator.of(context).pop();
        } else {
          context.showErrorSnackBar('Failed to delete record. Please try again.');
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.record != null;

    return UnsavedChangesScope(
      hasUnsavedChanges: _isDirty && !_isSubmitting,
      child: AppBottomSheet(
        title: isEditing ? 'Edit Usage Record' : 'Add Usage Record',
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AppTextField(
                keyString: AppKeys.recordNameField,
                label: 'Record Name / Operation',
                hintText: 'e.g. Belt Replacement, Bearing Swap, Oil Flush',
                controller: _nameController,
                isRequired: true,
                autofocus: true,
                validator: FormValidators.recordName,
              ),
              const SizedBox(height: 14),
              AppDateField(
                keyString: AppKeys.recordDateField,
                label: 'Usage Date',
                selectedDate: _selectedDate,
                isRequired: true,
                errorText: _dateError,
                onDateSelected: (date) {
                  setState(() {
                    _selectedDate = date;
                    _dateError = null;
                    _isDirty = true;
                  });
                },
              ),
              const SizedBox(height: 22),
              if (isEditing) ...[
                Row(
                  children: [
                    Expanded(
                      child: AppButton(
                        text: 'Delete',
                        icon: Icons.delete_outline_rounded,
                        variant: AppButtonVariant.danger,
                        size: AppButtonSize.medium,
                        isLoading: _isSubmitting,
                        onPressed: _isSubmitting ? null : _deleteRecord,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: AppButton(
                        keyString: AppKeys.saveRecordButton,
                        text: 'Save Changes',
                        icon: Icons.check_rounded,
                        size: AppButtonSize.medium,
                        isLoading: _isSubmitting,
                        onPressed: _isSubmitting ? null : _submit,
                      ),
                    ),
                  ],
                ),
              ] else ...[
                Row(
                  children: [
                    Expanded(
                      child: AppButton(
                        text: 'Cancel',
                        variant: AppButtonVariant.outline,
                        size: AppButtonSize.medium,
                        onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: AppButton(
                        keyString: AppKeys.saveRecordButton,
                        text: 'Add Record',
                        icon: Icons.check_rounded,
                        size: AppButtonSize.medium,
                        isLoading: _isSubmitting,
                        onPressed: _isSubmitting ? null : _submit,
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
