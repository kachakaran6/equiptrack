import 'package:flutter/foundation.dart';

@immutable
class ProductCustomField {
  final String id;
  final String productId;
  final String label;
  final int position;
  final DateTime? createdAt;

  const ProductCustomField({
    required this.id,
    required this.productId,
    required this.label,
    this.position = 0,
    this.createdAt,
  });

  factory ProductCustomField.fromJson(Map<String, dynamic> json) {
    return ProductCustomField(
      id: json['id'] as String? ?? '',
      productId: json['product_id'] as String? ?? '',
      label: json['label'] as String? ?? '',
      position: json['position'] as int? ?? 0,
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'product_id': productId,
      'label': label,
      'position': position,
      if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
    };
  }

  ProductCustomField copyWith({
    String? id,
    String? productId,
    String? label,
    int? position,
    DateTime? createdAt,
  }) {
    return ProductCustomField(
      id: id ?? this.id,
      productId: productId ?? this.productId,
      label: label ?? this.label,
      position: position ?? this.position,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

@immutable
class InventorySubProduct {
  final String id;
  final String productId;
  final String userId;
  final int currentStock;
  final int totalIn;
  final int totalOut;
  final Map<String, String> values;
  final DateTime createdAt;
  final DateTime updatedAt;

  const InventorySubProduct({
    required this.id,
    required this.productId,
    required this.userId,
    this.currentStock = 0,
    this.totalIn = 0,
    this.totalOut = 0,
    this.values = const {},
    required this.createdAt,
    required this.updatedAt,
  });

  factory InventorySubProduct.fromJson(Map<String, dynamic> json) {
    final rawValues = json['values'];
    final Map<String, String> valuesMap = {};
    if (rawValues is Map) {
      rawValues.forEach((k, v) {
        valuesMap[k.toString()] = v?.toString() ?? '';
      });
    }

    return InventorySubProduct(
      id: json['id'] as String? ?? '',
      productId: json['product_id'] as String? ?? '',
      userId: json['user_id'] as String? ?? '',
      currentStock: (json['current_stock'] as num?)?.toInt() ?? 0,
      totalIn: (json['total_in'] as num?)?.toInt() ?? 0,
      totalOut: (json['total_out'] as num?)?.toInt() ?? 0,
      values: valuesMap,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'product_id': productId,
      'user_id': userId,
      'current_stock': currentStock,
      'total_in': totalIn,
      'total_out': totalOut,
      'values': values,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  InventorySubProduct copyWith({
    String? id,
    String? productId,
    String? userId,
    int? currentStock,
    int? totalIn,
    int? totalOut,
    Map<String, String>? values,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return InventorySubProduct(
      id: id ?? this.id,
      productId: productId ?? this.productId,
      userId: userId ?? this.userId,
      currentStock: currentStock ?? this.currentStock,
      totalIn: totalIn ?? this.totalIn,
      totalOut: totalOut ?? this.totalOut,
      values: values ?? this.values,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

@immutable
class InventoryProduct {
  final String id;
  final String userId;
  final String name;
  final List<ProductCustomField> fields;
  final List<InventorySubProduct> subProducts;
  final int totalStock;
  final DateTime createdAt;
  final DateTime updatedAt;

  const InventoryProduct({
    required this.id,
    required this.userId,
    required this.name,
    this.fields = const [],
    this.subProducts = const [],
    this.totalStock = 0,
    required this.createdAt,
    required this.updatedAt,
  });

  factory InventoryProduct.fromJson(Map<String, dynamic> json) {
    final rawFields = json['fields'] as List? ?? [];
    final fieldsList = rawFields
        .map((f) => ProductCustomField.fromJson(Map<String, dynamic>.from(f as Map)))
        .toList();

    final rawSubs = json['sub_products'] as List? ?? [];
    final subsList = rawSubs
        .map((s) => InventorySubProduct.fromJson(Map<String, dynamic>.from(s as Map)))
        .toList();

    return InventoryProduct(
      id: json['id'] as String? ?? '',
      userId: json['user_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      fields: fieldsList,
      subProducts: subsList,
      totalStock: (json['total_stock'] as num?)?.toInt() ?? 0,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'name': name,
      'fields': fields.map((f) => f.toJson()).toList(),
      'sub_products': subProducts.map((s) => s.toJson()).toList(),
      'total_stock': totalStock,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  InventoryProduct copyWith({
    String? id,
    String? userId,
    String? name,
    List<ProductCustomField>? fields,
    List<InventorySubProduct>? subProducts,
    int? totalStock,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return InventoryProduct(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      name: name ?? this.name,
      fields: fields ?? this.fields,
      subProducts: subProducts ?? this.subProducts,
      totalStock: totalStock ?? this.totalStock,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

@immutable
class InventoryTransaction {
  final String id;
  final String subProductId;
  final String productId;
  final String productName;
  final String userId;
  final String type; // 'IN' or 'OUT'
  final int quantity;
  final String date;
  final String? remarks;
  final Map<String, String> subProductValues;
  final DateTime createdAt;
  final DateTime updatedAt;

  const InventoryTransaction({
    required this.id,
    required this.subProductId,
    this.productId = '',
    this.productName = '',
    required this.userId,
    required this.type,
    required this.quantity,
    required this.date,
    this.remarks,
    this.subProductValues = const {},
    required this.createdAt,
    required this.updatedAt,
  });

  bool get isIn => type.toUpperCase() == 'IN';
  bool get isOut => type.toUpperCase() == 'OUT';

  factory InventoryTransaction.fromJson(Map<String, dynamic> json) {
    final rawValues = json['sub_product_values'];
    final Map<String, String> valuesMap = {};
    if (rawValues is Map) {
      rawValues.forEach((k, v) {
        valuesMap[k.toString()] = v?.toString() ?? '';
      });
    }

    return InventoryTransaction(
      id: json['id'] as String? ?? '',
      subProductId: json['sub_product_id'] as String? ?? '',
      productId: json['product_id'] as String? ?? '',
      productName: json['product_name'] as String? ?? '',
      userId: json['user_id'] as String? ?? '',
      type: json['type'] as String? ?? 'IN',
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      date: json['date'] as String? ?? '',
      remarks: json['remarks'] as String?,
      subProductValues: valuesMap,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'sub_product_id': subProductId,
      'product_id': productId,
      'product_name': productName,
      'user_id': userId,
      'type': type,
      'quantity': quantity,
      'date': date,
      'remarks': remarks,
      'sub_product_values': subProductValues,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  InventoryTransaction copyWith({
    String? id,
    String? subProductId,
    String? productId,
    String? productName,
    String? userId,
    String? type,
    int? quantity,
    String? date,
    String? remarks,
    Map<String, String>? subProductValues,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return InventoryTransaction(
      id: id ?? this.id,
      subProductId: subProductId ?? this.subProductId,
      productId: productId ?? this.productId,
      productName: productName ?? this.productName,
      userId: userId ?? this.userId,
      type: type ?? this.type,
      quantity: quantity ?? this.quantity,
      date: date ?? this.date,
      remarks: remarks ?? this.remarks,
      subProductValues: subProductValues ?? this.subProductValues,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
