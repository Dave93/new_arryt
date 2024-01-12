import 'package:arryt/helpers/api_graphql_provider.dart';
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
    return ApiGraphqlProvider(
        child: OrderChangeCourierView(order: order, callback: callback));
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
    var client = GraphQLProvider.of(context).value;
    var query = r'''
      query {
        myCouriers {
          id
          first_name
          last_name
        }
      }
    ''';
    var result = await client.query(QueryOptions(
        document: gql(query), fetchPolicy: FetchPolicy.cacheAndNetwork));
    setState(() {
      isLoading = false;
    });
    if (result.hasException) {
      print(result.exception);
      return;
    }
    var data = result.data!['myCouriers'] as List;
    setState(() {
      couriers = data.map((e) => Couriers.fromJson(e)).toList();
    });
  }

  Future<void> _setCourier(String courierId) async {
    setState(() {
      isLoading = true;
    });
    var client = GraphQLProvider.of(context).value;
    var query = r'''
      mutation($courierId: String!, $orderId: String!) {
        assignOrderCourier(courierId: $courierId, orderId: $orderId) {
          id
        }
      }
    ''';
    var result = await client.mutate(MutationOptions(
        document: gql(query),
        variables: {'courierId': courierId, 'orderId': widget.order.identity},
        fetchPolicy: FetchPolicy.cacheAndNetwork));
    setState(() {
      isLoading = false;
    });
    if (result.hasException) {
      print(result.exception);
      return;
    }
    widget.callback();

    Navigator.of(context).pop();
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
                          title: Text('${couriers[index].firstName} ${couriers[index].lastName}'),
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
