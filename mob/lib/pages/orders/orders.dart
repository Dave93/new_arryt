import 'package:arryt/main.dart';
import 'package:arryt/models/user_data.dart';
import 'package:arryt/objectbox.g.dart';
import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:arryt/bloc/block_imports.dart';
import 'package:arryt/helpers/api_graphql_provider.dart';
import 'package:arryt/widgets/orders/current_orders.dart';
import 'package:arryt/widgets/orders/waiting_orders.dart';
import 'package:tab_indicator_styler/tab_indicator_styler.dart';

import '../../widgets/orders/listen_deleted_current_order.dart';
import '../../widgets/orders/listen_deleted_waiting_order.dart';
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
                      StreamBuilder<List<UserData>>(
                          stream: objectBox.getUserDataStream(),
                          builder: (context, snapshot) {
                            if (snapshot.hasData) {
                              if (snapshot.data!.isNotEmpty) {
                                UserData user = snapshot.data!.first;
                                Role? userRole;
                                if (user.roles.isNotEmpty) {
                                  userRole = user.roles.first;
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
