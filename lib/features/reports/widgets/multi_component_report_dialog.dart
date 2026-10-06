import 'package:flutter/material.dart';

import '../../../models/machine.dart';
import '../../../models/section.dart';
import 'pdf_export_dialog.dart';

/// Legacy multi-component dialog redirecting to the redesigned, large [PdfExportDialog].
class MultiComponentReportDialog extends StatelessWidget {
  final Machine machine;
  final List<Section> selectedSections;
  final Map<String, String> categoryNames; // categoryId -> categoryName

  const MultiComponentReportDialog({
    super.key,
    required this.machine,
    required this.selectedSections,
    required this.categoryNames,
  });

  static Future<void> show(
    BuildContext context, {
    required Machine machine,
    required List<Section> selectedSections,
    required Map<String, String> categoryNames,
  }) {
    return PdfExportDialog.showMulti(
      context,
      machine: machine,
      selectedSections: selectedSections,
      categoryNames: categoryNames,
    );
  }

  @override
  Widget build(BuildContext context) {
    return PdfExportDialog(
      machine: machine,
      sections: selectedSections,
      categoryNames: categoryNames,
    );
  }
}
