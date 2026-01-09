import 'dart:async';

import 'package:auto_size_text/auto_size_text.dart';
import 'package:disable_battery_optimization/disable_battery_optimization.dart';
import 'package:flutter/material.dart';
import 'package:arryt/l10n/app_localizations.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';

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
    // TODO: implement dispose
    super.dispose();
    myTimer.cancel();
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
                              // Check current permission status
                              LocationPermission currentPermission = await Geolocator.checkPermission();

                              if (currentPermission == LocationPermission.denied) {
                                // First request basic permission
                                currentPermission = await Geolocator.requestPermission();
                              }

                              if (currentPermission == LocationPermission.deniedForever) {
                                // Permission permanently denied, must go to settings
                                await openAppSettings();
                                return;
                              }

                              if (currentPermission == LocationPermission.whileInUse) {
                                // Has "while in use" but need "always"
                                // On Android 10+/iOS, we need to open settings for user to change to "always"
                                await openAppSettings();
                                return;
                              }

                              if (currentPermission == LocationPermission.denied) {
                                // Still denied after request, open settings
                                await openAppSettings();
                              }
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
