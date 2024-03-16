import 'package:animated_snack_bar/animated_snack_bar.dart';
import 'package:arryt/helpers/api_graphql_provider.dart';
import 'package:arryt/helpers/api_server.dart';
import 'package:arryt/models/couriers.dart';
import 'package:arryt/models/order.dart';
import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:loading_overlay/loading_overlay.dart';

class OrderChangeCourier extends StatelessWidget {
  // callback function to pass data back to parent widget
  void Function() callback;
  OrderModel order;
  OrderChangeCourier({super.key, required this.order, required this.callback});

  @override
  Widget build(BuildContext context) {
    return OrderChangeCourierView(order: order, callback: callback);
  }
}

class OrderChangeCourierView extends StatefulWidget {
  // callback function to pass data back to parent widget
  void Function() callback;
  OrderModel order;
  OrderChangeCourierView(
      {super.key, required this.order, required this.callback});

  @override
  State<OrderChangeCourierView> createState() => _OrderChangeCourierViewState();
}

class _OrderChangeCourierViewState extends State<OrderChangeCourierView> {
  List<Couriers> couriers = [];
  bool isLoading = false;

  Future<void> _loadCouriers() async {
    setState(() {
      isLoading = true;
    });
    ApiServer api = ApiServer();

    var response = await api.get('/api/couriers/my_couriers', {});

    setState(() {
      isLoading = false;
    });
    if (response.statusCode != 200) {
      return AnimatedSnackBar.material(
        response.data['message'] ?? "Error",
        type: AnimatedSnackBarType.error,
      ).show(context);
    } else {
      setState(() {
        couriers = (response.data as List<dynamic>)
            .map((e) => Couriers.fromMap(e))
            .toList();
      });
    }
  }

  Future<void> _setCourier(String courierId) async {
    setState(() {
      isLoading = true;
    });

    ApiServer api = ApiServer();

    var response =
        await api.post("/api/orders/${widget.order.identity}/assign", {
      'courier_id': courierId,
    });

    if (response.statusCode != 200) {
      setState(() {
        isLoading = false;
      });
      return AnimatedSnackBar.material(
        response.data['message'] ?? "Error",
        type: AnimatedSnackBarType.error,
      ).show(context);
    } else {
      setState(() {
        isLoading = false;
      });
      widget.callback();
      Navigator.of(context).pop();
    }
  }

  @override
  void initState() {
    // TODO: implement initState
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadCouriers();
    });
  }

  @override
  Widget build(BuildContext context) {
    return LoadingOverlay(
      isLoading: isLoading,
      child: Container(
        color: Colors.white,
        child: Column(
          children: [
            AppBar(
              centerTitle: true,
              leading: const SizedBox(),
              actions: [
                IconButton(
                    onPressed: () {
                      Navigator.pop(context);
                    },
                    icon: const Icon(Icons.close))
              ],
              foregroundColor: Colors.black,
              backgroundColor: Colors.white,
              elevation: 0,
              title: Text(AppLocalizations.of(context)!
                  .chooseCourierLabel
                  .toUpperCase()),
            ),
            Expanded(
                child: ListView.separated(
                    separatorBuilder: (context, index) => const Divider(),
                    itemCount: couriers.length,
                    itemBuilder: (context, index) {
                      return ListTile(
                          title: Text(
                              '${couriers[index].firstName} ${couriers[index].lastName}'),
                          onTap: () {
                            _setCourier(couriers[index].identity);
                          });
                    }))
          ],
        ),
      ),
    );
  }
}
