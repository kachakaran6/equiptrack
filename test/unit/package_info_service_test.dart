import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:machine_usage_app/core/services/package_info_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    PackageInfo.setMockInitialValues(
      appName: 'EquipTrack',
      packageName: 'com.equiptrack.app',
      version: '1.0.0',
      buildNumber: '12',
      buildSignature: 'mock-sig',
      installerStore: 'com.android.vending',
    );
  });

  group('PackageInfoService & Providers', () {
    test('packageInfoProvider returns mocked PackageInfo', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final packageInfo = await container.read(packageInfoProvider.future);
      expect(packageInfo.appName, 'EquipTrack');
      expect(packageInfo.packageName, 'com.equiptrack.app');
      expect(packageInfo.version, '1.0.0');
      expect(packageInfo.buildNumber, '12');
    });

    test('appVersionDisplayProvider formats version and build number accurately', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      // Wait for future to resolve
      await container.read(packageInfoProvider.future);
      final versionDisplay = container.read(appVersionDisplayProvider);

      expect(versionDisplay, 'EquipTrack v1.0.0+12');
    });

    test('appBuildDescriptionProvider returns valid build mode description', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final description = container.read(appBuildDescriptionProvider);
      expect(description, isNotEmpty);
      expect(
        description,
        anyOf([
          'Production release build',
          'Profile build',
          'Debug development build',
        ]),
      );
    });
  });
}
