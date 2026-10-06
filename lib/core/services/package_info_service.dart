import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../constants/app_constants.dart';

/// Provides dynamic package information queried directly from the host platform.
final packageInfoProvider = FutureProvider<PackageInfo>((ref) async {
  try {
    return await PackageInfo.fromPlatform();
  } catch (e) {
    return PackageInfo(
      appName: AppConstants.appName,
      packageName: 'com.equiptrack.app',
      version: '1.0.0',
      buildNumber: '1',
      buildSignature: '',
      installerStore: null,
    );
  }
});

/// Formatted application title and version (e.g., "EquipTrack v1.0.0+12")
final appVersionDisplayProvider = Provider<String>((ref) {
  final packageInfoAsync = ref.watch(packageInfoProvider);
  return packageInfoAsync.when(
    data: (info) {
      final appName = info.appName.isNotEmpty ? info.appName : AppConstants.appName;
      final version = info.version.isNotEmpty ? info.version : '1.0.0';
      final build = info.buildNumber.isNotEmpty ? '+${info.buildNumber}' : '';
      return '$appName v$version$build';
    },
    loading: () => '${AppConstants.appName}...',
    error: (err, stack) => '${AppConstants.appName} v1.0.0',
  );
});

/// Human-readable build mode description
final appBuildDescriptionProvider = Provider<String>((ref) {
  if (kReleaseMode) {
    return 'Production release build';
  } else if (kProfileMode) {
    return 'Profile build';
  } else {
    return 'Debug development build';
  }
});
