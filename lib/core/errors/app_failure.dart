/// Base class for all domain and operational failures in the app.
abstract class AppFailure implements Exception {
  final String message;
  final String? code;
  final dynamic details;

  const AppFailure(this.message, {this.code, this.details});

  @override
  String toString() => 'AppFailure($code: $message)';
}

/// Network/Connectivity failure
class NetworkFailure extends AppFailure {
  const NetworkFailure([
    super.message = 'Unable to connect to the server. Please check your internet connection and try again.',
    String? code,
    dynamic details,
  ]) : super(code: code ?? 'NETWORK_ERROR', details: details);
}

/// Authentication/Authorization failure
class AuthenticationFailure extends AppFailure {
  const AuthenticationFailure([
    super.message = 'Authentication failed. Please check your credentials.',
    String? code,
    dynamic details,
  ]) : super(code: code ?? 'AUTH_ERROR', details: details);
}

/// Database / API CRUD failure
class DatabaseFailure extends AppFailure {
  const DatabaseFailure([
    super.message = 'An error occurred while accessing the database. Please try again.',
    String? code,
    dynamic details,
  ]) : super(code: code ?? 'DB_ERROR', details: details);
}

/// Form / Input Validation failure
class ValidationFailure extends AppFailure {
  const ValidationFailure([
    super.message = 'Please check the entered values and correct any errors.',
    String? code,
    dynamic details,
  ]) : super(code: code ?? 'VALIDATION_ERROR', details: details);
}

/// PDF / Excel generation or sharing failure
class ExportFailure extends AppFailure {
  const ExportFailure([
    super.message = 'Failed to generate or export the report file. Please try again.',
    String? code,
    dynamic details,
  ]) : super(code: code ?? 'EXPORT_ERROR', details: details);
}

/// In-App update check/download failure
class UpdateFailure extends AppFailure {
  const UpdateFailure([
    super.message = 'Failed to check or process app update with Google Play.',
    String? code,
    dynamic details,
  ]) : super(code: code ?? 'UPDATE_ERROR', details: details);
}

/// Catch-all fallback failure
class UnknownFailure extends AppFailure {
  const UnknownFailure([
    super.message = 'An unexpected error occurred. Please try again.',
    String? code,
    dynamic details,
  ]) : super(code: code ?? 'UNKNOWN_ERROR', details: details);
}
