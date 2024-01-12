// ignore_for_file: public_member_api_docs, sort_constructors_first
import 'dart:convert';

class NotificationsModel {
  final String id;
  final String title;
  final String body;
  final DateTime created_at;
  final DateTime send_at;
  final bool isRead;

  NotificationsModel({
    required this.id,
    required this.title,
    required this.body,
    required this.created_at,
    required this.send_at,
    this.isRead = false,
  });

  NotificationsModel copyWith({
    String? id,
    String? title,
    String? body,
    DateTime? created_at,
    DateTime? send_at,
    bool? isRead,
  }) {
    return NotificationsModel(
      id: id ?? this.id,
      title: title ?? this.title,
      body: body ?? this.body,
      created_at: created_at ?? this.created_at,
      send_at: send_at ?? this.send_at,
      isRead: isRead ?? this.isRead,
    );
  }

  Map<String, dynamic> toMap() {
    return <String, dynamic>{
      'id': id,
      'title': title,
      'body': body,
      'created_at': created_at.millisecondsSinceEpoch,
      'send_at': send_at.millisecondsSinceEpoch,
      'isRead': isRead,
    };
  }

  factory NotificationsModel.fromMap(Map<String, dynamic> map) {
    return NotificationsModel(
      id: map['id'] as String,
      title: map['title'] as String,
      body: map['body'] as String,
      created_at: DateTime.parse(map['created_at'] as String),
      send_at: DateTime.parse(map['send_at'] as String),
      isRead: map['is_read'] as bool,
    );
  }

  String toJson() => json.encode(toMap());

  factory NotificationsModel.fromJson(String source) =>
      NotificationsModel.fromMap(json.decode(source) as Map<String, dynamic>);

  @override
  String toString() {
    return 'NotificationsModel(id: $id, title: $title, body: $body, created_at: $created_at, send_at: $send_at)';
  }

  @override
  bool operator ==(covariant NotificationsModel other) {
    if (identical(this, other)) return true;

    return other.id == id &&
        other.title == title &&
        other.body == body &&
        other.created_at == created_at &&
        other.send_at == send_at &&
        other.isRead == isRead;
  }

  @override
  int get hashCode {
    return id.hashCode ^
        title.hashCode ^
        body.hashCode ^
        created_at.hashCode ^
        send_at.hashCode ^
        isRead.hashCode;
  }
}
