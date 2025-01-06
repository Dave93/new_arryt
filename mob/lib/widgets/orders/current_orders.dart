import 'package:arryt/helpers/api_server.dart';
import 'package:arryt/helpers/hive_helper.dart';
import 'package:arryt/models/user_data.dart';
import 'package:easy_refresh/easy_refresh.dart';
import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:arryt/models/order_status.dart';
import 'package:arryt/models/terminals.dart';
import 'package:hive/hive.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:keframe/keframe.dart';

import '../../main.dart';
import '../../models/customer.dart';
import '../../models/order.dart';
import '../../models/order_next_button.dart';
import '../../models/organizations.dart';
import 'current_order_card.dart';

class MyCurrentOrdersList extends StatelessWidget {
  const MyCurrentOrdersList({super.key});

  @override
  Widget build(BuildContext context) {
    return const MyCurrentOrderListView();
  }
}

class MyCurrentOrderListView extends StatefulWidget {
  const MyCurrentOrderListView({super.key});

  @override
  State<MyCurrentOrderListView> createState() => _MyCurrentOrderListViewState();
}

class _MyCurrentOrderListViewState extends State<MyCurrentOrderListView> {
  late EasyRefreshController _controller;

  Future<void> _loadOrders() async {
    ApiServer api = new ApiServer();

    var response = await api.get('/api/orders/my_orders', {});

    List<OrderModel> orders = [];
    if (response.data != null && response.data.isNotEmpty) {
      response.data.forEach((order) {
        OrderStatus orderStatus = OrderStatus(
          identity: order['orders_order_status']['id'],
          name: order['orders_order_status']['name'],
          cancel: order['orders_order_status']['cancel'],
          finish: order['orders_order_status']['finish'],
          onWay: order['orders_order_status']['on_way'],
        );
        Terminals terminals = Terminals(
          identity: order['orders_terminals']['id'],
          name: order['orders_terminals']['name'],
        );
        Customer customer = Customer(
          identity: order['orders_customers']['id'],
          name: order['orders_customers']['name'],
          phone: order['orders_customers']['phone'],
        );
        Organizations organizations = Organizations(
            order['orders_organization']['id'],
            order['orders_organization']['name'],
            order['orders_organization']['active'],
            order['orders_organization']['icon_url'],
            order['orders_organization']['description'],
            order['orders_organization']['max_distance'],
            order['orders_organization']['max_active_orderCount'],
            order['orders_organization']['max_order_close_distance'],
            order['orders_organization']['support_chat_url']);
        OrderModel orderModel = OrderModel.fromMap(order);
        orderModel.customer.target = customer;
        orderModel.terminal.target = terminals;
        orderModel.orderStatus.target = orderStatus;
        orderModel.organization.target = organizations;
        if (order['next_buttons'] != null) {
          order['next_buttons'].forEach((button) {
            OrderNextButton orderNextButton = OrderNextButton.fromMap(button);
            orderModel.orderNextButton.add(orderNextButton);
          });
        }
        orders.add(orderModel);
      });
    }
    await objectBox.clearCurrentOrders();
    _controller.finishLoad(IndicatorResult.success);
    objectBox.addCurrentOrders(orders);
  }

  @override
  void initState() {
    // TODO: implement initState
    super.initState();
    _controller = EasyRefreshController(
      controlFinishRefresh: true,
      controlFinishLoad: true,
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadOrders();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<Box<UserData>>(
        valueListenable: HiveHelper.getUserDataBox().listenable(),
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
              if (!userData.is_online) {
                return Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 15.0, vertical: 10),
                      child: Text(
                        AppLocalizations.of(context)!
                            .error_work_schedule_offline_title
                            .toUpperCase(),
                        style: Theme.of(context)
                            .textTheme
                            .titleLarge
                            ?.copyWith(fontWeight: FontWeight.bold),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10.0),
                      child: Text(
                        AppLocalizations.of(context)!
                            .notice_torn_on_work_schedule_subtitle,
                        style: Theme.of(context).textTheme.titleMedium,
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                );
              } else {
                return Stack(
                  children: [
                    StreamBuilder<List<OrderModel>>(
                      stream: objectBox.getCurrentOrders(),
                      builder: (context, snapshot) {
                        return EasyRefresh(
                          controller: _controller,
                          header: const BezierCircleHeader(),
                          onRefresh: () async {
                            await _loadOrders();
                            _controller.finishRefresh();
                            _controller.resetFooter();
                          },
                          child: snapshot.hasData && snapshot.data!.isNotEmpty
                              ? SizeCacheWidget(
                                  child: ListView.builder(
                                    shrinkWrap: true,
                                    itemCount: snapshot.data!.length,
                                    itemBuilder: (context, index) {
                                      if (index == snapshot.data!.length - 1) {
                                        return Column(
                                          children: [
                                            CurrentOrderCard(
                                                order: snapshot.data![index]),
                                            const SizedBox(height: 100)
                                          ],
                                        );
                                      } else {
                                        return CurrentOrderCard(
                                            order: snapshot.data![index]);
                                      }
                                    },
                                  ),
                                )
                              : ListView(
                                  children: [
                                    ConstrainedBox(
                                      constraints: BoxConstraints(
                                        minHeight:
                                            MediaQuery.of(context).size.height *
                                                0.8,
                                      ),
                                      child: const IntrinsicHeight(
                                        child:
                                            Center(child: Text('Заказов нет')),
                                      ),
                                    )
                                  ],
                                ),
                        );
                      },
                    )
                    // const Positioned(
                    //     bottom: 20, left: 0, right: 0, child: BuildOrdersRoute())
                  ],
                );
              }
            } else {
              return Text(AppLocalizations.of(context)!.you_are_not_courier,
                  style: Theme.of(context).textTheme.titleLarge);
            }
          } else {
            return const SizedBox();
          }
        });
  }
}
