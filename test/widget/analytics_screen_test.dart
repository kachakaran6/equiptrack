import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/features/analytics/controllers/analytics_controller.dart';
import 'package:machine_usage_app/features/analytics/models/analytics_models.dart';
import 'package:machine_usage_app/features/analytics/screens/analytics_screen.dart';
import 'package:machine_usage_app/models/machine.dart';

class _FakeAnalyticsController extends AnalyticsController {
  final AnalyticsDataState _fakeData;
  _FakeAnalyticsController(this._fakeData);

  @override
  Future<AnalyticsDataState> build() async {
    return _fakeData;
  }

  @override
  Future<void> refresh() async {
    state = AsyncData(_fakeData);
  }
}

void main() {
  final now = DateTime(2026, 10, 10);
  final fakeData = AnalyticsDataState(
    summary: const OverallSummary(
      totalMachines: 3,
      totalSections: 8,
      totalUsageRecords: 15,
      activeMachinesCount: 2,
      totalProducts: 4,
      totalStockUnits: 120,
      totalInFlow: 150,
      totalOutFlow: 30,
      lowStockCount: 1,
      outOfStockCount: 0,
    ),
    machineItems: [
      MachineAnalyticsItem(
        machine: Machine(
          id: 'm-1',
          name: 'CNC Milling Center',
          description: 'High precision 5-axis mill',
          createdAt: now,
          updatedAt: now,
        ),
        sectionCount: 4,
        recordCount: 10,
        totalUsageDays: 45,
        latestUsageDate: now,
        status: 'Operational',
        sectionNames: ['Spindle', 'Coolant Pump', 'Axis Drive'],
      ),
      MachineAnalyticsItem(
        machine: Machine(
          id: 'm-2',
          name: 'Lathe Unit A',
          description: 'Standard lathe',
          createdAt: now,
          updatedAt: now,
        ),
        sectionCount: 4,
        recordCount: 5,
        totalUsageDays: 20,
        latestUsageDate: now,
        status: 'Operational',
        sectionNames: ['Chuck', 'Tool Post'],
      ),
    ],
    categoryDistributions: const [
      CategoryDistribution(
        categoryName: 'Mechanical',
        count: 5,
        percentage: 62.5,
      ),
      CategoryDistribution(
        categoryName: 'Electrical',
        count: 3,
        percentage: 37.5,
      ),
    ],
    recentActivity: [
      RecentActivityLog(
        machineName: 'CNC Milling Center',
        sectionName: 'Spindle',
        recordName: 'Bearing Replaced',
        usageDate: now,
        usageDays: 12,
        status: 'Running',
      ),
    ],
    inventoryItems: const [
      InventoryItemSummary(
        productId: 'p-1',
        productName: 'BEARING 23260',
        subProductId: 'sub-1',
        variantDescription: 'Make: SKF • Size: 60mm',
        currentStock: 2,
        totalIn: 10,
        totalOut: 8,
        isLowStock: true,
        isOutOfStock: false,
      ),
    ],
    lastUpdated: now,
  );

  testWidgets('AnalyticsScreen renders metrics, KPIs, segments, and refresh button', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          analyticsControllerProvider.overrideWith(() => _FakeAnalyticsController(fakeData)),
        ],
        child: const MaterialApp(
          home: AnalyticsScreen(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify Title & Subtitle in GlobalAppHeader
    expect(find.text('EquipTrack'), findsWidgets);
    expect(find.text('Analytics & Insights'), findsOneWidget);

    // Verify Refresh Button is present
    final refreshButtonFinder = find.byTooltip('Refresh Data');
    expect(refreshButtonFinder, findsOneWidget);

    // Verify Hero Metric Cards
    expect(find.text('Total Equipment'), findsOneWidget);
    expect(find.text('3'), findsOneWidget);
    expect(find.text('Sub-Assemblies'), findsOneWidget);
    expect(find.text('8'), findsOneWidget);
    expect(find.text('Usage Logs'), findsOneWidget);
    expect(find.text('15'), findsOneWidget);
    expect(find.text('Inventory Units'), findsOneWidget);
    expect(find.text('120'), findsOneWidget);

    // Verify Category Distribution
    expect(find.text('Assembly Categories'), findsOneWidget);
    expect(find.text('Mechanical'), findsOneWidget);
    expect(find.text('Electrical'), findsOneWidget);

    // Switch to Machines & Usage tab
    await tester.tap(find.text('Machines & Usage'));
    await tester.pumpAndSettle();

    // Verify machine item rendered
    expect(find.text('CNC Milling Center'), findsOneWidget);
    expect(find.text('High precision 5-axis mill'), findsOneWidget);
    expect(find.text('4 Components'), findsNWidgets(2));
    expect(find.text('10 Logs'), findsOneWidget);

    // Switch to Inventory Stock tab
    await tester.tap(find.text('Inventory Stock'));
    await tester.pumpAndSettle();

    // Verify Inventory metrics rendered
    expect(find.text('Total Inflow (IN)'), findsOneWidget);
    expect(find.text('+150'), findsOneWidget);
    expect(find.text('Total Outflow (OUT)'), findsOneWidget);
    expect(find.text('-30'), findsOneWidget);
    expect(find.text('BEARING 23260'), findsNWidgets(2));

    // Test refresh button
    await tester.tap(refreshButtonFinder);
    await tester.pumpAndSettle();
  });
}
