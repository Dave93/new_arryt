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
      // Handle error appropriately
    }
  }

  String _formatTime(int minutes) {
    final hours = minutes ~/ 60;
    final remainingMinutes = minutes % 60;
    return '${hours.toString().padLeft(2, '0')}:${remainingMinutes.toString().padLeft(2, '0')}';
  }

  Widget _buildMetricCard({
    required String title,
    required dynamic currentValue,
    required dynamic previousValue,
    String? unit,
    bool isTime = false,
  }) {
    final difference = currentValue - previousValue;
    final isPositive = difference > 0;

    String displayValue =
        isTime ? _formatTime(currentValue) : currentValue.toString();

    String displayDifference =
        isTime ? _formatTime(difference.abs()) : difference.abs().toString();

    return Expanded(
      child: SizedBox(
        height: 140,
        child: Card(
          elevation: 4,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: Container(
            padding: const EdgeInsets.all(12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style:
                            Theme.of(context).textTheme.titleSmall?.copyWith(
                                  color: Colors.grey[600],
                                  fontWeight: FontWeight.w500,
                                ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: (isPositive ? Colors.green : Colors.red)
                            .withOpacity(0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            isPositive
                                ? Icons.arrow_downward
                                : Icons.arrow_upward,
                            color: isPositive ? Colors.green : Colors.red,
                            size: 12,
                          ),
                          const SizedBox(width: 2),
                          Text(
                            displayDifference,
                            style: TextStyle(
                              color: isPositive ? Colors.green : Colors.red,
                              fontWeight: FontWeight.w500,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                SizedBox(
                  width: double.infinity,
                  child: Text(
                    displayValue + (unit ?? ''),
                    style:
                        Theme.of(context).textTheme.displaySmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPositionCard({
    required int position,
    required int total,
    required int previousPosition,
  }) {
    final difference = previousPosition - position;
    final isPositive = difference > 0;

    return Expanded(
      child: SizedBox(
        height: 140,
        child: Card(
          elevation: 4,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: Container(
            padding: const EdgeInsets.all(12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        AppLocalizations.of(context)!.position_label,
                        style:
                            Theme.of(context).textTheme.titleSmall?.copyWith(
                                  color: Colors.grey[600],
                                  fontWeight: FontWeight.w500,
                                ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (difference != 0) ...[
                      const SizedBox(width: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: (isPositive ? Colors.green : Colors.red)
                              .withOpacity(0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              isPositive
                                  ? Icons.arrow_upward
                                  : Icons.arrow_downward,
                              color: isPositive ? Colors.green : Colors.red,
                              size: 12,
                            ),
                            const SizedBox(width: 2),
                            Text(
                              difference.abs().toString(),
                              style: TextStyle(
                                color: isPositive ? Colors.green : Colors.red,
                                fontWeight: FontWeight.w500,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
                const Spacer(),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Text(
                      position.toString(),
                      style: Theme.of(context)
                          .textTheme
                          .displaySmall
                          ?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    Text(
                      ' / ',
                      style: Theme.of(context)
                          .textTheme
                          .headlineLarge
                          ?.copyWith(
                            color: Colors.grey[600],
                            fontWeight: FontWeight.w500,
                          ),
                    ),
                    Text(
                      total.toString(),
                      style: Theme.of(context)
                          .textTheme
                          .headlineLarge
                          ?.copyWith(
                            color: Colors.grey[600],
                            fontWeight: FontWeight.w500,
                          ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (performanceData == null) {
      return const Center(child: Text('No performance data available'));
    }

    final current = performanceData!['currentPerformance'];
    final previous = performanceData!['previousPerformance'];

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          Row(
            children: [
              _buildMetricCard(
                title: AppLocalizations.of(context)!.rating_label,
                currentValue: current['rating'],
                previousValue: previous['rating'],
              ),
              const SizedBox(width: 12),
              _buildMetricCard(
                title: AppLocalizations.of(context)!.deliveries_label,
                currentValue: current['delivery_count'],
                previousValue: previous['delivery_count'],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildMetricCard(
                title: AppLocalizations.of(context)!.avg_time_label,
                currentValue: current['delivery_average_time'],
                previousValue: previous['delivery_average_time'],
                isTime: true,
              ),
              const SizedBox(width: 12),
              _buildPositionCard(
                position: current['position'],
                total: current['total_active_couriers'],
                previousPosition: previous['position'],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
