import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/features/inventory/controllers/inventory_controller.dart';
import 'package:machine_usage_app/features/inventory/screens/inventory_home_screen.dart';
import 'package:machine_usage_app/models/inventory_models.dart';

class _FakeInventoryProductsNotifier extends InventoryProductsNotifier {
  final List<InventoryProduct> _initialProducts;
  _FakeInventoryProductsNotifier(this._initialProducts);

  @override
  Future<List<InventoryProduct>> build() async {
    return _initialProducts;
  }
}

void main() {
  testWidgets('InventoryHomeScreen accordion expands, collapses, and toggles reliably', (tester) async {
    final now = DateTime(2026, 10, 5);
    final testProducts = [
      InventoryProduct(
        id: 'p-1',
        userId: 'u-1',
        name: 'BEARING',
        subProducts: [
          InventorySubProduct(
            id: 'sub-1',
            productId: 'p-1',
            userId: 'u-1',
            currentStock: 1,
            totalIn: 5,
            totalOut: 4,
            values: {'Make': 'zvL', 'Number': '23260k'},
            createdAt: now,
            updatedAt: now,
          ),
        ],
        createdAt: now,
        updatedAt: now,
      ),
      InventoryProduct(
        id: 'p-2',
        userId: 'u-1',
        name: 'BELT',
        subProducts: [
          InventorySubProduct(
            id: 'sub-2',
            productId: 'p-2',
            userId: 'u-1',
            currentStock: 3,
            totalIn: 10,
            totalOut: 7,
            values: {'Make': 'PIX', 'Number': 'SPC-3550'},
            createdAt: now,
            updatedAt: now,
          ),
        ],
        createdAt: now,
        updatedAt: now,
      ),
    ];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          inventoryProductsProvider.overrideWith(
            () => _FakeInventoryProductsNotifier(testProducts),
          ),
        ],
        child: const MaterialApp(
          home: InventoryHomeScreen(),
        ),
      ),
    );

    // Initial render
    await tester.pumpAndSettle();

    // Verify both headers are visible
    expect(find.text('BEARING'), findsOneWidget);
    expect(find.text('BELT'), findsOneWidget);

    // Initially, product 1 (BEARING) is expanded, so its details and View Report are visible
    expect(find.textContaining('23260k', findRichText: true), findsOneWidget);
    expect(find.text('View Report'), findsOneWidget);
    // Product 2 (BELT) is collapsed, so its sub-product details are NOT visible
    expect(find.textContaining('SPC-3550', findRichText: true), findsNothing);

    // TAP BEARING header to collapse it
    await tester.tap(find.text('BEARING'));
    await tester.pumpAndSettle();

    // Now BEARING should be COLLAPSED! Sub-product details and View Report should no longer be visible!
    expect(find.textContaining('23260k', findRichText: true), findsNothing);
    expect(find.text('View Report'), findsNothing);

    // TAP BELT header to expand it
    await tester.tap(find.text('BELT'));
    await tester.pumpAndSettle();

    // Now BELT should be EXPANDED!
    expect(find.textContaining('SPC-3550', findRichText: true), findsOneWidget);
    expect(find.text('View Report'), findsOneWidget);
    // BEARING is still collapsed
    expect(find.textContaining('23260k', findRichText: true), findsNothing);

    // TAP BEARING header again to re-expand it
    await tester.tap(find.text('BEARING'));
    await tester.pumpAndSettle();

    // Both BEARING and BELT should now be expanded simultaneously
    expect(find.textContaining('23260k', findRichText: true), findsOneWidget);
    expect(find.textContaining('SPC-3550', findRichText: true), findsOneWidget);
    expect(find.text('View Report'), findsNWidgets(2));
  });
}
