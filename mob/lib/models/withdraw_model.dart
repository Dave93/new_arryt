// ignore_for_file: public_member_api_docs, sort_constructors_first
import 'dart:convert';

import 'package:arryt/models/garant_order_model.dart';

class WithDrawModel {
  String id;
  int amount;
  String created_at;
  GarantTerminalsModel? terminal;
  WithDrawManagerModel? manager;
  WithDrawModel({
    required this.id,
    required this.amount,
    required this.created_at,
    this.terminal,
    this.manager,
  });

  WithDrawModel copyWith({
    String? id,
    int? amount,
    String? created_at,
    GarantTerminalsModel? terminal,
    WithDrawManagerModel? manager,
  }) {
    return WithDrawModel(
      id: id ?? this.id,
      amount: amount ?? this.amount,
      created_at: created_at ?? this.created_at,
      terminal: terminal ?? this.terminal,
      manager: manager ?? this.manager,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'id': id,
      'amount': amount,
      'created_at': created_at,
      'terminal': terminal?.toMap(),
      'manager': manager?.toMap(),
    };
  }

  factory WithDrawModel.fromMap(Map<String, dynamic> map) {
    return WithDrawModel(
      id: map['id'] as String,
      amount: map['amount'] as int,
      created_at: map['created_at'] as String,
      terminal: map['manager_withdraw_terminals'] != null
          ? GarantTerminalsModel.fromMap(
              map['manager_withdraw_terminals'] as Map<String, dynamic>)
          : null,
      manager: map['manager_withdraw_managers'] != null
          ? WithDrawManagerModel.fromMap(
              map['manager_withdraw_managers'] as Map<String, dynamic>)
          : null,
    );
  }

  String toJson() => json.encode(toMap());

  factory WithDrawModel.fromJson(String source) =>
      WithDrawModel.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() {
    return 'WithDrawModel(id: $id, amount: $amount, created_at: $created_at, terminal: $terminal, manager: $manager)';
  }

  @override
  bool operator ==(covariant WithDrawModel other) {
    if (identical(this, other)) return true;

    return other.id == id &&
        other.amount == amount &&
        other.created_at == created_at &&
        other.terminal == terminal &&
        other.manager == manager;
  }

  @override
  int get hashCode {
    return id.hashCode ^
        amount.hashCode ^
        created_at.hashCode ^
        terminal.hashCode ^
        manager.hashCode;
  }
}

class WithDrawManagerModel {
  final String id;
  final String firstName;
  final String lastName;
  WithDrawManagerModel({
    required this.id,
    required this.firstName,
    required this.lastName,
  });

  WithDrawManagerModel copyWith({
    String? id,
    String? firstName,
    String? lastName,
  }) {
    return WithDrawManagerModel(
      id: id ?? this.id,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'id': id,
      'first_name': firstName,
      'last_name': lastName,
    };
  }

  factory WithDrawManagerModel.fromMap(Map<String, dynamic> map) {
    return WithDrawManagerModel(
      id: map['id'] as String,
      firstName: map['first_name'] as String,
      lastName: map['last_name'] as String,
    );
  }

  String toJson() => json.encode(toMap());

  factory WithDrawManagerModel.fromJson(String source) =>
      WithDrawManagerModel.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() =>
      'WithDrawManagerModel(id: $id, firstName: $firstName, lastName: $lastName)';

  @override
  bool operator ==(covariant WithDrawManagerModel other) {
    if (identical(this, other)) return true;

    return other.id == id &&
        other.firstName == firstName &&
        other.lastName == lastName;
  }

  @override
  int get hashCode => id.hashCode ^ firstName.hashCode ^ lastName.hashCode;
}
