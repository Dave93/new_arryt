import 'dart:async';
import 'dart:convert';
import 'dart:ui';

// import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:arryt/bloc/block_imports.dart';
import 'package:arryt/helpers/api_server.dart';
import 'package:arryt/models/user_data.dart';
import 'package:arryt/router.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_background_service_android/flutter_background_service_android.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import 'package:get_it/get_it.dart';
// import 'package:geolocator/geolocator.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:arryt/helpers/objectbox.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:http/http.dart' as http;
import 'app.dart';
import 'notifications/notification_controller.dart';

final getIt = GetIt.instance;

// Future<void> main() async {
//   runApp(
//     App(
//       authenticationRepository: AuthenticationRepository(),
//       userRepository: UserRepository(),
//     ),
//   );
// }

late ObjectBox objectBox;

// @pragma('vm:entry-point')
// Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
//   await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
//   await setupFlutterNotifications();
//   showFlutterNotification(message);
//   // If you're going to use other Firebase services in the background, such as Firestore,
//   // make sure you call `initializeApp` before using other Firebase services.
//   print('Handling a background message ${message.messageId}');
// }

/// Create a [AndroidNotificationChannel] for heads up notifications
late AndroidNotificationChannel channel;

bool isFlutterLocalNotificationsInitialized = false;

// Future<void> setupFlutterNotifications() async {
//   if (isFlutterLocalNotificationsInitialized) {
//     return;
//   }
//   channel = const AndroidNotificationChannel(
//     'high_importance_channel', // id
//     'High Importance Notifications', // title
//     description:
//         'This channel is used for important notifications.', // description
//     importance: Importance.high,
//   );

//   flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();

//   /// Create an Android Notification Channel.
//   ///
//   /// We use this channel in the `AndroidManifest.xml` file to override the
//   /// default FCM channel to enable heads up notifications.
//   await flutterLocalNotificationsPlugin
//       .resolvePlatformSpecificImplementation<
//           AndroidFlutterLocalNotificationsPlugin>()
//       ?.createNotificationChannel(channel);

//   /// Update the iOS foreground notification presentation options to allow
//   /// heads up notifications.
//   await FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
//     alert: true,
//     badge: true,
//     sound: true,
//   );
//   isFlutterLocalNotificationsInitialized = true;
// }

// void showFlutterNotification(RemoteMessage message) {
//   RemoteNotification? notification = message.notification;
//   AndroidNotification? android = message.notification?.android;
//   if (notification != null && android != null && !kIsWeb) {
//     flutterLocalNotificationsPlugin.show(
//       notification.hashCode,
//       notification.title,
//       notification.body,
//       NotificationDetails(
//         android: AndroidNotificationDetails(
//           channel.id,
//           channel.name,
//           channelDescription: channel.description,
//           // TODO add a proper drawable resource to android, for now using
//           //      one that already exists in example app.
//           icon: 'launch_background',
//         ),
//       ),
//     );
//   }
// }

/// Initialize the [FlutterLocalNotificationsPlugin] package.
late FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin;

Future<void> main() async {
  getIt.registerSingleton<AppRouter>(AppRouter());
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.deepPurple,
      statusBarIconBrightness: Brightness.light,
    ),
  );
  WidgetsFlutterBinding.ensureInitialized();
  objectBox = await ObjectBox.init();

  await NotificationController.initializeLocalNotifications(debug: true);
  await NotificationController.initializeRemoteNotifications(debug: true);
  await NotificationController.getInitialNotificationAction();
  // Set the background messaging handler early on, as a named top-level function
  // FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  // if (!kIsWeb) {
  //   await setupFlutterNotifications();
  // }

  await initHiveForFlutter();
  HydratedBloc.storage = await HydratedStorage.build(
    storageDirectory: kIsWeb
        ? HydratedStorage.webStorageDirectory
        : await getApplicationDocumentsDirectory(),
  );

  if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
    // await InAppWebViewController.setWebContentsDebuggingEnabled(true);
  }

  await initializeService();

  runApp(
    const ProviderScope(child: App()),
  );
}

Future<void> initializeService() async {
  StreamSubscription<Position>? positionStream;
  Timer myTimer;

  myTimer = Timer.periodic(const Duration(seconds: 8), (timer) async {
    UserData? user = objectBox.getUserData();

    String? _error;
    try {
      if (user == null) {
        return;
      }

      ApiServer api = ApiServer();

      bool serviceEnabled;
      LocationPermission permission;

      // Test if location services are enabled.
      serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        // Location services are not enabled don't continue
        // accessing the position and request users of the
        // App to enable the location services.
        return;
      }

      permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          // Permissions are denied, next time you could try
          // requesting permissions again (this is also where
          // Android's shouldShowRequestPermissionRationale
          // returned true. According to Android guidelines
          // your App should show an explanatory UI now.
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        // Permissions are denied forever, handle appropriately.
        return;
      }

      if (positionStream == null) {
        print('start stream');
        timer.cancel();
        late LocationSettings locationSettings;

        if (defaultTargetPlatform == TargetPlatform.android) {
          locationSettings = AndroidSettings(
              accuracy: LocationAccuracy.bestForNavigation,
              distanceFilter: 2,
              forceLocationManager: true,
              // intervalDuration: const Duration(seconds: 2),
              //(Optional) Set foreground notification config to keep the app alive
              //when going to the background
              foregroundNotificationConfig: const ForegroundNotificationConfig(
                notificationText:
                    "Example app will continue to receive your location even when you aren't using it",
                notificationTitle: "Running in Background",
                enableWakeLock: true,
                enableWifiLock: true,
              ));
        } else if (defaultTargetPlatform == TargetPlatform.iOS ||
            defaultTargetPlatform == TargetPlatform.macOS) {
          locationSettings = AppleSettings(
            accuracy: LocationAccuracy.bestForNavigation,
            activityType: ActivityType.fitness,
            distanceFilter: 2,
            pauseLocationUpdatesAutomatically: true,
            // Only set to true if our app will be started up in the background.
            showBackgroundLocationIndicator: false,
          );
        } else {
          locationSettings = const LocationSettings(
            accuracy: LocationAccuracy.bestForNavigation,
            distanceFilter: 2,
          );
        }

        positionStream =
            Geolocator.getPositionStream(locationSettings: locationSettings)
                .listen((Position? _locationResult) async {
          print(_locationResult);
          if (_locationResult != null) {
            PackageInfo packageInfo = await PackageInfo.fromPlatform();

            await api.post("/api/couriers/store-location", {
              "lat": "${_locationResult.latitude}",
              "lon": "${_locationResult.longitude}",
              "app_version": "${packageInfo.version}"
            });
          }
        });
      }
    } catch (e) {
      print(e);
    }
  });

  // final service = FlutterBackgroundService();

  // await service.configure(
  //   androidConfiguration: AndroidConfiguration(
  //     // this will be executed when app is in foreground or background in separated isolate
  //     onStart: onStart,

  //     // auto start service
  //     autoStart: true,
  //     isForegroundMode: true,
  //   ),
  //   iosConfiguration: IosConfiguration(
  //     // auto start service
  //     autoStart: true,

  //     // this will be executed when app is in foreground in separated isolate
  //     onForeground: onStart,

  //     // you have to enable background fetch capability on xcode project
  //     onBackground: onIosBackground,
  //   ),
  // );

  // service.startService();
}

@pragma('vm:entry-point')
Future<bool> onIosBackground(ServiceInstance service) async {
  WidgetsFlutterBinding.ensureInitialized();
  onStart(service);

  return true;
}

@pragma('vm:entry-point')
void onStart(ServiceInstance service) async {
  // Only available for flutter 3.0.0 and later
  DartPluginRegistrant.ensureInitialized();

  /// OPTIONAL when use custom notification
  final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
      FlutterLocalNotificationsPlugin();

  if (service is AndroidServiceInstance) {
    service.on('setAsForeground').listen((event) {
      service.setAsForegroundService();
    });

    service.on('setAsBackground').listen((event) {
      service.setAsBackgroundService();
    });
  }

  service.on('stopService').listen((event) {
    service.stopSelf();
  });
  StreamSubscription<Position>? positionStream;
  // bring to foreground
}
