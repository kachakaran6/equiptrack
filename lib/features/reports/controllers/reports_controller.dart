import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/analytics/analytics_event.dart';
import '../../../core/analytics/analytics_service.dart';
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
    String? dateRangeText,
  }) async {
    state = const AsyncValue.loading();
    final stopwatch = Stopwatch()..start();
    await AnalyticsService.instance.track(
      AnalyticsEvent.reportExportStarted,
      {
        'format': 'pdf',
        'export_type': 'single_section',
        'machine_id': machine.id,
        'section_id': section.id,
        'records_count': records.length,
      },
    );

    try {
      final service = ref.read(reportServiceProvider);
      await service.sharePdf(
        machine: machine,
        section: section,
        records: records,
        categoryName: categoryName,
        dateRangeText: dateRangeText,
      );
      state = const AsyncValue.data(null);

      await AnalyticsService.instance.track(
        AnalyticsEvent.reportExportCompleted,
        {
          'format': 'pdf',
          'export_type': 'single_section',
          'machine_id': machine.id,
          'section_id': section.id,
          'records_count': records.length,
          'duration_ms': stopwatch.elapsedMilliseconds,
        },
      );
    } catch (e, st) {
      await AnalyticsService.instance.track(
        AnalyticsEvent.reportExportFailed,
        {
          'format': 'pdf',
          'export_type': 'single_section',
          'machine_id': machine.id,
          'duration_ms': stopwatch.elapsedMilliseconds,
        },
      );
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> shareMultiComponentPdf({
    required Machine machine,
    required List<ComponentReportData> components,
    String? dateRangeText,
  }) async {
    state = const AsyncValue.loading();
    final stopwatch = Stopwatch()..start();
    await AnalyticsService.instance.track(
      AnalyticsEvent.reportExportStarted,
      {
        'format': 'pdf',
        'export_type': 'multi_component',
        'machine_id': machine.id,
        'components_count': components.length,
      },
    );

    try {
      final service = ref.read(reportServiceProvider);
      await service.shareMultiComponentPdf(
        machine: machine,
        components: components,
        dateRangeText: dateRangeText,
      );
      state = const AsyncValue.data(null);

      await AnalyticsService.instance.track(
        AnalyticsEvent.reportExportCompleted,
        {
          'format': 'pdf',
          'export_type': 'multi_component',
          'machine_id': machine.id,
          'components_count': components.length,
          'duration_ms': stopwatch.elapsedMilliseconds,
        },
      );
    } catch (e, st) {
      await AnalyticsService.instance.track(
        AnalyticsEvent.reportExportFailed,
        {
          'format': 'pdf',
          'export_type': 'multi_component',
          'machine_id': machine.id,
          'duration_ms': stopwatch.elapsedMilliseconds,
        },
      );
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
    final stopwatch = Stopwatch()..start();
    await AnalyticsService.instance.track(
      AnalyticsEvent.reportExportStarted,
      {
        'format': 'excel',
        'machine_id': machine.id,
        'section_id': section.id,
        'records_count': records.length,
      },
    );

    try {
      final service = ref.read(reportServiceProvider);
      await service.shareExcel(
        machine: machine,
        section: section,
        records: records,
      );
      state = const AsyncValue.data(null);

      await AnalyticsService.instance.track(
        AnalyticsEvent.reportExportCompleted,
        {
          'format': 'excel',
          'machine_id': machine.id,
          'section_id': section.id,
          'records_count': records.length,
          'duration_ms': stopwatch.elapsedMilliseconds,
        },
      );
    } catch (e, st) {
      await AnalyticsService.instance.track(
        AnalyticsEvent.reportExportFailed,
        {
          'format': 'excel',
          'machine_id': machine.id,
          'duration_ms': stopwatch.elapsedMilliseconds,
        },
      );
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> printOrPreviewPdf({
    required Machine machine,
    required Section section,
    required List<UsageRecord> records,
    String? categoryName,
    String? dateRangeText,
  }) async {
    state = const AsyncValue.loading();
    try {
      final service = ref.read(reportServiceProvider);
      await service.printOrPreviewPdf(
        machine: machine,
        section: section,
        records: records,
        categoryName: categoryName,
        dateRangeText: dateRangeText,
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
    String? dateRangeText,
  }) async {
    state = const AsyncValue.loading();
    try {
      final service = ref.read(reportServiceProvider);
      await service.printOrPreviewMultiComponentPdf(
        machine: machine,
        components: components,
        dateRangeText: dateRangeText,
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
