// ignore_for_file: public_member_api_docs, sort_constructors_first
import 'dart:convert';

class GarantCustomerModel {
  final String id;
  final String name;
  final String phone;

  GarantCustomerModel({
    required this.id,
    required this.name,
    required this.phone,
  });

  GarantCustomerModel copyWith({
    String? id,
    String? name,
    String? phone,
  }) {
    return GarantCustomerModel(
      id: id ?? this.id,
      name: name ?? this.name,
      phone: phone ?? this.phone,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'id': id,
      'name': name,
      'phone': phone,
    };
  }

  factory GarantCustomerModel.fromMap(Map<String, dynamic> map) {
    return GarantCustomerModel(
      id: map['id'] as String,
      name: map['name'] as String,
      phone: map['phone'] as String,
    );
  }

  String toJson() => json.encode(toMap());

  factory GarantCustomerModel.fromJson(String source) =>
      GarantCustomerModel.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() =>
      'GarantCustomerModel(id: $id, name: $name, phone: $phone)';

  @override
  bool operator ==(covariant GarantCustomerModel other) {
    if (identical(this, other)) return true;

    return other.id == id && other.name == name && other.phone == phone;
  }

  @override
  int get hashCode => id.hashCode ^ name.hashCode ^ phone.hashCode;
}

class GarantTerminalsModel {
  final String id;
  final String name;
  GarantTerminalsModel({
    required this.id,
    required this.name,
  });

  GarantTerminalsModel copyWith({
    String? id,
    String? name,
  }) {
    return GarantTerminalsModel(
      id: id ?? this.id,
      name: name ?? this.name,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'id': id,
      'name': name,
    };
  }

  factory GarantTerminalsModel.fromMap(Map<String, dynamic> map) {
    return GarantTerminalsModel(
      id: map['id'] as String,
      name: map['name'] as String,
    );
  }

  String toJson() => json.encode(toMap());

  factory GarantTerminalsModel.fromJson(String source) =>
      GarantTerminalsModel.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() => 'Terminals(id: $id, name: $name)';

  @override
  bool operator ==(covariant GarantTerminalsModel other) {
    if (identical(this, other)) return true;

    return other.id == id && other.name == name;
  }

  @override
  int get hashCode => id.hashCode ^ name.hashCode;
}

class GarantOrderStatusModel {
  final String id;
  final String name;
  final bool cancel;
  final bool finish;
  GarantOrderStatusModel({
    required this.id,
    required this.name,
    required this.cancel,
    required this.finish,
  });

  GarantOrderStatusModel copyWith({
    String? id,
    String? name,
  }) {
    return GarantOrderStatusModel(
      id: id ?? this.id,
      name: name ?? this.name,
      cancel: cancel,
      finish: finish,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'id': id,
      'name': name,
      'cancel': cancel,
      'finish': finish,
    };
  }

  factory GarantOrderStatusModel.fromMap(Map<String, dynamic> map) {
    return GarantOrderStatusModel(
      id: map['id'] as String,
      name: map['name'] as String,
      cancel: map['cancel'] as bool,
      finish: map['finish'] as bool,
    );
  }

  String toJson() => json.encode(toMap());

  factory GarantOrderStatusModel.fromJson(String source) =>
      GarantOrderStatusModel.fromMap(
          json.decode(source) as Map<String, dynamic>);

  @override
  String toString() =>
      'OrderStatus(id: $id, name: $name, cancel: $cancel, finish: $finish)';

  @override
  bool operator ==(covariant GarantOrderStatusModel other) {
    if (identical(this, other)) return true;

    return other.id == id &&
        other.name == name &&
        other.cancel == cancel &&
        other.finish == finish;
  }

  @override
  int get hashCode =>
      id.hashCode ^ name.hashCode ^ cancel.hashCode ^ finish.hashCode;
}

class GarantOrderModel {
  final String id;
  final double pre_distance;
  final String order_number;
  final int? delivery_price;
  final String? delivery_address;
  final String created_at;
  final String? paymentType;
  final GarantCustomerModel? customer;
  final GarantTerminalsModel? terminal;
  final GarantOrderStatusModel? status;

  GarantOrderModel({
    required this.id,
    required this.pre_distance,
    required this.order_number,
    this.delivery_price,
    this.delivery_address,
    required this.created_at,
    this.paymentType,
    this.customer,
    this.terminal,
    this.status,
  });

  GarantOrderModel copyWith({
    String? id,
    double? to_lat,
    double? to_lon,
    double? pre_distance,
    String? order_number,
    int? order_price,
    int? delivery_price,
    String? delivery_address,
    String? delivery_comment,
    String? created_at,
    double? from_lat,
    double? from_lon,
    String? paymentType,
    GarantCustomerModel? customer,
    GarantTerminalsModel? terminal,
    GarantOrderStatusModel? status,
  }) {
    return GarantOrderModel(
      id: id ?? this.id,
      pre_distance: pre_distance ?? this.pre_distance,
      order_number: order_number ?? this.order_number,
      delivery_price: delivery_price ?? this.delivery_price,
      delivery_address: delivery_address ?? this.delivery_address,
      created_at: created_at ?? this.created_at,
      paymentType: paymentType ?? this.paymentType,
      customer: customer ?? this.customer,
      terminal: terminal ?? this.terminal,
      status: status ?? this.status,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'id': id,
      'pre_distance': pre_distance,
      'order_number': order_number,
      'delivery_price': delivery_price,
      'delivery_address': delivery_address,
      'created_at': created_at,
      'payment_type': paymentType,
      'customer': customer?.toMap(),
      'terminal': terminal?.toMap(),
      'status': status?.toMap(),
    };
  }

  factory GarantOrderModel.fromMap(Map<String, dynamic> map) {
    return GarantOrderModel(
      id: map['id'] as String,
      pre_distance: map['pre_distance'].toDouble() as double,
      order_number: map['order_number'] as String,
      delivery_price: map['delivery_price'] as int?,
      delivery_address: map['delivery_address'] as String?,
      created_at: map['created_at'],
      paymentType: map['payment_type'] as String?,
      customer: map['orders_customers'] == null
          ? null
          : GarantCustomerModel.fromMap(
              map['orders_customers'] as Map<String, dynamic>),
      terminal: map['orders_terminals'] == null
          ? null
          : GarantTerminalsModel.fromMap(
              map['orders_terminals'] as Map<String, dynamic>),
      status: map['orders_order_status'] == null
          ? null
          : GarantOrderStatusModel.fromMap(
              map['orders_order_status'] as Map<String, dynamic>),
    );
  }

  String toJson() => json.encode(toMap());

  factory GarantOrderModel.fromJson(String source) =>
      GarantOrderModel.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() => 'Order(id: $id)';

  @override
  bool operator ==(covariant GarantOrderModel other) {
    if (identical(this, other)) return true;

    return other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}
