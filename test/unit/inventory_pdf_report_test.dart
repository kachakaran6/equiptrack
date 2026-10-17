import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:machine_usage_app/core/errors/app_failure.dart';
import 'package:machine_usage_app/core/services/pdf_service.dart';
import 'package:machine_usage_app/models/inventory_models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late PdfService pdfService;

  setUp(() {
    pdfService = const PdfService();
  });

  group('InventoryStockReportPdf Tests', () {
    test('PdfService throws ValidationFailure when transactions list is empty', () async {
      expect(
        () => pdfService.generateInventoryStockReportPdf(
          productName: 'Raw Cotton',
          transactions: const [],
        ),
        throwsA(isA<ValidationFailure>()),
      );
    });

    test('PdfService generates valid PDF bytes for a single sub-product with 4-column table', () async {
      final txs = [
        InventoryTransaction(
          id: 'tx-1',
          subProductId: 'sub-1',
          productId: 'p-1',
          productName: 'Cotton Yarn',
          userId: 'u-1',
          type: 'IN',
          quantity: 50,
          date: '2026-10-15',
          remarks: 'Received fresh consignment from mill',
          subProductValues: {'Grade': 'A', 'Count': '30s'},
          createdAt: DateTime(2026, 10, 15, 10, 0),
          updatedAt: DateTime(2026, 10, 15, 10, 0),
        ),
        InventoryTransaction(
          id: 'tx-2',
          subProductId: 'sub-1',
          productId: 'p-1',
          productName: 'Cotton Yarn',
          userId: 'u-1',
          type: 'OUT',
          quantity: 20,
          date: '2026-10-16',
          remarks: 'Issued to weaving unit',
          subProductValues: {'Grade': 'A', 'Count': '30s'},
          createdAt: DateTime(2026, 10, 16, 14, 0),
          updatedAt: DateTime(2026, 10, 16, 14, 0),
        ),
      ];

      final pdfBytes = await pdfService.generateInventoryStockReportPdf(
        productName: 'Cotton Yarn',
        subProductSummary: 'Grade: A | Count: 30s',
        transactions: txs,
        filterType: 'ALL',
      );

      expect(pdfBytes, isNotEmpty);
      // Valid PDF begins with %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
      final header = ascii.decode(pdfBytes.take(5).toList());
      expect(header, '%PDF-');
    });

    test('PdfService groups multiple sub-products onto separate pages with 4-column structure', () async {
      final txs = [
        // Sub-product 1: Grade A
        InventoryTransaction(
          id: 'tx-1',
          subProductId: 'sub-1',
          productId: 'p-1',
          productName: 'Cotton Yarn',
          userId: 'u-1',
          type: 'IN',
          quantity: 100,
          date: '2026-10-10',
          remarks: 'Batch 101 arrival',
          subProductValues: {'Grade': 'A', 'Count': '30s'},
          createdAt: DateTime(2026, 10, 10, 9, 0),
          updatedAt: DateTime(2026, 10, 10, 9, 0),
        ),
        InventoryTransaction(
          id: 'tx-2',
          subProductId: 'sub-1',
          productId: 'p-1',
          productName: 'Cotton Yarn',
          userId: 'u-1',
          type: 'OUT',
          quantity: 25,
          date: '2026-10-11',
          remarks: 'Sample batch issued',
          subProductValues: {'Grade': 'A', 'Count': '30s'},
          createdAt: DateTime(2026, 10, 11, 11, 0),
          updatedAt: DateTime(2026, 10, 11, 11, 0),
        ),
        // Sub-product 2: Grade B
        InventoryTransaction(
          id: 'tx-3',
          subProductId: 'sub-2',
          productId: 'p-1',
          productName: 'Cotton Yarn',
          userId: 'u-1',
          type: 'IN',
          quantity: 40,
          date: '2026-10-12',
          remarks: 'Secondary batch arrival',
          subProductValues: {'Grade': 'B', 'Count': '40s'},
          createdAt: DateTime(2026, 10, 12, 10, 0),
          updatedAt: DateTime(2026, 10, 12, 10, 0),
        ),
      ];

      final pdfBytes = await pdfService.generateInventoryStockReportPdf(
        productName: 'Cotton Yarn',
        transactions: txs,
        subProductNamesMap: {
          'sub-1': 'Grade: A | Count: 30s',
          'sub-2': 'Grade: B | Count: 40s',
        },
        filterType: 'ALL',
      );

      expect(pdfBytes, isNotEmpty);
      final header = ascii.decode(pdfBytes.take(5).toList());
      expect(header, '%PDF-');

      // The generated PDF should contain 2 pages (one per sub-product)
      final pdfContent = latin1.decode(pdfBytes);
      expect(pdfContent, contains('/Count 2'));
    });

    test('PdfService filters out sub-products with no transactions', () async {
      // Only transactions for sub-1 are provided
      final txs = [
        InventoryTransaction(
          id: 'tx-1',
          subProductId: 'sub-1',
          productId: 'p-1',
          productName: 'Steel Rods',
          userId: 'u-1',
          type: 'IN',
          quantity: 80,
          date: '2026-10-14',
          remarks: null,
          subProductValues: {'Diameter': '12mm'},
          createdAt: DateTime(2026, 10, 14, 8, 0),
          updatedAt: DateTime(2026, 10, 14, 8, 0),
        ),
      ];

      final pdfBytes = await pdfService.generateInventoryStockReportPdf(
        productName: 'Steel Rods',
        transactions: txs,
        subProductNamesMap: {
          'sub-1': 'Diameter: 12mm',
          'sub-2': 'Diameter: 16mm', // No transactions for sub-2
        },
      );

      expect(pdfBytes, isNotEmpty);
      final pdfContent = latin1.decode(pdfBytes);
      // Since sub-2 has no transactions, only 1 page is generated
      expect(pdfContent, contains('/Count 1'));
    });
  });
}
