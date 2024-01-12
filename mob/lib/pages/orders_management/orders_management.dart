import 'package:animated_snack_bar/animated_snack_bar.dart';
import 'package:arryt/helpers/api_graphql_provider.dart';
import 'package:arryt/models/couriers.dart';
import 'package:arryt/pages/orders_management/order_change_courier.dart';
import 'package:auto_route/auto_route.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:currency_formatter/currency_formatter.dart';
import 'package:expandable/expandable.dart';
import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:grouped_list/grouped_list.dart';
import 'package:intl/intl.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:loading_overlay/loading_overlay.dart';
import 'package:modal_bottom_sheet/modal_bottom_sheet.dart';
import 'package:easy_refresh/easy_refresh.dart';

// ignore: depend_on_referenced_packages

import '../../models/customer.dart';
import '../../models/order.dart';
import '../../models/order_status.dart';
import '../../models/organizations.dart';
import '../../models/terminals.dart';
import '../../widgets/orders/orders_items.dart';

class OrdersManagement extends StatelessWidget {
  const OrdersManagement({super.key});

  @override
  Widget build(BuildContext context) {
    return ApiGraphqlProvider(child: const OrdersManagementView());
  }
}

class OrdersManagementView extends StatefulWidget {
  const OrdersManagementView({super.key});

  @override
  State<OrdersManagementView> createState() => _OrdersManagementViewState();
}

class _OrdersManagementViewState extends State<OrdersManagementView> {
  late EasyRefreshController _controller;
  CurrencyFormatterSettings euroSettings = CurrencyFormatterSettings(
    symbol: 'сум',
    symbolSide: SymbolSide.right,
    thousandSeparator: ' ',
    decimalSeparator: ',',
    symbolSeparator: ' ',
  );
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
    var client = GraphQLProvider.of(context).value;
    setState(() {
      _loading = true;
    });
    var query = r'''
      query managerPendingOrders($page: Int!, $limit: Int!) {
        managerPendingOrders(page: $page, limit: $limit) {
          orders {
            id
            to_lat
            to_lon
            from_lat
            from_lon
            pre_distance
            order_number
            order_price
            delivery_price
            delivery_address
            delivery_comment
            created_at
            payment_type
            yandex_pincode
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
            orders_couriers {
              id
              first_name
              last_name
            }
          }
          totalCount
        }
      }
    ''';

    var data = await client.query(QueryOptions(
        document: gql(query),
        fetchPolicy: FetchPolicy.noCache,
        variables: {'page': _pageNumber, 'limit': _numberOfPostsPerRequest}));

    if (data.hasException) {
      setState(() {
        _error = true;
        _loading = false;
      });
    } else {
      var orders = data.data!['managerPendingOrders']['orders'] as List;
      var totalCount = data.data!['managerPendingOrders']['totalCount'] as int;
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
        if (order['orders_couriers'] != null) {
          Couriers courier = Couriers(
            identity: order['orders_couriers']['id'],
            firstName: order['orders_couriers']['first_name'],
            lastName: order['orders_couriers']['last_name'],
          );
          orderModel.courier.target = courier;
        }
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

  Future<void> _sendViaYandex(String orderId) async {
    var client = GraphQLProvider.of(context).value;
    setState(() {
      _loading = true;
    });

    var query = r'''
      mutation($id: String!) {
        sendToYandexWithApprove(id: $id)
      }
    ''';

    var result = await client.mutate(MutationOptions(
        document: gql(query),
        variables: <String, dynamic>{'id': orderId},
        fetchPolicy: FetchPolicy.noCache));
    if (result.hasException) {
      AnimatedSnackBar.material(
        result.exception?.graphqlErrors[0].message ?? "Error",
        type: AnimatedSnackBarType.error,
        mobileSnackBarPosition: MobileSnackBarPosition.bottom,
      ).show(context);
      print(result.exception);
    } else {
      AnimatedSnackBar.material(
        AppLocalizations.of(context)!.orderApprovedSuccessfully,
        type: AnimatedSnackBarType.success,
        mobileSnackBarPosition: MobileSnackBarPosition.bottom,
      ).show(context);
      print(result.data);
      _loadOrders(true);
    }
  }

  @override
  void initState() {
    DateTime now = DateTime.now();
    int currentDay = now.weekday;
    _pageNumber = 1;
    _posts = [];
    _isLastPage = false;
    _loading = true;
    _error = false;
    _numberOfPostsPerRequest = 10;
    _scrollController = ScrollController();
    // TODO: implement initState
    super.initState();
    Intl.defaultLocale = "ru";
    initializeDateFormatting();
    _controller = EasyRefreshController(
      controlFinishRefresh: true,
      controlFinishLoad: true,
    );
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
      var nextPageTrigger = 0.8 * _scrollController.position.maxScrollExtent;
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
        title:
            Text(AppLocalizations.of(context)!.ordersManagement.toUpperCase()),
      ),
      body: LoadingOverlay(
        isLoading: _loading,
        child: Padding(
          padding: const EdgeInsets.only(top: 10, left: 10, right: 10),
          child: Column(children: [
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
                                            element.courier.target != null
                                                ? Row(
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
                                                                FontWeight
                                                                    .bold),
                                                      ),
                                                      Text(
                                                          "${element.courier.target!.firstName} ${element.courier.target!.lastName}"),
                                                    ],
                                                  )
                                                : const SizedBox(),
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
                                            element.yandexPincode != null
                                                ? Row(
                                                    mainAxisAlignment:
                                                        MainAxisAlignment
                                                            .spaceBetween,
                                                    children: [
                                                      Text(
                                                        AppLocalizations.of(
                                                                context)!
                                                            .yandex_pincode,
                                                        style: const TextStyle(
                                                            fontWeight:
                                                                FontWeight.bold,
                                                            fontSize: 20),
                                                      ),
                                                      Text(
                                                        element.yandexPincode!,
                                                        style: const TextStyle(
                                                            fontWeight:
                                                                FontWeight.bold,
                                                            fontSize: 20),
                                                      ),
                                                    ],
                                                  )
                                                : const SizedBox(),
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
                                                      .button
                                                      ?.copyWith(fontSize: 14),
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
                                                        .button
                                                        ?.copyWith(
                                                            fontSize: 14)),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                    Row(
                                      children: [
                                        element.courier.target != null
                                            ? const SizedBox()
                                            : Expanded(
                                                child: ElevatedButton(
                                                style: ElevatedButton.styleFrom(
                                                    backgroundColor:
                                                        Theme.of(context)
                                                            .primaryColor),
                                                child: Padding(
                                                  padding: const EdgeInsets
                                                      .symmetric(vertical: 10),
                                                  child: Text(AppLocalizations
                                                          .of(context)!
                                                      .order_card_send_yandex),
                                                ),
                                                onPressed: () {
                                                  _sendViaYandex(
                                                      element.identity);
                                                },
                                              )),
                                      ],
                                    ),
                                    Row(
                                      children: [
                                        element.courier.target != null
                                            ? Expanded(
                                                child: ElevatedButton(
                                                  style:
                                                      ElevatedButton.styleFrom(
                                                          backgroundColor: Theme
                                                                  .of(context)
                                                              .primaryColor),
                                                  onPressed: () {
                                                    showModalBottomSheet(
                                                        context: context,
                                                        builder: (context) =>
                                                            OrderChangeCourier(
                                                                order: element,
                                                                callback: () =>
                                                                    _loadOrders(
                                                                        true)));
                                                  },
                                                  child: Padding(
                                                    padding: const EdgeInsets
                                                            .symmetric(
                                                        vertical: 10),
                                                    child: Text(
                                                      AppLocalizations.of(
                                                              context)!
                                                          .order_card_change_courier,
                                                      style: const TextStyle(
                                                          fontSize: 14),
                                                    ),
                                                  ),
                                                ),
                                              )
                                            : Expanded(
                                                child: ElevatedButton(
                                                style: ElevatedButton.styleFrom(
                                                    backgroundColor:
                                                        Theme.of(context)
                                                            .primaryColor),
                                                child: Padding(
                                                  padding: const EdgeInsets
                                                      .symmetric(vertical: 10),
                                                  child: Text(AppLocalizations
                                                          .of(context)!
                                                      .order_card_assign_courier),
                                                ),
                                                onPressed: () {
                                                  showModalBottomSheet(
                                                      context: context,
                                                      builder: (context) =>
                                                          OrderChangeCourier(
                                                              order: element,
                                                              callback: () =>
                                                                  _loadOrders(
                                                                      true)));
                                                },
                                              )),
                                      ],
                                    )
                                  ]),
                                  expanded: Column(
                                    children: [
                                      Padding(
                                          padding: const EdgeInsets.all(8.0),
                                          child: Column(
                                            children: [
                                              element.courier.target != null
                                                  ? Row(
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
                                                                  FontWeight
                                                                      .bold),
                                                        ),
                                                        Text(
                                                            "${element.courier.target!.firstName} ${element.courier.target!.lastName}"),
                                                      ],
                                                    )
                                                  : const SizedBox(),
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
                                                      "${(element.pre_distance).toString()} км"),
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
                                                        .button
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
                                                          .button
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
