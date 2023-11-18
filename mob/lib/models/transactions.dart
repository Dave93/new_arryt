import 'dart:convert';

class Transactions {
  final int not_paid_amount;
  final String transaction_type;
  final String created_at;
  final Order_transactions_orders order_transactions_orders;
  final Order_transactions_terminals order_transactions_terminals;
  Transactions({
    required this.not_paid_amount,
    required this.transaction_type,
    required this.created_at,
    required this.order_transactions_orders,
    required this.order_transactions_terminals,
  });

  Transactions copyWith({
    int? not_paid_amount,
    String? transaction_type,
    String? created_at,
    Order_transactions_orders? order_transactions_orders,
    Order_transactions_terminals? order_transactions_terminals,
  }) {
    return Transactions(
      not_paid_amount: not_paid_amount ?? this.not_paid_amount,
      transaction_type: transaction_type ?? this.transaction_type,
      created_at: created_at ?? this.created_at,
      order_transactions_orders:
          order_transactions_orders ?? this.order_transactions_orders,
      order_transactions_terminals:
          order_transactions_terminals ?? this.order_transactions_terminals,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'not_paid_amount': not_paid_amount,
      'transaction_type': transaction_type,
      'created_at': created_at,
      'order_transactions_orders': order_transactions_orders.toMap(),
      'order_transactions_terminals': order_transactions_terminals.toMap(),
    };
  }

  factory Transactions.fromMap(Map<String, dynamic> map) {
    return Transactions(
      not_paid_amount: map['not_paid_amount'].toInt() as int,
      transaction_type: map['transaction_type'] as String,
      created_at: map['created_at'] as String,
      order_transactions_orders: Order_transactions_orders.fromMap(
          map['order_transactions_orders'] as Map<String, dynamic>),
      order_transactions_terminals: Order_transactions_terminals.fromMap(
          map['order_transactions_terminals'] as Map<String, dynamic>),
    );
  }

  String toJson() => json.encode(toMap());

  factory Transactions.fromJson(String source) =>
      Transactions.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() {
    return 'Transactions(not_paid_amount: $not_paid_amount, transaction_type: $transaction_type, created_at: $created_at, order_transactions_orders: $order_transactions_orders, order_transactions_terminals: $order_transactions_terminals)';
  }

  @override
  bool operator ==(covariant Transactions other) {
    if (identical(this, other)) return true;

    return other.not_paid_amount == not_paid_amount &&
        other.transaction_type == transaction_type &&
        other.created_at == created_at &&
        other.order_transactions_orders == order_transactions_orders &&
        other.order_transactions_terminals == order_transactions_terminals;
  }

  @override
  int get hashCode {
    return not_paid_amount.hashCode ^
        transaction_type.hashCode ^
        order_transactions_orders.hashCode ^
        created_at.hashCode ^
        order_transactions_terminals.hashCode;
  }
}

class Order_transactions_orders {
  final String order_number;
  Order_transactions_orders({
    required this.order_number,
  });

  Order_transactions_orders copyWith({
    String? order_number,
  }) {
    return Order_transactions_orders(
      order_number: order_number ?? this.order_number,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'order_number': order_number,
    };
  }

  factory Order_transactions_orders.fromMap(Map<String, dynamic> map) {
    return Order_transactions_orders(
      order_number: map['order_number'] as String,
    );
  }

  String toJson() => json.encode(toMap());

  factory Order_transactions_orders.fromJson(String source) =>
      Order_transactions_orders.fromMap(
          json.decode(source) as Map<String, dynamic>);

  @override
  String toString() => 'Order_transactions_orders(order_number: $order_number)';

  @override
  bool operator ==(covariant Order_transactions_orders other) {
    if (identical(this, other)) return true;

    return other.order_number == order_number;
  }

  @override
  int get hashCode => order_number.hashCode;
}

class Order_transactions_terminals {
  final String name;
  Order_transactions_terminals({
    required this.name,
  });

  Order_transactions_terminals copyWith({
    String? name,
  }) {
    return Order_transactions_terminals(
      name: name ?? this.name,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'name': name,
    };
  }

  factory Order_transactions_terminals.fromMap(Map<String, dynamic> map) {
    return Order_transactions_terminals(
      name: map['name'] as String,
    );
  }

  String toJson() => json.encode(toMap());

  factory Order_transactions_terminals.fromJson(String source) =>
      Order_transactions_terminals.fromMap(
          json.decode(source) as Map<String, dynamic>);

  @override
  String toString() => 'Order_transactions_terminals(name: $name)';

  @override
  bool operator ==(covariant Order_transactions_terminals other) {
    if (identical(this, other)) return true;

    return other.name == name;
  }

  @override
  int get hashCode => name.hashCode;
}
