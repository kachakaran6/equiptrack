import 'package:flutter/material.dart';
import '../constants/app_spacing.dart';
import '../theme/app_colors.dart';
import 'app_card.dart';

/// High-performance, hardware-accelerated continuous shimmer effect for skeleton loaders
class AppShimmer extends StatefulWidget {
  final Widget child;
  final Duration duration;

  const AppShimmer({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: 1400),
  });

  @override
  State<AppShimmer> createState() => _AppShimmerState();
}

class _AppShimmerState extends State<AppShimmer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration)
      ..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final baseColor = isDark
        ? const Color(0xFF1B222C)
        : const Color(0xFFE8EEF5);
    final highlightColor = isDark
        ? const Color(0xFF283240)
        : const Color(0xFFF8FAFC);

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (bounds) {
            final double value = _controller.value;
            // Sweep gradient across bounds from left to right
            return LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                baseColor,
                highlightColor,
                baseColor,
              ],
              stops: const [0.0, 0.5, 1.0],
              transform: _SlidingGradientTransform(slidePercent: value),
            ).createShader(bounds);
          },
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

class _SlidingGradientTransform extends GradientTransform {
  final double slidePercent;

  const _SlidingGradientTransform({required this.slidePercent});

  @override
  Matrix4? transform(Rect bounds, {TextDirection? textDirection}) {
    final translation = bounds.width * (slidePercent * 2 - 1);
    return Matrix4.translationValues(translation, 0.0, 0.0);
  }
}

/// Generic skeleton box with customizable dimensions and border radius
class AppSkeletonBox extends StatelessWidget {
  final double? width;
  final double? height;
  final double borderRadius;
  final EdgeInsetsGeometry? margin;

  const AppSkeletonBox({
    super.key,
    this.width,
    this.height,
    this.borderRadius = 8,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = isDark
        ? const Color(0xFF1E2632)
        : const Color(0xFFE2E8F0);

    return Container(
      width: width,
      height: height,
      margin: margin,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
    );
  }
}

/// Text line skeleton with pill ends
class AppSkeletonLine extends StatelessWidget {
  final double width;
  final double height;
  final EdgeInsetsGeometry? margin;

  const AppSkeletonLine({
    super.key,
    required this.width,
    this.height = 12,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    return AppSkeletonBox(
      width: width,
      height: height,
      borderRadius: height / 2,
      margin: margin,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON COMPONENT PRESETS
// ─────────────────────────────────────────────────────────────────────────────

/// Full Machine List Screen Skeleton (matches _MachineRowCard layout)
class MachineListSkeleton extends StatelessWidget {
  final int itemCount;

  const MachineListSkeleton({super.key, this.itemCount = 5});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return AppShimmer(
      child: ListView.separated(
        padding: AppSpacing.screenPadding,
        physics: const NeverScrollableScrollPhysics(),
        shrinkWrap: true,
        itemCount: itemCount + 1,
        separatorBuilder: (_, index) =>
            index == 0 ? const SizedBox.shrink() : const SizedBox(height: 8),
        itemBuilder: (context, index) {
          if (index == 0) {
            // Header skeleton
            return Padding(
              padding: const EdgeInsets.fromLTRB(4, 8, 4, 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  AppSkeletonLine(width: 90, height: 16),
                  AppSkeletonBox(width: 75, height: 20, borderRadius: 10),
                ],
              ),
            );
          }

          // Row card skeleton
          return AppCard(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            backgroundColor: isDark ? AppColors.cardDark : AppColors.cardLight,
            child: Row(
              children: [
                const AppSkeletonBox(
                  width: 40,
                  height: 40,
                  borderRadius: AppSpacing.radiusMd,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AppSkeletonLine(
                        width: index % 2 == 0 ? 140 : 175,
                        height: 14,
                      ),
                      const SizedBox(height: 6),
                      AppSkeletonLine(
                        width: index % 2 == 0 ? 95 : 120,
                        height: 10,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                const AppSkeletonBox(width: 20, height: 20, borderRadius: 10),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// Machine Header Skeleton for MachineDetailScreen top banner
class MachineHeaderSkeleton extends StatelessWidget {
  const MachineHeaderSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return AppShimmer(
      child: AppCard(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        backgroundColor: isDark
            ? AppColors.surfaceContainerLowDark
            : AppColors.surfaceContainerLowLight,
        child: Row(
          children: [
            const AppSkeletonBox(
              width: 38,
              height: 38,
              borderRadius: AppSpacing.radiusMd,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  AppSkeletonLine(width: 150, height: 16),
                  SizedBox(height: 6),
                  AppSkeletonLine(width: 220, height: 11),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Section / Component List Skeleton for MachineDetailScreen
class SectionListSkeleton extends StatelessWidget {
  final int itemCount;

  const SectionListSkeleton({super.key, this.itemCount = 4});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return AppShimmer(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.only(top: 4, bottom: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    AppSkeletonLine(width: 100, height: 15),
                    SizedBox(height: 4),
                    AppSkeletonLine(width: 210, height: 10),
                  ],
                ),
                const AppSkeletonBox(width: 80, height: 20, borderRadius: 10),
              ],
            ),
          ),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: itemCount,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              return AppCard(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                backgroundColor: isDark ? AppColors.cardDark : AppColors.cardLight,
                child: Row(
                  children: [
                    const AppSkeletonBox(
                      width: 36,
                      height: 36,
                      borderRadius: AppSpacing.radiusMd,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          AppSkeletonLine(
                            width: index % 2 == 0 ? 120 : 155,
                            height: 14,
                          ),
                          const SizedBox(height: 6),
                          AppSkeletonLine(
                            width: index % 2 == 0 ? 80 : 100,
                            height: 10,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    const AppSkeletonBox(width: 20, height: 20, borderRadius: 10),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

/// Usage Records Table Skeleton for SectionUsageScreen
class UsageTableSkeleton extends StatelessWidget {
  final int rowCount;

  const UsageTableSkeleton({super.key, this.rowCount = 5});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return AppShimmer(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Section Header Skeleton
          Padding(
            padding: const EdgeInsets.only(top: 2, bottom: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    AppSkeletonLine(width: 120, height: 16),
                    SizedBox(height: 4),
                    AppSkeletonLine(width: 200, height: 11),
                  ],
                ),
                const AppSkeletonBox(width: 70, height: 28, borderRadius: 8),
              ],
            ),
          ),

          // Table Card Skeleton
          AppCard(
            padding: EdgeInsets.zero,
            backgroundColor: isDark ? AppColors.cardDark : AppColors.cardLight,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Table Header Row
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.surfaceContainerDark
                        : AppColors.surfaceContainerLight,
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(AppSpacing.radiusLg),
                      topRight: Radius.circular(AppSpacing.radiusLg),
                    ),
                  ),
                  child: Row(
                    children: const [
                      Expanded(flex: 3, child: AppSkeletonLine(width: 60, height: 12)),
                      Expanded(flex: 2, child: AppSkeletonLine(width: 45, height: 12)),
                      Expanded(
                        flex: 2,
                        child: Align(
                          alignment: Alignment.centerRight,
                          child: AppSkeletonLine(width: 55, height: 12),
                        ),
                      ),
                      SizedBox(width: 36),
                    ],
                  ),
                ),

                // Data Rows
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: rowCount,
                  separatorBuilder: (_, _) => Divider(
                    height: 1,
                    thickness: 1,
                    color: (isDark ? AppColors.borderDark : AppColors.borderLight)
                        .withAlpha(100),
                  ),
                  itemBuilder: (context, index) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      child: Row(
                        children: [
                          Expanded(
                            flex: 3,
                            child: AppSkeletonLine(
                              width: index == 0 ? 130 : (index % 2 == 0 ? 110 : 145),
                              height: 13,
                            ),
                          ),
                          const Expanded(
                            flex: 2,
                            child: AppSkeletonLine(width: 75, height: 12),
                          ),
                          Expanded(
                            flex: 2,
                            child: Align(
                              alignment: Alignment.centerRight,
                              child: index == rowCount - 1
                                  ? const AppSkeletonBox(
                                      width: 60,
                                      height: 18,
                                      borderRadius: 4,
                                    )
                                  : const AppSkeletonLine(width: 25, height: 14),
                            ),
                          ),
                          const SizedBox(width: 10),
                          const AppSkeletonBox(width: 20, height: 16, borderRadius: 4),
                        ],
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
