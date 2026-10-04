import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../models/inventory_models.dart';
import '../controllers/inventory_controller.dart';

class AddEditProductScreen extends ConsumerStatefulWidget {
  final InventoryProduct? product;

  const AddEditProductScreen({super.key, this.product});

  @override
  ConsumerState<AddEditProductScreen> createState() => _AddEditProductScreenState();
}

class _AddEditProductScreenState extends ConsumerState<AddEditProductScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  final List<TextEditingController> _fieldControllers = [];
  final List<String?> _fieldIds = [];
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.product?.name ?? '');

    if (widget.product != null && widget.product!.fields.isNotEmpty) {
      for (final f in widget.product!.fields) {
        _fieldControllers.add(TextEditingController(text: f.label));
        _fieldIds.add(f.id);
      }
    } else {
      // Default initial field (e.g. Make, Number, Location as common examples)
      _fieldControllers.add(TextEditingController(text: 'Make'));
      _fieldIds.add(null);
      _fieldControllers.add(TextEditingController(text: 'Number'));
      _fieldIds.add(null);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    for (final c in _fieldControllers) {
      c.dispose();
    }
    super.dispose();
  }

  void _addField() {
    setState(() {
      _fieldControllers.add(TextEditingController());
      _fieldIds.add(null);
    });
  }

  void _removeField(int index) {
    setState(() {
      _fieldControllers[index].dispose();
      _fieldControllers.removeAt(index);
      _fieldIds.removeAt(index);
    });
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    final name = _nameController.text.trim();
    final fieldLabels = _fieldControllers.map((c) => c.text.trim()).where((t) => t.isNotEmpty).toList();

    // Check for duplicate field labels
    final uniqueSet = <String>{};
    for (final label in fieldLabels) {
      final lower = label.toLowerCase();
      if (uniqueSet.contains(lower)) {
        setState(() => _errorMessage = 'Duplicate field label "$label" is not allowed.');
        return;
      }
      uniqueSet.add(lower);
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      if (widget.product == null) {
        await ref.read(inventoryProductsProvider.notifier).createProduct(name, fieldLabels);
      } else {
        final List<Map<String, dynamic>> updatedFields = [];
        for (int i = 0; i < _fieldControllers.length; i++) {
          final label = _fieldControllers[i].text.trim();
          if (label.isEmpty) continue;
          final id = _fieldIds[i];
          final fieldMap = <String, dynamic>{'label': label};
          if (id != null) {
            fieldMap['id'] = id;
          }
          updatedFields.add(fieldMap);
        }
        await ref.read(inventoryProductsProvider.notifier).updateProduct(
              widget.product!.id,
              name: name,
              fields: updatedFields,
            );
      }

      if (mounted) {
        Navigator.of(context).pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              widget.product == null ? 'Product created successfully!' : 'Product updated successfully!',
            ),
            backgroundColor: const Color(0xFF6D28D9),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString().replaceAll('Exception:', '').trim();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryPurple = const Color(0xFF7C3AED);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.product == null ? 'Add Product' : 'Edit Product'),
        elevation: 0,
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              if (_errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.red.withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.redAccent, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(color: Colors.redAccent, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Product Name
              const Text(
                'Product Name',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _nameController,
                autofocus: widget.product == null,
                decoration: InputDecoration(
                  hintText: 'Enter Product Name (e.g. BELT, BEARING)',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  filled: true,
                  fillColor: isDark ? const Color(0xFF18181B) : const Color(0xFFF9FAFB),
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return 'Product name is required';
                  }
                  return null;
                },
              ),

              const SizedBox(height: 24),

              // Dynamic Other Fields Section
              Container(
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF18181B) : const Color(0xFFF4F4F5),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: theme.dividerColor),
                ),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Custom Fields (Other Fields)',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        Text(
                          '${_fieldControllers.length} fields',
                          style: TextStyle(fontSize: 12, color: theme.hintColor),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Define attributes for sub-items under this product (e.g. Make, Model, Size, Location, Color)',
                      style: TextStyle(fontSize: 12, color: theme.hintColor),
                    ),
                    const SizedBox(height: 16),

                    if (_fieldControllers.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        child: Center(
                          child: Text(
                            'No custom fields added yet. Tap "Add extra field" below.',
                            style: TextStyle(color: theme.hintColor, fontSize: 12),
                          ),
                        ),
                      )
                    else
                      ...List.generate(_fieldControllers.length, (idx) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Row(
                            children: [
                              Expanded(
                                child: TextFormField(
                                  controller: _fieldControllers[idx],
                                  decoration: InputDecoration(
                                    labelText: 'Custom Label ${idx + 1}',
                                    hintText: 'e.g. Make, Size, Number',
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                    filled: true,
                                    fillColor: isDark ? const Color(0xFF27272A) : Colors.white,
                                    isDense: true,
                                  ),
                                  validator: (v) {
                                    if (v == null || v.trim().isEmpty) {
                                      return 'Field label cannot be empty';
                                    }
                                    return null;
                                  },
                                ),
                              ),
                              const SizedBox(width: 8),
                              IconButton(
                                icon: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 22),
                                tooltip: 'Remove field',
                                onPressed: () => _removeField(idx),
                              ),
                            ],
                          ),
                        );
                      }),

                    const SizedBox(height: 8),
                    Center(
                      child: OutlinedButton.icon(
                        onPressed: _addField,
                        icon: const Icon(Icons.add, size: 18),
                        label: const Text('Add extra field'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Action Buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _isLoading ? null : () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _save,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryPurple,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : Text(
                              widget.product == null ? 'Create Product' : 'Save Changes',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
