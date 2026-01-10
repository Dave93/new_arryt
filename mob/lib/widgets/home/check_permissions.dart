import 'dart:async';
import 'dart:io';

import 'package:android_intent_plus/android_intent.dart';
import 'package:app_settings/app_settings.dart';
import 'package:auto_size_text/auto_size_text.dart';
import 'package:disable_battery_optimization/disable_battery_optimization.dart';
import 'package:flutter/material.dart';
import 'package:arryt/l10n/app_localizations.dart';
import 'package:geolocator/geolocator.dart';
import 'package:package_info_plus/package_info_plus.dart';

class HomeCheckPermissions extends StatefulWidget {
  const HomeCheckPermissions({super.key});

  @override
  State<HomeCheckPermissions> createState() => _HomeCheckPermissionsState();
}

class _HomeCheckPermissionsState extends State<HomeCheckPermissions> {
  bool _isAllPermissionsGranted = false;
  bool _disabledBatteryOptimization = false;
  LocationPermission _permission = LocationPermission.denied;
  late Timer myTimer;

  @override
  void initState() {
    // TODO: implement initState
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      // run code after 1 second

      myTimer = Timer.periodic(Duration(seconds: 1), (timer) async {
        bool? isBatteryOptimizationDisabled =
            await DisableBatteryOptimization.isBatteryOptimizationDisabled;
        if (isBatteryOptimizationDisabled != null) {
          setState(() {
            _disabledBatteryOptimization = isBatteryOptimizationDisabled;
          });
        }

        LocationPermission permission = await Geolocator.checkPermission();
        if (permission == LocationPermission.always) {
          setState(() {
            _isAllPermissionsGranted = true;
            _permission = permission;
          });
        }
      });
    });
  }

  @override
  void dispose() {
    super.dispose();
    myTimer.cancel();
  }

  /// Opens location permission page directly on Android, or app settings on iOS
  Future<void> _openAppPermissions() async {
    if (Platform.isAndroid) {
      final packageInfo = await PackageInfo.fromPlatform();

      // List of intents to try in order of preference
      final intents = [
        // 1. Try to open location permission page directly (Android 6.0+)
        AndroidIntent(
          action: 'android.intent.action.MANAGE_APP_PERMISSION',
          arguments: {
            'android.intent.extra.PACKAGE_NAME': packageInfo.packageName,
            'android.intent.extra.PERMISSION_GROUP_NAME': 'android.permission-group.LOCATION',
          },
        ),
        // 2. Fallback to app details settings
        AndroidIntent(
          action: 'android.settings.APPLICATION_DETAILS_SETTINGS',
          data: 'package:${packageInfo.packageName}',
        ),
      ];

      for (final intent in intents) {
        try {
          await intent.launch();
          return; // Success - exit
        } catch (e) {
          // Try next intent
          continue;
        }
      }

      // 3. Final fallback - use app_settings package
      await AppSettings.openAppSettings(asAnotherTask: true);
    } else {
      // iOS - open app settings
      await AppSettings.openAppSettings(asAnotherTask: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        centerTitle: true,
        automaticallyImplyLeading: false,
        title:
            Text(AppLocalizations.of(context)!.requiredSettings.toUpperCase()),
      ),
      body: Padding(
        padding: const EdgeInsets.all(15.0),
        child: Column(
          children: [
            Spacer(),
            Text(
              AppLocalizations.of(context)!.requiredSettingsInstruction,
              style: TextStyle(fontSize: 18),
              textAlign: TextAlign.center,
            ),
            Spacer(),
            _disabledBatteryOptimization
                ? SizedBox()
                : SizedBox(
                    width: MediaQuery.of(context).size.width * 0.8,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.battery_alert,
                          color: Theme.of(context).primaryColor,
                        ),
                        SizedBox(width: 10),
                        Expanded(
                          child: AutoSizeText(
                            AppLocalizations.of(context)!
                                .disableBatteryOptimization,
                            style: TextStyle(fontSize: 20),
                            textAlign: TextAlign.left,
                            maxLines: 4,
                          ),
                        ),
                        ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Theme.of(context).primaryColor,
                              foregroundColor: Colors.white,
                            ),
                            onPressed: () async {
                              await DisableBatteryOptimization
                                  .showDisableBatteryOptimizationSettings();
                            },
                            child: Text(
                                AppLocalizations.of(context)!
                                    .turnOff
                                    .toUpperCase(),
                                style: const TextStyle(fontSize: 12.0)))
                      ],
                    ),
                  ),
            SizedBox(height: 10),
            _permission == LocationPermission.always
                ? SizedBox()
                : SizedBox(
                    width: MediaQuery.of(context).size.width * 0.8,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.location_on,
                          color: Theme.of(context).primaryColor,
                        ),
                        SizedBox(width: 10),
                        Expanded(
                          child: AutoSizeText(
                            AppLocalizations.of(context)!
                                .enablLocationPermissionAlways,
                            style: TextStyle(fontSize: 20),
                            textAlign: TextAlign.left,
                            maxLines: 4,
                          ),
                        ),
                        ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Theme.of(context).primaryColor,
                              foregroundColor: Colors.white,
                            ),
                            onPressed: () async {
                              await _openAppPermissions();
                            },
                            child: Text(
                                AppLocalizations.of(context)!
                                    .allow
                                    .toUpperCase(),
                                style: const TextStyle(fontSize: 12.0)))
                      ],
                    ),
                  ),
            Spacer(),
            ElevatedButton(
              onPressed: () {
                if (_isAllPermissionsGranted) Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(
                  backgroundColor: _isAllPermissionsGranted
                      ? Theme.of(context).primaryColor
                      : Colors.grey,
                  foregroundColor: Colors.white),
              child: Text(
                  AppLocalizations.of(context)!.continueText.toUpperCase()),
            )
          ],
        ),
      ),
    );
  }
}
