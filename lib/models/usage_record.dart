/// UsageRecord model representing an individual usage log entry for a section.
/// Note: usage_days is dynamically calculated and deliberately NOT stored in the database.
class UsageRecord {
  final String id;
  final String sectionId;
  final String name;
  final DateTime usageDate;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? createdBy;
  final String? updatedBy;

  const UsageRecord({
    required this.id,
    required this.sectionId,
    required this.name,
    required this.usageDate,
    required this.createdAt,
    required this.updatedAt,
    this.createdBy,
    this.updatedBy,
  });

  factory UsageRecord.fromJson(Map<String, dynamic> json) {
    return UsageRecord(
      id: json['id'] as String,
      sectionId: json['section_id'] as String,
      name: json['name'] as String,
      usageDate: DateTime.parse(json['usage_date'] as String),
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      createdBy: json['created_by'] as String?,
      updatedBy: json['updated_by'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    // Format usage_date as YYYY-MM-DD for PostgreSQL DATE type
    final dateStr =
        '${usageDate.year.toString().padLeft(4, '0')}-${usageDate.month.toString().padLeft(2, '0')}-${usageDate.day.toString().padLeft(2, '0')}';

    return {
      'id': id,
      'section_id': sectionId,
      'name': name,
      'usage_date': dateStr,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'created_by': createdBy,
      'updated_by': updatedBy,
    };
  }

  UsageRecord copyWith({
    String? id,
    String? sectionId,
    String? name,
    DateTime? usageDate,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? createdBy,
    String? updatedBy,
  }) {
    return UsageRecord(
      id: id ?? this.id,
      sectionId: sectionId ?? this.sectionId,
      name: name ?? this.name,
      usageDate: usageDate ?? this.usageDate,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      createdBy: createdBy ?? this.createdBy,
      updatedBy: updatedBy ?? this.updatedBy,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UsageRecord &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          sectionId == other.sectionId &&
          name == other.name &&
          usageDate.year == other.usageDate.year &&
          usageDate.month == other.usageDate.month &&
          usageDate.day == other.usageDate.day;

  @override
  int get hashCode =>
      id.hashCode ^ sectionId.hashCode ^ name.hashCode ^ usageDate.hashCode;
}
