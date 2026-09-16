import 'package:arryt/l10n/app_localizations.dart';
import 'package:arryt/location_service.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

/// Google Play требует Prominent Disclosure: прежде чем приложение попросит
/// доступ к геолокации, оно обязано само объяснить, какие данные собирает,
/// что сбор продолжается в фоне, и получить явное согласие. Без этого сборка
/// отклоняется — так и случилось с версией 76.
///
/// Показывать окно нужно на каждом пути, который действительно вызывает
/// системный запрос. Единственный законный пропуск — разрешение `always`
/// уже выдано, спрашивать больше нечего.
Future<LocationPermission> requestLocationWithDisclosure(
    BuildContext context) async {
  var permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.always) {
    return permission;
  }

  final accepted = await _showDisclosure(context);
  if (!accepted) {
    // Без согласия системный диалог не поднимаем вовсе.
    return permission;
  }

  permission = await Geolocator.requestPermission();

  if (permission == LocationPermission.always ||
      permission == LocationPermission.whileInUse) {
    // Фоновый сервис поднимается автозапуском внутри configure(), а на старте
    // приложения он пропускается, пока разрешения нет.
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
