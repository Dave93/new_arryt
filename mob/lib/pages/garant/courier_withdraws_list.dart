import 'package:arryt/helpers/api_graphql_provider.dart';
import 'package:currency_formatter/currency_formatter.dart';
import 'package:data_table_2/data_table_2.dart';
import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:intl/intl.dart';
import 'package:loading_overlay/loading_overlay.dart';

import '../../models/withdraw_model.dart';

class CourierWithDrawList extends StatelessWidget {
  DateTime dateFrom;
  DateTime dateTo;
  CourierWithDrawList(
      {super.key, required this.dateFrom, required this.dateTo});

  @override
  Widget build(BuildContext context) {
    return ApiGraphqlProvider(
        child: CourierWithDrawListView(
      dateFrom: dateFrom,
      dateTo: dateTo,
    ));
  }
}

class CourierWithDrawListView extends StatefulWidget {
  DateTime dateFrom;
  DateTime dateTo;
  CourierWithDrawListView(
      {super.key, required this.dateFrom, required this.dateTo});

  @override
  State<CourierWithDrawListView> createState() =>
      _CourierWithDrawListViewState();
}

class _CourierWithDrawListViewState extends State<CourierWithDrawListView> {
  CurrencyFormatterSettings euroSettings = CurrencyFormatterSettings(
    symbol: 'сум',
    symbolSide: SymbolSide.right,
    thousandSeparator: ' ',
    decimalSeparator: ',',
    symbolSeparator: ' ',
  );
  bool loading = false;

  List<WithDrawModel> withDrawList = [];

  Future<void> _loadData() async {
    setState(() {
      loading = true;
    });
    var client = GraphQLProvider.of(context).value;
    var query = r'''
      query courierWithdraws($dateFrom: Date!, $dateTo: Date!) {
        courierWithdraws(startDate: $dateFrom, endDate: $dateTo) {
          id
          amount
          created_at
          manager_withdraw_terminals {
            id
            name
          }
          manager_withdraw_managers {
            id
            first_name
            last_name
          }
        }
      }
    ''';
    var variables = {
      'dateFrom': widget.dateFrom.toString(),
      'dateTo': widget.dateTo.toString(),
    };
    var data = await client.query(QueryOptions(
        document: gql(query),
        fetchPolicy: FetchPolicy.noCache,
        variables: {
          'dateFrom': widget.dateFrom.toString(),
          'dateTo': widget.dateTo.toString(),
        }));
    if (data.data?['courierWithdraws'] != null) {
      List<WithDrawModel> orders = [];
      for (var order in data.data?['courierWithdraws']) {
        orders.add(WithDrawModel.fromMap(order));
      }

      setState(() {
        loading = false;
        withDrawList = orders;
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
        title: const Text('Список выводов'),
      ),
      body: LoadingOverlay(
        isLoading: loading,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 20),
          child: ListView.separated(
            itemCount: withDrawList.length,
            shrinkWrap: true,
            separatorBuilder: (context, index) => const Divider(),
            itemBuilder: (context, index) {
              return ListTile(
                title: Text(
                  withDrawList[index].terminal?.name ?? '',
                  style: const TextStyle(fontSize: 18),
                ),
                trailing: Text(
                  CurrencyFormatter.format(
                    withDrawList[index].amount,
                    euroSettings,
                  ),
                  style: const TextStyle(fontSize: 18),
                ),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Дата: ${DateFormat('dd.MM.yyyy').format(DateTime.parse(withDrawList[index].created_at))}',
                      style: const TextStyle(fontSize: 18),
                    ),
                    Text(
                      'Менеджер: ${withDrawList[index].manager?.firstName} ${withDrawList[index].manager?.lastName}',
                      style: const TextStyle(fontSize: 18),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
