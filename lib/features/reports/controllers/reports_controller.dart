import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/pdf_service.dart';
import '../../../core/services/report_service.dart';
import '../../../models/machine.dart';
import '../../../models/section.dart';
import '../../../models/usage_record.dart';

final reportServiceProvider = Provider<ReportService>((ref) {
  return const ReportService();
});

class ReportsController extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<void> sharePdf({
    required Machine machine,
    required Section section,
    required List<UsageRecord> records,
    String? categoryName,
  }) async {
    state = const AsyncValue.loading();
    try {
      final service = ref.read(reportServiceProvider);
      await service.sharePdf(
        machine: machine,
        section: section,
        records: records,
        categoryName: categoryName,
      );
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> shareMultiComponentPdf({
    required Machine machine,
    required List<ComponentReportData> components,
  }) async {
    state = const AsyncValue.loading();
    try {
      final service = ref.read(reportServiceProvider);
      await service.shareMultiComponentPdf(
        machine: machine,
        components: components,
      );
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> shareExcel({
    required Machine machine,
    required Section section,
    required List<UsageRecord> records,
  }) async {
    state = const AsyncValue.loading();
    try {
      final service = ref.read(reportServiceProvider);
      await service.shareExcel(
        machine: machine,
        section: section,
        records: records,
      );
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> printOrPreviewPdf({
    required Machine machine,
    required Section section,
    required List<UsageRecord> records,
    String? categoryName,
  }) async {
    state = const AsyncValue.loading();
    try {
      final service = ref.read(reportServiceProvider);
      await service.printOrPreviewPdf(
        machine: machine,
        section: section,
        records: records,
        categoryName: categoryName,
      );
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> printOrPreviewMultiComponentPdf({
    required Machine machine,
    required List<ComponentReportData> components,
  }) async {
    state = const AsyncValue.loading();
    try {
      final service = ref.read(reportServiceProvider);
      await service.printOrPreviewMultiComponentPdf(
        machine: machine,
        components: components,
      );
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }
}

final reportsControllerProvider =
    AsyncNotifierProvider<ReportsController, void>(ReportsController.new);
