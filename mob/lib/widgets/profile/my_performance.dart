import 'package:flutter/material.dart';
import 'package:arryt/helpers/api_server.dart';
import 'package:arryt/l10n/app_localizations.dart';
import 'package:intl/intl.dart';
import 'dart:async';

class MyPerformance extends StatefulWidget {
  const MyPerformance({super.key});

  @override
  State<MyPerformance> createState() => _MyPerformanceState();
}

class _MyPerformanceState extends State<MyPerformance> {
  bool isLoading = true;
  Map<String, dynamic>? performanceData;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _fetchPerformance();
    _refreshTimer = Timer.periodic(const Duration(minutes: 5), (timer) {
      _fetchPerformance();
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchPerformance() async {
    try {
      final api = ApiServer();
      final response = await api.get('/api/users/my_performance', null);
      if (mounted) {
        setState(() {
          performanceData = response.data;
          isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          isLoading = false;
        });
      }
    }
  }

  String _localize(String locale, String ru, String uz, String en) {
    switch (locale) {
      case 'uz': return uz;
      case 'en': return en;
      default: return ru;
    }
  }

  String _formatTime(int minutes) {
    final hours = minutes ~/ 60;
    final remainingMinutes = minutes % 60;
    return '${hours.toString().padLeft(2, '0')}:${remainingMinutes.toString().padLeft(2, '0')}';
  }

  Widget _buildMetricTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String value,
    required int diff,
    String? tooltip,
    bool invertDiff = false,
  }) {
    final isPositive = invertDiff ? diff < 0 : diff > 0;
    final diffColor = diff == 0 ? Colors.grey : (isPositive ? Colors.green : Colors.red);

    return Container(
      padding: const EdgeInsets.all(12),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: iconColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: iconColor, size: 18),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(title,
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                    overflow: TextOverflow.ellipsis),
              ),
              if (tooltip != null)
                GestureDetector(
                  onTap: () {
                    showDialog(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        contentPadding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
                        content: Text(tooltip, style: const TextStyle(fontSize: 15)),
                        actionsPadding: const EdgeInsets.only(right: 8, bottom: 4),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK')),
                        ],
                      ),
                    );
                  },
                  child: Icon(Icons.help_outline, size: 14, color: Colors.grey.shade400),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Flexible(
                child: Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                    maxLines: 1, overflow: TextOverflow.ellipsis),
              ),
              const SizedBox(width: 6),
              if (diff != 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: diffColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(isPositive ? Icons.arrow_upward : Icons.arrow_downward, color: diffColor, size: 10),
                      Text(diff.abs().toString(),
                          style: TextStyle(color: diffColor, fontWeight: FontWeight.w600, fontSize: 11)),
                    ],
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (performanceData == null) {
      return const SizedBox.shrink();
    }

    final current = performanceData!['currentPerformance'];
    final previous = performanceData!['previousPerformance'];
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context).languageCode;

    final monthName = DateFormat('MMMM yyyy', Localizations.localeOf(context).languageCode).format(DateTime.now());

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                Icon(Icons.calendar_month_outlined, size: 16, color: Colors.grey.shade500),
                const SizedBox(width: 6),
                Text(
                  monthName[0].toUpperCase() + monthName.substring(1),
                  style: TextStyle(fontSize: 14, color: Colors.grey.shade600, fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
          Row(
            children: [
              Expanded(
                child: _buildMetricTile(
                  icon: Icons.star_outline_rounded,
                  iconColor: Colors.amber,
                  title: l10n.rating_label,
                  value: current['rating'].toString(),
                  diff: current['rating'] - previous['rating'],
                  tooltip: _localize(locale,
                      'Средняя оценка от клиентов за текущий месяц. Чем выше — тем лучше.',
                      'Joriy oy uchun mijozlarning o\'rtacha bahosi. Qancha baland bo\'lsa, shuncha yaxshi.',
                      'Average customer rating for the current month. Higher is better.'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildMetricTile(
                  icon: Icons.delivery_dining_outlined,
                  iconColor: Colors.green,
                  title: l10n.deliveries_label,
                  value: current['delivery_count'].toString(),
                  diff: current['delivery_count'] - previous['delivery_count'],
                  tooltip: _localize(locale,
                      'Количество успешно завершённых доставок за текущий месяц.',
                      'Joriy oyda muvaffaqiyatli yakunlangan yetkazishlar soni.',
                      'Number of successfully completed deliveries this month.'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _buildMetricTile(
                  icon: Icons.schedule_outlined,
                  iconColor: Colors.blue,
                  title: l10n.avg_time_label,
                  value: _formatTime(current['delivery_average_time']),
                  diff: current['delivery_average_time'] - previous['delivery_average_time'],
                  invertDiff: true,
                  tooltip: _localize(locale,
                      'Среднее время от создания заказа до завершения доставки. Чем меньше — тем лучше.',
                      'Buyurtma yaratilganidan yetkazish yakunlanguncha o\'rtacha vaqt. Qancha kam bo\'lsa, shuncha yaxshi.',
                      'Average time from order creation to delivery completion. Lower is better.'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildMetricTile(
                  icon: Icons.leaderboard_outlined,
                  iconColor: Theme.of(context).primaryColor,
                  title: l10n.position_label,
                  value: '${current['position']}/${current['total_active_couriers']}',
                  diff: previous['position'] - current['position'],
                  tooltip: _localize(locale,
                      'Ваше место среди курьеров вашего филиала по количеству доставок и скорости.',
                      'Filialingizdagi kuryerlar orasida yetkazishlar soni va tezligi bo\'yicha o\'rningiz.',
                      'Your rank among couriers in your terminal by delivery count and speed.'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
