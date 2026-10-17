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
  late InventoryProduct _selectedProduct;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _selectedProduct = widget.product;
    _initControllersForProduct(_selectedProduct, initialValues: widget.subProduct?.values);
  }

  void _initControllersForProduct(
    InventoryProduct product, {
    Map<String, String>? initialValues,
  }) {
    for (final field in product.fields) {
      final existingVal = initialValues?[field.label] ?? initialValues?[field.id] ?? '';
      _controllers[field.id] = TextEditingController(text: existingVal);
    }
  }

  void _switchProduct(InventoryProduct newProduct) {
    if (newProduct.id == _selectedProduct.id) return;

    // 1. Harvest existing values mapped by normalized label
    final Map<String, String> harvestedByLabel = {};
    for (final field in _selectedProduct.fields) {
      final ctrl = _controllers[field.id];
      if (ctrl != null && ctrl.text.trim().isNotEmpty) {
        harvestedByLabel[field.label.trim().toLowerCase()] = ctrl.text.trim();
      }
    }

    // 2. Dispose current controllers
    for (final c in _controllers.values) {
      c.dispose();
    }
    _controllers.clear();

    // 3. Populate new controllers with mapped similar fields
    for (final field in newProduct.fields) {
      final normLabel = field.label.trim().toLowerCase();
      // Try exact or case-insensitive match from harvested values
      String mappedVal = harvestedByLabel[normLabel] ?? '';

      // If no match in currently typed, check if original subProduct had it
      if (mappedVal.isEmpty && widget.subProduct != null) {
        for (final entry in widget.subProduct!.values.entries) {
          if (entry.key.trim().toLowerCase() == normLabel) {
            mappedVal = entry.value;
            break;
          }
        }
      }

      _controllers[field.id] = TextEditingController(text: mappedVal);
    }

    setState(() {
      _selectedProduct = newProduct;
    });
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
              _selectedProduct.id,
              valuesMap,
            );
      } else {
        await ref.read(inventoryProductsProvider.notifier).updateSubProduct(
              widget.subProduct!.id,
              valuesMap,
              productId: _selectedProduct.id,
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
    const primaryPurple = Color(0xFF7C3AED);

    final allProductsAsync = ref.watch(inventoryProductsProvider);
    final allProducts = allProductsAsync.value ?? [widget.product];

    // Ensure selectedProduct matches an instance in allProducts if present
    final currentProduct = allProducts.firstWhere(
      (p) => p.id == _selectedProduct.id,
      orElse: () => _selectedProduct,
    );

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
              // Product Dropdown / Category Picker
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: primaryPurple.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: primaryPurple.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.category, color: primaryPurple, size: 22),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Category / Main Product',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Colors.grey),
                          ),
                          DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: currentProduct.id,
                              isExpanded: true,
                              dropdownColor: isDark ? const Color(0xFF1E1E24) : Colors.white,
                              icon: const Icon(Icons.arrow_drop_down, color: primaryPurple),
                              items: allProducts.map((p) {
                                return DropdownMenuItem<String>(
                                  value: p.id,
                                  child: Text(
                                    p.name.toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                      color: isDark ? Colors.white : Colors.black87,
                                    ),
                                  ),
                                );
                              }).toList(),
                              onChanged: (newProdId) {
                                if (newProdId == null) return;
                                final found = allProducts.firstWhere((p) => p.id == newProdId);
                                _switchProduct(found);
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 6),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4),
                child: Text(
                  'Similar attributes (Make, Number, USES, etc.) are automatically mapped when changing product.',
                  style: TextStyle(fontSize: 11, color: Colors.grey),
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

              if (_selectedProduct.fields.isEmpty)
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
                ..._selectedProduct.fields.map((field) {
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
