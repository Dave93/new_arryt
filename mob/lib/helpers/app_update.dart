import 'package:flutter/foundation.dart';
import 'package:in_app_update/in_app_update.dart';

/// Обязательное обновление через Google Play (In-App Updates, IMMEDIATE).
///
/// Если в Play есть версия новее, Play показывает своё полноэкранное окно
/// «Доступно обновление», качает и ставит её, а приложение перезапускается.
/// Работает только у сборки, установленной из Play: у отладочной или
/// поставленной вручную Play отвечает ошибкой — её просто пропускаем.
class AppUpdate {
  static bool _inProgress = false;

  /// Вызывается при старте и при каждом возвращении в приложение.
  /// Если курьер закрыл окно обновления, оно появится снова — без
  /// обновления работать нельзя.
  static Future<void> check() async {
    if (defaultTargetPlatform != TargetPlatform.android || _inProgress) return;
    _inProgress = true;
    try {
      final info = await InAppUpdate.checkForUpdate();
      final resume = info.updateAvailability ==
          UpdateAvailability.developerTriggeredUpdateInProgress;
      final available = info.updateAvailability == UpdateAvailability.updateAvailable &&
          info.immediateUpdateAllowed;
      if (resume || available) {
        await InAppUpdate.performImmediateUpdate();
      }
    } catch (e) {
      debugPrint('AppUpdate: проверка обновления недоступна: $e');
    } finally {
      _inProgress = false;
    }
  }
}
