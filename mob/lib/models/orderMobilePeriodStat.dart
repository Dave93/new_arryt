import 'dart:convert';

// ignore_for_file: public_member_api_docs, sort_constructors_first
class OrderMobilePeriodStat {
  int successCount;
  int failedCount;
  int orderPrice;
  int bonusPrice;
  int totalPrice;
  int fuelPrice;
  int? dailyGarantPrice;
  String labelCode;
  OrderMobilePeriodStat({
    required this.successCount,
    required this.failedCount,
    required this.orderPrice,
    required this.bonusPrice,
    required this.totalPrice,
    required this.fuelPrice,
    required this.labelCode,
    this.dailyGarantPrice,
  });

  OrderMobilePeriodStat copyWith({
    int? successCount,
    int? failedCount,
    int? orderPrice,
    int? bonusPrice,
    int? totalPrice,
    int? fuelPrice,
    int? dailyGarantPrice,
    String? labelCode,
  }) {
    return OrderMobilePeriodStat(
      successCount: successCount ?? this.successCount,
      failedCount: failedCount ?? this.failedCount,
      orderPrice: orderPrice ?? this.orderPrice,
      bonusPrice: bonusPrice ?? this.bonusPrice,
      totalPrice: totalPrice ?? this.totalPrice,
      fuelPrice: fuelPrice ?? this.fuelPrice,
      dailyGarantPrice: dailyGarantPrice ?? this.dailyGarantPrice,
      labelCode: labelCode ?? this.labelCode,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'successCount': successCount,
      'failedCount': failedCount,
      'orderPrice': orderPrice,
      'bonusPrice': bonusPrice,
      'totalPrice': totalPrice,
      'fuelPrice': fuelPrice,
      'dailyGarantPrice': dailyGarantPrice,
      'labelCode': labelCode,
    };
  }

  factory OrderMobilePeriodStat.fromMap(Map<String, dynamic> map) {
    return OrderMobilePeriodStat(
      successCount: map['successCount'] as int,
      failedCount: map['failedCount'] as int,
      orderPrice: map['orderPrice'] as int,
      bonusPrice: map['bonusPrice'] as int,
      totalPrice: map['totalPrice'] as int,
      fuelPrice: map['fuelPrice'] as int,
      dailyGarantPrice: map['dailyGarantPrice'] as int?,
      labelCode: map['labelCode'] as String,
    );
  }

  String toJson() => json.encode(toMap());

  factory OrderMobilePeriodStat.fromJson(String source) =>
      OrderMobilePeriodStat.fromMap(
          json.decode(source) as Map<String, dynamic>);

  @override
  String toString() =>
      'OrderMobilePeriodStat(successCount: $successCount, failedCount: $failedCount, totalPrice: $totalPrice, labelCode: $labelCode)';

  @override
  bool operator ==(covariant OrderMobilePeriodStat other) {
    if (identical(this, other)) return true;

    return other.successCount == successCount &&
        other.failedCount == failedCount &&
        other.orderPrice == orderPrice &&
        other.bonusPrice == bonusPrice &&
        other.totalPrice == totalPrice &&
        other.fuelPrice == fuelPrice &&
        other.dailyGarantPrice == dailyGarantPrice &&
        other.labelCode == labelCode;
  }

  @override
  int get hashCode =>
      successCount.hashCode ^
      failedCount.hashCode ^
      orderPrice.hashCode ^
      bonusPrice.hashCode ^
      totalPrice.hashCode ^
      fuelPrice.hashCode ^
      dailyGarantPrice.hashCode ^
      labelCode.hashCode;
}
