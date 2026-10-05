import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/models/category.dart';
import 'package:machine_usage_app/models/section.dart';

void main() {
  group('Category & Section Model Tests', () {
    test('Category model serializes and deserializes correctly', () {
      final now = DateTime.now();
      final category = Category(
        id: 'cat-123',
        machineId: 'machine-456',
        name: 'Bearings',
        createdAt: now,
        updatedAt: now,
      );

      final json = category.toJson();
      expect(json['id'], 'cat-123');
      expect(json['machine_id'], 'machine-456');
      expect(json['name'], 'Bearings');
      expect(json['created_at'], now.toIso8601String());
      expect(json['updated_at'], now.toIso8601String());

      final parsed = Category.fromJson(json);
      expect(parsed, equals(category));
      expect(parsed.name, 'Bearings');
    });

    test('Category copyWith modifies specified fields', () {
      final now = DateTime.now();
      final category = Category(
        id: 'cat-1',
        machineId: 'mach-1',
        name: 'Bearings',
        createdAt: now,
        updatedAt: now,
      );

      final updated = category.copyWith(name: 'High-Temp Bearings');
      expect(updated.id, 'cat-1');
      expect(updated.name, 'High-Temp Bearings');
      expect(updated.machineId, 'mach-1');
    });

    test('Section model serializes and deserializes categoryId', () {
      final now = DateTime.now();
      final sectionWithCategory = Section(
        id: 'sec-1',
        machineId: 'mach-1',
        name: 'Big ID Fan',
        categoryId: 'cat-1',
        createdAt: now,
        updatedAt: now,
      );

      final jsonWithCat = sectionWithCategory.toJson();
      expect(jsonWithCat['category_id'], 'cat-1');

      final parsedWithCat = Section.fromJson(jsonWithCat);
      expect(parsedWithCat.categoryId, 'cat-1');
      expect(parsedWithCat, equals(sectionWithCategory));

      // Section without category (Uncategorized)
      final sectionUncategorized = Section(
        id: 'sec-2',
        machineId: 'mach-1',
        name: 'Spindle',
        categoryId: null,
        createdAt: now,
        updatedAt: now,
      );

      final jsonUncat = sectionUncategorized.toJson();
      expect(jsonUncat['category_id'], isNull);

      final parsedUncat = Section.fromJson(jsonUncat);
      expect(parsedUncat.categoryId, isNull);
    });

    test('Section copyWith can update or clear categoryId', () {
      final now = DateTime.now();
      final section = Section(
        id: 'sec-1',
        machineId: 'mach-1',
        name: 'Fan',
        categoryId: 'cat-1',
        createdAt: now,
        updatedAt: now,
      );

      // Move to new category
      final moved = section.copyWith(categoryId: 'cat-2');
      expect(moved.categoryId, 'cat-2');

      // Clear category (become Uncategorized)
      final cleared = section.copyWith(clearCategoryId: true);
      expect(cleared.categoryId, isNull);
    });
  });
}
