import 'dart:async';
import 'dart:io';
import 'dart:ui';

// import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:arryt/bloc/block_imports.dart';
import 'package:arryt/firebase_options.dart';
import 'package:arryt/location_service.dart';
import 'package:arryt/router.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:get_it/get_it.dart';
// import 'package:geolocator/geolocator.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:arryt/helpers/objectbox.dart';
import 'package:path_provider/path_provider.dart';
import 'app.dart';
import 'package:arryt/helpers/hive_helper.dart';

final getIt = GetIt.instance;

Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  print("Handling a background message: ${message.messageId}");
}

late ObjectBox objectBox;

/// Create notification channel with custom sound for Android
Future<void> _createNotificationChannel() async {
  if (Platform.isAndroid) {
    final flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();
    const androidChannel = AndroidNotificationChannel(
      'channel_id', // Must match the channel_id used in initial.dart
      'Order Notifications',
      description: 'Notifications for new orders',
      importance: Importance.max,
      playSound: true,
      sound: RawResourceAndroidNotificationSound('notify'),
    );

    await flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(androidChannel);
  }
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  // Create notification channel with custom sound
  await _createNotificationChannel();

  await HiveHelper.initHive();

  final docsDir = await getApplicationDocumentsDirectory();
  objectBox = await ObjectBox.create(directory: docsDir.path);

  getIt.registerSingleton<AppRouter>(AppRouter());
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  await initHiveForFlutter();
  HydratedBloc.storage = await HydratedStorage.build(
    storageDirectory: kIsWeb
        ? HydratedStorage.webStorageDirectory
        : await getApplicationDocumentsDirectory(),
  );

  if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
    // await InAppWebViewController.setWebContentsDebuggingEnabled(true);
  }

  // Ensure ObjectBox is initialized before starting the location service
  await objectBox.initCompleter.future;
  await LocationService.initializeService();

  runApp(
    const ProviderScope(child: App()),
  );
}
