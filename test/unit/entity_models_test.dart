import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/models/machine.dart';
import 'package:machine_usage_app/models/section.dart';
import 'package:machine_usage_app/models/usage_record.dart';

void main() {
  group('Entity Models Tests', () {
    test('Machine serialization and equality', () {
      final now = DateTime.now();
      final machine = Machine(
        id: 'm1',
        name: 'Excavator 01',
        description: 'Heavy duty hydraulic excavator',
        createdAt: now,
        updatedAt: now,
        createdBy: 'user-1',
      );

      final json = machine.toJson();
      final fromJson = Machine.fromJson(json);

      expect(fromJson.id, machine.id);
      expect(fromJson.name, machine.name);
      expect(fromJson.description, machine.description);
      expect(fromJson, equals(machine));
    });

    test('Section serialization and equality', () {
      final now = DateTime.now();
      final section = Section(
        id: 's1',
        machineId: 'm1',
        name: 'Hydraulic Arm',
        createdAt: now,
        updatedAt: now,
      );

      final json = section.toJson();
      final fromJson = Section.fromJson(json);

      expect(fromJson.id, section.id);
      expect(fromJson.machineId, section.machineId);
      expect(fromJson.name, section.name);
      expect(fromJson, equals(section));
    });

    test('UsageRecord serialization formats date as YYYY-MM-DD', () {
      final now = DateTime.now();
      final record = UsageRecord(
        id: 'r1',
        sectionId: 's1',
        name: 'Seal Replacement',
        usageDate: DateTime(2026, 10, 2),
        createdAt: now,
        updatedAt: now,
      );

      final json = record.toJson();
      expect(json['usage_date'], '2026-10-02');

      final fromJson = UsageRecord.fromJson(json);
      expect(fromJson.id, record.id);
      expect(fromJson.name, record.name);
      expect(fromJson.usageDate.year, 2026);
      expect(fromJson.usageDate.month, 10);
      expect(fromJson.usageDate.day, 2);
    });
  });
}
