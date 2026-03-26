import 'package:flutter/material.dart';
import 'package:arryt/helpers/api_server.dart';
import 'package:arryt/l10n/app_localizations.dart';
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
    bool invertDiff = false,
  }) {
    final isPositive = invertDiff ? diff < 0 : diff > 0;
    final diffColor = diff == 0 ? Colors.grey : (isPositive ? Colors.green : Colors.red);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                const SizedBox(height: 2),
                Text(value,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          if (diff != 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: diffColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    isPositive ? Icons.arrow_upward : Icons.arrow_downward,
                    color: diffColor,
                    size: 12,
                  ),
                  const SizedBox(width: 2),
                  Text(
                    diff.abs().toString(),
                    style: TextStyle(
                      color: diffColor,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
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

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _buildMetricTile(
                  icon: Icons.star_outline_rounded,
                  iconColor: Colors.amber,
                  title: l10n.rating_label,
                  value: current['rating'].toString(),
                  diff: current['rating'] - previous['rating'],
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
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
