import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:http/http.dart' as http;

import '../bloc/block_imports.dart';
import '../pages/api_client_intro/api_client_intro.dart';

class ApiGraphqlProvider extends StatelessWidget {
  Widget child;
  ApiGraphqlProvider({Key? key, required this.child}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return _ApiGraphqlProviderView(
      child: child,
    );
  }
}

class _ApiGraphqlProviderView extends StatelessWidget {
  Widget child;
  _ApiGraphqlProviderView({Key? key, required this.child}) : super(key: key);

  FutureOr<String> getBoxToken(BuildContext context) async {
    UserDataBloc userDataBloc = BlocProvider.of<UserDataBloc>(context);
    // compare if DateTime.now() is after userDataBloc.state.tokenExpires
    if (DateTime.now().isAfter(userDataBloc.state.tokenExpires)) {
      ApiClientsState apiClientsState =
          BlocProvider.of<ApiClientsBloc>(context).state;
      final apiClient = apiClientsState.apiClients.firstWhere(
          (element) => element.isServiceDefault == true,
          orElse: () => apiClientsState.apiClients.first);

      var requestBody = '''
      {
        "query": "mutation {refreshToken(refreshToken: \\"${userDataBloc.state.refreshToken}\\") {\\naccessToken\\naccessTokenExpires\\nrefreshToken\\n}}\\n",
        "variables": null
      }
      ''';

      var response = await http.post(
        Uri.parse("https://${apiClient.apiUrl}/graphql"),
        headers: {'Content-Type': 'application/json'},
        body: requestBody,
      );
      if (response.statusCode == 200) {
        var result = jsonDecode(response.body);
        if (result['errors'] == null) {
          var data = result['data']['refreshToken'];

          Future.delayed(const Duration(microseconds: 500), () {
            context.read<UserDataBloc>().add(
                  UserDataEventChange(
                    accessToken: data!['accessToken'],
                    accessTokenExpires: data!['accessTokenExpires'],
                    refreshToken: data!['refreshToken'],
                    permissions: userDataBloc.state.permissions,
                    roles: userDataBloc.state.roles,
                    userProfile: userDataBloc.state.userProfile,
                    is_online: userDataBloc.state.is_online,
                    tokenExpires: DateTime.now().add(Duration(
                        hours: int.parse(
                            data!['accessTokenExpires'].split('h')[0]))),
                  ),
                );
          });
          return 'Bearer ${data!['accessToken']}';
        }
      }
    }
    return 'Bearer ${userDataBloc.state.accessToken}';
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ApiClientsBloc, ApiClientsState>(
        builder: (context, state) {
      if (state.apiClients.isEmpty) {
        return const ApiClientIntroPage();
      } else {
        // find the first api client that is service default
        final apiClient = state.apiClients.firstWhere(
            (element) => element.isServiceDefault == true,
            orElse: () => state.apiClients.first);
        if (apiClient == null) {
          return const ApiClientIntroPage();
        } else {
          final HttpLink httpLink = HttpLink(
            'https://${apiClient.apiUrl}/graphql',
          );
          final AuthLink authLink = AuthLink(
            getToken: () async => await getBoxToken(context),
          );

          // final WebSocketLink wsLink = WebSocketLink(
          //   'wss://${apiClient.apiUrl}/ws',
          //   config: const SocketClientConfig(
          //     autoReconnect: true,
          //     inactivityTimeout: Duration(seconds: 30),
          //   ),
          //   subProtocol: GraphQLProtocol.graphqlTransportWs,
          // );

          final Link queryLink = authLink.concat(httpLink);

          final Link link =
              Link.split((request) => request.isSubscription, queryLink);

          ValueNotifier<GraphQLClient> client = ValueNotifier(
            GraphQLClient(
              link: link,
              // The default store is the InMemoryStore, which does NOT persist to disk
              cache: GraphQLCache(store: HiveStore()),
            ),
          );
          return GraphQLProvider(
            client: client,
            child: child,
          );
        }
      }
    });
  }
}
