import 'package:arryt/helpers/api_graphql_provider.dart';
import 'package:arryt/models/mygarant.dart';
import 'package:arryt/pages/garant/courier_withdraws_list.dart';
import 'package:arryt/widgets/orders/garant_orders_history.dart';
import 'package:auto_size_text/auto_size_text.dart';
import 'package:currency_formatter/currency_formatter.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:intl/intl.dart';
import 'package:loading_overlay/loading_overlay.dart';
import 'package:mat_month_picker_dialog/mat_month_picker_dialog.dart';
import 'package:modal_bottom_sheet/modal_bottom_sheet.dart';
import 'package:responsive_grid/responsive_grid.dart';

import '../../widgets/profile/my_balance_by_terminal.dart';

class MyGarantPage extends StatelessWidget {
  const MyGarantPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ApiGraphqlProvider(child: MyGarantView());
  }
}

class MyGarantView extends StatefulWidget {
  const MyGarantView({super.key});

  @override
  State<MyGarantView> createState() => _MyGarantViewState();
}

class _MyGarantViewState extends State<MyGarantView> {
  DateTime currentMonth = DateTime.now();
  bool loading = false;
  MyGarantModel? myGarant;

  Future<void> loadData() async {
    print(currentMonth);
    setState(() {
      loading = true;
    });
    var firstDay = DateTime(currentMonth.year, currentMonth.month, 1);
    var lastDay = DateTime(currentMonth.year, currentMonth.month + 1, 0);
    var client = GraphQLProvider.of(context).value;
    var query = r'''
      query calculateGarantByCourier($startDate: Date!, $endDate: Date!) {
        calculateGarantByCourier(
          startDate: $startDate,
          endDate: $endDate
        ) {
            courier
            courier_id
            begin_date
            last_order_date
            created_at
            status
            avg_delivery_time
            formatted_avg_delivery_time
            orders_count
            order_dates_count
            possible_day_offs
            actual_day_offs
            delivery_price
            garant_price
            earned
            balance
            garant_days
            balance_to_pay
            drive_type
            possible_garant_price
            actual_day_offs_list
        }
      }
    ''';
    var result = await client.query(
      QueryOptions(
          document: gql(query),
          fetchPolicy: FetchPolicy.noCache,
          variables: {
            "startDate": DateFormat("yyyy-MM-dd").format(firstDay),
            "endDate": DateFormat("yyyy-MM-dd").format(lastDay)
          }),
    );
    print(result.data);
    if (result.hasException) {
      setState(() {
        loading = false;
      });
      print(result.exception);
    } else {
      if (result.data != null &&
          result.data!["calculateGarantByCourier"] != null) {
        MyGarantModel myGarantModel =
            MyGarantModel.fromMap(result.data!["calculateGarantByCourier"]);
        setState(() {
          myGarant = myGarantModel;
          loading = false;
        });
      }
    }
  }

  @override
  void initState() {
    // TODO: implement initState
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      loadData();
    });
  }

  @override
  Widget build(BuildContext context) {
    CurrencyFormatterSettings euroSettings = CurrencyFormatterSettings(
      symbol: '',
      symbolSide: SymbolSide.right,
      thousandSeparator: ' ',
      decimalSeparator: ',',
      symbolSeparator: ' ',
    );
    return Scaffold(
      appBar: AppBar(
        title: Text(AppLocalizations.of(context)!
            .myGarantMenuLabel
            .replaceFirst("\n", " ")
            .toUpperCase()),
      ),
      body: LoadingOverlay(
        isLoading: loading,
        child: ListView(
          shrinkWrap: true,
          children: [
            Container(
              margin: EdgeInsets.symmetric(vertical: 10),
              padding: EdgeInsets.symmetric(horizontal: 10),
              child: Row(
                children: [
                  Expanded(
                      child: GestureDetector(
                    onTap: () async {
                      final selected = await showMonthPicker(
                          context: context,
                          initialDate: currentMonth,
                          firstDate: DateTime(2019),
                          lastDate: DateTime(2223));
                      print(selected);
                      if (selected != null) {
                        setState(() {
                          currentMonth = selected;
                        });
                        SchedulerBinding.instance.addPostFrameCallback((_) {
                          loadData();
                        });
                      }
                    },
                    child: Container(
                      decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10),
                          color: Theme.of(context).primaryColor),
                      child: Padding(
                        padding: EdgeInsets.all(8.0),
                        child: Column(children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              Text(
                                currentMonth.year.toString(),
                                style: const TextStyle(color: Colors.white),
                              ),
                            ],
                          ),
                          Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  DateFormat(
                                          "MMM",
                                          Localizations.localeOf(context)
                                              .languageCode)
                                      .format(currentMonth)
                                      .toUpperCase(),
                                  style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 30,
                                      color: Colors.white),
                                )
                              ])
                        ]),
                      ),
                    ),
                  )),
                  const Spacer(),
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        showMaterialModalBottomSheet(
                            context: context,
                            builder: (context) => CourierWithDrawList(
                                  dateFrom: DateTime(
                                      currentMonth.year, currentMonth.month, 1),
                                  dateTo: DateTime(currentMonth.year,
                                      currentMonth.month + 1, 0),
                                ));
                      },
                      child: Container(
                        height: 80,
                        decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(10),
                            color: Theme.of(context).primaryColor),
                        child: Padding(
                          padding: EdgeInsets.all(8),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              Text(
                                AppLocalizations.of(context)!
                                    .withdrawHistory
                                    .toUpperCase(),
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  )
                ],
              ),
            ),
            Container(
                margin:
                    const EdgeInsets.symmetric(vertical: 10, horizontal: 10),
                child: ElevatedButton(
                    onPressed: () {
                      loadData();
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.refresh),
                          const SizedBox(
                            width: 10,
                          ),
                          Text(AppLocalizations.of(context)!
                              .refresh
                              .toUpperCase()),
                        ],
                      ),
                    ))),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10),
              child: myGarant == null
                  ? Center(
                      child: Text(
                      AppLocalizations.of(context)!.garantNoData.toUpperCase(),
                    ))
                  : ResponsiveGridRow(
                      children: [
                        ResponsiveGridCol(
                          xs: 6,
                          md: 3,
                          child: Container(
                            margin: const EdgeInsets.symmetric(
                                vertical: 5, horizontal: 5),
                            child: GestureDetector(
                              onTap: () {
                                showMaterialModalBottomSheet(
                                    context: context,
                                    builder: (context) => GarantOrderHistory(
                                          dateFrom: DateTime(currentMonth.year,
                                              currentMonth.month, 1),
                                          dateTo: DateTime(currentMonth.year,
                                              currentMonth.month + 1, 0),
                                        ));
                              },
                              child: Card(
                                elevation: 4,
                                child: Container(
                                  height: 130,
                                  padding: EdgeInsets.all(5),
                                  child: Column(
                                    children: [
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.end,
                                        children: const [
                                          Icon(
                                            Icons.info_outline,
                                            color: Colors.grey,
                                          )
                                        ],
                                      ),
                                      AutoSizeText(
                                        myGarant!.orders_count.toString(),
                                        maxLines: 2,
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 40),
                                      ),
                                      Spacer(),
                                      AutoSizeText(
                                        AppLocalizations.of(context)!
                                            .garantOrdersCount
                                            .toUpperCase(),
                                        maxLines: 2,
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        ResponsiveGridCol(
                          xs: 6,
                          md: 3,
                          child: Container(
                            margin: const EdgeInsets.symmetric(
                                vertical: 5, horizontal: 5),
                            child: GestureDetector(
                              onTap: () {
                                showMaterialModalBottomSheet(
                                    context: context,
                                    builder: (context) => GarantOrderHistory(
                                          dateFrom: DateTime(currentMonth.year,
                                              currentMonth.month, 1),
                                          dateTo: DateTime(currentMonth.year,
                                              currentMonth.month + 1, 0),
                                        ));
                              },
                              child: Card(
                                elevation: 4,
                                child: Container(
                                  height: 130,
                                  padding: EdgeInsets.all(5),
                                  child: Column(
                                    children: [
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.end,
                                        children: const [
                                          Icon(
                                            Icons.info_outline,
                                            color: Colors.grey,
                                          )
                                        ],
                                      ),
                                      AutoSizeText(
                                        CurrencyFormatter.format(
                                          myGarant!.delivery_price,
                                          euroSettings,
                                        ),
                                        maxLines: 2,
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 30),
                                      ),
                                      Spacer(),
                                      AutoSizeText(
                                        AppLocalizations.of(context)!
                                            .garantOrdersSum
                                            .toUpperCase(),
                                        maxLines: 2,
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        ResponsiveGridCol(
                          xs: 6,
                          md: 3,
                          child: Container(
                            margin: const EdgeInsets.symmetric(
                                vertical: 5, horizontal: 5),
                            child: GestureDetector(
                              child: Card(
                                elevation: 4,
                                child: Container(
                                  height: 130,
                                  padding: EdgeInsets.all(5),
                                  child: Column(
                                    children: [
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.end,
                                        children: const [
                                          Icon(
                                            Icons.info_outline,
                                            color: Colors.grey,
                                          )
                                        ],
                                      ),
                                      AutoSizeText(
                                        CurrencyFormatter.format(
                                          myGarant!.earned,
                                          euroSettings,
                                        ),
                                        maxLines: 2,
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 30),
                                      ),
                                      Spacer(),
                                      AutoSizeText(
                                        AppLocalizations.of(context)!
                                            .garantEarned
                                            .toUpperCase(),
                                        maxLines: 2,
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        ResponsiveGridCol(
                          xs: 6,
                          md: 3,
                          child: Container(
                            margin: const EdgeInsets.symmetric(
                                vertical: 5, horizontal: 5),
                            child: GestureDetector(
                              onTap: () {
                                showModalBottomSheet(
                                    context: context,
                                    builder: (context) {
                                      return const MyBalanceByTerminal();
                                    });
                              },
                              child: Card(
                                elevation: 4,
                                child: Container(
                                  height: 130,
                                  padding: EdgeInsets.all(5),
                                  child: Column(
                                    children: [
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.end,
                                        children: const [
                                          Icon(
                                            Icons.info_outline,
                                            color: Colors.grey,
                                          )
                                        ],
                                      ),
                                      AutoSizeText(
                                        CurrencyFormatter.format(
                                          myGarant!.balance,
                                          euroSettings,
                                        ),
                                        maxLines: 2,
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 30),
                                      ),
                                      Spacer(),
                                      AutoSizeText(
                                        AppLocalizations.of(context)!
                                            .wallet_label
                                            .toUpperCase(),
                                        maxLines: 2,
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        ResponsiveGridCol(
                          xs: 6,
                          md: 3,
                          child: Container(
                            margin: const EdgeInsets.symmetric(
                                vertical: 5, horizontal: 5),
                            child: GestureDetector(
                              onTap: () {
                                showModalBottomSheet(
                                    context: context,
                                    builder: (context) {
                                      return Column(
                                        children: [
                                          AppBar(
                                            backgroundColor: Colors.white,
                                            foregroundColor: Colors.black,
                                            centerTitle: true,
                                            automaticallyImplyLeading: false,
                                            actions: [
                                              IconButton(
                                                icon: const Icon(
                                                  Icons.close,
                                                  color: Colors.black,
                                                ),
                                                onPressed: () {
                                                  Navigator.pop(context);
                                                },
                                              )
                                            ],
                                            title: Text(
                                              AppLocalizations.of(context)!
                                                  .garantDayOffs
                                                  .toUpperCase(),
                                              style: const TextStyle(
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                          Expanded(
                                            child: ListView.separated(
                                              separatorBuilder:
                                                  (context, index) {
                                                return const Divider();
                                              },
                                              itemCount: myGarant!
                                                      .actual_day_offs_list
                                                      ?.length ??
                                                  0,
                                              itemBuilder: (context, index) {
                                                return ListTile(
                                                  title: Text(
                                                    DateFormat('dd.MM.yyyy')
                                                        .format(DateTime.parse(
                                                            myGarant!
                                                                .actual_day_offs_list![
                                                                    index]
                                                                .toString()))
                                                        .toUpperCase(),
                                                    style: const TextStyle(
                                                        fontWeight:
                                                            FontWeight.bold),
                                                  ),
                                                );
                                              },
                                            ),
                                          ),
                                        ],
                                      );
                                    });
                              },
                              child: Card(
                                elevation: 4,
                                clipBehavior: Clip.antiAlias,
                                child: Container(
                                  height: 130,
                                  padding: const EdgeInsets.all(5),
                                  color: myGarant!.actual_day_offs >
                                          myGarant!.possible_day_offs
                                      ? Colors.red
                                      : Colors.green,
                                  child: Column(
                                    children: [
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.end,
                                        children: const [
                                          Icon(
                                            Icons.info_outline,
                                            color: Colors.white,
                                          )
                                        ],
                                      ),
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          Text(
                                              myGarant!.actual_day_offs
                                                  .toString(),
                                              style: const TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 40,
                                                  color: Colors.white)),
                                          const Text(' / ',
                                              style: TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 40,
                                                  color: Colors.white)),
                                          Text(
                                              myGarant!.possible_day_offs
                                                  .toString(),
                                              style: const TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 40,
                                                  color: Colors.white)),
                                        ],
                                      ),
                                      Spacer(),
                                      AutoSizeText(
                                        AppLocalizations.of(context)!
                                            .garantDayOffs
                                            .toUpperCase(),
                                        maxLines: 2,
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            color: Colors.white),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        ResponsiveGridCol(
                          xs: 6,
                          md: 3,
                          child: Container(
                            margin: const EdgeInsets.symmetric(
                                vertical: 5, horizontal: 5),
                            child: GestureDetector(
                              child: Card(
                                elevation: 4,
                                clipBehavior: Clip.antiAlias,
                                child: Container(
                                  color: myGarant!.actual_day_offs >
                                          myGarant!.possible_day_offs
                                      ? Colors.red
                                      : Colors.green,
                                  height: 130,
                                  padding: EdgeInsets.all(5),
                                  child: Column(
                                    children: [
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.end,
                                        children: const [
                                          Icon(Icons.info_outline,
                                              color: Colors.white)
                                        ],
                                      ),
                                      AutoSizeText(
                                        CurrencyFormatter.format(
                                          myGarant!.balance_to_pay,
                                          euroSettings,
                                        ),
                                        maxLines: 2,
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 30,
                                            color: Colors.white),
                                      ),
                                      Spacer(),
                                      AutoSizeText(
                                        AppLocalizations.of(context)!
                                            .garantSum
                                            .toUpperCase(),
                                        maxLines: 2,
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            color: Colors.white),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        ResponsiveGridCol(
                          xs: 6,
                          md: 3,
                          child: Container(
                            margin: const EdgeInsets.symmetric(
                                vertical: 5, horizontal: 5),
                            child: GestureDetector(
                              onTap: () {},
                              child: Card(
                                elevation: 4,
                                child: Container(
                                  height: 130,
                                  padding: EdgeInsets.all(5),
                                  child: Column(
                                    children: [
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.end,
                                        children: const [
                                          Icon(
                                            Icons.info_outline,
                                            color: Colors.grey,
                                          )
                                        ],
                                      ),
                                      AutoSizeText(
                                        myGarant!.order_dates_count.toString(),
                                        maxLines: 2,
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 40),
                                      ),
                                      Spacer(),
                                      AutoSizeText(
                                        AppLocalizations.of(context)!
                                            .workedDaysCount
                                            .toUpperCase(),
                                        maxLines: 2,
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
            ),
            SizedBox(
              height: 20,
            ),
          ],
        ),
      ),
    );
  }
}
