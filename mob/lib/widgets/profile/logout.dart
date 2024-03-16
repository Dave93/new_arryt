import 'package:animated_snack_bar/animated_snack_bar.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:rounded_loading_button_plus/rounded_loading_button.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

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
      var client = GraphQLProvider.of(context).value;
      var query = gql('''
      mutation {
        logout()
      }
    ''');
      QueryResult result =
          await client.mutate(MutationOptions(document: query));
      if (result.hasException) {
        _btnController.error();
        AnimatedSnackBar.material(
          result.exception?.graphqlErrors[0].message ?? "Error",
          type: AnimatedSnackBarType.error,
        ).show(context);

        Future.delayed(const Duration(milliseconds: 1000)).then((value) {
          _btnController.reset();
        });
        return;
      }
      context.read<UserDataBloc>().add(UserDataEventLogout());
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
    return GestureDetector(
        child: RoundedLoadingButton(
            controller: _btnController,
            color: Colors.red,
            onPressed: () {
              _logout(context);
            },
            child: Text(
              AppLocalizations.of(context)!.logout_btn.toUpperCase(),
              style: const TextStyle(color: Colors.white),
            )));
  }
}
