import 'dart:convert';

import 'package:objectbox/objectbox.dart';

@Entity()
class OrderNextButton {
  int id = 0;
  @Index()
  String identity;
  String name;
  String? color;
  int sort;
  bool finish;
  bool cancel;
  bool waiting;
  bool onWay;
  bool inTerminal;
  OrderNextButton(
      {required this.identity,
      required this.name,
      this.color,
      required this.sort,
      required this.finish,
      required this.cancel,
      required this.waiting,
      required this.onWay,
      required this.inTerminal});

  OrderNextButton copyWith(
      {String? identity,
      String? name,
      String? color,
      int? sort,
      bool? finish,
      bool? cancel,
      bool? waiting,
      bool? onWay,
      bool? inTerminal}) {
    return OrderNextButton(
        identity: identity ?? this.identity,
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
      'identity': identity,
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

  factory OrderNextButton.fromMap(Map<String, dynamic> map) {
    return OrderNextButton(
        identity: map['id'] as String,
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

  factory OrderNextButton.fromJson(String source) =>
      OrderNextButton.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() {
    return 'OrderNextButton(identity: $identity, name: $name, color: $color, sort: $sort, finish: $finish, cancel: $cancel, waiting: $waiting, onWay: $onWay, inTerminal: $inTerminal)';
  }

  @override
  bool operator ==(covariant OrderNextButton other) {
    if (identical(this, other)) return true;

    return other.identity == identity &&
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
    return identity.hashCode ^
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
