// ignore_for_file: public_member_api_docs, sort_constructors_first
import 'dart:convert';

class BalanceByTerminal {
  final String terminalName;
  final String? iconUrl;
  final int orderAmount;
  final int bonusAmount;
  final int balance;

  BalanceByTerminal({
    required this.terminalName,
    this.iconUrl,
    required this.orderAmount,
    required this.bonusAmount,
    required this.balance,
  });

  factory BalanceByTerminal.fromMap(Map<String, dynamic> map) {
    return BalanceByTerminal(
      terminalName: map['terminal_name'] as String,
      iconUrl: map['icon_url'] as String?,
      orderAmount: map['order_amount'] as int,
      bonusAmount: map['bonus_amount'] as int,
      balance: map['balance'] as int,
    );
  }

  factory BalanceByTerminal.fromJson(String source) =>
      BalanceByTerminal.fromMap(json.decode(source) as Map<String, dynamic>);
}
