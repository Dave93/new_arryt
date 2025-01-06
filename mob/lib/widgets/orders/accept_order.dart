import 'package:action_slider/action_slider.dart';
import 'package:animated_snack_bar/animated_snack_bar.dart';
import 'package:arryt/helpers/api_server.dart';
import 'package:arryt/helpers/hive_helper.dart';
import 'package:arryt/models/couriers.dart';
import 'package:arryt/models/customer.dart';
import 'package:arryt/models/order.dart';
import 'package:arryt/models/order_status.dart';
import 'package:arryt/models/organizations.dart';
import 'package:arryt/models/terminals.dart';
import 'package:arryt/models/user_data.dart';
import 'package:arryt/widgets/location_dialog.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:currency_formatter/currency_formatter.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

class AcceptOrder extends StatefulWidget {
  final String orderId;
  final int queue;
  const AcceptOrder({Key? key, required this.orderId, required this.queue})
      : super(key: key);

  @override
  _AcceptOrderState createState() => _AcceptOrderState();
}

class _AcceptOrderState extends State<AcceptOrder> {
  bool _isLoading = true;
  OrderModel? _orderData;
  String? _errorMessage;
  ActionSliderController _actionSliderController = ActionSliderController();

  @override
  void initState() {
    super.initState();
    _fetchOrderData();
  }

  Future<void> _fetchOrderData() async {
    try {
      ApiServer api = new ApiServer();
      final response = await api.get('/api/orders/${widget.orderId}', {
        'fields':
            'id,delivery_type,created_at,order_price,order_number,delivery_price,delivery_address,payment_type,from_lat,from_lon,to_lat,to_lon,order_items,pre_distance,organization.id,organization.name,couriers.id,couriers.first_name,couriers.last_name,customers.id,customers.name,customers.phone,order_status.id,order_status.name,order_status.color,order_status.cancel,order_status.finish,order_status.on_way,terminals.id,terminals.name,organization.icon_url,organization.description,organization.max_distance,organization.max_active_order_count,organization.max_order_close_distance,organization.support_chat_url,organization.active'
      });
      if (response.statusCode == 200) {
        OrderStatus orderStatus = OrderStatus(
          identity: response.data['data']['order_status']['id'],
          name: response.data['data']['order_status']['name'],
          cancel: response.data['data']['order_status']['cancel'],
          finish: response.data['data']['order_status']['finish'],
          onWay: response.data['data']['order_status']['on_way'],
        );
        Terminals terminals = Terminals(
          identity: response.data['data']['terminals']['id'],
          name: response.data['data']['terminals']['name'],
        );
        Customer customer = Customer(
          identity: response.data['data']['customers']['id'],
          name: response.data['data']['customers']['name'],
          phone: response.data['data']['customers']['phone'],
        );
        Organizations organizations = Organizations(
            response.data['data']['organization']['id'],
            response.data['data']['organization']['name'],
            response.data['data']['organization']['active'],
            response.data['data']['organization']['icon_url'],
            response.data['data']['organization']['description'],
            response.data['data']['organization']['max_distance'],
            response.data['data']['organization']['max_active_order_count'],
            response.data['data']['organization']['max_order_close_distance'],
            response.data['data']['organization']['support_chat_url']);
        OrderModel orderModel = OrderModel.fromMap(response.data['data']);
        orderModel.customer.target = customer;
        orderModel.terminal.target = terminals;
        orderModel.orderStatus.target = orderStatus;
        orderModel.organization.target = organizations;
        if (response.data['data']['couriers'] != null) {
          Couriers courier = Couriers(
            identity: response.data['data']['couriers']['id'],
            firstName: response.data['data']['couriers']['first_name'],
            lastName: response.data['data']['couriers']['last_name'],
          );
          orderModel.courier.target = courier;
        }
        setState(() {
          _orderData = orderModel;
          _isLoading = false;
        });
      } else {
        throw Exception('Failed to load order data');
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Error: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  Future<void> _approveOrder() async {
    _actionSliderController.loading();
    Position? currentPosition;
    bool serviceEnabled;
    LocationPermission permission;

    // Test if location services are enabled.
    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      await showLocationDialog(context);
      // Location services are not enabled don't continue
      // accessing the position and request users of the
      // App to enable the location services.
      await Geolocator.openLocationSettings();
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        // Permissions are denied, next time you could try
        // requesting permissions again (this is also where
        // Android's shouldShowRequestPermissionRationale
        // returned true. According to Android guidelines
        // your App should show an explanatory UI now.
        await Geolocator.requestPermission();

        _actionSliderController.reset();
        return AnimatedSnackBar.material(
          AppLocalizations.of(context)!.must_turn_on_location,
          type: AnimatedSnackBarType.error,
        ).show(context);
      }
    }

    if (permission == LocationPermission.deniedForever) {
      // Permissions are denied forever, handle appropriately.

      _actionSliderController.reset();
      return AnimatedSnackBar.material(
        AppLocalizations.of(context)!.permission_for_location_denied,
        type: AnimatedSnackBarType.error,
      ).show(context);
    }
    try {
      currentPosition = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.bestForNavigation);
    } catch (e) {
      _actionSliderController.reset();
      return AnimatedSnackBar.material(
        AppLocalizations.of(context)!.error_getting_location,
        type: AnimatedSnackBarType.error,
      ).show(context);
    }

    ApiServer api = new ApiServer();

    try {
      var response = await api.post('/api/orders/approve', {
        'order_id': widget.orderId,
        'latitude': currentPosition?.latitude,
        'longitude': currentPosition?.longitude,
      });

      if (response.statusCode != 200) {
        _actionSliderController.reset();
        return AnimatedSnackBar.material(
          response.data['message'] ?? "Error",
          type: AnimatedSnackBarType.error,
        ).show(context);
      } else {
        _actionSliderController.reset();
        AnimatedSnackBar.material(
          AppLocalizations.of(context)!.orderApprovedSuccessfully,
          type: AnimatedSnackBarType.success,
          mobileSnackBarPosition: MobileSnackBarPosition.bottom,
        ).show(context);
        print(response.data);
        if (response.data != null) {
          Navigator.pop(context);
        }
      }
    } on DioException catch (e) {
      _actionSliderController.reset();
      return AnimatedSnackBar.material(
        e.error.toString(),
        type: AnimatedSnackBarType.error,
      ).show(context);
    } catch (e) {
      _actionSliderController.reset();
      return AnimatedSnackBar.material(
        e.toString() ?? 'Error',
        type: AnimatedSnackBarType.error,
      ).show(context);
    }
  }

  Future<void> _cancelOrder() async {
    _actionSliderController.loading();
    ApiServer api = new ApiServer();
    var response =
        await api.post('/api/cancel_accept_order/${widget.orderId}', {
      'queue': widget.queue,
    });
    if (response.statusCode == 200) {
      _actionSliderController.reset();
      Navigator.pop(context);
    } else {
      _actionSliderController.reset();
      AnimatedSnackBar.material(
        response.data['message'] ?? "Error",
        type: AnimatedSnackBarType.error,
      ).show(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    UserData? user = HiveHelper.getUserData();
    final currentUserId = user?.identity;
    CurrencyFormat euroSettings = const CurrencyFormat(
      symbol: 'сум',
      symbolSide: SymbolSide.right,
      thousandSeparator: ' ',
      decimalSeparator: ',',
      symbolSeparator: ' ',
    );

    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return Center(child: Text(_errorMessage!));
    }

    if (_orderData != null) {
      final orderCourierId = _orderData!.courier.target?.identity;

      if (orderCourierId != null && orderCourierId != currentUserId) {
        return const Center(
            child: Text('This order has been accepted by another courier.'));
      } else {
        // Display order data
        return ListView(
          shrinkWrap: true,
          children: [
            Container(
              margin: const EdgeInsets.all(10),
              decoration: const BoxDecoration(
                  borderRadius: BorderRadius.all(Radius.circular(20)),
                  boxShadow: [
                    BoxShadow(
                        color: Colors.grey,
                        spreadRadius: 1,
                        blurRadius: 15,
                        offset: Offset(0, 5))
                  ],
                  color: Colors.white),
              clipBehavior: Clip.antiAlias,
              child: Column(
                children: [
                  Container(
                    color: Colors.grey[200],
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _orderData!.organization.target != null &&
                                _orderData!.organization.target!.iconUrl != null
                            ? Padding(
                                padding: const EdgeInsets.all(8.0),
                                child: CachedNetworkImage(
                                  height: 30,
                                  imageUrl:
                                      _orderData!.organization.target!.iconUrl!,
                                  progressIndicatorBuilder:
                                      (context, url, downloadProgress) =>
                                          CircularProgressIndicator(
                                              value: downloadProgress.progress),
                                  errorWidget: (context, url, error) =>
                                      const Icon(Icons.error),
                                ),
                              )
                            : const SizedBox(width: 0),
                        Padding(
                          padding: const EdgeInsets.all(8.0),
                          child: Text(
                            "#${_orderData!.order_number}",
                            style: const TextStyle(
                                fontSize: 20, fontWeight: FontWeight.bold),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(8.0),
                          child: Text(
                            DateFormat('dd.MM.yyyy HH:mm')
                                .format(_orderData!.created_at.toLocal()),
                            style: const TextStyle(
                                fontSize: 20, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                AppLocalizations.of(context)!.customer_name,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold),
                              ),
                              Text(_orderData!.customer.target!.name),
                            ],
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                AppLocalizations.of(context)!.customer_phone,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold),
                              ),
                              Text(_orderData!.customer.target!.phone),
                            ],
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                AppLocalizations.of(context)!.address,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold),
                              ),
                              const Spacer(),
                              Flexible(
                                fit: FlexFit.loose,
                                child: Text(
                                  _orderData!.delivery_address ?? '',
                                ),
                              ),
                            ],
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                AppLocalizations.of(context)!
                                    .pre_distance_label,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold),
                              ),
                              Text(
                                  "${_orderData!.pre_distance.toStringAsFixed(4)} км"),
                            ],
                          ),
                        ],
                      )),
                  Padding(
                      padding: const EdgeInsets.symmetric(
                          vertical: 8.0, horizontal: 10),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                              flex: 2,
                              child: Row(
                                children: [
                                  Flexible(
                                    child: Text(
                                      _orderData!.terminal.target!.name,
                                      maxLines: 8,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                  SizedBox(
                                    width: 5,
                                  ),
                                  Icon(
                                    Icons.navigation_outlined,
                                    color: Theme.of(context).primaryColor,
                                  )
                                ],
                              )),
                          const Expanded(
                            flex: 1,
                            child: SizedBox(width: double.infinity),
                          ),
                          Expanded(
                              flex: 3,
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.location_pin,
                                    color: Theme.of(context).primaryColor,
                                  ),
                                  SizedBox(
                                    width: 5,
                                  ),
                                  Flexible(
                                    child: Text(
                                      _orderData!.delivery_address ?? '',
                                      maxLines: 8,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              )),
                        ],
                      )),
                  Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                AppLocalizations.of(context)!
                                    .additional_phone_label,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold),
                              ),
                              Text(_orderData!.additional_phone ?? ''),
                            ],
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                AppLocalizations.of(context)!.house_label,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold),
                              ),
                              Text(_orderData!.house ?? ''),
                            ],
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                AppLocalizations.of(context)!.entrance_label,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold),
                              ),
                              Text(
                                _orderData!.entrance ?? '',
                              ),
                            ],
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                AppLocalizations.of(context)!.flat_label,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold),
                              ),
                              const Spacer(),
                              Flexible(
                                fit: FlexFit.loose,
                                child: Text(
                                  _orderData!.flat ?? '',
                                ),
                              ),
                            ],
                          ),
                        ],
                      )),
                  Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                AppLocalizations.of(context)!.order_total_price,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 20),
                              ),
                              Text(
                                CurrencyFormatter.format(
                                    _orderData!.order_price, euroSettings),
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 20),
                              ),
                            ],
                          ),
                          _orderData!.cDeliveryPrice == null ||
                                  _orderData!.cDeliveryPrice == 0
                              ? Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      AppLocalizations.of(context)!
                                          .get_from_cachier,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 20),
                                    ),
                                    Text(
                                      CurrencyFormatter.format(
                                          _orderData!.delivery_price,
                                          euroSettings),
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 20),
                                    ),
                                  ],
                                )
                              : Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      AppLocalizations.of(context)!
                                          .get_from_customer,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 20),
                                    ),
                                    Text(
                                      CurrencyFormatter.format(
                                          _orderData!.cDeliveryPrice,
                                          euroSettings),
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 20),
                                    ),
                                  ],
                                ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                AppLocalizations.of(context)!
                                    .order_status_label,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 20),
                              ),
                              Text(
                                _orderData!.orderStatus.target!.name,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 20),
                              ),
                            ],
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                AppLocalizations.of(context)!.payment_type,
                                style: const TextStyle(fontSize: 20),
                              ),
                              Text(
                                _orderData!.paymentType?.toUpperCase() ?? '',
                                style: const TextStyle(fontSize: 20),
                              ),
                            ],
                          ),
                        ],
                      )),
                ],
              ),
            ),
            const Spacer(),
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: ActionSlider.dual(
                controller: _actionSliderController,
                startChild: Text('Отменить заказ'.toUpperCase(),
                    style: const TextStyle(
                        color: Colors.red,
                        fontWeight: FontWeight.bold,
                        fontSize: 15)),
                endChild: Text('Принять заказ'.toUpperCase(),
                    style: const TextStyle(
                        color: Colors.green,
                        fontWeight: FontWeight.bold,
                        fontSize: 15)),
                icon: const RotatedBox(
                    quarterTurns: 1,
                    child: Icon(Icons.unfold_more_rounded,
                        size: 28.0, color: Colors.white)),
                startAction: (controller) async {
                  await _cancelOrder();
                },
                endAction: (controller) async {
                  await _approveOrder();
                },
                successIcon:
                    const Icon(Icons.check_rounded, color: Colors.white),
              ),
            ),
          ],
        );
      }
    }

    return const Center(child: Text('No order data available'));
  }
}
