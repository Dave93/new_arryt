import 'package:animated_snack_bar/animated_snack_bar.dart';
import 'package:arryt/helpers/hive_helper.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:rounded_loading_button_plus/rounded_loading_button.dart';
import 'package:arryt/l10n/app_localizations.dart';

import '../../bloc/block_imports.dart';

class ProfileLogoutButton extends StatefulWidget {
  const ProfileLogoutButton({super.key});

  @override
  State<ProfileLogoutButton> createState() => _ProfileLogoutButtonState();
}

class _ProfileLogoutButtonState extends State<ProfileLogoutButton> {
  final RoundedLoadingButtonController _btnController =
      RoundedLoadingButtonController();

  Future<void> _logout(BuildContext context) async {
    _btnController.start();

    try {
      //   var client = GraphQLProvider.of(context).value;
      //   var query = gql('''
      //   mutation {
      //     logout()
      //   }
      // ''');
      //   QueryResult result =
      //       await client.mutate(MutationOptions(document: query));
      //   if (result.hasException) {
      //     _btnController.error();
      //     AnimatedSnackBar.material(
      //       result.exception?.graphqlErrors[0].message ?? "Error",
      //       type: AnimatedSnackBarType.error,
      //     ).show(context);

      //     Future.delayed(const Duration(milliseconds: 1000)).then((value) {
      //       _btnController.reset();
      //     });
      //     return;
      //   }
      //   context.read<UserDataBloc>().add(UserDataEventLogout());
      HiveHelper.clearUserData();
      _btnController.success();
    } on PlatformException catch (e) {
      _btnController.error();
      AnimatedSnackBar.material(
        e.message ?? "Error",
        type: AnimatedSnackBarType.error,
      ).show(context);

      Future.delayed(const Duration(milliseconds: 1000)).then((value) {
        _btnController.reset();
      });
      return;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: SizedBox(
        width: double.infinity,
        height: 50,
        child: ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.red,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(25),
            ),
          ),
          onPressed: () async {
            final confirm = await showDialog<bool>(
              context: context,
              builder: (ctx) => AlertDialog(
                content: Text(
                  AppLocalizations.of(context)!.logout_confirm,
                  style: const TextStyle(fontSize: 16),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: Text(AppLocalizations.of(context)!.no_label),
                  ),
                  TextButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    child: Text(
                      AppLocalizations.of(context)!.yes_label,
                      style: const TextStyle(color: Colors.red),
                    ),
                  ),
                ],
              ),
            );
            if (confirm == true) {
              HiveHelper.clearUserData();
            }
          },
          child: Text(
            AppLocalizations.of(context)!.logout_btn,
            style: const TextStyle(fontSize: 16),
          ),
        ),
      ),
    );
  }
}
