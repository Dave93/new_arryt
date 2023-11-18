import 'package:animated_snack_bar/animated_snack_bar.dart';
import 'package:auto_route/auto_route.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:currency_formatter/currency_formatter.dart';
import 'package:expandable/expandable.dart';
import 'package:flutter/material.dart';
import 'package:flutter_phone_direct_caller/flutter_phone_direct_caller.dart';
import 'package:geolocator/geolocator.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:intl/intl.dart';
import 'package:map_launcher/map_launcher.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:modal_bottom_sheet/modal_bottom_sheet.dart';
import 'package:arryt/helpers/api_graphql_provider.dart';
import 'package:arryt/main.dart';
import 'package:arryt/models/order.dart';
import 'package:arryt/widgets/orders/orders_items.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../helpers/urlLauncher.dart';
import '../../models/customer.dart';
import '../../models/order_next_button.dart';
import '../../models/order_status.dart';
import '../../models/organizations.dart';
import '../../models/terminals.dart';
import '../location_dialog.dart';
import 'cancel_order_modal.dart';

class CurrentOrderCard extends StatefulWidget {
  final OrderModel order;
  const CurrentOrderCard({super.key, required this.order});

  @override
  State<CurrentOrderCard> createState() => _CurrentOrderCardState();
}

class _CurrentOrderCardState extends State<CurrentOrderCard> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  final TextEditingController _textEditingController = TextEditingController();
  CurrencyFormatterSettings euroSettings = CurrencyFormatterSettings(
    symbol: 'сум',
    symbolSide: SymbolSide.right,
    thousandSeparator: ' ',
    decimalSeparator: ',',
    symbolSeparator: ' ',
  );

  bool loading = false;
  bool isChecked = false;

  Future<void> showInformationDialog(BuildContext context) async {
    return await showDialog(
        context: context,
        builder: (context) {
          bool isChecked = false;
          return StatefulBuilder(builder: (context, setState) {
            return AlertDialog(
              content: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextFormField(
                        minLines: 3,
                        maxLines: 5,
                        controller: _textEditingController,
                        validator: (value) {
                          return value!.isNotEmpty ? null : "Enter any text";
                        },
                        decoration: InputDecoration(
                            hintText: AppLocalizations.of(context)!
                                .cancelOrderModalCause),
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(AppLocalizations.of(context)!
                              .cancelOrderModalSentSMSLabel),
                          Checkbox(
                              value: isChecked,
                              onChanged: (checked) {
                                setState(() {
                                  isChecked = checked!;
                                });
                              })
                        ],
                      )
                    ],
                  )),
              title: Text(AppLocalizations.of(context)!.cancelOrderModalLabel),
              actions: <Widget>[
                InkWell(
                  child: const Text('OK   '),
                  onTap: () {
                    if (_formKey.currentState!.validate()) {
                      // Do something like updating SharedPreferences or User Settings etc.
                      Navigator.of(context).pop();
                    }
                  },
                ),
              ],
            );
          });
        });
  }

  Future _setOrderStatus(OrderNextButton statusButton) async {
    setState(() {
      loading = true;
    });
    var orderStatusId = statusButton.identity;
    String? cancelText;

    if (statusButton.cancel) {
      setState(() {
        loading = false;
      });
      return showCupertinoModalBottomSheet(
          context: context,
          builder: (context) => ApiGraphqlProvider(
                child: CancelOrderModal(
                  orderId: widget.order.identity,
                  orderStatusId: orderStatusId,
                ),
              ));
    }

    Position? currentPosition;
    if (statusButton.waiting ||
        statusButton.finish ||
        statusButton.inTerminal) {
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

          setState(() {
            loading = false;
          });
          return AnimatedSnackBar.material(
            AppLocalizations.of(context)!.must_turn_on_location,
            type: AnimatedSnackBarType.error,
          ).show(context);
        }
      }

      if (permission == LocationPermission.deniedForever) {
        // Permissions are denied forever, handle appropriately.

        setState(() {
          loading = false;
        });
        return AnimatedSnackBar.material(
          AppLocalizations.of(context)!.permission_for_location_denied,
          type: AnimatedSnackBarType.error,
        ).show(context);
      }
      try {
        currentPosition = await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.bestForNavigation);
      } catch (e) {
        setState(() {
          loading = false;
        });
        return AnimatedSnackBar.material(
          AppLocalizations.of(context)!.error_getting_location,
          type: AnimatedSnackBarType.error,
        ).show(context);
      }
    }
    var client = GraphQLProvider.of(context).value;
    var query = r'''
      mutation($orderStatusId: String!, $orderId: String!, $latitude: Float, $longitude: Float, $cancelReason: String, $sentSmsToCustomer: Boolean) {
        setOrderStatus(orderStatusId: $orderStatusId, orderId: $orderId, latitude: $latitude, longitude: $longitude, cancelReason: $cancelReason, sentSmsToCustomer: $sentSmsToCustomer) {
          id
          to_lat
          to_lon
          from_lat
          from_lon
          pre_distance
          order_number
          order_price
          delivery_price
          customer_delivery_price
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
          next_buttons {
            name
            id
            color
            sort
            finish
            waiting
            cancel
            on_way
            in_terminal
          }
        }
      }
    ''';
    var result = await client.mutate(MutationOptions(
        document: gql(query),
        variables: <String, dynamic>{
          'orderStatusId': orderStatusId,
          'orderId': widget.order.identity,
          'latitude': currentPosition?.latitude,
          'longitude': currentPosition?.longitude,
          'sentSmsToCustomer': isChecked,
          'cancelReason': cancelText
        },
        fetchPolicy: FetchPolicy.noCache));
    if (result.hasException) {
      AnimatedSnackBar.material(
        result.exception?.graphqlErrors[0].message ?? "Error",
        type: AnimatedSnackBarType.error,
      ).show(context);
      print(result.exception);
    } else {
      print(result.data);
      if (result.data != null) {
        var order = result.data!['setOrderStatus'];
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
        if (order['next_buttons'] != null) {
          order['next_buttons'].forEach((button) {
            OrderNextButton orderNextButton = OrderNextButton.fromMap(button);
            orderModel.orderNextButton.add(orderNextButton);
          });
        }

        if (orderModel.orderStatus.target!.finish ||
            orderModel.orderStatus.target!.cancel) {
          objectBox.deleteCurrentOrder(widget.order.identity);
        } else {
          objectBox.updateCurrentOrder(widget.order.identity, orderModel);
        }
      }
    }
    setState(() {
      loading = false;
    });

    // if (statusButton.onWay) {
    //   await launchUrl(Uri.parse(
    //       "yandexnavi://build_route_on_map?lat_from=${widget.order.from_lat}&lon_from-${widget.order.from_lon}&lat_to=${widget.order.to_lat}&lon_to=${widget.order.to_lon}"));
    // }
  }

  Future _buildRoute() async {
    var client = GraphQLProvider.of(context).value;
    var query = '''
      query {
        getDeliveryMapType(order_id: "${widget.order.identity}")
      }
    ''';

    var result = await client.query(
        QueryOptions(document: gql(query), fetchPolicy: FetchPolicy.noCache));
    if (result.hasException) {
    } else {
      if (result.data != null) {
        var mapType = result.data!['getDeliveryMapType'];
        if (mapType != null) {
          if (mapType == 'foot') {
            launchYandexMaps(widget.order.from_lat, widget.order.from_lon,
                widget.order.to_lat, widget.order.to_lon);
          } else {
            launchYandexNavi(widget.order.to_lat, widget.order.to_lon);
          }
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    print(widget.order);
    return Container(
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
                widget.order.organization.target != null &&
                        widget.order.organization.target!.iconUrl != null
                    ? Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: CachedNetworkImage(
                          height: 30,
                          imageUrl: widget.order.organization.target!.iconUrl!,
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
                    "#${widget.order.order_number}",
                    style: const TextStyle(
                        fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Text(
                    DateFormat('dd.MM.yyyy HH:mm')
                        .format(widget.order.created_at),
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
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Text(widget.order.customer.target!.name),
                    ],
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        AppLocalizations.of(context)!.customer_phone,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Text(widget.order.customer.target!.phone),
                    ],
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        AppLocalizations.of(context)!.address,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const Spacer(),
                      Flexible(
                        fit: FlexFit.loose,
                        child: Text(
                          widget.order.delivery_address ?? '',
                        ),
                      ),
                    ],
                  ),
                  // Row(
                  //   mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  //   children: [
                  //     Text(
                  //       AppLocalizations.of(context)!.customer_phone,
                  //       style: const TextStyle(fontWeight: FontWeight.bold),
                  //     ),
                  //     TextButton(
                  //       onPressed: () {
                  //         FlutterPhoneDirectCaller.callNumber(
                  //             widget.order.customer.target!.phone);
                  //       },
                  //       child: Text(widget.order.customer.target!.phone),
                  //     ),
                  //   ],
                  // ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        AppLocalizations.of(context)!.pre_distance_label,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Text("${(widget.order.pre_distance).toString()} км"),
                    ],
                  ),
                ],
              )),
          Padding(
              padding:
                  const EdgeInsets.symmetric(vertical: 8.0, horizontal: 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                      flex: 2,
                      child: GestureDetector(
                        onTap: () async {
                          final coords = Coords(
                              widget.order.from_lat, widget.order.from_lon);
                          launchYandexNavi(
                              widget.order.from_lat, widget.order.from_lon);
                        },
                        child: Row(
                          children: [
                            Flexible(
                              child: Text(
                                widget.order.terminal.target!.name,
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
                        ),
                      )),
                  const Expanded(
                    flex: 1,
                    child: SizedBox(width: double.infinity),
                  ),
                  Expanded(
                      flex: 3,
                      child: GestureDetector(
                        onTap: () async {
                          _buildRoute();
                        },
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
                                widget.order.delivery_address ?? '',
                                maxLines: 8,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
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
                        AppLocalizations.of(context)!.additional_phone_label,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Text(widget.order.additional_phone ?? ''),
                    ],
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        AppLocalizations.of(context)!.house_label,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Text(widget.order.house ?? ''),
                    ],
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        AppLocalizations.of(context)!.entrance_label,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        widget.order.entrance ?? '',
                      ),
                    ],
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        AppLocalizations.of(context)!.flat_label,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const Spacer(),
                      Flexible(
                        fit: FlexFit.loose,
                        child: Text(
                          widget.order.flat ?? '',
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
                            widget.order.order_price, euroSettings),
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 20),
                      ),
                    ],
                  ),
                  widget.order.cDeliveryPrice == null ||
                          widget.order.cDeliveryPrice == 0
                      ? Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              AppLocalizations.of(context)!.get_from_cachier,
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 20),
                            ),
                            Text(
                              CurrencyFormatter.format(
                                  widget.order.delivery_price, euroSettings),
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 20),
                            ),
                          ],
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              AppLocalizations.of(context)!.get_from_customer,
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 20),
                            ),
                            Text(
                              CurrencyFormatter.format(
                                  widget.order.cDeliveryPrice, euroSettings),
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 20),
                            ),
                          ],
                        ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        AppLocalizations.of(context)!.order_status_label,
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 20),
                      ),
                      Text(
                        widget.order.orderStatus.target!.name,
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
                        widget.order.paymentType?.toUpperCase() ?? '',
                        style: const TextStyle(fontSize: 20),
                      ),
                    ],
                  ),
                ],
              )),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 5),
            decoration: const BoxDecoration(
              color: Colors.green,
            ),
            child: GestureDetector(
              onTap: () async {
                String number =
                    widget.order.customer.target!.phone; //set the number here
                bool? res = await FlutterPhoneDirectCaller.callNumber(number);
              },
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.phone_in_talk_outlined,
                    color: Colors.white,
                    size: 40,
                  ),
                  const SizedBox(
                    width: 20,
                  ),
                  Text(
                      AppLocalizations.of(context)!.call_customer.toUpperCase(),
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ),
          const SizedBox(
            height: 5,
          ),
          Container(
            color: Theme.of(context).primaryColor,
            child: IntrinsicHeight(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  GestureDetector(
                    onTap: () {
                      AutoRouter.of(context).pushNamed(
                          '/order/customer-comments/${widget.order.customer.target!.identity}/${widget.order.identity}');
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 15.0),
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
                        builder: (context) => ApiGraphqlProvider(
                          child: OrderItemsTable(
                            orderId: widget.order.identity,
                          ),
                        ),
                      );
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 15.0),
                      child: Text(
                          AppLocalizations.of(context)!
                              .order_card_items
                              .toUpperCase(),
                          style: Theme.of(context)
                              .textTheme
                              .button
                              ?.copyWith(fontSize: 14)),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(
            height: 10,
          ),
          widget.order.orderNextButton.isNotEmpty
              ? Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    ...widget.order.orderNextButton.map((e) {
                      Color color = Theme.of(context).primaryColor;
                      if (e.cancel) {
                        color = Colors.red.shade500;
                      }
                      if (e.finish) {
                        color = Colors.green.shade500;
                      }
                      return Expanded(
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: color,
                            // shape: RoundedRectangleBorder(
                            //   borderRadius: BorderRadius.circular(32.0),
                            // ),
                          ),
                          onPressed: () async {
                            if (loading) return;
                            _setOrderStatus(e);
                          },
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 20.0),
                            child: Text(e.name.toUpperCase()),
                          ),
                        ),
                      );
                    })
                  ],
                )
              : const SizedBox(),
        ],
      ),
    );
  }
}
