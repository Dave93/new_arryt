import 'package:arryt/helpers/api_server.dart';
import 'package:arryt/models/balance_by_terminal.dart';
import 'package:currency_formatter/currency_formatter.dart';
import 'package:data_table_2/data_table_2.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

class MyBalanceByTerminal extends StatelessWidget {
  const MyBalanceByTerminal({super.key});

  @override
  Widget build(BuildContext context) {
    return MyBalanceByTerminalView();
  }
}

class MyBalanceByTerminalView extends StatefulWidget {
  const MyBalanceByTerminalView({super.key});

  @override
  State<MyBalanceByTerminalView> createState() =>
      _MyBalanceByTerminalViewState();
}

class _MyBalanceByTerminalViewState extends State<MyBalanceByTerminalView> {
  CurrencyFormatterSettings euroSettings = CurrencyFormatterSettings(
    symbol: 'сум',
    symbolSide: SymbolSide.right,
    thousandSeparator: ' ',
    decimalSeparator: ',',
    symbolSeparator: ' ',
  );
  bool isLoading = false;
  List<BalanceByTerminal> balanceByTerminal = [];

  Future<void> _loadBalance() async {
    setState(() {
      isLoading = true;
    });
    ApiServer apiServer = ApiServer();
    Response response =
        await apiServer.get("/api/couriers/terminal_balance", {});
    if (response.statusCode == 200) {
      setState(() {
        balanceByTerminal = (response.data as List)
            .map((e) => BalanceByTerminal.fromMap(e))
            .toList();
      });
    }

    setState(() {
      isLoading = false;
    });
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadBalance();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      child: isLoading
          ? const Center(child: CircularProgressIndicator())
          : DataTable2(
              columnSpacing: 12,
              // minWidth: 600,
              columns: const [
                DataColumn2(
                  label: Text("Филиал"),
                  size: ColumnSize.L,
                ),
                DataColumn(
                  label: Text("Сумма остатка"),
                ),
              ],
              rows: List<DataRow>.generate(
                balanceByTerminal.length,
                (index) => DataRow(
                  cells: [
                    DataCell(
                      Text(balanceByTerminal[index].terminalName),
                    ),
                    DataCell(
                      Text(CurrencyFormatter.format(
                          balanceByTerminal[index].balance, euroSettings)),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
