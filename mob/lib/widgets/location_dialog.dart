import 'package:flutter/material.dart';
import 'package:arryt/l10n/app_localizations.dart';

Future<bool> showLocationDialog(BuildContext context) async {
  return await showDialog(
      context: context,
      builder: (context) => AlertDialog(
            title: Text(AppLocalizations.of(context)!
                .locationDialogLabel
                .toUpperCase()),
            content: Text(AppLocalizations.of(context)!.locationDialogText),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(true),
                child:
                    Text(AppLocalizations.of(context)!.locationDialogApprove),
              ),
            ],
          ));
}
