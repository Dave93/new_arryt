import 'dart:async';
import 'dart:convert';

import 'package:animated_snack_bar/animated_snack_bar.dart';
import 'package:arryt/models/user_data.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:load_switch/load_switch.dart';
import 'package:arryt/bloc/block_imports.dart';
import 'package:http/http.dart' as http;

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
    UserDataBloc userDataBloc = BlocProvider.of<UserDataBloc>(context);
    var client = GraphQLProvider.of(context).value;
    UserDataState userDataState = context.read<UserDataBloc>().state;

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
        return userDataState.is_online;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      // Permissions are denied forever, handle appropriately.
      return userDataState.is_online;
    }

    Position currentPosition = await Geolocator.getCurrentPosition();
    print('get current position');
    if (userDataState.is_online) {
      var query = gql('''
      mutation {
        closeTimeEntry(lat_close: ${currentPosition.latitude}, lon_close: ${currentPosition.longitude}) {
          id
        }
      }
    ''');

      QueryResult result =
          await client.mutate(MutationOptions(document: query));
      if (result.hasException) {
        AnimatedSnackBar.material(
          result.exception?.graphqlErrors[0].message ?? "Error",
          type: AnimatedSnackBarType.error,
        ).show(context);
        return value;
      }

      if (result.data!['closeTimeEntry']['id'] != null) {
        BlocProvider.of<UserDataBloc>(context).add(UserDataEventChange(
          accessToken: userDataBloc.state.accessToken,
          is_online: false,
          accessTokenExpires: userDataBloc.state.accessTokenExpires,
          refreshToken: userDataBloc.state.refreshToken,
          permissions: userDataBloc.state.permissions,
          roles: userDataBloc.state.roles,
          userProfile: userDataBloc.state.userProfile,
          tokenExpires: userDataBloc.state.tokenExpires,
        ));
        // positionStream?.cancel();
        // setState(() {
        //   positionStream = null;
        // });
        return false;
      }
    } else {
      var query = gql('''
      mutation {
        openTimeEntry(lat_open: ${currentPosition.latitude}, lon_open: ${currentPosition.longitude}) {
          id
        }
      }
    ''');
      QueryResult result =
          await client.mutate(MutationOptions(document: query));

      if (result.hasException) {
        AnimatedSnackBar.material(
          result.exception?.graphqlErrors[0].message ?? "Error",
          type: AnimatedSnackBarType.error,
        ).show(context);
        return value;
      }

      if (result.data!['openTimeEntry']['id'] != null) {
        ApiClientsState apiClientsState =
            BlocProvider.of<ApiClientsBloc>(context).state;
        final apiClient = apiClientsState.apiClients.firstWhere(
            (element) => element.isServiceDefault == true,
            orElse: () => apiClientsState.apiClients.first);
        BlocProvider.of<UserDataBloc>(context).add(UserDataEventChange(
          accessToken: userDataBloc.state.accessToken,
          is_online: true,
          accessTokenExpires: userDataBloc.state.accessTokenExpires,
          refreshToken: userDataBloc.state.refreshToken,
          permissions: userDataBloc.state.permissions,
          roles: userDataBloc.state.roles,
          userProfile: userDataBloc.state.userProfile,
          tokenExpires: userDataBloc.state.tokenExpires,
        ));
        // const LocationSettings locationSettings = LocationSettings(
        //   accuracy: LocationAccuracy.bestForNavigation,
        //   distanceFilter: 2,
        // );

        // positionStream =
        //     Geolocator.getPositionStream(locationSettings: locationSettings)
        //         .listen((Position? position) async {
        //   var query = gql('''mutation {
        //     storeLocation(latitude: ${position!.latitude}, longitude: ${position.longitude}) {
        //       success
        //       }
        //       },''');
        //   QueryResult result =
        //       await client.mutate(MutationOptions(document: query));
        // });

        return true;
      }
    }
    return !value;
  }

  Future<void> checkCurrentStatus() async {
    setState(() {
      isCheckingFromServer = true;
    });
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
    if (result.hasException) {
      print(result.exception);
      setState(() {
        isCheckingFromServer = false;
      });
    } else {
      setState(() {
        value = result.data!['reloadUserData']['user']['is_online'];
      });
      BlocProvider.of<UserDataBloc>(context).add(UserDataEventChange(
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
      setState(() {
        isCheckingFromServer = false;
      });
    }
  }

  @override
  void initState() {
    // TODO: implement initState
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      checkCurrentStatus();
    });
  }

  @override
  void dispose() {
    // TODO: implement dispose
    positionStream?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<UserDataBloc, UserDataState>(
      builder: (context, state) {
        return Container(
          child: isCheckingFromServer
              ? const SizedBox()
              : LoadSwitch(
                  value: state.is_online,
                  future: () async {
                    return await _toggleWork(context);
                  },
                  onChange: (v) {
                    value = v;
                    setState(() {});
                  },
                  onTap: (bool) {},
                ),
        );
      },
    );
  }
}
