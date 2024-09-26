import 'package:animated_snack_bar/animated_snack_bar.dart';
import 'package:arryt/helpers/api_graphql_provider.dart';
import 'package:arryt/models/user_data.dart';
import 'package:auto_route/auto_route.dart';
import 'package:auto_size_text/auto_size_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../bloc/block_imports.dart';

class NoRoleSet extends StatelessWidget {
  const NoRoleSet({super.key});

  @override
  Widget build(BuildContext context) {
    return ApiGraphqlProvider(child: const NoRoleSetView());
  }
}

class NoRoleSetView extends StatefulWidget {
  const NoRoleSetView({super.key});

  @override
  State<NoRoleSetView> createState() => _NoRoleSetViewState();
}

class _NoRoleSetViewState extends State<NoRoleSetView> {
  String adminPhone = '';

  Future<void> _loadAdminPhone() async {
    var query = gql('''
      query {
        systemConfigByKey(key: "admin_phone") {
          value
        }
      }
    ''');
    var client = GraphQLProvider.of(context).value;
    QueryResult result = await client.query(QueryOptions(document: query));
    // if (result.hasException) {
    //   AnimatedSnackBar.material(
    //     result.exception?.graphqlErrors[0].message ?? "Error",
    //     type: AnimatedSnackBarType.error,
    //   ).show(context);

    //   return;
    // }
    setState(() {
      adminPhone = result.data?['systemConfigByKey']['value'];
    });
  }

  Future<void> _logout(BuildContext context) async {
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
        AnimatedSnackBar.material(
          result.exception?.graphqlErrors[0].message ?? "Error",
          type: AnimatedSnackBarType.error,
        ).show(context);

        return;
      }
      context.read<UserDataBloc>().add(UserDataEventLogout());
    } on PlatformException catch (e) {
      AnimatedSnackBar.material(
        e.message ?? "Error",
        type: AnimatedSnackBarType.error,
      ).show(context);

      return;
    }
  }

  Future<void> _reloadUserData(BuildContext context) async {
    var query = gql('''
      mutation {
        reloadUserData {
          access {
            additionalPermissions
            roles {
                name
                code
                active
            }
          }
          token {
            accessToken
            accessTokenExpires
            refreshToken
            tokenType
          }
          user {
            first_name
            id
            is_super_user
            last_name
            is_online
            permissions {
              active
              slug
              id
            }
            phone
          }
        }
      }
    ''');
    var client = GraphQLProvider.of(context).value;
    QueryResult result = await client.mutate(MutationOptions(document: query));
    UserDataBloc userDataBloc = BlocProvider.of<UserDataBloc>(context);
    userDataBloc.add(UserDataEventChange(
      accessToken: result.data!['reloadUserData']['token']['accessToken'],
      refreshToken: result.data!['reloadUserData']['token']['refreshToken'],
      accessTokenExpires: result.data!['reloadUserData']['token']
          ['accessTokenExpires'],
      userProfile:
          UserProfileModel.fromMap(result.data!['reloadUserData']['user']),
      permissions: List.from(
          result.data!['reloadUserData']['access']['additionalPermissions']),
      roles: List<Role>.from(result.data!['reloadUserData']['access']['roles']
          .map((x) => Role.fromMap(x))
          .toList()),
      is_online: result.data!['reloadUserData']['user']['is_online'],
      // parse 1h to duration
      tokenExpires: DateTime.now().add(Duration(
          hours: int.parse(result.data!['reloadUserData']['token']
                  ['accessTokenExpires']
              .split('h')[0]))),
    ));

    AutoRouter.of(context).pushNamed('/home');
  }

  void _makePhoneCall(String phoneNumber) async {
    final Uri launchUri = Uri(
      scheme: 'tel',
      path: phoneNumber,
    );
    await launchUrl(launchUri);
  }

  @override
  void initState() {
    // TODO: implement initState
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadAdminPhone();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).primaryColor,
      body: SafeArea(
        child: Center(
          child: Column(
            children: [
              const Spacer(),
              AutoSizeText(
                AppLocalizations.of(context)!
                    .noRoleSet
                    .replaceAll(" ", "\n")
                    .toUpperCase(),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleLarge!.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(
                height: 10,
              ),
              ElevatedButton(
                  onPressed: () async {
                    _makePhoneCall(adminPhone);
                  },
                  style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green.shade400,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(30),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 50,
                        vertical: 15,
                      )),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.call),
                      const SizedBox(
                        width: 10,
                      ),
                      Text(AppLocalizations.of(context)!.callUs.toUpperCase()),
                    ],
                  )),
              Spacer(),
              ElevatedButton(
                  onPressed: () {
                    _reloadUserData(context);
                  },
                  style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: Theme.of(context).primaryColor,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(30),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 50,
                        vertical: 15,
                      )),
                  child: Text(
                      AppLocalizations.of(context)!.refresh.toUpperCase())),
              const SizedBox(height: 10),
              ElevatedButton(
                  onPressed: () {
                    _logout(context);
                  },
                  style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(30),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 50,
                        vertical: 15,
                      )),
                  child: AutoSizeText(
                    AppLocalizations.of(context)!.changeNumber.toUpperCase(),
                    maxLines: 3,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  )),
              const SizedBox(height: 20)
            ],
          ),
        ),
      ),
    );
  }
}
