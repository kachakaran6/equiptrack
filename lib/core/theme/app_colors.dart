import 'package:flutter/material.dart';

/// Professional, neutral dark & crisp light color architecture for EquipTrack.
/// Built with true neutral charcoal dark surfaces, with royal violet/purple as the unified accent theme.
class AppColors {
  AppColors._();

  // ---------------------------------------------------------------------------
  // ACCENT COLORS (Unified, high-end purple theme)
  // ---------------------------------------------------------------------------
  static const Color primary = Color(0xFF7C3AED); // Vibrant Violet (Light)
  static const Color primaryLight = Color(0xFF8B5CF6); // Crisp Violet Accent (Dark)
  static const Color primaryDark = Color(0xFF6D28D9); // Deep Violet
  static const Color primaryContainerLight = Color(0xFFF3E8FF); // Soft violet tint
  static const Color onPrimaryContainerLight = Color(0xFF5B21B6);
  static const Color primaryContainerDark = Color(0xFF23163B); // Subtle dark purple container
  static const Color onPrimaryContainerDark = Color(0xFFDDD6FE); // Soft pastel violet

  // Backward compatibility alias
  static const Color primaryContainer = Color(0xFFF3E8FF);
  static const Color onPrimaryContainer = Color(0xFF5B21B6);

  // Secondary Accent - Purple / Magenta
  static const Color secondary = Color(0xFF9333EA);
  static const Color secondaryLight = Color(0xFFA855F7);
  static const Color secondaryDark = Color(0xFF7E22CE);
  static const Color secondaryContainerLight = Color(0xFFFAF5FF);
  static const Color onSecondaryContainerLight = Color(0xFF6B21A8);
  static const Color secondaryContainerDark = Color(0xFF2A1542);
  static const Color onSecondaryContainerDark = Color(0xFFE9D5FF);

  // Backward compatibility alias
  static const Color secondaryContainer = Color(0xFFFAF5FF);
  static const Color onSecondaryContainer = Color(0xFF6B21A8);

  // ---------------------------------------------------------------------------
  // LIGHT SURFACES & BACKGROUNDS (Neutral Light Palette)
  // ---------------------------------------------------------------------------
  static const Color backgroundLight = Color(0xFFF8FAFC);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color surfaceContainerLowestLight = Color(0xFFFFFFFF);
  static const Color surfaceContainerLowLight = Color(0xFFF8FAFC);
  static const Color surfaceContainerLight = Color(0xFFF1F5F9);
  static const Color surfaceContainerHighLight = Color(0xFFE2E8F0);
  static const Color cardLight = Color(0xFFFFFFFF);
  static const Color borderLight = Color(0xFFE2E8F0);
  static const Color borderSubtleLight = Color(0xFFF1F5F9);
  static const Color dividerLight = Color(0xFFE2E8F0);

  // ---------------------------------------------------------------------------
  // DARK SURFACES & BACKGROUNDS (True Neutral Charcoal / Near-Black Palette)
  // Non-blue environment with clear neutral tonal elevation hierarchy
  // ---------------------------------------------------------------------------
  static const Color backgroundDark = Color(0xFF0B0D10); // True neutral near-black base
  static const Color surfaceDark = Color(0xFF12161C); // Primary neutral surface
  static const Color surfaceContainerLowestDark = Color(0xFF07080A); // Deepest sunken layer
  static const Color surfaceContainerLowDark = Color(0xFF151A21); // Low neutral container
  static const Color surfaceContainerDark = Color(0xFF181D24); // Elevated neutral surface
  static const Color surfaceContainerHighDark = Color(0xFF1E242D); // High elevated / Modal
  static const Color cardDark = Color(0xFF151A21); // Neutral card surface
  static const Color sheetDark = Color(0xFF14181F); // Neutral modal bottom sheet
  static const Color dialogDark = Color(0xFF181D24); // Neutral dialog background
  static const Color borderDark = Color(0xFF252C36); // Subtle cool neutral border
  static const Color borderSubtleDark = Color(0xFF1A2027); // Hairline border
  static const Color dividerDark = Color(0xFF1E242D); // Neutral divider
  static const Color sheetHandleDark = Color(0xFF5B6470); // Neutral drag handle

  // ---------------------------------------------------------------------------
  // TYPOGRAPHY NEUTRALS
  // ---------------------------------------------------------------------------
  static const Color textPrimaryLight = Color(0xFF0F172A);
  static const Color textSecondaryLight = Color(0xFF475569);
  static const Color textMutedLight = Color(0xFF94A3B8);
  static const Color placeholderLight = Color(0xFF94A3B8);

  static const Color textPrimaryDark = Color(0xFFF4F5F7); // High-contrast neutral white
  static const Color textSecondaryDark = Color(0xFFA5AFBC); // Clean neutral cool gray
  static const Color textMutedDark = Color(0xFF737D89); // Readable muted gray
  static const Color placeholderDark = Color(0xFF687280); // Neutral input placeholder

  // ---------------------------------------------------------------------------
  // STATUS & FEEDBACK COLORS
  // ---------------------------------------------------------------------------
  static const Color success = Color(0xFF10B981); // Emerald Green
  static const Color successLight = Color(0xFF34D399);
  static const Color successContainer = Color(0xFFDCFCE7);
  static const Color onSuccessContainer = Color(0xFF14532D);
  static const Color successContainerDark = Color(0xFF13221C); // Neutral tinted
  static const Color onSuccessContainerDark = Color(0xFF6EE7B7);

  static const Color warning = Color(0xFFF59E0B); // Amber
  static const Color warningLight = Color(0xFFFBBF24);
  static const Color warningContainer = Color(0xFFFEF3C7);
  static const Color onWarningContainer = Color(0xFF78350F);
  static const Color warningContainerDark = Color(0xFF241E12); // Neutral tinted
  static const Color onWarningContainerDark = Color(0xFFFDE68A);

  static const Color error = Color(0xFFEF4444); // Red
  static const Color errorLight = Color(0xFFF87171);
  static const Color errorContainer = Color(0xFFFEE2E2);
  static const Color onErrorContainer = Color(0xFF7F1D1D);
  static const Color errorContainerDark = Color(0xFF271415); // Neutral tinted
  static const Color onErrorContainerDark = Color(0xFFFECACA);

  // ---------------------------------------------------------------------------
  // OPERATIONAL / RUNNING BADGE (Restrained green/emerald indicator)
  // ---------------------------------------------------------------------------
  static const Color runningBadgeBgLight = Color(0xFFECFDF5);
  static const Color runningBadgeTextLight = Color(0xFF059669);
  static const Color runningBadgeBorderLight = Color(0xFFA7F3D0);

  static const Color runningBadgeBgDark = Color(0xFF13221C);
  static const Color runningBadgeTextDark = Color(0xFF34D399);
  static const Color runningBadgeBorderDark = Color(0xFF1E3A2B);

  // Backward compatibility alias
  static const Color runningBadgeBg = Color(0xFF13221C);
  static const Color runningBadgeText = Color(0xFF34D399);
}
