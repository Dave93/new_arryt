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
  List<Map<String, dynamic>> _managerCouriers = [];

  bool get _isCourier => user?.roles.isNotEmpty == true && user!.roles.first.code == 'courier';

  Future<void> _loadData() async {
    if (_isCourier) {
      await _loadStatistics();
      await _loadProfileNumbers();
    } else {
      await _loadManagerData();
    }
  }

  int _managerTodayOrders = 0;
  int _managerMonthOrders = 0;
  double _managerAvgRating = 0;

  Future<void> _loadManagerData() async {
    try {
      ApiServer api = ApiServer();
      var response = await api.get('/api/couriers/my_couriers/balance', {});
      if (response.statusCode == 200 && response.data != null) {
        setState(() {
          _managerCouriers = (response.data as List).map((e) => e as Map<String, dynamic>).toList();
        });
      }
      // Load terminal stats
      var statsResponse = await api.get('/api/orders/manager_terminal_stats', {});
      if (statsResponse.statusCode == 200 && statsResponse.data != null) {
        setState(() {
          _managerTodayOrders = statsResponse.data['today_orders'] ?? 0;
          _managerMonthOrders = statsResponse.data['month_orders'] ?? 0;
          _managerAvgRating = (statsResponse.data['avg_rating'] ?? 0).toDouble();
        });
      }
    } catch (e) {
      // ignore
    }
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
                        if (user?.roles.isNotEmpty == true && user!.roles.first.code == 'courier')
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
                  final isCourier = user?.roles.isNotEmpty == true && user!.roles.first.code == 'courier';
                  return Column(children: [
                    const SizedBox(height: 16),
                    if (isCourier) ...[
                      const MyPerformance(),
                      const SizedBox(height: 10),
                      if (_ordersStat.isNotEmpty) _buildOrderStatCard(),
                    ] else ...[
                      _buildManagerStats(),
                    ],
                    const SizedBox(height: 50),
                    const ProfileLogoutButton(),
                    const SizedBox(height: 20),
                  ]);
                });
              }, childCount: 1),
            )
          ]),
        ),
      ],
    ));
  }

  Widget _buildManagerStats() {
    final l10n = AppLocalizations.of(context)!;
    final primary = Theme.of(context).primaryColor;

    // Calculate totals from couriers data loaded via _loadData
    final totalCouriers = _managerCouriers.length;
    final totalBalance = _managerCouriers.fold<int>(0, (sum, c) => sum + (c['balance'] as int? ?? 0));
    final uniqueCourierIds = _managerCouriers.map((c) => c['courier_id']).toSet();
    final terminals = _managerCouriers.map((c) => c['terminal_name'] ?? '').toSet();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Column(
        children: [
          // Summary card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [primary, primary.withOpacity(0.7)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _managerStatItem(uniqueCourierIds.length.toString(), l10n.couriersListTabLabel, Icons.people_outline),
                    Container(width: 1, height: 40, color: Colors.white24),
                    _managerStatItem(_managerTodayOrders.toString(), l10n.orderStatToday, Icons.today_outlined),
                    Container(width: 1, height: 40, color: Colors.white24),
                    _managerStatItem(_managerMonthOrders.toString(), l10n.orderStatMonth, Icons.calendar_month_outlined),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _managerStatItem(
                      _managerAvgRating > 0 ? _managerAvgRating.toStringAsFixed(1) : '—',
                      l10n.rating_label,
                      Icons.star_outline_rounded,
                    ),
                    Container(width: 1, height: 40, color: Colors.white24),
                    _managerStatItem(terminals.length.toString(), l10n.terminal_label, Icons.store_outlined),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(l10n.orderStatTotalPrice,
                          style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 14)),
                      Text(CurrencyFormatter.format(totalBalance, euroSettings),
                          style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _managerStatItem(String value, String label, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: Colors.white, size: 24),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
        Text(label, style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 12)),
      ],
    );
  }

  Widget _buildOrderStatCard() {
    final primary = Theme.of(context).primaryColor;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Pill-shape tabs
          Container(
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(12),
            ),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(
                color: primary,
                borderRadius: BorderRadius.circular(12),
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              labelColor: Colors.white,
              unselectedLabelColor: Colors.grey.shade600,
              labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              unselectedLabelStyle: const TextStyle(fontSize: 13),
              dividerHeight: 0,
              tabs: _ordersStat
                  .map((e) => Tab(
                        height: 36,
                        text: _getShortLabel(e.labelCode),
                      ))
                  .toList(),
            ),
          ),
          const SizedBox(height: 12),
          IndexedStack(
            index: _currentTabIndex,
            children: _ordersStat.map((e) => _buildStatContent(e)).toList(),
          ),
        ],
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
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        _buildStatRow(
          AppLocalizations.of(context)!.successOrderLabel,
          e.successCount.toString(),
        ),
        _buildStatRow(
          AppLocalizations.of(context)!.failedOrderLabel,
          e.failedCount.toString(),
        ),
        _buildStatRow(
          AppLocalizations.of(context)!.orderStatOrderPrice,
          CurrencyFormatter.format(e.orderPrice, euroSettings),
        ),
        _buildStatRow(
          AppLocalizations.of(context)!.orderStatBonusPrice,
          CurrencyFormatter.format(e.bonusPrice, euroSettings),
        ),
        if (e.dailyGarantPrice != null)
          _buildStatRow(
            AppLocalizations.of(context)!.orderStatDailyGarantPrice,
            CurrencyFormatter.format(e.dailyGarantPrice!, euroSettings),
          ),
        Divider(color: Colors.grey.shade200, height: 16),
        _buildStatRow(
          AppLocalizations.of(context)!.orderStatTotalPrice,
          CurrencyFormatter.format(e.totalPrice, euroSettings),
          isTotal: true,
        ),
      ],
    );
  }

  Widget _buildStatRow(String label, String value, {bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: isTotal ? 16 : 14,
              color: isTotal ? Colors.black : Colors.grey.shade600,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: isTotal ? 16 : 14,
              color: Colors.black,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  @override
  bool get wantKeepAlive => true;
}
