import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../models/inventory_models.dart';
import '../controllers/inventory_controller.dart';

class AddEditSubProductScreen extends ConsumerStatefulWidget {
  final InventoryProduct product;
  final InventorySubProduct? subProduct;

  const AddEditSubProductScreen({
    super.key,
    required this.product,
    this.subProduct,
  });

  @override
  ConsumerState<AddEditSubProductScreen> createState() => _AddEditSubProductScreenState();
}

class _AddEditSubProductScreenState extends ConsumerState<AddEditSubProductScreen> {
  final _formKey = GlobalKey<FormState>();
  final Map<String, TextEditingController> _controllers = {};
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    for (final field in widget.product.fields) {
      final existingVal = widget.subProduct?.values[field.label] ??
          widget.subProduct?.values[field.id] ??
          '';
      _controllers[field.id] = TextEditingController(text: existingVal);
    }
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    final Map<String, String> valuesMap = {};
    for (final entry in _controllers.entries) {
      valuesMap[entry.key] = entry.value.text.trim();
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      if (widget.subProduct == null) {
        await ref.read(inventoryProductsProvider.notifier).createSubProduct(
              widget.product.id,
              valuesMap,
            );
      } else {
        await ref.read(inventoryProductsProvider.notifier).updateSubProduct(
              widget.subProduct!.id,
              valuesMap,
            );
      }

      if (mounted) {
        Navigator.of(context).pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              widget.subProduct == null
                  ? 'Sub product created successfully!'
                  : 'Sub product updated successfully!',
            ),
            backgroundColor: const Color(0xFF7C3AED),
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
        title: Text(widget.subProduct == null ? 'Add Sub Product' : 'Edit Sub Product'),
        elevation: 0,
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              // Product Badge
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: primaryPurple.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: primaryPurple.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.category, color: primaryPurple, size: 20),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Category / Main Product',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
                        ),
                        Text(
                          widget.product.name,
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              if (_errorMessage != null) ...[
                const SizedBox(height: 16),
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
              ],

              const SizedBox(height: 20),

              if (widget.product.fields.isEmpty)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF18181B) : const Color(0xFFF4F4F5),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Text(
                    'This product does not have any custom field labels defined yet. You can still save this item.',
                    style: TextStyle(fontSize: 13),
                  ),
                )
              else
                ...widget.product.fields.map((field) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          field.label,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _controllers[field.id],
                          decoration: InputDecoration(
                            hintText: 'Enter ${field.label}',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                            filled: true,
                            fillColor: isDark ? const Color(0xFF18181B) : const Color(0xFFF9FAFB),
                          ),
                          validator: (val) {
                            if (val == null || val.trim().isEmpty) {
                              return '${field.label} is required';
                            }
                            return null;
                          },
                        ),
                      ],
                    ),
                  );
                }),

              const SizedBox(height: 24),

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
                              widget.subProduct == null ? 'Create Sub Product' : 'Save Changes',
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
