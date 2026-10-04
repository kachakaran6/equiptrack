/// Route constants and names for GoRouter
class AppRoutes {
  AppRoutes._();

  static const String login = '/login';
  
  // Equipment Tracking tab routes
  static const String machines = '/machines';
  static const String machineDetails = '/machines/:machineId';
  static const String sectionUsage = '/machines/:machineId/sections/:sectionId';

  // Inventory Management tab routes
  static const String inventory = '/inventory';
  static const String inventoryAddProduct = '/inventory/products/new';
  static const String inventoryEditProduct = '/inventory/products/:productId/edit';
  static const String inventoryAddSubProductRoute = '/inventory/products/:productId/sub-products/new';
  static const String inventorySubProductDetailRoute = '/inventory/sub-products/:subProductId';
  static const String inventoryEditSubProductRoute = '/inventory/sub-products/:subProductId/edit';
  static const String inventoryReports = '/inventory/reports';

  // Helper route generators
  static String machineDetailsPath(String machineId) => '/machines/$machineId';
  static String sectionUsagePath(String machineId, String sectionId) =>
      '/machines/$machineId/sections/$sectionId';

  static String inventoryEditProductPath(String productId) =>
      '/inventory/products/$productId/edit';
  static String inventoryAddSubProduct(String productId) =>
      '/inventory/products/$productId/sub-products/new';
  static String inventorySubProductDetail(String subProductId) =>
      '/inventory/sub-products/$subProductId';
  static String inventoryEditSubProduct(String subProductId) =>
      '/inventory/sub-products/$subProductId/edit';
}
