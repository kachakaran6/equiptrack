import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/core/services/app_update_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AppUpdateService service;

  setUp(() {
    service = AppUpdateService();
  });

  group('AppUpdateService Tests', () {
    test('Initial session state has prompt shown as false', () {
      expect(service.sessionPromptShown, isFalse);
    });

    test('markPromptShown sets sessionPromptShown to true', () {
      service.markPromptShown();
      expect(service.sessionPromptShown, isTrue);
    });

    test('resetSessionGuard resets prompt state', () {
      service.markPromptShown();
      expect(service.sessionPromptShown, isTrue);

      service.resetSessionGuard();
      expect(service.sessionPromptShown, isFalse);
    });

    test('Non-Android / test environment returns empty status without crashing', () async {
      final status = await service.checkForUpdate();
      expect(status.isUpdateAvailable, isFalse);
      expect(status.isFlexibleAllowed, isFalse);
      expect(status.isImmediateAllowed, isFalse);
    });
  });
}
