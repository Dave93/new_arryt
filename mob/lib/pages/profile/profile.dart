import 'package:animated_snack_bar/animated_snack_bar.dart';
import 'package:arryt/bloc/block_imports.dart';
import 'package:arryt/helpers/api_server.dart';
import 'package:arryt/models/user_data.dart';
import 'package:arryt/widgets/profile/my_balance_by_terminal.dart';
import 'package:auto_size_text/auto_size_text.dart';
import 'package:currency_formatter/currency_formatter.dart';
import 'package:easy_refresh/easy_refresh.dart';
import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:arryt/helpers/api_graphql_provider.dart';
import 'package:arryt/helpers/hive_helper.dart';

import '../../models/orderMobilePeriodStat.dart';
import '../../widgets/profile/logout.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    return ApiGraphqlProvider(child: const ProfilePageView());
  }
}

class ProfilePageView extends StatefulWidget {
  const ProfilePageView({super.key});

  @override
  State<ProfilePageView> createState() => _ProfilePageViewState();
}

class _ProfilePageViewState extends State<ProfilePageView>
    with AutomaticKeepAliveClientMixin<ProfilePageView> {
  CurrencyFormatterSettings euroSettings = CurrencyFormatterSettings(
    symbol: 'сум',
    symbolSide: SymbolSide.right,
    thousandSeparator: ' ',
    decimalSeparator: ',',
    symbolSeparator: ' ',
  );
  late EasyRefreshController _controller;
  List<OrderMobilePeriodStat> _ordersStat = [];
  int walletBalance = 0;
  int totalFuelBalance = 0;
  double rating = 0;
  UserData? user = HiveHelper.getUserData();

  Future<void> _loadData() async {
    await _loadStatistics();
    await _loadProfileNumbers();
  }

  Future<void> _loadProfileNumbers() async {
    ApiServer api = new ApiServer();

    var response = await api.get('/api/couriers/my_profile_number', {});

    if (response.statusCode != 200) {
      return AnimatedSnackBar.material(
        response.data['message'] ?? "Error",
        type: AnimatedSnackBarType.error,
      ).show(context);
    } else if (response.data != null && response.data['score'] != null) {
      setState(() {
        rating = response.data['score'].toDouble();
        walletBalance = response.data['not_paid_amount'];
        totalFuelBalance = response.data['fuel'];
      });
    }
  }

  Future<void> _loadStatistics() async {
    ApiServer api = new ApiServer();

    var response = await api.get('/api/couriers/mob_stat', {});

    if (response.statusCode != 200) {
      return AnimatedSnackBar.material(
        response.data['message'] ?? "Error",
        type: AnimatedSnackBarType.error,
      ).show(context);
    } else if (response.data != null && response.data['today'] != null) {
      List<OrderMobilePeriodStat> ordersStat = [];
      var todayData = response.data['today'];
      OrderMobilePeriodStat today = OrderMobilePeriodStat(
          successCount: todayData['finishedOrdersCount'],
          failedCount: todayData['canceledOrdersCount'],
          orderPrice: todayData['finishedOrdersAmount'],
          bonusPrice: todayData['bonus'],
          totalPrice: todayData['finishedOrdersAmount'] + todayData['bonus'],
          fuelPrice: todayData['workScheduleBonus'],
          labelCode: 'today');
      ordersStat.add(today);
      var yesterdayData = response.data['yesterday'];
      OrderMobilePeriodStat yesterday = OrderMobilePeriodStat(
          successCount: yesterdayData['finishedOrdersCount'],
          failedCount: yesterdayData['canceledOrdersCount'],
          orderPrice: yesterdayData['finishedOrdersAmount'],
          bonusPrice: yesterdayData['bonus'],
          totalPrice:
              yesterdayData['finishedOrdersAmount'] + yesterdayData['bonus'],
          fuelPrice: yesterdayData['workScheduleBonus'],
          labelCode: 'yesterday');
      ordersStat.add(yesterday);
      var weekData = response.data['week'];
      OrderMobilePeriodStat week = OrderMobilePeriodStat(
          successCount: weekData['finishedOrdersCount'],
          failedCount: weekData['canceledOrdersCount'],
          orderPrice: weekData['finishedOrdersAmount'],
          bonusPrice: weekData['bonus'],
          totalPrice: weekData['finishedOrdersAmount'] + weekData['bonus'],
          fuelPrice: weekData['workScheduleBonus'],
          labelCode: 'week');
      ordersStat.add(week);
      var monthData = response.data['month'];
      OrderMobilePeriodStat month = OrderMobilePeriodStat(
          successCount: monthData['finishedOrdersCount'],
          failedCount: monthData['canceledOrdersCount'],
          orderPrice: monthData['finishedOrdersAmount'],
          bonusPrice: monthData['bonus'],
          totalPrice: monthData['finishedOrdersAmount'] + monthData['bonus'],
          fuelPrice: monthData['workScheduleBonus'],
          labelCode: 'month');
      ordersStat.add(month);
      setState(() {
        _ordersStat = ordersStat;
      });
    }

    // var client = GraphQLProvider.of(context).value;
    // var query = r'''
    //   query {
    //     orderMobilePeriodStat {
    //       failedCount
    //       successCount
    //       orderPrice
    //       bonusPrice
    //       fuelPrice
    //       dailyGarantPrice
    //       totalPrice
    //       labelCode
    //     }
    //   }
    // ''';
    // var result = await client.query(
    //     QueryOptions(document: gql(query), fetchPolicy: FetchPolicy.noCache));
    // if (result.hasException) {
    //   print(result.exception);
    //   ScaffoldMessenger.of(context).showSnackBar(
    //     SnackBar(
    //       content: Text(result.exception.toString()),
    //     ),
    //   );
    // } else {
    //   List<OrderMobilePeriodStat> ordersStat = [];
    //   result.data?['orderMobilePeriodStat'].forEach((e) {
    //     ordersStat.add(OrderMobilePeriodStat.fromMap(e));
    //   });
    //   setState(() {
    //     _ordersStat = ordersStat;
    //   });
    // }
  }

  String cardLabel(String code) {
    switch (code) {
      case "today":
        return AppLocalizations.of(context)!.orderStatToday.toUpperCase();
      case "week":
        return AppLocalizations.of(context)!.orderStatWeek.toUpperCase();
      case "month":
        return AppLocalizations.of(context)!.orderStatMonth.toUpperCase();
      case "yesterday":
        return AppLocalizations.of(context)!.orderStatYesterday.toUpperCase();
      default:
        return "";
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
        // appBar: AppBar(
        //   elevation: 0,
        //   backgroundColor: Colors.transparent,
        //   title: Text(AppLocalizations.of(context)!.profile.toUpperCase(),
        //       style: const TextStyle(color: Colors.black)),
        // ),
        body: Stack(
      children: [
        CustomScrollView(slivers: [
          SliverAppBar(
            expandedHeight: 130.0,
            stretch: true,
            floating: false,
            pinned: true,
            toolbarHeight: 70,
            actions: [
              IconButton(
                icon: const Icon(
                  Icons.refresh_outlined,
                  size: 30,
                ),
                onPressed: () {
                  _loadData();
                },
              )
            ],
            flexibleSpace: FlexibleSpaceBar(
                // centerTitle: true,
                collapseMode: CollapseMode.parallax,
                title: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(
                      height: 20,
                    ),
                    user?.userProfile?.last_name != null
                        ? AutoSizeText(
                            "${user?.userProfile?.last_name} ${user?.userProfile?.first_name}",
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 25.0,
                                fontWeight: FontWeight.bold),
                          )
                        : const SizedBox(
                            height: 0,
                          ),
                    user?.userProfile?.phone != null
                        ? AutoSizeText(
                            user?.userProfile?.phone ?? '',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16.0,
                            ),
                          )
                        : const SizedBox(
                            height: 0,
                          ),
                  ],
                ),
                background: Container(
                  color: Theme.of(context).primaryColor,
                )),
          ),
          SliverList(
            delegate:
                SliverChildBuilderDelegate((BuildContext context, int index) {
              return BlocBuilder<UserDataBloc, UserDataState>(
                  builder: (context, state) {
                return Column(children: [
                  const SizedBox(
                    height: 10,
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      GestureDetector(
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                    AppLocalizations.of(context)!
                                        .wallet_label
                                        .toUpperCase(),
                                    style: const TextStyle(
                                        fontSize: 18,
                                        color: Colors.black,
                                        fontWeight: FontWeight.bold)),
                                const SizedBox(
                                  width: 5,
                                ),
                                Icon(
                                  Icons.unfold_more_sharp,
                                  color: Theme.of(context).primaryColor,
                                  size: 30,
                                )
                              ],
                            ),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                    CurrencyFormatter.format(
                                        walletBalance, euroSettings),
                                    style: const TextStyle(
                                        fontSize: 30,
                                        color: Colors.black,
                                        fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ],
                        ),
                        onTap: () {
                          showModalBottomSheet(
                              context: context,
                              builder: (context) {
                                return const MyBalanceByTerminal();
                              });
                        },
                      ),
                      Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                  AppLocalizations.of(context)!
                                      .courierScoreLabel
                                      .toUpperCase(),
                                  style: const TextStyle(
                                      fontSize: 18,
                                      color: Colors.black,
                                      fontWeight: FontWeight.bold)),
                            ],
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(rating.toString(),
                                  style: const TextStyle(
                                      fontSize: 30,
                                      color: Colors.black,
                                      fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ],
                      )
                    ],
                  ),
                  const SizedBox(
                    height: 10,
                  ),
                  ..._ordersStat
                      .map((e) => Container(
                            margin: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 5),
                            child: Card(
                              elevation: 6,
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    color: Theme.of(context).primaryColor,
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(
                                          vertical: 8.0),
                                      child: Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          Text(cardLabel(e.labelCode),
                                              style: const TextStyle(
                                                  fontSize: 20,
                                                  color: Colors.white,
                                                  fontWeight: FontWeight.bold)),
                                        ],
                                      ),
                                    ),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 15.0, vertical: 5),
                                    child: Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                            AppLocalizations.of(context)!
                                                .successOrderLabel
                                                .toUpperCase(),
                                            style: const TextStyle(
                                                fontSize: 16,
                                                color: Colors.black,
                                                fontWeight: FontWeight.bold)),
                                        Text(e.successCount.toString(),
                                            style: const TextStyle(
                                                fontSize: 16,
                                                color: Colors.black,
                                                fontWeight: FontWeight.bold))
                                      ],
                                    ),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 15.0, vertical: 5),
                                    child: Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                            AppLocalizations.of(context)!
                                                .failedOrderLabel
                                                .toUpperCase(),
                                            style: const TextStyle(
                                                fontSize: 16,
                                                color: Colors.black,
                                                fontWeight: FontWeight.bold)),
                                        Text(e.failedCount.toString(),
                                            style: const TextStyle(
                                                fontSize: 16,
                                                color: Colors.black,
                                                fontWeight: FontWeight.bold))
                                      ],
                                    ),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 15.0, vertical: 5),
                                    child: Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                            AppLocalizations.of(context)!
                                                .orderStatOrderPrice
                                                .toUpperCase(),
                                            style: const TextStyle(
                                                fontSize: 16,
                                                color: Colors.black,
                                                fontWeight: FontWeight.bold)),
                                        Text(
                                            CurrencyFormatter.format(
                                                e.orderPrice, euroSettings),
                                            style: const TextStyle(
                                                fontSize: 16,
                                                color: Colors.black,
                                                fontWeight: FontWeight.bold))
                                      ],
                                    ),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 15.0, vertical: 5),
                                    child: Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                            AppLocalizations.of(context)!
                                                .orderStatBonusPrice
                                                .toUpperCase(),
                                            style: const TextStyle(
                                                fontSize: 16,
                                                color: Colors.black,
                                                fontWeight: FontWeight.bold)),
                                        Text(
                                            CurrencyFormatter.format(
                                                e.bonusPrice, euroSettings),
                                            style: const TextStyle(
                                                fontSize: 16,
                                                color: Colors.black,
                                                fontWeight: FontWeight.bold))
                                      ],
                                    ),
                                  ),
                                  e.dailyGarantPrice != null
                                      ? Padding(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 15.0, vertical: 5),
                                          child: Row(
                                            mainAxisAlignment:
                                                MainAxisAlignment.spaceBetween,
                                            children: [
                                              AutoSizeText(
                                                  AppLocalizations.of(context)!
                                                      .orderStatDailyGarantPrice
                                                      .toUpperCase(),
                                                  style: const TextStyle(
                                                      fontSize: 16,
                                                      color: Colors.black,
                                                      fontWeight:
                                                          FontWeight.bold),
                                                  maxLines: 2),
                                              Text(
                                                  CurrencyFormatter.format(
                                                      e.dailyGarantPrice,
                                                      euroSettings),
                                                  style: const TextStyle(
                                                      fontSize: 16,
                                                      color: Colors.black,
                                                      fontWeight:
                                                          FontWeight.bold))
                                            ],
                                          ),
                                        )
                                      : SizedBox(),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 15.0, vertical: 5),
                                    child: Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                            AppLocalizations.of(context)!
                                                .orderStatFuelPrice
                                                .toUpperCase(),
                                            style: const TextStyle(
                                                fontSize: 16,
                                                color: Colors.black,
                                                fontWeight: FontWeight.bold)),
                                        Text(
                                            CurrencyFormatter.format(
                                                e.fuelPrice, euroSettings),
                                            style: const TextStyle(
                                                fontSize: 16,
                                                color: Colors.black,
                                                fontWeight: FontWeight.bold))
                                      ],
                                    ),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 15.0, vertical: 5),
                                    child: Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                            AppLocalizations.of(context)!
                                                .orderStatTotalPrice
                                                .toUpperCase(),
                                            style: const TextStyle(
                                                fontSize: 16,
                                                color: Colors.black,
                                                fontWeight: FontWeight.bold)),
                                        Text(
                                            CurrencyFormatter.format(
                                                e.totalPrice, euroSettings),
                                            style: const TextStyle(
                                                fontSize: 16,
                                                color: Colors.black,
                                                fontWeight: FontWeight.bold))
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ))
                      .toList(),
                  const SizedBox(
                    height: 50,
                  ),
                  const ProfileLogoutButton(),
                  const SizedBox(
                    height: 20,
                  ),
                ]);
              });
            }, childCount: 1),
          )
        ]),
      ],
    ));
  }

  @override
  bool get wantKeepAlive => true;
}
