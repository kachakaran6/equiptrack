import 'package:flutter/material.dart';

/// Centralized Spacing and Radius design tokens for EquipTrack
class AppSpacing {
  AppSpacing._();

  // Spacing Scale (4, 8, 12, 16, 20, 24, 32, 48)
  static const double xxs = 4.0;
  static const double xs = 6.0;
  static const double sm = 8.0;
  static const double md = 12.0;
  static const double lg = 16.0;
  static const double xl = 20.0;
  static const double xxl = 24.0;
  static const double xxxl = 32.0;
  static const double huge = 48.0;

  // Page Margins & Padding
  static const EdgeInsets pagePadding = EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0);
  static const EdgeInsets screenPadding = EdgeInsets.fromLTRB(16.0, 12.0, 16.0, 88.0);
  static const EdgeInsets formPadding = EdgeInsets.all(20.0);
  static const EdgeInsets cardPadding = EdgeInsets.symmetric(horizontal: 14.0, vertical: 12.0);
  static const EdgeInsets compactCardPadding = EdgeInsets.symmetric(horizontal: 12.0, vertical: 10.0);

  // Border Radius Scale (Controlled, non-pill radius system)
  static const double radiusXs = 6.0;
  static const double radiusSm = 8.0;
  static const double radiusMd = 10.0;
  static const double radiusLg = 12.0;
  static const double radiusXl = 16.0;
  static const double radiusXxl = 20.0;

  static final BorderRadius borderRadiusXs = BorderRadius.circular(radiusXs);
  static final BorderRadius borderRadiusSm = BorderRadius.circular(radiusSm);
  static final BorderRadius borderRadiusMd = BorderRadius.circular(radiusMd);
  static final BorderRadius borderRadiusLg = BorderRadius.circular(radiusLg);
  static final BorderRadius borderRadiusXl = BorderRadius.circular(radiusXl);
  static final BorderRadius borderRadiusXxl = BorderRadius.circular(radiusXxl);

  // Sheet / Modal Radius
  static const BorderRadius sheetRadius = BorderRadius.vertical(top: Radius.circular(radiusXxl));
  static const BorderRadius dialogRadius = BorderRadius.all(Radius.circular(radiusXl));
}
