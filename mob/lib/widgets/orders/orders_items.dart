import 'package:animated_snack_bar/animated_snack_bar.dart';
import 'package:data_table_2/data_table_2.dart';
import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';

import '../../models/order_items.dart';

class OrderItemsTable extends StatefulWidget {
  final String orderId;
  const OrderItemsTable({super.key, required this.orderId});

  @override
  State<OrderItemsTable> createState() => _OrderItemsTableState();
}

class _OrderItemsTableState extends State<OrderItemsTable> {
  List<OrderItemsModel> items = [];

  Future<void> _loadOrderItems() async {
    try {
      var client = GraphQLProvider.of(context).value;
      var query = gql('''
      query {
        orderItems(orderId: "${widget.orderId}") {
          productId
          quantity
          name
          price
          }
          }
          ''');
      QueryResult result = await client.query(QueryOptions(
          document: query,
          cacheRereadPolicy: CacheRereadPolicy.mergeOptimistic,
          fetchPolicy: FetchPolicy.networkOnly));
      if (result.hasException) {
        AnimatedSnackBar.material(
          result.exception?.graphqlErrors[0].message ?? "Error",
          type: AnimatedSnackBarType.error,
        ).show(context);
      }

      if (result.data != null) {
        if (result.data!['orderItems'] != null) {
          setState(() {
            items = (result.data!['orderItems'] as List)
                .map((e) => OrderItemsModel.fromMap(e))
                .toList();
          });
        }
      }
    } catch (e) {
      AnimatedSnackBar.material(
        e.toString(),
        type: AnimatedSnackBarType.error,
      ).show(context);
    }
  }

  @override
  void initState() {
    // TODO: implement initState
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadOrderItems();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      child: DataTable2(
        columnSpacing: 12,
        // minWidth: 600,
        columns: const [
          DataColumn2(
            label: Text("Товар"),
            size: ColumnSize.L,
          ),
          DataColumn(
            label: Text("Цена"),
          ),
          DataColumn(
            label: Text("Кол-во"),
          ),
          DataColumn(
            label: Text("Всего"),
          ),
        ],
        rows: List<DataRow>.generate(
          items.length,
          (index) => DataRow(
            cells: [
              DataCell(
                Text(items[index].name),
              ),
              DataCell(
                Text(items[index].price.toString()),
              ),
              DataCell(
                Text(items[index].quantity.toString()),
              ),
              DataCell(
                Text((items[index].price * items[index].quantity).toString()),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
