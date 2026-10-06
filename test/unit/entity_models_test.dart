import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/models/app_user.dart';
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

    test('AppUser serialization, copyWith, and equality', () {
      const user = AppUser(
        id: 'u1',
        email: 'test@example.com',
        role: 'admin',
        status: 'active',
        username: 'custom_user',
        displayName: 'Custom User',
      );
      final json = user.toJson();
      final fromJson = AppUser.fromJson(json);

      expect(fromJson.id, 'u1');
      expect(fromJson.email, 'test@example.com');
      expect(fromJson.role, 'admin');
      expect(fromJson.status, 'active');
      expect(fromJson.username, 'custom_user');
      expect(fromJson.displayName, 'Custom User');
      expect(fromJson.effectiveUsername, 'custom_user');
      expect(fromJson.effectiveDisplayName, 'Custom User');
      expect(fromJson, equals(user));

      final updated = user.copyWith(username: 'new_name');
      expect(updated.username, 'new_name');
      expect(updated.effectiveUsername, 'new_name');
    });

    test('AppUser effective fallbacks and toAnalyticsProperties', () {
      const userNoNames = AppUser(id: 'u2', email: 'karan@equiptrack.com');
      expect(userNoNames.effectiveUsername, 'karan');
      expect(userNoNames.effectiveDisplayName, 'karan');

      final props = userNoNames.toAnalyticsProperties();
      expect(props['username'], 'karan');
      expect(props['display_name'], 'karan');
      expect(props['role'], 'user');
      expect(props['account_status'], 'active');
    });
  });
}
