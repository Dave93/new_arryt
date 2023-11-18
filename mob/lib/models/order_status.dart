// ignore_for_file: public_member_api_docs, sort_constructors_first

import 'dart:convert';

import 'package:objectbox/objectbox.dart';

@Entity()
class OrderStatus {
  int id = 0;
  final String identity;
  final String name;
  final bool cancel;
  final bool finish;
  OrderStatus({
    required this.identity,
    required this.name,
    required this.cancel,
    required this.finish,
  });

  OrderStatus copyWith({
    String? identity,
    String? name,
  }) {
    return OrderStatus(
      identity: identity ?? this.identity,
      name: name ?? this.name,
      cancel: cancel,
      finish: finish,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'id': identity,
      'name': name,
      'cancel': cancel,
      'finish': finish,
    };
  }

  factory OrderStatus.fromMap(Map<String, dynamic> map) {
    return OrderStatus(
      identity: map['id'] as String,
      name: map['name'] as String,
      cancel: map['cancel'] as bool,
      finish: map['finish'] as bool,
    );
  }

  String toJson() => json.encode(toMap());

  factory OrderStatus.fromJson(String source) =>
      OrderStatus.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() =>
      'OrderStatus(id: $identity, name: $name, cancel: $cancel, finish: $finish)';

  @override
  bool operator ==(covariant OrderStatus other) {
    if (identical(this, other)) return true;

    return other.identity == identity &&
        other.name == name &&
        other.cancel == cancel &&
        other.finish == finish;
  }

  @override
  int get hashCode =>
      identity.hashCode ^ name.hashCode ^ cancel.hashCode ^ finish.hashCode;
}
