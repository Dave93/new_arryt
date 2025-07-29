import 'package:arryt/helpers/api_server.dart';
import 'package:arryt/models/manager_couriers_model.dart';
import 'package:arryt/pages/manager/withdraw_for_courier.dart';
import 'package:auto_size_text/auto_size_text.dart';
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
    // TODO: implement initState
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
    return Scaffold(
        appBar: AppBar(
          toolbarHeight: 120,
          // actions: [
          //   Padding(
          //     padding: const EdgeInsets.only(right: 15),
          //     child: IconButton(
          //       icon: Icon(
          //         Icons.qr_code_scanner_outlined,
          //         color: Theme.of(context).primaryColor,
          //         size: 45,
          //       ),
          //       onPressed: () async {
          //         showModalBottomSheet(
          //             context: context,
          //             builder: (context) => const ManagerShowQRCode());
          //       },
          //     ),
          //   )
          // ],
          title: Padding(
            padding: const EdgeInsets.symmetric(vertical: 20),
            child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(AppLocalizations.of(context)!.courierBalanceTabLabel,
                      style:
                          const TextStyle(color: Colors.black, fontSize: 30)),
                ]),
          ),
          elevation: 0,
          backgroundColor: Colors.transparent,
          primary: true,
        ),
        body: EasyRefresh(
          controller: _controller,
          header: const BezierCircleHeader(),
          onRefresh: () async {
            await _loadData();
            _controller.finishRefresh();
            _controller.resetFooter();
          },
          child: Column(
            children: [
              AutoSizeText(
                AppLocalizations.of(context)!.chooseCourierForWithdraw,
                style:
                    const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              couriers.length > 0
                  ? Expanded(
                      child: ListView.separated(
                        shrinkWrap: true,
                        separatorBuilder: (context, index) => const Divider(
                          height: 1,
                          color: Colors.black,
                        ),
                        // shrinkWrap: true,
                        itemCount: couriers.length,
                        itemBuilder: (context, index) {
                          ManagerCouriersModel item = couriers[index];
                          return GestureDetector(
                            child: ListTile(
                              title: Text('${item.firstName} ${item.lastName}'),
                              subtitle: Text(item.terminalName),
                              trailing: Text(
                                  CurrencyFormatter.format(
                                      item.balance, euroSettings),
                                  style: TextStyle(
                                      color: Theme.of(context).primaryColor,
                                      fontSize: 25,
                                      fontWeight: FontWeight.bold)),
                            ),
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
                          );
                        },
                      ),
                    )
                  : const Center(child: Text('Балансы пусты'))
            ],
          ),
        ));
  }
}
