import 'package:flutter/foundation.dart';
import '../../../models/machine.dart';

@immutable
class OverallSummary {
  final int totalMachines;
  final int totalSections;
  final int totalUsageRecords;
  final int activeMachinesCount;
  final int totalProducts;
  final int totalStockUnits;
  final int totalInFlow;
  final int totalOutFlow;
  final int lowStockCount;
  final int outOfStockCount;

  const OverallSummary({
    this.totalMachines = 0,
    this.totalSections = 0,
    this.totalUsageRecords = 0,
    this.activeMachinesCount = 0,
    this.totalProducts = 0,
    this.totalStockUnits = 0,
    this.totalInFlow = 0,
    this.totalOutFlow = 0,
    this.lowStockCount = 0,
    this.outOfStockCount = 0,
  });
}

@immutable
class MachineAnalyticsItem {
  final Machine machine;
  final int sectionCount;
  final int recordCount;
  final int totalUsageDays;
  final DateTime? latestUsageDate;
  final String status;
  final List<String> sectionNames;

  const MachineAnalyticsItem({
    required this.machine,
    this.sectionCount = 0,
    this.recordCount = 0,
    this.totalUsageDays = 0,
    this.latestUsageDate,
    required this.status,
    this.sectionNames = const [],
  });
}

@immutable
class CategoryDistribution {
  final String categoryName;
  final int count;
  final double percentage;

  const CategoryDistribution({
    required this.categoryName,
    required this.count,
    required this.percentage,
  });
}

@immutable
class RecentActivityLog {
  final String machineName;
  final String sectionName;
  final String recordName;
  final DateTime usageDate;
  final int? usageDays;
  final String status;

  const RecentActivityLog({
    required this.machineName,
    required this.sectionName,
    required this.recordName,
    required this.usageDate,
    this.usageDays,
    required this.status,
  });
}

@immutable
class InventoryItemSummary {
  final String productId;
  final String productName;
  final String subProductId;
  final String variantDescription;
  final int currentStock;
  final int totalIn;
  final int totalOut;
  final bool isLowStock;
  final bool isOutOfStock;

  const InventoryItemSummary({
    required this.productId,
    required this.productName,
    required this.subProductId,
    required this.variantDescription,
    required this.currentStock,
    required this.totalIn,
    required this.totalOut,
    required this.isLowStock,
    required this.isOutOfStock,
  });
}

@immutable
class AnalyticsDataState {
  final OverallSummary summary;
  final List<MachineAnalyticsItem> machineItems;
  final List<CategoryDistribution> categoryDistributions;
  final List<RecentActivityLog> recentActivity;
  final List<InventoryItemSummary> inventoryItems;
  final DateTime lastUpdated;

  const AnalyticsDataState({
    required this.summary,
    required this.machineItems,
    required this.categoryDistributions,
    required this.recentActivity,
    required this.inventoryItems,
    required this.lastUpdated,
  });
}
