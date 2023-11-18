// ignore_for_file: public_member_api_docs, sort_constructors_first
import 'dart:convert';

import 'package:arryt/models/organizations.dart';
import 'package:arryt/models/terminals.dart';
import 'package:objectbox/objectbox.dart';

import 'couriers.dart';
import 'customer.dart';
import 'order_next_button.dart';
import 'order_status.dart';

@Entity(uid: 789466)
class OrderModel {
  int id = 0;
  @Index()
  final String identity;
  final double to_lat;
  final double to_lon;
  final double from_lat;
  final double from_lon;
  final double pre_distance;
  final String order_number;
  final int order_price;
  final int? delivery_price;
  final String? delivery_address;
  final String? delivery_comment;
  final DateTime created_at;
  final String? paymentType;
  final String? yandexPincode;
  final int? cDeliveryPrice;
  final String? additional_phone;
  final String? house;
  final String? entrance;
  final String? flat;

  OrderModel({
    required this.identity,
    required this.to_lat,
    required this.to_lon,
    required this.pre_distance,
    required this.order_number,
    required this.order_price,
    this.delivery_price,
    this.delivery_address,
    this.delivery_comment,
    required this.created_at,
    required this.from_lat,
    required this.from_lon,
    this.paymentType,
    this.yandexPincode,
    this.cDeliveryPrice,
    this.additional_phone,
    this.house,
    this.entrance,
    this.flat,
  });

  final customer = ToOne<Customer>();
  final terminal = ToOne<Terminals>();
  final orderStatus = ToOne<OrderStatus>();
  final orderNextButton = ToMany<OrderNextButton>();
  final organization = ToOne<Organizations>();
  final courier = ToOne<Couriers>();

  OrderModel copyWith({
    String? identity,
    double? to_lat,
    double? to_lon,
    double? pre_distance,
    String? order_number,
    int? order_price,
    int? delivery_price,
    String? delivery_address,
    String? delivery_comment,
    DateTime? created_at,
    double? from_lat,
    double? from_lon,
    String? paymentType,
    String? yandexPincode,
    int? cDeliveryPrice,
    String? additional_phone,
    String? house,
    String? entrance,
    String? flat,
  }) {
    return OrderModel(
      identity: identity ?? this.identity,
      to_lat: to_lat ?? this.to_lat,
      to_lon: to_lon ?? this.to_lon,
      pre_distance: pre_distance ?? this.pre_distance,
      order_number: order_number ?? this.order_number,
      order_price: order_price ?? this.order_price,
      delivery_price: delivery_price ?? this.delivery_price,
      delivery_address: delivery_address ?? this.delivery_address,
      delivery_comment: delivery_comment ?? this.delivery_comment,
      created_at: created_at ?? this.created_at,
      from_lat: from_lat ?? this.from_lat,
      from_lon: from_lon ?? this.from_lon,
      paymentType: paymentType ?? this.paymentType,
      yandexPincode: yandexPincode ?? this.yandexPincode,
      cDeliveryPrice: cDeliveryPrice ?? this.cDeliveryPrice,
      additional_phone: additional_phone ?? this.additional_phone,
      house: house ?? this.house,
      entrance: entrance ?? this.entrance,
      flat: flat ?? this.flat,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'id': identity,
      'to_lat': to_lat,
      'to_lon': to_lon,
      'pre_distance': pre_distance,
      'order_number': order_number,
      'order_price': order_price,
      'delivery_price': delivery_price,
      'delivery_address': delivery_address,
      'delivery_comment': delivery_comment,
      'created_at': created_at.millisecondsSinceEpoch,
      'from_lat': from_lat,
      'from_lon': from_lon,
      'payment_type': paymentType,
      'yandex_pincode': yandexPincode,
      'customer_delivery_price': cDeliveryPrice,
      'additional_phone': additional_phone,
      'house': house,
      'entrance': entrance,
      'flat': flat,
    };
  }

  factory OrderModel.fromMap(Map<String, dynamic> map) {
    return OrderModel(
      identity: map['id'] as String,
      to_lat: map['to_lat'] as double,
      to_lon: map['to_lon'] as double,
      pre_distance: map['pre_distance'].toDouble() as double,
      order_number: map['order_number'] as String,
      order_price: map['order_price'] as int,
      delivery_price: map['delivery_price'] as int?,
      delivery_address: map['delivery_address'] as String?,
      delivery_comment: map['delivery_comment'] as String?,
      created_at: DateTime.parse(map['created_at'] as String),
      from_lat: map['from_lat'] as double,
      from_lon: map['from_lon'] as double,
      paymentType: map['payment_type'] as String?,
      yandexPincode: map['yandex_pincode'] as String?,
      cDeliveryPrice: map['customer_delivery_price'] != null
          ? map['customer_delivery_price'] as int
          : null,
      additional_phone: map['additional_phone'] as String?,
      house: map['house'] as String?,
      entrance: map['entrance'] as String?,
      flat: map['flat'] as String?,
    );
  }

  String toJson() => json.encode(toMap());

  factory OrderModel.fromJson(String source) =>
      OrderModel.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() =>
      'Order(id: $identity, to_lat: $to_lat, to_lon: $to_lon, pre_distance: $pre_distance, order_number: $order_number, order_price: $order_price, delivery_price: $delivery_price, delivery_address: $delivery_address, delivery_comment: $delivery_comment, created_at: $created_at, from_lat: $from_lat, from_lon: $from_lon, paymentType: $paymentType, yandexPincode: $yandexPincode, customer_delivery_price: $cDeliveryPrice)';

  @override
  bool operator ==(covariant OrderModel other) {
    if (identical(this, other)) return true;

    return other.identity == identity;
  }

  @override
  int get hashCode => identity.hashCode;
}
