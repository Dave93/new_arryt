// ignore_for_file: public_member_api_docs, sort_constructors_first
import 'dart:convert';

class MyGarantModel {
  final String begin_date;
  final String last_order_date;
  final int delivery_price;
  final String courier;
  final int orders_count;
  final String avg_delivery_time;

  final String formatted_avg_delivery_time;

  final String created_at;

  final int possible_day_offs;

  final int garant_price;

  final int order_dates_count;

  final int actual_day_offs;

  final int balance;

  final int earned;

  final int balance_to_pay;

  final int garant_days;

  final String drive_type;

  final int? possible_garant_price;

  final List<String>? actual_day_offs_list;

  MyGarantModel({
    required this.begin_date,
    required this.last_order_date,
    required this.delivery_price,
    required this.courier,
    required this.orders_count,
    required this.avg_delivery_time,
    required this.formatted_avg_delivery_time,
    required this.created_at,
    required this.possible_day_offs,
    required this.garant_price,
    required this.order_dates_count,
    required this.actual_day_offs,
    required this.balance,
    required this.earned,
    required this.balance_to_pay,
    required this.garant_days,
    required this.drive_type,
    this.possible_garant_price,
    this.actual_day_offs_list,
  });

  MyGarantModel copyWith({
    String? begin_date,
    String? last_order_date,
    int? delivery_price,
    String? courier,
    int? orders_count,
    String? avg_delivery_time,
    String? formatted_avg_delivery_time,
    String? created_at,
    int? possible_day_offs,
    int? garant_price,
    int? order_dates_count,
    int? actual_day_offs,
    int? balance,
    int? earned,
    int? balance_to_pay,
    int? garant_days,
    String? drive_type,
    int? possible_garant_price,
    List<String>? actual_day_offs_list,
  }) {
    return MyGarantModel(
      begin_date: begin_date ?? this.begin_date,
      last_order_date: last_order_date ?? this.last_order_date,
      delivery_price: delivery_price ?? this.delivery_price,
      courier: courier ?? this.courier,
      orders_count: orders_count ?? this.orders_count,
      avg_delivery_time: avg_delivery_time ?? this.avg_delivery_time,
      formatted_avg_delivery_time:
          formatted_avg_delivery_time ?? this.formatted_avg_delivery_time,
      created_at: created_at ?? this.created_at,
      possible_day_offs: possible_day_offs ?? this.possible_day_offs,
      garant_price: garant_price ?? this.garant_price,
      order_dates_count: order_dates_count ?? this.order_dates_count,
      actual_day_offs: actual_day_offs ?? this.actual_day_offs,
      balance: balance ?? this.balance,
      earned: earned ?? this.earned,
      balance_to_pay: balance_to_pay ?? this.balance_to_pay,
      garant_days: garant_days ?? this.garant_days,
      drive_type: drive_type ?? this.drive_type,
      possible_garant_price:
          possible_garant_price ?? this.possible_garant_price,
      actual_day_offs_list: actual_day_offs_list ?? this.actual_day_offs_list,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'begin_date': begin_date,
      'last_order_date': last_order_date,
      'delivery_price': delivery_price,
      'courier': courier,
      'orders_count': orders_count,
      'avg_delivery_time': avg_delivery_time,
      'formatted_avg_delivery_time': formatted_avg_delivery_time,
      'created_at': created_at,
      'possible_day_offs': possible_day_offs,
      'garant_price': garant_price,
      'order_dates_count': order_dates_count,
      'actual_day_offs': actual_day_offs,
      'balance': balance,
      'earned': earned,
      'balance_to_pay': balance_to_pay,
      'garant_days': garant_days,
      'drive_type': drive_type,
      'possible_garant_price': possible_garant_price,
      'actual_day_offs_list': actual_day_offs_list,
    };
  }

  factory MyGarantModel.fromMap(Map<String, dynamic> map) {
    return MyGarantModel(
      begin_date: map['begin_date'] as String,
      last_order_date: map['last_order_date'] as String,
      delivery_price: map['delivery_price'] as int,
      courier: map['courier'] as String,
      orders_count: map['orders_count'] as int,
      avg_delivery_time: map['avg_delivery_time'] as String,
      formatted_avg_delivery_time: map['formatted_avg_delivery_time'] as String,
      created_at: map['created_at'] as String,
      possible_day_offs: map['possible_day_offs'] as int,
      garant_price: map['garant_price'] as int,
      order_dates_count: map['order_dates_count'] as int,
      actual_day_offs: map['actual_day_offs'] as int,
      balance: map['balance'] as int,
      earned: map['earned'] as int,
      balance_to_pay: map['balance_to_pay'] as int,
      garant_days: map['garant_days'] as int,
      drive_type: map['drive_type'] as String,
      possible_garant_price: map['possible_garant_price'] != null
          ? map['possible_garant_price'] as int
          : null,
      actual_day_offs_list: map['actual_day_offs_list'] != null
          ? List<String>.from(map['actual_day_offs_list'] as List<dynamic>)
          : null,
    );
  }

  String toJson() => json.encode(toMap());

  factory MyGarantModel.fromJson(String source) =>
      MyGarantModel.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() {
    return 'MyGarantModel(begin_date: $begin_date, last_order_date: $last_order_date, delivery_price: $delivery_price, courier: $courier, orders_count: $orders_count, avg_delivery_time: $avg_delivery_time, formatted_avg_delivery_time: $formatted_avg_delivery_time, created_at: $created_at, possible_day_offs: $possible_day_offs, garant_price: $garant_price, order_dates_count: $order_dates_count, actual_day_offs: $actual_day_offs, balance: $balance, earned: $earned, balance_to_pay: $balance_to_pay, garant_days: $garant_days, drive_type: $drive_type, possible_garant_price: $possible_garant_price)';
  }

  @override
  bool operator ==(covariant MyGarantModel other) {
    if (identical(this, other)) return true;

    return other.begin_date == begin_date &&
        other.last_order_date == last_order_date &&
        other.delivery_price == delivery_price &&
        other.courier == courier &&
        other.orders_count == orders_count &&
        other.avg_delivery_time == avg_delivery_time &&
        other.formatted_avg_delivery_time == formatted_avg_delivery_time &&
        other.created_at == created_at &&
        other.possible_day_offs == possible_day_offs &&
        other.garant_price == garant_price &&
        other.order_dates_count == order_dates_count &&
        other.actual_day_offs == actual_day_offs &&
        other.balance == balance &&
        other.earned == earned &&
        other.balance_to_pay == balance_to_pay &&
        other.garant_days == garant_days &&
        other.drive_type == drive_type &&
        other.possible_garant_price == possible_garant_price;
  }

  @override
  int get hashCode {
    return begin_date.hashCode ^
        last_order_date.hashCode ^
        delivery_price.hashCode ^
        courier.hashCode ^
        orders_count.hashCode ^
        avg_delivery_time.hashCode ^
        formatted_avg_delivery_time.hashCode ^
        created_at.hashCode ^
        possible_day_offs.hashCode ^
        garant_price.hashCode ^
        order_dates_count.hashCode ^
        actual_day_offs.hashCode ^
        balance.hashCode ^
        earned.hashCode ^
        balance_to_pay.hashCode ^
        garant_days.hashCode ^
        drive_type.hashCode ^
        possible_garant_price.hashCode;
  }
}
