import 'package:arryt/helpers/hive_helper.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:arryt/models/user_data.dart';
import 'package:flutter/material.dart';
import 'package:arryt/l10n/app_localizations.dart';
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
    final l10n = AppLocalizations.of(context)!;
    final primaryColor = Theme.of(context).primaryColor;

    return Scaffold(
      body: SafeArea(
        child: DefaultTabController(
          length: 2,
          child: Scaffold(
            appBar: AppBar(
              toolbarHeight: 70,
              title: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(l10n.orders,
                      style: const TextStyle(
                          fontSize: 28, fontWeight: FontWeight.bold)),
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
                ],
              ),
              elevation: 0,
              backgroundColor: Colors.transparent,
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(48),
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: TabBar(
                    indicator: BoxDecoration(
                      color: primaryColor,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    indicatorSize: TabBarIndicatorSize.tab,
                    labelColor: Colors.white,
                    unselectedLabelColor: Colors.grey.shade600,
                    labelStyle: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                    unselectedLabelStyle: const TextStyle(
                      fontWeight: FontWeight.w500,
                      fontSize: 14,
                    ),
                    dividerHeight: 0,
                    tabs: [
                      Tab(text: l10n.order_tab_current),
                      Tab(text: l10n.order_tab_waiting),
                    ],
                  ),
                ),
              ),
            ),
            body: const Padding(
              padding: EdgeInsets.only(top: 8),
              child: TabBarView(
                physics: NeverScrollableScrollPhysics(),
                children: [
                  MyCurrentOrdersList(),
                  MyWaitingOrdersList(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
