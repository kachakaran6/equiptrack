import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_keys.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/extensions/context_extensions.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/app_app_bar.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/app_confirm_dialog.dart';
import '../../../core/widgets/app_empty_state.dart';
import '../../../core/widgets/app_error_state.dart';
import '../../../core/widgets/app_popup_menu.dart';
import '../../../core/widgets/app_search_field.dart';
import '../../../core/widgets/app_shimmer.dart';
import '../../../core/widgets/responsive_scaffold.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../data/repositories/category_repository.dart';
import '../../../data/repositories/section_repository.dart';
import '../../../data/repositories/usage_record_repository.dart';
import '../../../models/category.dart';
import '../../../models/section.dart';
import '../../machines/controllers/machines_controller.dart';
import '../../machines/widgets/add_edit_machine_dialog.dart';
import '../../machines/widgets/duplicate_machine_dialog.dart';
import '../../reports/widgets/multi_component_report_dialog.dart';
import '../controllers/categories_controller.dart';
import '../controllers/sections_controller.dart';
import '../widgets/add_edit_category_dialog.dart';
import '../widgets/add_edit_section_dialog.dart';

class MachineDetailScreen extends ConsumerStatefulWidget {
  final String machineId;

  const MachineDetailScreen({super.key, required this.machineId});

  @override
  ConsumerState<MachineDetailScreen> createState() => _MachineDetailScreenState();
}

class _MachineDetailScreenState extends ConsumerState<MachineDetailScreen> {
  String _searchQuery = '';
  bool _selectionMode = false;
  final Set<String> _selectedComponentIds = {};
  final Set<String> _collapsedCategoryIds = {};

  bool _isCategoryExpanded(String categoryKey) {
    return !_collapsedCategoryIds.contains(categoryKey);
  }

  void _toggleCategoryExpanded(String categoryKey) {
    setState(() {
      if (_collapsedCategoryIds.contains(categoryKey)) {
        _collapsedCategoryIds.remove(categoryKey);
      } else {
        _collapsedCategoryIds.add(categoryKey);
      }
    });
  }

  void _toggleComponentSelection(String componentId) {
    setState(() {
      if (_selectedComponentIds.contains(componentId)) {
        _selectedComponentIds.remove(componentId);
      } else {
        _selectedComponentIds.add(componentId);
      }
    });
  }

  void _toggleCategorySelection(List<Section> categorySections) {
    final ids = categorySections.map((s) => s.id).toSet();
    final allSelected = ids.isNotEmpty && ids.every((id) => _selectedComponentIds.contains(id));

    setState(() {
      if (allSelected) {
        _selectedComponentIds.removeAll(ids);
      } else {
        _selectedComponentIds.addAll(ids);
      }
    });
  }

  void _selectAll(List<Section> allSections) {
    setState(() {
      _selectedComponentIds.addAll(allSections.map((s) => s.id));
    });
  }

  void _clearSelection() {
    setState(() {
      _selectedComponentIds.clear();
    });
  }

  void _exitSelectionMode() {
    setState(() {
      _selectionMode = false;
      _selectedComponentIds.clear();
    });
  }

  void _generatePdfReport({
    required BuildContext context,
    required List<Category> categories,
    required List<Section> allSections,
    required dynamic machine,
  }) {
    if (_selectedComponentIds.isEmpty) {
      context.showInfoSnackBar('Please select at least one component to generate report.');
      return;
    }

    final categoryMap = {for (final c in categories) c.id: c.name};

    // Sort selected components by Category order -> Component order (docs requirement 10)
    final List<Section> sortedSelectedSections = [];

    // 1. Components in categories
    for (final cat in categories) {
      final inCat = allSections
          .where((s) => s.categoryId == cat.id && _selectedComponentIds.contains(s.id))
          .toList();
      sortedSelectedSections.addAll(inCat);
    }

    // 2. Uncategorized components
    final uncategorized = allSections
        .where((s) =>
            (s.categoryId == null || !categoryMap.containsKey(s.categoryId)) &&
            _selectedComponentIds.contains(s.id))
        .toList();
    sortedSelectedSections.addAll(uncategorized);

    MultiComponentReportDialog.show(
      context,
      machine: machine,
      selectedSections: sortedSelectedSections,
      categoryNames: categoryMap,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final machineAsync = ref.watch(singleMachineProvider(widget.machineId));
    final sectionsAsync = ref.watch(sectionsStreamFamily(widget.machineId));
    final categoriesAsync = ref.watch(categoriesStreamFamily(widget.machineId));

    return ResponsiveScaffold(
      appBar: AppAppBar(
        title: machineAsync.when(
          data: (machine) => machine?.name ?? 'Machine Details',
          loading: () => 'Machine Details',
          error: (_, _) => 'Machine Details',
        ),
        subtitle: _selectionMode
            ? '${_selectedComponentIds.length} selected for report'
            : 'Components & Tracking',
        actions: [
          if (!_selectionMode) ...[
            machineAsync.maybeWhen(
              data: (machine) => machine != null
                  ? Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.copy_rounded, size: 19),
                          tooltip: 'Duplicate Machine',
                          splashRadius: 20,
                          onPressed: () async {
                            final duplicated = await DuplicateMachineDialog.show(
                              context,
                              machine: machine,
                            );
                            if (duplicated != null && context.mounted) {
                              context.go('/machines/${duplicated.id}');
                            }
                          },
                        ),
                        IconButton(
                          icon: const Icon(Icons.edit_outlined, size: 20),
                          tooltip: 'Edit Machine',
                          splashRadius: 20,
                          onPressed: () async {
                            final updated = await AddEditMachineDialog.show(
                              context,
                              machine: machine,
                            );
                            if (updated != null) {
                              ref.invalidate(singleMachineProvider(widget.machineId));
                            }
                          },
                        ),
                      ],
                    )
                  : const SizedBox.shrink(),
              orElse: () => const SizedBox.shrink(),
            ),
          ] else ...[
            IconButton(
              icon: const Icon(Icons.close_rounded),
              tooltip: 'Cancel Selection',
              onPressed: _exitSelectionMode,
            ),
          ],
          const SizedBox(width: 4),
        ],
      ),
      floatingActionButton: _selectionMode
          ? FloatingActionButton.extended(
              onPressed: () {
                final machine = machineAsync.value;
                final sections = sectionsAsync.value ?? [];
                final categories = categoriesAsync.value ?? [];
                if (machine != null) {
                  _generatePdfReport(
                    context: context,
                    categories: categories,
                    allSections: sections,
                    machine: machine,
                  );
                }
              },
              icon: const Icon(Icons.picture_as_pdf_rounded, size: 20),
              label: Text(
                'Generate PDF (${_selectedComponentIds.length})',
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
              ),
            )
          : FloatingActionButton.extended(
              key: const Key(AppKeys.addSectionButton),
              onPressed: () => AddEditSectionDialog.show(context, machineId: widget.machineId),
              icon: const Icon(Icons.add_rounded, size: 20),
              label: const Text(
                'Add Component',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              ),
            ),
      body: machineAsync.when(
        loading: () => ListView(
          padding: AppSpacing.screenPadding,
          children: const [
            MachineHeaderSkeleton(),
            SizedBox(height: 24),
            SectionListSkeleton(itemCount: 4),
          ],
        ),
        error: (err, _) => AppErrorState(
          message: err.toString(),
          onRetry: () => ref.invalidate(singleMachineProvider(widget.machineId)),
        ),
        data: (machine) {
          if (machine == null) {
            return const AppErrorState(
              title: 'Machine not found',
              message: 'The requested machine could not be located or has been deleted.',
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(singleMachineProvider(widget.machineId));
              ref.invalidate(sectionsStreamFamily(widget.machineId));
              ref.invalidate(categoriesStreamFamily(widget.machineId));
            },
            child: ListView(
              padding: AppSpacing.screenPadding,
              children: [
                // Compact Machine Summary Card
                AppCard(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  backgroundColor: isDark
                      ? AppColors.surfaceContainerLowDark
                      : AppColors.surfaceContainerLowLight,
                  child: Row(
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: isDark
                              ? AppColors.primaryContainerDark
                              : AppColors.primaryContainerLight,
                          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                          border: Border.all(
                            color: isDark ? AppColors.borderDark : AppColors.borderLight,
                          ),
                        ),
                        child: Icon(
                          Icons.precision_manufacturing_rounded,
                          color: isDark ? AppColors.primaryLight : AppColors.primary,
                          size: 19,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              machine.name,
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            if (machine.description != null &&
                                machine.description!.trim().isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(
                                machine.description!.trim(),
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: theme.colorScheme.onSurfaceVariant,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // Search Component Field
                AppSearchField(
                  hintText: 'Search components...',
                  onChanged: (val) {
                    setState(() {
                      _searchQuery = val.trim().toLowerCase();
                    });
                  },
                ),
                const SizedBox(height: 10),

                // Action Toolbar: [ + Create Category ] & [ Select for Report ]
                sectionsAsync.when(
                  loading: () => const SizedBox.shrink(),
                  error: (_, _) => const SizedBox.shrink(),
                  data: (sections) {
                    if (sections.isEmpty) return const SizedBox.shrink();

                    if (_selectionMode) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: isDark
                              ? AppColors.primaryContainerDark.withAlpha(120)
                              : AppColors.primaryContainerLight.withAlpha(140),
                          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                          border: Border.all(
                            color: isDark ? AppColors.primaryLight.withAlpha(60) : AppColors.primary.withAlpha(60),
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.checklist_rounded,
                              size: 18,
                              color: isDark ? AppColors.primaryLight : AppColors.primary,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '${_selectedComponentIds.length} of ${sections.length} selected',
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                                ),
                              ),
                            ),
                            TextButton(
                              onPressed: () => _selectAll(sections),
                              style: TextButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: const Text('Select All', style: TextStyle(fontSize: 12)),
                            ),
                            const SizedBox(width: 4),
                            TextButton(
                              onPressed: _clearSelection,
                              style: TextButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: const Text('Clear', style: TextStyle(fontSize: 12)),
                            ),
                          ],
                        ),
                      );
                    }

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => AddEditCategoryDialog.show(
                                context,
                                machineId: widget.machineId,
                              ),
                              icon: const Icon(Icons.create_new_folder_outlined, size: 16),
                              label: const Text(
                                'Create Category',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 10),
                                side: BorderSide(
                                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () {
                                setState(() {
                                  _selectionMode = true;
                                });
                              },
                              icon: const Icon(Icons.picture_as_pdf_outlined, size: 16),
                              label: const Text(
                                'Select for Report',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 10),
                                side: BorderSide(
                                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),

                // Sections & Categories View
                sectionsAsync.when(
                  loading: () => const SectionListSkeleton(),
                  error: (err, _) => AppErrorState(
                    message: err.toString(),
                    onRetry: () {
                      ref.invalidate(sectionsStreamFamily(widget.machineId));
                      ref.invalidate(categoriesStreamFamily(widget.machineId));
                    },
                  ),
                  data: (sections) {
                    return categoriesAsync.when(
                      loading: () => const SectionListSkeleton(),
                      error: (err, _) => AppErrorState(
                        message: err.toString(),
                        onRetry: () => ref.invalidate(categoriesStreamFamily(widget.machineId)),
                      ),
                      data: (categories) {
                        if (sections.isEmpty && categories.isEmpty) {
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              AppEmptyState(
                                title: 'No components yet',
                                message:
                                    'Add a component (e.g. Big ID Fan, Gearbox, Spindle) or create categories to start tracking.',
                                icon: Icons.category_outlined,
                                actionLabel: 'Add Component',
                                onAction: () => AddEditSectionDialog.show(
                                  context,
                                  machineId: widget.machineId,
                                ),
                              ),
                            ],
                          );
                        }

                        // Map of valid category IDs
                        final validCategoryIds = {for (final c in categories) c.id};

                        // Group sections by category
                        final Map<String, List<Section>> categorySectionsMap = {};
                        final List<Section> uncategorizedSections = [];

                        for (final s in sections) {
                          if (s.categoryId != null && validCategoryIds.contains(s.categoryId)) {
                            categorySectionsMap.putIfAbsent(s.categoryId!, () => []).add(s);
                          } else {
                            uncategorizedSections.add(s);
                          }
                        }

                        // Filter based on search query
                        final isSearching = _searchQuery.isNotEmpty;

                        // Check total filtered count
                        final totalMatching = sections
                            .where((s) => s.name.toLowerCase().contains(_searchQuery))
                            .length;

                        if (isSearching && totalMatching == 0) {
                          return AppEmptyState(
                            title: 'No matching components',
                            message: 'No component names match "$_searchQuery".',
                            icon: Icons.search_off_rounded,
                          );
                        }

                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // 1. Render Custom Categories Accordions
                            for (final category in categories) ...[
                              Builder(builder: (context) {
                                final allCatSections = categorySectionsMap[category.id] ?? [];
                                final filteredCatSections = isSearching
                                    ? allCatSections
                                        .where((s) => s.name.toLowerCase().contains(_searchQuery))
                                        .toList()
                                    : allCatSections;

                                // If searching and category has 0 matches, skip
                                if (isSearching && filteredCatSections.isEmpty) {
                                  return const SizedBox.shrink();
                                }

                                final isExpanded = _isCategoryExpanded(category.id);

                                return _CategoryAccordionSection(
                                  machineId: widget.machineId,
                                  category: category,
                                  sections: filteredCatSections,
                                  isExpanded: isExpanded,
                                  selectionMode: _selectionMode,
                                  selectedComponentIds: _selectedComponentIds,
                                  onToggleExpand: () => _toggleCategoryExpanded(category.id),
                                  onToggleComponentSelect: _toggleComponentSelection,
                                  onToggleCategorySelect: () =>
                                      _toggleCategorySelection(filteredCatSections),
                                );
                              }),
                            ],

                            // 2. Render Uncategorized Accordion
                            Builder(builder: (context) {
                              final filteredUncategorized = isSearching
                                  ? uncategorizedSections
                                      .where((s) => s.name.toLowerCase().contains(_searchQuery))
                                      .toList()
                                  : uncategorizedSections;

                              // If no uncategorized components exist (and not searching), hide uncategorized
                              if (filteredUncategorized.isEmpty &&
                                  (categories.isNotEmpty || isSearching)) {
                                return const SizedBox.shrink();
                              }

                              const uncategorizedKey = '__uncategorized__';
                              final isExpanded = _isCategoryExpanded(uncategorizedKey);

                              return _UncategorizedAccordionSection(
                                machineId: widget.machineId,
                                sections: filteredUncategorized,
                                isExpanded: isExpanded,
                                selectionMode: _selectionMode,
                                selectedComponentIds: _selectedComponentIds,
                                onToggleExpand: () =>
                                    _toggleCategoryExpanded(uncategorizedKey),
                                onToggleComponentSelect: _toggleComponentSelection,
                                onToggleCategorySelect: () =>
                                    _toggleCategorySelection(filteredUncategorized),
                              );
                            }),

                            // Extra bottom padding so FAB does not overlap
                            const SizedBox(height: 80),
                          ],
                        );
                      },
                    );
                  },
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// Category Accordion Section Widget
class _CategoryAccordionSection extends ConsumerWidget {
  final String machineId;
  final Category category;
  final List<Section> sections;
  final bool isExpanded;
  final bool selectionMode;
  final Set<String> selectedComponentIds;
  final VoidCallback onToggleExpand;
  final ValueChanged<String> onToggleComponentSelect;
  final VoidCallback onToggleCategorySelect;

  const _CategoryAccordionSection({
    required this.machineId,
    required this.category,
    required this.sections,
    required this.isExpanded,
    required this.selectionMode,
    required this.selectedComponentIds,
    required this.onToggleExpand,
    required this.onToggleComponentSelect,
    required this.onToggleCategorySelect,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // Check category selection state
    final totalInCat = sections.length;
    final selectedInCat = sections.where((s) => selectedComponentIds.contains(s.id)).length;
    final bool? categoryCheckboxValue = totalInCat == 0
        ? false
        : (selectedInCat == totalInCat
            ? true
            : (selectedInCat == 0 ? false : null));

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        decoration: BoxDecoration(
          color: isDark
              ? AppColors.surfaceContainerLowDark
              : AppColors.surfaceContainerLowLight,
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          border: Border.all(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
            width: 1.0,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Category Header Row
            InkWell(
              onTap: onToggleExpand,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                color: isDark
                    ? AppColors.surfaceContainerDark.withAlpha(160)
                    : AppColors.surfaceContainerLight.withAlpha(160),
                child: Row(
                  children: [
                    if (selectionMode) ...[
                      Checkbox(
                        value: categoryCheckboxValue,
                        tristate: true,
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        visualDensity: VisualDensity.compact,
                        onChanged: (_) => onToggleCategorySelect(),
                      ),
                      const SizedBox(width: 4),
                    ],
                    // Chevron expand icon
                    AnimatedRotation(
                      turns: isExpanded ? 0.0 : -0.25,
                      duration: const Duration(milliseconds: 200),
                      child: const Icon(
                        Icons.expand_more_rounded,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Icon(
                      Icons.folder_outlined,
                      size: 18,
                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                    ),
                    const SizedBox(width: 8),
                    // Category Name
                    Expanded(
                      child: Text(
                        category.name,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    // Component Count Badge
                    CountBadge(
                      count: sections.length,
                      singular: 'component',
                      plural: 'components',
                    ),
                    if (!selectionMode) ...[
                      const SizedBox(width: 4),
                      // Category Actions Menu
                      AppPopupMenu<String>(
                        items: const [
                          AppPopupMenuItem(
                            value: 'edit',
                            label: 'Edit Category',
                            icon: Icons.edit_outlined,
                          ),
                          AppPopupMenuItem(
                            value: 'delete',
                            label: 'Delete Category',
                            icon: Icons.delete_outline_rounded,
                            isDestructive: true,
                          ),
                        ],
                        onSelected: (action) async {
                          if (action == 'edit') {
                            AddEditCategoryDialog.show(
                              context,
                              machineId: machineId,
                              category: category,
                            );
                          } else if (action == 'delete') {
                            final confirm = await AppConfirmDialog.show(
                              context: context,
                              title: 'Delete category?',
                              message:
                                  'Are you sure you want to delete category "${category.name}"?',
                              cascadeNotice:
                                  'Components in this category will not be deleted; they will automatically become Uncategorized.',
                              confirmLabel: 'Delete',
                              isDestructive: true,
                            );
                            if (confirm == true) {
                              final ok = await ref
                                  .read(categoriesControllerProvider.notifier)
                                  .deleteCategory(
                                    id: category.id,
                                    machineId: machineId,
                                  );
                              if (context.mounted) {
                                if (ok) {
                                  context.showSuccessSnackBar('Category deleted');
                                } else {
                                  context.showErrorSnackBar('Failed to delete category');
                                }
                              }
                            }
                          }
                        },
                      ),
                    ],
                  ],
                ),
              ),
            ),

            // Components List inside Accordion
            if (isExpanded) ...[
              if (sections.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'No components in this category.',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                      TextButton.icon(
                        onPressed: () => AddEditSectionDialog.show(
                          context,
                          machineId: machineId,
                        ),
                        icon: const Icon(Icons.add_rounded, size: 14),
                        label: const Text('Add Component', style: TextStyle(fontSize: 11)),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                      ),
                    ],
                  ),
                )
              else
                Padding(
                  padding: const EdgeInsets.all(8),
                  child: ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: sections.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 6),
                    itemBuilder: (context, index) {
                      final section = sections[index];
                      return _ComponentRowCard(
                        machineId: machineId,
                        section: section,
                        isSelectionMode: selectionMode,
                        isSelected: selectedComponentIds.contains(section.id),
                        onToggleSelect: () => onToggleComponentSelect(section.id),
                      );
                    },
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Uncategorized Accordion Section Widget
class _UncategorizedAccordionSection extends StatelessWidget {
  final String machineId;
  final List<Section> sections;
  final bool isExpanded;
  final bool selectionMode;
  final Set<String> selectedComponentIds;
  final VoidCallback onToggleExpand;
  final ValueChanged<String> onToggleComponentSelect;
  final VoidCallback onToggleCategorySelect;

  const _UncategorizedAccordionSection({
    required this.machineId,
    required this.sections,
    required this.isExpanded,
    required this.selectionMode,
    required this.selectedComponentIds,
    required this.onToggleExpand,
    required this.onToggleComponentSelect,
    required this.onToggleCategorySelect,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final totalInCat = sections.length;
    final selectedInCat = sections.where((s) => selectedComponentIds.contains(s.id)).length;
    final bool? categoryCheckboxValue = totalInCat == 0
        ? false
        : (selectedInCat == totalInCat
            ? true
            : (selectedInCat == 0 ? false : null));

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        decoration: BoxDecoration(
          color: isDark
              ? AppColors.surfaceContainerLowDark
              : AppColors.surfaceContainerLowLight,
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          border: Border.all(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
            width: 1.0,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header Row
            InkWell(
              onTap: onToggleExpand,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                color: isDark
                    ? AppColors.surfaceContainerDark.withAlpha(160)
                    : AppColors.surfaceContainerLight.withAlpha(160),
                child: Row(
                  children: [
                    if (selectionMode) ...[
                      Checkbox(
                        value: categoryCheckboxValue,
                        tristate: true,
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        visualDensity: VisualDensity.compact,
                        onChanged: (_) => onToggleCategorySelect(),
                      ),
                      const SizedBox(width: 4),
                    ],
                    AnimatedRotation(
                      turns: isExpanded ? 0.0 : -0.25,
                      duration: const Duration(milliseconds: 200),
                      child: const Icon(
                        Icons.expand_more_rounded,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Icon(
                      Icons.layers_outlined,
                      size: 18,
                      color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Uncategorized',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    CountBadge(
                      count: sections.length,
                      singular: 'component',
                      plural: 'components',
                    ),
                  ],
                ),
              ),
            ),

            // Components List inside Accordion
            if (isExpanded) ...[
              if (sections.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  child: Text(
                    'No uncategorized components.',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                )
              else
                Padding(
                  padding: const EdgeInsets.all(8),
                  child: ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: sections.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 6),
                    itemBuilder: (context, index) {
                      final section = sections[index];
                      return _ComponentRowCard(
                        machineId: machineId,
                        section: section,
                        isSelectionMode: selectionMode,
                        isSelected: selectedComponentIds.contains(section.id),
                        onToggleSelect: () => onToggleComponentSelect(section.id),
                      );
                    },
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Compact, industrial 68dp Component / Section Row Card
class _ComponentRowCard extends ConsumerWidget {
  final String machineId;
  final Section section;
  final bool isSelectionMode;
  final bool isSelected;
  final VoidCallback? onToggleSelect;

  const _ComponentRowCard({
    required this.machineId,
    required this.section,
    this.isSelectionMode = false,
    this.isSelected = false,
    this.onToggleSelect,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final recordsAsync = ref.watch(usageRecordsStreamFamily(section.id));

    return AppCard(
      keyString: '${AppKeys.sectionCardPrefix}${section.id}',
      onTap: () {
        if (isSelectionMode) {
          onToggleSelect?.call();
        } else {
          context.go('/machines/$machineId/sections/${section.id}');
        }
      },
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (isSelectionMode) ...[
            Checkbox(
              value: isSelected,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              visualDensity: VisualDensity.compact,
              onChanged: (_) => onToggleSelect?.call(),
            ),
            const SizedBox(width: 8),
          ],
          // Compact Component Icon Container (36x36)
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: isDark
                  ? AppColors.secondaryContainerDark
                  : AppColors.secondaryContainerLight,
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
              border: Border.all(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
                width: 1,
              ),
            ),
            child: Icon(
              Icons.tune_rounded,
              color: isDark ? AppColors.secondaryLight : AppColors.secondary,
              size: 18,
            ),
          ),
          const SizedBox(width: 12),
          // Component Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  section.name,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 3),
                recordsAsync.when(
                  loading: () => const Padding(
                    padding: EdgeInsets.only(top: 2, bottom: 2),
                    child: AppSkeletonLine(width: 80, height: 9),
                  ),
                  error: (_, _) => const SizedBox.shrink(),
                  data: (records) {
                    final recordCountText = records.isEmpty
                        ? 'No usage records'
                        : '${records.length} ${records.length == 1 ? "usage record" : "usage records"}';

                    return Text(
                      recordCountText,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
          if (!isSelectionMode)
            // Standardized Overflow Menu
            AppPopupMenu<String>(
              items: const [
                AppPopupMenuItem(
                  value: 'edit',
                  label: 'Edit',
                  icon: Icons.edit_outlined,
                ),
                AppPopupMenuItem(
                  value: 'delete',
                  label: 'Delete',
                  icon: Icons.delete_outline_rounded,
                  isDestructive: true,
                ),
              ],
              onSelected: (action) async {
                if (action == 'edit') {
                  AddEditSectionDialog.show(
                    context,
                    machineId: machineId,
                    section: section,
                  );
                } else if (action == 'delete') {
                  final confirm = await AppConfirmDialog.show(
                    context: context,
                    title: 'Delete component?',
                    message: 'Are you sure you want to delete component "${section.name}"?',
                    cascadeNotice:
                        'Deleting this component will permanently delete all its logged usage records.',
                    confirmLabel: 'Delete',
                    isDestructive: true,
                  );
                  if (confirm == true) {
                    final ok = await ref
                        .read(sectionsControllerProvider.notifier)
                        .deleteSection(section.id, section.machineId);
                    if (context.mounted) {
                      if (ok) {
                        context.showSuccessSnackBar('Component deleted');
                      } else {
                        context.showErrorSnackBar('Failed to delete component');
                      }
                    }
                  }
                }
              },
            ),
        ],
      ),
    );
  }
}
