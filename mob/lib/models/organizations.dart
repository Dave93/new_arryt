// ignore_for_file: public_member_api_docs, sort_constructors_first
import 'dart:convert';

import 'package:objectbox/objectbox.dart';

@Entity()
class Organizations {
  int id = 0;
  @Index()
  final String identity;
  final String name;
  final bool active;
  final String? iconUrl;
  final String? description;
  final int? maxDistance;
  final int? maxActiveOrderCount;
  final int? maxOrderCloseDistance;
  final String supportChatUrl;

  Organizations(
    this.identity,
    this.name,
    this.active,
    this.iconUrl,
    this.description,
    this.maxDistance,
    this.maxActiveOrderCount,
    this.maxOrderCloseDistance,
    this.supportChatUrl,
  );

  Organizations copyWith({
    String? identity,
    String? name,
    bool? active,
    String? iconUrl,
    String? description,
    int? maxDistance,
    int? maxActiveOrderCount,
    int? maxOrderCloseDistance,
    String? supportChatUrl,
  }) {
    return Organizations(
      identity ?? this.identity,
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
      'id': identity,
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

  factory Organizations.fromMap(Map<String, dynamic> map) {
    return Organizations(
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

  factory Organizations.fromJson(String source) =>
      Organizations.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() {
    return 'Organizations(id: $identity, name: $name, active: $active, icon_url: $iconUrl, description: $description, maxDistance: $maxDistance, maxActiveOrderCount: $maxActiveOrderCount, maxOrderCloseDistance: $maxOrderCloseDistance, supportChatUrl: $supportChatUrl)';
  }

  @override
  bool operator ==(covariant Organizations other) {
    if (identical(this, other)) return true;

    return other.identity == identity &&
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
    return identity.hashCode ^
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
