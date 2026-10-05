/// Component category model representing a grouping of components within a machine.
class Category {
  final String id;
  final String machineId;
  final String name;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Category({
    required this.id,
    required this.machineId,
    required this.name,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'] as String,
      machineId: json['machine_id'] as String,
      name: json['name'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'machine_id': machineId,
      'name': name,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  Category copyWith({
    String? id,
    String? machineId,
    String? name,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Category(
      id: id ?? this.id,
      machineId: machineId ?? this.machineId,
      name: name ?? this.name,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Category &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          machineId == other.machineId &&
          name == other.name;

  @override
  int get hashCode => id.hashCode ^ machineId.hashCode ^ name.hashCode;
}
