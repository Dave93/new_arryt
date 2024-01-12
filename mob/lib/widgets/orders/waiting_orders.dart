import 'package:easy_refresh/easy_refresh.dart';
import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:keframe/keframe.dart';
import 'package:arryt/widgets/orders/waiting_order_card.dart';

import '../../bloc/block_imports.dart';
import '../../helpers/api_graphql_provider.dart';
import '../../main.dart';
import '../../models/new_order.dart';
import '../../models/waiting_order.dart';

class MyWaitingOrdersList extends StatelessWidget {
  const MyWaitingOrdersList({super.key});

  @override
  Widget build(BuildContext context) {
    return ApiGraphqlProvider(child: const MyWaitingOrdersListView());
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

  Future<void> _loadOrders() async {
    UserDataBloc userDataBloc = context.read<UserDataBloc>();
    var client = GraphQLProvider.of(context).value;
    var query = '''
      query {
        myNewOrdersRouted {
          id
          to_lat
          to_lon
          from_lat
          from_lon
          highlight
          pre_distance
          order_number
          order_price
          delivery_price
          delivery_address
          delivery_comment
          created_at
          payment_type
          orders_organization {
            id
            name
            icon_url
            active
            external_id
            support_chat_url
          }
          orders_customers {
            id
            name
            phone
          }
          orders_terminals {
            id
            name
          }
          orders_order_status {
            id
            name
            cancel
            finish
            on_way
            in_terminal
          }
        }
      }
    ''';
    var data = await client.query(
      QueryOptions(document: gql(query), fetchPolicy: FetchPolicy.noCache),
    );
    // var store = await ObjectBoxStore.getStore();
    if (data.data?['myNewOrdersRouted'] != null) {
      List<NewOrderModel> localOrders = [];
      data.data?['myNewOrdersRouted'].forEach((order) {
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
    return BlocBuilder<UserDataBloc, UserDataState>(builder: (context, state) {
      if (state.roles
          .any((element) => element.code == 'courier' && element.active)) {
        if (!state.is_online) {
          return Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 15.0, vertical: 10),
                child: Text(
                  AppLocalizations.of(context)!
                      .error_work_schedule_offline_title
                      .toUpperCase(),
                  style: Theme.of(context)
                      .textTheme
                      .headline5
                      ?.copyWith(fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10.0),
                child: Text(
                  AppLocalizations.of(context)!
                      .notice_torn_on_work_schedule_subtitle,
                  style: Theme.of(context).textTheme.subtitle1,
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          );
        } else {
          print('davr');
          return ApiGraphqlProvider(
              child: orders.isNotEmpty
                  ? EasyRefresh(
                      controller: _controller,
                      header: const BezierCircleHeader(),
                      onRefresh: () async {
                        await _loadOrders();
                        _controller.finishRefresh();
                        _controller.resetFooter();
                      },
                      child: SizeCacheWidget(
                        child: ListView.builder(
                          // shrinkWrap: true,
                          itemCount: orders.length,
                          itemBuilder: (context, index) {
                            return WaitingOrderCard(
                                order: orders[index],
                                onUpdate: () => _loadOrders());
                          },
                        ),
                      ),
                    )
                  : const Center(child: Text('Заказов нет')));
        }
      } else {
        return Text(AppLocalizations.of(context)!.you_are_not_courier,
            style: Theme.of(context).textTheme.headline6);
      }
    });
  }
}
