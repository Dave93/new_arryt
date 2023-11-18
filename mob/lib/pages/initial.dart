import 'package:auto_route/auto_route.dart';
import 'package:flutter/material.dart';
import 'package:arryt/bloc/block_imports.dart';
import 'package:arryt/pages/login/type_phone.dart';
import 'api_client_intro/api_client_choose_brand.dart';
import 'home/view/home_page.dart';

@RoutePage()
class InitialPage extends StatelessWidget {
  const InitialPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return const _InitialPageView();
  }
}

class _InitialPageView extends StatelessWidget {
  const _InitialPageView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ApiClientsBloc, ApiClientsState>(
        builder: (context, apiState) {
      return BlocBuilder<UserDataBloc, UserDataState>(
          builder: (context, userDataState) {
        print(apiState.apiClients);
        if (apiState.apiClients.isEmpty) {
          return const ApiClientChooseBrand();
        } else {
          var accessToken = userDataState.accessToken;
          if (accessToken != null && accessToken.isNotEmpty) {
            return const HomeViewPage();
          } else {
            return const LoginTypePhonePage();
          }
          // return const Center(child: Text('Initial Page'));
        }
      });
    });
  }
}
