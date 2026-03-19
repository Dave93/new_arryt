import 'package:animated_snack_bar/animated_snack_bar.dart';
import 'package:arryt/bloc/block_imports.dart';
import 'package:arryt/helpers/api_server.dart';
import 'package:arryt/models/user_data.dart';
import 'package:arryt/widgets/profile/my_balance_by_terminal.dart';
import 'package:auto_size_text/auto_size_text.dart';
import 'package:currency_formatter/currency_formatter.dart';
import 'package:easy_refresh/easy_refresh.dart';
import 'package:flutter/material.dart';
import 'package:arryt/l10n/app_localizations.dart';
import 'package:arryt/helpers/api_graphql_provider.dart';
import 'package:arryt/helpers/hive_helper.dart';

import '../../models/orderMobilePeriodStat.dart';
import '../../widgets/profile/logout.dart';
import '../../widgets/profile/my_performance.dart';

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
    with
        AutomaticKeepAliveClientMixin<ProfilePageView>,
        SingleTickerProviderStateMixin {
  CurrencyFormatterSettings euroSettings = CurrencyFormatterSettings(
    symbol: 'сум',
    symbolSide: SymbolSide.right,
    thousandSeparator: ' ',
    decimalSeparator: ',',
    symbolSeparator: ' ',
  );
  late EasyRefreshController _controller;
  late TabController _tabController;
  List<OrderMobilePeriodStat> _ordersStat = [];
  int walletBalance = 0;
  int totalFuelBalance = 0;
  double rating = 0;
  int _currentTabIndex = 0;
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
        return AppLocalizations.of(context)!.orderStatToday;
      case "week":
        return AppLocalizations.of(context)!.orderStatWeek;
      case "month":
        return AppLocalizations.of(context)!.orderStatMonth;
      case "yesterday":
        return AppLocalizations.of(context)!.orderStatYesterday;
      default:
        return "";
    }
  }

  @override
  void initState() {
    super.initState();
    _controller = EasyRefreshController(
      controlFinishRefresh: true,
      controlFinishLoad: true,
    );
    _tabController = TabController(length: 4, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() {
          _currentTabIndex = _tabController.index;
        });
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _tabController.dispose();
    super.dispose();
  }

  String _getInitials() {
    final first = user?.userProfile?.first_name ?? '';
    final last = user?.userProfile?.last_name ?? '';
    final f = first.isNotEmpty ? first[0] : '';
    final l = last.isNotEmpty ? last[0] : '';
    return '$f$l'.toUpperCase();
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
        RefreshIndicator(
          onRefresh: _loadData,
          child: CustomScrollView(slivers: [
            SliverToBoxAdapter(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Theme.of(context).primaryColor,
                      Theme.of(context).primaryColor.withOpacity(0.7),
                    ],
                  ),
                  borderRadius: const BorderRadius.only(
                    bottomLeft: Radius.circular(28),
                    bottomRight: Radius.circular(28),
                  ),
                ),
                child: SafeArea(
                  bottom: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 32,
                              backgroundColor: Colors.white.withOpacity(0.2),
                              child: const Icon(
                                Icons.person,
                                color: Colors.white,
                                size: 36,
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (user?.userProfile?.last_name != null)
                                    AutoSizeText(
                                      "${user?.userProfile?.first_name} ${user?.userProfile?.last_name}",
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 22,
                                        fontWeight: FontWeight.bold,
                                      ),
                                      maxLines: 1,
                                      minFontSize: 16,
                                    ),
                                  if (user?.userProfile?.phone != null) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      user?.userProfile?.phone ?? '',
                                      style: TextStyle(
                                        color: Colors.white.withOpacity(0.85),
                                        fontSize: 16,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        GestureDetector(
                          onTap: () {
                            showModalBottomSheet(
                              context: context,
                              builder: (context) {
                                return const MyBalanceByTerminal();
                              },
                            );
                          },
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 20, vertical: 14),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Icon(
                                      Icons.account_balance_wallet_outlined,
                                      color: Theme.of(context).primaryColor,
                                      size: 26,
                                    ),
                                    const SizedBox(width: 10),
                                    Text(
                                      AppLocalizations.of(context)!.wallet_label,
                                      style: TextStyle(
                                        fontSize: 18,
                                        color: Colors.grey.shade700,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                                Text(
                                  CurrencyFormatter.format(
                                      walletBalance, euroSettings),
                                  style: const TextStyle(
                                    fontSize: 26,
                                    color: Colors.black,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            SliverList(
              delegate:
                  SliverChildBuilderDelegate((BuildContext context, int index) {
                return BlocBuilder<UserDataBloc, UserDataState>(
                    builder: (context, state) {
                  return Column(children: [
                    const SizedBox(height: 16),
                    const MyPerformance(),
                    const SizedBox(height: 10),
                    if (_ordersStat.isNotEmpty) _buildOrderStatCard(),
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
        ),
      ],
    ));
  }

  Widget _buildOrderStatCard() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 10),
      child: Card(
        elevation: 4,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(12),
                ),
              ),
              child: TabBar(
                controller: _tabController,
                indicatorColor: Colors.white,
                indicatorWeight: 3,
                labelColor: Colors.white,
                unselectedLabelColor: Colors.white60,
                labelStyle: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
                unselectedLabelStyle: const TextStyle(fontSize: 16),
                tabs: _ordersStat
                    .map((e) => Tab(
                          text: _getShortLabel(e.labelCode),
                        ))
                    .toList(),
              ),
            ),
            IndexedStack(
              index: _currentTabIndex,
              children: _ordersStat.map((e) => _buildStatContent(e)).toList(),
            ),
          ],
        ),
      ),
    );
  }

  String _getShortLabel(String code) {
    switch (code) {
      case "today":
        return AppLocalizations.of(context)!.orderStatToday;
      case "week":
        return AppLocalizations.of(context)!.orderStatWeek;
      case "month":
        return AppLocalizations.of(context)!.orderStatMonth;
      case "yesterday":
        return AppLocalizations.of(context)!.orderStatYesterday;
      default:
        return "";
    }
  }

  Widget _buildStatContent(OrderMobilePeriodStat e) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildStatRow(
            AppLocalizations.of(context)!.successOrderLabel,
            e.successCount.toString(),
          ),
          const SizedBox(height: 8),
          _buildStatRow(
            AppLocalizations.of(context)!.failedOrderLabel,
            e.failedCount.toString(),
          ),
          const SizedBox(height: 8),
          _buildStatRow(
            AppLocalizations.of(context)!.orderStatOrderPrice,
            CurrencyFormatter.format(e.orderPrice, euroSettings),
          ),
          const SizedBox(height: 8),
          _buildStatRow(
            AppLocalizations.of(context)!.orderStatBonusPrice,
            CurrencyFormatter.format(e.bonusPrice, euroSettings),
          ),
          if (e.dailyGarantPrice != null) ...[
            const SizedBox(height: 8),
            _buildStatRow(
              AppLocalizations.of(context)!.orderStatDailyGarantPrice,
              CurrencyFormatter.format(e.dailyGarantPrice!, euroSettings),
            ),
          ],
          const SizedBox(height: 8),
          Divider(color: Colors.grey.shade300),
          const SizedBox(height: 8),
          _buildStatRow(
            AppLocalizations.of(context)!.orderStatTotalPrice,
            CurrencyFormatter.format(e.totalPrice, euroSettings),
            isTotal: true,
          ),
        ],
      ),
    );
  }

  Widget _buildStatRow(String label, String value, {bool isTotal = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 16,
              color: isTotal ? Colors.black : Colors.grey.shade700,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 16,
            color: Colors.black,
            fontWeight: isTotal ? FontWeight.bold : FontWeight.w500,
          ),
        ),
      ],
    );
  }

  @override
  bool get wantKeepAlive => true;
}
