import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/core/errors/app_failure.dart';

void main() {
  group('AppFailure Tests', () {
    test('NetworkFailure has correct defaults', () {
      const failure = NetworkFailure();
      expect(failure.code, 'NETWORK_ERROR');
      expect(failure.message, contains('internet connection'));
    });

    test('AuthenticationFailure preserves custom code and message', () {
      const failure = AuthenticationFailure('Invalid password', '401');
      expect(failure.code, '401');
      expect(failure.message, 'Invalid password');
    });

    test('DatabaseFailure preserves details', () {
      final failure = DatabaseFailure('Record not found', '404', {'table': 'machines'});
      expect(failure.code, '404');
      expect(failure.details, isNotNull);
    });

    test('ValidationFailure default message', () {
      const failure = ValidationFailure();
      expect(failure.code, 'VALIDATION_ERROR');
    });

    test('ExportFailure default message', () {
      const failure = ExportFailure();
      expect(failure.code, 'EXPORT_ERROR');
    });

    test('UpdateFailure default message', () {
      const failure = UpdateFailure();
      expect(failure.code, 'UPDATE_ERROR');
    });

    test('UnknownFailure default message', () {
      const failure = UnknownFailure();
      expect(failure.code, 'UNKNOWN_ERROR');
    });
  });
}
