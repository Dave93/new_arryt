import 'package:arryt/helpers/api_server.dart';
import 'package:arryt/models/manager_couriers_model.dart';
import 'package:arryt/pages/manager/withdraw_for_courier.dart';
import 'package:currency_formatter/currency_formatter.dart';
import 'package:dio/dio.dart';
import 'package:easy_refresh/easy_refresh.dart';
import 'package:flutter/material.dart';
import 'package:arryt/l10n/app_localizations.dart';

class ManagerCouriersList extends StatelessWidget {
  const ManagerCouriersList({super.key});

  @override
  Widget build(BuildContext context) {
    return const ManagerCouriersListView();
  }
}

class ManagerCouriersListView extends StatefulWidget {
  const ManagerCouriersListView({super.key});

  @override
  State<ManagerCouriersListView> createState() =>
      _ManagerCouriersListViewState();
}

class _ManagerCouriersListViewState extends State<ManagerCouriersListView> {
  CurrencyFormatterSettings euroSettings = CurrencyFormatterSettings(
    symbol: 'сум',
    symbolSide: SymbolSide.right,
    thousandSeparator: ' ',
    decimalSeparator: ',',
    symbolSeparator: ' ',
  );
  late EasyRefreshController _controller;
  List<ManagerCouriersModel> couriers = [];
  String _searchQuery = '';

  Future<void> _loadData() async {
    ApiServer apiServer = ApiServer();
    Response response =
        await apiServer.get("/api/couriers/my_couriers/balance", {});
    if (response.statusCode == 200) {
      setState(() {
        couriers = (response.data as List)
            .map((e) => ManagerCouriersModel.fromMap(e))
            .toList();
      });
    }
  }

  @override
  void initState() {
    super.initState();
    _controller = EasyRefreshController(
      controlFinishRefresh: true,
      controlFinishLoad: true,
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final primary = Theme.of(context).primaryColor;

    List<ManagerCouriersModel> filtered = couriers;
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      filtered = couriers.where((c) =>
          '${c.firstName} ${c.lastName}'.toLowerCase().contains(q) ||
          c.terminalName.toLowerCase().contains(q)).toList();
    }

    final totalBalance = filtered.fold<int>(0, (sum, c) => sum + c.balance);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.courierBalanceTabLabel,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
        centerTitle: false,
        elevation: 0,
        backgroundColor: Colors.transparent,
      ),
      body: EasyRefresh(
        controller: _controller,
        header: const ClassicHeader(),
        onRefresh: () async {
          await _loadData();
          _controller.finishRefresh();
          _controller.resetFooter();
        },
        child: Column(
          children: [
            // Total balance card
            Container(
              margin: const EdgeInsets.fromLTRB(12, 0, 12, 8),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [primary, primary.withOpacity(0.7)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(l10n.orderStatTotalPrice,
                          style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 14)),
                      const SizedBox(height: 4),
                      Text(CurrencyFormatter.format(totalBalance, euroSettings),
                          style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text('${filtered.length}',
                        style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
            // Search
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              child: TextField(
                onChanged: (v) => setState(() => _searchQuery = v),
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.search, size: 20),
                  hintText: "${l10n.courierName} / ${l10n.terminal_label}",
                  filled: true,
                  fillColor: Colors.grey.shade100,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none),
                ),
              ),
            ),
            const SizedBox(height: 4),
            // Subtitle
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Text(l10n.chooseCourierForWithdraw,
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
            ),
            // List
            filtered.isNotEmpty
                ? Expanded(
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final item = filtered[index];
                        return GestureDetector(
                          onTap: () {
                            if (item.balance > 0) {
                              showModalBottomSheet(
                                context: context,
                                isScrollControlled: true,
                                builder: (context) => WithdrawForCourier(
                                  courierId: item.courierId,
                                  terminalId: item.terminalId,
                                  balance: item.balance,
                                  refresh: () async {
                                    await _loadData();
                                  },
                                ),
                              );
                            }
                          },
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(14),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.05),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 22,
                                  backgroundColor: primary.withOpacity(0.1),
                                  child: Text(
                                    '${item.firstName.isNotEmpty ? item.firstName[0] : ''}${item.lastName.isNotEmpty ? item.lastName[0] : ''}',
                                    style: TextStyle(
                                      color: primary,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text('${item.firstName} ${item.lastName}',
                                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                                      const SizedBox(height: 2),
                                      Row(
                                        children: [
                                          Icon(Icons.store_outlined, size: 13, color: Colors.grey.shade500),
                                          const SizedBox(width: 4),
                                          Text(item.terminalName,
                                              style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  CurrencyFormatter.format(item.balance, euroSettings),
                                  style: TextStyle(
                                    color: item.balance > 0 ? primary : Colors.grey,
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                if (item.balance > 0) ...[
                                  const SizedBox(width: 4),
                                  Icon(Icons.chevron_right, color: Colors.grey.shade400, size: 20),
                                ],
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  )
                : Expanded(
                    child: Center(
                      child: Text(l10n.balances_empty,
                          style: TextStyle(color: Colors.grey.shade500, fontSize: 16)),
                    ),
                  ),
          ],
        ),
      ),
    );
  }
}
