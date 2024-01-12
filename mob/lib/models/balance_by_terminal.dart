// ignore_for_file: public_member_api_docs, sort_constructors_first
import 'dart:convert';

class BalanceByTerminal {
  final String terminalName;
  final int balance;

  BalanceByTerminal({
    required this.terminalName,
    required this.balance,
  });

  BalanceByTerminal copyWith({
    String? terminalName,
    int? balance,
  }) {
    return BalanceByTerminal(
      terminalName: terminalName ?? this.terminalName,
      balance: balance ?? this.balance,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'terminalName': terminalName,
      'balance': balance,
    };
  }

  factory BalanceByTerminal.fromMap(Map<String, dynamic> map) {
    return BalanceByTerminal(
      terminalName: map['courier_terminal_balance_terminals']['name'] as String,
      balance: map['balance'] as int,
    );
  }

  String toJson() => json.encode(toMap());

  factory BalanceByTerminal.fromJson(String source) =>
      BalanceByTerminal.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() =>
      'BalanceByTerminal(terminalName: $terminalName, balance: $balance)';

  @override
  bool operator ==(covariant BalanceByTerminal other) {
    if (identical(this, other)) return true;

    return other.terminalName == terminalName && other.balance == balance;
  }

  @override
  int get hashCode => terminalName.hashCode ^ balance.hashCode;
}
