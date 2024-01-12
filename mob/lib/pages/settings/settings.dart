import 'package:auto_route/auto_route.dart';
import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
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
            ListTile(
              title: Text(
                  AppLocalizations.of(context)!.settingsCallCenterChatLabel),
              leading: const Icon(Icons.chat_outlined),
              trailing: const Icon(Icons.arrow_forward_ios),
              onTap: () {
                context.router.pushNamed('/organizations');
              },
            ),
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
            const Spacer(),
            Text("V${_packageInfo.version}"),
            Text(AppLocalizations.of(context)!.choose_lang.toUpperCase(),
                style: const TextStyle(color: Colors.black)),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(8.0),
              decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(50),
                  color: Colors.grey[200]),
              child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    GestureDetector(
                      onTap: () {
                        context
                            .read<LocaleProvider>()
                            .setLocale(const Locale('uz'));
                      },
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(50),
                        child: Image.asset(
                          'icons/flags/png/uz.png',
                          package: 'country_icons',
                          width: 50,
                          height: 50,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                    GestureDetector(
                      onTap: () {
                        context
                            .read<LocaleProvider>()
                            .setLocale(const Locale('ru'));
                      },
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(50),
                        child: Image.asset('icons/flags/png/ru.png',
                            package: 'country_icons',
                            width: 50,
                            height: 50,
                            fit: BoxFit.cover),
                      ),
                    ),
                    GestureDetector(
                      onTap: () {
                        context
                            .read<LocaleProvider>()
                            .setLocale(const Locale('en'));
                      },
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(50),
                        child: Image.asset('icons/flags/png/us.png',
                            package: 'country_icons',
                            width: 50,
                            height: 50,
                            fit: BoxFit.cover),
                      ),
                    ),
                  ]),
            )
          ],
        ),
      ),
    );
  }
}
