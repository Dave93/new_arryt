import 'package:arryt/helpers/hive_helper.dart';
import 'package:arryt/l10n/app_localizations.dart';
import 'package:arryt/location_service.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

/// Google Play требует Prominent Disclosure перед тем, как приложение впервые
/// доберётся до координат, — а не перед запросом разрешения.
///
/// Сборки 77 и 79 отклонили именно из-за этой разницы. Раньше окно
/// пропускалось, если разрешение уже выдано как `always`; у ревьюера оно было
/// выдано, поэтому единственным, что он видел про геолокацию, оказывалось
/// системное окно Google Play Services («включите геолокацию Google»),
/// которое ничего не говорит ни о сборе, ни о цели.
///
/// Теперь решает сохранённый флаг согласия, а не состояние разрешения.
Future<bool> ensureLocationConsent(BuildContext context) async {
  if (HiveHelper.isLocationDisclosureAccepted()) {
    return true;
  }

  final accepted = await _showDisclosure(context);
  if (!accepted) {
    return false;
  }

  await HiveHelper.setLocationDisclosureAccepted();
  return true;
}

/// Согласие плюс само разрешение. Возвращает текущее состояние разрешения;
/// без согласия системный запрос не поднимается вовсе.
Future<LocationPermission> requestLocationWithDisclosure(
    BuildContext context) async {
  if (!await ensureLocationConsent(context)) {
    return Geolocator.checkPermission();
  }

  var permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.always) {
    return permission;
  }

  permission = await Geolocator.requestPermission();

  if (permission == LocationPermission.always ||
      permission == LocationPermission.whileInUse) {
    // Фоновый сервис поднимается автозапуском внутри configure(), а на старте
    // приложения он пропускается, пока нет согласия и разрешения.
    await LocationService.initializeService();
  }

  return permission;
}

Future<bool> _showDisclosure(BuildContext context) async {
  final l10n = AppLocalizations.of(context)!;

  final accepted = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => AlertDialog(
      title: Text(l10n.location_disclosure_title),
      content: Text(l10n.location_disclosure_text),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx, false),
          child: Text(l10n.location_disclosure_decline),
        ),
        ElevatedButton(
          onPressed: () => Navigator.pop(ctx, true),
          child: Text(l10n.location_disclosure_accept),
        ),
      ],
    ),
  );

  return accepted ?? false;
}
