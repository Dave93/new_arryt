import 'package:arryt/helpers/api_server.dart';
import 'package:arryt/helpers/hive_helper.dart';
import 'package:arryt/helpers/mock_data.dart';
import 'package:arryt/models/user_data.dart';
import 'package:easy_refresh/easy_refresh.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:arryt/l10n/app_localizations.dart';
import 'package:hive/hive.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:keframe/keframe.dart';
import 'package:arryt/widgets/orders/waiting_order_card.dart';

import '../../main.dart';
import '../../models/new_order.dart';

class MyWaitingOrdersList extends StatelessWidget {
  const MyWaitingOrdersList({super.key});

  @override
  Widget build(BuildContext context) {
    return const MyWaitingOrdersListView();
  }
}

class MyWaitingOrdersListView extends StatefulWidget {
  const MyWaitingOrdersListView({super.key});

  @override
  State<MyWaitingOrdersListView> createState() =>
      _MyWaitingOrdersListViewState();
}

class _MyWaitingOrdersListViewState extends State<MyWaitingOrdersListView> {
  late EasyRefreshController _controller;
  List<NewOrderModel> orders = [];

  // Mock data only works in debug mode - NEVER in release builds
  // Set _enableMockInDebug to true to test with mock data during development
  static const bool _enableMockInDebug = false;
  static bool get _useMockData => kDebugMode && _enableMockInDebug;

  Future<void> _loadOrders() async {
    try {
      if (_useMockData) {
        // Use mock data for testing
        setState(() {
          orders = MockData.getMockWaitingOrders();
        });
        _controller.finishLoad(IndicatorResult.success);
        return;
      }

      ApiServer api = new ApiServer();
      var response = await api.get('/api/orders/my_new_orders', {});

      //   UserDataBloc userDataBloc = context.read<UserDataBloc>();
      //   var client = GraphQLProvider.of(context).value;
      //   var query = '''
      //   query {
      //     myNewOrdersRouted {
      //       id
      //       to_lat
      //       to_lon
      //       from_lat
      //       from_lon
      //       highlight
      //       pre_distance
      //       order_number
      //       order_price
      //       delivery_price
      //       delivery_address
      //       delivery_comment
      //       created_at
      //       payment_type
      //       orders_organization {
      //         id
      //         name
      //         icon_url
      //         active
      //         external_id
      //         support_chat_url
      //       }
      //       orders_customers {
      //         id
      //         name
      //         phone
      //       }
      //       orders_terminals {
      //         id
      //         name
      //       }
      //       orders_order_status {
      //         id
      //         name
      //         cancel
      //         finish
      //         on_way
      //         in_terminal
      //       }
      //     }
      //   }
      // ''';
      //   var data = await client.query(
      //     QueryOptions(document: gql(query), fetchPolicy: FetchPolicy.noCache),
      //   );
      // var store = await ObjectBoxStore.getStore();
      if (response.data != null && response.data.isNotEmpty) {
        List<NewOrderModel> localOrders = [];
        response.data.forEach((order) {
          NewOrderModel orderModel = NewOrderModel.fromMap(order);
          // if (order['next_buttons'] != null) {
          //   order['next_buttons'].forEach((button) {
          //     OrderNextButton orderNextButton = OrderNextButton.fromMap(button);
          //     orderModel.orderNextButton.add(orderNextButton);
          //   });
          // }
          localOrders.add(orderModel);
        });
        await objectBox.clearWaitingOrders();
        _controller.finishLoad(IndicatorResult.success);
        setState(() {
          orders = localOrders;
        });
      }
    } catch (e) {
      print(e);
    }
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
              if (!userData.is_online && !_useMockData) {
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
                    // Warning banner when using mock data
                    if (_useMockData)
                      Positioned(
                        top: 0,
                        left: 0,
                        right: 0,
                        child: Container(
                          color: Colors.red,
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: const Text(
                            '⚠️ MOCK DATA ENABLED - SET _enableMockInDebug = false ⚠️',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                    Padding(
                      padding: EdgeInsets.only(top: _useMockData ? 40 : 0),
                      child: EasyRefresh(
                        controller: _controller,
                        header: const BezierCircleHeader(),
                        onRefresh: () async {
                          await _loadOrders();
                          _controller.finishRefresh();
                          _controller.resetFooter();
                        },
                        child: orders.isNotEmpty
                            ? SizeCacheWidget(
                                child: ListView.builder(
                                // shrinkWrap: true,
                                itemCount: orders.length,
                                itemBuilder: (context, index) {
                                  return WaitingOrderCard(
                                      order: orders[index],
                                      onUpdate: () => _loadOrders());
                                },
                              ))
                            : ListView(
                                children: [
                                  ConstrainedBox(
                                    constraints: BoxConstraints(
                                      minHeight:
                                          MediaQuery.of(context).size.height *
                                              0.8,
                                    ),
                                    child: const IntrinsicHeight(
                                      child: Center(child: Text('Заказов нет')),
                                    ),
                                  )
                                ],
                              ),
                      ),
                    ),
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
