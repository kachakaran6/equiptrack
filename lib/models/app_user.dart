/// User entity for authenticated session with safe identity properties
class AppUser {
  final String id;
  final String email;
  final String? role;
  final String? status;
  final String? username;
  final String? displayName;

  const AppUser({
    required this.id,
    required this.email,
    this.role,
    this.status,
    this.username,
    this.displayName,
  });

  /// Human-readable username with fallback to email local-part.
  /// Priority: 1. explicit username, 2. email handle
  String get effectiveUsername {
    if (username != null && username!.trim().isNotEmpty) {
      return username!.trim();
    }
    if (email.contains('@')) {
      final local = email.split('@').first.trim();
      if (local.isNotEmpty) return local;
    }
    return email;
  }

  /// Human-readable display name with fallback to effective username.
  /// Priority: 1. explicit displayName, 2. effective username
  String get effectiveDisplayName {
    if (displayName != null && displayName!.trim().isNotEmpty) {
      return displayName!.trim();
    }
    return effectiveUsername;
  }

  /// Minimum safe identity properties for PostHog person identification.
  /// Excludes sensitive tokens, passwords, database IDs, and sensitive PII.
  Map<String, dynamic> toAnalyticsProperties() {
    return {
      'username': effectiveUsername,
      'display_name': effectiveDisplayName,
      'role': role ?? 'user',
      'account_status': status ?? 'active',
    };
  }

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      role: json['role']?.toString() ?? 'user',
      status: (json['status'] ?? json['account_status'])?.toString() ?? 'active',
      username: json['username']?.toString(),
      displayName: (json['display_name'] ?? json['displayName'] ?? json['name'])?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'role': role ?? 'user',
      'status': status ?? 'active',
      if (username != null) 'username': username,
      if (displayName != null) 'display_name': displayName,
    };
  }

  AppUser copyWith({
    String? id,
    String? email,
    String? role,
    String? status,
    String? username,
    String? displayName,
  }) {
    return AppUser(
      id: id ?? this.id,
      email: email ?? this.email,
      role: role ?? this.role,
      status: status ?? this.status,
      username: username ?? this.username,
      displayName: displayName ?? this.displayName,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AppUser &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          email == other.email &&
          role == other.role &&
          status == other.status &&
          username == other.username &&
          displayName == other.displayName;

  @override
  int get hashCode =>
      id.hashCode ^
      email.hashCode ^
      (role?.hashCode ?? 0) ^
      (status?.hashCode ?? 0) ^
      (username?.hashCode ?? 0) ^
      (displayName?.hashCode ?? 0);
}

