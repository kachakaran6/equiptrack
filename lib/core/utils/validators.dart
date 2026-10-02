/// Reusable form field validators
class FormValidators {
  FormValidators._();

  static String? requiredField(String? value, [String fieldName = 'Field']) {
    if (value == null || value.trim().isEmpty) {
      return '$fieldName is required';
    }
    return null;
  }

  static String? email(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Email is required';
    }
    final emailRegExp = RegExp(
      r'^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$',
    );
    if (!emailRegExp.hasMatch(value.trim())) {
      return 'Please enter a valid email address';
    }
    return null;
  }

  static String? password(String? value) {
    if (value == null || value.isEmpty) {
      return 'Password is required';
    }
    if (value.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return null;
  }

  static String? machineName(String? value) {
    return requiredField(value, 'Machine name');
  }

  static String? sectionName(String? value) {
    return requiredField(value, 'Section name');
  }

  static String? recordName(String? value) {
    return requiredField(value, 'Record name');
  }

  static String? usageDate(DateTime? date) {
    if (date == null) {
      return 'Usage date is required';
    }
    return null;
  }
}
