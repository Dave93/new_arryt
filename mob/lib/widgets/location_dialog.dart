import 'package:arryt/l10n/app_localizations.dart';
import 'package:flutter/material.dart';

/// Окно перед включением служб геолокации.
///
/// Раньше здесь был отдельный текст, который упоминал сбор данных, но не то,
/// зачем они нужны. Google Play отклонил сборку 77 именно за это:
/// «Inadequate Prominent Disclosure — does not disclose the usage of
/// accessed or collected Location data». Текст раскрытия в приложении должен
/// быть один и тот же во всех местах, поэтому здесь те же строки
/// location_disclosure_*, что и перед запросом разрешения.
Future<bool> showLocationDialog(BuildContext context) async {
  final l10n = AppLocalizations.of(context)!;

  final accepted = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(l10n.location_disclosure_title),
      content: Text(l10n.location_disclosure_text),
      actions: [
        // Политика требует явной возможности отказаться, а не только «Разрешить».
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(false),
          child: Text(l10n.location_disclosure_decline),
        ),
        ElevatedButton(
          onPressed: () => Navigator.of(ctx).pop(true),
          child: Text(l10n.location_disclosure_accept),
        ),
      ],
    ),
  );

  return accepted ?? false;
}
