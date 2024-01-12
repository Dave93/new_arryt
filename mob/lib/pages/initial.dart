import 'package:arryt/main.dart';
import 'package:arryt/models/api_client.dart';
import 'package:arryt/models/user_data.dart';
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
    return StreamBuilder<ApiClient>(
        stream: objectBox.getDefaultApiClientStream(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else {
            if (snapshot.hasData) {
              var apiClient = snapshot.data!;
              if (apiClient.isServiceDefault) {
                return StreamBuilder<List<UserData>>(
                    stream: objectBox.getUserDataStream(),
                    builder: (context, snapshot) {
                      if (snapshot.connectionState == ConnectionState.waiting) {
                        return const Center(child: CircularProgressIndicator());
                      } else {
                        if (snapshot.hasData) {
                          var userData = snapshot.data!;
                          if (userData.isNotEmpty) {
                            var accessToken = userData[0].accessToken;
                            if (accessToken != null && accessToken.isNotEmpty) {
                              return const HomeViewPage();
                            } else {
                              return const LoginTypePhonePage();
                            }
                          } else {
                            return const LoginTypePhonePage();
                          }
                        } else {
                          return const LoginTypePhonePage();
                        }
                      }
                    });
              } else {
                return const ApiClientChooseBrand();
              }
            } else {
              return const ApiClientChooseBrand();
            }
          }
        });
  }
}
