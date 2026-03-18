import 'package:arryt/helpers/api_server.dart';
import 'package:arryt/models/balance_by_terminal.dart';
import 'package:arryt/l10n/app_localizations.dart';
import 'package:currency_formatter/currency_formatter.dart';
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
  CurrencyFormatterSettings sumSettings = CurrencyFormatterSettings(
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

  Widget _buildRow(String label, int amount, {bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: isTotal ? 15 : 14,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
              color: isTotal ? Colors.black : Colors.grey.shade700,
            ),
          ),
          Text(
            CurrencyFormatter.format(amount, sumSettings),
            style: TextStyle(
              fontSize: isTotal ? 15 : 14,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: isLoading
          ? const Center(child: CircularProgressIndicator())
          : balanceByTerminal.isEmpty
              ? Center(child: Text(l10n.balances_empty))
              : ListView.separated(
                  shrinkWrap: true,
                  itemCount: balanceByTerminal.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final item = balanceByTerminal[index];
                    return Card(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 1,
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.terminalName,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 8),
                            _buildRow(l10n.delivery_price, item.orderAmount),
                            _buildRow(l10n.orderStatBonusPrice, item.bonusAmount),
                            Divider(color: Colors.grey.shade300),
                            _buildRow(l10n.orderStatTotalPrice, item.balance, isTotal: true),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
