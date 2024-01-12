// ignore_for_file: public_member_api_docs, sort_constructors_first
import 'dart:convert';

class NewOrderModel {
  final String id;
  final double to_lat;
  final double to_lon;
  final double from_lat;
  final double from_lon;
  final bool highlight;
  final double pre_distance;
  final String order_number;
  final int order_price;
  final int? delivery_price;
  final String? delivery_address;
  final String? delivery_comment;
  final DateTime created_at;
  final String? paymentType;
  final NewOrderCustomer customer;
  final NewOrderTerminals terminal;
  final NewOrderStatus orderStatus;
  final List<NewOrderOrderNextButton>? orderNextButton;
  final NewOrderOrganizations organization;
  final String? additional_phone;
  final String? house;
  final String? entrance;
  final String? flat;

  NewOrderModel({
    required this.id,
    required this.to_lat,
    required this.to_lon,
    required this.from_lat,
    required this.from_lon,
    required this.highlight,
    required this.pre_distance,
    required this.order_number,
    required this.order_price,
    this.delivery_price,
    this.delivery_address,
    this.delivery_comment,
    required this.created_at,
    this.paymentType,
    required this.customer,
    required this.terminal,
    required this.orderStatus,
    required this.orderNextButton,
    required this.organization,
    this.additional_phone,
    this.house,
    this.entrance,
    this.flat,
  });

  NewOrderModel copyWith({
    String? identity,
    double? to_lat,
    double? to_lon,
    double? from_lat,
    double? from_lon,
    bool? highlight,
    double? pre_distance,
    String? order_number,
    int? order_price,
    int? delivery_price,
    String? delivery_address,
    String? delivery_comment,
    DateTime? created_at,
    String? paymentType,
    String? additional_phone,
    String? house,
    String? entrance,
    String? flat,
  }) {
    return NewOrderModel(
      id: id ?? this.id,
      to_lat: to_lat ?? this.to_lat,
      to_lon: to_lon ?? this.to_lon,
      from_lat: from_lat ?? this.from_lat,
      from_lon: from_lon ?? this.from_lon,
      highlight: highlight ?? this.highlight,
      pre_distance: pre_distance ?? this.pre_distance,
      order_number: order_number ?? this.order_number,
      order_price: order_price ?? this.order_price,
      delivery_price: delivery_price ?? this.delivery_price,
      delivery_address: delivery_address ?? this.delivery_address,
      delivery_comment: delivery_comment ?? this.delivery_comment,
      created_at: created_at ?? this.created_at,
      paymentType: paymentType ?? this.paymentType,
      customer: customer,
      terminal: terminal,
      orderStatus: orderStatus,
      orderNextButton: orderNextButton,
      organization: organization,
      additional_phone: additional_phone ?? this.additional_phone,
      house: house ?? this.house,
      entrance: entrance ?? this.entrance,
      flat: flat ?? this.flat,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'id': id,
      'to_lat': to_lat,
      'to_lon': to_lon,
      'from_lat': from_lat,
      'from_lon': from_lon,
      'highlight': highlight,
      'pre_distance': pre_distance,
      'order_number': order_number,
      'order_price': order_price,
      'delivery_price': delivery_price,
      'delivery_address': delivery_address,
      'delivery_comment': delivery_comment,
      'created_at': created_at.millisecondsSinceEpoch,
      'payment_type': paymentType,
      'additional_phone': additional_phone,
      'house': house,
      'entrance': entrance,
      'flat': flat,
    };
  }

  factory NewOrderModel.fromMap(Map<String, dynamic> map) {
    return NewOrderModel(
      id: map['id'] as String,
      to_lat: map['to_lat'] as double,
      to_lon: map['to_lon'] as double,
      from_lat: map['from_lat'] as double,
      from_lon: map['from_lon'] as double,
      highlight: map['highlight'] as bool,
      pre_distance: map['pre_distance'].toDouble() as double,
      order_number: map['order_number'] as String,
      order_price: map['order_price'] as int,
      delivery_price: map['delivery_price'] as int?,
      delivery_address: map['delivery_address'] as String?,
      delivery_comment: map['delivery_comment'] as String?,
      created_at: DateTime.parse(map['created_at'] as String),
      paymentType: map['payment_type'] as String?,
      customer: NewOrderCustomer.fromMap(
          map['orders_customers'] as Map<String, dynamic>),
      terminal: NewOrderTerminals.fromMap(
          map['orders_terminals'] as Map<String, dynamic>),
      orderStatus: NewOrderStatus.fromMap(
          map['orders_order_status'] as Map<String, dynamic>),
      orderNextButton: map['next_buttons'] != null
          ? List<NewOrderOrderNextButton>.from(
              (map['next_buttons'] as List<dynamic>).map((x) =>
                  NewOrderOrderNextButton.fromMap(x as Map<String, dynamic>)))
          : null,
      organization: NewOrderOrganizations.fromMap(
          map['orders_organization'] as Map<String, dynamic>),
      additional_phone: map['additional_phone'] as String?,
      house: map['house'] as String?,
      entrance: map['entrance'] as String?,
      flat: map['flat'] as String?,
    );
  }

  String toJson() => json.encode(toMap());

  factory NewOrderModel.fromJson(String source) =>
      NewOrderModel.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() => 'Order(id: $id)';

  @override
  bool operator ==(covariant NewOrderModel other) {
    if (identical(this, other)) return true;

    return other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}

class NewOrderCustomer {
  final String id;
  final String name;
  final String phone;

  NewOrderCustomer({
    required this.id,
    required this.name,
    required this.phone,
  });

  NewOrderCustomer copyWith({
    String? id,
    String? name,
    String? phone,
  }) {
    return NewOrderCustomer(
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

  factory NewOrderCustomer.fromMap(Map<String, dynamic> map) {
    return NewOrderCustomer(
      id: map['id'] as String,
      name: map['name'] as String,
      phone: map['phone'] as String,
    );
  }

  String toJson() => json.encode(toMap());

  factory NewOrderCustomer.fromJson(String source) =>
      NewOrderCustomer.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() => 'NewOrderCustomer(id: $id, name: $name, phone: $phone)';

  @override
  bool operator ==(covariant NewOrderCustomer other) {
    if (identical(this, other)) return true;

    return other.id == id && other.name == name && other.phone == phone;
  }

  @override
  int get hashCode => id.hashCode ^ name.hashCode ^ phone.hashCode;
}

class NewOrderTerminals {
  final String id;
  final String name;
  NewOrderTerminals({
    required this.id,
    required this.name,
  });

  NewOrderTerminals copyWith({
    String? identity,
    String? name,
  }) {
    return NewOrderTerminals(
      id: identity ?? this.id,
      name: name ?? this.name,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'id': id,
      'name': name,
    };
  }

  factory NewOrderTerminals.fromMap(Map<String, dynamic> map) {
    return NewOrderTerminals(
      id: map['id'] as String,
      name: map['name'] as String,
    );
  }

  String toJson() => json.encode(toMap());

  factory NewOrderTerminals.fromJson(String source) =>
      NewOrderTerminals.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() => 'NewOrderTerminals(id: $id, name: $name)';

  @override
  bool operator ==(covariant NewOrderTerminals other) {
    if (identical(this, other)) return true;

    return other.id == id && other.name == name;
  }

  @override
  int get hashCode => id.hashCode ^ name.hashCode;
}

class NewOrderStatus {
  final String id;
  final String name;
  final bool cancel;
  final bool finish;
  NewOrderStatus({
    required this.id,
    required this.name,
    required this.cancel,
    required this.finish,
  });

  NewOrderStatus copyWith({
    String? identity,
    String? name,
  }) {
    return NewOrderStatus(
      id: identity ?? this.id,
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

  factory NewOrderStatus.fromMap(Map<String, dynamic> map) {
    return NewOrderStatus(
      id: map['id'] as String,
      name: map['name'] as String,
      cancel: map['cancel'] as bool,
      finish: map['finish'] as bool,
    );
  }

  String toJson() => json.encode(toMap());

  factory NewOrderStatus.fromJson(String source) =>
      NewOrderStatus.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() =>
      'OrderStatus(id: $id, name: $name, cancel: $cancel, finish: $finish)';

  @override
  bool operator ==(covariant NewOrderStatus other) {
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

class NewOrderOrderNextButton {
  String id;
  String name;
  String? color;
  int sort;
  bool finish;
  bool cancel;
  bool waiting;
  bool onWay;
  bool inTerminal;
  NewOrderOrderNextButton(
      {required this.id,
      required this.name,
      this.color,
      required this.sort,
      required this.finish,
      required this.cancel,
      required this.waiting,
      required this.onWay,
      required this.inTerminal});

  NewOrderOrderNextButton copyWith(
      {String? id,
      String? name,
      String? color,
      int? sort,
      bool? finish,
      bool? cancel,
      bool? waiting,
      bool? onWay,
      bool? inTerminal}) {
    return NewOrderOrderNextButton(
        id: id ?? this.id,
        name: name ?? this.name,
        color: color ?? this.color,
        sort: sort ?? this.sort,
        finish: finish ?? this.finish,
        cancel: cancel ?? this.cancel,
        waiting: waiting ?? this.waiting,
        onWay: onWay ?? this.onWay,
        inTerminal: inTerminal ?? this.inTerminal);
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'id': id,
      'name': name,
      'color': color,
      'sort': sort,
      'finish': finish,
      'cancel': cancel,
      'waiting': waiting,
      'on_way': onWay,
      "in_terminal": inTerminal
    };
  }

  factory NewOrderOrderNextButton.fromMap(Map<String, dynamic> map) {
    return NewOrderOrderNextButton(
        id: map['id'] as String,
        name: map['name'] as String,
        color: map['color'],
        sort: map['sort'] as int,
        finish: map['finish'] as bool,
        cancel: map['cancel'] as bool,
        waiting: map['waiting'] as bool,
        onWay: map['on_way'] as bool,
        inTerminal: map['in_terminal'] as bool);
  }

  String toJson() => json.encode(toMap());

  factory NewOrderOrderNextButton.fromJson(String source) =>
      NewOrderOrderNextButton.fromMap(
          json.decode(source) as Map<String, dynamic>);

  @override
  String toString() {
    return 'OrderNextButton(identity: $id, name: $name, color: $color, sort: $sort, finish: $finish, cancel: $cancel, waiting: $waiting, onWay: $onWay, inTerminal: $inTerminal)';
  }

  @override
  bool operator ==(covariant NewOrderOrderNextButton other) {
    if (identical(this, other)) return true;

    return other.id == id &&
        other.name == name &&
        other.color == color &&
        other.sort == sort &&
        other.finish == finish &&
        other.cancel == cancel &&
        other.waiting == waiting &&
        other.onWay == onWay &&
        other.inTerminal == inTerminal;
  }

  @override
  int get hashCode {
    return id.hashCode ^
        name.hashCode ^
        color.hashCode ^
        sort.hashCode ^
        finish.hashCode ^
        cancel.hashCode ^
        waiting.hashCode ^
        onWay.hashCode ^
        inTerminal.hashCode;
  }
}

class NewOrderOrganizations {
  final String id;
  final String name;
  final bool active;
  final String? iconUrl;
  final String? description;
  final int? maxDistance;
  final int? maxActiveOrderCount;
  final int? maxOrderCloseDistance;
  final String supportChatUrl;

  NewOrderOrganizations(
    this.id,
    this.name,
    this.active,
    this.iconUrl,
    this.description,
    this.maxDistance,
    this.maxActiveOrderCount,
    this.maxOrderCloseDistance,
    this.supportChatUrl,
  );

  NewOrderOrganizations copyWith({
    String? id,
    String? name,
    bool? active,
    String? iconUrl,
    String? description,
    int? maxDistance,
    int? maxActiveOrderCount,
    int? maxOrderCloseDistance,
    String? supportChatUrl,
  }) {
    return NewOrderOrganizations(
      id ?? this.id,
      name ?? this.name,
      active ?? this.active,
      iconUrl ?? this.iconUrl,
      description ?? this.description,
      maxDistance ?? this.maxDistance,
      maxActiveOrderCount ?? this.maxActiveOrderCount,
      maxOrderCloseDistance ?? this.maxOrderCloseDistance,
      supportChatUrl ?? this.supportChatUrl,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'id': id,
      'name': name,
      'active': active,
      'icon_url': iconUrl,
      'description': description,
      'max_distance': maxDistance,
      'max_active_order_count': maxActiveOrderCount,
      'max_order_close_distance': maxOrderCloseDistance,
      'support_chat_url': supportChatUrl,
    };
  }

  factory NewOrderOrganizations.fromMap(Map<String, dynamic> map) {
    return NewOrderOrganizations(
      map['id'] as String,
      map['name'] as String,
      map['active'] as bool,
      map['icon_url'] != null ? map['icon_url'] as String : null,
      map['description'] != null ? map['description'] as String : null,
      map['max_distance'] != null ? map['max_distance'] as int : null,
      map['max_active_order_count'] != null
          ? map['max_active_order_count'] as int
          : null,
      map['max_order_close_distance'] != null
          ? map['max_order_close_distance'] as int
          : null,
      map['support_chat_url'] as String,
    );
  }

  String toJson() => json.encode(toMap());

  factory NewOrderOrganizations.fromJson(String source) =>
      NewOrderOrganizations.fromMap(
          json.decode(source) as Map<String, dynamic>);

  @override
  String toString() {
    return 'Organizations(id: $id, name: $name, active: $active, icon_url: $iconUrl, description: $description, maxDistance: $maxDistance, maxActiveOrderCount: $maxActiveOrderCount, maxOrderCloseDistance: $maxOrderCloseDistance, supportChatUrl: $supportChatUrl)';
  }

  @override
  bool operator ==(covariant NewOrderOrganizations other) {
    if (identical(this, other)) return true;

    return other.id == id &&
        other.name == name &&
        other.active == active &&
        other.iconUrl == iconUrl &&
        other.description == description &&
        other.maxDistance == maxDistance &&
        other.maxActiveOrderCount == maxActiveOrderCount &&
        other.maxOrderCloseDistance == maxOrderCloseDistance &&
        other.supportChatUrl == supportChatUrl;
  }

  @override
  int get hashCode {
    return id.hashCode ^
        name.hashCode ^
        active.hashCode ^
        iconUrl.hashCode ^
        description.hashCode ^
        maxDistance.hashCode ^
        maxActiveOrderCount.hashCode ^
        maxOrderCloseDistance.hashCode ^
        supportChatUrl.hashCode;
  }
}
