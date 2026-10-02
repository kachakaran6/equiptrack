/// Route constants and names for GoRouter
class AppRoutes {
  AppRoutes._();

  static const String login = '/login';
  static const String machines = '/machines';
  static const String machineDetails = '/machines/:machineId';
  static const String sectionUsage = '/machines/:machineId/sections/:sectionId';

  // Helper route generators
  static String machineDetailsPath(String machineId) => '/machines/$machineId';
  static String sectionUsagePath(String machineId, String sectionId) =>
      '/machines/$machineId/sections/$sectionId';
}
