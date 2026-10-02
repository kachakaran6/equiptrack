import 'package:flutter_riverpod/flutter_riverpod.dart';
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
  }) async {
    state = const AsyncValue.loading();
    try {
      final service = ref.read(reportServiceProvider);
      await service.sharePdf(
        machine: machine,
        section: section,
        records: records,
      );
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
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
    }
  }

  Future<void> printOrPreviewPdf({
    required Machine machine,
    required Section section,
    required List<UsageRecord> records,
  }) async {
    state = const AsyncValue.loading();
    try {
      final service = ref.read(reportServiceProvider);
      await service.printOrPreviewPdf(
        machine: machine,
        section: section,
        records: records,
      );
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

final reportsControllerProvider =
    AsyncNotifierProvider<ReportsController, void>(ReportsController.new);
