// ignore_for_file: public_member_api_docs, sort_constructors_first
import 'dart:convert';

import 'package:objectbox/objectbox.dart';

@Entity()
class Terminals {
  int id = 0;
  @Index()
  final String identity;
  final String name;
  Terminals({
    required this.identity,
    required this.name,
  });

  Terminals copyWith({
    String? identity,
    String? name,
  }) {
    return Terminals(
      identity: identity ?? this.identity,
      name: name ?? this.name,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'id': identity,
      'name': name,
    };
  }

  factory Terminals.fromMap(Map<String, dynamic> map) {
    return Terminals(
      identity: map['id'] as String,
      name: map['name'] as String,
    );
  }

  String toJson() => json.encode(toMap());

  factory Terminals.fromJson(String source) =>
      Terminals.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() => 'Terminals(id: $identity, name: $name)';

  @override
  bool operator ==(covariant Terminals other) {
    if (identical(this, other)) return true;

    return other.id == id && other.name == name;
  }

  @override
  int get hashCode => id.hashCode ^ name.hashCode;
}
