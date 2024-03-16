import 'package:awesome_notifications_fcm/awesome_notifications_fcm.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'package:awesome_notifications/awesome_notifications.dart';

import 'package:http/http.dart' as http;

import '../firebase_options.dart';

class NotificationController with ChangeNotifier {
  /// *********************************************
  ///   SINGLETON PATTERN
  /// *********************************************

  static final NotificationController _instance =
      NotificationController._internal();

  factory NotificationController() {
    return _instance;
  }

  NotificationController._internal();

  /// *********************************************
  ///  OBSERVER PATTERN
  /// *********************************************

  String _firebaseToken = '';
  String get firebaseToken => _firebaseToken;

  final String _nativeToken = '';
  String get nativeToken => _nativeToken;

  /// *********************************************
  ///   INITIALIZATION METHODS
  /// *********************************************

  static Future<void> initializeLocalNotifications(
      {required bool debug}) async {
    await AwesomeNotifications().initialize(
        'resource://drawable/res_app_icon',
        [
          NotificationChannel(
            channelKey: 'alerts',
            channelName: 'Alerts',
            channelDescription: 'Notification alerts',
            importance: NotificationImportance.Max,
            defaultColor: const Color(0xFF9D50DD),
            ledColor: const Color.fromARGB(255, 190, 56, 56),
            groupKey: 'alerts',
            channelShowBadge: true,
            enableVibration: true,
            playSound: true,
            soundSource: 'resource://raw/res_alerts',
          ),
          NotificationChannel(
            channelKey: 'new_order',
            channelName: 'New Order',
            channelDescription: 'Notification alerts',
            importance: NotificationImportance.Max,
            defaultColor: const Color(0xFF9D50DD),
            ledColor: const Color.fromARGB(255, 190, 56, 56),
            groupKey: 'alerts',
            channelShowBadge: true,
            enableVibration: true,
            playSound: true,
            soundSource: 'resource://raw/res_alerts',
          ),
          NotificationChannel(
            channelKey: 'cooking_ready',
            channelName: 'Cooking ready',
            channelDescription: 'Notification cooking ready',
            defaultColor: const Color(0xFF9D50DD),
            ledColor: const Color.fromARGB(255, 190, 56, 56),
            importance: NotificationImportance.Max,
            groupKey: 'cooking_ready',
            playSound: true,
            enableVibration: true,
            soundSource: 'resource://raw/res_cooking_ready',
          ),
        ],
        debug: debug);
  }

  static Future<void> initializeRemoteNotifications(
      {required bool debug}) async {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    await AwesomeNotificationsFcm().initialize(
        onFcmSilentDataHandle: NotificationController.mySilentDataHandle,
        onFcmTokenHandle: NotificationController.myFcmTokenHandle,
        onNativeTokenHandle: NotificationController.myNativeTokenHandle,
        // licenseKey: null,
        debug: debug);
  }

  static Future<void> initializeNotificationListeners() async {
    // Only after at least the action method is set, the notification events are delivered
    await AwesomeNotifications().setListeners(
        onActionReceivedMethod: NotificationController.myActionReceivedMethod,
        onNotificationCreatedMethod:
            NotificationController.myNotificationCreatedMethod,
        onNotificationDisplayedMethod:
            NotificationController.myNotificationDisplayedMethod,
        onDismissActionReceivedMethod:
            NotificationController.myDismissActionReceivedMethod);
  }

  static Future<void> getInitialNotificationAction() async {
    ReceivedAction? receivedAction = await AwesomeNotifications()
        .getInitialNotificationAction(removeFromActionEvents: true);
    if (receivedAction == null) return;
    // Fluttertoast.showToast(
    //     msg: 'Notification action launched app: $receivedAction',
    //   backgroundColor: Colors.deepPurple
    // );
    print('Notification action launched app: $receivedAction');
  }

  ///  *********************************************
  ///    LOCAL NOTIFICATION METHODS
  ///  *********************************************

  /// Use this method to detect when a new notification or a schedule is created
  @pragma("vm:entry-point")
  static Future<void> myNotificationCreatedMethod(
      ReceivedNotification receivedNotification) async {
    // Fluttertoast.showToast(
    //     msg:
    //         'Notification from ${AwesomeAssertUtils.toSimpleEnumString(receivedNotification.createdSource)} created',
    //     backgroundColor: Colors.green);
  }

  /// Use this method to detect every time that a new notification is displayed
  @pragma("vm:entry-point")
  static Future<void> myNotificationDisplayedMethod(
      ReceivedNotification receivedNotification) async {
    // Fluttertoast.showToast(
    //     msg:
    //         'Notification from ${AwesomeAssertUtils.toSimpleEnumString(receivedNotification.createdSource)} displayed',
    //     backgroundColor: Colors.blue);
  }

  /// Use this method to detect if the user dismissed a notification
  @pragma("vm:entry-point")
  static Future<void> myDismissActionReceivedMethod(
      ReceivedAction receivedAction) async {
    // Fluttertoast.showToast(
    //     msg:
    //         'Notification from ${AwesomeAssertUtils.toSimpleEnumString(receivedAction.createdSource)} dismissed',
    //     backgroundColor: Colors.orange);
  }

  /// Use this method to detect when the user taps on a notification or action button
  @pragma("vm:entry-point")
  static Future<void> myActionReceivedMethod(
      ReceivedAction receivedAction) async {
    String? actionSourceText =
        AwesomeAssertUtils.toSimpleEnumString(receivedAction.actionLifeCycle);
    // Fluttertoast.showToast(
    //     msg: 'Notification action captured on $actionSourceText');

    // String targetPage = PAGE_NOTIFICATION_DETAILS;

    // // Avoid to open the notification details page over another details page already opened
    // MyApp.navigatorKey.currentState?.pushNamedAndRemoveUntil(targetPage,
    //     (route) => (route.settings.name != targetPage) || route.isFirst,
    //     arguments: receivedAction);
  }

  ///  *********************************************
  ///     REMOTE NOTIFICATION METHODS
  ///  *********************************************

  /// Use this method to execute on background when a silent data arrives
  /// (even while terminated)
  @pragma("vm:entry-point")
  static Future<void> mySilentDataHandle(FcmSilentData silentData) async {
    // Fluttertoast.showToast(
    //     msg: 'Silent data received',
    //     backgroundColor: Colors.blueAccent,
    //     textColor: Colors.white,
    //     fontSize: 16);

    print('"SilentData": ${silentData.toString()}');

    if (silentData.createdLifeCycle != NotificationLifeCycle.Foreground) {
      print("bg");
    } else {
      print("FOREGROUND");
    }

    print("starting long task");
    // await Future.delayed(const Duration(seconds: 4));
    // final url = Uri.parse("http://google.com");
    // final re = await http.get(url);
    // print(re.body);
    print("long task done");
  }

  /// Use this method to detect when a new fcm token is received
  @pragma("vm:entry-point")
  static Future<void> myFcmTokenHandle(String token) async {
    debugPrint('Firebase Token:"$token"');

    _instance._firebaseToken = token;
    _instance.notifyListeners();
  }

  /// Use this method to detect when a new native token is received
  @pragma("vm:entry-point")
  static Future<void> myNativeTokenHandle(String token) async {
    debugPrint('Native Token:"$token"');
  }
}
