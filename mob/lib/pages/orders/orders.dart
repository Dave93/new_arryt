import 'package:arryt/helpers/hive_helper.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:arryt/models/user_data.dart';
import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:arryt/widgets/orders/current_orders.dart';
import 'package:arryt/widgets/orders/waiting_orders.dart';

import '../home/view/work_switch.dart';

class OrdersPage extends StatelessWidget {
  OrdersPage({super.key});

  bool checkCourier() {
    return true;
  }

  final subscriptionDocument = gql(
    r'''
    subscription orderUpdate($courierId: String!) {
      orderUpdate(courier_id: $courierId) {
        id
      }
    }
  ''',
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        body: SafeArea(
      child: DefaultTabController(
        length: 2,
        child: Scaffold(
          appBar: AppBar(
              toolbarHeight: 100,
              title: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 20),
                child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(AppLocalizations.of(context)!.orders,
                          style: const TextStyle(
                              color: Colors.black, fontSize: 35)),
                      ValueListenableBuilder<Box<UserData>>(
                          valueListenable:
                              HiveHelper.getUserDataBox().listenable(),
                          builder: (context, box, _) {
                            final userData = HiveHelper.getUserData();
                            if (userData != null) {
                              Role? userRole;
                              if (userData.roles.isNotEmpty) {
                                userRole = userData.roles.first;
                              }
                              if (userRole == null) {
                                return const SizedBox();
                              }

                              if (userRole.code == 'courier') {
                                return const HomeViewWorkSwitch();
                              } else {
                                return const SizedBox();
                              }
                            } else {
                              return const SizedBox();
                            }
                          }),
                    ]),
              ),
              elevation: 0,
              backgroundColor: Colors.transparent,
              primary: true,
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(20),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10.0),
                  child: TabBar(
                    labelStyle: const TextStyle(
                      fontWeight: FontWeight.bold,
                    ),
                    tabs: [
                      Tab(
                          text: AppLocalizations.of(context)!
                              .order_tab_current
                              .toUpperCase()),
                      Tab(
                          text: AppLocalizations.of(context)!
                              .order_tab_waiting
                              .toUpperCase()),
                    ],
                  ),
                ),
              )),
          body: const TabBarView(
            physics: NeverScrollableScrollPhysics(),
            children: [
              MyCurrentOrdersList(),
              MyWaitingOrdersList(),
            ],
          ),
        ),
      ),
    ));
  }
}
