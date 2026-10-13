import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/router/app_routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/global_app_header.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/app_empty_state.dart';
import '../../../core/widgets/app_error_state.dart';
import '../../../core/widgets/app_loading.dart';
import '../../../core/widgets/responsive_scaffold.dart';
import '../../../core/widgets/status_badge.dart';
import '../controllers/analytics_controller.dart';
import '../models/analytics_models.dart';

class AnalyticsScreen extends ConsumerStatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  ConsumerState<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends ConsumerState<AnalyticsScreen> {
  int _selectedTabIndex = 0; // 0: Overview, 1: Machines, 2: Inventory
  String _machineSearchQuery = '';

  @override
  Widget build(BuildContext context) {
    final analyticsAsync = ref.watch(analyticsControllerProvider);
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return ResponsiveScaffold(
      appBar: GlobalAppHeader(
        title: 'EquipTrack',
        subtitle: 'Analytics & Insights',
        icon: Icons.insights_rounded,
        additionalActions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, size: 20),
            tooltip: 'Refresh Data',
            splashRadius: 20,
            onPressed: () => ref.read(analyticsControllerProvider.notifier).refresh(),
          ),
        ],
      ),
        body: analyticsAsync.when(
          loading: () => const Center(
            child: AppLoading(message: 'Calculating metrics & statistics...'),
          ),
          error: (error, _) => AppErrorState(
            message: error.toString(),
            onRetry: () => ref.read(analyticsControllerProvider.notifier).refresh(),
          ),
          data: (data) => RefreshIndicator(
            onRefresh: () => ref.read(analyticsControllerProvider.notifier).refresh(),
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              children: [
                // 1. Last updated & Segmented Navigation
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Live Metrics',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: theme.colorScheme.onSurface,
                      ),
                    ),
                    Text(
                      'Updated ${DateFormat('hh:mm a').format(data.lastUpdated)}',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Tab Switcher
                _buildSegmentFilter(isDark),
                const SizedBox(height: 16),

                // 2. Tab Content
                if (_selectedTabIndex == 0) ...[
                  _buildOverviewTab(data, isDark, theme),
                ] else if (_selectedTabIndex == 1) ...[
                  _buildMachinesTab(data, isDark, theme),
                ] else ...[
                  _buildInventoryTab(data, isDark, theme),
                ],

                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      );
    }

  Widget _buildSegmentFilter(bool isDark) {
    final options = ['Overview', 'Machines & Usage', 'Inventory Stock'];
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceContainerDark : AppColors.surfaceContainerLight,
        borderRadius: BorderRadius.circular(10),
      ),
      padding: const EdgeInsets.all(3),
      child: Row(
        children: List.generate(options.length, (index) {
          final isSelected = _selectedTabIndex == index;
          return Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _selectedTabIndex = index),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected
                      ? (isDark ? AppColors.surfaceContainerHighDark : Colors.white)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.05),
                            blurRadius: 4,
                            offset: const Offset(0, 1),
                          ),
                        ]
                      : null,
                ),
                child: Center(
                  child: Text(
                    options[index],
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      color: isSelected
                          ? (isDark ? AppColors.textPrimaryDark : AppColors.primary)
                          : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                    ),
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  // ==========================================
  // TAB 1: OVERVIEW
  // ==========================================
  Widget _buildOverviewTab(AnalyticsDataState data, bool isDark, ThemeData theme) {
    final summary = data.summary;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Hero KPIs Grid
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 1.45,
          children: [
            _buildMetricCard(
              title: 'Total Equipment',
              value: '${summary.totalMachines}',
              subtitle: '${summary.activeMachinesCount} active in operation',
              icon: Icons.precision_manufacturing_rounded,
              accentColor: AppColors.primary,
              isDark: isDark,
            ),
            _buildMetricCard(
              title: 'Sub-Assemblies',
              value: '${summary.totalSections}',
              subtitle: summary.totalMachines > 0
                  ? '${(summary.totalSections / summary.totalMachines).toStringAsFixed(1)} avg / machine'
                  : '0 avg',
              icon: Icons.extension_outlined,
              accentColor: const Color(0xFF0284C7), // Sky blue
              isDark: isDark,
            ),
            _buildMetricCard(
              title: 'Usage Logs',
              value: '${summary.totalUsageRecords}',
              subtitle: 'Historical service cycles',
              icon: Icons.history_rounded,
              accentColor: AppColors.success,
              isDark: isDark,
            ),
            _buildMetricCard(
              title: 'Inventory Units',
              value: '${summary.totalStockUnits}',
              subtitle: '${summary.totalProducts} catalog products',
              icon: Icons.inventory_2_outlined,
              accentColor: const Color(0xFFD97706), // Amber
              isDark: isDark,
            ),
          ],
        ),

        const SizedBox(height: 20),

        // Machine Health Status Box
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.speed_rounded, size: 18, color: AppColors.primary),
                  const SizedBox(width: 8),
                  Text(
                    'Operational Health',
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _buildHealthBarItem(
                      label: 'Operational',
                      count: summary.activeMachinesCount,
                      total: summary.totalMachines,
                      color: AppColors.success,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildHealthBarItem(
                      label: 'Configured',
                      count: summary.totalMachines - summary.activeMachinesCount,
                      total: summary.totalMachines,
                      color: const Color(0xFF0284C7),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Category Distribution Breakdown
        if (data.categoryDistributions.isNotEmpty) ...[
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Assembly Categories',
                      style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    Text(
                      '${summary.totalSections} sections',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ...data.categoryDistributions.map((cat) => Padding(
                      padding: const EdgeInsets.only(bottom: 8.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                cat.categoryName,
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                              Text(
                                '${cat.count} (${cat.percentage.toStringAsFixed(0)}%)',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: cat.percentage / 100,
                              minHeight: 6,
                              backgroundColor: isDark
                                  ? AppColors.surfaceContainerDark
                                  : AppColors.surfaceContainerLight,
                              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                            ),
                          ),
                        ],
                      ),
                    )),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Recent Activity Stream
        if (data.recentActivity.isNotEmpty) ...[
          Text(
            'Recent Operational Activity',
            style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 10),
          ...data.recentActivity.take(6).map((log) => _buildRecentActivityTile(log, isDark, theme)),
        ],
      ],
    );
  }

  // ==========================================
  // TAB 2: MACHINES & USAGE
  // ==========================================
  Widget _buildMachinesTab(AnalyticsDataState data, bool isDark, ThemeData theme) {
    final filteredMachines = data.machineItems.where((item) {
      if (_machineSearchQuery.isEmpty) return true;
      final q = _machineSearchQuery.toLowerCase();
      final nameMatches = item.machine.name.toLowerCase().contains(q);
      final descMatches = item.machine.description?.toLowerCase().contains(q) ?? false;
      return nameMatches || descMatches;
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Search bar
        TextField(
          onChanged: (val) => setState(() => _machineSearchQuery = val.trim()),
          decoration: InputDecoration(
            hintText: 'Filter machines in analytics...',
            hintStyle: TextStyle(
              fontSize: 13,
              color: isDark ? AppColors.placeholderDark : AppColors.placeholderLight,
            ),
            prefixIcon: const Icon(Icons.search_rounded, size: 20),
            filled: true,
            fillColor: isDark ? AppColors.surfaceDark : Colors.white,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),

        if (filteredMachines.isEmpty)
          const AppEmptyState(
            title: 'No machines match filter',
            message: 'Try a different search term.',
            icon: Icons.search_off_rounded,
          )
        else
          ...filteredMachines.map((mItem) => _buildMachineDetailCard(mItem, isDark, theme)),
      ],
    );
  }

  // ==========================================
  // TAB 3: INVENTORY STOCK
  // ==========================================
  Widget _buildInventoryTab(AnalyticsDataState data, bool isDark, ThemeData theme) {
    final summary = data.summary;
    final lowStockItems = data.inventoryItems.where((i) => i.isLowStock || i.isOutOfStock).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Flow Summary Row
        Row(
          children: [
            Expanded(
              child: _buildStockFlowCard(
                title: 'Total Inflow (IN)',
                value: '+${summary.totalInFlow}',
                icon: Icons.arrow_downward_rounded,
                color: AppColors.success,
                isDark: isDark,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildStockFlowCard(
                title: 'Total Outflow (OUT)',
                value: '-${summary.totalOutFlow}',
                icon: Icons.arrow_upward_rounded,
                color: const Color(0xFFEF4444),
                isDark: isDark,
              ),
            ),
          ],
        ),

        const SizedBox(height: 14),

        // Stock Alerts Card
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.warning_amber_rounded, size: 18, color: Color(0xFFD97706)),
                      const SizedBox(width: 8),
                      Text(
                        'Stock Level Alerts',
                        style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                  TextButton(
                    onPressed: () => context.push(AppRoutes.inventoryReports),
                    child: const Text('View Reports', style: TextStyle(fontSize: 12)),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (lowStockItems.isEmpty) ...[
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8.0),
                  child: Row(
                    children: [
                      Icon(Icons.check_circle_outline, size: 16, color: AppColors.success),
                      SizedBox(width: 8),
                      Text(
                        'All catalog items are adequately stocked.',
                        style: TextStyle(fontSize: 12.5),
                      ),
                    ],
                  ),
                ),
              ] else ...[
                ...lowStockItems.take(5).map((item) => Padding(
                      padding: const EdgeInsets.only(bottom: 6.0),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceContainerDark : AppColors.surfaceContainerLight,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              item.isOutOfStock ? Icons.error_outline : Icons.warning_amber_outlined,
                              size: 16,
                              color: item.isOutOfStock ? Colors.red : Colors.amber[800],
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.productName,
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5),
                                  ),
                                  Text(
                                    item.variantDescription,
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: (item.isOutOfStock ? Colors.red : Colors.amber[800])!
                                    .withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                item.isOutOfStock ? '0 Left' : '${item.currentStock} Left',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: item.isOutOfStock ? Colors.red : Colors.amber[800],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    )),
              ],
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Product Inventory List
        Text(
          'Catalog Stock Overview',
          style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 10),
        if (data.inventoryItems.isEmpty)
          const AppEmptyState(
            title: 'No inventory items found',
            message: 'Products will appear here when added.',
            icon: Icons.inventory_2_outlined,
          )
        else
          ...data.inventoryItems.map((item) => _buildInventoryItemTile(item, isDark, theme)),
      ],
    );
  }

  // ==========================================
  // HELPER WIDGETS
  // ==========================================
  Widget _buildMetricCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color accentColor,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.18 : 0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                ),
              ),
              Container(
                padding: const EdgeInsets.all(5),
                decoration: BoxDecoration(
                  color: accentColor.withValues(alpha: isDark ? 0.2 : 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 16, color: accentColor),
              ),
            ],
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
            ),
          ),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w500,
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildHealthBarItem({
    required String label,
    required int count,
    required int total,
    required Color color,
  }) {
    final pct = total > 0 ? (count / total * 100).toStringAsFixed(0) : '0';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            Text('$count ($pct%)', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: total > 0 ? (count / total) : 0,
            minHeight: 6,
            valueColor: AlwaysStoppedAnimation<Color>(color),
            backgroundColor: color.withValues(alpha: 0.15),
          ),
        ),
      ],
    );
  }

  Widget _buildRecentActivityTile(RecentActivityLog log, bool isDark, ThemeData theme) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${log.machineName} • ${log.sectionName}',
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5),
                    ),
                    Text(
                      DateFormat('MMM dd, yyyy').format(log.usageDate),
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Text(
                      log.recordName,
                      style: TextStyle(
                        fontSize: 11.5,
                        color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                      ),
                    ),
                    if (log.usageDays != null) ...[
                      const SizedBox(width: 8),
                      Text(
                        '(${log.usageDays} days duration)',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMachineDetailCard(MachineAnalyticsItem item, bool isDark, ThemeData theme) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.15 : 0.03),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => context.push(AppRoutes.machineDetailsPath(item.machine.id)),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        item.machine.name,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.2,
                        ),
                      ),
                    ),
                    StatusBadge(
                      label: item.status,
                      backgroundColor: item.status == 'Operational'
                          ? (isDark ? AppColors.runningBadgeBgDark : AppColors.runningBadgeBgLight)
                          : (isDark ? AppColors.surfaceContainerDark : AppColors.surfaceContainerLight),
                      textColor: item.status == 'Operational'
                          ? (isDark ? AppColors.runningBadgeTextDark : AppColors.runningBadgeTextLight)
                          : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                    ),
                  ],
                ),
                if (item.machine.description != null && item.machine.description!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    item.machine.description!,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildStatPill(
                      icon: Icons.layers_outlined,
                      label: '${item.sectionCount} Components',
                      isDark: isDark,
                    ),
                    _buildStatPill(
                      icon: Icons.history_rounded,
                      label: '${item.recordCount} Logs',
                      isDark: isDark,
                    ),
                    _buildStatPill(
                      icon: Icons.timer_outlined,
                      label: '${item.totalUsageDays} Run Days',
                      isDark: isDark,
                    ),
                  ],
                ),
                if (item.latestUsageDate != null) ...[
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Last Logged Date: ${DateFormat('yyyy-MM-dd').format(item.latestUsageDate!)}',
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                        ),
                      ),
                      const Row(
                        children: [
                          Text(
                            'Open Details',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                            ),
                          ),
                          Icon(Icons.chevron_right_rounded, size: 14, color: AppColors.primary),
                        ],
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatPill({required IconData icon, required String label, required bool isDark}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceContainerDark : AppColors.surfaceContainerLight,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: AppColors.primary),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  Widget _buildStockFlowCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 16, color: color),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                ),
              ),
              Text(
                value,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: color,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInventoryItemTile(InventoryItemSummary item, bool isDark, ThemeData theme) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: isDark ? 0.2 : 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.inventory_2_outlined, size: 16, color: AppColors.primary),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.productName,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                ),
                Text(
                  item.variantDescription,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${item.currentStock} Units',
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
              ),
              Text(
                'In: ${item.totalIn} • Out: ${item.totalOut}',
                style: TextStyle(
                  fontSize: 10.5,
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
