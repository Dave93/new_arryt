import 'package:animated_snack_bar/animated_snack_bar.dart';
import 'package:arryt/helpers/api_server.dart';
import 'package:auto_route/auto_route.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:currency_formatter/currency_formatter.dart';
import 'package:expandable/expandable.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/svg.dart';
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
import '../../models/new_order.dart';
import '../../models/order_next_button.dart';
import '../../models/order_status.dart';
import '../../models/organizations.dart';
import '../../models/terminals.dart';
import '../../models/waiting_order.dart';
import '../location_dialog.dart';

class WaitingOrderCard extends StatefulWidget {
  final NewOrderModel order;
  final void Function() onUpdate;
  const WaitingOrderCard(
      {super.key, required this.order, required this.onUpdate});

  @override
  State<WaitingOrderCard> createState() => _WaitingOrderCardState();
}

class _WaitingOrderCardState extends State<WaitingOrderCard> {
  CurrencyFormatterSettings euroSettings = CurrencyFormatterSettings(
    symbol: 'сум',
    symbolSide: SymbolSide.right,
    thousandSeparator: ' ',
    decimalSeparator: ',',
    symbolSeparator: ' ',
  );

  bool loading = false;

  Future<void> _approveOrder(String orderId) async {
    setState(() {
      loading = true;
    });
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

    ApiServer api = new ApiServer();

    try {
      var response = await api.post('/api/orders/approve', {
        'order_id': orderId,
        'latitude': currentPosition?.latitude,
        'longitude': currentPosition?.longitude,
      });

      if (response.statusCode != 200) {
        setState(() {
          loading = false;
        });
        return AnimatedSnackBar.material(
          response.data['message'] ?? "Error",
          type: AnimatedSnackBarType.error,
        ).show(context);
      } else {
        setState(() {
          loading = false;
        });
        AnimatedSnackBar.material(
          AppLocalizations.of(context)!.orderApprovedSuccessfully,
          type: AnimatedSnackBarType.success,
          mobileSnackBarPosition: MobileSnackBarPosition.bottom,
        ).show(context);
        print(response.data);
        if (response.data != null) {
          widget.onUpdate();
        }
      }
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

  Future _buildRoute() async {
    var client = GraphQLProvider.of(context).value;
    var query = '''
      query {
        getDeliveryMapType(order_id: "${widget.order.id}")
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
            decoration: const BoxDecoration(
                color: Color.fromRGBO(232, 232, 232, 1.0),
                borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(20),
                    topRight: Radius.circular(20))),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                widget.order.organization != null &&
                        widget.order.organization.iconUrl != null
                    ? Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: CachedNetworkImage(
                          height: 30,
                          imageUrl: widget.order.organization.iconUrl!,
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
                      Text(widget.order.customer.name),
                    ],
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        AppLocalizations.of(context)!.customer_phone,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Text(widget.order.customer.phone),
                    ],
                  ),
                  // Row(
                  //   mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  //   children: [
                  //     Text(
                  //       AppLocalizations.of(context)!.address,
                  //       style: const TextStyle(fontWeight: FontWeight.bold),
                  //     ),
                  //     const Spacer(),
                  //     Flexible(
                  //       fit: FlexFit.loose,
                  //       child: Text(
                  //         widget.order.delivery_address ?? '',
                  //       ),
                  //     ),
                  //   ],
                  // ),
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
                                widget.order.terminal.name,
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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        AppLocalizations.of(context)!.delivery_price,
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
                        widget.order.orderStatus.name,
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
          // Padding(
          //     padding: const EdgeInsets.all(8.0),
          //     child: Row(
          //       mainAxisAlignment: MainAxisAlignment.center,
          //       children: [
          //         GestureDetector(
          //           onTap: () async {
          //             final coords =
          //                 Coords(widget.order.to_lat, widget.order.to_lon);
          //             final title = widget.order.delivery_address ?? '';
          //             final availableMaps = await MapLauncher.installedMaps;
          //             showModalBottomSheet(
          //               context: context,
          //               builder: (BuildContext context) {
          //                 return SafeArea(
          //                   child: SingleChildScrollView(
          //                     child: Container(
          //                       child: Wrap(
          //                         children: <Widget>[
          //                           for (var map in availableMaps)
          //                             ListTile(
          //                               onTap: () => map.showMarker(
          //                                 coords: coords,
          //                                 title: title,
          //                               ),
          //                               title: Text(map.mapName),
          //                               leading: SvgPicture.asset(
          //                                 map.icon,
          //                                 height: 30.0,
          //                                 width: 30.0,
          //                               ),
          //                             ),
          //                         ],
          //                       ),
          //                     ),
          //                   ),
          //                 );
          //               },
          //             );
          //           },
          //           child: const Icon(
          //             Icons.location_pin,
          //             color: Colors.deepPurple,
          //             size: 40,
          //           ),
          //         ),
          //       ],
          //     )),
          Container(
            color: Theme.of(context).primaryColor,
            child: IntrinsicHeight(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  GestureDetector(
                    onTap: () {
                      AutoRouter.of(context).pushNamed(
                          '/order/customer-comments/${widget.order.customer.id}/${widget.order.id}');
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
                            orderId: widget.order.id,
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
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Expanded(
                  child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.all(0),
                  backgroundColor: Colors.green.shade500,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(0),
                  ),
                ),
                onPressed: () async {
                  if (loading) return;
                  _approveOrder(widget.order.id);
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 20.0),
                  child: loading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : Text(
                          AppLocalizations.of(context)!.order_card_btn_accept,
                          style: const TextStyle(color: Colors.white),
                        ),
                ),
              ))
            ],
          )
          // Container(
          //   decoration: const BoxDecoration(
          //       borderRadius: BorderRadius.only(
          //           bottomLeft: Radius.circular(19),
          //           bottomRight: Radius.circular(19))),
          //   clipBehavior: Clip.antiAlias,
          //   child: ,
          // )
        ],
      ),
    );
  }
}
