import 'package:arryt/helpers/api_graphql_provider.dart';
import 'package:arryt/models/garant_order_model.dart';
import 'package:currency_formatter/currency_formatter.dart';
import 'package:data_table_2/data_table_2.dart';
import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:intl/intl.dart';

import '../../models/order.dart';

class GarantOrderHistory extends StatelessWidget {
  DateTime dateFrom;
  DateTime dateTo;
  GarantOrderHistory({super.key, required this.dateFrom, required this.dateTo});

  @override
  Widget build(BuildContext context) {
    return ApiGraphqlProvider(
        child: GarantOrderHistoryView(
      dateFrom: dateFrom,
      dateTo: dateTo,
    ));
  }
}

class GarantOrderHistoryView extends StatefulWidget {
  DateTime dateFrom;
  DateTime dateTo;
  GarantOrderHistoryView(
      {super.key, required this.dateFrom, required this.dateTo});

  @override
  State<GarantOrderHistoryView> createState() => _GarantOrderHistoryViewState();
}

class _GarantOrderHistoryViewState extends State<GarantOrderHistoryView> {
  CurrencyFormatterSettings euroSettings = CurrencyFormatterSettings(
    symbol: 'сум',
    symbolSide: SymbolSide.right,
    thousandSeparator: ' ',
    decimalSeparator: ',',
    symbolSeparator: ' ',
  );
  bool loading = false;

  List<GarantOrderModel> orderList = [];

  Future<void> _loadData() async {
    setState(() {
      loading = true;
    });
    var client = GraphQLProvider.of(context).value;
    var query = r'''
      query mySuccessOrders($dateFrom: Date!, $dateTo: Date!) {
        mySuccessOrders(startDate: $dateFrom, endDate: $dateTo) {
          id
          pre_distance
          order_number
          delivery_price
          delivery_address
          created_at
          payment_type
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
        }
      }''';

    var data = await client.query(QueryOptions(
        document: gql(query),
        fetchPolicy: FetchPolicy.noCache,
        variables: {
          'dateFrom': widget.dateFrom.toString(),
          'dateTo': widget.dateTo.toString(),
        }));
    if (data.data?['mySuccessOrders'] != null) {
      List<GarantOrderModel> orders = [];
      for (var order in data.data?['mySuccessOrders']) {
        orders.add(GarantOrderModel.fromMap(order));
      }

      setState(() {
        loading = false;
        orderList = orders;
      });
    }
  }

  @override
  void initState() {
    // TODO: implement initState
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          title:
              Text(AppLocalizations.of(context)!.ordersHistory.toUpperCase()),
        ),
        body: Padding(
          padding: EdgeInsets.all(10),
          child: DataTable2(
            columnSpacing: 5,
            // minWidth: 600,
            columns: [
              const DataColumn2(
                label: Text("#"),
                // size: ColumnSize.L,
              ),
              DataColumn2(
                label: Text(AppLocalizations.of(context)!.orderDate),
                size: ColumnSize.L,
              ),
              DataColumn2(
                label: Text(AppLocalizations.of(context)!.phone_field_label),
                size: ColumnSize.L,
              ),
              DataColumn(
                  label: Text(AppLocalizations.of(context)!.delivery_price)),
            ],
            rows: List<DataRow>.generate(
              orderList.length,
              (index) => DataRow(
                cells: [
                  DataCell(
                    Text(orderList[index].order_number.toString()),
                  ),
                  DataCell(
                    Text(DateFormat('dd.MM.yyyy HH:mm')
                        .format(DateTime.parse(orderList[index].created_at))),
                  ),
                  DataCell(
                    Text(orderList[index].customer?.phone ?? ''),
                  ),
                  DataCell(
                    Text(CurrencyFormatter.format(
                        orderList[index].delivery_price, euroSettings)),
                  ),
                ],
              ),
            ),
          ),
        ));
  }
}
