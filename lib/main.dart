import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app/app.dart';
import 'app/app_bootstrap.dart';

Future<void> main() async {
  final container = await AppBootstrap.initialize();

  runApp(
    UncontrolledProviderScope(
      container: container,
      child: const MachineUsageApp(),
    ),
  );
}
