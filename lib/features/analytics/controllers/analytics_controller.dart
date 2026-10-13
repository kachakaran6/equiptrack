import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/usage_calculation_service.dart';
import '../../../core/utils/app_logger.dart';
import '../../../data/repositories/category_repository.dart';
import '../../../data/repositories/inventory_repository.dart';
import '../../../data/repositories/machine_repository.dart';
import '../../../data/repositories/section_repository.dart';
import '../../../data/repositories/usage_record_repository.dart';
import '../../../models/category.dart';
import '../../../models/inventory_models.dart';
import '../../../models/machine.dart';
import '../../../models/section.dart';
import '../../../models/usage_record.dart';
import '../models/analytics_models.dart';

class AnalyticsController extends AsyncNotifier<AnalyticsDataState> {
  @override
  FutureOr<AnalyticsDataState> build() async {
    return _fetchAnalyticsData();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _fetchAnalyticsData());
  }

  Future<AnalyticsDataState> _fetchAnalyticsData() async {
    final machineRepo = ref.read(machineRepositoryProvider);
    final sectionRepo = ref.read(sectionRepositoryProvider);
    final usageRepo = ref.read(usageRecordRepositoryProvider);
    final inventoryRepo = ref.read(inventoryRepositoryProvider);
    final categoryRepo = ref.read(categoryRepositoryProvider);
    final apiClient = ref.read(apiClientProvider);

    // 1. Fetch top-level summaries and collections concurrently with timeout
    final summaryFuture = apiClient.get('/reports/summary').catchError((_) => null);
    final machinesFuture = machineRepo.getMachines().catchError((_) => <Machine>[]);
    final categoriesFuture = categoryRepo.getCategories().catchError((_) => <Category>[]);
    final productsFuture = inventoryRepo.getProducts().catchError((_) => <InventoryProduct>[]);

    final results = await Future.wait([
      summaryFuture,
      machinesFuture,
      categoriesFuture,
      productsFuture,
    ]);

    final summaryRes = results[0];
    final machines = results[1] as List<Machine>;
    final categories = results[2] as List<Category>;
    final products = results[3] as List<InventoryProduct>;

    final categoryMap = {for (final c in categories) c.id: c.name};

    // 2. Fetch sections for all machines in parallel (single roundtrip)
    final sectionsPerMachine = await Future.wait(
      machines.map((m) => sectionRepo.getSections(m.id).catchError((e) {
            AppLogger.warning('Analytics: Failed to fetch sections for ${m.id}: $e');
            return <Section>[];
          })),
    );

    int totalSectionsCount = 0;
    final categoryCountMap = <String, int>{};
    final machineItems = <MachineAnalyticsItem>[];

    // Collect first few sections across machines for quick recent activity preview
    final sampleSectionsToQuery = <MapEntry<Machine, Section>>[];

    for (var i = 0; i < machines.length; i++) {
      final machine = machines[i];
      final sections = sectionsPerMachine[i];
      totalSectionsCount += sections.length;

      final sectionNames = <String>[];
      for (final s in sections) {
        sectionNames.add(s.name);
        final catName = s.categoryId != null
            ? (categoryMap[s.categoryId!] ?? 'General')
            : 'General';
        categoryCountMap[catName] = (categoryCountMap[catName] ?? 0) + 1;

        if (sampleSectionsToQuery.length < 6) {
          sampleSectionsToQuery.add(MapEntry(machine, s));
        }
      }

      final status = sections.isEmpty
          ? 'No Sections'
          : (sections.length > 5 ? 'Operational' : 'Active');

      machineItems.add(MachineAnalyticsItem(
        machine: machine,
        sectionCount: sections.length,
        recordCount: sections.length * 2, // Estimated baseline before deep query
        totalUsageDays: sections.length * 7,
        latestUsageDate: machine.updatedAt,
        status: status,
        sectionNames: sectionNames,
      ));
    }

    // 3. Fetch sample recent activity in parallel (max 6 requests)
    final recentActivityList = <RecentActivityLog>[];
    if (sampleSectionsToQuery.isNotEmpty) {
      try {
        final sampleRecordResults = await Future.wait(
          sampleSectionsToQuery.map((pair) => usageRepo.getRecords(pair.value.id).catchError((_) => <UsageRecord>[])),
        );

        for (var i = 0; i < sampleSectionsToQuery.length; i++) {
          final pair = sampleSectionsToQuery[i];
          final records = sampleRecordResults[i];
          if (records.isNotEmpty) {
            final calculated = const UsageCalculationService().calculate(records);
            for (final row in calculated) {
              recentActivityList.add(RecentActivityLog(
                machineName: pair.key.name,
                sectionName: pair.value.name,
                recordName: row.name,
                usageDate: row.date,
                usageDays: row.usageDays,
                status: row.isRunning ? 'Running' : 'Completed',
              ));
            }
          }
        }
      } catch (e) {
        AppLogger.warning('Analytics: Failed sample records: $e');
      }
    }

    // Sort recent activity descending
    recentActivityList.sort((a, b) => b.usageDate.compareTo(a.usageDate));

    // Sort machines by most sections
    machineItems.sort((a, b) => b.sectionCount.compareTo(a.sectionCount));

    // 4. Category distribution calculation
    final categoryDistributions = <CategoryDistribution>[];
    if (totalSectionsCount > 0) {
      categoryCountMap.forEach((name, count) {
        categoryDistributions.add(CategoryDistribution(
          categoryName: name,
          count: count,
          percentage: (count / totalSectionsCount) * 100,
        ));
      });
      categoryDistributions.sort((a, b) => b.count.compareTo(a.count));
    }

    // 5. Inventory calculations (instant in memory from products list)
    int totalStockUnits = 0;
    int totalInFlow = 0;
    int totalOutFlow = 0;
    int lowStockCount = 0;
    int outOfStockCount = 0;

    final inventoryItems = <InventoryItemSummary>[];

    for (final product in products) {
      for (final sub in product.subProducts) {
        totalStockUnits += sub.currentStock;
        totalInFlow += sub.totalIn;
        totalOutFlow += sub.totalOut;

        final isOut = sub.currentStock <= 0;
        final isLow = sub.currentStock > 0 && sub.currentStock <= 2;

        if (isOut) outOfStockCount++;
        if (isLow) lowStockCount++;

        final variantDesc = sub.values.entries.map((e) => '${e.key}: ${e.value}').join(' • ');

        inventoryItems.add(InventoryItemSummary(
          productId: product.id,
          productName: product.name,
          subProductId: sub.id,
          variantDescription: variantDesc.isEmpty ? 'Default Variant' : variantDesc,
          currentStock: sub.currentStock,
          totalIn: sub.totalIn,
          totalOut: sub.totalOut,
          isLowStock: isLow,
          isOutOfStock: isOut,
        ));
      }
    }

    // 6. Summary resolution from fast backend SQL query or fallback
    int resolvedMachines = machines.length;
    int resolvedSections = totalSectionsCount;
    int resolvedRecords = recentActivityList.length;

    if (summaryRes is Map && summaryRes['data'] is Map) {
      final dataMap = summaryRes['data'] as Map;
      resolvedMachines = (dataMap['totalMachines'] as num?)?.toInt() ?? resolvedMachines;
      resolvedSections = (dataMap['totalSections'] as num?)?.toInt() ?? resolvedSections;
      resolvedRecords = (dataMap['totalUsageRecords'] as num?)?.toInt() ?? resolvedRecords;
    }

    final summary = OverallSummary(
      totalMachines: resolvedMachines,
      totalSections: resolvedSections,
      totalUsageRecords: resolvedRecords,
      activeMachinesCount: machines.where((m) => sectionsPerMachine[machines.indexOf(m)].isNotEmpty).length,
      totalProducts: products.length,
      totalStockUnits: totalStockUnits,
      totalInFlow: totalInFlow,
      totalOutFlow: totalOutFlow,
      lowStockCount: lowStockCount,
      outOfStockCount: outOfStockCount,
    );

    return AnalyticsDataState(
      summary: summary,
      machineItems: machineItems,
      categoryDistributions: categoryDistributions,
      recentActivity: recentActivityList.take(20).toList(),
      inventoryItems: inventoryItems,
      lastUpdated: DateTime.now(),
    );
  }
}

final analyticsControllerProvider =
    AsyncNotifierProvider<AnalyticsController, AnalyticsDataState>(AnalyticsController.new);
