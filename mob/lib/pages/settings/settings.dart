import 'package:auto_route/auto_route.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:arryt/l10n/app_localizations.dart';
import 'package:arryt/provider/locale_provider.dart';
import 'package:provider/provider.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart' as UrlLauncher;

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  PackageInfo _packageInfo = PackageInfo(
    appName: 'Unknown',
    packageName: 'Unknown',
    version: 'Unknown',
    buildNumber: 'Unknown',
    buildSignature: 'Unknown',
    installerStore: 'Unknown',
  );

  @override
  void initState() {
    super.initState();
    _initPackageInfo();
  }

  Future<void> _initPackageInfo() async {
    final info = await PackageInfo.fromPlatform();
    setState(() {
      _packageInfo = info;
    });
  }

  Future<void> _testNotificationSound(BuildContext context) async {
    final flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();

    const androidDetails = AndroidNotificationDetails(
      'test_channel',
      'Test Notifications',
      channelDescription: 'Channel for testing notification sound',
      importance: Importance.max,
      priority: Priority.high,
      sound: RawResourceAndroidNotificationSound('notify'),
      playSound: true,
    );

    const iosDetails = DarwinNotificationDetails(
      sound: 'notify.wav',
    );

    const notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await flutterLocalNotificationsPlugin.show(
      0,
      'Test Notification',
      'If you hear the sound, it works!',
      notificationDetails,
    );

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Notification sent! Check your notification panel.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 120,
        elevation: 0,
        backgroundColor: Colors.transparent,
        title: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 20),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(AppLocalizations.of(context)!.settings,
                  style: const TextStyle(color: Colors.black, fontSize: 35)),
            ],
          ),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            //choose brands  and route to brands page
            // ListTile(
            //   title: Text(AppLocalizations.of(context)!.choose_brand),
            //   trailing: const Icon(Icons.arrow_forward_ios),
            //   onTap: () {
            //     context.router.pushNamed('/brands');
            //   },
            // ),
            // ListTile(
            //   title: Text(
            //       AppLocalizations.of(context)!.settingsCallCenterChatLabel),
            //   leading: const Icon(Icons.chat_outlined),
            //   trailing: const Icon(Icons.arrow_forward_ios),
            //   onTap: () {
            //     context.router.pushNamed('/organizations');
            //   },
            // ),
            ListTile(
              title: Text(AppLocalizations.of(context)!.privacyPolicy),
              leading: const Icon(Icons.privacy_tip_outlined),
              trailing: const Icon(Icons.arrow_forward_ios),
              onTap: () {
                context.router.pushNamed('/privacy');
              },
            ),
            ListTile(
              title: Text(AppLocalizations.of(context)!.call_the_call_center),
              leading: const Icon(Icons.phone),
              trailing: const Icon(Icons.arrow_forward_ios),
              onTap: () {
                UrlLauncher.launch("tel://712051111");
              },
            ),
            // Test notification button - only visible in debug mode
            if (kDebugMode)
              ListTile(
                title: const Text('Test Notification Sound'),
                leading: const Icon(Icons.notifications_active),
                trailing: const Icon(Icons.play_arrow),
                onTap: () => _testNotificationSound(context),
              ),
            const Spacer(),
            Text("V${_packageInfo.version}"),
            const SizedBox(height: 8),
            Text(AppLocalizations.of(context)!.choose_lang.toUpperCase(),
                style: const TextStyle(color: Colors.black)),
            const SizedBox(height: 16),
            _buildLanguageSwitcher(context)
          ],
        ),
      ),
    );
  }

  Widget _buildLanguageSwitcher(BuildContext context) {
    final localeProvider = context.watch<LocaleProvider>();
    final currentLocale = localeProvider.locale?.languageCode ?? 'ru';

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(50),
        color: Colors.grey[200],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildLanguageButton(context, 'uz', "O'zbekcha", currentLocale),
          _buildLanguageButton(context, 'ru', 'Русский', currentLocale),
          _buildLanguageButton(context, 'en', 'English', currentLocale),
        ],
      ),
    );
  }

  Widget _buildLanguageButton(
      BuildContext context, String code, String label, String currentLocale) {
    final isSelected = currentLocale == code;

    return Expanded(
      child: GestureDetector(
        onTap: () {
          context.read<LocaleProvider>().setLocale(Locale(code));
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(50),
            color: isSelected
                ? Theme.of(context).primaryColor
                : Colors.transparent,
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isSelected ? Colors.white : Colors.black,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ),
      ),
    );
  }
}
