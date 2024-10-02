import 'package:animated_snack_bar/animated_snack_bar.dart';
import 'package:arryt/helpers/api_graphql_provider.dart';
import 'package:arryt/helpers/api_server.dart';
import 'package:arryt/models/couriers.dart';
import 'package:auto_route/auto_route.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:currency_formatter/currency_formatter.dart';
import 'package:easy_refresh/easy_refresh.dart';
import 'package:expandable/expandable.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:intl/intl.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:loading_overlay/loading_overlay.dart';
import 'package:modal_bottom_sheet/modal_bottom_sheet.dart';

// ignore: depend_on_referenced_packages
import 'package:syncfusion_flutter_core/localizations.dart';

///Date picker imports
import 'package:syncfusion_flutter_datepicker/datepicker.dart' as picker;
import 'package:syncfusion_flutter_datepicker/datepicker.dart';

import '../../models/customer.dart';
import '../../models/order.dart';
import '../../models/order_status.dart';
import '../../models/organizations.dart';
import '../../models/terminals.dart';
import '../../widgets/orders/orders_items.dart';

class OrdersHistory extends StatelessWidget {
  const OrdersHistory({super.key});

  @override
  Widget build(BuildContext context) {
    return const OrdersHistoryView();
  }
}

class OrdersHistoryView extends StatefulWidget {
  const OrdersHistoryView({super.key});

  @override
  State<OrdersHistoryView> createState() => _OrdersHistoryViewState();
}

class _OrdersHistoryViewState extends State<OrdersHistoryView> {
  late EasyRefreshController _controller;
  CurrencyFormatterSettings euroSettings = CurrencyFormatterSettings(
    symbol: 'сум',
    symbolSide: SymbolSide.right,
    thousandSeparator: ' ',
    decimalSeparator: ',',
    symbolSeparator: ' ',
  );
  DateTime _startDate = DateTime.now();
  DateTime _endDate = DateTime.now().add(const Duration(days: 1));
  final int _value = 1;
  late bool _isLastPage;
  late int _pageNumber;
  late bool _error;
  late bool _loading;
  late int _numberOfPostsPerRequest;
  late List<OrderModel> _posts;
  late ScrollController _scrollController;
  final TextEditingController phoneSearchController = TextEditingController();
  String filterPhone = '';

  Future<void> _loadOrders(bool reload) async {
    // var client = GraphQLProvider.of(context).value;
    setState(() {
      _loading = true;
    });
    ApiServer api = new ApiServer();
    var response = await api.post('/api/orders/my_history', {
      'startDate': _startDate.toString(),
      'endDate': _endDate.toString(),
      'page': _pageNumber,
      'limit': _numberOfPostsPerRequest
    });
    setState(() {
      _loading = false;
    });
    if (response.statusCode != 200) {
      return AnimatedSnackBar.material(
        response.data['message'] ?? "Error",
        type: AnimatedSnackBarType.error,
      ).show(context);
    } else {
      if (response.data != null && response.data['totalCount'] != null) {
        var orders = response.data['orders'] as List;
        var totalCount = int.parse(response.data['totalCount']);
        if (_posts.length + orders.length >= totalCount) {
          setState(() {
            _isLastPage = true;
          });
        } else {
          setState(() {
            _isLastPage = false;
          });
        }

        List<OrderModel> tempOrders = [];
        for (var order in orders) {
          OrderStatus orderStatus = OrderStatus(
            identity: order['orders_order_status']['id'],
            name: order['orders_order_status']['name'],
            cancel: order['orders_order_status']['cancel'],
            finish: order['orders_order_status']['finish'],
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
          Couriers courier = Couriers(
            identity: order['orders_couriers']['id'],
            firstName: order['orders_couriers']['first_name'],
            lastName: order['orders_couriers']['last_name'],
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
          orderModel.courier.target = courier;
          tempOrders.add(orderModel);
        }
        setState(() {
          if (reload) {
            _posts = tempOrders;
          } else {
            _posts.addAll(tempOrders);
          }
          _loading = false;
        });
      }
    }
    // var query = r'''
    //   query myOrdersHistory($startDate: Date!, $endDate: Date!, $page: Int!, $limit: Int!) {
    //     myOrdersHistory(startDate: $startDate, endDate: $endDate, page: $page, limit: $limit) {
    //       orders {
    //         id
    //         to_lat
    //         to_lon
    //         from_lat
    //         from_lon
    //         pre_distance
    //         order_number
    //         order_price
    //         delivery_price
    //         delivery_address
    //         delivery_comment
    //         created_at
    //         payment_type
    //         orders_organization {
    //           id
    //           name
    //           icon_url
    //           active
    //           external_id
    //           support_chat_url
    //         }
    //         orders_customers {
    //           id
    //           name
    //           phone
    //         }
    //         orders_terminals {
    //           id
    //           name
    //         }
    //         orders_order_status {
    //           id
    //           name
    //           cancel
    //           finish
    //           on_way
    //           in_terminal
    //         }
    //         orders_couriers {
    //           id
    //           first_name
    //           last_name
    //         }
    //       }
    //       totalCount
    //     }
    //   }
    // ''';

    // var data = await client.query(QueryOptions(
    //     document: gql(query),
    //     fetchPolicy: FetchPolicy.noCache,
    //     variables: {
    //       'startDate': _startDate.toString(),
    //       'endDate': _endDate.toString(),
    //       'page': _pageNumber,
    //       'limit': _numberOfPostsPerRequest
    //     }));

    // if (data.hasException) {
    //   setState(() {
    //     _error = true;
    //     _loading = false;
    //   });
    // } else {
    //   var orders = data.data!['myOrdersHistory']['orders'] as List;
    //   var totalCount = data.data!['myOrdersHistory']['totalCount'] as int;
    //   if (_posts.length + orders.length >= totalCount) {
    //     setState(() {
    //       _isLastPage = true;
    //     });
    //   } else {
    //     setState(() {
    //       _isLastPage = false;
    //     });
    //   }
    //   List<OrderModel> tempOrders = [];
    //   for (var order in orders) {
    //     OrderStatus orderStatus = OrderStatus(
    //       identity: order['orders_order_status']['id'],
    //       name: order['orders_order_status']['name'],
    //       cancel: order['orders_order_status']['cancel'],
    //       finish: order['orders_order_status']['finish'],
    //     );
    //     Terminals terminals = Terminals(
    //       identity: order['orders_terminals']['id'],
    //       name: order['orders_terminals']['name'],
    //     );
    //     Customer customer = Customer(
    //       identity: order['orders_customers']['id'],
    //       name: order['orders_customers']['name'],
    //       phone: order['orders_customers']['phone'],
    //     );
    //     Couriers courier = Couriers(
    //       identity: order['orders_couriers']['id'],
    //       firstName: order['orders_couriers']['first_name'],
    //       lastName: order['orders_couriers']['last_name'],
    //     );
    //     Organizations organizations = Organizations(
    //         order['orders_organization']['id'],
    //         order['orders_organization']['name'],
    //         order['orders_organization']['active'],
    //         order['orders_organization']['icon_url'],
    //         order['orders_organization']['description'],
    //         order['orders_organization']['max_distance'],
    //         order['orders_organization']['max_active_orderCount'],
    //         order['orders_organization']['max_order_close_distance'],
    //         order['orders_organization']['support_chat_url']);
    //     OrderModel orderModel = OrderModel.fromMap(order);
    //     orderModel.customer.target = customer;
    //     orderModel.terminal.target = terminals;
    //     orderModel.orderStatus.target = orderStatus;
    //     orderModel.organization.target = organizations;
    //     orderModel.courier.target = courier;
    //     tempOrders.add(orderModel);
    //   }
    //   setState(() {
    //     if (reload) {
    //       _posts = tempOrders;
    //     } else {
    //       _posts.addAll(tempOrders);
    //     }
    //     _loading = false;
    //   });
    // }
  }

  /// Update the selected date for the date range picker based on the date selected,
  /// when the trip mode set one way.
  void _onSelectedDateChanged(DateTime date) {
    if (date == _startDate) {
      return;
    }

    setState(() {
      final Duration difference = _endDate.difference(_startDate);
      _startDate = DateTime(date.year, date.month, date.day);
      _endDate = _startDate.add(difference);
      _pageNumber = 1;
    });
    SchedulerBinding.instance.addPostFrameCallback((_) {
      _loadOrders(true);
    });
  }

  /// Update the selected range based on the range selected in the pop up editor,
  /// when the trip mode set as round trip.
  void _onSelectedRangeChanged(picker.PickerDateRange dateRange) {
    final DateTime startDateValue = dateRange.startDate!;
    final DateTime endDateValue = dateRange.endDate ?? startDateValue;
    setState(() {
      if (startDateValue.isAfter(endDateValue)) {
        _startDate = endDateValue;
        _endDate = startDateValue;
      } else {
        _startDate = startDateValue;
        _endDate = endDateValue;
      }
      _pageNumber = 1;
    });
    SchedulerBinding.instance.addPostFrameCallback((_) {
      _loadOrders(true);
    });
  }

  @override
  void initState() {
    DateTime now = DateTime.now();
    int currentDay = now.weekday;
    _startDate = now.subtract(Duration(days: currentDay - 1));
    _endDate = now.add(Duration(days: 7 - currentDay));
    _pageNumber = 1;
    _posts = [];
    _isLastPage = false;
    _loading = true;
    _error = false;
    _numberOfPostsPerRequest = 100;
    _scrollController = ScrollController();
    // TODO: implement initState
    super.initState();
    Intl.defaultLocale = "ru";
    _controller = EasyRefreshController(
      controlFinishRefresh: true,
      controlFinishLoad: true,
    );
    initializeDateFormatting();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadOrders(true);
    });
  }

  @override
  void dispose() {
    // TODO: implement dispose
    super.dispose();
    _scrollController.dispose();
  }

  @override
  Widget build(BuildContext context) {
    _scrollController.addListener(() {
      var nextPageTrigger = 0.7 * _scrollController.position.maxScrollExtent;
      if (_scrollController.position.pixels > nextPageTrigger && !_isLastPage) {
        _pageNumber++;
        _loadOrders(false);
      }
    });

    List<OrderModel> resultPosts = _posts;

    if (_posts.isNotEmpty) {
      resultPosts = _posts
          .where((element) => element.customer.target!.phone
              .toLowerCase()
              .contains(filterPhone.toLowerCase()))
          .toList();
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(AppLocalizations.of(context)!.ordersHistory.toUpperCase()),
      ),
      body: LoadingOverlay(
        isLoading: _loading,
        child: Padding(
          padding: const EdgeInsets.only(top: 10, left: 10, right: 10),
          child: Column(children: [
            Row(children: <Widget>[
              Expanded(
                  flex: 5,
                  child: RawMaterialButton(
                      padding: const EdgeInsets.all(5),
                      onPressed: () async {
                        if (_value == 0) {
                          final DateTime? date = await showDialog<DateTime?>(
                              context: context,
                              builder: (BuildContext context) {
                                return DateRangePicker(_startDate, null,
                                    displayDate: _startDate);
                              });
                          if (date != null) {
                            _onSelectedDateChanged(date);
                          }
                        } else {
                          final picker.PickerDateRange? range =
                              await showDialog<picker.PickerDateRange?>(
                                  context: context,
                                  builder: (BuildContext context) {
                                    return DateRangePicker(
                                        null,
                                        picker.PickerDateRange(
                                          _startDate,
                                          _endDate,
                                        ),
                                        displayDate: _startDate);
                                  });

                          if (range != null) {
                            _onSelectedRangeChanged(range);
                          }
                        }
                      },
                      child: Container(
                          alignment: Alignment.topCenter,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              const Text('От',
                                  style: TextStyle(
                                      color: Colors.grey, fontSize: 10)),
                              Padding(
                                padding: const EdgeInsets.fromLTRB(0, 5, 5, 0),
                                child: Text(
                                    DateFormat('dd MMM yyyy')
                                        .format(_startDate),
                                    style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w500)),
                              ),
                            ],
                          )))),
              Expanded(
                  flex: 5,
                  child: RawMaterialButton(
                      padding: const EdgeInsets.all(5),
                      onPressed: _value == 0
                          ? null
                          : () async {
                              final picker.PickerDateRange? range =
                                  await showDialog<picker.PickerDateRange>(
                                      context: context,
                                      builder: (BuildContext context) {
                                        return DateRangePicker(
                                            null,
                                            picker.PickerDateRange(
                                                _startDate, _endDate),
                                            displayDate: _endDate);
                                      });

                              if (range != null) {
                                _onSelectedRangeChanged(range);
                              }
                            },
                      child: Container(
                          padding: EdgeInsets.zero,
                          alignment: Alignment.topCenter,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: _value == 0
                                ? <Widget>[
                                    const Text('До',
                                        style: TextStyle(
                                            fontSize: 16,
                                            color: Colors.grey,
                                            fontWeight: FontWeight.w500))
                                  ]
                                : <Widget>[
                                    const Text('До',
                                        style: TextStyle(
                                            color: Colors.grey, fontSize: 10)),
                                    Padding(
                                      padding:
                                          const EdgeInsets.fromLTRB(0, 5, 5, 0),
                                      child: Text(
                                          DateFormat('dd MMM yyyy')
                                              .format(_endDate),
                                          style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w500)),
                                    ),
                                  ],
                          ))))
            ]),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 5),
              child: TextField(
                  controller: phoneSearchController,
                  autofocus: false,
                  onChanged: (value) {
                    setState(() {
                      filterPhone = value;
                    });
                  },
                  keyboardType: TextInputType.phone,
                  decoration: InputDecoration(
                      labelText: AppLocalizations.of(context)!
                          .orderListPhoneFieldLabel,
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20),
                          borderSide: BorderSide(
                              width: 2,
                              color: Theme.of(context).primaryColor)))),
            ),
            _posts.isEmpty
                ? Expanded(
                    child: Center(
                        child: Text(AppLocalizations.of(context)!.noOrders)))
                : Expanded(
                    child: EasyRefresh(
                      controller: _controller,
                      header: const BezierCircleHeader(),
                      onRefresh: () async {
                        await _loadOrders(true);
                        _controller.finishRefresh();
                        _controller.resetFooter();
                      },
                      child: ListView.builder(
                          controller: _scrollController,
                          shrinkWrap: true,
                          itemCount: resultPosts.length,
                          itemBuilder: (context, index) {
                            OrderModel element = resultPosts[index];
                            return Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              child: ExpandablePanel(
                                  header: Container(
                                    color: Colors.grey[200],
                                    child: Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        element.organization.target != null &&
                                                element.organization.target!
                                                        .iconUrl !=
                                                    null
                                            ? Padding(
                                                padding:
                                                    const EdgeInsets.all(8.0),
                                                child: CachedNetworkImage(
                                                  height: 30,
                                                  imageUrl: element.organization
                                                      .target!.iconUrl!,
                                                  progressIndicatorBuilder: (context,
                                                          url,
                                                          downloadProgress) =>
                                                      CircularProgressIndicator(
                                                          value:
                                                              downloadProgress
                                                                  .progress),
                                                  errorWidget: (context, url,
                                                          error) =>
                                                      const Icon(Icons.error),
                                                ),
                                              )
                                            : const SizedBox(width: 0),
                                        Padding(
                                          padding: const EdgeInsets.all(8.0),
                                          child: Text(
                                            "#${element.order_number}",
                                            style: const TextStyle(
                                                fontSize: 20,
                                                fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                        Padding(
                                          padding: const EdgeInsets.all(8.0),
                                          child: Text(
                                            DateFormat('dd.MM.yyyy HH:mm')
                                                .format(DateTime.parse(element
                                                        .created_at
                                                        .toString())
                                                    .toLocal()),
                                            style: const TextStyle(
                                                fontSize: 20,
                                                fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  collapsed: Column(children: [
                                    Padding(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 10.0, vertical: 4.0),
                                        child: Column(
                                          children: [
                                            Row(
                                              mainAxisAlignment:
                                                  MainAxisAlignment
                                                      .spaceBetween,
                                              children: [
                                                Text(
                                                  AppLocalizations.of(context)!
                                                      .courierName,
                                                  style: const TextStyle(
                                                      fontWeight:
                                                          FontWeight.bold),
                                                ),
                                                Text(
                                                    "${element.courier.target!.firstName} ${element.courier.target!.lastName}"),
                                              ],
                                            ),
                                            Row(
                                              mainAxisAlignment:
                                                  MainAxisAlignment
                                                      .spaceBetween,
                                              children: [
                                                Text(
                                                  AppLocalizations.of(context)!
                                                      .customer_name,
                                                  style: const TextStyle(
                                                      fontWeight:
                                                          FontWeight.bold),
                                                ),
                                                Text(element
                                                    .customer.target!.name),
                                              ],
                                            ),
                                            Row(
                                              mainAxisAlignment:
                                                  MainAxisAlignment
                                                      .spaceBetween,
                                              children: [
                                                Text(
                                                  AppLocalizations.of(context)!
                                                      .customer_phone,
                                                  style: const TextStyle(
                                                      fontWeight:
                                                          FontWeight.bold),
                                                ),
                                                Text(element
                                                    .customer.target!.phone),
                                              ],
                                            ),
                                            Row(
                                              mainAxisAlignment:
                                                  MainAxisAlignment
                                                      .spaceBetween,
                                              children: [
                                                Flexible(
                                                    child: Text(
                                                  element.terminal.target!.name,
                                                  maxLines: 4,
                                                  style: const TextStyle(
                                                      fontWeight:
                                                          FontWeight.bold),
                                                )),
                                                Flexible(
                                                  fit: FlexFit.loose,
                                                  child: Text(
                                                    element.delivery_address ??
                                                        '',
                                                    style: const TextStyle(
                                                        fontWeight:
                                                            FontWeight.bold),
                                                  ),
                                                ),
                                              ],
                                            ),
                                            Row(
                                              mainAxisAlignment:
                                                  MainAxisAlignment
                                                      .spaceBetween,
                                              children: [
                                                Text(
                                                  AppLocalizations.of(context)!
                                                      .order_total_price,
                                                  style: const TextStyle(
                                                      fontWeight:
                                                          FontWeight.bold,
                                                      fontSize: 20),
                                                ),
                                                Text(
                                                  CurrencyFormatter.format(
                                                      element.order_price,
                                                      euroSettings),
                                                  style: const TextStyle(
                                                      fontWeight:
                                                          FontWeight.bold,
                                                      fontSize: 20),
                                                ),
                                              ],
                                            ),
                                            Row(
                                              mainAxisAlignment:
                                                  MainAxisAlignment
                                                      .spaceBetween,
                                              children: [
                                                Text(
                                                  AppLocalizations.of(context)!
                                                      .delivery_price,
                                                  style: const TextStyle(
                                                      fontWeight:
                                                          FontWeight.bold,
                                                      fontSize: 20),
                                                ),
                                                Text(
                                                  CurrencyFormatter.format(
                                                      element.delivery_price,
                                                      euroSettings),
                                                  style: const TextStyle(
                                                      fontWeight:
                                                          FontWeight.bold,
                                                      fontSize: 20),
                                                ),
                                              ],
                                            ),
                                            Row(
                                              mainAxisAlignment:
                                                  MainAxisAlignment
                                                      .spaceBetween,
                                              children: [
                                                Text(
                                                  AppLocalizations.of(context)!
                                                      .payment_type,
                                                  style: const TextStyle(
                                                      fontSize: 20),
                                                ),
                                                Text(
                                                  element.paymentType
                                                          ?.toUpperCase() ??
                                                      '',
                                                  style: const TextStyle(
                                                      fontSize: 20),
                                                ),
                                              ],
                                            ),
                                          ],
                                        )),
                                    const SizedBox(
                                      height: 5,
                                    ),
                                    Container(
                                      color: Theme.of(context).primaryColor,
                                      child: IntrinsicHeight(
                                        child: Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceAround,
                                          children: [
                                            GestureDetector(
                                              onTap: () {
                                                AutoRouter.of(context).pushNamed(
                                                    '/order/customer-comments/${element.customer.target!.identity}/${element.identity}');
                                              },
                                              child: Padding(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                        vertical: 15.0),
                                                child: Text(
                                                  AppLocalizations.of(context)!
                                                      .order_card_comments
                                                      .toUpperCase(),
                                                  style: Theme.of(context)
                                                      .textTheme
                                                      .titleMedium
                                                      ?.copyWith(
                                                          fontSize: 14,
                                                          color: Colors.white),
                                                ),
                                              ),
                                            ),
                                            const VerticalDivider(
                                              color: Colors.white,
                                              thickness: 1,
                                              width: 1,
                                            ),
                                            GestureDetector(
                                              onTap: () {
                                                showBarModalBottomSheet(
                                                  context: context,
                                                  expand: false,
                                                  builder: (context) =>
                                                      ApiGraphqlProvider(
                                                    child: OrderItemsTable(
                                                      orderId: element.identity,
                                                    ),
                                                  ),
                                                );
                                              },
                                              child: Padding(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                        vertical: 15.0),
                                                child: Text(
                                                    AppLocalizations.of(
                                                            context)!
                                                        .order_card_items
                                                        .toUpperCase(),
                                                    style: Theme.of(context)
                                                        .textTheme
                                                        .titleMedium
                                                        ?.copyWith(
                                                            fontSize: 14,
                                                            color:
                                                                Colors.white)),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ]),
                                  expanded: Column(
                                    children: [
                                      Padding(
                                          padding: const EdgeInsets.all(8.0),
                                          child: Column(
                                            children: [
                                              Row(
                                                mainAxisAlignment:
                                                    MainAxisAlignment
                                                        .spaceBetween,
                                                children: [
                                                  Text(
                                                    AppLocalizations.of(
                                                            context)!
                                                        .courierName,
                                                    style: const TextStyle(
                                                        fontWeight:
                                                            FontWeight.bold),
                                                  ),
                                                  Text(
                                                      "${element.courier.target!.firstName} ${element.courier.target!.lastName}"),
                                                ],
                                              ),
                                              Row(
                                                mainAxisAlignment:
                                                    MainAxisAlignment
                                                        .spaceBetween,
                                                children: [
                                                  Text(
                                                    AppLocalizations.of(
                                                            context)!
                                                        .customer_name,
                                                    style: const TextStyle(
                                                        fontWeight:
                                                            FontWeight.bold),
                                                  ),
                                                  Text(element
                                                      .customer.target!.name),
                                                ],
                                              ),
                                              Row(
                                                mainAxisAlignment:
                                                    MainAxisAlignment
                                                        .spaceBetween,
                                                children: [
                                                  Text(
                                                    AppLocalizations.of(
                                                            context)!
                                                        .customer_phone,
                                                    style: const TextStyle(
                                                        fontWeight:
                                                            FontWeight.bold),
                                                  ),
                                                  Text(element
                                                      .customer.target!.phone),
                                                ],
                                              ),
                                              Row(
                                                mainAxisAlignment:
                                                    MainAxisAlignment
                                                        .spaceBetween,
                                                children: [
                                                  Text(
                                                    AppLocalizations.of(
                                                            context)!
                                                        .address,
                                                    style: const TextStyle(
                                                        fontWeight:
                                                            FontWeight.bold),
                                                  ),
                                                  const Spacer(),
                                                  Flexible(
                                                    fit: FlexFit.loose,
                                                    child: Text(
                                                      element.delivery_address ??
                                                          '',
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              Row(
                                                mainAxisAlignment:
                                                    MainAxisAlignment
                                                        .spaceBetween,
                                                children: [
                                                  Text(
                                                    AppLocalizations.of(
                                                            context)!
                                                        .pre_distance_label,
                                                    style: const TextStyle(
                                                        fontWeight:
                                                            FontWeight.bold),
                                                  ),
                                                  Text(
                                                      "${(element.pre_distance).toStringAsFixed(4)} км"),
                                                ],
                                              ),
                                            ],
                                          )),
                                      Padding(
                                          padding: const EdgeInsets.symmetric(
                                              vertical: 8.0, horizontal: 10),
                                          child: Row(
                                            mainAxisAlignment:
                                                MainAxisAlignment.spaceBetween,
                                            children: [
                                              Flexible(
                                                  child: Text(
                                                element.terminal.target!.name,
                                                maxLines: 4,
                                                style: const TextStyle(
                                                    fontWeight:
                                                        FontWeight.bold),
                                              )),
                                              Flexible(
                                                  child: Text(
                                                element.delivery_address ?? '',
                                                maxLines: 4,
                                                style: const TextStyle(
                                                    fontWeight:
                                                        FontWeight.bold),
                                              )),
                                            ],
                                          )),
                                      Padding(
                                          padding: const EdgeInsets.all(8.0),
                                          child: Column(
                                            children: [
                                              Row(
                                                mainAxisAlignment:
                                                    MainAxisAlignment
                                                        .spaceBetween,
                                                children: [
                                                  Text(
                                                    AppLocalizations.of(
                                                            context)!
                                                        .order_total_price,
                                                    style: const TextStyle(
                                                        fontWeight:
                                                            FontWeight.bold,
                                                        fontSize: 20),
                                                  ),
                                                  Text(
                                                    CurrencyFormatter.format(
                                                        element.order_price,
                                                        euroSettings),
                                                    style: const TextStyle(
                                                        fontWeight:
                                                            FontWeight.bold,
                                                        fontSize: 20),
                                                  ),
                                                ],
                                              ),
                                              Row(
                                                mainAxisAlignment:
                                                    MainAxisAlignment
                                                        .spaceBetween,
                                                children: [
                                                  Text(
                                                    AppLocalizations.of(
                                                            context)!
                                                        .delivery_price,
                                                    style: const TextStyle(
                                                        fontWeight:
                                                            FontWeight.bold,
                                                        fontSize: 20),
                                                  ),
                                                  Text(
                                                    CurrencyFormatter.format(
                                                        element.delivery_price,
                                                        euroSettings),
                                                    style: const TextStyle(
                                                        fontWeight:
                                                            FontWeight.bold,
                                                        fontSize: 20),
                                                  ),
                                                ],
                                              ),
                                              Row(
                                                mainAxisAlignment:
                                                    MainAxisAlignment
                                                        .spaceBetween,
                                                children: [
                                                  Text(
                                                    AppLocalizations.of(
                                                            context)!
                                                        .order_status_label,
                                                    style: const TextStyle(
                                                        fontWeight:
                                                            FontWeight.bold,
                                                        fontSize: 20),
                                                  ),
                                                  Text(
                                                    element.orderStatus.target!
                                                        .name,
                                                    style: const TextStyle(
                                                        fontWeight:
                                                            FontWeight.bold,
                                                        fontSize: 20),
                                                  ),
                                                ],
                                              ),
                                              Row(
                                                mainAxisAlignment:
                                                    MainAxisAlignment
                                                        .spaceBetween,
                                                children: [
                                                  Text(
                                                    AppLocalizations.of(
                                                            context)!
                                                        .payment_type,
                                                    style: const TextStyle(
                                                        fontSize: 20),
                                                  ),
                                                  Text(
                                                    element.paymentType
                                                            ?.toUpperCase() ??
                                                        '',
                                                    style: const TextStyle(
                                                        fontSize: 20),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          )),
                                      const SizedBox(
                                        height: 5,
                                      ),
                                      Container(
                                        color: Theme.of(context).primaryColor,
                                        child: IntrinsicHeight(
                                          child: Row(
                                            mainAxisAlignment:
                                                MainAxisAlignment.spaceAround,
                                            children: [
                                              GestureDetector(
                                                onTap: () {
                                                  AutoRouter.of(context).pushNamed(
                                                      '/order/customer-comments/${element.customer.target!.identity}/${element.identity}');
                                                },
                                                child: Padding(
                                                  padding: const EdgeInsets
                                                      .symmetric(
                                                      vertical: 15.0),
                                                  child: Text(
                                                    AppLocalizations.of(
                                                            context)!
                                                        .order_card_comments
                                                        .toUpperCase(),
                                                    style: Theme.of(context)
                                                        .textTheme
                                                        .titleMedium
                                                        ?.copyWith(
                                                            fontSize: 14),
                                                  ),
                                                ),
                                              ),
                                              const VerticalDivider(
                                                color: Colors.white,
                                                thickness: 1,
                                                width: 1,
                                              ),
                                              GestureDetector(
                                                onTap: () {
                                                  showBarModalBottomSheet(
                                                    context: context,
                                                    expand: false,
                                                    builder: (context) =>
                                                        ApiGraphqlProvider(
                                                      child: OrderItemsTable(
                                                        orderId:
                                                            element.identity,
                                                      ),
                                                    ),
                                                  );
                                                },
                                                child: Padding(
                                                  padding: const EdgeInsets
                                                      .symmetric(
                                                      vertical: 15.0),
                                                  child: Text(
                                                      AppLocalizations.of(
                                                              context)!
                                                          .order_card_items
                                                          .toUpperCase(),
                                                      style: Theme.of(context)
                                                          .textTheme
                                                          .titleMedium
                                                          ?.copyWith(
                                                              fontSize: 14)),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ],
                                  )),
                            );
                          }),
                    ),
                  ),
          ]),
        ),
      ),
    );
  }
}

/// Get date range picker
picker.SfDateRangePicker getPopUpDatePicker() {
  return picker.SfDateRangePicker(
      monthViewSettings:
          const DateRangePickerMonthViewSettings(firstDayOfWeek: 1));
}

/// Builds the date range picker inside a pop-up based on the properties passed,
/// and return the selected date or range based on the tripe mode selected.
class DateRangePicker extends StatefulWidget {
  /// Creates Date range picker
  const DateRangePicker(this.date, this.range,
      {super.key, this.minDate, this.maxDate, this.displayDate});

  /// Holds date value
  final dynamic date;

  /// Holds date range value
  final dynamic range;

  /// Holds minimum date value
  final dynamic minDate;

  /// Holds maximum date value
  final dynamic maxDate;

  /// Holds showable date value
  final dynamic displayDate;

  @override
  State<StatefulWidget> createState() {
    return _DateRangePickerState();
  }
}

class _DateRangePickerState extends State<DateRangePicker> {
  dynamic _date;
  dynamic _controller;
  dynamic _range;
  late bool _isWeb;
  late SfLocalizations _localizations;

  @override
  void initState() {
    _date = widget.date;
    _range = widget.range;
    _controller = picker.DateRangePickerController();
    _isWeb = false;
    super.initState();
  }

  @override
  void didChangeDependencies() {
    //// Extra small devices (phones, 600px and down)
//// @media only screen and (max-width: 600px) {...}
////
//// Small devices (portrait tablets and large phones, 600px and up)
//// @media only screen and (min-width: 600px) {...}
////
//// Medium devices (landscape tablets, 768px and up)
//// media only screen and (min-width: 768px) {...}
////
//// Large devices (laptops/desktops, 992px and up)
//// media only screen and (min-width: 992px) {...}
////
//// Extra large devices (large laptops and desktops, 1200px and up)
//// media only screen and (min-width: 1200px) {...}
//// Default width to render the mobile UI in web, if the device width exceeds
//// the given width agenda view will render the web UI.
    _isWeb = MediaQuery.of(context).size.width > 767;
    _localizations = SfLocalizations.of(context);
    super.didChangeDependencies();
  }

  @override
  Widget build(BuildContext context) {
    final Widget selectedDateWidget = Container(
        color: Colors.transparent,
        padding: const EdgeInsets.symmetric(vertical: 16.0),
        child: Container(
            height: 30,
            padding: const EdgeInsets.symmetric(horizontal: 4.0),
            child: _range == null ||
                    _range.startDate == null ||
                    _range.endDate == null ||
                    _range.startDate == _range.endDate
                ? Text(
                    DateFormat('dd MMM, yyyy').format(_range == null
                        ? _date
                        : (_range.startDate ?? _range.endDate)),
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.w600),
                  )
                : Row(
                    children: <Widget>[
                      Expanded(
                        flex: 5,
                        child: Text(
                          DateFormat('dd MMM, yyyy').format(
                              _range.startDate.isAfter(_range.endDate) == true
                                  ? _range.endDate
                                  : _range.startDate),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              fontSize: 18, fontWeight: FontWeight.w600),
                        ),
                      ),
                      const VerticalDivider(
                        thickness: 1,
                      ),
                      Expanded(
                        flex: 5,
                        child: Text(
                          DateFormat('dd MMM, yyyy').format(
                              _range.startDate.isAfter(_range.endDate) == true
                                  ? _range.startDate
                                  : _range.endDate),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              fontSize: 18, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  )));

    _controller.selectedDate = _date;
    _controller.selectedRange = _range;
    Widget pickerWidget;
    pickerWidget = picker.SfDateRangePicker(
      monthViewSettings:
          const picker.DateRangePickerMonthViewSettings(firstDayOfWeek: 1),
      controller: _controller,
      initialDisplayDate: widget.displayDate,
      showNavigationArrow: true,
      showActionButtons: true,
      onCancel: () => Navigator.pop(context, null),
      enableMultiView: _range != null && _isWeb,
      selectionMode: _range == null
          ? picker.DateRangePickerSelectionMode.single
          : picker.DateRangePickerSelectionMode.range,
      minDate: widget.minDate,
      maxDate: widget.maxDate,
      todayHighlightColor: Colors.transparent,
      cancelText: 'Отмена',
      headerStyle: picker.DateRangePickerHeaderStyle(
          textAlign: TextAlign.center,
          textStyle:
              TextStyle(color: Theme.of(context).primaryColor, fontSize: 15)),
      onSubmit: (Object? value) {
        if (_range == null) {
          Navigator.pop(context, _date);
        } else {
          Navigator.pop(context, _range);
        }
      },
      onSelectionChanged: (picker.DateRangePickerSelectionChangedArgs details) {
        setState(() {
          if (_range == null) {
            _date = details.value;
          } else {
            _range = details.value;
          }
        });
      },
    );

    return Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
        child: SizedBox(
            height: 400,
            width: _range != null && _isWeb ? 500 : 300,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                selectedDateWidget,
                Flexible(
                    child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 5),
                        child: pickerWidget)),
              ],
            )));
  }
}
