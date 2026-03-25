import 'package:animated_snack_bar/animated_snack_bar.dart';
import 'package:arryt/helpers/api_server.dart';
import 'package:arryt/helpers/error_translator.dart';
import 'package:arryt/widgets/orders/orders_items.dart';
import 'package:auto_route/auto_route.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:currency_formatter/currency_formatter.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import 'package:map_launcher/map_launcher.dart';
import 'package:arryt/l10n/app_localizations.dart';
import 'package:modal_bottom_sheet/modal_bottom_sheet.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../helpers/urlLauncher.dart';
import '../../models/new_order.dart';
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
          translateServerError(context, response.data['message'] ?? "Error"),
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
    } on DioException catch (e) {
      setState(() {
        loading = false;
      });
      return AnimatedSnackBar.material(
        translateServerError(context, e.error.toString()),
        type: AnimatedSnackBarType.error,
      ).show(context);
    } catch (e) {
      setState(() {
        loading = false;
      });
      return AnimatedSnackBar.material(
        translateServerError(context, e.toString()),
        type: AnimatedSnackBarType.error,
      ).show(context);
    }
  }

  Future _buildRoute() async {
    try {
      ApiServer api = new ApiServer();
      var response = await api.get("/api/orders/${widget.order.id}/map_type", {
        'created_at': widget.order.created_at.toIso8601String(),
      });

      if (response.statusCode != 200) {
        return AnimatedSnackBar.material(
          translateServerError(context, response.data['message'] ?? "Error"),
          type: AnimatedSnackBarType.error,
        ).show(context);
      } else {
        var mapType = response.data;
        if (mapType != null) {
          if (mapType == 'foot') {
            launchYandexMaps(widget.order.from_lat, widget.order.from_lon,
                widget.order.to_lat, widget.order.to_lon);
          } else {
            launchYandexNavi(widget.order.to_lat, widget.order.to_lon);
          }
        }
      }
    } catch (e) {
      print(e);
    }
  }

  Color? _parseColor(String? hex) {
    if (hex == null || hex.isEmpty) return null;
    hex = hex.replaceFirst('#', '');
    if (hex.length == 6) hex = 'FF$hex';
    final value = int.tryParse(hex, radix: 16);
    return value != null ? Color(value) : null;
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

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
          Flexible(
            child: Text(value,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                textAlign: TextAlign.right),
          ),
        ],
      ),
    );
  }

  void _makePhoneCall(String phoneNumber) async {
    final Uri launchUri = Uri(scheme: 'tel', path: phoneNumber);
    await launchUrl(launchUri);
  }

  bool _isLightColor(Color color) {
    final luminance = (0.299 * color.red + 0.587 * color.green + 0.114 * color.blue) / 255;
    return luminance > 0.6;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final primary = Theme.of(context).primaryColor;
    final statusColor = _parseColor(widget.order.orderStatus.color) ?? Colors.orange;
    final locale = Localizations.localeOf(context).languageCode;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.07),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 6),
            child: Row(
              children: [
                if (widget.order.organization.iconUrl != null) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: CachedNetworkImage(
                      imageUrl: widget.order.organization.iconUrl!,
                      height: 28, width: 28, fit: BoxFit.cover,
                      errorWidget: (c, u, e) => const Icon(Icons.store, size: 20),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                Text("#${widget.order.order_number}",
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(width: 8),
                Flexible(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                        widget.order.orderStatus.localizedName(locale),
                        style: TextStyle(color: Colors.grey.shade800, fontSize: 11, fontWeight: FontWeight.w600),
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                  ),
                ),
                const Spacer(),
                Text(
                  DateFormat('dd.MM.yyyy HH:mm').format(widget.order.created_at.toLocal()),
                  style: TextStyle(fontSize: 14, color: Colors.grey.shade800, fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),

          // Customer info
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Column(
              children: [
                _infoRow(l10n.customer_name, widget.order.customer.name),
                GestureDetector(
                  onTap: () => _makePhoneCall(widget.order.customer.phone),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(l10n.customer_phone, style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                        Row(
                          children: [
                            Icon(Icons.phone, size: 14, color: Colors.green.shade600),
                            const SizedBox(width: 4),
                            Text(widget.order.customer.phone,
                                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Colors.green.shade700)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                if (widget.order.additional_phone != null && widget.order.additional_phone!.isNotEmpty)
                  GestureDetector(
                    onTap: () => _makePhoneCall(widget.order.additional_phone!),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(l10n.additional_phone_label, style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                          Row(
                            children: [
                              Icon(Icons.phone, size: 14, color: Colors.green.shade600),
                              const SizedBox(width: 4),
                              Text(widget.order.additional_phone!,
                                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Colors.green.shade700)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // Terminal
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 0),
            child: Row(
              children: [
                Icon(Icons.store_outlined, size: 14, color: Colors.grey.shade500),
                const SizedBox(width: 6),
                Text(widget.order.terminal.name,
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600, fontWeight: FontWeight.w500)),
              ],
            ),
          ),
          // Address
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 2),
            child: GestureDetector(
              onTap: () => _buildRoute(),
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.location_on_outlined, size: 18, color: primary),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(widget.order.delivery_address ?? '',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                          maxLines: 2, overflow: TextOverflow.ellipsis),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade200,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        "${widget.order.pre_distance.toStringAsFixed(2)} ${l10n.km_label}",
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade700, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Address details
          if (widget.order.house != null || widget.order.entrance != null || widget.order.flat != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
              child: Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  if (widget.order.house != null && widget.order.house!.isNotEmpty)
                    _addressChip(l10n.house_label, widget.order.house!),
                  if (widget.order.entrance != null && widget.order.entrance!.isNotEmpty)
                    _addressChip(l10n.entrance_label, widget.order.entrance!),
                  if (widget.order.flat != null && widget.order.flat!.isNotEmpty)
                    _addressChip(l10n.flat_label, widget.order.flat!),
                ],
              ),
            ),

          // Payment section
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 2),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.receipt_long_outlined, size: 16, color: Colors.grey.shade600),
                          const SizedBox(width: 8),
                          Text("${l10n.order_check_amount} (${_localizePaymentType(widget.order.paymentType, locale)})",
                              style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                        ],
                      ),
                      Text(CurrencyFormatter.format(widget.order.order_price, euroSettings),
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.delivery_dining_outlined, size: 16, color: Colors.grey.shade600),
                          const SizedBox(width: 8),
                          Text(l10n.delivery_price,
                              style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                        ],
                      ),
                      Text(CurrencyFormatter.format(widget.order.delivery_price, euroSettings),
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.person_outline, size: 16, color: Colors.green.shade700),
                          const SizedBox(width: 8),
                          Text(l10n.collect_from_customer,
                              style: TextStyle(fontSize: 13, color: Colors.green.shade700)),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            CurrencyFormatter.format(
                              (widget.order.paymentType?.toLowerCase() == 'наличными' ||
                                      widget.order.paymentType?.toLowerCase() == 'cash')
                                  ? widget.order.order_price
                                  : 0,
                              euroSettings,
                            ),
                            style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.green.shade700),
                          ),
                          Text(
                            _localizePaymentType(widget.order.paymentType, locale).toUpperCase(),
                            style: TextStyle(fontSize: 10, color: Colors.green.shade600),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 4),

          // Action buttons
          Container(
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
            ),
            child: Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () {
                      AutoRouter.of(context).pushNamed(
                          '/order/customer-comments/${widget.order.customer.id}/${widget.order.id}');
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.comment_outlined, size: 15, color: primary),
                          const SizedBox(width: 4),
                          Text(l10n.order_card_comments,
                              style: TextStyle(fontSize: 12, color: primary, fontWeight: FontWeight.w500)),
                        ],
                      ),
                    ),
                  ),
                ),
                Container(width: 1, height: 28, color: Colors.grey.shade200),
                Expanded(
                  child: InkWell(
                    onTap: () {
                      showBarModalBottomSheet(
                        context: context,
                        expand: false,
                        builder: (context) => OrderItemsTable(orderId: widget.order.id),
                      );
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.receipt_outlined, size: 15, color: primary),
                          const SizedBox(width: 4),
                          Text(l10n.order_card_items,
                              style: TextStyle(fontSize: 12, color: primary, fontWeight: FontWeight.w500)),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Accept button
          SizedBox(
            width: double.infinity,
            child: Material(
              color: Colors.green,
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(16),
                bottomRight: Radius.circular(16),
              ),
              child: InkWell(
                onTap: () async {
                  if (loading) return;
                  _approveOrder(widget.order.id);
                },
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(16),
                  bottomRight: Radius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  child: Center(
                    child: loading
                        ? const SizedBox(
                            width: 20, height: 20,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2))
                        : Text(l10n.order_card_btn_accept,
                            style: const TextStyle(
                                color: Colors.white, fontSize: 15, fontWeight: FontWeight.w600)),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _addressChip(String label, String value) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text("$label: $value",
          style: const TextStyle(fontSize: 11, color: Colors.black)),
    );
  }
}
