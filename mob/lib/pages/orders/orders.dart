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
                      BlocBuilder<UserDataBloc, UserDataState>(
                        builder: (context, state) {
                          // if roles exist and courier role exists
                          // find role with code = courier
                          if (state.roles.any((element) =>
                              element.code == 'courier' && element.active)) {
                            return ApiGraphqlProvider(
                                child: const HomeViewWorkSwitch());
                          } else {
                            return const SizedBox();
                          }
                        },
                      )
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
                    labelColor: Colors.white,
                    unselectedLabelColor: Colors.black,
                    labelStyle: const TextStyle(
                      fontWeight: FontWeight.bold,
                    ),
                    indicator: RectangularIndicator(
                      color: Theme.of(context).primaryColor,
                      bottomLeftRadius: 30,
                      bottomRightRadius: 30,
                      topLeftRadius: 30,
                      topRightRadius: 30,
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
          body: Column(
            children: [
              ListenDeletedCurrentOrders(),
              // const ListenNewCurrentOrder(),
              ListenDeletedWaitingOrders(),
              const Expanded(
                child: TabBarView(
                  physics: NeverScrollableScrollPhysics(),
                  children: [
                    MyCurrentOrdersList(),
                    MyWaitingOrdersList(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    ));
  }
}
