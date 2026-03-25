import 'package:animated_snack_bar/animated_snack_bar.dart';
import 'package:arryt/helpers/api_graphql_provider.dart';
import 'package:arryt/helpers/api_server.dart';
import 'package:arryt/models/couriers.dart';
import 'package:auto_route/auto_route.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:currency_formatter/currency_formatter.dart';
import 'package:easy_refresh/easy_refresh.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:intl/intl.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:arryt/l10n/app_localizations.dart';
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
  final TextEditingController searchController = TextEditingController();
  String searchQuery = '';
  String? selectedPaymentType;
  String _activeDateFilter = 'week';

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
            nameUz: order['orders_order_status']['name_uz'],
            nameEn: order['orders_order_status']['name_en'],
            color: order['orders_order_status']['color'],
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

  Widget _dateChip(String label, String key, VoidCallback onTap, {IconData? icon}) {
    final selected = _activeDateFilter == key;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: selected ? Theme.of(context).primaryColor : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: selected ? Theme.of(context).primaryColor : Colors.grey.shade300,
            ),
            boxShadow: selected
                ? [BoxShadow(color: Theme.of(context).primaryColor.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 2))]
                : [],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 14, color: selected ? Colors.white : Theme.of(context).primaryColor),
                const SizedBox(width: 4),
              ],
              Text(label, style: TextStyle(
                fontSize: 13,
                color: selected ? Colors.white : Colors.grey.shade800,
                fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
              )),
            ],
          ),
        ),
      ),
    );
  }

  String _capitalizeFirst(String s) {
    if (s.isEmpty) return s;
    return s[0].toUpperCase() + s.substring(1);
  }

  Widget _filterChip({required String name, required int count, required bool selected, required VoidCallback onTap}) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: selected ? Theme.of(context).primaryColor : Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(
              color: selected ? Theme.of(context).primaryColor : Colors.grey.shade300,
            ),
            boxShadow: selected
                ? [BoxShadow(color: Theme.of(context).primaryColor.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 2))]
                : [],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(name,
                  style: TextStyle(
                    fontSize: 13,
                    color: selected ? Colors.white : Colors.grey.shade800,
                    fontWeight: FontWeight.w500,
                  )),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: selected ? Colors.white.withOpacity(0.25) : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text('$count',
                    style: TextStyle(
                      fontSize: 11,
                      color: selected ? Colors.white : Colors.grey.shade600,
                      fontWeight: FontWeight.w600,
                    )),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {bool bold = false, double fontSize = 14}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(
            color: Colors.grey.shade600,
            fontSize: fontSize,
          )),
          Flexible(
            child: Text(value, style: TextStyle(
              fontWeight: bold ? FontWeight.bold : FontWeight.w500,
              fontSize: fontSize,
            ), textAlign: TextAlign.right),
          ),
        ],
      ),
    );
  }

  String _localizePaymentType(String? type, String locale) {
    if (type == null) return '';
    final lower = type.toLowerCase();
    if (lower == 'наличными' || lower == 'cash') {
      switch (locale) {
        case 'uz': return 'Naqd';
        case 'en': return 'Cash';
        default: return 'Наличными';
      }
    }
    return type;
  }

  Widget _buildOrderCard(OrderModel element) {
    final l10n = AppLocalizations.of(context)!;
    final isFinished = element.orderStatus.target?.finish == true;
    final isCancelled = element.orderStatus.target?.cancel == true;
    final statusColor = isCancelled
        ? Colors.red
        : isFinished
            ? Colors.green
            : Colors.orange;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
            child: Row(
              children: [
                if (element.organization.target?.iconUrl != null) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: CachedNetworkImage(
                      imageUrl: element.organization.target!.iconUrl!,
                      height: 28, width: 28, fit: BoxFit.cover,
                      errorWidget: (c, u, e) => const Icon(Icons.store, size: 20),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                Text("#${element.order_number}",
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    element.orderStatus.target?.localizedName(Localizations.localeOf(context).languageCode) ?? '',
                    style: TextStyle(color: Colors.grey.shade800, fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                ),
                const Spacer(),
                Text(
                  DateFormat('dd.MM.yyyy HH:mm')
                      .format(DateTime.parse(element.created_at.toString()).toLocal()),
                  style: const TextStyle(fontSize: 13, color: Colors.black87, fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
          const SizedBox(height: 4),
          // Details
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Column(
              children: [
                _buildInfoRow(l10n.customer_name, element.customer.target!.name),
                _buildInfoRow(l10n.customer_phone, element.customer.target!.phone),
                _buildInfoRow(l10n.terminal_label, element.terminal.target!.name),
                if (element.delivery_address != null && element.delivery_address!.isNotEmpty)
                  _buildInfoRow(l10n.address, element.delivery_address!),
                _buildInfoRow(l10n.delivery_price,
                    CurrencyFormatter.format(element.delivery_price, euroSettings)),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(l10n.order_total_price,
                          style: const TextStyle(fontSize: 18, color: Colors.black, fontWeight: FontWeight.bold)),
                      Text(CurrencyFormatter.format(element.order_price, euroSettings),
                          style: const TextStyle(fontSize: 18, color: Colors.black, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(l10n.payment_type,
                          style: const TextStyle(fontSize: 18, color: Colors.black, fontWeight: FontWeight.bold)),
                      Text(_capitalizeFirst(_localizePaymentType(element.paymentType, Localizations.localeOf(context).languageCode)),
                          style: const TextStyle(fontSize: 18, color: Colors.black, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          // Action buttons
          Container(
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(14),
                bottomRight: Radius.circular(14),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () {
                      AutoRouter.of(context).pushNamed(
                          '/order/customer-comments/${element.customer.target!.identity}/${element.identity}');
                    },
                    borderRadius: const BorderRadius.only(bottomLeft: Radius.circular(14)),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.comment_outlined, size: 16, color: Theme.of(context).primaryColor),
                          const SizedBox(width: 6),
                          Text(l10n.order_card_comments,
                              style: TextStyle(fontSize: 13, color: Theme.of(context).primaryColor, fontWeight: FontWeight.w500)),
                        ],
                      ),
                    ),
                  ),
                ),
                Container(width: 1, height: 30, color: Colors.grey.shade200),
                Expanded(
                  child: InkWell(
                    onTap: () {
                      showBarModalBottomSheet(
                        context: context,
                        expand: false,
                        builder: (context) => ApiGraphqlProvider(
                          child: OrderItemsTable(orderId: element.identity),
                        ),
                      );
                    },
                    borderRadius: const BorderRadius.only(bottomRight: Radius.circular(14)),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.receipt_outlined, size: 16, color: Theme.of(context).primaryColor),
                          const SizedBox(width: 6),
                          Text(l10n.order_card_items,
                              style: TextStyle(fontSize: 13, color: Theme.of(context).primaryColor, fontWeight: FontWeight.w500)),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
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

    if (_posts.isNotEmpty && searchQuery.isNotEmpty) {
      final query = searchQuery.toLowerCase();
      resultPosts = _posts.where((element) {
        final phone = element.customer.target!.phone.toLowerCase();
        final orderNum = element.order_number.toLowerCase();
        return phone.contains(query) || orderNum.contains(query);
      }).toList();
    }

    if (selectedPaymentType != null && resultPosts.isNotEmpty) {
      resultPosts = resultPosts
          .where((e) => e.paymentType?.toLowerCase() == selectedPaymentType!.toLowerCase())
          .toList();
    }

    // Collect unique payment types for filter, cash first
    final paymentTypes = _posts
        .map((e) => e.paymentType)
        .where((e) => e != null && e.isNotEmpty)
        .toSet()
        .toList()
      ..sort((a, b) {
        final aIsCash = a?.toLowerCase() == 'наличными' || a?.toLowerCase() == 'cash';
        final bIsCash = b?.toLowerCase() == 'наличными' || b?.toLowerCase() == 'cash';
        if (aIsCash) return -1;
        if (bIsCash) return 1;
        return 0;
      });

    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context).languageCode;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.ordersHistory.replaceAll('\n', ' ')),
        centerTitle: true,
        elevation: 0,
      ),
      body: LoadingOverlay(
        isLoading: _loading,
        child: Column(children: [
          // Date quick filters
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
            child: SizedBox(
              height: 36,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _dateChip(l10n.orderStatToday, 'today', () {
                    final now = DateTime.now();
                    setState(() { _activeDateFilter = 'today'; });
                    _startDate = DateTime(now.year, now.month, now.day);
                    _endDate = now.add(const Duration(days: 1));
                    _loadOrders(true);
                  }),
                  _dateChip(l10n.orderStatYesterday, 'yesterday', () {
                    final now = DateTime.now();
                    setState(() { _activeDateFilter = 'yesterday'; });
                    _startDate = DateTime(now.year, now.month, now.day - 1);
                    _endDate = DateTime(now.year, now.month, now.day);
                    _loadOrders(true);
                  }),
                  _dateChip(l10n.orderStatWeek, 'week', () {
                    final now = DateTime.now();
                    setState(() { _activeDateFilter = 'week'; });
                    _startDate = now.subtract(Duration(days: now.weekday - 1));
                    _endDate = now.add(Duration(days: 7 - now.weekday));
                    _loadOrders(true);
                  }),
                  _dateChip(l10n.orderStatMonth, 'month', () {
                    final now = DateTime.now();
                    setState(() { _activeDateFilter = 'month'; });
                    _startDate = DateTime(now.year, now.month, 1);
                    _endDate = DateTime(now.year, now.month + 1, 0);
                    _loadOrders(true);
                  }),
                  _dateChip("${DateFormat('dd.MM').format(_startDate)} - ${DateFormat('dd.MM').format(_endDate)}", 'custom', () async {
                    final picker.PickerDateRange? range =
                        await showDialog<picker.PickerDateRange?>(
                            context: context,
                            builder: (BuildContext context) {
                              return DateRangePicker(
                                  null,
                                  picker.PickerDateRange(_startDate, _endDate),
                                  displayDate: _startDate);
                            });
                    if (range != null) {
                      setState(() { _activeDateFilter = 'custom'; });
                      _onSelectedRangeChanged(range);
                    }
                  }, icon: Icons.calendar_today_outlined),
                ],
              ),
            ),
          ),
          // Search by phone or order ID
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: TextField(
                controller: searchController,
                autofocus: false,
                onChanged: (value) {
                  setState(() {
                    searchQuery = value;
                  });
                },
                decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.search, size: 20),
                    hintText: "${l10n.orderListPhoneFieldLabel} / ID",
                    filled: true,
                    fillColor: Colors.grey.shade100,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide.none),
                    suffixIcon: searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              setState(() {
                                searchController.clear();
                                searchQuery = '';
                              });
                            },
                          )
                        : null)),
          ),
          // Payment type filter
          if (paymentTypes.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              child: SizedBox(
                height: 36,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    _filterChip(
                      name: l10n.total_label,
                      count: _posts.length,
                      selected: selectedPaymentType == null,
                      onTap: () => setState(() => selectedPaymentType = null),
                    ),
                    ...paymentTypes.map((type) {
                      final count = _posts.where((e) => e.paymentType?.toLowerCase() == type?.toLowerCase()).length;
                      return _filterChip(
                        name: _capitalizeFirst(_localizePaymentType(type, locale)),
                        count: count,
                        selected: selectedPaymentType?.toLowerCase() == type?.toLowerCase(),
                        onTap: () => setState(() => selectedPaymentType = type),
                      );
                    }),
                  ],
                ),
              ),
            ),
          // Orders list
          _posts.isEmpty
              ? Expanded(
                  child: Center(child: Text(l10n.noOrders,
                      style: TextStyle(color: Colors.grey.shade500, fontSize: 16))))
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
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        itemCount: resultPosts.length,
                        itemBuilder: (context, index) {
                          return _buildOrderCard(resultPosts[index]);
                        }),
                  ),
                ),
        ]),
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
