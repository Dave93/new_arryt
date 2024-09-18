import 'dart:async';
import 'dart:isolate';
import 'dart:ui';
import 'package:arryt/helpers/api_server.dart';
import 'package:arryt/helpers/hive_helper.dart';
import 'package:flutter/material.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_background_service_android/flutter_background_service_android.dart';
import 'package:geolocator/geolocator.dart';
import 'package:hive/hive.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

import 'package:package_info_plus/package_info_plus.dart';
import 'package:arryt/helpers/objectbox.dart';
import 'package:path_provider/path_provider.dart';

// Глобальные переменные для изолята
SendPort? uiSendPort;

@pragma('vm:entry-point')
void onStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();

  final ReceivePort receivePort = ReceivePort();
  IsolateNameServer.registerPortWithName(
      receivePort.sendPort, 'LocationIsolate');

  receivePort.listen((dynamic message) {
    if (message is SendPort) {
      uiSendPort = message;
    }
  });

  service.on('stopService').listen((event) {
    service.stopSelf();
  });

  // Настройка геолокации
  const LocationSettings locationSettings = LocationSettings(
    accuracy: LocationAccuracy.high,
    distanceFilter: 10,
  );

  Geolocator.getPositionStream(locationSettings: locationSettings).listen(
    (Position position) => _handleLocationUpdate(position, service),
  );
}

void _handleLocationUpdate(Position position, ServiceInstance service) async {
  if (await _isValidLocation(position)) {
    await _sendLocationToServer(position);

    if (service is AndroidServiceInstance) {
      service.setForegroundNotificationInfo(
        title: "Отслеживание местоположения",
        content: "Последнее обновление: ${position.timestamp}",
      );
    }

    uiSendPort?.send(position);
  }
}

Future<Position?> _getLastPosition() async {
  try {
    final box = await Hive.openBox('locationBox');
    final String? lastPositionJson = box.get('lastPosition');
    if (lastPositionJson != null) {
      final Map<String, dynamic> lastPositionMap =
          json.decode(lastPositionJson);
      return Position.fromMap(lastPositionMap);
    }
  } catch (e) {
    print('Error getting last position: $e');
  }
  return null;
}

Future<void> _saveLastPosition(Position position) async {
  try {
    final box = await Hive.openBox('locationBox');
    final String lastPositionJson = json.encode(position.toJson());
    await box.put('lastPosition', lastPositionJson);
  } catch (e) {
    print('Error saving last position: $e');
  }
}

Future<bool> _isValidLocation(Position position) async {
  // Проверка точности GPS
  if (position.accuracy > 20) {
    return false;
  }

  // Проверка резких изменений в скорости
  if (position.speed > 50) {
    // 50 м/с ~ 180 км/ч
    return false;
  }

  // Проверка резких изменений в расстоянии
  Position? lastPosition = await _getLastPosition();
  if (lastPosition != null) {
    double distance = Geolocator.distanceBetween(lastPosition.latitude,
        lastPosition.longitude, position.latitude, position.longitude);
    double timeDiff = position.timestamp
        .difference(lastPosition.timestamp)
        .inSeconds
        .toDouble();
    double speed = distance / timeDiff;
    if (speed > 50) {
      // 50 м/с ~ 180 км/ч
      return false;
    }
  }

  await _saveLastPosition(position);
  return true;
}

Future<void> _sendLocationToServer(Position position) async {
  try {
    final userData = HiveHelper.getUserData();
    if (userData == null) {
      print('User data not found');
      return;
    }

    ApiServer api = ApiServer();
    PackageInfo packageInfo = await PackageInfo.fromPlatform();
    await api.post("/api/couriers/store-location", {
      "lat": "${position.latitude}",
      "lon": "${position.longitude}",
      "app_version": "${packageInfo.version}"
    });
  } catch (e) {
    if (e is HiveError && e.message.contains('Box not found')) {
      print(
          'Ошибка при отправке данных: Box не найден. Возможно, вы забыли вызвать Hive.openBox()?');
      // Попытка переинициализировать Hive
      await HiveHelper.initHive();
    } else {
      print('Ошибка при отправке данных: $e');
    }
  }
}

class LocationService {
  static Future<bool> initializeService() async {
    final service = FlutterBackgroundService();

    // Запрашиваем разрешения перед настройкой сервиса
    bool hasPermission = await _requestPermissions();
    if (!hasPermission) {
      print('Не удалось получить разрешение на использование геолокации');
      return false;
    }

    await HiveHelper.initHive();
    await service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: onStart,
        autoStart: true,
        isForegroundMode: true,
      ),
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: onStart,
        onBackground: onIosBackground,
      ),
    );

    return true;
  }

  static Future<bool> _requestPermissions() async {
    bool serviceEnabled;
    LocationPermission permission;

    // Проверяем, включены ли службы геолокации
    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      // Службы геолокации отключены, предложите пользователю включить их
      return false;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        // Разрешения отклонены, попросите снва или покажите объяснение
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      // Разрешения отклонены навсегда, посоветуйте как их включить
      return false;
    }

    // Разрешения получены
    return true;
  }

  @pragma('vm:entry-point')
  static bool onIosBackground(ServiceInstance service) {
    WidgetsFlutterBinding.ensureInitialized();
    print('FLUTTER BACKGROUND FETCH');
    return true;
  }
}
