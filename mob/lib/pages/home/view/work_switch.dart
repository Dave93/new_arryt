import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:animated_snack_bar/animated_snack_bar.dart';
import 'package:animated_toggle_switch/animated_toggle_switch.dart';
import 'package:arryt/helpers/api_server.dart';
import 'package:arryt/helpers/hive_helper.dart';
import 'package:arryt/models/user_data.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:load_switch/load_switch.dart';
import 'package:arryt/bloc/block_imports.dart';

import '../../../widgets/location_dialog.dart';

class HomeViewWorkSwitch extends StatefulWidget {
  const HomeViewWorkSwitch({super.key});

  @override
  State<HomeViewWorkSwitch> createState() => _HomeViewWorkSwitchState();
}

class _HomeViewWorkSwitchState extends State<HomeViewWorkSwitch> {
  StreamSubscription<Position>? positionStream;
  bool value = false;
  bool isCheckingFromServer = false;

  Future<bool> _toggleWork(BuildContext context) async {
    UserData? user = HiveHelper.getUserData();
    bool serviceEnabled;
    LocationPermission permission;

    // Test if location services are enabled.
    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      await showLocationDialog(context);
      // Location services are not enabled don't continue
      // accessing the position and request users of the
      // App to enable the location services.
      await Geolocator.openLocationSettings();
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
        await Geolocator.requestPermission();
        return user!.is_online;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      // Permissions are denied forever, handle appropriately.
      return user!.is_online;
    }

    Position currentPosition = await Geolocator.getCurrentPosition();
    print('get current position');

    ApiServer api = ApiServer();

    if (user!.is_online) {
      try {
        var response = await api.post('/api/couriers/close_time_entry', {
          'lat_close': currentPosition.latitude.toString(),
          'lon_close': currentPosition.longitude.toString(),
        });
        if (response.statusCode != 200) {
          AnimatedSnackBar.material(
            jsonDecode(response.data)['message'] ?? "Error",
            type: AnimatedSnackBarType.error,
          ).show(context);
          return value;
        }
        if (response.data['id'] != null) {
          user.is_online = false;
          HiveHelper.setUserData(user);
          setState(() {
            value = false;
          });
        }
      } catch (e) {
        print(e);
        AnimatedSnackBar.material(
          e.toString(),
          type: AnimatedSnackBarType.error,
        ).show(context);
        setState(() {
          value = true;
        });
      }
    } else {
      try {
        var response = await api.post('/api/couriers/open_time_entry', {
          'lat_open': currentPosition.latitude.toString(),
          'lon_open': currentPosition.longitude.toString(),
        });

        if (response.statusCode != 200) {
          AnimatedSnackBar.material(
            jsonDecode(response.data)['message'] ?? "Error",
            type: AnimatedSnackBarType.error,
          ).show(context);
          return value;
        }

        if (response.data['id'] != null) {
          user.is_online = true;
          HiveHelper.setUserData(user);
          setState(() {
            value = true;
          });
        }
      } catch (e) {
        print(e);
        setState(() {
          value = false;
        });
      }
    }
    return !value;
  }

  Future<void> checkCurrentStatus() async {
    try {
      ApiServer api = ApiServer();
      var response = await api.get('/api/users/getme', {});
      setState(() {
        value = response.data!['user']['is_online'];
      });
      UserData? user = HiveHelper.getUserData();
      if (user != null) {
        UserData newUserData = UserData.fromMap(response.data);
        newUserData.accessToken = user.accessToken;
        newUserData.refreshToken = user.refreshToken;
        newUserData.tokenExpires = user.tokenExpires;
        newUserData.accessTokenExpires = user.accessTokenExpires;
        newUserData.is_online = response.data!['user']['is_online'];

        HiveHelper.setUserData(newUserData);
      }
    } catch (e) {
      print(e);
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      checkCurrentStatus();
    });
  }

  @override
  void dispose() {
    positionStream?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedToggleSwitch<bool>.dual(
      current: value,
      first: false,
      second: true,
      spacing: 0.0,
      animationDuration: const Duration(milliseconds: 600),
      style: const ToggleStyle(
        borderColor: Colors.transparent,
        indicatorColor: Colors.white,
        backgroundColor: Colors.amber,
      ),
      customStyleBuilder: (context, local, global) => ToggleStyle(
          backgroundGradient: LinearGradient(
        colors: const [Colors.green, Colors.red],
        stops: [
          global.position - (1 - 2 * max(0, global.position - 0.5)) * 0.5,
          global.position + max(0, 2 * (global.position - 0.5)) * 0.5,
        ],
      )),
      borderWidth: 4.0,
      height: 40.0,
      loadingIconBuilder: (context, global) => CupertinoActivityIndicator(
          color: Color.lerp(Colors.red, Colors.green, global.position)),
      onChanged: (b) {
        return _toggleWork(context);
      },
      iconBuilder: (value) => value
          ? Icon(Icons.power_outlined, color: Colors.green, size: 20.0)
          : Icon(Icons.power_settings_new_rounded,
              color: Colors.red, size: 20.0),
      textBuilder: (value) => Center(
          child: Text(
        value ? 'On' : 'Off',
        style: const TextStyle(
            color: Colors.white, fontSize: 15.0, fontWeight: FontWeight.w600),
      )),
    );
  }
}
