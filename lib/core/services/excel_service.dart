import 'dart:io';
import 'package:excel/excel.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../models/calculated_usage_row.dart';
import '../../models/machine.dart';
import '../../models/section.dart';
import '../constants/app_constants.dart';
import '../extensions/date_extensions.dart';
import '../utils/app_logger.dart';

class ExcelService {
  const ExcelService();

  /// Generates an Excel (.xlsx) file bytes for the section usage history.
  List<int> generateUsageReportExcel({
    required Machine machine,
    required Section section,
    required List<CalculatedUsageRow> rows,
    DateTime? generatedAt,
  }) {
    final excel = Excel.createExcel();
    const sheetName = 'Usage Report';
    excel.rename('Sheet1', sheetName);
    final sheet = excel[sheetName];

    final timestamp = generatedAt ?? DateTime.now();

    // 1. Report Title & Metadata
    sheet.cell(CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: 0)).value =
        TextCellValue('MACHINE USAGE REPORT');
    sheet.cell(CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: 1)).value =
        TextCellValue('Machine: ${machine.name}');
    sheet.cell(CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: 2)).value =
        TextCellValue('Section / Component: ${section.name}');
    sheet.cell(CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: 3)).value =
        TextCellValue('Generated: ${timestamp.toReadableDateTime()}');

    // 2. Table Headers (Row 5)
    final headers = ['Name', 'Date', 'Usage Days'];
    for (var col = 0; col < headers.length; col++) {
      final cell = sheet.cell(
        CellIndex.indexByColumnRow(columnIndex: col, rowIndex: 5),
      );
      cell.value = TextCellValue(headers[col]);
      cell.cellStyle = CellStyle(
        bold: true,
        fontColorHex: ExcelColor.fromHexString('#FFFFFF'),
        backgroundColorHex: ExcelColor.fromHexString('#1E3A8A'),
        horizontalAlign: col == 2 ? HorizontalAlign.Right : HorizontalAlign.Left,
      );
    }

    // 3. Table Rows
    var startRow = 6;
    for (final row in rows) {
      // Column 0: Name
      final nameCell = sheet.cell(
        CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: startRow),
      );
      nameCell.value = TextCellValue(row.name);

      // Column 1: Date
      final dateCell = sheet.cell(
        CellIndex.indexByColumnRow(columnIndex: 1, rowIndex: startRow),
      );
      dateCell.value = TextCellValue(row.formattedDate);
      dateCell.cellStyle = CellStyle(
        horizontalAlign: HorizontalAlign.Center,
      );

      // Column 2: Usage Days (numeric if integer, text if 'Running')
      final usageCell = sheet.cell(
        CellIndex.indexByColumnRow(columnIndex: 2, rowIndex: startRow),
      );
      if (row.isRunning) {
        usageCell.value = TextCellValue(AppConstants.runningText);
        usageCell.cellStyle = CellStyle(
          bold: true,
          fontColorHex: ExcelColor.fromHexString('#0369A1'),
          backgroundColorHex: ExcelColor.fromHexString('#E0F2FE'),
          horizontalAlign: HorizontalAlign.Right,
        );
      } else {
        usageCell.value = IntCellValue(row.usageDays ?? 0);
        usageCell.cellStyle = CellStyle(
          horizontalAlign: HorizontalAlign.Right,
        );
      }

      startRow++;
    }

    // Column widths
    sheet.setColumnWidth(0, 30.0);
    sheet.setColumnWidth(1, 18.0);
    sheet.setColumnWidth(2, 18.0);

    return excel.encode()!;
  }

  /// Share or open the generated Excel file
  Future<void> shareExcel({
    required Machine machine,
    required Section section,
    required List<CalculatedUsageRow> rows,
  }) async {
    try {
      final bytes = generateUsageReportExcel(
        machine: machine,
        section: section,
        rows: rows,
      );

      final tempDir = await getTemporaryDirectory();
      final sanitizedMachine = machine.name.replaceAll(RegExp(r'[^\w\s]+'), '_');
      final sanitizedSection = section.name.replaceAll(RegExp(r'[^\w\s]+'), '_');
      final fileName = 'Report_${sanitizedMachine}_${sanitizedSection}_${DateTime.now().toFileTimestamp()}.xlsx';
      final file = File('${tempDir.path}/$fileName');
      await file.writeAsBytes(bytes, flush: true);

      await SharePlus.instance.share(
        ShareParams(
          text: 'Excel Usage Report for ${machine.name} - ${section.name}',
          subject: 'Machine Usage Report: ${machine.name}',
          files: [XFile(file.path)],
        ),
      );
    } catch (e, st) {
      AppLogger.error('Failed to share Excel file', e, st);
      rethrow;
    }
  }
}
