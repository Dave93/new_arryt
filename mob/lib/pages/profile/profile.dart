import 'package:arryt/bloc/block_imports.dart';
import 'package:arryt/widgets/profile/my_balance_by_terminal.dart';
import 'package:auto_size_text/auto_size_text.dart';
import 'package:currency_formatter/currency_formatter.dart';
import 'package:easy_refresh/easy_refresh.dart';
import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:arryt/helpers/api_graphql_provider.dart';

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

  Future<void> _loadData() async {
    await _loadStatistics();
    await _loadProfileNumbers();
  }

  Future<void> _loadProfileNumbers() async {
    var client = GraphQLProvider.of(context).value;
    var query = r'''
      query {
        getMyProfileNumbers {
            score
        }
      }
    ''';
    var ratingResult = await client.query(
        QueryOptions(document: gql(query), fetchPolicy: FetchPolicy.noCache));
    if (ratingResult.hasException) {
      print(ratingResult.exception);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ratingResult.exception.toString()),
        ),
      );
    } else {
      setState(() {
        rating = (ratingResult.data?['getMyProfileNumbers']['score'] is int
            ? ratingResult.data!['getMyProfileNumbers']['score'].toDouble()
            : ratingResult.data?['getMyProfileNumbers']['score']);
      });
      var query = r'''
        query {
          getMyTotalBalance
        }
      ''';
      var balanceResult = await client.query(
          QueryOptions(document: gql(query), fetchPolicy: FetchPolicy.noCache));
      if (balanceResult.hasException) {
        print(balanceResult.exception);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(balanceResult.exception.toString()),
          ),
        );
      } else {
        setState(() {
          walletBalance = balanceResult.data?['getMyTotalBalance'];
        });

        var query = r'''
          query {
            getMyTotalFuelBalance
          }
        ''';

        var fuelBalanceResult = await client.query(QueryOptions(
            document: gql(query), fetchPolicy: FetchPolicy.noCache));

        if (fuelBalanceResult.hasException) {
          print(fuelBalanceResult.exception);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(fuelBalanceResult.exception.toString()),
            ),
          );
        } else {
          setState(() {
            totalFuelBalance = fuelBalanceResult.data?['getMyTotalFuelBalance'];
          });
        }
      }
    }
  }

  Future<void> _loadStatistics() async {
    var client = GraphQLProvider.of(context).value;
    var query = r'''
      query {
        orderMobilePeriodStat {
          failedCount
          successCount
          orderPrice
          bonusPrice
          fuelPrice
          dailyGarantPrice
          totalPrice
          labelCode
        }
      }
    ''';
    var result = await client.query(
        QueryOptions(document: gql(query), fetchPolicy: FetchPolicy.noCache));
    if (result.hasException) {
      print(result.exception);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.exception.toString()),
        ),
      );
    } else {
      List<OrderMobilePeriodStat> ordersStat = [];
      result.data?['orderMobilePeriodStat'].forEach((e) {
        ordersStat.add(OrderMobilePeriodStat.fromMap(e));
      });
      setState(() {
        _ordersStat = ordersStat;
      });
    }
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
                title: BlocBuilder<UserDataBloc, UserDataState>(
                  builder: (context, state) {
                    return Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(
                          height: 20,
                        ),
                        state.userProfile?.last_name != null
                            ? AutoSizeText(
                                "${state.userProfile?.last_name} ${state.userProfile?.first_name}",
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 25.0,
                                    fontWeight: FontWeight.bold),
                              )
                            : const SizedBox(
                                height: 0,
                              ),
                        state.userProfile?.phone != null
                            ? AutoSizeText(
                                state.userProfile?.phone ?? '',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 16.0,
                                ),
                              )
                            : const SizedBox(
                                height: 0,
                              ),
                      ],
                    );
                  },
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
