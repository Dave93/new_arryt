// ignore_for_file: public_member_api_docs, sort_constructors_first
import 'dart:convert';

import 'package:objectbox/objectbox.dart';

@Entity()
class ManagerCouriersModel {
  int id = 0;
  @Index()
  final String identity;
  final String firstName;
  final String lastName;
  final String phone;
  final String terminalId;
  final String courierId;
  final String terminalName;
  final int balance;

  ManagerCouriersModel(
      {required this.identity,
      required this.firstName,
      required this.lastName,
      required this.phone,
      required this.terminalId,
      required this.courierId,
      required this.terminalName,
      required this.balance});

  ManagerCouriersModel copyWith({
    int? id,
    String? identity,
    String? firstName,
    String? lastName,
    String? phone,
    String? terminalId,
    String? courierId,
    String? terminalName,
    int? balance,
  }) {
    return ManagerCouriersModel(
      identity: identity ?? this.identity,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      phone: phone ?? this.phone,
      terminalId: terminalId ?? this.terminalId,
      courierId: courierId ?? this.courierId,
      terminalName: terminalName ?? this.terminalName,
      balance: balance ?? this.balance,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'id': id,
      'identity': identity,
      'first_name': firstName,
      'last_name': lastName,
      'phone': phone,
      'terminal_id': terminalId,
      'courier_id': courierId,
      'terminal_name': terminalName,
      'balance': balance,
    };
  }

  factory ManagerCouriersModel.fromMap(Map<String, dynamic> map) {
    return ManagerCouriersModel(
      identity: map['id'] as String,
      firstName: map['first_name'] as String,
      lastName: map['last_name'] as String,
      phone: map['phone'] as String,
      terminalId: map['terminal_id'] as String,
      courierId: map['courier_id'] as String,
      terminalName: map['terminal_name'] as String,
      balance: map['balance'] as int,
    );
  }

  String toJson() => json.encode(toMap());

  factory ManagerCouriersModel.fromJson(String source) =>
      ManagerCouriersModel.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() {
    return 'ManagerCouriersModel(id: $id, identity: $identity, firstName: $firstName, lastName: $lastName, phone: $phone, terminalId: $terminalId, terminalName: $terminalName, balance: $balance)';
  }

  @override
  bool operator ==(covariant ManagerCouriersModel other) {
    if (identical(this, other)) return true;

    return other.id == id &&
        other.identity == identity &&
        other.firstName == firstName &&
        other.lastName == lastName &&
        other.phone == phone &&
        other.terminalId == terminalId &&
        other.courierId == courierId &&
        other.terminalName == terminalName &&
        other.balance == balance;
  }

  @override
  int get hashCode {
    return id.hashCode ^
        identity.hashCode ^
        firstName.hashCode ^
        lastName.hashCode ^
        phone.hashCode ^
        terminalId.hashCode ^
        courierId.hashCode ^
        terminalName.hashCode ^
        balance.hashCode;
  }
}
