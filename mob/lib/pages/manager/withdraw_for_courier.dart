import 'package:arryt/helpers/api_graphql_provider.dart';
import 'package:arryt/models/transactions.dart';
import 'package:currency_formatter/currency_formatter.dart';
import 'package:currency_text_input_formatter/currency_text_input_formatter.dart';
import 'package:data_table_2/data_table_2.dart';
import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:intl/intl.dart';
import 'package:loading_overlay/loading_overlay.dart';

class WithdrawForCourier extends StatelessWidget {
  final String courierId;
  final String terminalId;
  final int balance;
  final Function refresh;
  const WithdrawForCourier(
      {super.key,
      required this.courierId,
      required this.terminalId,
      required this.balance,
      required this.refresh});

  @override
  Widget build(BuildContext context) {
    return ApiGraphqlProvider(
        child: WithdrawForCourierView(
      balance: balance,
      courierId: courierId,
      terminalId: terminalId,
      refresh: refresh,
    ));
  }
}

class WithdrawForCourierView extends StatefulWidget {
  final String courierId;
  final String terminalId;
  final int balance;
  final Function refresh;
  const WithdrawForCourierView(
      {super.key,
      required this.courierId,
      required this.terminalId,
      required this.balance,
      required this.refresh});

  @override
  State<WithdrawForCourierView> createState() => _WithdrawForCourierViewState();
}

class _WithdrawForCourierViewState extends State<WithdrawForCourierView> {
  bool _isLoading = false;
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _amountController = TextEditingController();
  CurrencyFormatterSettings euroSettings = CurrencyFormatterSettings(
    symbol: 'сум',
    symbolSide: SymbolSide.right,
    thousandSeparator: ' ',
    decimalSeparator: ',',
    symbolSeparator: ' ',
  );
  CurrencyFormatterSettings sumSettings = CurrencyFormatterSettings(
    symbol: '',
    symbolSide: SymbolSide.right,
    thousandSeparator: ' ',
    decimalSeparator: ',',
    symbolSeparator: ' ',
  );

  String value = '';

  List<Transactions> transactions = [];

  Future<void> _loadTransactions() async {
    var client = GraphQLProvider.of(context).value;
    var query = r'''
      query($courierId: String!, $terminalId: String!) {
        orderTransactions(where: {
            courier_id: {
                equals: $courierId
            }
            status: {
                equals: pending
            }
            terminal_id: {
                equals: $terminalId
            }
        }) {
            not_paid_amount
            transaction_type
            order_transactions_orders {
                order_number
            }
            order_transactions_terminals {
                name
            }
            created_at
        }
    }
    ''';
    var data = await client.query(
      QueryOptions(
          document: gql(query),
          variables: <String, dynamic>{
            'courierId': widget.courierId,
            'terminalId': widget.terminalId
          },
          fetchPolicy: FetchPolicy.noCache),
    );
    if (data.data?['orderTransactions'] != null) {
      List<Transactions> items = [];
      data.data?['orderTransactions'].forEach((order) {
        items.add(Transactions.fromMap(order));
      });
      setState(() {
        transactions = items;
      });
    }
  }

  @override
  void initState() {
    // TODO: implement initState
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadTransactions();
    });
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        FocusScopeNode currentFocus = FocusScope.of(context);

        if (!currentFocus.hasPrimaryFocus &&
            currentFocus.focusedChild != null) {
          FocusManager.instance.primaryFocus?.unfocus();
        }
      },
      child: Scaffold(
          appBar: AppBar(
              toolbarHeight: 100,
              backgroundColor: Colors.white,
              elevation: 0,
              leading: GestureDetector(
                child: const Icon(
                  Icons.arrow_back_ios_new_outlined,
                  color: Colors.black,
                ),
                onTap: () {
                  Navigator.of(context).pop();
                },
              )),
          backgroundColor: Colors.white,
          body: LoadingOverlay(
            isLoading: _isLoading,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              mainAxisAlignment: MainAxisAlignment.start,
              // mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(
                  height: 20,
                ),
                Text(
                    AppLocalizations.of(context)!
                        .currentBalanceLabel
                        .toUpperCase(),
                    style: const TextStyle(
                        fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(
                  height: 20,
                ),
                Text(CurrencyFormatter.format(widget.balance, euroSettings),
                    style: TextStyle(
                        fontSize: 40,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).primaryColor)),
                const SizedBox(
                  height: 50,
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 25.0),
                  child: TextFormField(
                    inputFormatters: [
                      CurrencyTextInputFormatter(
                        locale: 'ru',
                        decimalDigits: 0,
                        symbol: ' ',
                      )
                    ],
                    controller: _amountController,
                    keyboardType:
                        const TextInputType.numberWithOptions(signed: true),
                    autofocus: true,
                    decoration: InputDecoration(
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20)),
                      hintText:
                          AppLocalizations.of(context)!.typeWithdrawAmount,
                    ),
                    onChanged: (value) {
                      setState(() {
                        this.value = value;
                      });
                    },
                  ),
                ),
                const SizedBox(
                  height: 20,
                ),
                const Text(
                  "Не оплаченные суммы",
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                Expanded(
                  child: DataTable2(
                    columnSpacing: 12,
                    // minWidth: 600,
                    columns: const [
                      DataColumn2(
                          label: Text("Дата"),
                          size: ColumnSize.L,
                          fixedWidth: 100),
                      DataColumn2(
                        label: Text("Заказ"),
                        size: ColumnSize.L,
                      ),
                      DataColumn2(label: Text("Сумма"), fixedWidth: 70),
                      DataColumn(
                        label: Text("Филиал"),
                      ),
                      DataColumn(
                        label: Text("Тип"),
                      ),
                    ],
                    rows: List<DataRow>.generate(
                      transactions.length,
                      (index) {
                        String typeText = '';
                        switch (transactions[index].transaction_type) {
                          case 'daily_garant':
                            typeText = 'Дневной гарант';
                            break;
                          case 'bonus':
                            typeText = 'Бонус';
                            break;
                          case 'order':
                            typeText = 'Доставка';
                            break;
                        }
                        return DataRow(
                          cells: [
                            DataCell(
                              Text(DateFormat('dd MMMM yyyy', 'ru_RU').format(
                                  DateTime.parse(
                                      transactions[index].created_at))),
                            ),
                            DataCell(
                              Text(transactions[index]
                                      ?.order_transactions_orders
                                      ?.order_number ??
                                  ''),
                            ),
                            DataCell(
                              Text(CurrencyFormatter.format(
                                  transactions[index].not_paid_amount,
                                  sumSettings)),
                            ),
                            DataCell(
                              Text(transactions[index]
                                  .order_transactions_terminals
                                  .name),
                            ),
                            DataCell(Text(typeText))
                          ],
                        );
                      },
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 25.0, vertical: 15),
                  child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                          backgroundColor: value.isNotEmpty
                              ? Theme.of(context).primaryColor
                              : Colors.grey,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(20)),
                          minimumSize: const Size.fromHeight(55)),
                      onPressed: () {
                        RegExp whitespaceRegex = RegExp(r'\s+');
                        int number =
                            int.parse(value.replaceAll(whitespaceRegex, ''));
                        if (value.isNotEmpty) {
                          setState(() {
                            _isLoading = true;
                          });
                          var client = GraphQLProvider.of(context).value;
                          var query = r'''
                    mutation withdrawCourierBalance($amount: Int!, $courier_id: String!, $terminal_id: String!) {
                      withdrawCourierBalance(amount: $amount, courier_id: $courier_id, terminal_id: $terminal_id) {
                        id
                      }
                    }
                  ''';
                          client.mutate(MutationOptions(
                              document: gql(query),
                              variables: {
                                'amount': number,
                                'courier_id': widget.courierId,
                                'terminal_id': widget.terminalId
                              },
                              onCompleted: (dynamic resultData) {
                                setState(() {
                                  _isLoading = false;
                                });
                                widget.refresh();
                                Navigator.pop(context);
                              }));
                        }
                      },
                      child: Text(
                          AppLocalizations.of(context)!.withdrawButtonLabel)),
                ),
              ],
            ),
          )),
    );
  }
}
