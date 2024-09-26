import 'package:arryt/models/api_client.dart';
import 'package:arryt/models/user_data.dart';
import 'package:arryt/widgets/home/order_accept_slider.dart';
import 'package:arryt/widgets/orders/accept_order.dart';
import 'package:auto_route/auto_route.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:arryt/pages/login/type_phone.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:hive/hive.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'api_client_intro/api_client_choose_brand.dart';
import 'home/view/home_page.dart';
import 'package:arryt/helpers/hive_helper.dart';

@RoutePage()
class InitialPage extends StatefulWidget {
  const InitialPage({Key? key}) : super(key: key);

  @override
  State<InitialPage> createState() => _InitialPageState();
}

class _InitialPageState extends State<InitialPage> {
  late FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin;

  Future<void> _initNotifications() async {
    flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();
    const androidInitialize =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const iOSInitialize = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    const initializationsSettings = InitializationSettings(
      android: androidInitialize,
      iOS: iOSInitialize,
    );
    await flutterLocalNotificationsPlugin.initialize(initializationsSettings);
  }

  Future<void> _configureFirebaseMessaging() async {
    final messaging = FirebaseMessaging.instance;

    // Request permission (required for iOS)
    await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Get the token
    final token = await messaging.getToken();
    print('FCM Token: $token');

    // Configure how to handle incoming messages when the app is in the foreground
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print("Received a foreground message: ${message.messageId}");
      print(message.data);
      _showNotification(message);
      _handleMessage(message);
    });

    // Handle message when the app is opened from a terminated state
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Handle message when the app is in the background but opened
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessage);
  }

  Future<void> _showNotification(RemoteMessage message) async {
    RemoteNotification? notification = message.notification;
    AndroidNotification? android = message.notification?.android;

    if (notification != null && android != null) {
      await flutterLocalNotificationsPlugin.show(
        notification.hashCode,
        notification.title,
        notification.body,
        NotificationDetails(
          android: AndroidNotificationDetails(
            'channel_id',
            'Channel Name',
            channelDescription: 'Channel Description',
            importance: Importance.max,
            priority: Priority.high,
            icon: android.smallIcon,
          ),
          iOS: const DarwinNotificationDetails(),
        ),
      );
    }
  }

  void _handleMessage(RemoteMessage message) {
    print("Handling a message: ${message.messageId}");
    print(message.data);

    if (message.data['type'] == 'accept_order') {
      // Use a post-frame callback to ensure the context is available
      print("dcavr");
      showOrderNotification(
          message.data['orderId'], int.parse(message.data['queue']));
    }
  }

  void showOrderNotification(String orderId, int queue) {
    if (!mounted) return; // Check if the widget is still mounted

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      isDismissible: false,
      enableDrag: false,
      builder: (context) => SizedBox(
        height: MediaQuery.of(context).size.height * 0.8,
        child: SafeArea(
          child: AcceptOrder(orderId: orderId, queue: queue),
        ),
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    _initNotifications();
    _configureFirebaseMessaging();
  }

  @override
  Widget build(BuildContext context) {
    return const _InitialPageView();
  }
}

class _InitialPageView extends StatelessWidget {
  const _InitialPageView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder(
      valueListenable: HiveHelper.getApiClientBox().listenable(),
      builder: (context, Box<ApiClient> box, _) {
        ApiClient? apiClient = HiveHelper.getDefaultApiClient();

        if (apiClient != null && apiClient.isServiceDefault) {
          return ValueListenableBuilder(
            valueListenable: HiveHelper.getUserDataBox().listenable(),
            builder: (context, Box<UserData> userBox, _) {
              final userData = HiveHelper.getUserData();
              if (userData != null &&
                  userData.accessToken?.isNotEmpty == true) {
                return const HomeViewPage();
              } else {
                return const LoginTypePhonePage();
              }
            },
          );
        } else {
          return const ApiClientChooseBrand();
        }
      },
    );
  }
}

// Add this function outside of the class
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  print("Handling a background message: ${message.messageId}");
  // Initialize Firebase if needed
  // await Firebase.initializeApp();

  // You can add logic here to handle the background message
}
