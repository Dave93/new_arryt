import 'package:arryt/main.dart';
import 'package:arryt/models/api_client.dart';
import 'package:arryt/models/user_data.dart';
import 'package:auto_route/auto_route.dart';
import 'package:flutter/material.dart';
import 'package:arryt/bloc/block_imports.dart';
import 'package:arryt/pages/login/type_phone.dart';
import 'package:hive/hive.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'api_client_intro/api_client_choose_brand.dart';
import 'home/view/home_page.dart';
import 'package:arryt/helpers/hive_helper.dart';

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
    return ValueListenableBuilder(
      valueListenable: HiveHelper.getApiClientBox().listenable(),
      builder: (context, Box<ApiClient> box, _) {
        ApiClient? apiClient = HiveHelper.getDefaultApiClient();

        if (apiClient != null && apiClient.isServiceDefault) {
          return ValueListenableBuilder(
            valueListenable: HiveHelper.getUserDataBox().listenable(),
            builder: (context, Box<UserData> userBox, _) {
              final userData = HiveHelper.getUserData();
              if (userData != null &&
                  userData.accessToken?.isNotEmpty == true) {
                return const HomeViewPage();
              } else {
                return const LoginTypePhonePage();
              }
            },
          );
        } else {
          return const ApiClientChooseBrand();
        }
      },
    );
  }
}
